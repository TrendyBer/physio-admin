"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  Search, X, Phone, MapPin, Stethoscope, Star, Euro,
  ClipboardList, StickyNote, Tag, Save, Download, AlertTriangle,
  CheckCircle2, XCircle, Circle, FileText, Award, Eye, EyeOff,
  Trash2, Pause, ShieldCheck, ShieldAlert, GraduationCap, Mail, Clock,
  Home, CreditCard, User, Building2, Repeat, Rocket,
} from "lucide-react";
import { exportToCsv, csvDate } from "../lib/exportCsv";

// ═══════════════════════════════════════════════════════════════════════
// ΑΠΑΡΑΙΤΗΤΑ ΓΙΑ ΕΝΕΡΓΟΠΟΙΗΣΗ
//
// ΠΡΕΠΕΙ να συμφωνεί ακριβώς με:
//   · v_public_therapists.is_publicly_visible  (η βάση αποφασίζει)
//   · therapist_activation_status()            (το RPC)
//   · ProfileChecklist                         (τι βλέπει ο θεραπευτής)
//
// Αν αποκλίνει, ο θεραπευτής βλέπει «όλα εντάξει» και μένει αόρατος.
// ═══════════════════════════════════════════════════════════════════════
const REQUIRED = [
  { key: "name",         label: "Ονοματεπώνυμο",             check: t => !!t.name && t.name.trim().length > 2 },
  { key: "city",         label: "Πόλη",                      check: t => !!t.city_id },
  { key: "conditions",   label: "Περιστατικά (3+)",          check: t => (t.conditions_count || 0) >= 3 },
  { key: "areas",        label: "Περιοχές εξυπηρέτησης",     check: t => (t.service_areas || []).length > 0 },
  { key: "price",        label: "Τιμή συνεδρίας",            check: t => Number(t.price_per_session) > 0 },
  { key: "subscription", label: "Ενεργό πακέτο συνδρομής",   check: t => !!t.sub },
  { key: "license",      label: "Άδεια επαληθευμένη",        check: t => !!t.license_verified },
];

const OPTIONAL = [
  { key: "photo",        label: "Φωτογραφία",        check: t => !!t.photo_url },
  { key: "bio",          label: "Βιογραφικό (30+)",  check: t => !!t.bio && t.bio.trim().length >= 30 },
  { key: "experience",   label: "Χρόνια εμπειρίας",  check: t => Number(t.years_experience) > 0 },
  { key: "education",    label: "Σπουδές",           check: t => !!t.education_school },
  { key: "certs",        label: "Πιστοποιήσεις",     check: t => (t.certifications_urls || []).length > 0 },
  { key: "cv",           label: "CV",                check: t => !!t.cv_url },
  { key: "availability", label: "Διαθεσιμότητα",     check: t => (t.availability_slots || []).length > 0 },
  { key: "iban",         label: "IBAN",              check: t => !!t.iban && t.iban.trim().length > 5 },
];

function stats(t) {
  const reqDone = REQUIRED.filter(c => c.check(t)).length;
  const optDone = OPTIONAL.filter(c => c.check(t)).length;
  return {
    reqDone, reqTotal: REQUIRED.length,
    optDone, optTotal: OPTIONAL.length,
    missing: REQUIRED.filter(c => !c.check(t)).map(c => c.label),
    ready: reqDone === REQUIRED.length,
  };
}

// Ίδια λογική με τη view. Η αναστολή κόβει πάντα, ακόμα και το override.
function isPubliclyVisible(t) {
  if (t.is_paused) return false;
  if (t.admin_visibility_override) return true;
  return stats(t).ready;
}

const SUPPORT_TAGS = [
  "Επείγον", "Θέλει follow-up", "Πρόβλημα πληρωμής", "Παράπονο",
  "VIP / προτεραιότητα", "Χρειάζεται τηλεφώνημα", "Αργεί να απαντήσει",
  "Πολλές ακυρώσεις", "Εκκρεμεί έγγραφο άδειας",
];

const REJECT_REASONS = [
  { code: "invalid_license",   label: "Μη έγκυρη άδεια" },
  { code: "incomplete_docs",   label: "Ελλιπή δικαιολογητικά" },
  { code: "unverified_id",     label: "Ανεπιβεβαίωτη ταυτότητα" },
  { code: "duplicate_account", label: "Διπλός λογαριασμός" },
  { code: "other",             label: "Άλλο" },
];

const num = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v));
const eur = (v) => `${num(v).toFixed(num(v) % 1 === 0 ? 0 : 2)}€`;

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("el-GR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("el-GR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Avatar({ name, photoUrl, size = 48 }) {
  if (photoUrl) return <img src={photoUrl} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "#EFF6FF", color: "#1D4ED8",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.34, fontWeight: 700, flexShrink: 0,
    }}>
      {(name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
    </div>
  );
}

function Badge({ label, bg, color, Icon }) {
  return (
    <span style={{ background: bg, color, padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
      {Icon && <Icon size={11} strokeWidth={2.5} />}
      {label}
    </span>
  );
}

function statusOf(t) {
  if (t.application_status === "rejected") return { label: "Απορρίφθηκε", bg: "#FFE4E6", color: "#9F1239" };
  if (t.is_paused) return { label: "Σε αναστολή", bg: "#FFF7ED", color: "#C2410C" };
  if (t.license_verified) return { label: "Επαληθευμένος", bg: "#D1FAE5", color: "#065F46" };
  if (t.license_url) return { label: "Άδεια σε έλεγχο", bg: "#FEF3C7", color: "#92400E" };
  if (t.onboarding && !t.onboarding.completed_at) return { label: "Σε onboarding", bg: "#EFF6FF", color: "#1D4ED8" };
  return { label: "Ελλιπές", bg: "#F1F5F9", color: "#475569" };
}

// ─── Μικρά building blocks ──────────────────────────────────────────────
function Panel({ title, Icon, children, accent }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${accent || "#E2E8F0"}`, borderRadius: 14, padding: "18px 20px", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        {Icon && <Icon size={15} color="#64748B" strokeWidth={2} />}
        <span style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function Row({ label, value, mono, last, strong }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 14, padding: "9px 0", borderBottom: last ? "none" : "1px solid #F1F5F9", fontSize: 13.5 }}>
      <span style={{ color: "#64748B", flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: strong ? 700 : 600, color: "#0F172A", textAlign: "right", wordBreak: "break-word", fontFamily: mono ? "ui-monospace, monospace" : "inherit" }}>{value}</span>
    </div>
  );
}

function DocRow({ label, path, Icon, onView, required, extra }) {
  const has = !!path;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      background: "#fff", borderRadius: 12, padding: "14px 18px",
      border: `1px solid ${has ? "#BBF7D0" : required ? "#FDE68A" : "#E2E8F0"}`,
    }}>
      <Icon size={17} color={has ? "#15803D" : "#94A3B8"} strokeWidth={2} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0F172A" }}>{label}</div>
        <div style={{ fontSize: 12, color: has ? "#15803D" : required ? "#B45309" : "#94A3B8" }}>
          {has ? (extra || "Ανέβηκε") : required ? "Λείπει" : "Δεν ανέβηκε"}
        </div>
      </div>
      {has && (
        <button onClick={() => onView(path)}
          style={{ padding: "7px 15px", borderRadius: 20, border: "1px solid #E2E8F0", background: "#fff", color: "#0F172A", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 5 }}>
          <Eye size={13} />
          Προβολή
        </button>
      )}
    </div>
  );
}

function ActionBtn({ children, onClick, disabled, bg, color, border, Icon }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        padding: "9px 18px", borderRadius: 8,
        border: border ? `1.5px solid ${border}` : "none",
        background: bg, color, fontSize: 12.5, fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit", opacity: disabled ? 0.6 : 1,
        display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
      }}>
      {Icon && <Icon size={14} />}
      {children}
    </button>
  );
}

function Empty({ text }) {
  return (
    <div style={{ background: "#fff", border: "1px dashed #E2E8F0", borderRadius: 14, padding: "40px 24px", textAlign: "center", color: "#94A3B8", fontSize: 13.5 }}>
      {text}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// DRAWER
// ════════════════════════════════════════════════════════════════════════
function TherapistDrawer({ therapist, contact, requests, onClose, onRefresh }) {
  const [tab, setTab] = useState("overview");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState([]);
  const [tags, setTags] = useState(therapist.support_tags || []);
  const [showReject, setShowReject] = useState(false);
  const [rejectCode, setRejectCode] = useState("");
  const [rejectComment, setRejectComment] = useState("");
  const [showOffline, setShowOffline] = useState(false);
  const [offlineNote, setOfflineNote] = useState("");

  const s = stats(therapist);
  const visible = isPubliclyVisible(therapist);
  const st = statusOf(therapist);
  const sub = therapist.sub;
  const offlineVerified = therapist.license_verified && therapist.license_verification_method === "offline";

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("request_notes").select("*")
        .eq("therapist_id", therapist.id)
        .order("created_at", { ascending: false });
      setNotes(data || []);
    })();
  }, [therapist.id]);

  async function saveTags(next) {
    setTags(next);
    await supabase.from("therapist_profiles").update({ support_tags: next }).eq("id", therapist.id);
    onRefresh();
  }
  function toggleTag(tag) {
    saveTags(tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag]);
  }

  async function addNote() {
    if (!note.trim()) return;
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("request_notes").insert([{ therapist_id: therapist.id, note: note.trim(), created_by: user?.id || null }]);
    setNote("");
    const { data } = await supabase.from("request_notes").select("*")
      .eq("therapist_id", therapist.id).order("created_at", { ascending: false });
    setNotes(data || []);
    setBusy(false);
  }

  // ── ΕΠΑΛΗΘΕΥΣΗ ΜΕ ΕΓΓΡΑΦΟ ──
  // Ένα κουμπί ενημερώνει ΚΑΙ τα δύο πεδία. Παλιά υπήρχαν δύο ξεχωριστά
  // («Έγκριση» και «Επιβεβαίωση άδειας») που μπορούσαν να αποκλίνουν, και
  // τότε ο θεραπευτής έβλεπε «όλα εντάξει» ενώ παρέμενε αόρατος.
  async function verifyWithDocument() {
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("therapist_profiles").update({
      license_verified: true,
      license_verification_method: "document",
      license_verification_note: null,
      verified_at: new Date().toISOString(),
      verified_by: user?.id || null,
      is_approved: true,
      application_status: "approved",
      reject_reason_code: null,
    }).eq("id", therapist.id);
    setBusy(false);
    await onRefresh();
  }

  // ── ΕΠΑΛΗΘΕΥΣΗ ΧΩΡΙΣ ΕΓΓΡΑΦΟ ──
  // Για θεραπευτές που γνωρίζει ο admin προσωπικά. Δημόσια δεν υπάρχει
  // καμία διαφορά — το σήμα είναι το ίδιο. Εσωτερικά όμως καταγράφεται
  // ποιος το έκανε και με ποια αιτιολογία.
  async function verifyOffline() {
    if (!offlineNote.trim()) { alert("Γράψε την αιτιολογία."); return; }
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const due = new Date();
    due.setDate(due.getDate() + 30);
    await supabase.from("therapist_profiles").update({
      license_verified: true,
      license_verification_method: "offline",
      license_verification_note: offlineNote.trim(),
      license_document_due_at: due.toISOString(),
      verified_at: new Date().toISOString(),
      verified_by: user?.id || null,
      is_approved: true,
      application_status: "approved",
      reject_reason_code: null,
    }).eq("id", therapist.id);
    setBusy(false);
    setShowOffline(false);
    setOfflineNote("");
    await onRefresh();
  }

  async function unverify() {
    if (!confirm("Αναίρεση επαλήθευσης;\n\nΟ θεραπευτής θα πάψει να εμφανίζεται στο site.")) return;
    setBusy(true);
    await supabase.from("therapist_profiles").update({
      license_verified: false,
      license_verification_method: null,
      license_verification_note: null,
      license_document_due_at: null,
      verified_at: null, verified_by: null,
      is_approved: false,
      application_status: therapist.license_url ? "pending" : "incomplete",
    }).eq("id", therapist.id);
    setBusy(false);
    await onRefresh();
  }

  // Παράκαμψη ΟΛΩΝ των προϋποθέσεων — και της συνδρομής.
  // Διαφορετικό από την επαλήθευση άδειας: εδώ λείπουν κι άλλα.
  async function forceVisible() {
    const msg = s.missing.length
      ? `Λείπουν:\n\n- ${s.missing.join("\n- ")}\n\nΘα εμφανίζεται στο site παρά ταύτα. Σίγουρα;`
      : "Χειροκίνητη ενεργοποίηση;";
    if (!confirm(msg)) return;
    setBusy(true);
    await supabase.from("therapist_profiles").update({
      admin_visibility_override: true,
      admin_override_at: new Date().toISOString(),
      admin_override_note: s.missing.length ? `Χειροκίνητη ενεργοποίηση. Έλειπαν: ${s.missing.join(", ")}` : "Χειροκίνητη ενεργοποίηση",
      is_paused: false,
    }).eq("id", therapist.id);
    setBusy(false);
    await onRefresh();
  }

  async function removeOverride() {
    if (!confirm("Αφαίρεση χειροκίνητης ενεργοποίησης;")) return;
    setBusy(true);
    await supabase.from("therapist_profiles").update({
      admin_visibility_override: false, admin_override_at: null, admin_override_note: null,
    }).eq("id", therapist.id);
    setBusy(false);
    await onRefresh();
  }

  async function doReject() {
    if (!rejectCode) { alert("Επιλέξτε λόγο απόρριψης"); return; }
    setBusy(true);
    await supabase.from("therapist_profiles").update({
      is_approved: false, application_status: "rejected",
      reject_reason_code: rejectCode, admin_comment: rejectComment || null,
      admin_visibility_override: false, license_verified: false,
    }).eq("id", therapist.id);
    setBusy(false); setShowReject(false);
    await onRefresh(); onClose();
  }

  async function suspend() {
    if (!confirm("Αναστολή; Δεν θα εμφανίζεται στο site.")) return;
    setBusy(true);
    await supabase.from("therapist_profiles").update({ is_paused: true }).eq("id", therapist.id);
    setBusy(false); await onRefresh();
  }
  async function unsuspend() {
    setBusy(true);
    await supabase.from("therapist_profiles").update({ is_paused: false, paused_reason: null }).eq("id", therapist.id);
    setBusy(false); await onRefresh();
  }

  async function viewDocument(path) {
    const { data, error } = await supabase.storage.from("therapist-documents").createSignedUrl(path, 3600);
    if (error) { alert("Σφάλμα: " + error.message); return; }
    window.open(data.signedUrl, "_blank");
  }

  async function hardDelete() {
    if (!confirm(`ΟΡΙΣΤΙΚΗ ΔΙΑΓΡΑΦΗ του "${therapist.name}";\n\nΔεν αναιρείται.`)) return;
    setBusy(true);
    await supabase.from("therapist_profiles").delete().eq("id", therapist.id);
    setBusy(false); await onRefresh(); onClose();
  }

  const completed = requests.filter(r => r.status === "completed").length;
  const cancelled = requests.filter(r => (r.status || "").startsWith("cancelled")).length;

  const TABS = [
    { id: "overview", label: "Επισκόπηση", Icon: User },
    { id: "check",    label: "Ενεργοποίηση", Icon: CheckCircle2 },
    { id: "sub",      label: "Συνδρομή", Icon: Repeat },
    { id: "docs",     label: "Έγγραφα", Icon: FileText },
    { id: "requests", label: `Αιτήματα (${requests.length})`, Icon: ClipboardList },
    { id: "notes",    label: `Σημειώσεις (${notes.length})`, Icon: StickyNote },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.35)" }} />

      <div style={{ position: "relative", width: "min(780px, 94vw)", height: "100%", background: "#F8FAFC", overflowY: "auto", boxShadow: "-8px 0 40px rgba(15,23,42,0.16)" }}>

        {/* Header */}
        <div style={{ background: "#fff", padding: "22px 28px", borderBottom: "1px solid #E2E8F0", position: "sticky", top: 0, zIndex: 5 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
            <Avatar name={therapist.name} photoUrl={therapist.photo_url} size={54} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", marginBottom: 5 }}>
                <span style={{ fontSize: 21, fontWeight: 700, color: "#0F172A" }}>{therapist.name || "—"}</span>
                <Badge label={st.label} bg={st.bg} color={st.color} />
                {visible
                  ? <Badge label={therapist.admin_visibility_override ? "Ορατός · χειροκίνητα" : "Ορατός"} bg="#F0FDF4" color="#15803D" Icon={Eye} />
                  : <Badge label="Κρυφός" bg="#FEF2F2" color="#BE123C" Icon={EyeOff} />}
                {offlineVerified && (
                  <Badge label="Χωρίς έγγραφο" bg="#F5F3FF" color="#6D28D9" Icon={ShieldAlert} />
                )}
              </div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: "#64748B" }}>
                {therapist.city_name && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Building2 size={13} /> {therapist.city_name}</span>
                )}
                {therapist.area && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><MapPin size={13} /> {therapist.area}</span>
                )}
                {sub && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Repeat size={13} /> {sub.plan_snapshot?.name_el || "—"}</span>
                )}
              </div>
            </div>
            <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94A3B8", padding: 4, lineHeight: 0 }}>
              <X size={22} />
            </button>
          </div>

          {/* Δύο ΞΕΧΩΡΙΣΤΟΙ μετρητές — ποτέ ενιαίο ποσοστό */}
          <div style={{ marginTop: 16, display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: "#64748B" }}>Απαραίτητα για ενεργοποίηση</span>
                <span style={{ color: s.ready ? "#15803D" : "#B45309", fontWeight: 700 }}>{s.reqDone}/{s.reqTotal}</span>
              </div>
              <div style={{ height: 6, background: "#F1F5F9", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${(s.reqDone / s.reqTotal) * 100}%`, height: "100%", background: s.ready ? "#15803D" : "#F59E0B", borderRadius: 4, transition: "width .3s" }} />
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#94A3B8", lineHeight: 1 }}>{s.optDone}/{s.optTotal}</div>
              <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 3 }}>προαιρετικά</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 4, background: "#F1F5F9", padding: 4, borderRadius: 10, marginTop: 16, flexWrap: "wrap" }}>
            {TABS.map(t => {
              const TIcon = t.Icon;
              const active = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  style={{ padding: "8px 14px", borderRadius: 7, border: "none", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: active ? "#fff" : "transparent", color: active ? "#0F172A" : "#64748B", boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <TIcon size={13} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ padding: "22px 28px 130px" }}>
          {/* ═══ ΕΠΙΣΚΟΠΗΣΗ ═══ */}
          {tab === "overview" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))", gap: 12, marginBottom: 20 }}>
                {[
                  { label: "Αιτήματα", value: requests.length, color: "#1D4ED8" },
                  { label: "Ολοκληρωμένα", value: completed, color: "#15803D" },
                  { label: "Ακυρώσεις", value: cancelled, color: "#BE123C" },
                  { label: "Αξιολογήσεις", value: therapist.review_count || 0, color: "#B45309" },
                ].map(c => (
                  <div key={c.label} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "16px 18px" }}>
                    <div style={{ fontSize: 26, fontWeight: 700, color: c.color, lineHeight: 1 }}>{c.value}</div>
                    <div style={{ fontSize: 12, color: "#64748B", marginTop: 5 }}>{c.label}</div>
                  </div>
                ))}
              </div>

              {/* Πρόοδος onboarding — πού κόλλησε */}
              {therapist.onboarding && !therapist.onboarding.completed_at && (
                <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 14, padding: "15px 19px", marginBottom: 14, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <Rocket size={17} color="#1D4ED8" strokeWidth={2.1} />
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1E40AF" }}>
                      Δεν ολοκλήρωσε το onboarding
                    </div>
                    <div style={{ fontSize: 12.5, color: "#1D4ED8", marginTop: 2 }}>
                      Σταμάτησε στο βήμα {therapist.onboarding.current_step || 1} από 5
                      {" · "}τελευταία δραστηριότητα {fmtDate(therapist.onboarding.updated_at)}
                    </div>
                  </div>
                </div>
              )}

              <Panel title="Στοιχεία επικοινωνίας" Icon={Home}>
                <Row label="Email" value={contact?.email || "—"} mono />
                <Row label="Τηλέφωνο" value={therapist.phone || "—"} />
                <Row label="Πόλη" value={therapist.city_name || "—"} />
                <Row label="Περιοχή έδρας" value={therapist.area || "—"} />
                <Row label="Περιοχές εξυπηρέτησης" value={(therapist.service_areas || []).length > 0 ? (therapist.service_areas || []).join(", ") : "—"} />
                <Row label="Εγγραφή" value={fmtDate(therapist.created_at)} />
                <Row label="Τελευταία σύνδεση" value={contact?.last_sign_in_at ? fmtDateTime(contact.last_sign_in_at) : "—"} last />
              </Panel>

              <Panel title="Επαγγελματικά στοιχεία" Icon={Stethoscope}>
                <Row label="Ειδικότητα" value={therapist.specialty || "—"} />
                <Row label="Χρόνια εμπειρίας" value={therapist.years_experience ? `${therapist.years_experience} χρόνια` : "—"} />
                <Row label="Τιμή συνεδρίας" value={therapist.price_per_session ? `${therapist.price_per_session}€` : "—"} />
                <Row label="Περιστατικά" value={`${therapist.conditions_count || 0} δηλωμένα`} />
                <Row label="Σχολή" value={therapist.education_school || "—"} />
                <Row label="Πτυχίο" value={therapist.education_degree || "—"} />
                <Row label="Έτος αποφοίτησης" value={therapist.education_year || "—"} last />
              </Panel>

              {therapist.bio && (
                <Panel title="Βιογραφικό" Icon={FileText}>
                  <p style={{ fontSize: 13.5, color: "#475569", lineHeight: 1.7, margin: 0, whiteSpace: "pre-line" }}>{therapist.bio}</p>
                </Panel>
              )}

              <Panel title="Οικονομικά στοιχεία" Icon={CreditCard}>
                <Row label="IBAN" value={therapist.iban || "—"} mono />
                <Row label="Δικαιούχος" value={therapist.payout_name || "—"} />
                <Row label="ΑΦΜ" value={therapist.tax_id || "—"} mono />
                <Row label="ΔΟΥ" value={therapist.tax_office || "—"} />
                <Row label="Επωνυμία" value={therapist.legal_name || "—"} />
                <Row label="Έδρα" value={therapist.billing_address || "—"} last />
              </Panel>

              <Panel title="Support Tags" Icon={Tag}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {SUPPORT_TAGS.map(t => {
                    const on = tags.includes(t);
                    return (
                      <button key={t} onClick={() => toggleTag(t)}
                        style={{ padding: "6px 13px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: `1.5px solid ${on ? "#1D4ED8" : "#E2E8F0"}`, background: on ? "#EFF6FF" : "#fff", color: on ? "#1D4ED8" : "#64748B" }}>
                        {t}
                      </button>
                    );
                  })}
                </div>
              </Panel>

              {therapist.admin_override_note && (
                <Panel title="Σημείωση ενεργοποίησης" Icon={AlertTriangle} accent="#FDE68A">
                  <p style={{ fontSize: 13, color: "#92400E", margin: 0, lineHeight: 1.6 }}>
                    {therapist.admin_override_note}
                    <span style={{ display: "block", fontSize: 11.5, color: "#94A3B8", marginTop: 5 }}>{fmtDateTime(therapist.admin_override_at)}</span>
                  </p>
                </Panel>
              )}
            </>
          )}

          {/* ═══ ΕΝΕΡΓΟΠΟΙΗΣΗ ═══ */}
          {tab === "check" && (
            <>
              {/* ── ΑΔΕΙΑ: το ένα κουμπί που κάνει τα πάντα ── */}
              <div style={{
                background: "#fff",
                border: `1px solid ${therapist.license_verified ? "#BBF7D0" : "#FDE68A"}`,
                borderRadius: 14, padding: "18px 20px", marginBottom: 18,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
                  <ShieldCheck size={16} color={therapist.license_verified ? "#15803D" : "#B45309"} strokeWidth={2.2} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>Επαλήθευση άδειας</span>
                </div>

                {therapist.license_verified ? (
                  <>
                    <div style={{ fontSize: 13, color: "#15803D", marginBottom: 6 }}>
                      Επαληθεύτηκε {fmtDate(therapist.verified_at)}
                      {therapist.license_verification_method === "offline" ? " — χωρίς έγγραφο" : " — με έγγραφο"}
                    </div>
                    {therapist.license_verification_note && (
                      <div style={{ background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 10, padding: "10px 14px", fontSize: 12.5, color: "#6D28D9", lineHeight: 1.6, marginBottom: 12 }}>
                        <strong>Αιτιολογία:</strong> {therapist.license_verification_note}
                        {therapist.license_document_due_at && !therapist.license_url && (
                          <div style={{ marginTop: 5, color: "#7C3AED" }}>
                            Αναμένεται έγγραφο έως {fmtDate(therapist.license_document_due_at)}
                          </div>
                        )}
                      </div>
                    )}
                    <ActionBtn onClick={unverify} disabled={busy} bg="#fff" color="#BE123C" border="#FECDD3" Icon={XCircle}>
                      Αναίρεση επαλήθευσης
                    </ActionBtn>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 13, color: "#64748B", marginBottom: 14, lineHeight: 1.6 }}>
                      {therapist.license_url
                        ? "Ο θεραπευτής ανέβασε άδεια. Δες το έγγραφο στην καρτέλα «Έγγραφα» και επαλήθευσέ τον."
                        : "Δεν έχει ανεβάσει άδεια. Αν τον γνωρίζεις προσωπικά και έχεις δει την άδειά του, μπορείς να τον επαληθεύσεις τώρα."}
                    </div>
                    <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
                      {therapist.license_url && (
                        <ActionBtn onClick={verifyWithDocument} disabled={busy} bg="#15803D" color="#fff" Icon={ShieldCheck}>
                          Επαλήθευση με έγγραφο
                        </ActionBtn>
                      )}
                      <ActionBtn onClick={() => setShowOffline(true)} disabled={busy} bg="#fff" color="#6D28D9" border="#DDD6FE" Icon={ShieldAlert}>
                        Επαλήθευση χωρίς έγγραφο
                      </ActionBtn>
                    </div>
                    <div style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 10, lineHeight: 1.55 }}>
                      Και οι δύο τρόποι δίνουν το ίδιο σήμα στον ασθενή. Η διαφορά καταγράφεται μόνο εσωτερικά.
                    </div>
                  </>
                )}
              </div>

              {/* ── ΑΠΑΡΑΙΤΗΤΑ ── */}
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 4 }}>
                Απαραίτητα για ενεργοποίηση — {s.reqDone}/{s.reqTotal}
              </div>
              <div style={{ fontSize: 12.5, color: "#94A3B8", marginBottom: 12 }}>
                Ίδια λίστα με αυτή που βλέπει ο θεραπευτής και με τη συνθήκη της βάσης.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 22 }}>
                {REQUIRED.map(c => {
                  const ok = c.check(therapist);
                  return (
                    <div key={c.key} style={{
                      display: "flex", alignItems: "center", gap: 11, padding: "12px 16px", borderRadius: 10,
                      background: ok ? "#F0FDF4" : "#FFFBEB",
                      border: `1px solid ${ok ? "#BBF7D0" : "#FDE68A"}`,
                    }}>
                      {ok ? <CheckCircle2 size={17} color="#15803D" strokeWidth={2.2} /> : <AlertTriangle size={17} color="#B45309" strokeWidth={2.2} />}
                      <span style={{ flex: 1, fontSize: 13.5, fontWeight: ok ? 600 : 500, color: ok ? "#065F46" : "#0F172A" }}>{c.label}</span>
                      {!ok && <span style={{ fontSize: 10.5, fontWeight: 700, color: "#B45309", textTransform: "uppercase", letterSpacing: ".05em" }}>Λείπει</span>}
                    </div>
                  );
                })}
              </div>

              {/* ── ΠΡΟΑΙΡΕΤΙΚΑ ── */}
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 12 }}>
                Προαιρετικά — {s.optDone}/{s.optTotal}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {OPTIONAL.map(c => {
                  const ok = c.check(therapist);
                  return (
                    <span key={c.key} style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "7px 13px", borderRadius: 30, fontSize: 12.5, fontWeight: 600,
                      border: `1px solid ${ok ? "#BBF7D0" : "#E2E8F0"}`,
                      background: ok ? "#F0FDF4" : "#fff",
                      color: ok ? "#15803D" : "#94A3B8",
                    }}>
                      {ok ? <CheckCircle2 size={13} strokeWidth={2.2} /> : <Circle size={13} strokeWidth={2} />}
                      {c.label}
                    </span>
                  );
                })}
              </div>
            </>
          )}

          {/* ═══ ΣΥΝΔΡΟΜΗ ═══ */}
          {tab === "sub" && (
            !sub ? (
              <Empty text="Δεν έχει ενεργή συνδρομή. Δεν μπορεί να εμφανιστεί στο site." />
            ) : (
              <>
                {/* ΟΙ ΠΑΓΩΜΕΝΟΙ ΟΡΟΙ — αυτό που πραγματικά ισχύει γι' αυτόν,
                    ανεξάρτητα από το τι λέει σήμερα το πακέτο. */}
                <Panel title="Συμφωνία θεραπευτή" Icon={Repeat} accent="#BBF7D0">
                  <Row label="Πακέτο" value={sub.plan_snapshot?.name_el || "—"} strong />
                  <Row label="Κατάσταση" value={sub.status} />
                  <Row label="Έκδοση πακέτου" value={sub.plan_version ? `v${sub.plan_version}` : "—"} />
                  <Row label="Έναρξη" value={fmtDate(sub.started_at)} />
                  <Row label="Λήξη περιόδου" value={fmtDate(sub.current_period_end)} last />
                </Panel>

                <Panel title="Οικονομικοί όροι" Icon={CreditCard}>
                  <Row
                    label="Μηνιαία συνδρομή"
                    value={
                      num(sub.price_locked) > num(sub.effective_price ?? sub.price_locked)
                        ? `${eur(sub.effective_price)}  (κατάλογος ${eur(sub.price_locked)})`
                        : eur(sub.effective_price ?? sub.price_locked)
                    }
                    strong
                  />
                  <Row
                    label="Τέλος νέου ασθενή"
                    value={
                      num(sub.first_session_fee_locked) > num(sub.effective_first_session_fee ?? sub.first_session_fee_locked)
                        ? `${eur(sub.effective_first_session_fee)}  (κατάλογος ${eur(sub.first_session_fee_locked)})`
                        : eur(sub.effective_first_session_fee ?? sub.first_session_fee_locked)
                    }
                    strong
                  />
                  <Row label="Κωδικός προσφοράς" value={sub.promo_code_text || "—"} />
                  <Row label="Λήξη προσφοράς" value={sub.promo_ends_at ? fmtDate(sub.promo_ends_at) : "—"} last />
                </Panel>

                {sub.promo_ends_at && (
                  <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12, padding: "12px 16px", marginBottom: 14, fontSize: 12.5, color: "#92400E", lineHeight: 1.6 }}>
                    Μετά τις {fmtDate(sub.promo_ends_at)} ισχύουν οι τιμές καταλόγου που κλείδωσε:
                    {" "}<strong>{eur(sub.price_locked)}/μήνα</strong> και <strong>{eur(sub.first_session_fee_locked)}</strong> ανά νέο ασθενή.
                  </div>
                )}

                <Panel title="Σύμβαση συνεργασίας" Icon={FileText}>
                  <Row label="Έκδοση" value={sub.agreement_version || "—"} />
                  <Row label="Αποδοχή" value={fmtDateTime(sub.agreement_accepted_at)} last />
                </Panel>

                <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 12, padding: "12px 16px", fontSize: 12.5, color: "#1E40AF", lineHeight: 1.65 }}>
                  Αυτοί οι όροι είναι <strong>παγωμένοι</strong>. Αν αλλάξεις την τιμή του πακέτου στη σελίδα
                  «Πακέτα συνδρομής», αυτός ο θεραπευτής δεν επηρεάζεται.
                </div>
              </>
            )
          )}

          {/* ═══ ΕΓΓΡΑΦΑ ═══ */}
          {tab === "docs" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <DocRow
                label="Άδεια ασκήσεως" required
                path={therapist.license_url}
                Icon={GraduationCap}
                onView={viewDocument}
                extra={therapist.license_verified ? "Επαληθευμένη" : "Ανέβηκε — αναμένει έλεγχο"}
              />
              {!therapist.license_url && therapist.license_verified && (
                <div style={{ background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 12, padding: "12px 16px", fontSize: 12.5, color: "#6D28D9", lineHeight: 1.6 }}>
                  Επαληθεύτηκε χωρίς έγγραφο. Ζήτησέ του να ανεβάσει την άδεια όταν μπορέσει.
                </div>
              )}
              <DocRow label="CV" path={therapist.cv_url} Icon={FileText} onView={viewDocument} />
              {(therapist.certifications_urls || []).length > 0
                ? (therapist.certifications_urls || []).map((p, i) => (
                    <DocRow key={p} label={`Πιστοποιητικό ${i + 1}`} path={p} Icon={Award} onView={viewDocument} />
                  ))
                : <DocRow label="Πιστοποιήσεις" path={null} Icon={Award} onView={viewDocument} />}
            </div>
          )}

          {/* ═══ ΑΙΤΗΜΑΤΑ ═══ */}
          {tab === "requests" && (
            requests.length === 0 ? <Empty text="Δεν υπάρχουν αιτήματα" /> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {requests.map(r => (
                  <div key={r.id} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "14px 18px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", marginBottom: 5 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: "#0F172A" }}>{r.problem_type || "Φυσιοθεραπεία"}</span>
                      <span style={{ fontSize: 11, color: "#94A3B8", marginLeft: "auto" }}>{fmtDate(r.created_at)}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: "#64748B" }}>
                      {r.patient_name || "Άγνωστος ασθενής"}
                      {r.area ? ` · ${r.area}` : ""}
                      {r.total_cost ? ` · ${r.total_cost}€` : ""}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ═══ ΣΗΜΕΙΩΣΕΙΣ ═══ */}
          {tab === "notes" && (
            <>
              <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16, marginBottom: 14 }}>
                <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
                  placeholder="Προσθήκη εσωτερικής σημείωσης..."
                  style={{ width: "100%", padding: "11px 13px", border: "1.5px solid #E2E8F0", borderRadius: 9, fontSize: 13.5, fontFamily: "inherit", outline: "none", resize: "vertical", color: "#0F172A", boxSizing: "border-box" }} />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                  <button onClick={addNote} disabled={busy || !note.trim()}
                    style={{ padding: "9px 20px", borderRadius: 30, border: "none", background: note.trim() ? "#0F172A" : "#E2E8F0", color: note.trim() ? "#fff" : "#94A3B8", fontSize: 13, fontWeight: 600, cursor: note.trim() ? "pointer" : "not-allowed", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Save size={14} />
                    Αποθήκευση
                  </button>
                </div>
              </div>
              {notes.length === 0 ? <Empty text="Δεν υπάρχουν σημειώσεις" /> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {notes.map(n => (
                    <div key={n.id} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "13px 17px" }}>
                      <p style={{ fontSize: 13.5, color: "#334155", margin: 0, lineHeight: 1.6, whiteSpace: "pre-line" }}>{n.note}</p>
                      <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 7 }}>{fmtDateTime(n.created_at)}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* ═══ ACTION BAR ═══ */}
        <div style={{ position: "sticky", bottom: 0, background: "#fff", borderTop: "1px solid #E2E8F0", padding: "14px 28px", display: "flex", gap: 9, flexWrap: "wrap", alignItems: "center" }}>
          {!therapist.license_verified && (
            <ActionBtn onClick={() => setShowOffline(true)} disabled={busy} bg="#15803D" color="#fff" Icon={ShieldCheck}>
              Επαλήθευση
            </ActionBtn>
          )}

          {!visible && (
            <ActionBtn onClick={forceVisible} disabled={busy} bg="#fff" color="#6D28D9" border="#DDD6FE" Icon={Eye}>
              Εμφάνιση ούτως ή άλλως
            </ActionBtn>
          )}

          {therapist.admin_visibility_override && (
            <ActionBtn onClick={removeOverride} disabled={busy} bg="#fff" color="#64748B" border="#E2E8F0" Icon={EyeOff}>
              Αφαίρεση παράκαμψης
            </ActionBtn>
          )}

          {therapist.application_status !== "rejected" && (
            <ActionBtn onClick={() => setShowReject(true)} disabled={busy} bg="#DC2626" color="#fff" Icon={XCircle}>Απόρριψη</ActionBtn>
          )}

          {!therapist.is_paused
            ? <ActionBtn onClick={suspend} disabled={busy} bg="#F59E0B" color="#fff" Icon={Pause}>Αναστολή</ActionBtn>
            : <ActionBtn onClick={unsuspend} disabled={busy} bg="#15803D" color="#fff" Icon={CheckCircle2}>Άρση αναστολής</ActionBtn>}

          <div style={{ marginLeft: "auto", display: "flex", gap: 9 }}>
            <ActionBtn onClick={hardDelete} disabled={busy} bg="#fff" color="#BE123C" border="#FECDD3" Icon={Trash2}>Διαγραφή</ActionBtn>
            <ActionBtn onClick={onClose} bg="#fff" color="#64748B" border="#E2E8F0">Κλείσιμο</ActionBtn>
          </div>
        </div>

        {/* ═══ MODAL: ΕΠΑΛΗΘΕΥΣΗ ═══ */}
        {showOffline && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20, padding: 24 }}
            onClick={e => { if (e.target === e.currentTarget) setShowOffline(false); }}>
            <div style={{ background: "#fff", borderRadius: 16, padding: 28, maxWidth: 480, width: "100%" }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>
                Επαλήθευση {therapist.name}
              </h3>
              <p style={{ fontSize: 13.5, color: "#64748B", lineHeight: 1.65, marginBottom: 18 }}>
                Ο ασθενής θα δει το σήμα «Επαληθευμένος», ίδιο και στις δύο περιπτώσεις.
                Η διαφορά καταγράφεται μόνο εδώ.
              </p>

              {therapist.license_url && (
                <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, padding: "13px 17px", marginBottom: 16 }}>
                  <div style={{ fontSize: 13, color: "#166534", marginBottom: 10, lineHeight: 1.6 }}>
                    Έχει ανεβάσει άδεια. Δες την πρώτα και μετά επαλήθευσε.
                  </div>
                  <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
                    <ActionBtn onClick={() => viewDocument(therapist.license_url)} bg="#fff" color="#15803D" border="#BBF7D0" Icon={Eye}>
                      Προβολή άδειας
                    </ActionBtn>
                    <ActionBtn onClick={() => { setShowOffline(false); verifyWithDocument(); }} disabled={busy} bg="#15803D" color="#fff" Icon={ShieldCheck}>
                      Επαλήθευση με έγγραφο
                    </ActionBtn>
                  </div>
                </div>
              )}

              <div style={{ height: 1, background: "#F1F5F9", margin: "4px 0 16px" }} />

              <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>
                Επαλήθευση χωρίς έγγραφο
              </div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 6 }}>
                Αιτιολογία *
              </label>
              <textarea value={offlineNote} onChange={e => setOfflineNote(e.target.value)} rows={3}
                placeholder="π.χ. Συνεργάτης από το κέντρο Ν. Σμύρνης, είδα την άδεια δια ζώσης 28/08"
                style={{ width: "100%", padding: "11px 13px", border: "1.5px solid #E2E8F0", borderRadius: 9, fontSize: 13.5, fontFamily: "inherit", resize: "vertical", marginBottom: 8, color: "#0F172A", boxSizing: "border-box" }} />
              <div style={{ fontSize: 11.5, color: "#94A3B8", lineHeight: 1.55, marginBottom: 18 }}>
                Θα καταγραφεί μαζί με το όνομά σου και την ημερομηνία. Ορίζεται υπενθύμιση 30 ημερών
                για να ανεβάσει το έγγραφο.
              </div>

              <div style={{ display: "flex", gap: 9, justifyContent: "flex-end" }}>
                <ActionBtn onClick={() => setShowOffline(false)} bg="#fff" color="#64748B" border="#E2E8F0">Άκυρο</ActionBtn>
                <ActionBtn onClick={verifyOffline} disabled={busy || !offlineNote.trim()} bg="#6D28D9" color="#fff" Icon={ShieldAlert}>
                  Επαλήθευση χωρίς έγγραφο
                </ActionBtn>
              </div>
            </div>
          </div>
        )}

        {/* ═══ MODAL: ΑΠΟΡΡΙΨΗ ═══ */}
        {showReject && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20, padding: 24 }}
            onClick={e => { if (e.target === e.currentTarget) setShowReject(false); }}>
            <div style={{ background: "#fff", borderRadius: 16, padding: 28, maxWidth: 440, width: "100%" }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginBottom: 16 }}>Απόρριψη θεραπευτή</h3>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>Λόγος *</label>
              <select value={rejectCode} onChange={e => setRejectCode(e.target.value)}
                style={{ width: "100%", padding: "11px 13px", border: "1.5px solid #E2E8F0", borderRadius: 9, fontSize: 13.5, fontFamily: "inherit", marginBottom: 14, color: "#0F172A", boxSizing: "border-box" }}>
                <option value="">Επιλέξτε λόγο</option>
                {REJECT_REASONS.map(r => <option key={r.code} value={r.code}>{r.label}</option>)}
              </select>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>Σχόλιο</label>
              <textarea value={rejectComment} onChange={e => setRejectComment(e.target.value)} rows={3}
                style={{ width: "100%", padding: "11px 13px", border: "1.5px solid #E2E8F0", borderRadius: 9, fontSize: 13.5, fontFamily: "inherit", resize: "vertical", marginBottom: 18, color: "#0F172A", boxSizing: "border-box" }} />
              <div style={{ display: "flex", gap: 9, justifyContent: "flex-end" }}>
                <ActionBtn onClick={() => setShowReject(false)} bg="#fff" color="#64748B" border="#E2E8F0">Άκυρο</ActionBtn>
                <ActionBtn onClick={doReject} disabled={busy} bg="#DC2626" color="#fff">Απόρριψη</ActionBtn>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// ΚΥΡΙΑ ΣΕΛΙΔΑ
// ════════════════════════════════════════════════════════════════════════
export default function TherapistsPage({ hideHeader }) {
  const [therapists, setTherapists] = useState([]);
  const [requestsByTherapist, setRequestsByTherapist] = useState({});
  const [contacts, setContacts] = useState({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCity, setFilterCity] = useState("");

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);

    const [
      { data: profiles },
      { data: reviews },
      { data: condLinks },
      { data: reqs },
      { data: patients },
      { data: subs },
      { data: cities },
      { data: onboarding },
    ] = await Promise.all([
      supabase.from("therapist_profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("reviews").select("therapist_id, rating").eq("is_published", true),
      supabase.from("therapist_conditions").select("therapist_id, condition_id"),
      supabase.from("session_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("patient_profiles").select("id, name"),
      supabase.from("therapist_subscriptions").select("*").order("created_at", { ascending: false }),
      supabase.from("cities").select("id, name_el"),
      supabase.from("therapist_onboarding").select("therapist_id, current_step, completed_at, updated_at"),
    ]);

    const rmap = {};
    (reviews || []).forEach(rv => {
      if (!rmap[rv.therapist_id]) rmap[rv.therapist_id] = { sum: 0, count: 0 };
      rmap[rv.therapist_id].sum += rv.rating;
      rmap[rv.therapist_id].count += 1;
    });

    const cmap = {};
    (condLinks || []).forEach(c => { cmap[c.therapist_id] = (cmap[c.therapist_id] || 0) + 1; });

    const pmap = {};
    (patients || []).forEach(p => { pmap[p.id] = p.name; });

    const cityMap = {};
    (cities || []).forEach(c => { cityMap[c.id] = c.name_el; });

    // Μόνο η ΕΝΕΡΓΗ συνδρομή μετράει για την ορατότητα
    const subMap = {};
    (subs || []).forEach(sb => {
      if (["trialing", "active", "past_due", "exempt"].includes(sb.status) && !subMap[sb.therapist_id]) {
        subMap[sb.therapist_id] = sb;
      }
    });

    const obMap = {};
    (onboarding || []).forEach(o => { obMap[o.therapist_id] = o; });

    const reqMap = {};
    (reqs || []).forEach(r => {
      if (!r.therapist_id) return;
      if (!reqMap[r.therapist_id]) reqMap[r.therapist_id] = [];
      reqMap[r.therapist_id].push({ ...r, patient_name: pmap[r.patient_id] });
    });

    const list = (profiles || []).map(p => ({
      ...p,
      conditions_count: cmap[p.id] || 0,
      avg_rating: rmap[p.id] ? rmap[p.id].sum / rmap[p.id].count : 0,
      review_count: rmap[p.id]?.count || 0,
      sub: subMap[p.id] || null,
      city_name: p.city_id ? cityMap[p.city_id] : null,
      onboarding: obMap[p.id] || null,
    }));

    setTherapists(list);
    setRequestsByTherapist(reqMap);

    // Emails από auth.users μέσω admin-only function.
    // Αν λείπει το migration, η σελίδα δουλεύει απλά χωρίς emails.
    if (list.length > 0) {
      const { data: cts, error } = await supabase.rpc("admin_get_user_contacts", { p_ids: list.map(t => t.id) });
      if (!error && cts) {
        const cm = {};
        cts.forEach(c => { cm[c.id] = c; });
        setContacts(cm);
      }
    }

    setLoading(false);
  }

  const cityNames = [...new Set(therapists.map(t => t.city_name).filter(Boolean))].sort();

  const filtered = therapists.filter(t => {
    const s = stats(t);
    if (filterStatus === "pending"     && !(t.license_url && !t.license_verified)) return false;
    if (filterStatus === "verified"    && !t.license_verified) return false;
    if (filterStatus === "onboarding"  && !(t.onboarding && !t.onboarding.completed_at)) return false;
    if (filterStatus === "nosub"       && !!t.sub) return false;
    if (filterStatus === "nodoc"       && !(t.license_verified && !t.license_url)) return false;
    if (filterStatus === "hidden"      && isPubliclyVisible(t)) return false;
    if (filterStatus === "rejected"    && t.application_status !== "rejected") return false;
    if (filterCity && t.city_name !== filterCity) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const email = (contacts[t.id]?.email || "").toLowerCase();
      if (!(t.name || "").toLowerCase().includes(q) &&
          !(t.specialty || "").toLowerCase().includes(q) &&
          !(t.area || "").toLowerCase().includes(q) &&
          !(t.phone || "").includes(q) &&
          !email.includes(q)) return false;
    }
    return true;
  });

  const counts = {
    all:        therapists.length,
    pending:    therapists.filter(t => t.license_url && !t.license_verified).length,
    verified:   therapists.filter(t => t.license_verified).length,
    onboarding: therapists.filter(t => t.onboarding && !t.onboarding.completed_at).length,
    nosub:      therapists.filter(t => !t.sub).length,
    nodoc:      therapists.filter(t => t.license_verified && !t.license_url).length,
    hidden:     therapists.filter(t => !isPubliclyVisible(t)).length,
    rejected:   therapists.filter(t => t.application_status === "rejected").length,
  };

  function doExport() {
    exportToCsv("therapists", filtered.map(t => ({
      Ονοματεπώνυμο: t.name,
      Email: contacts[t.id]?.email || "",
      Τηλέφωνο: t.phone || "",
      Πόλη: t.city_name || "",
      Περιοχές: (t.service_areas || []).join(" | "),
      Τιμή: t.price_per_session || "",
      Περιστατικά: t.conditions_count,
      Πακέτο: t.sub?.plan_snapshot?.name_el || "",
      Συνδρομή: t.sub ? num(t.sub.effective_price ?? t.sub.price_locked) : "",
      ΤέλοςΝέουΑσθενή: t.sub ? num(t.sub.effective_first_session_fee ?? t.sub.first_session_fee_locked) : "",
      Προσφορά: t.sub?.promo_code_text || "",
      Επαληθευμένος: t.license_verified ? "Ναι" : "Όχι",
      ΤρόποςΕπαλήθευσης: t.license_verification_method || "",
      Ορατός: isPubliclyVisible(t) ? "Ναι" : "Όχι",
      Απαραίτητα: `${stats(t).reqDone}/${stats(t).reqTotal}`,
      Εγγραφή: csvDate(t.created_at),
    })));
  }

  const TABS = [
    { id: "all",        label: "Όλοι",             n: counts.all },
    { id: "pending",    label: "Άδεια σε έλεγχο",  n: counts.pending },
    { id: "verified",   label: "Επαληθευμένοι",    n: counts.verified },
    { id: "onboarding", label: "Σε onboarding",    n: counts.onboarding },
    { id: "nosub",      label: "Χωρίς συνδρομή",   n: counts.nosub },
    { id: "nodoc",      label: "Χωρίς έγγραφο",    n: counts.nodoc },
    { id: "hidden",     label: "Κρυφοί",           n: counts.hidden },
    { id: "rejected",   label: "Απορριφθέντες",    n: counts.rejected },
  ];

  if (loading) {
    return <div style={{ padding: 60, textAlign: "center", color: "#64748B", fontSize: 15 }}>Φόρτωση...</div>;
  }

  return (
    <div>
      {!hideHeader && (
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0F172A", margin: 0 }}>Φυσιοθεραπευτές</h1>
          <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>
            Επαλήθευση, συνδρομή, έγγραφα, αιτήματα
          </p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(165px,1fr))", gap: 14, marginBottom: 22 }}>
        {[
          { label: "Σύνολο",       value: counts.all,                     sub: "εγγεγραμμένοι", bg: "#F8FAFC", border: "#E2E8F0", color: "#0F172A", Icon: Stethoscope },
          { label: "Ορατοί",       value: counts.all - counts.hidden,     sub: "στο site",      bg: "#F0FDF4", border: "#BBF7D0", color: "#15803D", Icon: Eye },
          { label: "Άδεια σε έλεγχο", value: counts.pending,              sub: "περιμένουν",    bg: "#FFFBEB", border: "#FDE68A", color: "#B45309", Icon: Clock },
          { label: "Χωρίς συνδρομή", value: counts.nosub,                 sub: "δεν εμφανίζονται", bg: "#FFF1F2", border: "#FECDD3", color: "#BE123C", Icon: Repeat },
          { label: "Χωρίς έγγραφο", value: counts.nodoc,                  sub: "να ζητηθεί",    bg: "#FAF5FF", border: "#E9D5FF", color: "#7E22CE", Icon: ShieldAlert },
        ].map(c => {
          const CIcon = c.Icon;
          return (
            <div key={c.label} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 14, padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                <CIcon size={14} color={c.color} strokeWidth={2.2} />
                <span style={{ fontSize: 11, fontWeight: 700, color: c.color, textTransform: "uppercase", letterSpacing: ".05em" }}>{c.label}</span>
              </div>
              <div style={{ fontSize: 30, fontWeight: 700, color: c.color, lineHeight: 1 }}>{c.value}</div>
              <div style={{ fontSize: 12, color: c.color, opacity: 0.75, marginTop: 4 }}>{c.sub}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 4, background: "#E2E8F0", padding: 4, borderRadius: 12, width: "fit-content", marginBottom: 14, flexWrap: "wrap" }}>
        {TABS.map(t => {
          const active = filterStatus === t.id;
          return (
            <button key={t.id} onClick={() => setFilterStatus(t.id)}
              style={{ padding: "8px 15px", borderRadius: 8, border: "none", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: active ? "#fff" : "transparent", color: active ? "#0F172A" : "#64748B", boxShadow: active ? "0 1px 4px rgba(0,0,0,0.1)" : "none" }}>
              {t.label} <span style={{ opacity: 0.6, marginLeft: 3 }}>{t.n}</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
        <select value={filterCity} onChange={e => setFilterCity(e.target.value)}
          style={{ padding: "10px 14px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 13, fontFamily: "inherit", color: "#0F172A", background: "#fff", cursor: "pointer", minWidth: 160 }}>
          <option value="">Όλες οι πόλεις</option>
          {cityNames.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
          <Search size={15} color="#94A3B8" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Αναζήτηση ονόματος, email, τηλεφώνου..."
            style={{ width: "100%", padding: "10px 14px 10px 38px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 13, fontFamily: "inherit", outline: "none", color: "#0F172A", boxSizing: "border-box" }} />
        </div>

        <button onClick={doExport}
          style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid #E2E8F0", background: "#fff", color: "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Download size={14} />
          Εξαγωγή CSV ({filtered.length})
        </button>
      </div>

      {filtered.length === 0 ? (
        <Empty text="Δεν βρέθηκαν θεραπευτές" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(t => {
            const s = stats(t);
            const st = statusOf(t);
            const visible = isPubliclyVisible(t);
            const email = contacts[t.id]?.email;
            const offlineVerified = t.license_verified && !t.license_url;
            return (
              <div key={t.id} onClick={() => setSelected(t)}
                style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 16, transition: "all .15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#CBD5E1"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(15,23,42,0.06)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.boxShadow = "none"; }}>

                <Avatar name={t.name} photoUrl={t.photo_url} size={46} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", marginBottom: 5 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#0F172A" }}>{t.name || "—"}</span>
                    <Badge label={st.label} bg={st.bg} color={st.color} />
                    {visible
                      ? <Badge label="Ορατός" bg="#F0FDF4" color="#15803D" Icon={Eye} />
                      : <Badge label="Κρυφός" bg="#FEF2F2" color="#BE123C" Icon={EyeOff} />}
                    {offlineVerified && <Badge label="Χωρίς έγγραφο" bg="#F5F3FF" color="#6D28D9" Icon={ShieldAlert} />}
                    {!t.sub && <Badge label="Χωρίς συνδρομή" bg="#FFF1F2" color="#BE123C" Icon={Repeat} />}
                    {t.avg_rating > 0 && (
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#B45309", display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <Star size={11} fill="#B45309" color="#B45309" />
                        {t.avg_rating.toFixed(1)} ({t.review_count})
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12.5, color: "#64748B", marginBottom: 8 }}>
                    {email && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Mail size={12} />{email}</span>}
                    {t.phone && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Phone size={12} />{t.phone}</span>}
                    {t.city_name && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Building2 size={12} />{t.city_name}</span>}
                    {t.price_per_session > 0 && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Euro size={12} />{t.price_per_session}€</span>}
                    {t.sub && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Repeat size={12} />{t.sub.plan_snapshot?.name_el || "—"}</span>}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, maxWidth: 260, height: 5, background: "#F1F5F9", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${(s.reqDone / s.reqTotal) * 100}%`, height: "100%", background: s.ready ? "#15803D" : "#F59E0B", borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: s.ready ? "#15803D" : "#B45309" }}>
                      {s.reqDone}/{s.reqTotal} απαραίτητα
                    </span>
                  </div>
                </div>

                <span style={{ fontSize: 12.5, color: "#1D4ED8", fontWeight: 600, flexShrink: 0, whiteSpace: "nowrap" }}>Άνοιγμα</span>
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <TherapistDrawer
          therapist={therapists.find(t => t.id === selected.id) || selected}
          contact={contacts[selected.id]}
          requests={requestsByTherapist[selected.id] || []}
          onClose={() => setSelected(null)}
          onRefresh={fetchAll}
        />
      )}
    </div>
  );
}