"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

// ─── Δυναμική εμφάνιση ΟΛΩΝ των καταχωρημένων στοιχείων του χρήστη ───
const FIELD_LABELS = {
  name: "Όνομα", full_name: "Ονοματεπώνυμο", email: "Email",
  phone: "Τηλέφωνο", phone2: "Τηλέφωνο 2", mobile: "Κινητό", telephone: "Τηλέφωνο",
  address: "Διεύθυνση", area: "Περιοχή", region: "Περιοχή", city: "Πόλη",
  postal_code: "Τ.Κ.", zip: "Τ.Κ.", zip_code: "Τ.Κ.",
  iban: "IBAN", bank: "Τράπεζα", bank_name: "Τράπεζα", bank_account: "Αρ. Λογαριασμού",
  payout_name: "Δικαιούχος", account_holder: "Δικαιούχος", beneficiary: "Δικαιούχος",
  afm: "ΑΦΜ", vat: "ΑΦΜ", tax_id: "ΑΦΜ", amka: "ΑΜΚΑ", doy: "ΔΟΥ",
  date_of_birth: "Ημ. Γέννησης", birth_date: "Ημ. Γέννησης", gender: "Φύλο",
  emergency_contact: "Επαφή έκτακτης ανάγκης", emergency_phone: "Τηλ. έκτακτης ανάγκης",
  notes: "Σημειώσεις χρήστη",
};
const CONTACT_ORDER = [
  "email", "phone", "mobile", "telephone", "phone2",
  "emergency_contact", "emergency_phone",
  "address", "area", "region", "city", "postal_code", "zip", "zip_code",
  "iban", "bank", "bank_name", "bank_account", "payout_name", "account_holder", "beneficiary",
  "afm", "vat", "tax_id", "amka", "doy",
  "date_of_birth", "birth_date", "gender", "notes",
];
const CONTACT_EXCLUDE = new Set([
  "id", "user_id", "auth_id", "created_at", "updated_at",
  "support_tags", "admin_comment", "name", "full_name",
  "requests", "reviews", "totalRequests", "completed", "active", "cancelled", "unpaid", "lastActivity",
  "photo_url", "avatar_url", "is_approved", "application_status", "reject_reason_code",
  "license_verified", "verified_at", "verified_by", "license_url", "cv_url", "certifications_urls",
  "service_areas", "is_profile_complete", "is_profile_full", "is_paused", "paused_reason",
  "quality_score", "completeness_score", "subscription_exempt", "fee_exempt", "exempt_reason",
  "terms_accepted_at", "rank_weight", "availability_slots",
  "specialty", "price_per_session", "years_experience", "bio",
  "education_school", "education_year", "education_degree", "response_time_hours",
]);
function cmPretty(k) { return FIELD_LABELS[k] || k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()); }
function cmShowable(v) { return v !== null && v !== undefined && v !== "" && typeof v !== "object" && typeof v !== "boolean"; }
function buildContactRows(rec, fmtDate) {
  if (!rec) return [];
  const knownSet = new Set(CONTACT_ORDER);
  const known = CONTACT_ORDER.filter((k) => cmShowable(rec[k])).map((k) => [cmPretty(k), String(rec[k])]);
  const extra = Object.keys(rec)
    .filter((k) => !CONTACT_EXCLUDE.has(k) && !knownSet.has(k) && cmShowable(rec[k]))
    .map((k) => [cmPretty(k), String(rec[k])]);
  const rows = [...known, ...extra];
  if (rec.created_at && fmtDate) rows.push(["Εγγραφή", fmtDate(rec.created_at)]);
  return rows;
}

import {
  Search, Download, User, Phone, MapPin, Calendar, X, Plus, Trash2,
  ClipboardList, Star, Wallet, XCircle, CheckCircle2, AlertTriangle,
  MessageSquare, Tag, Ban, Home,
} from "lucide-react";

// ─── SUPPORT TAGS ────────────────────────────────────────────────────────
const PATIENT_TAGS = [
  "Επείγον",
  "Θέλει follow-up",
  "Πρόβλημα πληρωμής",
  "Παράπονο",
  "VIP / προτεραιότητα",
  "Χρειάζεται τηλεφώνημα",
  "Δύσκολη πρόσβαση",
  "Πολλές ακυρώσεις",
];

// ─── CSV ─────────────────────────────────────────────────────────────────
function exportCsv(filename, rows) {
  if (!rows || rows.length === 0) {
    alert("Δεν υπάρχουν δεδομένα για εξαγωγή.");
    return;
  }
  const headers = Object.keys(rows[0]);
  const esc = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(";"), ...rows.map((r) => headers.map((h) => esc(r[h])).join(";"))].join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── HELPERS ─────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("el-GR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("el-GR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const STATUS_LABELS = {
  pending: { label: "Εκκρεμές", bg: "#FEF3C7", color: "#B45309" },
  confirmed: { label: "Επιβεβαιωμένο", bg: "#DBEAFE", color: "#1D4ED8" },
  completed: { label: "Ολοκληρωμένο", bg: "#D1FAE5", color: "#065F46" },
  cancelled: { label: "Ακυρωμένο", bg: "#FFE4E6", color: "#9F1239" },
  cancelled_by_admin: { label: "Ακυρώθηκε (admin)", bg: "#FFE4E6", color: "#9F1239" },
  cancelled_by_patient: { label: "Ακυρώθηκε (ασθενής)", bg: "#FFE4E6", color: "#9F1239" },
  cancelled_by_therapist: { label: "Ακυρώθηκε (θεραπευτής)", bg: "#FFE4E6", color: "#9F1239" },
};

function StatusBadge({ status }) {
  const s = STATUS_LABELS[status] || { label: status || "—", bg: "#F1F5F9", color: "#64748B" };
  return (
    <span style={{ background: s.bg, color: s.color, padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

function Avatar({ name, size = 40 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "#F0FDF4", color: "#15803D", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.33, fontWeight: 700, flexShrink: 0 }}>
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
      <div style={{ fontSize: 28, fontWeight: 700, color: text, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: text, opacity: 0.7, marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [busy, setBusy] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all | active | no_requests | cancellations | unpaid
  const [area, setArea] = useState("all");

  // Drawer
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("overview"); // overview | requests | notes
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [comment, setComment] = useState("");

  useEffect(() => { init(); }, []);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    await fetchAll();
  }

  async function fetchAll() {
    setLoading(true);

    const [
      { data: pts },
      { data: reqs },
      { data: bookings },
      { data: rvs },
      { data: pays },
      { data: ths },
    ] = await Promise.all([
      supabase.from("patient_profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("session_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("session_bookings").select("id, request_id, session_date, session_time, status"),
      supabase.from("reviews").select("id, patient_id, therapist_id, rating, comment, created_at"),
      supabase.from("payments").select("id, request_id, therapist_id, amount, status, paid, created_at"),
      supabase.from("therapist_profiles").select("id, name"),
    ]);

    const tMap = {};
    (ths || []).forEach((t) => { tMap[t.id] = t.name; });

    const bookingsByReq = {};
    (bookings || []).forEach((b) => {
      if (!bookingsByReq[b.request_id]) bookingsByReq[b.request_id] = [];
      bookingsByReq[b.request_id].push(b);
    });

    const payByReq = {};
    (pays || []).forEach((p) => { payByReq[p.request_id] = p; });

    const enriched = (pts || []).map((p) => {
      const myReqs = (reqs || [])
        .filter((r) => r.patient_id === p.id)
        .map((r) => ({
          ...r,
          therapist_name: r.therapist_id ? (tMap[r.therapist_id] || "Άγνωστος") : null,
          bookings: bookingsByReq[r.id] || [],
          payment: payByReq[r.id] || null,
        }));

      const myReviews = (rvs || [])
        .filter((r) => r.patient_id === p.id)
        .map((r) => ({ ...r, therapist_name: tMap[r.therapist_id] || "Άγνωστος" }));

      const isCancelled = (s) => (s || "").startsWith("cancelled");

      const completed = myReqs.filter((r) => r.status === "completed").length;
      const cancelled = myReqs.filter((r) => isCancelled(r.status)).length;
      const active = myReqs.filter((r) => r.status === "pending" || r.status === "confirmed").length;
      const unpaid = myReqs.filter((r) => r.payment && !r.payment.paid).length;

      return {
        ...p,
        requests: myReqs,
        reviews: myReviews,
        totalRequests: myReqs.length,
        completed,
        cancelled,
        active,
        unpaid,
        lastActivity: myReqs[0]?.created_at || p.created_at,
      };
    });

    setPatients(enriched);
    setLoading(false);
  }

  // ─── DRAWER ────────────────────────────────────────────────────────────
  async function openPatient(p) {
    setSelected(p);
    setTab("overview");
    setComment(p.admin_comment || "");
    setNewNote("");
    const { data } = await supabase
      .from("patient_notes")
      .select("*")
      .eq("patient_id", p.id)
      .order("created_at", { ascending: false });
    setNotes(data || []);
  }

  async function refreshSelected(id) {
    await fetchAll();
    const { data } = await supabase.from("patient_profiles").select("*").eq("id", id).maybeSingle();
    if (data) setSelected((prev) => (prev ? { ...prev, ...data } : prev));
  }

  async function addNote() {
    if (!newNote.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("patient_notes").insert({
      patient_id: selected.id,
      body: newNote.trim(),
      author_id: user?.id,
      author_email: user?.email,
    });
    if (error) { alert("Σφάλμα: " + error.message); setBusy(false); return; }
    const { data } = await supabase
      .from("patient_notes").select("*")
      .eq("patient_id", selected.id)
      .order("created_at", { ascending: false });
    setNotes(data || []);
    setNewNote("");
    setBusy(false);
  }

  async function deleteNote(id) {
    if (!confirm("Διαγραφή σημείωσης;")) return;
    setBusy(true);
    await supabase.from("patient_notes").delete().eq("id", id);
    setNotes((n) => n.filter((x) => x.id !== id));
    setBusy(false);
  }

  async function toggleTag(tag) {
    const current = selected.support_tags || [];
    const next = current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag];
    setSelected({ ...selected, support_tags: next });
    setBusy(true);
    await supabase.from("patient_profiles").update({ support_tags: next }).eq("id", selected.id);
    await refreshSelected(selected.id);
    setBusy(false);
  }

  async function saveComment() {
    setBusy(true);
    const { error } = await supabase
      .from("patient_profiles")
      .update({ admin_comment: comment.trim() || null })
      .eq("id", selected.id);
    if (error) alert("Σφάλμα: " + error.message);
    await refreshSelected(selected.id);
    setBusy(false);
    alert("Η σημείωση αποθηκεύτηκε.");
  }

  async function toggleBlock() {
    const blocking = !selected.is_blocked;
    let reason = null;
    if (blocking) {
      reason = prompt("Λόγος αποκλεισμού ασθενή:");
      if (reason === null) return;
      if (!reason.trim()) { alert("Χρειάζεται λόγος."); return; }
    } else {
      if (!confirm("Άρση αποκλεισμού;")) return;
    }
    setBusy(true);
    await supabase.from("patient_profiles").update({
      is_blocked: blocking,
      blocked_reason: blocking ? reason.trim() : null,
    }).eq("id", selected.id);
    await refreshSelected(selected.id);
    setBusy(false);
  }

  // ─── FILTER ────────────────────────────────────────────────────────────
  const areas = [...new Set(patients.map((p) => p.area).filter(Boolean))].sort((a, b) => a.localeCompare(b, "el"));

  const filtered = patients.filter((p) => {
    if (area !== "all" && p.area !== area) return false;
    if (filter === "active" && p.active === 0) return false;
    if (filter === "no_requests" && p.totalRequests > 0) return false;
    if (filter === "cancellations" && p.cancelled === 0) return false;
    if (filter === "unpaid" && p.unpaid === 0) return false;
    if (search.trim()) {
      const hay = `${p.name || ""} ${p.phone || ""} ${p.area || ""} ${p.city || ""} ${p.address || ""}`.toLowerCase();
      if (!hay.includes(search.trim().toLowerCase())) return false;
    }
    return true;
  });

  const counts = {
    all: patients.length,
    active: patients.filter((p) => p.active > 0).length,
    no_requests: patients.filter((p) => p.totalRequests === 0).length,
    cancellations: patients.filter((p) => p.cancelled > 0).length,
    unpaid: patients.filter((p) => p.unpaid > 0).length,
  };

  function handleExport() {
    exportCsv(
      `physiohome-astheneis-${new Date().toISOString().slice(0, 10)}.csv`,
      filtered.map((p) => ({
        Όνομα: p.name || "",
        Τηλέφωνο: p.phone || "",
        Περιοχή: p.area || "",
        Πόλη: p.city || "",
        Διεύθυνση: p.address || "",
        ΤΚ: p.postal_code || "",
        Αιτήματα: p.totalRequests,
        Ενεργά: p.active,
        Ολοκληρωμένα: p.completed,
        Ακυρώσεις: p.cancelled,
        Απλήρωτα: p.unpaid,
        Αξιολογήσεις: p.reviews.length,
        Tags: (p.support_tags || []).join(" | "),
        Αποκλεισμένος: p.is_blocked ? "ΝΑΙ" : "",
        Εγγραφή: fmtDate(p.created_at),
      }))
    );
  }

  const selectStyle = { padding: "9px 12px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, fontFamily: "inherit", background: "#fff", color: "#0F172A", outline: "none", cursor: "pointer" };

  if (loading) {
    return (
      <div style={{ padding: 24, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <div style={{ fontSize: 16, color: "#64748B" }}>Φόρτωση ασθενών...</div>
      </div>
    );
  }

  return (
    <div>
      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0F172A", margin: 0 }}>Ασθενείς</h1>
          <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>
            Φάκελος ασθενή — ιστορικό, αιτήματα, πληρωμές, σημειώσεις
          </p>
        </div>
        <button onClick={handleExport}
          style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid #E2E8F0", background: "#fff", color: "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Download size={14} />
          Εξαγωγή CSV ({filtered.length})
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <StatCard Icon={User}          label="Σύνολο"       value={counts.all}           sub="εγγεγραμμένοι"        bg="#F8FAFC" border="#E2E8F0" text="#475569" />
        <StatCard Icon={ClipboardList} label="Με ενεργά"     value={counts.active}        sub="σε εξέλιξη"           bg="#EFF6FF" border="#BFDBFE" text="#1D4ED8" />
        <StatCard Icon={XCircle}       label="Με ακυρώσεις"  value={counts.cancellations} sub="χρειάζονται προσοχή"  bg="#FFF1F2" border="#FECDD3" text="#BE123C" />
        <StatCard Icon={Wallet}        label="Με απλήρωτα"   value={counts.unpaid}        sub="εκκρεμείς προμήθειες" bg="#FFFBEB" border="#FDE68A" text="#B45309" />
        <StatCard Icon={AlertTriangle} label="Χωρίς αίτημα"  value={counts.no_requests}   sub="εγγράφηκαν, δεν ζήτησαν" bg="#F1F5F9" border="#E2E8F0" text="#64748B" />
      </div>

      {/* FILTERS */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 4, background: "#E2E8F0", padding: 4, borderRadius: 10, flexWrap: "wrap" }}>
          {[
            ["all", "Όλοι"],
            ["active", "Ενεργοί"],
            ["cancellations", "Με ακυρώσεις"],
            ["unpaid", "Με απλήρωτα"],
            ["no_requests", "Χωρίς αίτημα"],
          ].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)}
              style={{ padding: "6px 14px", borderRadius: 7, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: filter === val ? "#fff" : "transparent", color: filter === val ? "#0F172A" : "#64748B", boxShadow: filter === val ? "0 1px 4px rgba(0,0,0,0.1)" : "none" }}>
              {label} <span style={{ marginLeft: 4, fontSize: 11, color: filter === val ? "#1D4ED8" : "#94A3B8" }}>{counts[val]}</span>
            </button>
          ))}
        </div>

        <select value={area} onChange={(e) => setArea(e.target.value)} style={selectStyle}>
          <option value="all">Όλες οι περιοχές</option>
          {areas.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>

        <div style={{ flex: 1, minWidth: 200, display: "flex", alignItems: "center", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, padding: "0 14px" }}>
          <Search size={14} color="#94A3B8" />
          <input type="text" placeholder="Αναζήτηση ονόματος, τηλεφώνου, περιοχής..." value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, padding: "9px 10px", border: "none", fontSize: 13, fontFamily: "inherit", background: "transparent", outline: "none", color: "#0F172A" }} />
        </div>
      </div>

      {/* LIST */}
      {filtered.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0", padding: 48, textAlign: "center" }}>
          <User size={32} color="#CBD5E1" style={{ margin: "0 auto 12px" }} />
          <div style={{ fontSize: 14, color: "#94A3B8" }}>
            {patients.length === 0 ? "Δεν υπάρχουν εγγεγραμμένοι ασθενείς ακόμα." : "Δεν βρέθηκαν ασθενείς με αυτά τα φίλτρα."}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((p) => (
            <div key={p.id} onClick={() => openPatient(p)}
              style={{ background: "#fff", borderRadius: 14, border: `1px solid ${p.is_blocked ? "#FECDD3" : "#E2E8F0"}`, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>

              <Avatar name={p.name} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: "#0F172A" }}>{p.name || "Χωρίς όνομα"}</span>
                  {p.is_blocked && (
                    <span style={{ background: "#FFE4E6", color: "#9F1239", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Ban size={11} /> Αποκλεισμένος
                    </span>
                  )}
                  {(p.support_tags || []).slice(0, 2).map((t) => (
                    <span key={t} style={{ background: "#EFF6FF", color: "#1D4ED8", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600 }}>{t}</span>
                  ))}
                  {(p.support_tags || []).length > 2 && (
                    <span style={{ fontSize: 11, color: "#94A3B8" }}>+{p.support_tags.length - 2}</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "#64748B", marginTop: 3, display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {p.phone && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Phone size={11} /> {p.phone}</span>}
                  {p.area && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><MapPin size={11} /> {p.area}</span>}
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Calendar size={11} /> Εγγραφή {fmtDate(p.created_at)}</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 18, alignItems: "center", flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <div style={{ textAlign: "center", minWidth: 50 }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: "#0F172A" }}>{p.totalRequests}</div>
                  <div style={{ fontSize: 11, color: "#94A3B8" }}>αιτήματα</div>
                </div>
                <div style={{ textAlign: "center", minWidth: 50 }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: "#15803D" }}>{p.completed}</div>
                  <div style={{ fontSize: 11, color: "#94A3B8" }}>ολοκλ.</div>
                </div>
                <div style={{ textAlign: "center", minWidth: 50 }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: p.cancelled > 0 ? "#BE123C" : "#94A3B8" }}>{p.cancelled}</div>
                  <div style={{ fontSize: 11, color: "#94A3B8" }}>ακυρώσεις</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ DRAWER ═══ */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", justifyContent: "flex-end", zIndex: 1000 }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div style={{ background: "#F8FAFC", width: "100%", maxWidth: 720, height: "100%", overflowY: "auto", boxShadow: "-8px 0 40px rgba(0,0,0,0.15)" }}>

            {/* HEADER */}
            <div style={{ background: "#fff", padding: "20px 24px", borderBottom: "1px solid #E2E8F0", position: "sticky", top: 0, zIndex: 5 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <Avatar name={selected.name} size={52} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0F172A", margin: 0 }}>{selected.name || "Χωρίς όνομα"}</h2>
                    {selected.is_blocked && (
                      <span style={{ background: "#FFE4E6", color: "#9F1239", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Αποκλεισμένος</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 4, display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {selected.phone && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Phone size={11} /> {selected.phone}</span>}
                    {selected.area && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><MapPin size={11} /> {selected.area}</span>}
                  </div>
                </div>
                <button onClick={() => setSelected(null)}
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94A3B8", padding: 4 }}>
                  <X size={22} />
                </button>
              </div>

              {selected.is_blocked && selected.blocked_reason && (
                <div style={{ marginTop: 12, padding: "10px 14px", background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: 8, fontSize: 12, color: "#9F1239" }}>
                  <strong>Λόγος αποκλεισμού:</strong> {selected.blocked_reason}
                </div>
              )}

              {/* TABS */}
              <div style={{ display: "flex", gap: 4, background: "#E2E8F0", padding: 4, borderRadius: 10, marginTop: 16 }}>
                {[
                  ["overview", "Επισκόπηση"],
                  ["requests", `Αιτήματα (${selected.requests.length})`],
                  ["notes", `Σημειώσεις (${notes.length})`],
                ].map(([val, label]) => (
                  <button key={val} onClick={() => setTab(val)}
                    style={{ flex: 1, padding: "8px 14px", borderRadius: 7, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: tab === val ? "#fff" : "transparent", color: tab === val ? "#0F172A" : "#64748B", boxShadow: tab === val ? "0 1px 4px rgba(0,0,0,0.1)" : "none" }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ padding: 24 }}>

              {/* ── TAB: OVERVIEW ── */}
              {tab === "overview" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                  {/* Stats */}
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {[
                      { label: "Αιτήματα", value: selected.totalRequests, color: "#0F172A" },
                      { label: "Ολοκληρωμένα", value: selected.completed, color: "#15803D" },
                      { label: "Ακυρώσεις", value: selected.cancelled, color: selected.cancelled > 0 ? "#BE123C" : "#94A3B8" },
                      { label: "Αξιολογήσεις", value: selected.reviews.length, color: "#B45309" },
                    ].map((s) => (
                      <div key={s.label} style={{ flex: 1, minWidth: 110, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "14px 16px" }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                        <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Στοιχεία */}
                  <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                      <Home size={14} color="#1D4ED8" /> Στοιχεία επικοινωνίας
                    </div>
                    {buildContactRows(selected, fmtDate).map(([k, v]) => (
                      <div key={k} style={{ display: "flex", padding: "8px 0", borderTop: "1px solid #F1F5F9", fontSize: 13 }}>
                        <span style={{ width: 150, color: "#94A3B8", flexShrink: 0 }}>{k}</span>
                        <span style={{ color: v ? "#0F172A" : "#CBD5E1", fontWeight: v ? 600 : 400, wordBreak: "break-word" }}>{v || "—"}</span>
                      </div>
                    ))}
                    {buildContactRows(selected, fmtDate).length === 0 && (
                      <div style={{ fontSize: 13, color: "#94A3B8", padding: "8px 0" }}>Δεν έχουν καταχωρηθεί στοιχεία.</div>
                    )}
                  </div>

                  {/* Tags */}
                  <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                      <Tag size={14} color="#1D4ED8" /> Support Tags
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {PATIENT_TAGS.map((t) => {
                        const on = (selected.support_tags || []).includes(t);
                        return (
                          <button key={t} onClick={() => toggleTag(t)} disabled={busy}
                            style={{ padding: "6px 14px", borderRadius: 30, border: `1px solid ${on ? "#1D4ED8" : "#E2E8F0"}`, background: on ? "#EFF6FF" : "#fff", color: on ? "#1D4ED8" : "#64748B", fontSize: 12, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Admin comment */}
                  <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                      <MessageSquare size={14} color="#1D4ED8" /> Σχόλιο admin
                    </div>
                    <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3}
                      placeholder="π.χ. Προτιμά απογευματινές ώρες. Δεν έχει ασανσέρ."
                      style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none", color: "#0F172A", resize: "vertical", boxSizing: "border-box" }} />
                    <button onClick={saveComment} disabled={busy}
                      style={{ marginTop: 10, padding: "8px 18px", borderRadius: 8, border: "none", background: busy ? "#94A3B8" : "#1D4ED8", color: "#fff", fontSize: 12, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                      Αποθήκευση
                    </button>
                  </div>

                  {/* Reviews */}
                  {selected.reviews.length > 0 && (
                    <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 20 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                        <Star size={14} color="#B45309" /> Αξιολογήσεις που άφησε
                      </div>
                      {selected.reviews.map((r) => (
                        <div key={r.id} style={{ padding: "10px 0", borderTop: "1px solid #F1F5F9" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                            <span style={{ fontWeight: 700, color: "#B45309" }}>{r.rating}/5</span>
                            <span style={{ color: "#1D4ED8", fontWeight: 600 }}>{r.therapist_name}</span>
                            <span style={{ color: "#94A3B8", marginLeft: "auto" }}>{fmtDate(r.created_at)}</span>
                          </div>
                          {r.comment && <div style={{ fontSize: 13, color: "#475569", marginTop: 4, fontStyle: "italic" }}>{r.comment}</div>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Block */}
                  <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 20 }}>
                    <button onClick={toggleBlock} disabled={busy}
                      style={{ padding: "10px 18px", borderRadius: 8, border: `1px solid ${selected.is_blocked ? "#BBF7D0" : "#FECDD3"}`, background: selected.is_blocked ? "#F0FDF4" : "#FFF1F2", color: selected.is_blocked ? "#15803D" : "#BE123C", fontSize: 13, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}>
                      {selected.is_blocked ? <><CheckCircle2 size={14} /> Άρση αποκλεισμού</> : <><Ban size={14} /> Αποκλεισμός ασθενή</>}
                    </button>
                  </div>
                </div>
              )}

              {/* ── TAB: REQUESTS ── */}
              {tab === "requests" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {selected.requests.length === 0 ? (
                    <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 40, textAlign: "center", color: "#94A3B8", fontSize: 14 }}>
                      Ο ασθενής δεν έχει κάνει κανένα αίτημα ακόμα.
                    </div>
                  ) : selected.requests.map((r) => (
                    <div key={r.id} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 18 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                        <StatusBadge status={r.status} />
                        <span style={{ fontSize: 11, color: "#64748B", background: "#F1F5F9", padding: "3px 10px", borderRadius: 999, fontWeight: 600 }}>
                          {r.type === "free_assessment" ? "Δωρεάν εκτίμηση" : "Κράτηση"}
                        </span>
                        <span style={{ fontSize: 11, color: "#94A3B8", marginLeft: "auto" }}>{fmtDateTime(r.created_at)}</span>
                      </div>

                      <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 6 }}>
                        {r.problem_type || "Χωρίς πάθηση"}
                      </div>
                      {r.problem_description && (
                        <div style={{ fontSize: 13, color: "#475569", marginBottom: 10, lineHeight: 1.5 }}>{r.problem_description}</div>
                      )}

                      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: "#64748B" }}>
                        <span><strong style={{ color: "#0F172A" }}>Θεραπευτής:</strong> {r.therapist_name || <span style={{ color: "#BE123C" }}>Δεν ανατέθηκε</span>}</span>
                        {r.area && <span><strong style={{ color: "#0F172A" }}>Περιοχή:</strong> {r.area}</span>}
                        {r.package_size && <span><strong style={{ color: "#0F172A" }}>Πακέτο:</strong> {r.package_size}</span>}
                      </div>

                      {r.bookings.length > 0 && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #F1F5F9" }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", marginBottom: 6 }}>
                            Συνεδρίες ({r.bookings.length})
                          </div>
                          {r.bookings.map((b) => (
                            <div key={b.id} style={{ fontSize: 12, color: "#475569", padding: "3px 0" }}>
                              {fmtDate(b.session_date)} {b.session_time || ""} — {b.status || "—"}
                            </div>
                          ))}
                        </div>
                      )}

                      {r.payment && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #F1F5F9", display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                          <Wallet size={13} color="#94A3B8" />
                          <span style={{ color: "#64748B" }}>Προμήθεια {r.payment.amount}€ —</span>
                          <span style={{ fontWeight: 700, color: r.payment.paid ? "#15803D" : "#BE123C" }}>
                            {r.payment.paid ? "Εισπράχθηκε" : "Απλήρωτη"}
                          </span>
                        </div>
                      )}

                      {r.cancelled_reason && (
                        <div style={{ marginTop: 12, padding: "10px 14px", background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: 8, fontSize: 12, color: "#9F1239" }}>
                          <strong>Λόγος ακύρωσης:</strong> {r.cancelled_reason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* ── TAB: NOTES ── */}
              {tab === "notes" && (
                <div>
                  <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 20, marginBottom: 16 }}>
                    <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} rows={3}
                      placeholder="Νέα εσωτερική σημείωση... (π.χ. Τηλεφώνησε, ζήτησε αλλαγή ώρας)"
                      style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none", color: "#0F172A", resize: "vertical", boxSizing: "border-box" }} />
                    <button onClick={addNote} disabled={busy || !newNote.trim()}
                      style={{ marginTop: 10, padding: "8px 18px", borderRadius: 8, border: "none", background: busy || !newNote.trim() ? "#94A3B8" : "#1D4ED8", color: "#fff", fontSize: 12, fontWeight: 600, cursor: busy || !newNote.trim() ? "not-allowed" : "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <Plus size={13} /> Προσθήκη σημείωσης
                    </button>
                  </div>

                  {notes.length === 0 ? (
                    <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 40, textAlign: "center", color: "#94A3B8", fontSize: 14 }}>
                      Δεν υπάρχουν σημειώσεις για αυτόν τον ασθενή.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {notes.map((n) => (
                        <div key={n.id} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "14px 18px" }}>
                          <div style={{ fontSize: 13, color: "#0F172A", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{n.body}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 11, color: "#94A3B8" }}>
                            <span>{n.author_email || "Admin"}</span>
                            <span>·</span>
                            <span>{fmtDateTime(n.created_at)}</span>
                            <button onClick={() => deleteNote(n.id)} disabled={busy}
                              style={{ marginLeft: "auto", background: "transparent", border: "none", color: "#CBD5E1", cursor: busy ? "not-allowed" : "pointer", padding: 2, display: "inline-flex" }}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}