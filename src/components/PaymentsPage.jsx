"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  Search, Download, AlertTriangle, CheckCircle2, Undo2, ChevronDown, X,
  Wallet, TrendingUp, Clock, CalendarDays, Users, Banknote, RotateCcw, Save,
} from "lucide-react";

// ─── STATUS DEFINITIONS ──────────────────────────────────────────────────
// ΤΙ ΕΙΝΑΙ ΑΥΤΗ Η ΣΕΛΙΔΑ ΤΩΡΑ:
// Ο ασθενής πληρώνει τον θεραπευτή ΑΠΕΥΘΕΙΑΣ σε μετρητά. Η πλατφόρμα δεν
// αγγίζει ποτέ αυτά τα χρήματα. Το μοναδικό έσοδο είναι το ΤΕΛΟΣ ΝΕΟΥ
// ΑΣΘΕΝΗ, που ο θεραπευτής ΟΦΕΙΛΕΙ στην πλατφόρμα.
//
// Δηλαδή η ροή είναι ΑΝΤΙΣΤΡΟΦΗ από ό,τι υπέθετε η παλιά σελίδα:
// δεν εισπράττουμε από τον ασθενή για να πληρώσουμε τον θεραπευτή —
// χρεώνουμε τον θεραπευτή.
//
// Οι καταστάσεις pending_payout / paid_out ανήκουν στο παλιό μοντέλο.
// Μένουν ΜΟΝΟ για να εμφανίζονται σωστά παλιές εγγραφές· δεν προσφέρονται
// πλέον ως ενέργεια.
const STATUSES = {
  unpaid:         { label: "Ανεξόφλητο",      bg: "#FEF3C7", color: "#B45309" },
  partially_paid: { label: "Μερική εξόφληση", bg: "#FEF3C7", color: "#B45309" },
  paid:           { label: "Εξοφλήθηκε",      bg: "#D1FAE5", color: "#065F46" },
  pending_payout: { label: "Παλαιό: προς θεραπευτή", bg: "#F1F5F9", color: "#64748B" },
  paid_out:       { label: "Παλαιό: πληρώθηκε",      bg: "#F1F5F9", color: "#64748B" },
  refunded:       { label: "Ακυρώθηκε",       bg: "#FFE4E6", color: "#9F1239" },
  failed:         { label: "Απέτυχε",         bg: "#FFE4E6", color: "#9F1239" },
};

const METHODS = {
  cash:          "Μετρητά",
  bank_transfer: "Τραπεζική κατάθεση",
  card:          "Κάρτα",
  stripe:        "Stripe",
  other:         "Άλλο",
};

// Θεωρούνται "εισπραγμένα" για την πλατφόρμα
const COLLECTED = ["paid", "pending_payout", "paid_out"];
const OPEN = ["unpaid", "partially_paid", "failed"];

// ─── CSV ─────────────────────────────────────────────────────────────────
function exportCsv(filename, rows) {
  if (!rows || rows.length === 0) { alert("Δεν υπάρχουν δεδομένα για εξαγωγή."); return; }
  const headers = Object.keys(rows[0]);
  const esc = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(";"), ...rows.map((r) => headers.map((h) => esc(r[h])).join(";"))].join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── HELPERS ─────────────────────────────────────────────────────────────
const DAY = 24 * 60 * 60 * 1000;
const daysSince = (d) => (d ? Math.floor((Date.now() - new Date(d).getTime()) / DAY) : 0);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("el-GR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—");
const num = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v));

function StatusBadge({ status }) {
  const s = STATUSES[status] || { label: status || "—", bg: "#F1F5F9", color: "#64748B" };
  return (
    <span style={{ background: s.bg, color: s.color, padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

function Avatar({ name, photo, size = 40 }) {
  if (photo) return <img src={photo} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "#EFF6FF", color: "#1D4ED8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.33, fontWeight: 700, flexShrink: 0 }}>
      {(name || "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
    </div>
  );
}

function StatCard({ label, value, sub, bg, border, text, Icon }) {
  return (
    <div style={{ flex: 1, minWidth: 150, background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: "16px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        {Icon && <Icon size={13} color={text} strokeWidth={2.5} />}
        <div style={{ fontSize: 11, fontWeight: 700, color: text, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: text, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: text, opacity: 0.7, marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
export default function PaymentsPage() {
  const [rows, setRows] = useState([]);
  const [therapists, setTherapists] = useState([]);
  // Το τέλος νέου ασθενή, όχι «προμήθεια». Έρχεται από τις ρυθμίσεις
  // πλατφόρμας — το ίδιο κλειδί που διαβάζει και η σελίδα συνδρομών.
  const [defaultFee, setDefaultFee] = useState(10);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [busy, setBusy] = useState(false);

  const [statusFilter, setStatusFilter] = useState("all");
  const [therapistId, setTherapistId] = useState("all");
  const [period, setPeriod] = useState("all");
  const [search, setSearch] = useState("");

  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState({});

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);

    const { data: settingsData } = await supabase
      .from("platform_settings").select("value").eq("key", "first_session_fee_default").maybeSingle();
    const comm = settingsData ? parseFloat(settingsData.value) || 10 : 10;
    setDefaultFee(comm);

    const [
      { data: payments },
      { data: ths },
      { data: requests },
      { data: patients },
    ] = await Promise.all([
      supabase.from("payments").select("*").order("created_at", { ascending: false }),
      supabase.from("therapist_profiles").select("id, name, specialty, area, photo_url, iban"),
      supabase.from("session_requests").select("id, patient_id, problem_type"),
      supabase.from("patient_profiles").select("id, name"),
    ]);

    const tMap = {}; (ths || []).forEach((t) => { tMap[t.id] = t; });
    const pMap = {}; (patients || []).forEach((p) => { pMap[p.id] = p.name; });
    const rMap = {}; (requests || []).forEach((r) => { rMap[r.id] = r; });

    const flat = (payments || [])
      .filter((p) => p.therapist_id)
      .map((p) => {
        const t = tMap[p.therapist_id];
        const req = rMap[p.request_id];
        const status = p.status || (p.paid ? "paid" : "unpaid");
        return {
          ...p,
          status,
          amount: num(p.amount) || comm,
          therapist_name: t?.name || "Άγνωστος θεραπευτής",
          therapist_specialty: t?.specialty || "",
          therapist_area: t?.area || "",
          therapist_photo: t?.photo_url || null,
          therapist_iban: t?.iban || null,
          patient: p.patient_name || (req ? pMap[req.patient_id] : null) || "Άγνωστος",
          problem: req?.problem_type || "",
          age: daysSince(p.created_at),
        };
      });

    setRows(flat);
    setTherapists((ths || []).sort((a, b) => (a.name || "").localeCompare(b.name || "", "el")));
    setLoading(false);
  }

  // ─── ACTIONS ───────────────────────────────────────────────────────────
  async function setStatus(id, status) {
    setBusy(true);
    const patch = { status };
    if (status === "paid_out") patch.payout_at = new Date().toISOString();
    if (status === "refunded") patch.refunded_at = new Date().toISOString();
    const { error } = await supabase.from("payments").update(patch).eq("id", id);
    if (error) alert("Σφάλμα: " + error.message);
    await fetchAll();
    setBusy(false);
  }

  async function markAllPaid(name, openRows) {
    const total = openRows.reduce((s, r) => s + r.amount, 0);
    if (!confirm(`Είσπραξη ${openRows.length} προμηθειών από ${name};\n\nΣύνολο: ${total}€\n\nΜπορεί να αναιρεθεί ανά περιστατικό.`)) return;
    setBusy(true);
    const { error } = await supabase
      .from("payments")
      .update({ status: "paid" })
      .in("id", openRows.map((r) => r.id));
    if (error) alert("Σφάλμα: " + error.message);
    await fetchAll();
    setBusy(false);
  }

  function openDetail(r) {
    setDetail(r);
    setForm({
      status: r.status,
      amount: r.amount ?? "",
      patient_amount: r.patient_amount ?? "",
      therapist_net: r.therapist_net ?? "",
      payment_method: r.payment_method ?? "",
      admin_note: r.admin_note ?? "",
      stripe_payment_id: r.stripe_payment_id ?? "",
      refund_amount: r.refund_amount ?? "",
    });
  }

  async function saveDetail() {
    setBusy(true);
    const patch = {
      status: form.status,
      amount: form.amount === "" ? null : Number(form.amount),
      patient_amount: form.patient_amount === "" ? null : Number(form.patient_amount),
      therapist_net: form.therapist_net === "" ? null : Number(form.therapist_net),
      payment_method: form.payment_method || null,
      admin_note: form.admin_note?.trim() || null,
      stripe_payment_id: form.stripe_payment_id?.trim() || null,
      refund_amount: form.refund_amount === "" ? null : Number(form.refund_amount),
    };
    if (form.status === "paid_out" && !detail.payout_at) patch.payout_at = new Date().toISOString();
    if (form.status === "refunded" && !detail.refunded_at) patch.refunded_at = new Date().toISOString();

    const { error } = await supabase.from("payments").update(patch).eq("id", detail.id);
    if (error) { alert("Σφάλμα: " + error.message); setBusy(false); return; }
    await fetchAll();
    setBusy(false);
    setDetail(null);
  }

  function autoNet() {
    const pa = Number(form.patient_amount);
    const am = Number(form.amount);
    if (!pa || !am) { alert("Συμπλήρωσε πρώτα «Ποσό συνεδρίας» και «Τέλος νέου ασθενή»."); return; }
    setForm({ ...form, therapist_net: Math.max(0, pa - am) });
  }

  // ─── FILTERS ───────────────────────────────────────────────────────────
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const filtered = rows.filter((r) => {
    if (statusFilter === "open" && !OPEN.includes(r.status)) return false;
    if (statusFilter === "collected" && !COLLECTED.includes(r.status)) return false;
    if (statusFilter === "overdue" && !(OPEN.includes(r.status) && r.age >= 30)) return false;
    if (STATUSES[statusFilter] && r.status !== statusFilter) return false;

    if (therapistId !== "all" && r.therapist_id !== therapistId) return false;

    if (period !== "all") {
      const t = new Date(r.created_at).getTime();
      if (period === "month" && t < monthStart) return false;
      if (period === "30" && r.age > 30) return false;
      if (period === "90" && r.age > 90) return false;
    }

    if (search.trim()) {
      const hay = `${r.therapist_name} ${r.patient} ${r.therapist_area} ${r.problem} ${r.stripe_payment_id || ""}`.toLowerCase();
      if (!hay.includes(search.trim().toLowerCase())) return false;
    }
    return true;
  });

  // ─── KPIs ──────────────────────────────────────────────────────────────
  const sum = (arr) => arr.reduce((s, r) => s + r.amount, 0);

  const openRowsAll   = rows.filter((r) => OPEN.includes(r.status));
  const collectedRows = rows.filter((r) => COLLECTED.includes(r.status));
  const overdueRows   = openRowsAll.filter((r) => r.age >= 30);
  const payoutRows    = rows.filter((r) => r.status === "pending_payout");
  const refundedRows  = rows.filter((r) => r.status === "refunded");
  const monthRows     = collectedRows.filter((r) => r.paid_at && new Date(r.paid_at).getTime() >= monthStart);

  const payoutTotal = payoutRows.reduce((s, r) => s + num(r.therapist_net), 0);
  const refundTotal = refundedRows.reduce((s, r) => s + num(r.refund_amount), 0);

  // ─── GROUPS ────────────────────────────────────────────────────────────
  const groupsMap = {};
  filtered.forEach((r) => {
    if (!groupsMap[r.therapist_id]) {
      groupsMap[r.therapist_id] = {
        id: r.therapist_id,
        name: r.therapist_name,
        specialty: r.therapist_specialty,
        area: r.therapist_area,
        photo: r.therapist_photo,
        iban: r.therapist_iban,
        cases: [],
      };
    }
    groupsMap[r.therapist_id].cases.push(r);
  });

  const groups = Object.values(groupsMap)
    .map((g) => {
      const open = g.cases.filter((c) => OPEN.includes(c.status));
      const collected = g.cases.filter((c) => COLLECTED.includes(c.status));
      return {
        ...g,
        open,
        collected,
        openAmount: sum(open),
        collectedAmount: sum(collected),
        oldest: open.length ? Math.max(...open.map((c) => c.age)) : 0,
      };
    })
    .sort((a, b) => b.openAmount - a.openAmount || b.oldest - a.oldest);

  function handleExport() {
    exportCsv(
      `physiohome-plirwmes-${new Date().toISOString().slice(0, 10)}.csv`,
      filtered.map((r) => ({
        Θεραπευτής: r.therapist_name,
        Ειδικότητα: r.therapist_specialty,
        Περιοχή: r.therapist_area,
        IBAN: r.therapist_iban || "",
        Ασθενής: r.patient,
        Πάθηση: r.problem,
        Ποσό_ασθενή: num(r.patient_amount) || "",
        Τέλος_νέου_ασθενή: r.amount,
        Καθαρά_θεραπευτή_παλαιό: num(r.therapist_net) || "",
        Κατάσταση: STATUSES[r.status]?.label || r.status,
        Μέθοδος: METHODS[r.payment_method] || "",
        Επιστροφή: num(r.refund_amount) || "",
        Stripe_ID: r.stripe_payment_id || "",
        Δημιουργήθηκε: fmtDate(r.created_at),
        Εισπράχθηκε: fmtDate(r.paid_at),
        Πληρωμή_θεραπευτή: fmtDate(r.payout_at),
        Ημέρες: r.age,
        Σημείωση: r.admin_note || "",
      }))
    );
  }

  const selectStyle = { padding: "9px 12px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, fontFamily: "inherit", background: "#fff", color: "#0F172A", outline: "none", cursor: "pointer" };
  const inputStyle = { width: "100%", padding: "9px 12px", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none", color: "#0F172A", boxSizing: "border-box" };
  const labelStyle = { fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 5 };

  if (loading) {
    return (
      <div style={{ padding: 24, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <div style={{ fontSize: 16, color: "#64748B" }}>Φόρτωση πληρωμών...</div>
      </div>
    );
  }

  return (
    <div>
      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0F172A", margin: 0 }}>Πληρωμές</h1>
          <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>
            Τέλη νέου ασθενή που οφείλουν οι θεραπευτές · προεπιλογή {defaultFee}€ ανά νέο ασθενή
          </p>
        </div>
        <button onClick={handleExport}
          style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid #E2E8F0", background: "#fff", color: "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Download size={14} />
          Εξαγωγή CSV ({filtered.length})
        </button>
      </div>

      {/* OVERDUE ALERT */}
      {overdueRows.length > 0 && (
        <div style={{ background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: 12, padding: "14px 18px", marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}>
          <AlertTriangle size={20} color="#BE123C" strokeWidth={2.2} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#9F1239" }}>
              {overdueRows.length} ληξιπρόθεσμα τέλη ({sum(overdueRows)}€)
            </div>
            <div style={{ fontSize: 12, color: "#9F1239", opacity: 0.85, marginTop: 2 }}>
              Ανεξόφλητα πάνω από 30 ημέρες — χρειάζονται επικοινωνία με τον θεραπευτή.
            </div>
          </div>
          <button onClick={() => { setStatusFilter("overdue"); setTherapistId("all"); setPeriod("all"); setSearch(""); }}
            style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#BE123C", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0 }}>
            Δες τα
          </button>
        </div>
      )}

      {/* PAYOUT ALERT */}
      {payoutRows.length > 0 && (
        <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 12, padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <Banknote size={20} color="#1D4ED8" strokeWidth={2.2} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1E40AF" }}>
              {payoutRows.length} παλαιές εγγραφές πληρωμής προς θεραπευτές ({payoutTotal}€)
            </div>
            <div style={{ fontSize: 12, color: "#1E40AF", opacity: 0.85, marginTop: 2 }}>
              Ανήκουν στο παλιό μοντέλο, όπου η πλατφόρμα εισέπραττε από τον ασθενή.
              Σήμερα ο ασθενής πληρώνει τον θεραπευτή απευθείας σε μετρητά.
            </div>
          </div>
          <button onClick={() => { setStatusFilter("pending_payout"); setTherapistId("all"); setPeriod("all"); setSearch(""); }}
            style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#1D4ED8", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0 }}>
            Δες τα
          </button>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <StatCard Icon={Wallet}        label="Σύνολο"       value={`${sum(rows)}€`}          sub={`${rows.length} περιστατικά`}            bg="#F8FAFC" border="#E2E8F0" text="#475569" />
        <StatCard Icon={CheckCircle2}  label="Εισπραγμένα"  value={`${sum(collectedRows)}€`} sub={`${collectedRows.length} περιστατικά`}   bg="#F0FDF4" border="#BBF7D0" text="#15803D" />
        <StatCard Icon={Clock}         label="Ανοιχτά"      value={`${sum(openRowsAll)}€`}   sub={`${openRowsAll.length} περιστατικά`}     bg="#FFFBEB" border="#FDE68A" text="#B45309" />
        <StatCard Icon={AlertTriangle} label="Ληξιπρόθεσμα" value={`${sum(overdueRows)}€`}   sub={`${overdueRows.length} πάνω από 30 ημ.`} bg="#FFF1F2" border="#FECDD3" text="#BE123C" />
        <StatCard Icon={Banknote}      label="Προς θεραπ."  value={`${payoutTotal}€`}        sub={`${payoutRows.length} εκκρεμείς`}        bg="#EFF6FF" border="#BFDBFE" text="#1D4ED8" />
        <StatCard Icon={RotateCcw}     label="Επιστροφές"   value={`${refundTotal}€`}        sub={`${refundedRows.length} περιστατικά`}    bg="#FDF2F8" border="#FBCFE8" text="#9D174D" />
        <StatCard Icon={TrendingUp}    label="Τρέχων μήνας" value={`${sum(monthRows)}€`}     sub={`${monthRows.length} εισπράξεις`}        bg="#F5F3FF" border="#DDD6FE" text="#6D28D9" />
      </div>

      {/* FILTERS */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
          <option value="all">Όλες οι καταστάσεις ({rows.length})</option>
          <option value="open">Ανοιχτά ({openRowsAll.length})</option>
          <option value="collected">Εισπραγμένα ({collectedRows.length})</option>
          <option value="overdue">Ληξιπρόθεσμα ({overdueRows.length})</option>
          <option value="__sep" disabled>──────────</option>
          {Object.entries(STATUSES).map(([k, v]) => (
            <option key={k} value={k}>{v.label} ({rows.filter((r) => r.status === k).length})</option>
          ))}
        </select>

        <select value={therapistId} onChange={(e) => setTherapistId(e.target.value)} style={selectStyle}>
          <option value="all">Όλοι οι θεραπευτές</option>
          {therapists.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>

        <select value={period} onChange={(e) => setPeriod(e.target.value)} style={selectStyle}>
          <option value="all">Όλη η περίοδος</option>
          <option value="month">Τρέχων μήνας</option>
          <option value="30">Τελευταίες 30 ημέρες</option>
          <option value="90">Τελευταίες 90 ημέρες</option>
        </select>

        <div style={{ flex: 1, minWidth: 200, display: "flex", alignItems: "center", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, padding: "0 14px" }}>
          <Search size={14} color="#94A3B8" />
          <input type="text" placeholder="Αναζήτηση θεραπευτή, ασθενή, Stripe ID..." value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, padding: "9px 10px", border: "none", fontSize: 13, fontFamily: "inherit", background: "transparent", outline: "none", color: "#0F172A" }} />
        </div>
      </div>

      {/* LIST */}
      {groups.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0", padding: 48, textAlign: "center" }}>
          <Users size={32} color="#CBD5E1" style={{ margin: "0 auto 12px" }} />
          <div style={{ fontSize: 14, color: "#94A3B8" }}>
            {rows.length === 0
              ? "Δεν υπάρχουν πληρωμές ακόμα. Δημιουργούνται αυτόματα όταν ανατίθεται αίτημα σε θεραπευτή."
              : "Δεν βρέθηκαν πληρωμές με αυτά τα φίλτρα."}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {groups.map((g) => {
            const isExpanded = expanded === g.id;
            const hasOverdue = g.open.some((c) => c.age >= 30);

            return (
              <div key={g.id} style={{ background: "#fff", borderRadius: 14, border: `1px solid ${hasOverdue ? "#FECDD3" : "#E2E8F0"}`, overflow: "hidden" }}>

                <div onClick={() => setExpanded(isExpanded ? null : g.id)}
                  style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>
                  <Avatar name={g.name} photo={g.photo} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: "#0F172A" }}>{g.name}</span>
                      {hasOverdue && (
                        <span style={{ background: "#FFE4E6", color: "#9F1239", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <AlertTriangle size={11} strokeWidth={2.5} /> {g.oldest} ημέρες
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                      {g.specialty || "—"}{g.area ? ` · ${g.area}` : ""}{g.iban ? " · IBAN καταχωρημένο" : ""}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 20, alignItems: "center", flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <div style={{ textAlign: "center", minWidth: 60 }}>
                      <div style={{ fontSize: 17, fontWeight: 700, color: "#0F172A" }}>{g.cases.length}</div>
                      <div style={{ fontSize: 11, color: "#94A3B8" }}>περιστατικά</div>
                    </div>
                    <div style={{ textAlign: "center", minWidth: 70 }}>
                      <div style={{ fontSize: 17, fontWeight: 700, color: "#15803D" }}>{g.collectedAmount}€</div>
                      <div style={{ fontSize: 11, color: "#94A3B8" }}>εισπράχθηκε</div>
                    </div>
                    <div style={{ textAlign: "center", minWidth: 70 }}>
                      <div style={{ fontSize: 17, fontWeight: 700, color: g.openAmount > 0 ? "#BE123C" : "#15803D" }}>{g.openAmount}€</div>
                      <div style={{ fontSize: 11, color: "#94A3B8" }}>ανοιχτά</div>
                    </div>

                    {g.open.length > 0 ? (
                      <button onClick={(e) => { e.stopPropagation(); markAllPaid(g.name, g.open); }} disabled={busy}
                        style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: busy ? "#94A3B8" : "#15803D", color: "#fff", fontSize: 12, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                        <CheckCircle2 size={13} /> Είσπραξη όλων
                      </button>
                    ) : (
                      <span style={{ fontSize: 12, color: "#15803D", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
                        <CheckCircle2 size={13} /> Τακτοποιημένο
                      </span>
                    )}

                    <ChevronDown size={18} color="#94A3B8" style={{ transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }} />
                  </div>
                </div>

                {/* EXPANDED */}
                {isExpanded && (
                  <div style={{ borderTop: "1px solid #F1F5F9" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 70px 90px 150px 140px", padding: "10px 20px", background: "#F8FAFC", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      <span>Ασθενής</span>
                      <span>Ημερομηνία</span>
                      <span>Ημέρες</span>
                      <span>Τέλος νέου ασθενή</span>
                      <span>Κατάσταση</span>
                      <span>Ενέργειες</span>
                    </div>

                    {g.cases.map((c, i) => (
                      <div key={c.id} style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 70px 90px 150px 140px", padding: "12px 20px", borderTop: "1px solid #F8FAFC", alignItems: "center", background: i % 2 === 0 ? "#fff" : "#FAFAFA" }}>
                        <div style={{ minWidth: 0, cursor: "pointer" }} onClick={() => openDetail(c)}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: "#1D4ED8" }}>{c.patient}</div>
                          {c.problem && <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{c.problem}</div>}
                        </div>

                        <span style={{ fontSize: 13, color: "#64748B", display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <CalendarDays size={12} color="#CBD5E1" /> {fmtDate(c.created_at)}
                        </span>

                        <span style={{ fontSize: 13, fontWeight: 600, color: OPEN.includes(c.status) && c.age >= 30 ? "#BE123C" : "#94A3B8" }}>{c.age}</span>

                        <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{c.amount}€</span>

                        <div><StatusBadge status={c.status} /></div>

                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          {OPEN.includes(c.status) && (
                            <button onClick={() => setStatus(c.id, "paid")} disabled={busy} title="Σήμανση ως εξοφλημένο"
                              style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #BBF7D0", background: "#F0FDF4", color: "#15803D", fontSize: 11, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 4 }}>
                              <CheckCircle2 size={12} /> Είσπραξη
                            </button>
                          )}
                          {c.status === "paid" && (
                            <button onClick={() => setStatus(c.id, "pending_payout")} disabled={busy} title="Σήμανση για πληρωμή θεραπευτή"
                              style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #BFDBFE", background: "#EFF6FF", color: "#1D4ED8", fontSize: 11, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 4 }}>
                              <Banknote size={12} /> Payout
                            </button>
                          )}
                          {c.status === "pending_payout" && (
                            <button onClick={() => setStatus(c.id, "paid_out")} disabled={busy} title="Ο θεραπευτής πληρώθηκε"
                              style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #C7D2FE", background: "#EEF2FF", color: "#4338CA", fontSize: 11, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 4 }}>
                              <CheckCircle2 size={12} /> Πληρώθηκε
                            </button>
                          )}
                          {COLLECTED.includes(c.status) && (
                            <button onClick={() => { if (confirm("Αναίρεση; Θα ξαναγίνει απλήρωτο.")) setStatus(c.id, "unpaid"); }} disabled={busy} title="Αναίρεση"
                              style={{ padding: "5px 7px", borderRadius: 6, border: "1px solid #E2E8F0", background: "transparent", color: "#94A3B8", cursor: busy ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center" }}>
                              <Undo2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 70px 90px 150px 140px", padding: "12px 20px", background: "#F8FAFC", borderTop: "1px solid #E2E8F0" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>Σύνολο</span>
                      <span /><span />
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{sum(g.cases)}€</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: g.openAmount > 0 ? "#BE123C" : "#15803D" }}>
                        {g.openAmount > 0 ? `${g.openAmount}€ ανοιχτά` : "Τακτοποιημένο"}
                      </span>
                      <span />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ DETAIL MODAL ═══ */}
      {detail && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 }}
          onClick={(e) => { if (e.target === e.currentTarget) setDetail(null); }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 28, maxWidth: 560, width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>

            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: 19, fontWeight: 700, color: "#0F172A", margin: 0 }}>Λεπτομέρειες πληρωμής</h2>
                <div style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>
                  {detail.patient} → {detail.therapist_name}
                </div>
              </div>
              <button onClick={() => setDetail(null)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94A3B8", padding: 2 }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ background: "#F8FAFC", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 12, color: "#475569", lineHeight: 1.8 }}>
              <div><strong>Δημιουργήθηκε:</strong> {fmtDate(detail.created_at)} ({detail.age} ημέρες)</div>
              {detail.paid_at && <div><strong>Εισπράχθηκε:</strong> {fmtDate(detail.paid_at)}</div>}
              {detail.payout_at && <div><strong>Πληρώθηκε ο θεραπευτής:</strong> {fmtDate(detail.payout_at)}</div>}
              {detail.refunded_at && <div><strong>Επιστροφή:</strong> {fmtDate(detail.refunded_at)}</div>}
              {detail.therapist_iban && <div><strong>IBAN:</strong> {detail.therapist_iban}</div>}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Κατάσταση</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>
                  {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Ποσό συνεδρίας (€)</label>
                  <input type="number" value={form.patient_amount} onChange={(e) => setForm({ ...form, patient_amount: e.target.value })} placeholder="π.χ. 300" style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Τέλος νέου ασθενή (€)</label>
                  <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Καθαρά θεραπευτή (€) · παλαιό πεδίο</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="number" value={form.therapist_net} onChange={(e) => setForm({ ...form, therapist_net: e.target.value })} placeholder="π.χ. 100" style={inputStyle} />
                  <button onClick={autoNet}
                    style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #E2E8F0", background: "#F8FAFC", color: "#475569", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                    Αυτόματα
                  </button>
                </div>
                <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>
                  Ανήκει στο παλιό μοντέλο. Σήμερα ο θεραπευτής εισπράττει ολόκληρο το ποσό
                  σε μετρητά και οφείλει μόνο το τέλος νέου ασθενή.
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Μέθοδος πληρωμής</label>
                  <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>
                    <option value="">—</option>
                    {Object.entries(METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Ποσό επιστροφής (€)</label>
                  <input type="number" value={form.refund_amount} onChange={(e) => setForm({ ...form, refund_amount: e.target.value })} style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Stripe Payment ID</label>
                <input type="text" value={form.stripe_payment_id} onChange={(e) => setForm({ ...form, stripe_payment_id: e.target.value })} placeholder="pi_..." style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Σημείωση admin</label>
                <textarea value={form.admin_note} onChange={(e) => setForm({ ...form, admin_note: e.target.value })} rows={3}
                  placeholder="π.χ. Συμφωνήθηκε πληρωμή σε 2 δόσεις."
                  style={{ ...inputStyle, resize: "vertical" }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button onClick={() => setDetail(null)} disabled={busy}
                style={{ flex: 1, padding: "12px", borderRadius: 30, border: "1px solid #E2E8F0", background: "transparent", color: "#64748B", fontSize: 14, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                Ακύρωση
              </button>
              <button onClick={saveDetail} disabled={busy}
                style={{ flex: 2, padding: "12px", borderRadius: 30, border: "none", background: busy ? "#94A3B8" : "#1D4ED8", color: "#fff", fontSize: 14, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Save size={14} />
                {busy ? "Αποθήκευση..." : "Αποθήκευση"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}