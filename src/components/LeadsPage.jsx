"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  Inbox, Search, X, Mail, Phone, MapPin, Save, Download, RefreshCw,
  CheckCircle2, Clock, AlertTriangle, Ban, Star, TrendingUp, Trash2,
} from "lucide-react";

/*
  LEADS — εκδηλώσεις ενδιαφέροντος από τη σελίδα /request

  ΤΙ ΕΙΝΑΙ: επισκέπτες που ήρθαν από διαφήμιση, άφησαν στοιχεία και
  ΠΕΡΙΜΕΝΟΥΝ ΤΗΛΕΦΩΝΗΜΑ. Δεν έχουν λογαριασμό, δεν έχουν ραντεβού.

  ΓΙΑΤΙ ΞΕΧΩΡΙΣΤΑ ΑΠΟ ΤΑ ΑΙΤΗΜΑΤΑ: ένα αίτημα έχει ασθενή, θεραπευτή και
  ώρα. Ένα lead έχει μόνο ένα τηλέφωνο και μια υπόσχεση ότι θα καλέσουμε.
  Αν τα ανακατεύαμε, το SLA των θεραπευτών και τα στατιστικά θα έλεγαν ψέματα.

  ΤΟ ΝΟΥΜΕΡΟ ΠΟΥ ΜΕΤΡΑΕΙ: πόσα leads έγιναν πελάτες. Όλα τα υπόλοιπα
  είναι κόστος διαφήμισης χωρίς αποτέλεσμα.
*/

const STATUS = {
  new:       { label: "Νέο",           bg: "#FFFBEB", fg: "#B45309", br: "#FDE68A", Icon: Clock },
  contacted: { label: "Επικοινώνησα",  bg: "#EFF6FF", fg: "#1D4ED8", br: "#BFDBFE", Icon: Phone },
  converted: { label: "Έγινε πελάτης", bg: "#F0FDF4", fg: "#15803D", br: "#BBF7D0", Icon: CheckCircle2 },
  lost:      { label: "Χάθηκε",        bg: "#FEF2F2", fg: "#BE123C", br: "#FECACA", Icon: X },
  spam:      { label: "Spam",          bg: "#F8FAFC", fg: "#64748B", br: "#E2E8F0", Icon: Ban },
};
const meta = (s) => STATUS[s] || STATUS.new;

const num = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v));

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("el-GR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("el-GR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function hoursSince(d) {
  if (!d) return 0;
  return Math.floor((Date.now() - new Date(d).getTime()) / 3600000);
}

function Card({ children, style }) {
  return <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0", overflow: "hidden", ...style }}>{children}</div>;
}

function Pill({ label, bg, fg, br, Icon }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 11px", borderRadius: 30, fontSize: 11, fontWeight: 700, background: bg, color: fg, border: `1px solid ${br}`, whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: ".04em" }}>
      {Icon && <Icon size={11} strokeWidth={2.5} />}
      {label}
    </span>
  );
}

function Stat({ Icon, label, value, sub, color }) {
  return (
    <Card style={{ padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Icon size={14} color={color} strokeWidth={2.2} />
        <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      </div>
      <div style={{ fontSize: 25, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 5 }}>{sub}</div>}
    </Card>
  );
}

function Row({ label, value, mono, last }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 14, padding: "9px 0", borderBottom: last ? "none" : "1px solid #F1F5F9", fontSize: 13.5 }}>
      <span style={{ color: "#64748B", flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: 600, color: "#0F172A", textAlign: "right", wordBreak: "break-word", fontFamily: mono ? "ui-monospace, monospace" : "inherit" }}>{value}</span>
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", disabled, Icon, small }) {
  const s = {
    primary: { bg: "#1D4ED8", fg: "#fff", br: "#1D4ED8" },
    ghost:   { bg: "#fff", fg: "#334155", br: "#E2E8F0" },
    danger:  { bg: "#fff", fg: "#BE123C", br: "#FECACA" },
    success: { bg: "#15803D", fg: "#fff", br: "#15803D" },
  }[variant];
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        padding: small ? "6px 13px" : "9px 18px", borderRadius: 8,
        border: `1px solid ${disabled ? "#CBD5E1" : s.br}`,
        background: disabled ? "#F1F5F9" : s.bg, color: disabled ? "#94A3B8" : s.fg,
        fontSize: small ? 12 : 12.5, fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit",
        display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
      }}>
      {Icon && <Icon size={small ? 12 : 14} strokeWidth={2.2} />}
      {children}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════════
function LeadDrawer({ lead, onClose, onRefresh }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(lead.admin_note || "");
  const m = meta(lead.status);

  useEffect(() => { setNote(lead.admin_note || ""); }, [lead.id]); // eslint-disable-line

  async function setStatus(status) {
    setBusy(true);
    await supabase.from("leads").update({ status }).eq("id", lead.id);
    setBusy(false);
    await onRefresh();
  }

  async function saveNote() {
    setBusy(true);
    await supabase.from("leads").update({ admin_note: note.trim() || null }).eq("id", lead.id);
    setBusy(false);
    await onRefresh();
  }

  async function remove() {
    if (!confirm("Οριστική διαγραφή lead;\n\nΓια ανεπιθύμητα προτίμησε «Spam» — κρατάει το ιστορικό.")) return;
    setBusy(true);
    await supabase.from("leads").delete().eq("id", lead.id);
    setBusy(false);
    await onRefresh();
    onClose();
  }

  const address = [lead.street, lead.city, lead.zip, lead.country].filter(Boolean).join(", ");
  const waiting = lead.status === "new" ? hoursSince(lead.created_at) : null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.35)" }} />

      <div style={{ position: "relative", width: "min(660px, 94vw)", height: "100%", background: "#F8FAFC", overflowY: "auto", boxShadow: "-8px 0 40px rgba(15,23,42,0.16)" }}>

        <div style={{ background: "#fff", padding: "22px 26px", borderBottom: "1px solid #E2E8F0", position: "sticky", top: 0, zIndex: 5 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", marginBottom: 8 }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: "#0F172A" }}>{lead.name}</span>
                <Pill {...m} />
                {lead.preferred_therapist && (
                  <Pill label={`Ζήτησε: ${lead.preferred_therapist}`} bg="#FFFBEB" fg="#B45309" br="#FDE68A" Icon={Star} />
                )}
              </div>
              {/* Τα στοιχεία επικοινωνίας πατήσιμα — αυτό είναι όλο το νόημα */}
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13.5 }}>
                <a href={`tel:${lead.phone}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#1D4ED8", textDecoration: "none", fontWeight: 700 }}>
                  <Phone size={14} /> {lead.phone}
                </a>
                <a href={`mailto:${lead.email}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#1D4ED8", textDecoration: "none", fontWeight: 600 }}>
                  <Mail size={14} /> {lead.email}
                </a>
              </div>
            </div>
            <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94A3B8", padding: 4, lineHeight: 0 }}>
              <X size={20} />
            </button>
          </div>

          {waiting !== null && waiting >= 24 && (
            <div style={{ marginTop: 14, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", fontSize: 12.5, color: "#BE123C", display: "flex", gap: 8, alignItems: "center", lineHeight: 1.6 }}>
              <AlertTriangle size={14} strokeWidth={2.2} />
              Περιμένει <strong>{waiting} ώρες</strong>. Η σελίδα υπόσχεται επικοινωνία εντός 24 ωρών.
            </div>
          )}
        </div>

        <div style={{ padding: "20px 26px 110px" }}>
          <Card style={{ padding: "18px 20px", marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 12 }}>Τι χρειάζεται</div>
            <Row label="Υπηρεσία" value={lead.service || "—"} />
            <Row label="Περιγραφή" value={lead.description || "—"} last />
            {lead.description && (
              <div style={{ marginTop: 12, background: "#F8FAFC", borderRadius: 10, padding: "12px 14px", fontSize: 13.5, color: "#475569", lineHeight: 1.7, whiteSpace: "pre-line" }}>
                {lead.description}
              </div>
            )}
          </Card>

          <Card style={{ padding: "18px 20px", marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 12 }}>Τοποθεσία</div>
            <Row label="Διεύθυνση" value={address || "—"} />
            <Row label="Πόλη" value={lead.city || "—"} />
            <Row label="ΤΚ" value={lead.zip || "—"} last />
            {address && (
              <div style={{ marginTop: 12 }}>
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "#1D4ED8", textDecoration: "none" }}>
                  <MapPin size={13} /> Άνοιγμα σε χάρτη
                </a>
              </div>
            )}
          </Card>

          {/* Από πού ήρθε — για να ξέρεις ποια διαφήμιση αποδίδει */}
          <Card style={{ padding: "18px 20px", marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 12 }}>Προέλευση</div>
            <Row label="Πώς μας βρήκε" value={lead.how_heard || "—"} />
            <Row label="Campaign" value={lead.utm_campaign || "—"} mono />
            <Row label="Source" value={lead.utm_source || lead.source || "—"} mono />
            <Row label="Medium" value={lead.utm_medium || "—"} mono />
            <Row label="Παραπομπή γιατρού" value={lead.referred ? (lead.doctor_name || "Ναι") : "Όχι"} />
            <Row label="Υποβλήθηκε" value={fmtDateTime(lead.created_at)} last />
          </Card>

          <Card style={{ padding: "18px 20px" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 12 }}>Σημείωση</div>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4}
              placeholder="Τι ειπώθηκε στο τηλέφωνο, τι μένει..."
              style={{ width: "100%", padding: "11px 13px", border: "1.5px solid #E2E8F0", borderRadius: 9, fontSize: 13.5, fontFamily: "inherit", outline: "none", resize: "vertical", color: "#0F172A", boxSizing: "border-box" }} />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
              <Btn Icon={Save} onClick={saveNote} disabled={busy}>Αποθήκευση</Btn>
            </div>
            {lead.contacted_at && <div style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 10 }}>Επικοινωνία: {fmtDateTime(lead.contacted_at)}</div>}
            {lead.converted_at && <div style={{ fontSize: 11.5, color: "#15803D", marginTop: 4 }}>Μετατροπή: {fmtDateTime(lead.converted_at)}</div>}
          </Card>
        </div>

        <div style={{ position: "sticky", bottom: 0, background: "#fff", borderTop: "1px solid #E2E8F0", padding: "14px 26px", display: "flex", gap: 9, flexWrap: "wrap", alignItems: "center" }}>
          {lead.status === "new" && <Btn Icon={Phone} onClick={() => setStatus("contacted")} disabled={busy}>Επικοινώνησα</Btn>}
          {lead.status !== "converted" && <Btn variant="success" Icon={CheckCircle2} onClick={() => setStatus("converted")} disabled={busy}>Έγινε πελάτης</Btn>}
          {lead.status !== "lost" && <Btn variant="ghost" Icon={X} onClick={() => setStatus("lost")} disabled={busy}>Χάθηκε</Btn>}
          {lead.status !== "spam" && <Btn variant="ghost" Icon={Ban} onClick={() => setStatus("spam")} disabled={busy}>Spam</Btn>}
          <div style={{ marginLeft: "auto", display: "flex", gap: 9 }}>
            <Btn variant="danger" Icon={Trash2} onClick={remove} disabled={busy}>Διαγραφή</Btn>
            <Btn variant="ghost" onClick={onClose}>Κλείσιμο</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("new");
  const [search, setSearch] = useState("");

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    setError("");
    const { data, error: err } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    // Χωρίς σαφές μήνυμα, μια άδεια λίστα μοιάζει με «δεν ήρθε κανείς»
    // ενώ μπορεί απλά να λείπει ο πίνακας ή η policy.
    if (err) setError("Δεν ήταν δυνατή η ανάγνωση: " + err.message);
    setLeads(data || []);
    setLoading(false);
  }

  const counts = {
    all:       leads.length,
    new:       leads.filter((l) => l.status === "new").length,
    contacted: leads.filter((l) => l.status === "contacted").length,
    converted: leads.filter((l) => l.status === "converted").length,
    lost:      leads.filter((l) => l.status === "lost").length,
    spam:      leads.filter((l) => l.status === "spam").length,
  };

  const real = leads.filter((l) => l.status !== "spam").length;
  const conversion = real > 0 ? Math.round((counts.converted / real) * 100) : 0;
  const overdue = leads.filter((l) => l.status === "new" && hoursSince(l.created_at) >= 24).length;

  const filtered = leads.filter((l) => {
    if (filter !== "all" && l.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (l.name || "").toLowerCase().includes(q)
        || (l.email || "").toLowerCase().includes(q)
        || (l.phone || "").includes(q)
        || (l.city || "").toLowerCase().includes(q)
        || (l.service || "").toLowerCase().includes(q);
    }
    return true;
  });

  function doExport() {
    if (filtered.length === 0) return;
    const rows = filtered.map((l) => ({
      Ημερομηνία: fmtDate(l.created_at),
      Όνομα: l.name || "",
      Email: l.email || "",
      Τηλέφωνο: l.phone || "",
      Πόλη: l.city || "",
      ΤΚ: l.zip || "",
      Υπηρεσία: l.service || "",
      Περιγραφή: (l.description || "").replace(/\n/g, " "),
      ΠώςΜαςΒρήκε: l.how_heard || "",
      Campaign: l.utm_campaign || "",
      Κατάσταση: meta(l.status).label,
      Σημείωση: (l.admin_note || "").replace(/\n/g, " "),
    }));
    const headers = Object.keys(rows[0]);
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [headers.join(";"), ...rows.map((r) => headers.map((h) => esc(r[h])).join(";"))].join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `leads_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  const TABS = [
    { id: "new",       label: "Νέα",           n: counts.new },
    { id: "contacted", label: "Επικοινώνησα",  n: counts.contacted },
    { id: "converted", label: "Έγιναν πελάτες", n: counts.converted },
    { id: "lost",      label: "Χάθηκαν",       n: counts.lost },
    { id: "spam",      label: "Spam",          n: counts.spam },
    { id: "all",       label: "Όλα",           n: counts.all },
  ];

  if (loading) {
    return <div style={{ padding: 48, textAlign: "center", color: "#64748B", fontSize: 15 }}>Φόρτωση...</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 22, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0F172A", margin: 0 }}>Leads</h1>
          <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>
            Εκδηλώσεις ενδιαφέροντος από τη σελίδα /request · περιμένουν τηλεφώνημα
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn variant="ghost" Icon={RefreshCw} onClick={fetchAll}>Ανανέωση</Btn>
          <Btn variant="ghost" Icon={Download} onClick={doExport} disabled={filtered.length === 0}>
            Εξαγωγή CSV ({filtered.length})
          </Btn>
        </div>
      </div>

      {error && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "13px 17px", marginBottom: 20, fontSize: 13, color: "#BE123C", display: "flex", gap: 10, alignItems: "flex-start", lineHeight: 1.6 }}>
          <AlertTriangle size={16} strokeWidth={2.2} style={{ marginTop: 1, flexShrink: 0 }} />
          <span>{error}<br />Τρέξε το <strong>migration-leads.sql</strong> στο Supabase.</span>
        </div>
      )}

      {overdue > 0 && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "14px 18px", marginBottom: 18, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <AlertTriangle size={19} color="#BE123C" strokeWidth={2.2} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#9F1239" }}>
              {overdue} {overdue === 1 ? "lead περιμένει" : "leads περιμένουν"} πάνω από 24 ώρες
            </div>
            <div style={{ fontSize: 12, color: "#9F1239", opacity: 0.85, marginTop: 2 }}>
              Η σελίδα υπόσχεται επικοινωνία εντός 24 ωρών.
            </div>
          </div>
          <Btn onClick={() => setFilter("new")}>Δες τα</Btn>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 22 }}>
        <Stat Icon={Inbox}       label="Σύνολο"      value={counts.all}        sub="όλα τα leads"            color="#0F172A" />
        <Stat Icon={Clock}       label="Νέα"         value={counts.new}        sub="περιμένουν τηλεφώνημα"   color="#B45309" />
        <Stat Icon={CheckCircle2} label="Πελάτες"    value={counts.converted}  sub="μετατράπηκαν"            color="#15803D" />
        <Stat Icon={TrendingUp}  label="Μετατροπή"   value={`${conversion}%`}  sub="εκτός spam"              color="#1D4ED8" />
      </div>

      <div style={{ display: "flex", gap: 4, background: "#E2E8F0", padding: 4, borderRadius: 12, width: "fit-content", marginBottom: 14, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setFilter(t.id)}
            style={{
              padding: "8px 15px", borderRadius: 8, border: "none", fontSize: 12.5, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
              background: filter === t.id ? "#fff" : "transparent",
              color: filter === t.id ? "#0F172A" : "#64748B",
              boxShadow: filter === t.id ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
            }}>
            {t.label} <span style={{ opacity: 0.6, marginLeft: 3 }}>{t.n}</span>
          </button>
        ))}
      </div>

      <div style={{ position: "relative", marginBottom: 18, maxWidth: 360 }}>
        <Search size={15} color="#94A3B8" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Αναζήτηση ονόματος, τηλεφώνου, πόλης..."
          style={{ width: "100%", padding: "10px 14px 10px 38px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 13, fontFamily: "inherit", outline: "none", color: "#0F172A", boxSizing: "border-box" }} />
      </div>

      {filtered.length === 0 ? (
        <Card style={{ padding: 48, textAlign: "center" }}>
          <Inbox size={30} color="#CBD5E1" style={{ margin: "0 auto 12px" }} />
          <div style={{ fontSize: 15, color: "#64748B" }}>
            {leads.length === 0 ? "Δεν έχει έρθει κανένα lead ακόμα." : "Κανένα lead σε αυτή την κατηγορία."}
          </div>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((l) => {
            const m = meta(l.status);
            const waiting = l.status === "new" ? hoursSince(l.created_at) : null;
            const late = waiting !== null && waiting >= 24;
            return (
              <div key={l.id} onClick={() => setSelected(l)}
                style={{ background: "#fff", border: `1px solid ${late ? "#FECACA" : "#E2E8F0"}`, borderRadius: 14, padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 16, transition: "all .15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 2px 12px rgba(15,23,42,0.06)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}>

                <div style={{ width: 42, height: 42, borderRadius: "50%", background: m.bg, color: m.fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
                  {(l.name || "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", marginBottom: 5 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#0F172A" }}>{l.name}</span>
                    <Pill {...m} />
                    {late && <Pill label={`${waiting}h αναμονή`} bg="#FEF2F2" fg="#BE123C" br="#FECACA" Icon={AlertTriangle} />}
                  </div>
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12.5, color: "#64748B" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 600, color: "#1D4ED8" }}>
                      <Phone size={12} />{l.phone}
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Mail size={12} />{l.email}</span>
                    {l.city && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><MapPin size={12} />{l.city}</span>}
                  </div>
                  {l.service && (
                    <div style={{ fontSize: 12.5, color: "#475569", marginTop: 6, background: "#F8FAFC", padding: "4px 10px", borderRadius: 6, display: "inline-block" }}>
                      {l.service}
                    </div>
                  )}
                </div>

                <div style={{ textAlign: "right", flexShrink: 0, fontSize: 12, color: "#94A3B8", whiteSpace: "nowrap" }}>
                  {fmtDate(l.created_at)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <LeadDrawer
          lead={leads.find((l) => l.id === selected.id) || selected}
          onClose={() => setSelected(null)}
          onRefresh={fetchAll}
        />
      )}
    </div>
  );
}