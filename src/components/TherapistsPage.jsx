"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  Search, Download, X, Check, AlertTriangle, CheckCircle2, XCircle,
  Star, Shield, FileText, User, MapPin, Euro, Award, Pause, Play,
  Tag, MessageSquare, Save, ExternalLink, Users, TrendingUp, Clock,
  Eye, EyeOff, GraduationCap,
} from "lucide-react";

// ─── REJECT REASONS ──────────────────────────────────────────────────────
const REJECT_REASONS = {
  no_license:              "Δεν ανέβασε άδεια ασκήσεως",
  incomplete_profile:      "Ελλιπές προφίλ",
  unacceptable_docs:       "Μη αποδεκτά στοιχεία / έγγραφα",
  area_not_priority:       "Δεν καλύπτει περιοχή προτεραιότητας",
  insufficient_experience: "Ανεπαρκής επαγγελματική εμπειρία",
  suspicious_profile:      "Ύποπτο / μη αξιόπιστο προφίλ",
  other:                   "Άλλος λόγος",
};

const THERAPIST_TAGS = [
  "Πολύ αξιόπιστος",
  "Καθυστερεί να απαντήσει",
  "Θέλει έλεγχο εγγράφων",
  "Καλή απόδοση",
  "Πολλά ακυρωμένα",
  "Νέος συνεργάτης",
  "Προτεραιότητα",
];

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

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("el-GR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—");
const jsonCount = (v) => (Array.isArray(v) ? v.length : 0);
const has = (v) => !!(v && String(v).trim());

// ─── CHECKLIST ───────────────────────────────────────────────────────────
// ΚΑΤΟΠΤΡΟ της calc_profile_completeness() στη ΒΔ.
// Η ΒΑΣΗ αποφασίζει (is_profile_complete) — εδώ δείχνουμε ΤΙ λείπει.
function buildChecklist(t) {
  const required = [
    { key: "name",        label: "Ονοματεπώνυμο",               ok: has(t.name) && t.name.trim().length > 2 },
    { key: "photo",       label: "Φωτογραφία προφίλ",           ok: has(t.photo_url) },
    { key: "license_up",  label: "Άδεια ασκήσεως ανεβασμένη",   ok: has(t.license_url) },
    { key: "license_ver", label: "Άδεια ελεγμένη από admin",    ok: !!t.license_verified },
    { key: "specialty",   label: "Ειδικότητα",                  ok: has(t.specialty) && t.specialty.trim().length > 3 },
    { key: "bio",         label: "Βιογραφικό",                  ok: has(t.bio) && t.bio.trim().length >= 30,
      detail: `${has(t.bio) ? t.bio.trim().length : 0}/30 χαρ.` },
    { key: "conditions",  label: "Παθήσεις",                    ok: (t.conditionsCount || 0) >= 3,
      detail: `${t.conditionsCount || 0}/3` },
    { key: "areas",       label: "Περιοχές εξυπηρέτησης",       ok: jsonCount(t.service_areas) >= 1 || (has(t.area) && t.area.trim().length > 2) },
    { key: "price",       label: "Τιμή συνεδρίας",              ok: Number(t.price_per_session) > 0 },
  ];

  const optional = [
    { key: "education",    label: "Σπουδές",                 ok: has(t.education_school) },
    { key: "certs",        label: "Πιστοποιήσεις",           ok: jsonCount(t.certifications_urls) >= 1 },
    { key: "cv",           label: "CV",                      ok: has(t.cv_url) },
    { key: "experience",   label: "Έτη εμπειρίας",           ok: Number(t.years_experience) > 0 },
    { key: "availability", label: "Διαθεσιμότητα",           ok: (t.availability_slots || []).length >= 1 },
    { key: "iban",         label: "IBAN",                    ok: has(t.iban) },
    { key: "terms",        label: "Αποδοχή όρων",            ok: !!t.terms_accepted_at },
  ];

  return { required, optional };
}

// ─── QUALITY SCORE (απόδοση — ΔΙΑΦΟΡΕΤΙΚΟ από completeness) ─────────────
function computeQuality(t) {
  const completeness = Math.round(((t.completeness_score || 0) / 100) * 30);
  const verified = t.license_verified ? 20 : 0;
  const completedPts = Math.min(15, Math.round(((t.completedCount || 0) / 10) * 15));
  const total = (t.completedCount || 0) + (t.cancelledCount || 0);
  const cancelRate = total > 0 ? (t.cancelledCount || 0) / total : 0;
  const cancelPts = total === 0 ? 8 : Math.round((1 - cancelRate) * 15);
  const ratingPts = t.avgRating ? Math.round((t.avgRating / 5) * 20) : 10;
  return Math.min(100, completeness + verified + completedPts + cancelPts + ratingPts);
}

function scoreColor(s) {
  if (s >= 80) return { bg: "#F0FDF4", border: "#BBF7D0", color: "#15803D", label: "Εξαιρετικός" };
  if (s >= 60) return { bg: "#EFF6FF", border: "#BFDBFE", color: "#1D4ED8", label: "Καλός" };
  if (s >= 40) return { bg: "#FFFBEB", border: "#FDE68A", color: "#B45309", label: "Μέτριος" };
  return { bg: "#FFF1F2", border: "#FECDD3", color: "#BE123C", label: "Χρειάζεται προσοχή" };
}

// ─── UI ──────────────────────────────────────────────────────────────────
function Avatar({ name, photo, size = 44 }) {
  if (photo) return <img src={photo} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "#EFF6FF", color: "#1D4ED8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.33, fontWeight: 700, flexShrink: 0 }}>
      {(name || "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
    </div>
  );
}

function Badge({ label, bg, color, Icon }) {
  return (
    <span style={{ background: bg, color, padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 4 }}>
      {Icon && <Icon size={11} strokeWidth={2.5} />}
      {label}
    </span>
  );
}

function StatusBadge({ t }) {
  if (t.is_paused) return <Badge label="Παγωμένος" bg="#E2E8F0" color="#475569" Icon={Pause} />;
  if (t.application_status === "rejected") return <Badge label="Απορρίφθηκε" bg="#FFE4E6" color="#9F1239" Icon={XCircle} />;
  if (t.is_approved) return <Badge label="Εγκεκριμένος" bg="#D1FAE5" color="#065F46" Icon={CheckCircle2} />;
  if (t.application_status === "pending") return <Badge label="Σε αναμονή" bg="#FEF3C7" color="#B45309" Icon={Clock} />;
  return <Badge label="Ελλιπής" bg="#F1F5F9" color="#64748B" Icon={AlertTriangle} />;
}

function VisibilityBadge({ t }) {
  const live = t.is_approved && t.is_profile_complete && !t.is_paused;
  if (live) return <Badge label={t.is_profile_full ? "Ορατός · Πλήρες" : "Ορατός"} bg="#F0FDF4" color="#15803D" Icon={Eye} />;
  return <Badge label="Αόρατος" bg="#FFF1F2" color="#BE123C" Icon={EyeOff} />;
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
export default function TherapistsPage() {
  const [therapists, setTherapists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [busy, setBusy] = useState(false);

  const [filter, setFilter] = useState("all");
  const [area, setArea] = useState("all");
  const [specialty, setSpecialty] = useState("all");
  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("check");
  const [comment, setComment] = useState("");
  const [docUrls, setDocUrls] = useState({ certs: [] });

  const [rejectModal, setRejectModal] = useState(false);
  const [rejectCode, setRejectCode] = useState("");
  const [rejectNote, setRejectNote] = useState("");

  useEffect(() => { init(); }, []);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    await fetchAll();
  }

  function enrich(t, condCount, reqs, rvs) {
    const isCancelled = (s) => (s || "").startsWith("cancelled");
    const myReqs = (reqs || []).filter((r) => r.therapist_id === t.id);
    const myRvs = (rvs || []).filter((r) => r.therapist_id === t.id);
    const avgRating = myRvs.length ? myRvs.reduce((s, r) => s + (r.rating || 0), 0) / myRvs.length : null;

    const base = {
      ...t,
      conditionsCount: condCount,
      requestsCount: myReqs.length,
      completedCount: myReqs.filter((r) => r.status === "completed").length,
      cancelledCount: myReqs.filter((r) => isCancelled(r.status)).length,
      reviewsCount: myRvs.length,
      avgRating,
    };

    const { required, optional } = buildChecklist(base);

    return {
      ...base,
      required,
      optional,
      missingRequired: required.filter((c) => !c.ok),
      quality: computeQuality(base),
      isLive: base.is_approved && base.is_profile_complete && !base.is_paused,
    };
  }

  async function fetchAll() {
    setLoading(true);

    const [
      { data: ths },
      { data: reqs },
      { data: rvs },
      { data: tconds },
    ] = await Promise.all([
      supabase.from("therapist_profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("session_requests").select("id, therapist_id, status"),
      supabase.from("reviews").select("id, therapist_id, rating"),
      supabase.from("therapist_conditions").select("therapist_id"),
    ]);

    const condCount = {};
    (tconds || []).forEach((c) => { condCount[c.therapist_id] = (condCount[c.therapist_id] || 0) + 1; });

    setTherapists((ths || []).map((t) => enrich(t, condCount[t.id] || 0, reqs, rvs)));
    setLoading(false);
  }

  // ─── DRAWER ────────────────────────────────────────────────────────────
  async function openTherapist(t) {
    setSelected(t);
    setTab("check");
    setComment(t.admin_comment || "");
    setDocUrls({ certs: [] });
    loadDocs(t);
  }

  async function loadDocs(t) {
    const urls = { certs: [] };
    const sign = async (path) => {
      if (!path) return null;
      if (String(path).startsWith("http")) return path;
      const { data } = await supabase.storage.from("therapist-documents").createSignedUrl(path, 3600);
      return data?.signedUrl || null;
    };
    urls.license = await sign(t.license_url);
    urls.cv = await sign(t.cv_url);
    const certs = Array.isArray(t.certifications_urls) ? t.certifications_urls : [];
    for (const c of certs) {
      const u = await sign(c);
      if (u) urls.certs.push(u);
    }
    setDocUrls(urls);
  }

  // Το is_profile_complete το υπολογίζει TRIGGER στη ΒΔ — άρα ξαναδιαβάζουμε
  async function refreshSelected(id) {
    const [{ data: fresh }, { count }, { data: reqs }, { data: rvs }] = await Promise.all([
      supabase.from("therapist_profiles").select("*").eq("id", id).maybeSingle(),
      supabase.from("therapist_conditions").select("*", { count: "exact", head: true }).eq("therapist_id", id),
      supabase.from("session_requests").select("id, therapist_id, status"),
      supabase.from("reviews").select("id, therapist_id, rating"),
    ]);
    if (fresh) setSelected(enrich(fresh, count || 0, reqs, rvs));
    await fetchAll();
  }

  async function toggleLicenseVerified() {
    setBusy(true);
    const next = !selected.license_verified;
    await supabase.from("therapist_profiles").update({
      license_verified: next,
      verified_at: next ? new Date().toISOString() : null,
      verified_by: next ? user?.id : null,
    }).eq("id", selected.id);
    await refreshSelected(selected.id);
    setBusy(false);
  }

  async function toggleTerms() {
    setBusy(true);
    await supabase.from("therapist_profiles").update({
      terms_accepted_at: selected.terms_accepted_at ? null : new Date().toISOString(),
    }).eq("id", selected.id);
    await refreshSelected(selected.id);
    setBusy(false);
  }

  // Η ΒΑΣΗ είναι η αυθεντία
  async function approve() {
    if (!selected.is_profile_complete) {
      alert(
        "Δεν μπορεί να εγκριθεί — το προφίλ είναι ελλιπές.\n\nΛείπουν:\n" +
        selected.missingRequired.map((m) => "· " + m.label + (m.detail ? ` (${m.detail})` : "")).join("\n") +
        "\n\nΑκόμα κι αν εγκρινόταν, δεν θα εμφανιζόταν στο site."
      );
      return;
    }
    if (!confirm(`Έγκριση του/της ${selected.name};\n\nΘα εμφανίζεται αμέσως δημόσια στο site.`)) return;
    setBusy(true);
    await supabase.from("therapist_profiles").update({
      is_approved: true,
      application_status: "approved",
      reject_reason_code: null,
    }).eq("id", selected.id);
    await refreshSelected(selected.id);
    setBusy(false);
  }

  async function confirmReject() {
    if (!rejectCode) { alert("Επίλεξε λόγο απόρριψης."); return; }
    setBusy(true);
    await supabase.from("therapist_profiles").update({
      is_approved: false,
      application_status: "rejected",
      reject_reason_code: rejectCode,
      admin_comment: rejectNote.trim() || selected.admin_comment || null,
    }).eq("id", selected.id);
    await refreshSelected(selected.id);
    setBusy(false);
    setRejectModal(false);
    setRejectCode("");
    setRejectNote("");
  }

  async function togglePause() {
    const pausing = !selected.is_paused;
    let reason = null;
    if (pausing) {
      reason = prompt("Λόγος προσωρινού παγώματος:");
      if (reason === null) return;
      if (!reason.trim()) { alert("Χρειάζεται λόγος."); return; }
    } else {
      if (!confirm("Επανενεργοποίηση θεραπευτή;")) return;
    }
    setBusy(true);
    await supabase.from("therapist_profiles").update({
      is_paused: pausing,
      paused_reason: pausing ? reason.trim() : null,
    }).eq("id", selected.id);
    await refreshSelected(selected.id);
    setBusy(false);
  }

  async function toggleTag(tag) {
    const current = selected.support_tags || [];
    const next = current.includes(tag) ? current.filter((x) => x !== tag) : [...current, tag];
    setBusy(true);
    await supabase.from("therapist_profiles").update({ support_tags: next }).eq("id", selected.id);
    await refreshSelected(selected.id);
    setBusy(false);
  }

  async function saveComment() {
    setBusy(true);
    await supabase.from("therapist_profiles").update({ admin_comment: comment.trim() || null }).eq("id", selected.id);
    await refreshSelected(selected.id);
    setBusy(false);
    alert("Η σημείωση αποθηκεύτηκε.");
  }

  async function saveQuality() {
    setBusy(true);
    await supabase.from("therapist_profiles").update({ quality_score: selected.quality }).eq("id", selected.id);
    await refreshSelected(selected.id);
    setBusy(false);
    alert("Το quality score αποθηκεύτηκε.");
  }

  // ─── FILTERS ───────────────────────────────────────────────────────────
  const areas = [...new Set(therapists.map((t) => t.area).filter(Boolean))].sort((a, b) => a.localeCompare(b, "el"));
  const specialties = [...new Set(therapists.map((t) => t.specialty).filter(Boolean))].sort((a, b) => a.localeCompare(b, "el"));

  function category(t) {
    if (t.is_paused) return "paused";
    if (t.application_status === "rejected") return "rejected";
    if (t.is_approved && !t.is_profile_complete) return "approved_invisible";
    if (t.is_approved) return "live";
    if (t.application_status === "pending") return "pending";
    return "incomplete";
  }

  const counts = {
    all: therapists.length,
    live: therapists.filter((t) => category(t) === "live").length,
    approved_invisible: therapists.filter((t) => category(t) === "approved_invisible").length,
    pending: therapists.filter((t) => category(t) === "pending").length,
    incomplete: therapists.filter((t) => category(t) === "incomplete").length,
    rejected: therapists.filter((t) => category(t) === "rejected").length,
    paused: therapists.filter((t) => category(t) === "paused").length,
  };

  const filtered = therapists.filter((t) => {
    if (filter !== "all" && category(t) !== filter) return false;
    if (area !== "all" && t.area !== area) return false;
    if (specialty !== "all" && t.specialty !== specialty) return false;
    if (search.trim()) {
      const hay = `${t.name || ""} ${t.email || ""} ${t.phone || ""} ${t.area || ""} ${t.specialty || ""}`.toLowerCase();
      if (!hay.includes(search.trim().toLowerCase())) return false;
    }
    return true;
  }).sort((a, b) => {
    const rank = (t) => (category(t) === "approved_invisible" ? 2 : category(t) === "pending" ? 1 : 0);
    return rank(b) - rank(a) || b.quality - a.quality;
  });

  const liveCount = therapists.filter((t) => t.isLive).length;
  const fullCount = therapists.filter((t) => t.is_profile_full).length;
  const avgQuality = therapists.length
    ? Math.round(therapists.reduce((s, t) => s + t.quality, 0) / therapists.length)
    : 0;

  function handleExport() {
    exportCsv(
      `physiohome-therapeutes-${new Date().toISOString().slice(0, 10)}.csv`,
      filtered.map((t) => ({
        Όνομα: t.name || "",
        Email: t.email || "",
        Τηλέφωνο: t.phone || "",
        Ειδικότητα: t.specialty || "",
        Περιοχή: t.area || "",
        Τιμή: t.price_per_session || "",
        Κατάσταση: category(t),
        Ορατός: t.isLive ? "ΝΑΙ" : "ΟΧΙ",
        Πλήρες: t.is_profile_full ? "ΝΑΙ" : "ΟΧΙ",
        Πληρότητα: `${t.completeness_score || 0}%`,
        Quality: t.quality,
        Άδεια_ελεγμένη: t.license_verified ? "ΝΑΙ" : "ΟΧΙ",
        Σπουδές: t.education_school || "",
        Παθήσεις: t.conditionsCount,
        Bio_χαρακτήρες: t.bio ? t.bio.length : 0,
        IBAN: t.iban || "",
        Αιτήματα: t.requestsCount,
        Ολοκληρωμένα: t.completedCount,
        Ακυρώσεις: t.cancelledCount,
        Αξιολογήσεις: t.reviewsCount,
        Μ_Ο_βαθμολογίας: t.avgRating ? t.avgRating.toFixed(1) : "",
        Τι_λείπει: t.missingRequired.map((m) => m.label).join(" | "),
        Εγγραφή: fmtDate(t.created_at),
      }))
    );
  }

  const selectStyle = { padding: "9px 12px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, fontFamily: "inherit", background: "#fff", color: "#0F172A", outline: "none", cursor: "pointer" };

  if (loading) {
    return (
      <div style={{ padding: 24, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <div style={{ fontSize: 16, color: "#64748B" }}>Φόρτωση θεραπευτών...</div>
      </div>
    );
  }

  return (
    <div>
      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0F172A", margin: 0 }}>Θεραπευτές</h1>
          <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>Έλεγχος, έγκριση και ορατότητα στο site</p>
        </div>
        <button onClick={handleExport}
          style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid #E2E8F0", background: "#fff", color: "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Download size={14} /> Εξαγωγή CSV ({filtered.length})
        </button>
      </div>

      {/* ALERT: εγκεκριμένοι αλλά αόρατοι */}
      {counts.approved_invisible > 0 && (
        <div style={{ background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: 12, padding: "14px 18px", marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}>
          <EyeOff size={20} color="#BE123C" strokeWidth={2.2} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#9F1239" }}>
              {counts.approved_invisible} εγκεκριμένοι θεραπευτές ΔΕΝ εμφανίζονται στο site
            </div>
            <div style={{ fontSize: 12, color: "#9F1239", opacity: 0.85, marginTop: 2 }}>
              Το προφίλ τους είναι ελλιπές. Νομίζουν ότι είναι ενεργοί, αλλά κανείς δεν τους βλέπει.
            </div>
          </div>
          <button onClick={() => setFilter("approved_invisible")}
            style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#BE123C", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
            Δες τους
          </button>
        </div>
      )}

      {/* ALERT: σε αναμονή */}
      {counts.pending > 0 && (
        <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12, padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <Clock size={20} color="#B45309" strokeWidth={2.2} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#92400E" }}>
              {counts.pending} θεραπευτές περιμένουν έγκριση
            </div>
            <div style={{ fontSize: 12, color: "#92400E", opacity: 0.85, marginTop: 2 }}>
              Κάθε μέρα καθυστέρησης είναι μέρα που δεν δέχονται περιστατικά.
            </div>
          </div>
          <button onClick={() => setFilter("pending")}
            style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#B45309", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
            Δες τους
          </button>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <StatCard Icon={Users}      label="Σύνολο"          value={counts.all}                sub="εγγεγραμμένοι"     bg="#F8FAFC" border="#E2E8F0" text="#475569" />
        <StatCard Icon={Eye}        label="Ορατοί στο site" value={liveCount}                 sub="δέχονται αιτήματα" bg="#F0FDF4" border="#BBF7D0" text="#15803D" />
        <StatCard Icon={EyeOff}     label="Εγκ. & αόρατοι"  value={counts.approved_invisible} sub="ελλιπές προφίλ"    bg="#FFF1F2" border="#FECDD3" text="#BE123C" />
        <StatCard Icon={Clock}      label="Σε αναμονή"      value={counts.pending}            sub="θέλουν έλεγχο"     bg="#FFFBEB" border="#FDE68A" text="#B45309" />
        <StatCard Icon={Award}      label="Πλήρη προφίλ"    value={fullCount}                 sub="ranking boost"     bg="#EEF2FF" border="#C7D2FE" text="#4338CA" />
        <StatCard Icon={TrendingUp} label="Μ.Ο. Quality"    value={avgQuality}                sub="ποιότητα δικτύου"  bg="#EFF6FF" border="#BFDBFE" text="#1D4ED8" />
      </div>

      {/* FILTERS */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 4, background: "#E2E8F0", padding: 4, borderRadius: 10, flexWrap: "wrap" }}>
          {[
            ["all", "Όλοι"],
            ["live", "Ορατοί"],
            ["approved_invisible", "Εγκ. & αόρατοι"],
            ["pending", "Σε αναμονή"],
            ["incomplete", "Ελλιπείς"],
            ["rejected", "Απορριφθέντες"],
            ["paused", "Παγωμένοι"],
          ].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)}
              style={{ padding: "6px 12px", borderRadius: 7, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: filter === val ? "#fff" : "transparent", color: filter === val ? "#0F172A" : "#64748B", boxShadow: filter === val ? "0 1px 4px rgba(0,0,0,0.1)" : "none" }}>
              {label} <span style={{ marginLeft: 3, fontSize: 11, color: filter === val ? "#1D4ED8" : "#94A3B8" }}>{counts[val]}</span>
            </button>
          ))}
        </div>

        <select value={area} onChange={(e) => setArea(e.target.value)} style={selectStyle}>
          <option value="all">Όλες οι περιοχές</option>
          {areas.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>

        <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} style={selectStyle}>
          <option value="all">Όλες οι ειδικότητες</option>
          {specialties.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <div style={{ flex: 1, minWidth: 200, display: "flex", alignItems: "center", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, padding: "0 14px" }}>
          <Search size={14} color="#94A3B8" />
          <input type="text" placeholder="Αναζήτηση ονόματος, email, ειδικότητας..." value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, padding: "9px 10px", border: "none", fontSize: 13, fontFamily: "inherit", background: "transparent", outline: "none", color: "#0F172A" }} />
        </div>
      </div>

      {/* LIST */}
      {filtered.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0", padding: 48, textAlign: "center" }}>
          <Users size={32} color="#CBD5E1" style={{ margin: "0 auto 12px" }} />
          <div style={{ fontSize: 14, color: "#94A3B8" }}>Δεν βρέθηκαν θεραπευτές με αυτά τα φίλτρα.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((t) => {
            const sc = scoreColor(t.quality);
            const alarming = category(t) === "approved_invisible";

            return (
              <div key={t.id} onClick={() => openTherapist(t)}
                style={{ background: "#fff", borderRadius: 14, border: `1px solid ${alarming ? "#FECDD3" : "#E2E8F0"}`, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>

                <Avatar name={t.name} photo={t.photo_url} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: "#0F172A" }}>{t.name || "Χωρίς όνομα"}</span>
                    <VisibilityBadge t={t} />
                    <StatusBadge t={t} />
                  </div>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 3, display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {t.specialty && <span>{t.specialty}</span>}
                    {t.area && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><MapPin size={11} /> {t.area}</span>}
                    {t.price_per_session > 0 && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Euro size={11} /> {t.price_per_session}€</span>}
                  </div>

                  {t.missingRequired.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 7 }}>
                      {t.missingRequired.slice(0, 4).map((m) => (
                        <span key={m.key} style={{ fontSize: 11, color: "#BE123C", background: "#FFF1F2", border: "1px solid #FECDD3", padding: "2px 8px", borderRadius: 999, fontWeight: 600 }}>
                          {m.label}{m.detail ? ` ${m.detail}` : ""}
                        </span>
                      ))}
                      {t.missingRequired.length > 4 && (
                        <span style={{ fontSize: 11, color: "#94A3B8" }}>+{t.missingRequired.length - 4}</span>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: 18, alignItems: "center", flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <div style={{ textAlign: "center", minWidth: 54 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: t.is_profile_complete ? "#15803D" : "#BE123C" }}>
                      {t.completeness_score || 0}%
                    </div>
                    <div style={{ fontSize: 11, color: "#94A3B8" }}>πληρότητα</div>
                  </div>
                  <div style={{ textAlign: "center", minWidth: 50 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#0F172A" }}>{t.completedCount}</div>
                    <div style={{ fontSize: 11, color: "#94A3B8" }}>συνεδρίες</div>
                  </div>
                  <div style={{ textAlign: "center", minWidth: 50 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#B45309", display: "inline-flex", alignItems: "center", gap: 3 }}>
                      {t.avgRating ? <><Star size={12} fill="#F59E0B" color="#F59E0B" /> {t.avgRating.toFixed(1)}</> : "—"}
                    </div>
                    <div style={{ fontSize: 11, color: "#94A3B8" }}>{t.reviewsCount} reviews</div>
                  </div>

                  <div style={{ background: sc.bg, border: `1px solid ${sc.border}`, borderRadius: 10, padding: "8px 14px", textAlign: "center", minWidth: 66 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: sc.color, lineHeight: 1 }}>{t.quality}</div>
                    <div style={{ fontSize: 10, color: sc.color, opacity: 0.8, marginTop: 3 }}>quality</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ DRAWER ═══ */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", justifyContent: "flex-end", zIndex: 1000 }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div style={{ background: "#F8FAFC", width: "100%", maxWidth: 720, height: "100%", overflowY: "auto", boxShadow: "-8px 0 40px rgba(0,0,0,0.15)" }}>

            <div style={{ background: "#fff", padding: "20px 24px", borderBottom: "1px solid #E2E8F0", position: "sticky", top: 0, zIndex: 5 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <Avatar name={selected.name} photo={selected.photo_url} size={56} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0F172A", margin: 0 }}>{selected.name || "Χωρίς όνομα"}</h2>
                    <VisibilityBadge t={selected} />
                    <StatusBadge t={selected} />
                  </div>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>
                    {selected.specialty || "Χωρίς ειδικότητα"}{selected.area ? ` · ${selected.area}` : ""}
                  </div>
                </div>
                <div style={{ textAlign: "center", background: scoreColor(selected.quality).bg, border: `1px solid ${scoreColor(selected.quality).border}`, borderRadius: 12, padding: "10px 16px" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: scoreColor(selected.quality).color, lineHeight: 1 }}>{selected.quality}</div>
                  <div style={{ fontSize: 10, color: scoreColor(selected.quality).color, marginTop: 3 }}>{scoreColor(selected.quality).label}</div>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94A3B8", padding: 4 }}>
                  <X size={22} />
                </button>
              </div>

              {!selected.isLive && (
                <div style={{ marginTop: 12, padding: "10px 14px", background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: 8, fontSize: 12, color: "#9F1239", display: "flex", alignItems: "center", gap: 7 }}>
                  <EyeOff size={14} strokeWidth={2.2} style={{ flexShrink: 0 }} />
                  <span>
                    <strong>Δεν εμφανίζεται στο site.</strong>{" "}
                    {selected.is_paused
                      ? "Είναι προσωρινά παγωμένος."
                      : !selected.is_approved
                        ? "Δεν έχει εγκριθεί ακόμα."
                        : `Το προφίλ είναι ελλιπές (λείπουν ${selected.missingRequired.length}).`}
                  </span>
                </div>
              )}

              {selected.is_paused && selected.paused_reason && (
                <div style={{ marginTop: 8, padding: "10px 14px", background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12, color: "#475569" }}>
                  <strong>Λόγος παγώματος:</strong> {selected.paused_reason}
                </div>
              )}
              {selected.application_status === "rejected" && selected.reject_reason_code && (
                <div style={{ marginTop: 8, padding: "10px 14px", background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: 8, fontSize: 12, color: "#9F1239" }}>
                  <strong>Απορρίφθηκε:</strong> {REJECT_REASONS[selected.reject_reason_code] || selected.reject_reason_code}
                </div>
              )}

              <div style={{ display: "flex", gap: 4, background: "#E2E8F0", padding: 4, borderRadius: 10, marginTop: 16 }}>
                {[["check", "Έλεγχος"], ["profile", "Προφίλ"], ["docs", "Έγγραφα"]].map(([val, label]) => (
                  <button key={val} onClick={() => setTab(val)}
                    style={{ flex: 1, padding: "8px 14px", borderRadius: 7, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: tab === val ? "#fff" : "transparent", color: tab === val ? "#0F172A" : "#64748B", boxShadow: tab === val ? "0 1px 4px rgba(0,0,0,0.1)" : "none" }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ padding: 24 }}>

              {/* ── TAB: CHECK ── */}
              {tab === "check" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                  <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                      <Shield size={15} color="#1D4ED8" />
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>Υποχρεωτικά για δημόσια εμφάνιση</span>
                      <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: selected.is_profile_complete ? "#15803D" : "#BE123C" }}>
                        {selected.required.filter((c) => c.ok).length}/{selected.required.length}
                      </span>
                    </div>

                    {selected.required.map((c) => (
                      <div key={c.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: "1px solid #F1F5F9" }}>
                        <div style={{ width: 20, height: 20, borderRadius: "50%", background: c.ok ? "#D1FAE5" : "#FFE4E6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {c.ok ? <Check size={12} color="#065F46" strokeWidth={3} /> : <X size={12} color="#9F1239" strokeWidth={3} />}
                        </div>
                        <span style={{ fontSize: 13, color: c.ok ? "#0F172A" : "#64748B", fontWeight: 600, flex: 1 }}>
                          {c.label}
                          {c.detail && (
                            <span style={{ marginLeft: 7, fontSize: 12, fontWeight: 700, color: c.ok ? "#15803D" : "#BE123C" }}>
                              {c.detail}
                            </span>
                          )}
                        </span>

                        {c.key === "license_ver" && (
                          <button onClick={toggleLicenseVerified} disabled={busy || !selected.license_url}
                            title={!selected.license_url ? "Πρέπει πρώτα να ανεβάσει άδεια" : ""}
                            style={{ padding: "4px 12px", borderRadius: 6, border: `1px solid ${c.ok ? "#E2E8F0" : "#BFDBFE"}`, background: c.ok ? "transparent" : "#EFF6FF", color: !selected.license_url ? "#CBD5E1" : (c.ok ? "#94A3B8" : "#1D4ED8"), fontSize: 11, fontWeight: 600, cursor: busy || !selected.license_url ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                            {c.ok ? "Αναίρεση" : "Επιβεβαίωση"}
                          </button>
                        )}
                      </div>
                    ))}

                    {selected.license_verified && selected.verified_at && (
                      <div style={{ marginTop: 12, fontSize: 11, color: "#94A3B8" }}>
                        Άδεια ελέγχθηκε: {fmtDate(selected.verified_at)}
                      </div>
                    )}
                  </div>

                  <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <Award size={15} color="#4338CA" />
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>Προαιρετικά — badge «Πλήρες προφίλ»</span>
                      <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: selected.is_profile_full ? "#4338CA" : "#94A3B8" }}>
                        {selected.optional.filter((c) => c.ok).length}/{selected.optional.length}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 12 }}>
                      Χρειάζονται 4 από τα 7 για badge και ranking boost.
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                      {selected.optional.map((c) => (
                        <span key={c.key} style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          padding: "6px 12px", borderRadius: 30,
                          border: `1px solid ${c.ok ? "#BBF7D0" : "#E2E8F0"}`,
                          background: c.ok ? "#F0FDF4" : "#F8FAFC",
                          color: c.ok ? "#15803D" : "#94A3B8",
                          fontSize: 12, fontWeight: 600,
                        }}>
                          {c.ok ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={2.5} />}
                          {c.label}
                        </span>
                      ))}
                    </div>
                    {!selected.terms_accepted_at && (
                      <button onClick={toggleTerms} disabled={busy}
                        style={{ marginTop: 12, padding: "6px 14px", borderRadius: 6, border: "1px solid #BFDBFE", background: "#EFF6FF", color: "#1D4ED8", fontSize: 11, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                        Καταγραφή αποδοχής όρων
                      </button>
                    )}
                  </div>

                  <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                      <TrendingUp size={15} color="#1D4ED8" />
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>Quality Score: {selected.quality}/100</span>
                      <button onClick={saveQuality} disabled={busy}
                        style={{ marginLeft: "auto", padding: "4px 12px", borderRadius: 6, border: "1px solid #E2E8F0", background: "transparent", color: "#64748B", fontSize: 11, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                        Αποθήκευση στη ΒΔ
                      </button>
                    </div>
                    {[
                      ["Πληρότητα προφίλ", `${selected.completeness_score || 0}%`, 30],
                      ["Επαληθευμένη άδεια", selected.license_verified ? "Ναι" : "Όχι", 20],
                      ["Ολοκληρωμένες συνεδρίες", selected.completedCount, 15],
                      ["Χαμηλές ακυρώσεις", `${selected.cancelledCount} ακυρώσεις`, 15],
                      ["Μέση βαθμολογία", selected.avgRating ? selected.avgRating.toFixed(1) : "—", 20],
                    ].map(([label, val, max]) => (
                      <div key={label} style={{ display: "flex", padding: "8px 0", borderTop: "1px solid #F1F5F9", fontSize: 13 }}>
                        <span style={{ flex: 1, color: "#64748B" }}>{label}</span>
                        <span style={{ color: "#0F172A", fontWeight: 600, marginRight: 10 }}>{val}</span>
                        <span style={{ color: "#CBD5E1", fontSize: 11 }}>max {max}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                      <Tag size={14} color="#1D4ED8" /> Support Tags
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {THERAPIST_TAGS.map((tg) => {
                        const on = (selected.support_tags || []).includes(tg);
                        return (
                          <button key={tg} onClick={() => toggleTag(tg)} disabled={busy}
                            style={{ padding: "6px 14px", borderRadius: 30, border: `1px solid ${on ? "#1D4ED8" : "#E2E8F0"}`, background: on ? "#EFF6FF" : "#fff", color: on ? "#1D4ED8" : "#64748B", fontSize: 12, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                            {tg}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                      <MessageSquare size={14} color="#1D4ED8" /> Σημείωση admin
                    </div>
                    <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3}
                      placeholder="π.χ. Τηλεφωνήθηκε, θα ανεβάσει άδεια μέχρι Παρασκευή."
                      style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none", color: "#0F172A", resize: "vertical", boxSizing: "border-box" }} />
                    <button onClick={saveComment} disabled={busy}
                      style={{ marginTop: 10, padding: "8px 18px", borderRadius: 8, border: "none", background: busy ? "#94A3B8" : "#1D4ED8", color: "#fff", fontSize: 12, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <Save size={13} /> Αποθήκευση
                    </button>
                  </div>

                  <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 14 }}>Ενέργειες</div>

                    {!selected.is_profile_complete && (
                      <div style={{ padding: "12px 16px", background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: 10, marginBottom: 14 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#9F1239", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
                          <AlertTriangle size={12} /> Δεν μπορεί να εμφανιστεί δημόσια — λείπουν:
                        </div>
                        {selected.missingRequired.map((m) => (
                          <div key={m.key} style={{ fontSize: 12, color: "#9F1239", paddingLeft: 17 }}>
                            · {m.label}{m.detail ? ` (${m.detail})` : ""}
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {!selected.is_approved && (
                        <button onClick={approve} disabled={busy || !selected.is_profile_complete}
                          title={!selected.is_profile_complete ? "Το προφίλ είναι ελλιπές" : ""}
                          style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: busy || !selected.is_profile_complete ? "#CBD5E1" : "#15803D", color: "#fff", fontSize: 13, fontWeight: 600, cursor: busy || !selected.is_profile_complete ? "not-allowed" : "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <CheckCircle2 size={14} /> Έγκριση
                        </button>
                      )}

                      {selected.application_status !== "rejected" && (
                        <button onClick={() => setRejectModal(true)} disabled={busy}
                          style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #FECDD3", background: "#FFF1F2", color: "#BE123C", fontSize: 13, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <XCircle size={14} /> Απόρριψη
                        </button>
                      )}

                      <button onClick={togglePause} disabled={busy}
                        style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #E2E8F0", background: "transparent", color: "#475569", fontSize: 13, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}>
                        {selected.is_paused ? <><Play size={14} /> Επανενεργοποίηση</> : <><Pause size={14} /> Προσωρινό πάγωμα</>}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB: PROFILE ── */}
              {tab === "profile" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {[
                      { label: "Αιτήματα", value: selected.requestsCount, color: "#0F172A" },
                      { label: "Ολοκληρωμένα", value: selected.completedCount, color: "#15803D" },
                      { label: "Ακυρώσεις", value: selected.cancelledCount, color: selected.cancelledCount > 0 ? "#BE123C" : "#94A3B8" },
                      { label: "Βαθμολογία", value: selected.avgRating ? selected.avgRating.toFixed(1) : "—", color: "#B45309" },
                    ].map((s) => (
                      <div key={s.label} style={{ flex: 1, minWidth: 110, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "14px 16px" }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                        <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                      <User size={14} color="#1D4ED8" /> Στοιχεία προφίλ
                    </div>
                    {[
                      ["Email", selected.email],
                      ["Τηλέφωνο", selected.phone],
                      ["Ειδικότητα", selected.specialty],
                      ["Κύρια περιοχή", selected.area],
                      ["Περιοχές εξυπηρέτησης", Array.isArray(selected.service_areas) ? selected.service_areas.join(", ") : ""],
                      ["Τιμή συνεδρίας", selected.price_per_session ? `${selected.price_per_session}€` : ""],
                      ["Έτη εμπειρίας", selected.years_experience],
                      ["Σπουδές", selected.education_school ? `${selected.education_school}${selected.education_year ? ` (${selected.education_year})` : ""}` : ""],
                      ["Πτυχίο", selected.education_degree],
                      ["Παθήσεις", selected.conditionsCount ? `${selected.conditionsCount} καταχωρημένες` : ""],
                      ["Διαθεσιμότητα", (selected.availability_slots || []).join(", ")],
                      ["Χρόνος απόκρισης", selected.response_time_hours ? `${selected.response_time_hours} ώρες` : ""],
                      ["IBAN", selected.iban],
                      ["Δικαιούχος", selected.payout_name],
                      ["Αποδοχή όρων", selected.terms_accepted_at ? fmtDate(selected.terms_accepted_at) : ""],
                      ["Εγγραφή", fmtDate(selected.created_at)],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: "flex", padding: "8px 0", borderTop: "1px solid #F1F5F9", fontSize: 13 }}>
                        <span style={{ width: 175, color: "#94A3B8", flexShrink: 0 }}>{k}</span>
                        <span style={{ color: v ? "#0F172A" : "#CBD5E1", fontWeight: v ? 600 : 400, wordBreak: "break-word" }}>{v || "—"}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                      Βιογραφικό (bio)
                      <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: (selected.bio || "").length >= 30 ? "#15803D" : "#BE123C" }}>
                        {(selected.bio || "").length}/30 χαρακτήρες
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: selected.bio ? "#475569" : "#CBD5E1", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                      {selected.bio || "Δεν έχει συμπληρωθεί bio."}
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB: DOCS ── */}
              {tab === "docs" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {[
                    { key: "license", label: "Άδεια ασκήσεως επαγγέλματος", url: docUrls.license, required: true },
                    { key: "cv", label: "Βιογραφικό (CV)", url: docUrls.cv },
                  ].map((d) => (
                    <div key={d.key} style={{ background: "#fff", border: `1px solid ${!d.url && d.required ? "#FECDD3" : "#E2E8F0"}`, borderRadius: 14, padding: 20 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <FileText size={16} color={d.url ? "#1D4ED8" : "#CBD5E1"} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{d.label}</div>
                          <div style={{ fontSize: 11, color: d.url ? "#15803D" : "#BE123C", marginTop: 2 }}>
                            {d.url ? "Ανεβασμένο" : "Δεν έχει ανεβεί"}
                          </div>
                        </div>
                        {d.url && (
                          <a href={d.url} target="_blank" rel="noreferrer"
                            style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #BFDBFE", background: "#EFF6FF", color: "#1D4ED8", fontSize: 12, fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <ExternalLink size={13} /> Άνοιγμα
                          </a>
                        )}
                      </div>
                    </div>
                  ))}

                  <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                      <Award size={14} color="#1D4ED8" /> Πιστοποιήσεις ({(docUrls.certs || []).length})
                    </div>
                    {(docUrls.certs || []).length === 0 ? (
                      <div style={{ fontSize: 13, color: "#CBD5E1" }}>Δεν έχουν ανεβεί πιστοποιήσεις.</div>
                    ) : (
                      (docUrls.certs || []).map((u, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: "1px solid #F1F5F9" }}>
                          <FileText size={14} color="#94A3B8" />
                          <span style={{ flex: 1, fontSize: 13, color: "#475569" }}>Πιστοποίηση {i + 1}</span>
                          <a href={u} target="_blank" rel="noreferrer"
                            style={{ fontSize: 12, color: "#1D4ED8", fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <ExternalLink size={12} /> Άνοιγμα
                          </a>
                        </div>
                      ))
                    )}
                  </div>

                  {selected.education_school && (
                    <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 20 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                        <GraduationCap size={14} color="#1D4ED8" /> Σπουδές
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>
                        {selected.education_degree || "Πτυχίο Φυσικοθεραπείας"}
                      </div>
                      <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
                        {selected.education_school}
                        {selected.education_year ? ` · ${selected.education_year}` : ""}
                      </div>
                    </div>
                  )}

                  <div style={{ fontSize: 11, color: "#94A3B8", textAlign: "center" }}>
                    Οι σύνδεσμοι είναι προσωρινοί (1 ώρα) και ασφαλείς.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ REJECT MODAL ═══ */}
      {rejectModal && selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: 24 }}
          onClick={(e) => { if (e.target === e.currentTarget) setRejectModal(false); }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 30, maxWidth: 480, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ width: 54, height: 54, borderRadius: "50%", background: "#FFF1F2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
              <XCircle size={26} color="#BE123C" strokeWidth={2.2} />
            </div>
            <h2 style={{ fontSize: 19, fontWeight: 700, color: "#0F172A", marginBottom: 8, textAlign: "center" }}>
              Απόρριψη θεραπευτή
            </h2>
            <p style={{ fontSize: 13, color: "#64748B", marginBottom: 20, textAlign: "center" }}>
              {selected.name} — ο λόγος καταγράφεται για audit.
            </p>

            <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>
              Λόγος <span style={{ color: "#BE123C" }}>*</span>
            </label>
            <select value={rejectCode} onChange={(e) => setRejectCode(e.target.value)}
              style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none", color: "#0F172A", marginBottom: 16, boxSizing: "border-box", cursor: "pointer" }}>
              <option value="">— Επίλεξε λόγο —</option>
              {Object.entries(REJECT_REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>

            <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>
              Σχόλιο (προαιρετικό)
            </label>
            <textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} rows={3}
              placeholder="Λεπτομέρειες για τυχόν email προς τον θεραπευτή."
              style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none", color: "#0F172A", resize: "vertical", marginBottom: 20, boxSizing: "border-box" }} />

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setRejectModal(false)} disabled={busy}
                style={{ flex: 1, padding: "12px", borderRadius: 30, border: "1px solid #E2E8F0", background: "transparent", color: "#64748B", fontSize: 14, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                Ακύρωση
              </button>
              <button onClick={confirmReject} disabled={busy || !rejectCode}
                style={{ flex: 2, padding: "12px", borderRadius: 30, border: "none", background: busy || !rejectCode ? "#94A3B8" : "#BE123C", color: "#fff", fontSize: 14, fontWeight: 600, cursor: busy || !rejectCode ? "not-allowed" : "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <XCircle size={14} />
                {busy ? "Απόρριψη..." : "Απόρριψη"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}