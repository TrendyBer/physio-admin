"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  Search, X, Phone, MapPin, Calendar, Stethoscope, Star, Euro,
  ClipboardList, StickyNote, Tag, Save, Download, AlertTriangle,
  CheckCircle2, XCircle, Circle, FileText, Award, Eye, EyeOff,
  Trash2, Pause, ShieldCheck, GraduationCap, Mail, Clock, Target,
  Home, CreditCard, User,
} from "lucide-react";
import { exportToCsv, csvDate } from "../lib/exportCsv";

// ─── VERIFICATION CHECKLIST ─────────────────────────────────────────────────
// ΠΡΕΠΕΙ να συμφωνεί με την calc_profile_completeness() στη βάση.
// Τα 9 ΥΠΟΧΡΕΩΤΙΚΑ: name(>2), photo, license, license_verified,
// specialty(>3), bio(>=30), conditions(>=3), area, price(>0)
const CHECKLIST = [
  { key: "name",        label: "Προσωπικά στοιχεία",        required: true,  check: t => !!t.name && t.name.trim().length > 2 },
  { key: "photo",       label: "Φωτογραφία προφίλ",         required: true,  check: t => !!t.photo_url },
  { key: "license",     label: "Άδεια ασκήσεως ανεβασμένη", required: true,  check: t => !!t.license_url },
  { key: "license_ver", label: "Άδεια ελέγχθηκε από admin", required: true,  check: t => !!t.license_verified },
  { key: "specialty",   label: "Ειδικότητα",                required: true,  check: t => !!t.specialty && t.specialty.trim().length > 3 },
  { key: "bio",         label: "Βιογραφικό (30+ χαρακτ.)",  required: true,  check: t => !!t.bio && t.bio.trim().length >= 30 },
  { key: "conditions",  label: "Παθήσεις (3+)",             required: true,  check: t => (t.conditions_count || 0) >= 3 },
  { key: "areas",       label: "Περιοχές εξυπηρέτησης",     required: true,  check: t => (!!t.area && t.area.trim().length > 2) || (t.service_areas || []).length > 0 },
  { key: "price",       label: "Τιμή συνεδρίας",            required: true,  check: t => Number(t.price_per_session) > 0 },
  { key: "education",   label: "Σχολή / Εκπαίδευση",        required: false, check: t => !!t.education_school && t.education_school.trim().length > 3 },
  { key: "certs",       label: "Πιστοποιήσεις",             required: false, check: t => (t.certifications_urls || []).length > 0 },
  { key: "cv",          label: "CV / Βιογραφικό αρχείο",    required: false, check: t => !!t.cv_url },
  { key: "experience",  label: "Χρόνια εμπειρίας",          required: false, check: t => Number(t.years_experience) > 0 },
  { key: "availability",label: "Διαθεσιμότητα",             required: false, check: t => (t.availability_slots || []).length > 0 },
  { key: "iban",        label: "IBAN",                      required: false, check: t => !!t.iban && t.iban.trim().length > 5 },
  { key: "terms",       label: "Αποδοχή όρων",              required: false, check: t => !!t.terms_accepted_at },
];

function checklistStats(t) {
  const done = CHECKLIST.filter(c => c.check(t)).length;
  const requiredDone = CHECKLIST.filter(c => c.required && c.check(t)).length;
  const requiredTotal = CHECKLIST.filter(c => c.required).length;
  return { done, total: CHECKLIST.length, requiredDone, requiredTotal, canApprove: requiredDone === requiredTotal };
}

// Πραγματική δημόσια ορατότητα — ίδια λογική με το v_public_therapists
function isPubliclyVisible(t) {
  return !!t.is_approved
    && !t.is_paused
    && (!!t.is_profile_complete || !!t.admin_visibility_override);
}

const SUPPORT_TAGS = [
  "Επείγον", "Θέλει follow-up", "Πρόβλημα πληρωμής", "Παράπονο",
  "VIP / προτεραιότητα", "Χρειάζεται τηλεφώνημα", "Αργεί να απαντήσει",
  "Πολλές ακυρώσεις",
];

const REJECT_REASONS = [
  { code: "invalid_license",   label: "Μη έγκυρη άδεια" },
  { code: "incomplete_docs",   label: "Ελλιπή δικαιολογητικά" },
  { code: "unverified_id",     label: "Ανεπιβεβαίωτη ταυτότητα" },
  { code: "duplicate_account", label: "Διπλός λογαριασμός" },
  { code: "other",             label: "Άλλο" },
];

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
  if (t.is_approved) return { label: "Εγκεκριμένος", bg: "#D1FAE5", color: "#065F46" };
  if (t.license_url) return { label: "Σε αναμονή", bg: "#FEF3C7", color: "#92400E" };
  return { label: "Ελλιπές", bg: "#F1F5F9", color: "#475569" };
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

  const stats = checklistStats(therapist);
  const visible = isPubliclyVisible(therapist);
  const st = statusOf(therapist);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("request_notes")
        .select("*")
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
    const next = tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag];
    saveTags(next);
  }

  async function addNote() {
    if (!note.trim()) return;
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("request_notes").insert([{
      therapist_id: therapist.id,
      note: note.trim(),
      created_by: user?.id || null,
    }]);
    setNote("");
    const { data } = await supabase
      .from("request_notes").select("*")
      .eq("therapist_id", therapist.id)
      .order("created_at", { ascending: false });
    setNotes(data || []);
    setBusy(false);
  }

  async function approve() {
    setBusy(true);
    await supabase.from("therapist_profiles").update({
      is_approved: true, application_status: "approved",
      reject_reason_code: null, is_paused: false,
    }).eq("id", therapist.id);
    setBusy(false);
    await onRefresh();
    onClose();
  }

  // Χειροκίνητη ενεργοποίηση — παρακάμπτει ΤΑ ΠΑΝΤΑ.
  // Το is_approved μόνο του ΔΕΝ αρκεί: το site φιλτράρει με
  // is_publicly_visible, που απαιτεί is_profile_complete Ή override.
  // Το is_profile_complete το ελέγχει trigger και επανέρχεται σε false
  // με κάθε αλλαγή προφίλ — γι' αυτό υπάρχει ξεχωριστή στήλη.
  async function forceActivate() {
    const missing = CHECKLIST.filter(c => c.required && !c.check(therapist)).map(c => c.label);
    const msg = missing.length
      ? `Λείπουν υποχρεωτικά στοιχεία:\n\n- ${missing.join("\n- ")}\n\nΘέλετε σίγουρα να τον ενεργοποιήσετε; Θα εμφανίζεται στο site με όσα στοιχεία έχει.`
      : "Ενεργοποίηση θεραπευτή;";
    if (!confirm(msg)) return;
    setBusy(true);
    await supabase.from("therapist_profiles").update({
      is_approved: true, application_status: "approved",
      reject_reason_code: null, is_paused: false,
      admin_visibility_override: true,
      admin_override_at: new Date().toISOString(),
      admin_override_note: missing.length ? `Χειροκίνητη ενεργοποίηση. Έλειπαν: ${missing.join(", ")}` : "Χειροκίνητη ενεργοποίηση",
    }).eq("id", therapist.id);
    setBusy(false);
    await onRefresh();
    onClose();
  }

  async function removeOverride() {
    if (!confirm("Αφαίρεση χειροκίνητης ενεργοποίησης;\n\nΑν το προφίλ είναι ελλιπές, θα πάψει να εμφανίζεται στο site.")) return;
    setBusy(true);
    await supabase.from("therapist_profiles").update({
      admin_visibility_override: false,
      admin_override_at: null, admin_override_note: null,
    }).eq("id", therapist.id);
    setBusy(false);
    await onRefresh();
    onClose();
  }

  async function doReject() {
    if (!rejectCode) { alert("Επιλέξτε λόγο απόρριψης"); return; }
    setBusy(true);
    await supabase.from("therapist_profiles").update({
      is_approved: false, application_status: "rejected",
      reject_reason_code: rejectCode,
      admin_comment: rejectComment || null,
      admin_visibility_override: false,
    }).eq("id", therapist.id);
    setBusy(false);
    setShowReject(false);
    await onRefresh();
    onClose();
  }

  async function suspend() {
    if (!confirm("Αναστολή θεραπευτή; Δεν θα εμφανίζεται στο site.")) return;
    setBusy(true);
    await supabase.from("therapist_profiles").update({ is_paused: true }).eq("id", therapist.id);
    setBusy(false);
    await onRefresh();
    onClose();
  }

  async function unsuspend() {
    setBusy(true);
    await supabase.from("therapist_profiles").update({ is_paused: false, paused_reason: null }).eq("id", therapist.id);
    setBusy(false);
    await onRefresh();
    onClose();
  }

  async function toggleLicenseVerified() {
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("therapist_profiles").update({
      license_verified: !therapist.license_verified,
      verified_at: !therapist.license_verified ? new Date().toISOString() : null,
      verified_by: !therapist.license_verified ? (user?.id || null) : null,
    }).eq("id", therapist.id);
    setBusy(false);
    await onRefresh();
  }

  async function viewDocument(path) {
    const { data, error } = await supabase.storage
      .from("therapist-documents").createSignedUrl(path, 3600);
    if (error) { alert("Σφάλμα: " + error.message); return; }
    window.open(data.signedUrl, "_blank");
  }

  async function hardDelete() {
    if (!confirm(`ΟΡΙΣΤΙΚΗ ΔΙΑΓΡΑΦΗ του "${therapist.name}";\n\nΔεν αναιρείται.`)) return;
    setBusy(true);
    await supabase.from("therapist_profiles").delete().eq("id", therapist.id);
    setBusy(false);
    await onRefresh();
    onClose();
  }

  const completed = requests.filter(r => r.status === "completed").length;
  const cancelled = requests.filter(r => (r.status || "").startsWith("cancelled")).length;

  const TABS = [
    { id: "overview",  label: "Επισκόπηση", Icon: User },
    { id: "check",     label: "Έλεγχος",    Icon: CheckCircle2 },
    { id: "docs",      label: "Έγγραφα",    Icon: FileText },
    { id: "requests",  label: `Αιτήματα (${requests.length})`, Icon: ClipboardList },
    { id: "notes",     label: `Σημειώσεις (${notes.length})`,  Icon: StickyNote },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.35)" }} />

      <div style={{
        position: "relative", width: "min(760px, 92vw)", height: "100%",
        background: "#F8FAFC", overflowY: "auto",
        boxShadow: "-8px 0 40px rgba(15,23,42,0.16)",
      }}>
        {/* Header */}
        <div style={{ background: "#fff", padding: "22px 28px", borderBottom: "1px solid #E2E8F0", position: "sticky", top: 0, zIndex: 5 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
            <Avatar name={therapist.name} photoUrl={therapist.photo_url} size={54} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 5 }}>
                <span style={{ fontSize: 21, fontWeight: 700, color: "#0F172A" }}>{therapist.name || "—"}</span>
                <Badge label={st.label} bg={st.bg} color={st.color} />
                {visible
                  ? <Badge label={therapist.admin_visibility_override ? "Ορατός · χειροκίνητα" : "Ορατός"} bg="#F0FDF4" color="#15803D" Icon={Eye} />
                  : <Badge label="Κρυφός" bg="#FEF2F2" color="#BE123C" Icon={EyeOff} />}
              </div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: "#64748B" }}>
                {therapist.specialty && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <Stethoscope size={13} /> {therapist.specialty}
                  </span>
                )}
                {therapist.area && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <MapPin size={13} /> {therapist.area}
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94A3B8", padding: 4, lineHeight: 0 }}>
              <X size={22} />
            </button>
          </div>

          {/* Progress */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: "#64748B" }}>Έλεγχος προφίλ: {stats.done}/{stats.total} ολοκληρώθηκαν</span>
              <span style={{ color: stats.canApprove ? "#15803D" : "#B45309", fontWeight: 700 }}>
                {stats.requiredDone}/{stats.requiredTotal} υποχρεωτικά
              </span>
            </div>
            <div style={{ height: 6, background: "#F1F5F9", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ width: `${(stats.done / stats.total) * 100}%`, height: "100%", background: stats.canApprove ? "#15803D" : "#F59E0B", borderRadius: 4, transition: "width .3s" }} />
            </div>
          </div>

          {/* Tabs */}
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

        <div style={{ padding: "22px 28px 120px" }}>

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

              {/* Στοιχεία επικοινωνίας */}
              <Card title="Στοιχεία επικοινωνίας" Icon={Home}>
                <Row label="Email" value={contact?.email || "—"} mono />
                <Row label="Τηλέφωνο" value={therapist.phone || "—"} />
                <Row label="Περιοχή έδρας" value={therapist.area || "—"} />
                <Row label="Περιοχές εξυπηρέτησης" value={(therapist.service_areas || []).length > 0 ? (therapist.service_areas || []).join(", ") : "—"} />
                <Row label="Εγγραφή" value={fmtDate(therapist.created_at)} />
                <Row label="Τελευταία σύνδεση" value={contact?.last_sign_in_at ? fmtDateTime(contact.last_sign_in_at) : "—"} />
                <Row label="Email επιβεβαιωμένο" value={contact ? (contact.email_confirmed ? "Ναι" : "Όχι") : "—"} last />
              </Card>

              {/* Επαγγελματικά */}
              <Card title="Επαγγελματικά στοιχεία" Icon={Stethoscope}>
                <Row label="Ειδικότητα" value={therapist.specialty || "—"} />
                <Row label="Χρόνια εμπειρίας" value={therapist.years_experience ? `${therapist.years_experience} χρόνια` : "—"} />
                <Row label="Τιμή συνεδρίας" value={therapist.price_per_session ? `${therapist.price_per_session}€` : "—"} />
                <Row label="Παθήσεις" value={`${therapist.conditions_count || 0} δηλωμένες`} />
                <Row label="Σχολή" value={therapist.education_school || "—"} />
                <Row label="Πτυχίο" value={therapist.education_degree || "—"} />
                <Row label="Έτος αποφοίτησης" value={therapist.education_year || "—"} />
                <Row label="Χρόνος απόκρισης" value={therapist.response_time_hours ? `${therapist.response_time_hours} ώρες` : "—"} last />
              </Card>

              {therapist.bio && (
                <Card title="Βιογραφικό" Icon={FileText}>
                  <p style={{ fontSize: 13.5, color: "#475569", lineHeight: 1.7, margin: 0, whiteSpace: "pre-line" }}>{therapist.bio}</p>
                </Card>
              )}

              {/* Οικονομικά / φορολογικά */}
              <Card title="Οικονομικά στοιχεία" Icon={CreditCard}>
                <Row label="IBAN" value={therapist.iban || "—"} mono />
                <Row label="Δικαιούχος" value={therapist.payout_name || "—"} />
                <Row label="ΑΦΜ" value={therapist.tax_id || "—"} mono />
                <Row label="ΔΟΥ" value={therapist.tax_office || "—"} />
                <Row label="Επωνυμία" value={therapist.legal_name || "—"} />
                <Row label="Έδρα" value={[therapist.billing_address, therapist.billing_city, therapist.billing_postal].filter(Boolean).join(", ") || "—"} />
                <Row label="ΚΑΔ" value={therapist.activity_code || "—"} last />
              </Card>

              {/* Support tags */}
              <Card title="Support Tags" Icon={Tag}>
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
              </Card>

              {therapist.admin_override_note && (
                <Card title="Σημείωση ενεργοποίησης" Icon={AlertTriangle}>
                  <p style={{ fontSize: 13, color: "#92400E", margin: 0, lineHeight: 1.6 }}>
                    {therapist.admin_override_note}
                    <span style={{ display: "block", fontSize: 11.5, color: "#94A3B8", marginTop: 5 }}>
                      {fmtDateTime(therapist.admin_override_at)}
                    </span>
                  </p>
                </Card>
              )}
            </>
          )}

          {/* ═══ ΕΛΕΓΧΟΣ ═══ */}
          {tab === "check" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {CHECKLIST.map(c => {
                const ok = c.check(therapist);
                return (
                  <div key={c.key} style={{
                    display: "flex", alignItems: "center", gap: 11,
                    padding: "13px 16px", borderRadius: 10,
                    background: ok ? "#F0FDF4" : c.required ? "#FFFBEB" : "#fff",
                    border: `1px solid ${ok ? "#BBF7D0" : c.required ? "#FDE68A" : "#E2E8F0"}`,
                  }}>
                    {ok
                      ? <CheckCircle2 size={17} color="#15803D" strokeWidth={2.2} />
                      : c.required
                        ? <AlertTriangle size={17} color="#B45309" strokeWidth={2.2} />
                        : <Circle size={17} color="#CBD5E1" strokeWidth={2} />}
                    <span style={{ flex: 1, fontSize: 13.5, fontWeight: ok ? 600 : 500, color: ok ? "#065F46" : "#0F172A" }}>{c.label}</span>
                    {c.required && !ok && (
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: "#B45309", textTransform: "uppercase", letterSpacing: ".05em" }}>Υποχρεωτικό</span>
                    )}
                  </div>
                );
              })}

              <div style={{ marginTop: 8, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0F172A", marginBottom: 3 }}>Έλεγχος άδειας ασκήσεως</div>
                  <div style={{ fontSize: 12, color: "#64748B" }}>
                    {therapist.license_verified
                      ? `Επιβεβαιώθηκε ${fmtDate(therapist.verified_at)}`
                      : "Δεν έχει ελεγχθεί ακόμα"}
                  </div>
                </div>
                <button onClick={toggleLicenseVerified} disabled={busy || !therapist.license_url}
                  title={!therapist.license_url ? "Δεν έχει ανεβάσει άδεια" : ""}
                  style={{ padding: "9px 18px", borderRadius: 8, border: "none", fontSize: 12.5, fontWeight: 700, cursor: (busy || !therapist.license_url) ? "not-allowed" : "pointer", fontFamily: "inherit", background: therapist.license_verified ? "#F1F5F9" : "#15803D", color: therapist.license_verified ? "#64748B" : "#fff", display: "inline-flex", alignItems: "center", gap: 6, opacity: !therapist.license_url ? 0.5 : 1 }}>
                  <ShieldCheck size={14} />
                  {therapist.license_verified ? "Αναίρεση ελέγχου" : "Επιβεβαίωση άδειας"}
                </button>
              </div>
            </div>
          )}

          {/* ═══ ΕΓΓΡΑΦΑ ═══ */}
          {tab === "docs" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <DocRow
                label="Άδεια ασκήσεως" required
                path={therapist.license_url}
                Icon={GraduationCap}
                onView={viewDocument}
                extra={therapist.license_verified ? "Ελεγμένη" : null}
              />
              <DocRow label="CV" path={therapist.cv_url} Icon={FileText} onView={viewDocument} />
              {(therapist.certifications_urls || []).length > 0 ? (
                (therapist.certifications_urls || []).map((p, i) => (
                  <DocRow key={p} label={`Πιστοποιητικό ${i + 1}`} path={p} Icon={Award} onView={viewDocument} />
                ))
              ) : (
                <DocRow label="Πιστοποιήσεις" path={null} Icon={Award} onView={viewDocument} />
              )}
            </div>
          )}

          {/* ═══ ΑΙΤΗΜΑΤΑ ═══ */}
          {tab === "requests" && (
            requests.length === 0 ? (
              <Empty text="Δεν υπάρχουν αιτήματα" />
            ) : (
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

              {notes.length === 0 ? (
                <Empty text="Δεν υπάρχουν σημειώσεις" />
              ) : (
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
          {!therapist.is_approved && stats.canApprove && (
            <ActionBtn onClick={approve} disabled={busy} bg="#15803D" color="#fff" Icon={CheckCircle2}>Έγκριση</ActionBtn>
          )}

          {!visible && (
            <ActionBtn onClick={forceActivate} disabled={busy} bg="#15803D" color="#fff" Icon={Eye}>
              Ενεργοποίηση ούτως ή άλλως
            </ActionBtn>
          )}

          {therapist.admin_visibility_override && (
            <ActionBtn onClick={removeOverride} disabled={busy} bg="#fff" color="#64748B" border="#E2E8F0" Icon={EyeOff}>
              Αφαίρεση χειροκίνητης
            </ActionBtn>
          )}

          {therapist.application_status !== "rejected" && (
            <ActionBtn onClick={() => setShowReject(true)} disabled={busy} bg="#DC2626" color="#fff" Icon={XCircle}>Απόρριψη</ActionBtn>
          )}

          {therapist.is_approved && !therapist.is_paused && (
            <ActionBtn onClick={suspend} disabled={busy} bg="#F59E0B" color="#fff" Icon={Pause}>Αναστολή</ActionBtn>
          )}
          {therapist.is_paused && (
            <ActionBtn onClick={unsuspend} disabled={busy} bg="#15803D" color="#fff" Icon={CheckCircle2}>Άρση αναστολής</ActionBtn>
          )}

          <div style={{ marginLeft: "auto", display: "flex", gap: 9 }}>
            <ActionBtn onClick={hardDelete} disabled={busy} bg="#fff" color="#BE123C" border="#FECDD3" Icon={Trash2}>Διαγραφή</ActionBtn>
            <ActionBtn onClick={onClose} bg="#fff" color="#64748B" border="#E2E8F0">Κλείσιμο</ActionBtn>
          </div>
        </div>

        {/* Reject modal */}
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

// ─── Μικρά building blocks ──────────────────────────────────────────────
function Card({ title, Icon, children }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: "18px 20px", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        {Icon && <Icon size={15} color="#64748B" strokeWidth={2} />}
        <span style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{title}</span>
      </div>
      {children}
    </div>
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
          {has ? (extra || "Ανέβηκε") : required ? "Λείπει — υποχρεωτικό" : "Δεν ανέβηκε"}
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
        background: bg, color,
        fontSize: 12.5, fontWeight: 700,
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
  const [filterArea, setFilterArea] = useState("");

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);

    const [
      { data: profiles },
      { data: reviews },
      { data: condLinks },
      { data: reqs },
      { data: patients },
    ] = await Promise.all([
      supabase.from("therapist_profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("reviews").select("therapist_id, rating").eq("is_published", true),
      supabase.from("therapist_conditions").select("therapist_id, condition_id"),
      supabase.from("session_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("patient_profiles").select("id, name"),
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
    }));

    setTherapists(list);
    setRequestsByTherapist(reqMap);

    // Emails από auth.users μέσω admin-only function.
    // Αν αποτύχει (λείπει το migration), η σελίδα δουλεύει κανονικά
    // απλά χωρίς emails — δεν σπάει.
    if (list.length > 0) {
      const { data: cts, error } = await supabase.rpc("admin_get_user_contacts", {
        p_ids: list.map(t => t.id),
      });
      if (!error && cts) {
        const cm = {};
        cts.forEach(c => { cm[c.id] = c; });
        setContacts(cm);
      }
    }

    setLoading(false);
  }

  const areas = [...new Set(therapists.map(t => t.area).filter(Boolean))].sort();

  const filtered = therapists.filter(t => {
    if (filterStatus === "pending"  && !(!t.is_approved && t.license_url)) return false;
    if (filterStatus === "approved" && !t.is_approved) return false;
    if (filterStatus === "incomplete" && !(!t.is_approved && !t.license_url)) return false;
    if (filterStatus === "hidden"   && isPubliclyVisible(t)) return false;
    if (filterStatus === "rejected" && t.application_status !== "rejected") return false;
    if (filterArea && t.area !== filterArea) return false;
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
    all: therapists.length,
    pending: therapists.filter(t => !t.is_approved && t.license_url).length,
    approved: therapists.filter(t => t.is_approved).length,
    incomplete: therapists.filter(t => !t.is_approved && !t.license_url).length,
    hidden: therapists.filter(t => !isPubliclyVisible(t)).length,
    rejected: therapists.filter(t => t.application_status === "rejected").length,
  };

  function doExport() {
    exportToCsv("therapists", filtered.map(t => ({
      Ονοματεπώνυμο: t.name,
      Email: contacts[t.id]?.email || "",
      Τηλέφωνο: t.phone || "",
      Ειδικότητα: t.specialty || "",
      Περιοχή: t.area || "",
      Τιμή: t.price_per_session || "",
      Παθήσεις: t.conditions_count,
      Εγκεκριμένος: t.is_approved ? "Ναι" : "Όχι",
      Ορατός: isPubliclyVisible(t) ? "Ναι" : "Όχι",
      Πληρότητα: `${checklistStats(t).done}/16`,
      Εγγραφή: csvDate(t.created_at),
    })));
  }

  const TABS = [
    { id: "all",        label: "Όλοι",        n: counts.all },
    { id: "pending",    label: "Σε αναμονή",  n: counts.pending },
    { id: "approved",   label: "Εγκεκριμένοι",n: counts.approved },
    { id: "incomplete", label: "Ημιτελείς",   n: counts.incomplete },
    { id: "hidden",     label: "Κρυφοί",      n: counts.hidden },
    { id: "rejected",   label: "Απορριφθέντες", n: counts.rejected },
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
            Φάκελος θεραπευτή — έλεγχος, έγγραφα, αιτήματα, σημειώσεις
          </p>
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(165px,1fr))", gap: 14, marginBottom: 22 }}>
        {[
          { label: "Σύνολο",      value: counts.all,        sub: "εγγεγραμμένοι", bg: "#F8FAFC", border: "#E2E8F0", color: "#0F172A", Icon: Stethoscope },
          { label: "Ορατοί",      value: counts.all - counts.hidden, sub: "στο site", bg: "#F0FDF4", border: "#BBF7D0", color: "#15803D", Icon: Eye },
          { label: "Κρυφοί",      value: counts.hidden,     sub: "δεν φαίνονται", bg: "#FFF1F2", border: "#FECDD3", color: "#BE123C", Icon: EyeOff },
          { label: "Σε αναμονή",  value: counts.pending,    sub: "θέλουν έγκριση", bg: "#FFFBEB", border: "#FDE68A", color: "#B45309", Icon: Clock },
          { label: "Ημιτελείς",   value: counts.incomplete, sub: "χωρίς άδεια",   bg: "#FAF5FF", border: "#E9D5FF", color: "#7E22CE", Icon: AlertTriangle },
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

      {/* Filters */}
      <div style={{ display: "flex", gap: 4, background: "#E2E8F0", padding: 4, borderRadius: 12, width: "fit-content", marginBottom: 14, flexWrap: "wrap" }}>
        {TABS.map(t => {
          const active = filterStatus === t.id;
          return (
            <button key={t.id} onClick={() => setFilterStatus(t.id)}
              style={{ padding: "8px 16px", borderRadius: 8, border: "none", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: active ? "#fff" : "transparent", color: active ? "#0F172A" : "#64748B", boxShadow: active ? "0 1px 4px rgba(0,0,0,0.1)" : "none" }}>
              {t.label} <span style={{ opacity: 0.6, marginLeft: 3 }}>{t.n}</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
        <select value={filterArea} onChange={e => setFilterArea(e.target.value)}
          style={{ padding: "10px 14px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 13, fontFamily: "inherit", color: "#0F172A", background: "#fff", cursor: "pointer", minWidth: 160 }}>
          <option value="">Όλες οι περιοχές</option>
          {areas.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
          <Search size={15} color="#94A3B8" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Αναζήτηση ονόματος, email, τηλεφώνου, περιοχής..."
            style={{ width: "100%", padding: "10px 14px 10px 38px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 13, fontFamily: "inherit", outline: "none", color: "#0F172A", boxSizing: "border-box" }} />
        </div>

        <button onClick={doExport}
          style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid #E2E8F0", background: "#fff", color: "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Download size={14} />
          Εξαγωγή CSV ({filtered.length})
        </button>
      </div>

      {/* Λίστα */}
      {filtered.length === 0 ? (
        <Empty text="Δεν βρέθηκαν θεραπευτές" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(t => {
            const stats = checklistStats(t);
            const st = statusOf(t);
            const visible = isPubliclyVisible(t);
            const email = contacts[t.id]?.email;
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
                    {t.area && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><MapPin size={12} />{t.area}</span>}
                    {t.price_per_session > 0 && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Euro size={12} />{t.price_per_session}€</span>}
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Calendar size={12} />{fmtDate(t.created_at)}</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, maxWidth: 300, height: 5, background: "#F1F5F9", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${(stats.done / stats.total) * 100}%`, height: "100%", background: stats.canApprove ? "#15803D" : "#F59E0B", borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: stats.canApprove ? "#15803D" : "#B45309" }}>
                      {stats.done}/{stats.total}
                    </span>
                  </div>
                </div>

                <span style={{ fontSize: 12.5, color: "#1D4ED8", fontWeight: 600, flexShrink: 0, whiteSpace: "nowrap" }}>
                  Άνοιγμα
                </span>
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