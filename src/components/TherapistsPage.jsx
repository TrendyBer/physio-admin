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
  CheckCircle2, XCircle, AlertTriangle, Circle, FileText, Award, Eye,
  Search, Trash2, Pause, Play, Tag, Mail, Phone, MapPin, Euro, X,
  ShieldCheck, User, Star, Download,
} from "lucide-react";
import { exportToCsv, csvDate } from "../lib/exportCsv";

const APP_STATUS = {
  incomplete: { label:"Ελλιπές",      bg:"#F1F5F9", color:"#475569" },
  pending:    { label:"Σε αναμονή",   bg:"#FEF3C7", color:"#92400E" },
  approved:   { label:"Εγκεκριμένος", bg:"#D1FAE5", color:"#065F46" },
  rejected:   { label:"Απορρίφθηκε",  bg:"#FEE2E2", color:"#B91C1C" },
};

// Λόγοι απόρριψης
const REJECT_REASONS = [
  { code: "no_license",        label: "Δεν ανέβασε άδεια ασκήσεως" },
  { code: "incomplete_profile",label: "Ελλιπές προφίλ" },
  { code: "invalid_docs",      label: "Μη αποδεκτά στοιχεία" },
  { code: "area_not_priority", label: "Δεν καλύπτει περιοχή προτεραιότητας" },
  { code: "low_experience",    label: "Ανεπαρκής επαγγελματική εμπειρία" },
  { code: "suspicious",        label: "Ύποπτο / μη αξιόπιστο προφίλ" },
  { code: "other",             label: "Άλλος λόγος" },
];

// Support tags θεραπευτή
const THERAPIST_TAGS = [
  "Πολύ αξιόπιστος",
  "Καθυστερεί να απαντήσει",
  "Θέλει έλεγχο εγγράφων",
  "Καλή απόδοση",
  "Πολλά ακυρωμένα",
  "Νέος συνεργάτης",
  "Προτεραιότητα",
];

// ─── VERIFICATION CHECKLIST ─────────────────────────────────────────────────
// Κάθε item: τι ελέγχουμε, αν είναι υποχρεωτικό, και πώς το τσεκάρουμε
const CHECKLIST = [
  { key: "name",        label: "Προσωπικά στοιχεία",        required: true,  check: t => !!t.name },
  { key: "photo",       label: "Φωτογραφία προφίλ",         required: false, check: t => !!t.photo_url },
  { key: "license",     label: "Άδεια ασκήσεως ανεβασμένη", required: true,  check: t => !!t.license_url },
  { key: "license_ver", label: "Άδεια ελέγχθηκε από admin", required: true,  check: t => !!t.license_verified },
  { key: "specialty",   label: "Ειδικότητα",                required: true,  check: t => !!t.specialty },
  { key: "areas",       label: "Περιοχές εξυπηρέτησης",     required: true,  check: t => !!t.area || (t.service_areas || []).length > 0 },
  { key: "price",       label: "Τιμή συνεδρίας",            required: true,  check: t => !!t.price_per_session },
  { key: "bio",         label: "Βιογραφικό",                required: false, check: t => !!t.bio && t.bio.trim().length > 20 },
  { key: "experience",  label: "Χρόνια εμπειρίας",          required: false, check: t => !!t.years_experience },
  { key: "cv",          label: "CV / Βιογραφικό αρχείο",    required: false, check: t => !!t.cv_url },
  { key: "certs",       label: "Πιστοποιήσεις",             required: false, check: t => (t.certifications_urls || []).length > 0 },
  { key: "contact",     label: "Στοιχεία επικοινωνίας",     required: false, check: t => !!t.email || !!t.phone },
];

function checklistStats(t) {
  const done = CHECKLIST.filter(c => c.check(t)).length;
  const requiredDone = CHECKLIST.filter(c => c.required && c.check(t)).length;
  const requiredTotal = CHECKLIST.filter(c => c.required).length;
  return { done, total: CHECKLIST.length, requiredDone, requiredTotal, canApprove: requiredDone === requiredTotal };
}

function Badge({ label, bg, color }) {
  return <span style={{ background:bg, color, padding:"2px 10px", borderRadius:999, fontSize:11, fontWeight:700, letterSpacing:"0.04em", textTransform:"uppercase", whiteSpace:"nowrap" }}>{label}</span>;
}

function Btn({ children, onClick, variant="primary", small, disabled }) {
  const s = {
    primary: { background:"#1D4ED8", color:"#fff", border:"none" },
    success: { background:"#15803D", color:"#fff", border:"none" },
    danger:  { background:"#BE123C", color:"#fff", border:"none" },
    ghost:   { background:"transparent", color:"#64748B", border:"1px solid #E2E8F0" },
    warning: { background:"#F59E0B", color:"#fff", border:"none" },
    delete:  { background:"#FEF2F2", color:"#DC2626", border:"1px solid #FECACA" },
  }[variant];
  return (
    <button onClick={onClick} disabled={disabled}
      style={{...s, padding:small?"5px 11px":"8px 18px", borderRadius:8, fontSize:small?11:13, fontWeight:600, cursor:disabled?"not-allowed":"pointer", fontFamily:"inherit", opacity:disabled?0.5:1, display:"inline-flex", alignItems:"center", gap:5}}
      onMouseEnter={e=>{ if(!disabled) e.currentTarget.style.opacity="0.85"; }}
      onMouseLeave={e=>{ if(!disabled) e.currentTarget.style.opacity="1"; }}>
      {children}
    </button>
  );
}

function Avatar({ name, photo, size=44 }) {
  if (photo) return <img src={photo} alt={name} style={{ width:size, height:size, borderRadius:"50%", objectFit:"cover", flexShrink:0 }} />;
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:"#EFF6FF", color:"#1D4ED8", display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.33, fontWeight:700, flexShrink:0 }}>
      {name?.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase() || "?"}
    </div>
  );
}

// ─── REJECT MODAL ───────────────────────────────────────────────────────────
function RejectModal({ onConfirm, onClose }) {
  const [code, setCode] = useState("");
  const [comment, setComment] = useState("");

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1100, padding:24 }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:"#fff", borderRadius:18, width:"100%", maxWidth:460, padding:"26px 28px", boxShadow:"0 20px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
          <AlertTriangle size={20} color="#BE123C" strokeWidth={2.2}/>
          <h3 style={{ fontSize:17, fontWeight:700, color:"#0F172A", margin:0 }}>Απόρριψη θεραπευτή</h3>
        </div>
        <p style={{ fontSize:13, color:"#64748B", marginBottom:18 }}>Επιλέξτε τον λόγο. Καταγράφεται στο προφίλ.</p>

        <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:16 }}>
          {REJECT_REASONS.map(r => (
            <label key={r.code} style={{
              display:"flex", alignItems:"center", gap:10, padding:"10px 14px",
              border:`1.5px solid ${code===r.code ? "#BE123C" : "#E2E8F0"}`,
              background: code===r.code ? "#FFF1F2" : "#fff",
              borderRadius:10, cursor:"pointer", fontSize:13,
              color: code===r.code ? "#9F1239" : "#475569",
              fontWeight: code===r.code ? 600 : 500,
            }}>
              <input type="radio" name="reject_reason" value={r.code} checked={code===r.code}
                onChange={()=>setCode(r.code)} style={{ accentColor:"#BE123C" }}/>
              {r.label}
            </label>
          ))}
        </div>

        <textarea value={comment} onChange={e=>setComment(e.target.value)}
          placeholder="Σχόλιο admin (προαιρετικό)" rows={3}
          style={{ width:"100%", padding:"10px 14px", border:"1px solid #E2E8F0", borderRadius:10, fontSize:13, fontFamily:"inherit", color:"#0F172A", outline:"none", resize:"vertical", boxSizing:"border-box", marginBottom:16 }}/>

        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <Btn variant="ghost" onClick={onClose}>Άκυρο</Btn>
          <button onClick={()=>onConfirm(code, comment)} disabled={!code}
            style={{ padding:"9px 20px", borderRadius:8, border:"none", background: code ? "#BE123C" : "#CBD5E1", color:"#fff", fontSize:13, fontWeight:600, cursor: code ? "pointer" : "not-allowed", fontFamily:"inherit" }}>
            Απόρριψη
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PROFILE MODAL ──────────────────────────────────────────────────────────
function ProfileModal({ therapist, onClose, onRefresh }) {
  const [tab, setTab] = useState("checklist"); // checklist | profile | docs
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [loadingDoc, setLoadingDoc] = useState(null);
  const [tags, setTags] = useState(therapist.support_tags || []);
  const [comment, setComment] = useState(therapist.admin_comment || "");
  const [savingComment, setSavingComment] = useState(false);
  const [busy, setBusy] = useState(false);

  const status = therapist.is_approved ? "approved" : (therapist.application_status || "incomplete");
  const st = APP_STATUS[status] || APP_STATUS.incomplete;
  const stats = checklistStats(therapist);

  const hasLicense = !!therapist.license_url;
  const hasCv = !!therapist.cv_url;
  const certs = therapist.certifications_urls || [];
  const areas = therapist.service_areas || [];

  async function viewDocument(path) {
    if (!path) return;
    setLoadingDoc(path);
    const { data, error } = await supabase.storage.from("therapist-documents").createSignedUrl(path, 3600);
    setLoadingDoc(null);
    if (error) { alert("Σφάλμα: " + error.message); return; }
    window.open(data.signedUrl, "_blank");
  }

  async function toggleLicenseVerified() {
    setBusy(true);
    const next = !therapist.license_verified;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("therapist_profiles").update({
      license_verified: next,
      verified_at: next ? new Date().toISOString() : null,
      verified_by: next ? (user?.id || null) : null,
    }).eq("id", therapist.id);
    setBusy(false);
    await onRefresh();
    onClose();
  }

  async function approve() {
    setBusy(true);
    await supabase.from("therapist_profiles").update({
      is_approved: true,
      application_status: "approved",
      reject_reason_code: null,
    }).eq("id", therapist.id);
    setBusy(false);
    await onRefresh();
    onClose();
  }

  // Χειροκίνητη ενεργοποίηση — παρακάμπτει το checklist
  async function forceActivate() {
    const missing = CHECKLIST.filter(c => c.required && !c.check(therapist)).map(c => c.label);
    const msg = missing.length
      ? `Λείπουν υποχρεωτικά στοιχεία:\n\n- ${missing.join("\n- ")}\n\nΘέλετε σίγουρα να ενεργοποιήσετε τον θεραπευτή; Θα εμφανίζεται κανονικά στο site.`
      : "Ενεργοποίηση θεραπευτή;";
    if (!confirm(msg)) return;
    setBusy(true);
    await supabase.from("therapist_profiles").update({
      is_approved: true,
      application_status: "approved",
      reject_reason_code: null,
    }).eq("id", therapist.id);
    setBusy(false);
    await onRefresh();
    onClose();
  }

  async function doReject(code, txt) {
    setBusy(true);
    await supabase.from("therapist_profiles").update({
      is_approved: false,
      application_status: "rejected",
      reject_reason_code: code,
      admin_comment: txt || null,
    }).eq("id", therapist.id);
    setShowReject(false);
    setBusy(false);
    await onRefresh();
    onClose();
  }

  async function suspend() {
    setBusy(true);
    await supabase.from("therapist_profiles").update({
      is_approved: false,
      application_status: "pending",
    }).eq("id", therapist.id);
    setBusy(false);
    await onRefresh();
    onClose();
  }

  async function toggleTag(tag) {
    const next = tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag];
    setTags(next);
    await supabase.from("therapist_profiles").update({ support_tags: next }).eq("id", therapist.id);
    await onRefresh();
  }

  async function saveComment() {
    setSavingComment(true);
    await supabase.from("therapist_profiles").update({ admin_comment: comment }).eq("id", therapist.id);
    setSavingComment(false);
    await onRefresh();
  }

  async function doDelete() {
    const { error } = await supabase.from("therapist_profiles").delete().eq("id", therapist.id);
    if (error) { alert("Σφάλμα διαγραφής: " + error.message); return; }
    await onRefresh();
    onClose();
  }

  const rejectLabel = REJECT_REASONS.find(r => r.code === therapist.reject_reason_code)?.label;

  const tabStyle = (active) => ({
    padding:"9px 18px", borderRadius:8, border:"none", cursor:"pointer",
    fontSize:13, fontWeight:600, fontFamily:"inherit",
    background: active ? "#fff" : "transparent",
    color: active ? "#0F172A" : "#64748B",
    boxShadow: active ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
    display:"inline-flex", alignItems:"center", gap:6,
  });

  return (
    <>
      <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:24 }}
        onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
        <div style={{ background:"#fff", borderRadius:18, width:"100%", maxWidth:720, maxHeight:"90vh", display:"flex", flexDirection:"column", boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>

          {/* Header */}
          <div style={{ padding:"24px 28px 18px", borderBottom:"1px solid #F1F5F9", display:"flex", alignItems:"flex-start", gap:16, flexShrink:0 }}>
            <Avatar name={therapist.name} photo={therapist.photo_url} size={56}/>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                <h2 style={{ fontSize:20, fontWeight:700, color:"#0F172A", margin:0 }}>{therapist.name || "—"}</h2>
                <Badge label={st.label} bg={st.bg} color={st.color}/>
                {therapist.license_verified && (
                  <span style={{ display:"inline-flex", alignItems:"center", gap:4, background:"#F0FDF4", color:"#15803D", border:"1px solid #BBF7D0", padding:"2px 9px", borderRadius:999, fontSize:10, fontWeight:700, textTransform:"uppercase" }}>
                    <ShieldCheck size={11}/> Άδεια ελεγμένη
                  </span>
                )}
              </div>
              <div style={{ fontSize:13, color:"#64748B", marginTop:4 }}>
                {therapist.specialty || "—"}{therapist.area ? ` · ${therapist.area}` : ""}
              </div>
              <div style={{ display:"flex", gap:14, marginTop:5, flexWrap:"wrap" }}>
                {therapist.years_experience && (
                  <span style={{ fontSize:12, color:"#94A3B8" }}>{therapist.years_experience} χρόνια εμπειρία</span>
                )}
                {therapist.price_per_session && (
                  <span style={{ fontSize:12, color:"#1D4ED8", fontWeight:600, display:"inline-flex", alignItems:"center", gap:3 }}>
                    <Euro size={12}/> {therapist.price_per_session}€/συνεδρία
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#94A3B8", padding:4, display:"flex" }}>
              <X size={20}/>
            </button>
          </div>

          {/* Progress bar */}
          <div style={{ padding:"14px 28px 0", flexShrink:0 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ fontSize:12, fontWeight:700, color:"#64748B" }}>
                Έλεγχος προφίλ: {stats.done}/{stats.total} ολοκληρώθηκαν
              </span>
              <span style={{ fontSize:12, fontWeight:700, color: stats.canApprove ? "#15803D" : "#B45309" }}>
                {stats.requiredDone}/{stats.requiredTotal} υποχρεωτικά
              </span>
            </div>
            <div style={{ height:6, background:"#F1F5F9", borderRadius:3, overflow:"hidden" }}>
              <div style={{
                width: `${(stats.done / stats.total) * 100}%`,
                height:"100%",
                background: stats.canApprove ? "#15803D" : "#F59E0B",
                borderRadius:3, transition:"width .3s",
              }}/>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ padding:"14px 28px 0", flexShrink:0 }}>
            <div style={{ display:"inline-flex", gap:4, background:"#E2E8F0", padding:4, borderRadius:10 }}>
              <button onClick={()=>setTab("checklist")} style={tabStyle(tab==="checklist")}>
                <CheckCircle2 size={14}/> Έλεγχος
              </button>
              <button onClick={()=>setTab("profile")} style={tabStyle(tab==="profile")}>
                <User size={14}/> Προφίλ
              </button>
              <button onClick={()=>setTab("docs")} style={tabStyle(tab==="docs")}>
                <FileText size={14}/> Έγγραφα
              </button>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding:"20px 28px", overflowY:"auto", flex:1 }}>

            {/* ── TAB: CHECKLIST ── */}
            {tab === "checklist" && (
              <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {CHECKLIST.map(c => {
                    const ok = c.check(therapist);
                    return (
                      <div key={c.key} style={{
                        display:"flex", alignItems:"center", gap:11, padding:"11px 14px",
                        background: ok ? "#F0FDF4" : (c.required ? "#FFFBEB" : "#F8FAFC"),
                        border:`1px solid ${ok ? "#BBF7D0" : (c.required ? "#FDE68A" : "#E2E8F0")}`,
                        borderRadius:10,
                      }}>
                        {ok
                          ? <CheckCircle2 size={17} color="#15803D" strokeWidth={2.2}/>
                          : c.required
                            ? <AlertTriangle size={17} color="#B45309" strokeWidth={2.2}/>
                            : <Circle size={17} color="#CBD5E1" strokeWidth={2}/>
                        }
                        <span style={{ flex:1, fontSize:13, fontWeight: ok ? 600 : 500, color: ok ? "#065F46" : (c.required ? "#92400E" : "#64748B") }}>
                          {c.label}
                        </span>
                        {c.required && !ok && (
                          <span style={{ fontSize:10, fontWeight:700, color:"#B45309", textTransform:"uppercase" }}>Υποχρεωτικό</span>
                        )}
                        {/* Manual toggle μόνο για τον έλεγχο άδειας */}
                        {c.key === "license_ver" && hasLicense && (
                          <button onClick={toggleLicenseVerified} disabled={busy}
                            style={{ padding:"4px 12px", borderRadius:6, border:"none", background: therapist.license_verified ? "#E2E8F0" : "#15803D", color: therapist.license_verified ? "#475569" : "#fff", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                            {therapist.license_verified ? "Αναίρεση" : "Επιβεβαίωση"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Support tags */}
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8, display:"inline-flex", alignItems:"center", gap:5 }}>
                    <Tag size={12}/> Ετικέτες
                  </div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {THERAPIST_TAGS.map(t => {
                      const on = tags.includes(t);
                      return (
                        <button key={t} onClick={()=>toggleTag(t)}
                          style={{
                            padding:"5px 12px", borderRadius:999, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
                            border:`1px solid ${on ? "#1D4ED8" : "#E2E8F0"}`,
                            background: on ? "#EFF6FF" : "#fff",
                            color: on ? "#1D4ED8" : "#94A3B8",
                          }}>
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Admin comment */}
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Εσωτερική σημείωση</div>
                  <textarea value={comment} onChange={e=>setComment(e.target.value)}
                    placeholder="Σημείωση admin για αυτόν τον θεραπευτή..." rows={3}
                    style={{ width:"100%", padding:"10px 14px", border:"1px solid #E2E8F0", borderRadius:10, fontSize:13, fontFamily:"inherit", color:"#0F172A", outline:"none", resize:"vertical", boxSizing:"border-box", marginBottom:8 }}/>
                  <Btn variant="ghost" small onClick={saveComment} disabled={savingComment}>
                    {savingComment ? "Αποθήκευση..." : "Αποθήκευση σημείωσης"}
                  </Btn>
                </div>

                {/* Rejection info */}
                {status === "rejected" && (
                  <div style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:10, padding:"12px 16px" }}>
                    <div style={{ fontSize:11, fontWeight:700, color:"#BE123C", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4, display:"inline-flex", alignItems:"center", gap:5 }}>
                      <XCircle size={12}/> Λόγος Απόρριψης
                    </div>
                    <div style={{ fontSize:13, color:"#991B1B", fontWeight:600 }}>{rejectLabel || "—"}</div>
                    {therapist.admin_comment && (
                      <div style={{ fontSize:12, color:"#B91C1C", marginTop:6, fontStyle:"italic" }}>{therapist.admin_comment}</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── TAB: ΠΡΟΦΙΛ ── */}
            {tab === "profile" && (
              <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
                {therapist.bio ? (
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Βιογραφικό</div>
                    <p style={{ fontSize:14, color:"#475569", lineHeight:1.6, margin:0, background:"#F8FAFC", padding:"12px 14px", borderRadius:8, borderLeft:"3px solid #CBD5E1", whiteSpace:"pre-wrap" }}>
                      {therapist.bio}
                    </p>
                  </div>
                ) : (
                  <div style={{ fontSize:13, color:"#94A3B8", fontStyle:"italic" }}>Δεν έχει προσθέσει βιογραφικό.</div>
                )}

                {areas.length > 0 && (
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8, display:"inline-flex", alignItems:"center", gap:5 }}>
                      <MapPin size={12}/> Περιοχές Εξυπηρέτησης ({areas.length})
                    </div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                      {areas.map(a => (
                        <span key={a} style={{ background:"#EFF6FF", color:"#1D4ED8", padding:"4px 10px", borderRadius:999, fontSize:12, fontWeight:500, border:"1px solid #BFDBFE" }}>{a}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Στοιχεία Επικοινωνίας</div>
                  <div style={{ background:"#F8FAFC", borderRadius:10, padding:"6px 14px", fontSize:13, color:"#475569" }}>
                    {buildContactRows(therapist, (d) => new Date(d).toLocaleDateString("el-GR")).map(([k, v]) => (
                      <div key={k} style={{ display:"flex", padding:"8px 0", borderTop:"1px solid #E7ECF2" }}>
                        <span style={{ width:150, color:"#94A3B8", flexShrink:0 }}>{k}</span>
                        <span style={{ color:"#0F172A", fontWeight:600, wordBreak:"break-word" }}>{v}</span>
                      </div>
                    ))}
                    <div style={{ display:"flex", padding:"8px 0", borderTop:"1px solid #E7ECF2" }}>
                      <span style={{ width:150, color:"#94A3B8", flexShrink:0 }}>ID</span>
                      <code style={{ fontSize:11, background:"#fff", padding:"1px 6px", borderRadius:4 }}>{therapist.id}</code>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB: ΕΓΓΡΑΦΑ ── */}
            {tab === "docs" && (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {/* License */}
                <div style={{ display:"flex", alignItems:"center", gap:11, padding:"12px 14px", background: hasLicense ? "#F0FDF4" : "#FFFBEB", border:`1px solid ${hasLicense ? "#BBF7D0" : "#FDE68A"}`, borderRadius:10 }}>
                  {hasLicense ? <CheckCircle2 size={18} color="#15803D"/> : <AlertTriangle size={18} color="#B45309"/>}
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:"#0F172A" }}>Άδεια Ασκήσεως</div>
                    <div style={{ fontSize:11, color:"#64748B" }}>
                      {hasLicense ? (therapist.license_verified ? "Ανέβηκε · Ελεγμένη από admin" : "Ανέβηκε · Δεν έχει ελεγχθεί") : "Δεν έχει ανεβεί (υποχρεωτικό)"}
                    </div>
                  </div>
                  {hasLicense && (
                    <Btn variant="success" small onClick={()=>viewDocument(therapist.license_url)} disabled={loadingDoc===therapist.license_url}>
                      <Eye size={12}/> {loadingDoc===therapist.license_url ? "..." : "Προβολή"}
                    </Btn>
                  )}
                </div>

                {/* CV */}
                <div style={{ display:"flex", alignItems:"center", gap:11, padding:"12px 14px", background:"#F8FAFC", border:"1px solid #E2E8F0", borderRadius:10 }}>
                  {hasCv ? <CheckCircle2 size={18} color="#15803D"/> : <Circle size={18} color="#CBD5E1"/>}
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:"#0F172A" }}>Βιογραφικό (CV)</div>
                    <div style={{ fontSize:11, color:"#64748B" }}>{hasCv ? "Ανέβηκε" : "Προαιρετικό"}</div>
                  </div>
                  {hasCv && (
                    <Btn variant="primary" small onClick={()=>viewDocument(therapist.cv_url)} disabled={loadingDoc===therapist.cv_url}>
                      <Eye size={12}/> {loadingDoc===therapist.cv_url ? "..." : "Προβολή"}
                    </Btn>
                  )}
                </div>

                {/* Certifications */}
                {certs.length > 0 ? certs.map((path, idx) => (
                  <div key={path} style={{ display:"flex", alignItems:"center", gap:11, padding:"12px 14px", background:"#FAF5FF", border:"1px solid #E9D5FF", borderRadius:10 }}>
                    <Award size={18} color="#7E22CE"/>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:"#0F172A" }}>Πιστοποιητικό {idx+1}</div>
                      <div style={{ fontSize:11, color:"#64748B" }}>Ανέβηκε</div>
                    </div>
                    <button onClick={()=>viewDocument(path)} disabled={loadingDoc===path}
                      style={{ background:"#7E22CE", color:"#fff", border:"none", borderRadius:8, padding:"5px 12px", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit", display:"inline-flex", alignItems:"center", gap:5 }}>
                      <Eye size={12}/> {loadingDoc===path ? "..." : "Προβολή"}
                    </button>
                  </div>
                )) : (
                  <div style={{ display:"flex", alignItems:"center", gap:11, padding:"12px 14px", background:"#F8FAFC", border:"1px solid #E2E8F0", borderRadius:10 }}>
                    <Circle size={18} color="#CBD5E1"/>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:"#0F172A" }}>Πιστοποιητικά</div>
                      <div style={{ fontSize:11, color:"#64748B" }}>Δεν υπάρχουν (προαιρετικά)</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions footer */}
          <div style={{ padding:"16px 28px", borderTop:"1px solid #F1F5F9", display:"flex", gap:10, flexWrap:"wrap", alignItems:"center", flexShrink:0 }}>
            {!therapist.is_approved && stats.canApprove && (
              <Btn variant="success" onClick={approve} disabled={busy}>
                <CheckCircle2 size={15}/> Έγκριση
              </Btn>
            )}

            {!therapist.is_approved && !stats.canApprove && (
              <>
                <div style={{ background:"#FFFBEB", color:"#92400E", padding:"8px 14px", borderRadius:8, fontSize:12, fontWeight:600, display:"inline-flex", alignItems:"center", gap:6 }}>
                  <AlertTriangle size={14}/>
                  Λείπουν {stats.requiredTotal - stats.requiredDone} υποχρεωτικά
                </div>
                <button onClick={forceActivate} disabled={busy}
                  style={{ padding:"8px 16px", borderRadius:8, border:"1.5px solid #15803D", background:"#fff", color:"#15803D", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", display:"inline-flex", alignItems:"center", gap:6 }}>
                  <CheckCircle2 size={15}/> Ενεργοποίηση ούτως ή άλλως
                </button>
              </>
            )}

            {status !== "rejected" && (
              <Btn variant="danger" onClick={()=>setShowReject(true)} disabled={busy}>
                <XCircle size={15}/> Απόρριψη
              </Btn>
            )}

            {therapist.is_approved && (
              <Btn variant="warning" onClick={suspend} disabled={busy}>
                <Pause size={15}/> Αναστολή
              </Btn>
            )}

            <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center" }}>
              {!confirmDelete ? (
                <Btn variant="delete" small onClick={()=>setConfirmDelete(true)}>
                  <Trash2 size={13}/> Διαγραφή
                </Btn>
              ) : (
                <div style={{ display:"flex", alignItems:"center", gap:8, background:"#FEF2F2", padding:"6px 12px", borderRadius:8, border:"1px solid #FECACA" }}>
                  <span style={{ fontSize:12, color:"#DC2626", fontWeight:600 }}>Σίγουρα;</span>
                  <Btn variant="danger" small onClick={doDelete}>Ναι</Btn>
                  <Btn variant="ghost" small onClick={()=>setConfirmDelete(false)}>Όχι</Btn>
                </div>
              )}
              <Btn variant="ghost" onClick={onClose}>Κλείσιμο</Btn>
            </div>
          </div>
        </div>
      </div>

      {showReject && <RejectModal onConfirm={doReject} onClose={()=>setShowReject(false)} />}
    </>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────
export default function TherapistsPage({ hideHeader = false } = {}) {
  const [therapists, setTherapists] = useState([]);
  const [reviewStats, setReviewStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const [filter, setFilter] = useState("all");
  const [filterArea, setFilterArea] = useState("all");
  const [filterLicense, setFilterLicense] = useState("all"); // all | has | none
  const [filterComplete, setFilterComplete] = useState("all"); // all | complete | incomplete
  const [search, setSearch] = useState("");

  useEffect(() => { fetchTherapists(); }, []);

  async function fetchTherapists() {
    setLoading(true);
    const [{ data: profiles }, { data: reviews }] = await Promise.all([
      supabase.from("therapist_profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("reviews").select("therapist_id, rating").eq("is_published", true),
    ]);

    const rmap = {};
    (reviews || []).forEach(rv => {
      if (!rmap[rv.therapist_id]) rmap[rv.therapist_id] = { sum: 0, count: 0 };
      rmap[rv.therapist_id].sum += rv.rating;
      rmap[rv.therapist_id].count += 1;
    });

    setReviewStats(rmap);
    setTherapists(profiles || []);
    setLoading(false);
  }

  function getStatus(t) {
    if (t.is_approved) return "approved";
    return t.application_status || "incomplete";
  }

  const counts = {
    all:        therapists.length,
    approved:   therapists.filter(t => t.is_approved).length,
    pending:    therapists.filter(t => !t.is_approved && t.application_status === "pending").length,
    incomplete: therapists.filter(t => !t.is_approved && (!t.application_status || t.application_status === "incomplete")).length,
    rejected:   therapists.filter(t => !t.is_approved && t.application_status === "rejected").length,
  };

  const uniqueAreas = Array.from(new Set(therapists.map(t => t.area).filter(Boolean))).sort();

  const filtered = therapists.filter(t => {
    const status = getStatus(t);
    const stats = checklistStats(t);
    const matchFilter = filter === "all" || status === filter;
    const matchArea = filterArea === "all" || t.area === filterArea;
    const matchLicense =
      filterLicense === "all" ||
      (filterLicense === "has" ? !!t.license_url : !t.license_url);
    const matchComplete =
      filterComplete === "all" ||
      (filterComplete === "complete" ? stats.canApprove : !stats.canApprove);
    const matchSearch = ((t.name||"") + (t.specialty||"") + (t.area||"")).toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchArea && matchLicense && matchComplete && matchSearch;
  });

  function clearFilters() {
    setFilter("all"); setFilterArea("all"); setFilterLicense("all");
    setFilterComplete("all"); setSearch("");
  }

  // Εξαγωγή CSV — εξάγει ό,τι φαίνεται στα τρέχοντα φίλτρα
  function handleExport() {
    const columns = [
      { key: "id",           label: "ID Θεραπευτή" },
      { key: "created",      label: "Ημ. Εγγραφής" },
      { key: "name",         label: "Όνομα" },
      { key: "email",        label: "Email" },
      { key: "phone",        label: "Τηλέφωνο" },
      { key: "status",       label: "Κατάσταση" },
      { key: "specialty",    label: "Ειδικότητα" },
      { key: "area",         label: "Περιοχή" },
      { key: "serviceAreas", label: "Περιοχές Εξυπηρέτησης" },
      { key: "price",        label: "Τιμή Συνεδρίας" },
      { key: "experience",   label: "Χρόνια Εμπειρίας" },
      { key: "license",      label: "Άδεια Ανεβασμένη" },
      { key: "licenseVer",   label: "Άδεια Ελεγμένη" },
      { key: "cv",           label: "CV" },
      { key: "certs",        label: "Πιστοποιήσεις" },
      { key: "checklist",    label: "Έλεγχος Προφίλ" },
      { key: "readyApprove", label: "Έτοιμος για Έγκριση" },
      { key: "rating",       label: "Βαθμολογία" },
      { key: "reviewCount",  label: "Αξιολογήσεις" },
      { key: "rejectReason", label: "Λόγος Απόρριψης" },
      { key: "adminComment", label: "Σχόλιο Admin" },
      { key: "tags",         label: "Ετικέτες" },
    ];

    const rows = filtered.map(t => {
      const stats = checklistStats(t);
      const status = getStatus(t);
      const rv = reviewStats[t.id];
      const rejectLabel = REJECT_REASONS.find(r => r.code === t.reject_reason_code)?.label || "";
      return {
        id:           t.id,
        created:      csvDate(t.created_at),
        name:         t.name,
        email:        t.email,
        phone:        t.phone,
        status:       APP_STATUS[status]?.label || status,
        specialty:    t.specialty,
        area:         t.area,
        serviceAreas: t.service_areas || [],
        price:        t.price_per_session,
        experience:   t.years_experience,
        license:      !!t.license_url,
        licenseVer:   !!t.license_verified,
        cv:           !!t.cv_url,
        certs:        (t.certifications_urls || []).length,
        checklist:    `${stats.done}/${stats.total}`,
        readyApprove: stats.canApprove,
        rating:       rv ? (rv.sum / rv.count).toFixed(1) : "",
        reviewCount:  rv ? rv.count : 0,
        rejectReason: rejectLabel,
        adminComment: t.admin_comment,
        tags:         t.support_tags || [],
      };
    });

    exportToCsv("therapeutes", columns, rows);
  }

  const selectStyle = { padding:"8px 12px", borderRadius:8, border:"1px solid #E2E8F0", fontSize:12, fontFamily:"inherit", background:"#fff", color:"#0F172A", outline:"none", cursor:"pointer", minWidth:150 };

  if (loading) return (
    <div style={{ padding:24, display:"flex", alignItems:"center", justifyContent:"center", minHeight:400 }}>
      <div style={{ fontSize:16, color:"#64748B" }}>Φόρτωση θεραπευτών...</div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom:24, display:"flex", alignItems:"flex-start", justifyContent: hideHeader ? "flex-end" : "space-between", gap:16, flexWrap:"wrap" }}>
        {!hideHeader && (
          <div>
            <h1 style={{ fontSize:26, fontWeight:700, color:"#0F172A", margin:0 }}>Φυσιοθεραπευτές</h1>
            <p style={{ fontSize:13, color:"#94A3B8", marginTop:4 }}>Έλεγχος, έγκριση και διαχείριση θεραπευτών</p>
          </div>
        )}
        <button onClick={handleExport} disabled={filtered.length === 0}
          style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"9px 18px", borderRadius:8, border:"1px solid #E2E8F0", background:"#fff", color: filtered.length ? "#1D4ED8" : "#CBD5E1", fontSize:13, fontWeight:600, cursor: filtered.length ? "pointer" : "not-allowed", fontFamily:"inherit" }}>
          <Download size={15}/>
          Εξαγωγή CSV ({filtered.length})
        </button>
      </div>

      {/* Status filters */}
      <div style={{ display:"flex", gap:12, marginBottom:12, alignItems:"center", flexWrap:"wrap" }}>
        <div style={{ display:"flex", gap:4, background:"#E2E8F0", padding:4, borderRadius:10, flexWrap:"wrap" }}>
          {[
            ["all", "Όλοι"],
            ["pending", "Σε αναμονή"],
            ["approved", "Εγκεκριμένοι"],
            ["incomplete", "Ελλιπείς"],
            ["rejected", "Απορριφθέντες"],
          ].map(([val, label]) => (
            <button key={val} onClick={()=>setFilter(val)} style={{ padding:"6px 14px", borderRadius:7, border:"none", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", background:filter===val?"#fff":"transparent", color:filter===val?"#0F172A":"#64748B", boxShadow:filter===val?"0 1px 4px rgba(0,0,0,0.1)":"none" }}>
              {label} <span style={{ marginLeft:4, fontSize:11, color:filter===val?"#1D4ED8":"#94A3B8" }}>{counts[val]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Advanced filters */}
      <div style={{ display:"flex", gap:10, marginBottom:20, alignItems:"center", flexWrap:"wrap" }}>
        <select value={filterArea} onChange={e=>setFilterArea(e.target.value)} style={selectStyle}>
          <option value="all">Όλες οι περιοχές</option>
          {uniqueAreas.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <select value={filterLicense} onChange={e=>setFilterLicense(e.target.value)} style={selectStyle}>
          <option value="all">Άδεια: όλοι</option>
          <option value="has">Έχει ανεβάσει άδεια</option>
          <option value="none">Χωρίς άδεια</option>
        </select>

        <select value={filterComplete} onChange={e=>setFilterComplete(e.target.value)} style={selectStyle}>
          <option value="all">Προφίλ: όλα</option>
          <option value="complete">Πλήρες (έτοιμο για έγκριση)</option>
          <option value="incomplete">Ελλιπές</option>
        </select>

        <div style={{ position:"relative", flex:1, minWidth:200 }}>
          <Search size={14} color="#94A3B8" style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}/>
          <input type="text" placeholder="Αναζήτηση..." value={search} onChange={e=>setSearch(e.target.value)}
            style={{ width:"100%", padding:"9px 14px 9px 34px", borderRadius:8, border:"1px solid #E2E8F0", fontSize:13, fontFamily:"inherit", background:"#fff", outline:"none", color:"#0F172A", boxSizing:"border-box" }}/>
        </div>

        <button onClick={clearFilters}
          style={{ padding:"8px 14px", borderRadius:8, border:"1px solid #E2E8F0", background:"#fff", color:"#64748B", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", display:"inline-flex", alignItems:"center", gap:5 }}>
          <X size={13}/> Καθαρισμός
        </button>
      </div>

      {/* Pending alert */}
      {counts.pending > 0 && filter !== "pending" && (
        <div style={{ background:"#FEF3C7", border:"1px solid #FDE68A", borderRadius:10, padding:"12px 16px", marginBottom:16, display:"flex", alignItems:"center", gap:12 }}>
          <AlertTriangle size={18} color="#B45309" strokeWidth={2.2}/>
          <div style={{ flex:1, fontSize:13, color:"#92400E" }}>
            <strong>{counts.pending}</strong> {counts.pending === 1 ? "θεραπευτής περιμένει" : "θεραπευτές περιμένουν"} έγκριση
          </div>
          <Btn variant="warning" small onClick={()=>setFilter("pending")}>Δες τους</Btn>
        </div>
      )}

      {/* Results count */}
      <div style={{ fontSize:12, color:"#94A3B8", marginBottom:12, fontWeight:600 }}>
        {filtered.length} {filtered.length === 1 ? "θεραπευτής" : "θεραπευτές"}
      </div>

      {/* List */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {filtered.length === 0 ? (
          <div style={{ padding:40, textAlign:"center", color:"#94A3B8", fontSize:14, background:"#fff", borderRadius:14, border:"1px solid #E2E8F0" }}>
            {therapists.length === 0 ? "Δεν υπάρχουν θεραπευτές ακόμα." : "Δεν βρέθηκαν θεραπευτές με αυτά τα φίλτρα."}
          </div>
        ) : filtered.map(t => {
          const status = getStatus(t);
          const st = APP_STATUS[status] || APP_STATUS.incomplete;
          const stats = checklistStats(t);
          const rv = reviewStats[t.id];
          const avg = rv ? (rv.sum / rv.count) : 0;

          return (
            <div key={t.id} onClick={()=>setSelected(t)}
              style={{ background:"#fff", borderRadius:14, border:"1px solid #E2E8F0", padding:"16px 20px", display:"flex", alignItems:"center", gap:14, cursor:"pointer", transition:"all .15s" }}
              onMouseEnter={e=>{ e.currentTarget.style.background="#FAFAFA"; }}
              onMouseLeave={e=>{ e.currentTarget.style.background="#fff"; }}>

              <Avatar name={t.name} photo={t.photo_url} size={44}/>

              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:4 }}>
                  <span style={{ fontWeight:700, fontSize:15, color:"#0F172A" }}>{t.name || "—"}</span>
                  <Badge label={st.label} bg={st.bg} color={st.color}/>
                  {t.license_verified && (
                    <span style={{ display:"inline-flex", alignItems:"center", gap:3, background:"#F0FDF4", color:"#15803D", border:"1px solid #BBF7D0", padding:"2px 8px", borderRadius:999, fontSize:10, fontWeight:700, textTransform:"uppercase" }}>
                      <ShieldCheck size={10}/> Ελεγμένος
                    </span>
                  )}
                  {rv && rv.count > 0 && (
                    <span style={{ display:"inline-flex", alignItems:"center", gap:3, fontSize:12, color:"#B45309", fontWeight:600 }}>
                      <Star size={12} fill="#F59E0B" strokeWidth={0}/> {avg.toFixed(1)} ({rv.count})
                    </span>
                  )}
                </div>

                <div style={{ fontSize:12, color:"#64748B", marginBottom:8 }}>
                  {t.specialty || "Χωρίς ειδικότητα"}
                  {t.area ? ` · ${t.area}` : ""}
                  {t.price_per_session ? ` · ${t.price_per_session}€` : ""}
                  {t.years_experience ? ` · ${t.years_experience} χρ.` : ""}
                </div>

                {/* Checklist progress */}
                <div style={{ display:"flex", alignItems:"center", gap:10, maxWidth:320 }}>
                  <div style={{ flex:1, height:5, background:"#F1F5F9", borderRadius:3, overflow:"hidden" }}>
                    <div style={{
                      width: `${(stats.done / stats.total) * 100}%`, height:"100%",
                      background: stats.canApprove ? "#15803D" : "#F59E0B", borderRadius:3,
                    }}/>
                  </div>
                  <span style={{ fontSize:11, fontWeight:700, color: stats.canApprove ? "#15803D" : "#B45309", flexShrink:0 }}>
                    {stats.done}/{stats.total}
                  </span>
                </div>

                {/* Tags */}
                {(t.support_tags || []).length > 0 && (
                  <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginTop:8 }}>
                    {t.support_tags.map(tag => (
                      <span key={tag} style={{ fontSize:11, fontWeight:600, color:"#1D4ED8", background:"#EFF6FF", border:"1px solid #BFDBFE", padding:"2px 9px", borderRadius:999 }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ flexShrink:0, fontSize:11, color:"#94A3B8" }}>Έλεγχος →</div>
            </div>
          );
        })}
      </div>

      {selected && (
        <ProfileModal
          therapist={selected}
          onClose={()=>setSelected(null)}
          onRefresh={fetchTherapists}
        />
      )}
    </div>
  );
}