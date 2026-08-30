"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  ShieldAlert, UserX, AlertTriangle, Search, X, Check, RefreshCw,
  Clock, CheckCircle2, Ban, TrendingUp, MessageSquare, Save,
} from "lucide-react";

/*
  ΑΝΑΦΟΡΕΣ & NO-SHOWS

  ΤΡΕΙΣ ΚΑΡΤΕΛΕΣ:
    Αναφορές    — προβλήματα που δήλωσαν χρήστες, κατά σοβαρότητα
    No-shows    — ποιος δεν εμφανίστηκε, με τις αμφισβητήσεις
    Αξιοπιστία  — ποσοστό αποδοχής, χρόνος απάντησης, strikes

  ΓΙΑΤΙ Η ΣΕΙΡΑ ΕΧΕΙ ΣΗΜΑΣΙΑ:
  Οι αναφορές ταξινομούνται κατά σοβαρότητα, όχι χρονολογικά. Ένα θέμα
  ασφάλειας από χθες πρέπει να είναι πάνω από μια καθυστέρηση σήμερα.
*/

const SEVERITY = {
  urgent: { label: "Επείγον",   bg: "#FEF2F2", fg: "#BE123C", br: "#FECACA", rank: 0 },
  high:   { label: "Υψηλή",     bg: "#FFF7ED", fg: "#C2410C", br: "#FED7AA", rank: 1 },
  normal: { label: "Κανονική",  bg: "#FFFBEB", fg: "#B45309", br: "#FDE68A", rank: 2 },
  low:    { label: "Χαμηλή",    bg: "#F8FAFC", fg: "#64748B", br: "#E2E8F0", rank: 3 },
};

const ISSUE_STATUS = {
  open:      { label: "Ανοιχτή",     bg: "#FFFBEB", fg: "#B45309", br: "#FDE68A" },
  in_review: { label: "Σε εξέταση",  bg: "#EFF6FF", fg: "#1D4ED8", br: "#BFDBFE" },
  resolved:  { label: "Επιλύθηκε",   bg: "#F0FDF4", fg: "#15803D", br: "#BBF7D0" },
  dismissed: { label: "Απορρίφθηκε", bg: "#F8FAFC", fg: "#64748B", br: "#E2E8F0" },
};

const NOSHOW_STATUS = {
  reported:  { label: "Δηλώθηκε",     bg: "#FFFBEB", fg: "#B45309", br: "#FDE68A" },
  disputed:  { label: "Αμφισβητείται", bg: "#FEF2F2", fg: "#BE123C", br: "#FECACA" },
  confirmed: { label: "Επιβεβαιώθηκε", bg: "#F0FDF4", fg: "#15803D", br: "#BBF7D0" },
  dismissed: { label: "Ακυρώθηκε",     bg: "#F8FAFC", fg: "#64748B", br: "#E2E8F0" },
};

const CATEGORY = {
  no_show:       "Δεν εμφανίστηκε",
  late:          "Καθυστέρηση",
  behaviour:     "Συμπεριφορά",
  quality:       "Ποιότητα",
  payment:       "Πληρωμή",
  safety:        "Ασφάλεια",
  wrong_address: "Λάθος διεύθυνση",
  other:         "Άλλο",
};

const meta = (map, k, fallback) => map[k] || map[fallback];

function fmtDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("el-GR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("el-GR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function hoursSince(d) {
  if (!d) return 0;
  return Math.floor((Date.now() - new Date(d).getTime()) / 3600000);
}

function Card({ children, style }) {
  return <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0", overflow: "hidden", ...style }}>{children}</div>;
}

function Pill({ m, children }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 11px", borderRadius: 30, fontSize: 11, fontWeight: 700,
      background: m.bg, color: m.fg, border: `1px solid ${m.br}`,
      whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: ".04em",
    }}>
      {children || m.label}
    </span>
  );
}

function Stat({ Icon, label, value, sub, color }) {
  return (
    <Card style={{ padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Icon size={14} color={color} strokeWidth={2.2} />
        <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</span>
      </div>
      <div style={{ fontSize: 25, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 5 }}>{sub}</div>}
    </Card>
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

function Empty({ Icon, text }) {
  return (
    <Card style={{ padding: 48, textAlign: "center" }}>
      {Icon && <Icon size={30} color="#CBD5E1" style={{ margin: "0 auto 12px" }} />}
      <div style={{ fontSize: 15, color: "#64748B" }}>{text}</div>
    </Card>
  );
}

const th = (align = "left") => ({
  padding: "11px 14px", textAlign: align, fontSize: 11, fontWeight: 700,
  color: "#64748B", textTransform: "uppercase", letterSpacing: ".05em",
  borderBottom: "1px solid #E2E8F0", whiteSpace: "nowrap",
});

// ════════════════════════════════════════════════════════════════════════
export default function ReportsIssuesPage() {
  const [tab, setTab] = useState("issues");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [issues, setIssues] = useState([]);
  const [noShows, setNoShows] = useState([]);
  const [reliability, setReliability] = useState([]);
  const [names, setNames] = useState({});
  const [bookings, setBookings] = useState({});

  const [filter, setFilter] = useState("open");
  const [search, setSearch] = useState("");
  const [openIssue, setOpenIssue] = useState(null);
  const [adminNote, setAdminNote] = useState("");

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    setError("");

    const [{ data: iss, error: iErr }, { data: ns }, { data: rel }, { data: th }, { data: pa }, { data: bk }] =
      await Promise.all([
        supabase.from("issue_reports").select("*").order("created_at", { ascending: false }),
        supabase.from("no_shows").select("*").order("created_at", { ascending: false }),
        supabase.from("v_therapist_reliability").select("*"),
        supabase.from("therapist_profiles").select("id, name"),
        supabase.from("patient_profiles").select("id, name"),
        supabase.from("session_bookings").select("id, session_date, session_time, patient_id, therapist_id, status"),
      ]);

    // Άδεια λίστα χωρίς εξήγηση μοιάζει με «όλα καλά» ενώ μπορεί να
    // λείπει ο πίνακας ή η policy.
    if (iErr) setError("Δεν ήταν δυνατή η ανάγνωση: " + iErr.message);

    const nm = {};
    (th || []).forEach(t => { nm[t.id] = t.name; });
    (pa || []).forEach(p => { nm[p.id] = p.name; });

    const bm = {};
    (bk || []).forEach(b => { bm[b.id] = b; });

    setIssues(iss || []);
    setNoShows(ns || []);
    setReliability(rel || []);
    setNames(nm);
    setBookings(bm);
    setLoading(false);
  }

  const nameOf = (id) => names[id] || "—";

  async function setIssueStatus(id, status, note) {
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("issue_reports").update({
      status,
      admin_note: note ?? undefined,
      resolved_by: ["resolved", "dismissed"].includes(status) ? (user?.id || null) : null,
    }).eq("id", id);
    setBusy(false);
    setOpenIssue(null);
    await fetchAll();
  }

  // ── ΕΠΙΛΥΣΗ ΑΜΦΙΣΒΗΤΗΣΗΣ ──
  // Το strike δεν σβήστηκε όταν έγινε η αμφισβήτηση, απλά απενεργοποιήθηκε.
  // Αν το no-show επιβεβαιωθεί, επανέρχεται — και ξαναμετράει για το
  // αυτόματο πάγωμα στα 3.
  async function resolveNoShow(ns, confirmed, note) {
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from("no_shows").update({
      status: confirmed ? "confirmed" : "dismissed",
      resolved_at: new Date().toISOString(),
      resolved_by: user?.id || null,
      resolution_note: note || null,
    }).eq("id", ns.id);

    if (ns.strike_id) {
      await supabase.from("therapist_strikes")
        .update({ is_active: confirmed })
        .eq("id", ns.strike_id);
    }

    // Αν το strike επανέλθει και φτάσουν τα 3, το πάγωμα πρέπει να
    // ξανασυμβεί — η αρχική συνάρτηση δεν τρέχει ξανά από μόνη της.
    if (confirmed && ns.absent_role === "therapist") {
      const { data: strikes } = await supabase
        .from("therapist_strikes")
        .select("id")
        .eq("therapist_id", ns.absent_user_id)
        .eq("is_active", true);
      if ((strikes || []).length >= 3) {
        await supabase.from("therapist_profiles").update({
          is_paused: true,
          paused_reason: `Αυτόματο πάγωμα: ${strikes.length} ενεργά strikes.`,
        }).eq("id", ns.absent_user_id);
      }
    }

    setBusy(false);
    await fetchAll();
  }

  const openCount   = issues.filter(i => i.status === "open").length;
  const urgentCount = issues.filter(i => i.severity === "urgent" && i.status !== "resolved" && i.status !== "dismissed").length;
  const disputed    = noShows.filter(n => n.status === "disputed").length;
  const pendingNs   = noShows.filter(n => n.status === "reported").length;

  const filteredIssues = issues
    .filter(i => {
      if (filter === "open"     && !["open", "in_review"].includes(i.status)) return false;
      if (filter === "resolved" && !["resolved", "dismissed"].includes(i.status)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (i.description || "").toLowerCase().includes(q)
          || nameOf(i.reported_by).toLowerCase().includes(q)
          || nameOf(i.against_user_id).toLowerCase().includes(q);
      }
      return true;
    })
    // Σοβαρότητα πρώτα, ημερομηνία μετά. Ένα θέμα ασφάλειας από χθες
    // πάνω από μια καθυστέρηση σήμερα.
    .sort((a, b) => {
      const ra = meta(SEVERITY, a.severity, "normal").rank;
      const rb = meta(SEVERITY, b.severity, "normal").rank;
      if (ra !== rb) return ra - rb;
      return new Date(b.created_at) - new Date(a.created_at);
    });

  if (loading) {
    return <div style={{ padding: 48, textAlign: "center", color: "#64748B", fontSize: 15 }}>Φόρτωση...</div>;
  }

  const TABS = [
    { id: "issues",      label: `Αναφορές (${openCount})`,   Icon: AlertTriangle },
    { id: "noshows",     label: `No-shows (${pendingNs + disputed})`, Icon: UserX },
    { id: "reliability", label: "Αξιοπιστία",                 Icon: TrendingUp },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 22, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0F172A", margin: 0 }}>Αναφορές & No-shows</h1>
          <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>
            Προβλήματα που δήλωσαν χρήστες και δείκτες αξιοπιστίας
          </p>
        </div>
        <Btn variant="ghost" Icon={RefreshCw} onClick={fetchAll}>Ανανέωση</Btn>
      </div>

      {error && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "13px 17px", marginBottom: 20, fontSize: 13, color: "#BE123C", display: "flex", gap: 10, alignItems: "flex-start", lineHeight: 1.6 }}>
          <AlertTriangle size={16} strokeWidth={2.2} style={{ marginTop: 1, flexShrink: 0 }} />
          <span>{error}<br />Τρέξε το <strong>migration-noshow-reports.sql</strong> στο Supabase.</span>
        </div>
      )}

      {/* Τα επείγοντα δεν περιμένουν στη λίστα */}
      {urgentCount > 0 && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "14px 18px", marginBottom: 18, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <ShieldAlert size={19} color="#BE123C" strokeWidth={2.2} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#9F1239" }}>
              {urgentCount} {urgentCount === 1 ? "επείγουσα αναφορά" : "επείγουσες αναφορές"}
            </div>
            <div style={{ fontSize: 12, color: "#9F1239", opacity: 0.85, marginTop: 2 }}>
              Θέματα ασφάλειας. Χρειάζονται άμεση επικοινωνία.
            </div>
          </div>
          <Btn onClick={() => { setTab("issues"); setFilter("open"); }}>Δες τις</Btn>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 22 }}>
        <Stat Icon={AlertTriangle} label="Ανοιχτές"     value={openCount}   sub="αναφορές"           color="#B45309" />
        <Stat Icon={ShieldAlert}   label="Επείγουσες"   value={urgentCount} sub="ασφάλεια"           color="#BE123C" />
        <Stat Icon={UserX}         label="No-shows"     value={pendingNs}   sub="προς επιβεβαίωση"   color="#C2410C" />
        <Stat Icon={MessageSquare} label="Αμφισβητήσεις" value={disputed}   sub="χρειάζονται απόφαση" color="#1D4ED8" />
      </div>

      <div style={{ display: "flex", gap: 4, background: "#E2E8F0", padding: 4, borderRadius: 10, width: "fit-content", marginBottom: 20, flexWrap: "wrap" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              padding: "8px 18px", borderRadius: 7, border: "none", fontSize: 13, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
              background: tab === t.id ? "#fff" : "transparent",
              color: tab === t.id ? "#0F172A" : "#64748B",
              boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              display: "inline-flex", alignItems: "center", gap: 7,
            }}>
            <t.Icon size={14} strokeWidth={2.2} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ ΑΝΑΦΟΡΕΣ ══ */}
      {tab === "issues" && (
        <>
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 4, background: "#F1F5F9", padding: 3, borderRadius: 8 }}>
              {[
                { id: "open",     label: "Ανοιχτές" },
                { id: "resolved", label: "Κλειστές" },
                { id: "all",      label: "Όλες" },
              ].map(f => (
                <button key={f.id} onClick={() => setFilter(f.id)}
                  style={{
                    padding: "6px 14px", borderRadius: 6, border: "none", fontSize: 12.5, fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit",
                    background: filter === f.id ? "#fff" : "transparent",
                    color: filter === f.id ? "#0F172A" : "#64748B",
                  }}>
                  {f.label}
                </button>
              ))}
            </div>
            <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
              <Search size={15} color="#94A3B8" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Αναζήτηση..."
                style={{ width: "100%", padding: "10px 14px 10px 38px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 13, fontFamily: "inherit", outline: "none", color: "#0F172A", boxSizing: "border-box" }} />
            </div>
          </div>

          {filteredIssues.length === 0 ? (
            <Empty Icon={CheckCircle2} text="Καμία αναφορά σε αυτή την κατηγορία." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredIssues.map(i => {
                const sev = meta(SEVERITY, i.severity, "normal");
                const st = meta(ISSUE_STATUS, i.status, "open");
                const b = bookings[i.booking_id];
                const waiting = ["open", "in_review"].includes(i.status) ? hoursSince(i.created_at) : null;
                return (
                  <div key={i.id} onClick={() => { setOpenIssue(i); setAdminNote(i.admin_note || ""); }}
                    style={{
                      background: "#fff",
                      border: `1px solid ${i.severity === "urgent" && i.status === "open" ? "#FECACA" : "#E2E8F0"}`,
                      borderLeft: `3px solid ${sev.fg}`,
                      borderRadius: 14, padding: "16px 20px", cursor: "pointer",
                    }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", marginBottom: 8 }}>
                      <Pill m={sev} />
                      <Pill m={st} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>
                        {CATEGORY[i.category] || i.category}
                      </span>
                      {waiting !== null && waiting >= 24 && (
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: "#BE123C", display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Clock size={11} /> {waiting}ω αναμονή
                        </span>
                      )}
                      <span style={{ marginLeft: "auto", fontSize: 11.5, color: "#94A3B8" }}>{fmtDateTime(i.created_at)}</span>
                    </div>

                    <p style={{ fontSize: 13.5, color: "#334155", margin: "0 0 8px", lineHeight: 1.6 }}>
                      {(i.description || "").slice(0, 220)}{(i.description || "").length > 220 ? "..." : ""}
                    </p>

                    <div style={{ fontSize: 12, color: "#64748B" }}>
                      <strong>{nameOf(i.reported_by)}</strong> ({i.reported_by_role === "patient" ? "ασθενής" : "θεραπευτής"})
                      {i.against_user_id && <> → {nameOf(i.against_user_id)}</>}
                      {b && <> · ραντεβού {fmtDate(b.session_date)}</>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ══ NO-SHOWS ══ */}
      {tab === "noshows" && (
        noShows.length === 0 ? (
          <Empty Icon={UserX} text="Δεν έχει δηλωθεί κανένα no-show." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {noShows.map(n => {
              const st = meta(NOSHOW_STATUS, n.status, "reported");
              const b = bookings[n.booking_id];
              const needsDecision = n.status === "disputed";
              return (
                <div key={n.id} style={{
                  background: "#fff",
                  border: `1px solid ${needsDecision ? "#FECACA" : "#E2E8F0"}`,
                  borderRadius: 14, padding: "16px 20px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", marginBottom: 10 }}>
                    <Pill m={st} />
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: "#0F172A" }}>
                      {nameOf(n.absent_user_id)}
                      <span style={{ fontWeight: 500, color: "#64748B" }}>
                        {" "}({n.absent_role === "patient" ? "ασθενής" : "θεραπευτής"}) δεν εμφανίστηκε
                      </span>
                    </span>
                    {n.strike_id && (
                      <Pill m={{ bg: "#FFF7ED", fg: "#C2410C", br: "#FED7AA", label: "Strike" }} />
                    )}
                    <span style={{ marginLeft: "auto", fontSize: 11.5, color: "#94A3B8" }}>{fmtDateTime(n.created_at)}</span>
                  </div>

                  <div style={{ fontSize: 12.5, color: "#64748B", marginBottom: n.note || n.dispute_note ? 10 : 0 }}>
                    Δηλώθηκε από <strong>{nameOf(n.reported_by)}</strong>
                    {b && <> · ραντεβού {fmtDate(b.session_date)} {String(b.session_time || "").slice(0, 5)}</>}
                  </div>

                  {n.note && (
                    <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "10px 13px", fontSize: 13, color: "#475569", lineHeight: 1.6, marginBottom: 8 }}>
                      {n.note}
                    </div>
                  )}

                  {/* Η αμφισβήτηση είναι η άλλη πλευρά — πρέπει να διαβαστεί
                      πριν παρθεί απόφαση, γι' αυτό ξεχωρίζει οπτικά. */}
                  {n.dispute_note && (
                    <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "11px 14px", fontSize: 13, color: "#9F1239", lineHeight: 1.6, marginBottom: 10 }}>
                      <strong>Αμφισβήτηση:</strong> {n.dispute_note}
                      <div style={{ fontSize: 11.5, opacity: 0.8, marginTop: 4 }}>{fmtDateTime(n.disputed_at)}</div>
                    </div>
                  )}

                  {["reported", "disputed"].includes(n.status) && (
                    <div style={{ display: "flex", gap: 9, flexWrap: "wrap", paddingTop: 10, borderTop: "1px solid #F1F5F9" }}>
                      <Btn variant="success" Icon={Check} disabled={busy}
                        onClick={() => resolveNoShow(n, true, "Επιβεβαιώθηκε από τη διαχείριση")}>
                        Επιβεβαίωση
                      </Btn>
                      <Btn variant="danger" Icon={X} disabled={busy}
                        onClick={() => resolveNoShow(n, false, "Ακυρώθηκε από τη διαχείριση")}>
                        Ακύρωση no-show
                      </Btn>
                      {n.strike_id && (
                        <span style={{ fontSize: 11.5, color: "#94A3B8", alignSelf: "center" }}>
                          Η επιβεβαίωση επαναφέρει το strike· η ακύρωση το σβήνει.
                        </span>
                      )}
                    </div>
                  )}

                  {n.resolution_note && (
                    <div style={{ fontSize: 12, color: "#64748B", marginTop: 8, fontStyle: "italic" }}>
                      {n.resolution_note} · {fmtDateTime(n.resolved_at)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ══ ΑΞΙΟΠΙΣΤΙΑ ══ */}
      {tab === "reliability" && (
        <>
          <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 12, padding: "13px 17px", marginBottom: 18, fontSize: 12.5, color: "#1E40AF", lineHeight: 1.65 }}>
            Με λίγους θεραπευτές και λίγα ραντεβού, τα ποσοστά είναι θόρυβος.
            Ο πίνακας γίνεται χρήσιμος όταν ο καθένας έχει <strong>τουλάχιστον 10 αιτήματα</strong>.
          </div>

          <Card>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
                <thead>
                  <tr style={{ background: "#F8FAFC" }}>
                    <th style={th()}>Θεραπευτής</th>
                    <th style={th("right")}>Αιτήματα</th>
                    <th style={th("right")}>Αποδοχή</th>
                    <th style={th("right")}>Χρόνος απάντ.</th>
                    <th style={th("right")}>Ολοκληρ.</th>
                    <th style={th("right")}>Ακυρώσεις</th>
                    <th style={th("right")}>No-shows</th>
                    <th style={th("right")}>Strikes</th>
                    <th style={th("right")}>Βαθμ.</th>
                  </tr>
                </thead>
                <tbody>
                  {reliability
                    .slice()
                    .sort((a, b) => (b.αιτήματα || 0) - (a.αιτήματα || 0))
                    .map(r => {
                      const acc = r.ποσοστό_αποδοχής === null ? null : Number(r.ποσοστό_αποδοχής);
                      const strikes = Number(r.ενεργά_strikes) || 0;
                      return (
                        <tr key={r.therapist_id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                          <td style={{ padding: "12px 14px", fontSize: 13.5, fontWeight: 600, color: "#0F172A" }}>{r.name || "—"}</td>
                          <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13 }}>{r.αιτήματα || 0}</td>
                          <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, fontWeight: 700,
                                       color: acc === null ? "#CBD5E1" : acc >= 70 ? "#15803D" : acc >= 40 ? "#B45309" : "#BE123C" }}>
                            {acc === null ? "—" : `${acc}%`}
                          </td>
                          <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, color: "#64748B" }}>
                            {r.μέσος_χρόνος_απάντησης_ώρες === null ? "—" : `${r.μέσος_χρόνος_απάντησης_ώρες}ω`}
                          </td>
                          <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13 }}>{r.ολοκληρωμένες || 0}</td>
                          <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, color: (r.ακυρώσεις_του || 0) > 0 ? "#B45309" : "#64748B" }}>
                            {r.ακυρώσεις_του || 0}
                          </td>
                          <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, color: (r.no_shows || 0) > 0 ? "#BE123C" : "#64748B" }}>
                            {r.no_shows || 0}
                          </td>
                          <td style={{ padding: "12px 14px", textAlign: "right" }}>
                            {strikes > 0
                              ? <Pill m={{ bg: "#FEF2F2", fg: "#BE123C", br: "#FECACA", label: String(strikes) }} />
                              : <span style={{ fontSize: 13, color: "#CBD5E1" }}>0</span>}
                          </td>
                          <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, color: "#64748B" }}>
                            {r.βαθμολογία ? `${r.βαθμολογία} (${r.αξιολογήσεις})` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* ══ MODAL ΑΝΑΦΟΡΑΣ ══ */}
      {openIssue && (
        <div onClick={e => { if (e.target === e.currentTarget) setOpenIssue(null); }}
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 560, maxHeight: "88vh", overflowY: "auto", padding: 26 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 16, flexWrap: "wrap" }}>
              <Pill m={meta(SEVERITY, openIssue.severity, "normal")} />
              <Pill m={meta(ISSUE_STATUS, openIssue.status, "open")} />
              <span style={{ fontSize: 16, fontWeight: 700, color: "#0F172A" }}>
                {CATEGORY[openIssue.category] || openIssue.category}
              </span>
              <button onClick={() => setOpenIssue(null)}
                style={{ marginLeft: "auto", background: "transparent", border: "none", cursor: "pointer", color: "#94A3B8", padding: 2, lineHeight: 0 }}>
                <X size={19} />
              </button>
            </div>

            <div style={{ background: "#F8FAFC", borderRadius: 10, padding: "13px 16px", fontSize: 13.5, color: "#334155", lineHeight: 1.7, marginBottom: 16, whiteSpace: "pre-line" }}>
              {openIssue.description}
            </div>

            <div style={{ fontSize: 12.5, color: "#64748B", marginBottom: 18, lineHeight: 1.8 }}>
              <div>Από: <strong>{nameOf(openIssue.reported_by)}</strong> ({openIssue.reported_by_role === "patient" ? "ασθενής" : "θεραπευτής"})</div>
              {openIssue.against_user_id && <div>Αφορά: <strong>{nameOf(openIssue.against_user_id)}</strong></div>}
              <div>Υποβλήθηκε: {fmtDateTime(openIssue.created_at)}</div>
              {openIssue.resolved_at && <div>Επιλύθηκε: {fmtDateTime(openIssue.resolved_at)}</div>}
            </div>

            <label style={{ fontSize: 12, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 7 }}>
              Σημείωση διαχείρισης
            </label>
            <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} rows={4}
              placeholder="Τι έγινε, τι αποφασίστηκε..."
              style={{ width: "100%", padding: "11px 13px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 13.5, fontFamily: "inherit", outline: "none", resize: "vertical", color: "#0F172A", boxSizing: "border-box", marginBottom: 18 }} />

            <div style={{ display: "flex", gap: 9, justifyContent: "flex-end", flexWrap: "wrap" }}>
              {openIssue.status === "open" && (
                <Btn variant="ghost" Icon={Clock} disabled={busy}
                  onClick={() => setIssueStatus(openIssue.id, "in_review", adminNote)}>
                  Σε εξέταση
                </Btn>
              )}
              <Btn variant="ghost" Icon={Save} disabled={busy}
                onClick={() => setIssueStatus(openIssue.id, openIssue.status, adminNote)}>
                Αποθήκευση
              </Btn>
              <Btn variant="danger" Icon={Ban} disabled={busy}
                onClick={() => setIssueStatus(openIssue.id, "dismissed", adminNote)}>
                Απόρριψη
              </Btn>
              <Btn variant="success" Icon={CheckCircle2} disabled={busy}
                onClick={() => setIssueStatus(openIssue.id, "resolved", adminNote)}>
                Επιλύθηκε
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}