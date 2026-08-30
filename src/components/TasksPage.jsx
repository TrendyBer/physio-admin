"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  AlertTriangle, UserX, UserCheck, CreditCard, Star, CalendarX,
  FileWarning, CheckCircle2, ArrowRight, RefreshCw, Banknote, ShieldAlert,
  UserPlus, EyeOff, MessageSquare, Inbox, BellOff, Phone,
} from "lucide-react";

// Καταστάσεις πληρωμής που θεωρούνται "εισπραγμένες"
const COLLECTED = ["paid", "pending_payout", "paid_out"];

const CATEGORY_LABEL = {
  no_show: "Δεν εμφανίστηκε", late: "Καθυστέρηση", behaviour: "Συμπεριφορά",
  quality: "Ποιότητα", payment: "Πληρωμή", safety: "Ασφάλεια",
  wrong_address: "Λάθος διεύθυνση", other: "Άλλο",
};

const isCancelled = (s) => (s || "").startsWith("cancelled");

// ─── ΤΑ 9 ΥΠΟΧΡΕΩΤΙΚΑ ΤΗΣ ΒΑΣΗΣ ─────────────────────────────────────────
// ΠΡΕΠΕΙ να συμφωνούν με την calc_profile_completeness(). Αν αποκλίνουν,
// το admin δείχνει «όλα εντάξει» ενώ ο θεραπευτής μένει κρυφός στο site.
function missingRequired(t, condCount) {
  const m = [];
  if (!t.name || t.name.trim().length <= 2) m.push("Ονοματεπώνυμο");
  if (!t.photo_url) m.push("Φωτογραφία");
  if (!t.license_url) m.push("Άδεια ασκήσεως");
  if (!t.license_verified) m.push("Έλεγχος άδειας");
  if (!t.specialty || t.specialty.trim().length <= 3) m.push("Ειδικότητα");
  if (!t.bio || t.bio.trim().length < 30) m.push("Βιογραφικό 30+");
  if ((condCount || 0) < 3) m.push("Παθήσεις (3+)");
  const hasArea = (t.area && t.area.trim().length > 2) ||
    (Array.isArray(t.service_areas) && t.service_areas.length > 0);
  if (!hasArea) m.push("Περιοχές");
  if (!(Number(t.price_per_session) > 0)) m.push("Τιμή συνεδρίας");
  return m;
}

// Πραγματική δημόσια ορατότητα — ίδια λογική με το v_public_therapists
function isPubliclyVisible(t) {
  return !!t.is_approved
    && !t.is_paused
    && (!!t.is_profile_complete || !!t.admin_visibility_override);
}

// ─── ΟΡΙΣΜΟΙ TASK GROUPS ────────────────────────────────────────────────
const GROUPS = [
  {
    // ΠΡΩΤΟ ΣΤΗ ΛΙΣΤΑ.
    // Ένα θέμα ασφάλειας δεν περιμένει πίσω από ημιτελείς εγγραφές.
    id: "urgent_issues",
    label: "Επείγουσες αναφορές",
    hint: "Θέματα ασφάλειας που δήλωσαν χρήστες — χρειάζονται άμεση επικοινωνία",
    Icon: ShieldAlert,
    color: "#BE123C", bg: "#FEF2F2", border: "#FECACA",
    goTo: "reports",
  },
  {
    id: "disputed_noshows",
    label: "Αμφισβητήσεις no-show",
    hint: "Κάποιος διαφώνησε με δήλωση no-show — το strike είναι παγωμένο μέχρι να αποφασίσεις",
    Icon: MessageSquare,
    color: "#C2410C", bg: "#FFF7ED", border: "#FED7AA",
    goTo: "reports",
  },
  {
    id: "open_issues",
    label: "Ανοιχτές αναφορές",
    hint: "Προβλήματα που δηλώθηκαν και δεν έχουν εξεταστεί",
    Icon: AlertTriangle,
    color: "#B45309", bg: "#FFFBEB", border: "#FDE68A",
    goTo: "reports",
  },
  {
    id: "stale_leads",
    label: "Leads σε αναμονή",
    hint: "Άφησαν στοιχεία πάνω από 24 ώρες πριν — η σελίδα υπόσχεται επικοινωνία εντός 24 ωρών",
    Icon: Inbox,
    color: "#1D4ED8", bg: "#EFF6FF", border: "#BFDBFE",
    goTo: "leads",
  },
  {
    id: "not_notified",
    label: "Αιτήματα χωρίς ειδοποίηση",
    hint: "Ο θεραπευτής δεν ειδοποιήθηκε ποτέ — το SLA δεν τρέχει και ο ασθενής περιμένει αόρατος",
    Icon: BellOff,
    color: "#9F1239", bg: "#FEF2F2", border: "#FECACA",
    goTo: "requests",
  },
  {
    id: "unassigned",
    label: "Αιτήματα χωρίς θεραπευτή",
    hint: "Νέα αιτήματα που δεν έχουν ανατεθεί σε κανέναν",
    Icon: UserX,
    color: "#B45309", bg: "#FFFBEB", border: "#FDE68A",
    goTo: "requests",
  },
  {
    id: "incomplete_signup",
    label: "Ημιτελείς εγγραφές",
    hint: "Έκαναν εγγραφή αλλά δεν ανέβασαν άδεια — κόλλησαν στην αρχή",
    Icon: UserPlus,
    color: "#7E22CE", bg: "#FAF5FF", border: "#E9D5FF",
    goTo: "users",
  },
  {
    id: "pending_therapists",
    label: "Θεραπευτές σε αναμονή έγκρισης",
    hint: "Ανέβασαν άδεια και περιμένουν έλεγχο",
    Icon: UserCheck,
    color: "#1D4ED8", bg: "#EFF6FF", border: "#BFDBFE",
    goTo: "users",
  },
  {
    id: "unverified_license",
    label: "Άδειες που δεν έχουν ελεγχθεί",
    hint: "Ανεβασμένες άδειες που περιμένουν επιβεβαίωση από admin",
    Icon: ShieldAlert,
    color: "#0891B2", bg: "#ECFEFF", border: "#A5F3FC",
    goTo: "users",
  },
  {
    id: "approved_but_hidden",
    label: "Εγκεκριμένοι αλλά κρυφοί",
    hint: "Τους ενέκρινες, αλλά δεν εμφανίζονται στο site λόγω ελλιπούς προφίλ",
    Icon: EyeOff,
    color: "#BE123C", bg: "#FFF1F2", border: "#FECDD3",
    goTo: "users",
  },
  {
    id: "overdue",
    label: "Ληξιπρόθεσμες προμήθειες (30+ ημέρες)",
    hint: "Απλήρωτες για πάνω από έναν μήνα — χρειάζονται επικοινωνία",
    Icon: AlertTriangle,
    color: "#BE123C", bg: "#FFF1F2", border: "#FECDD3",
    goTo: "payments",
  },
  {
    id: "unpaid",
    label: "Απλήρωτες προμήθειες",
    hint: "Προμήθειες που δεν έχουν εισπραχθεί ακόμα",
    Icon: CreditCard,
    color: "#B45309", bg: "#FFFBEB", border: "#FDE68A",
    goTo: "payments",
  },
  {
    id: "pending_payout",
    label: "Εκκρεμείς πληρωμές προς θεραπευτές",
    hint: "Η προμήθεια εισπράχθηκε — μένει να πληρωθεί ο θεραπευτής",
    Icon: Banknote,
    color: "#4338CA", bg: "#EEF2FF", border: "#C7D2FE",
    goTo: "payments",
  },
  {
    id: "bad_reviews",
    label: "Αξιολογήσεις κάτω από 3 αστέρια",
    hint: "Χρειάζονται έλεγχο ή επικοινωνία με τον ασθενή",
    Icon: Star,
    color: "#C2410C", bg: "#FFF7ED", border: "#FED7AA",
    goTo: "reviews",
  },
  {
    id: "confirmed_no_sessions",
    label: "Επιβεβαιωμένα χωρίς προγραμματισμένη συνεδρία",
    hint: "Έχουν επιβεβαιωθεί αλλά δεν υπάρχει ημερομηνία",
    Icon: CalendarX,
    color: "#7E22CE", bg: "#FAF5FF", border: "#E9D5FF",
    goTo: "requests",
  },
  {
    id: "incomplete_therapists",
    label: "Θεραπευτές με ελλιπές προφίλ",
    hint: "Έχουν ξεκινήσει αλλά λείπουν υποχρεωτικά στοιχεία",
    Icon: FileWarning,
    color: "#475569", bg: "#F8FAFC", border: "#E2E8F0",
    goTo: "users",
  },
];

const STATUS_MAP = {
  pending:   { label: "Εκκρεμές",      bg: "#FEF3C7", color: "#92400E" },
  confirmed: { label: "Επιβεβαιωμένο", bg: "#DBEAFE", color: "#1D4ED8" },
  completed: { label: "Ολοκληρώθηκε",  bg: "#D1FAE5", color: "#065F46" },
  cancelled: { label: "Ακυρώθηκε",     bg: "#FFE4E6", color: "#9F1239" },
};

function Badge({ label, bg, color }) {
  return (
    <span style={{ background: bg, color, padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("el-GR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function daysAgo(d) {
  if (!d) return 0;
  return Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24));
}

export default function TasksPage({ onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    urgent_issues: [],
    disputed_noshows: [],
    open_issues: [],
    stale_leads: [],
    not_notified: [],
    unassigned: [],
    incomplete_signup: [],
    pending_therapists: [],
    unverified_license: [],
    approved_but_hidden: [],
    overdue: [],
    unpaid: [],
    pending_payout: [],
    bad_reviews: [],
    confirmed_no_sessions: [],
    incomplete_therapists: [],
  });
  const [open, setOpen] = useState(null);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);

    const [
      { data: reqs },
      { data: therapists },
      { data: patients },
      { data: bookings },
      { data: reviews },
      { data: payments },
      { data: condLinks },
      { data: issues },
      { data: noShows },
      { data: leads },
    ] = await Promise.all([
      supabase.from("session_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("therapist_profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("patient_profiles").select("id, name"),
      supabase.from("session_bookings").select("id, request_id, session_date, status"),
      supabase.from("reviews").select("id, therapist_id, rating, comment, created_at, is_published").order("created_at", { ascending: false }),
      supabase.from("payments").select("*").order("created_at", { ascending: false }),
      // Οι παθήσεις είναι ΥΠΟΧΡΕΩΤΙΚΟ πεδίο (3+) — χωρίς αυτές
      // το admin θα έδειχνε λάθος εικόνα πληρότητας.
      supabase.from("therapist_conditions").select("therapist_id, condition_id"),
      supabase.from("issue_reports").select("*").order("created_at", { ascending: false }),
      supabase.from("no_shows").select("*").order("created_at", { ascending: false }),
      supabase.from("leads").select("id, name, phone, email, city, service, status, created_at"),
    ]);

    const patientMap = {};
    (patients || []).forEach(p => { patientMap[p.id] = p.name; });

    const therapistMap = {};
    (therapists || []).forEach(t => { therapistMap[t.id] = t; });

    const condCount = {};
    (condLinks || []).forEach(c => {
      condCount[c.therapist_id] = (condCount[c.therapist_id] || 0) + 1;
    });

    const bookingsByRequest = {};
    (bookings || []).forEach(b => {
      if (!bookingsByRequest[b.request_id]) bookingsByRequest[b.request_id] = [];
      bookingsByRequest[b.request_id].push(b);
    });

    const enrichedReqs = (reqs || []).map(r => ({
      ...r,
      patient_name: patientMap[r.patient_id] || "Άγνωστο",
      therapist_name: therapistMap[r.therapist_id]?.name || null,
      bookings: bookingsByRequest[r.id] || [],
    }));

    // Κανονικοποίηση πληρωμών (legacy rows χωρίς status)
    const pays = (payments || []).map(p => {
      const req = enrichedReqs.find(r => r.id === p.request_id);
      return {
        ...p,
        status: p.status || (p.paid ? "paid" : "unpaid"),
        amount: Number(p.amount) || 0,
        therapist_name: therapistMap[p.therapist_id]?.name || "Άγνωστος θεραπευτής",
        patient: p.patient_name || req?.patient_name || "Άγνωστος",
        age: daysAgo(p.created_at),
      };
    });

    // Όλοι οι θεραπευτές με το τι τους λείπει
    const allT = (therapists || [])
      .filter(t => t.application_status !== "rejected")
      .map(t => ({
        ...t,
        conditions_count: condCount[t.id] || 0,
        missingList: missingRequired(t, condCount[t.id] || 0),
        age: daysAgo(t.created_at),
      }));

    // 1. Αιτήματα χωρίς θεραπευτή
    const unassigned = enrichedReqs.filter(
      r => !r.therapist_id && !isCancelled(r.status) && r.status !== "completed"
    );

    // 2. ΗΜΙΤΕΛΕΙΣ ΕΓΓΡΑΦΕΣ — δεν ανέβασαν καν άδεια.
    // Αυτοί δεν εμφανίζονται πουθενά αλλού: το «σε αναμονή έγκρισης»
    // απαιτεί application_status = 'pending', που γίνεται ΜΟΝΟ μετά
    // το ανέβασμα άδειας. Χωρίς αυτή την κατηγορία, χάνονταν σιωπηλά.
    const incomplete_signup = allT.filter(
      t => !t.license_url && !t.is_approved
    );

    // 3. Ανέβασαν άδεια, περιμένουν έγκριση
    const pending_therapists = allT.filter(
      t => !t.is_approved && !!t.license_url
    );

    // 4. Άδειες ανεβασμένες αλλά μη ελεγμένες
    const unverified_license = allT.filter(
      t => t.license_url && !t.license_verified
    );

    // 5. Εγκεκριμένοι αλλά κρυφοί από το site
    const approved_but_hidden = allT.filter(
      t => t.is_approved && !isPubliclyVisible(t)
    );

    // 6/7. Απλήρωτες προμήθειες
    const openPays = pays.filter(
      p => !COLLECTED.includes(p.status) && p.status !== "refunded"
    );
    const overdue = openPays.filter(p => p.age >= 30);
    const unpaid = openPays.filter(p => p.age < 30);

    // 8. Εκκρεμείς πληρωμές προς θεραπευτές
    const pending_payout = pays.filter(p => p.status === "pending_payout");

    // 9. Κακές αξιολογήσεις
    const bad_reviews = (reviews || [])
      .filter(rv => rv.rating < 3)
      .map(rv => ({ ...rv, therapist_name: therapistMap[rv.therapist_id]?.name || "Άγνωστος" }));

    // 10. Επιβεβαιωμένα χωρίς συνεδρία
    const confirmed_no_sessions = enrichedReqs.filter(
      r => r.status === "confirmed" && r.bookings.length === 0
    );

    // 11. Ελλιπή προφίλ — ΞΕΚΙΝΗΣΑΝ (έχουν άδεια) αλλά λείπουν στοιχεία.
    // Όσοι δεν έχουν καν άδεια είναι στις «Ημιτελείς εγγραφές».
    const incomplete_therapists = allT.filter(
      t => t.missingList.length > 0 && !!t.license_url
    );

    // ── ΝΕΕΣ ΚΑΤΗΓΟΡΙΕΣ ──
    const openStates = ["open", "in_review"];

    const urgent_issues = (issues || [])
      .filter(i => i.severity === "urgent" && openStates.includes(i.status))
      .map(i => ({ ...i, who: patientMap[i.reported_by] || therapistMap[i.reported_by]?.name || "Χρήστης", age: daysAgo(i.created_at) }));

    const open_issues = (issues || [])
      .filter(i => i.severity !== "urgent" && openStates.includes(i.status))
      .map(i => ({ ...i, who: patientMap[i.reported_by] || therapistMap[i.reported_by]?.name || "Χρήστης", age: daysAgo(i.created_at) }));

    // Το strike μένει ΠΑΓΩΜΕΝΟ όσο εκκρεμεί η αμφισβήτηση.
    // Αν ξεχαστεί, ο θεραπευτής δεν τιμωρείται και δεν αθωώνεται.
    const disputed_noshows = (noShows || [])
      .filter(n => n.status === "disputed")
      .map(n => ({ ...n, who: patientMap[n.absent_user_id] || therapistMap[n.absent_user_id]?.name || "Χρήστης", age: daysAgo(n.disputed_at || n.created_at) }));

    const DAY = 86400000;
    const stale_leads = (leads || [])
      .filter(l => l.status === "new" && (Date.now() - new Date(l.created_at).getTime()) >= DAY)
      .map(l => ({ ...l, age: daysAgo(l.created_at) }));

    // Ο ΧΕΙΡΟΤΕΡΟΣ τύπος εκκρεμότητας: ο ασθενής περιμένει και κανείς
    // δεν το ξέρει, γιατί ο θεραπευτής δεν έμαθε ποτέ ότι υπάρχει αίτημα.
    const not_notified = enrichedReqs
      .filter(r => r.status === "pending" && r.type === "booking"
                && r.therapist_id && !r.notified_at
                && (Date.now() - new Date(r.created_at).getTime()) >= 2 * 3600000)
      .map(r => ({ ...r, age: daysAgo(r.created_at) }));

    setData({
      urgent_issues, disputed_noshows, open_issues, stale_leads, not_notified,
      unassigned, incomplete_signup, pending_therapists,
      unverified_license, approved_but_hidden,
      overdue, unpaid, pending_payout,
      bad_reviews, confirmed_no_sessions, incomplete_therapists,
    });
    setLoading(false);
  }

  const totalTasks = Object.values(data).reduce((s, arr) => s + arr.length, 0);

  // ─── RENDER ROWS ──────────────────────────────────────────────────────
  function renderRows(groupId) {
    const items = data[groupId] || [];

    // ── Αναφορές & αμφισβητήσεις ──
    if (["urgent_issues", "open_issues", "disputed_noshows"].includes(groupId)) {
      const isDispute = groupId === "disputed_noshows";
      return items.map(it => (
        <div key={it.id} style={rowStyle}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0F172A" }}>
              {isDispute
                ? <>{it.who} <span style={{ fontWeight: 400, color: "#64748B" }}>αμφισβητεί no-show</span></>
                : (CATEGORY_LABEL[it.category] || it.category)}
            </div>
            <div style={{ fontSize: 12.5, color: "#64748B", marginTop: 3 }}>
              {isDispute
                ? (it.dispute_note || "—").slice(0, 120)
                : <>{it.who} · {(it.description || "").slice(0, 110)}</>}
            </div>
          </div>
          <span style={{ fontSize: 12, color: it.age >= 2 ? "#BE123C" : "#94A3B8", whiteSpace: "nowrap", fontWeight: it.age >= 2 ? 600 : 400 }}>
            {it.age === 0 ? "σήμερα" : `${it.age} ${it.age === 1 ? "μέρα" : "μέρες"}`}
          </span>
        </div>
      ));
    }

    // ── Leads ──
    if (groupId === "stale_leads") {
      return items.map(l => (
        <div key={l.id} style={rowStyle}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0F172A" }}>{l.name}</div>
            <div style={{ fontSize: 12.5, color: "#64748B", marginTop: 3, display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <Phone size={12} />{l.phone}
              {l.city && <>· {l.city}</>}
              {l.service && <>· {l.service}</>}
            </div>
          </div>
          <span style={{ fontSize: 12, color: "#BE123C", fontWeight: 600, whiteSpace: "nowrap" }}>
            {l.age} {l.age === 1 ? "μέρα" : "μέρες"}
          </span>
        </div>
      ));
    }

    // ── Αιτήματα χωρίς ειδοποίηση ──
    if (groupId === "not_notified") {
      return items.map(r => (
        <div key={r.id} style={rowStyle}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0F172A" }}>
              {r.patient_name} → {r.therapist_name || "—"}
            </div>
            <div style={{ fontSize: 12.5, color: "#64748B", marginTop: 3 }}>
              {r.problem_type || "Φυσιοθεραπεία"} · {r.area || "—"}
            </div>
          </div>
          <span style={{ fontSize: 12, color: "#BE123C", fontWeight: 600, whiteSpace: "nowrap" }}>
            {r.age === 0 ? "σήμερα" : `${r.age} ${r.age === 1 ? "μέρα" : "μέρες"}`}
          </span>
        </div>
      ));
    }

    // Αιτήματα
    if (groupId === "unassigned" || groupId === "confirmed_no_sessions") {
      return items.map(r => {
        const st = STATUS_MAP[r.status] || STATUS_MAP.pending;
        const age = daysAgo(r.created_at);
        return (
          <div key={r.id} style={rowStyle}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: "#0F172A" }}>{r.patient_name}</span>
                <Badge label={st.label} bg={st.bg} color={st.color} />
                {age >= 2 && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#BE123C", background: "#FFF1F2", padding: "2px 8px", borderRadius: 999, border: "1px solid #FECDD3" }}>
                    {age} μέρες
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: "#64748B" }}>
                {r.problem_type || r.problem_description || "Χωρίς περιγραφή"}
                {r.area ? ` · ${r.area}` : ""}
              </div>
              <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{fmtDate(r.created_at)}</div>
            </div>
            {r.therapist_name && (
              <span style={{ fontSize: 12, color: "#7E22CE", fontWeight: 600, flexShrink: 0 }}>{r.therapist_name}</span>
            )}
          </div>
        );
      });
    }

    // Πληρωμές
    if (groupId === "overdue" || groupId === "unpaid" || groupId === "pending_payout") {
      return items.map(p => (
        <div key={p.id} style={rowStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: "#0F172A" }}>{p.therapist_name}</span>
              {p.age >= 30 && (
                <span style={{ fontSize: 11, fontWeight: 700, color: "#BE123C", background: "#FFF1F2", padding: "2px 8px", borderRadius: 999, border: "1px solid #FECDD3" }}>
                  {p.age} ημέρες
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: "#64748B" }}>Ασθενής: {p.patient}</div>
            <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{fmtDate(p.created_at)}</div>
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#0F172A", flexShrink: 0 }}>
            {groupId === "pending_payout" ? `${Number(p.therapist_net) || 0}€` : `${p.amount}€`}
          </span>
        </div>
      ));
    }

    // ΗΜΙΤΕΛΕΙΣ ΕΓΓΡΑΦΕΣ — δείχνει πόσο καιρό κόλλησαν
    if (groupId === "incomplete_signup") {
      return items.map(t => (
        <div key={t.id} style={rowStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: "#0F172A" }}>{t.name || "—"}</span>
              {t.age >= 3 && (
                <span style={{ fontSize: 11, fontWeight: 700, color: "#BE123C", background: "#FFF1F2", padding: "2px 8px", borderRadius: 999, border: "1px solid #FECDD3" }}>
                  {t.age} μέρες
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: "#64748B", marginBottom: 4 }}>
              {t.specialty || "Χωρίς ειδικότητα"}{t.area ? ` · ${t.area}` : ""}
            </div>
            <div style={{ fontSize: 11, color: "#94A3B8" }}>
              Εγγραφή: {fmtDate(t.created_at)} · Συμπλήρωσε {9 - t.missingList.length}/9
            </div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#7E22CE", background: "#FAF5FF", border: "1px solid #E9D5FF", padding: "3px 10px", borderRadius: 999, flexShrink: 0, whiteSpace: "nowrap" }}>
            Χωρίς άδεια
          </span>
        </div>
      ));
    }

    // Εγκεκριμένοι αλλά κρυφοί
    if (groupId === "approved_but_hidden") {
      return items.map(t => (
        <div key={t.id} style={rowStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A", marginBottom: 5 }}>{t.name || "—"}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {t.missingList.map(m => (
                <span key={m} style={{ fontSize: 11, color: "#BE123C", background: "#FFF1F2", border: "1px solid #FECDD3", padding: "2px 8px", borderRadius: 999, fontWeight: 600 }}>
                  {m}
                </span>
              ))}
            </div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#BE123C", background: "#FFF1F2", border: "1px solid #FECDD3", padding: "3px 10px", borderRadius: 999, flexShrink: 0, whiteSpace: "nowrap" }}>
            Κρυφός
          </span>
        </div>
      ));
    }

    // Θεραπευτές σε αναμονή
    if (groupId === "pending_therapists") {
      return items.map(t => (
        <div key={t.id} style={rowStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A", marginBottom: 3 }}>{t.name || "—"}</div>
            <div style={{ fontSize: 12, color: "#64748B" }}>
              {t.specialty || "Χωρίς ειδικότητα"}{t.area ? ` · ${t.area}` : ""}
            </div>
            <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>Αίτηση: {fmtDate(t.created_at)}</div>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 700, flexShrink: 0,
            color: t.license_verified ? "#15803D" : "#B45309",
            background: t.license_verified ? "#F0FDF4" : "#FFFBEB",
            border: `1px solid ${t.license_verified ? "#BBF7D0" : "#FDE68A"}`,
            padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap",
          }}>
            {t.license_verified ? "Άδεια ελεγμένη" : "Θέλει έλεγχο"}
          </span>
        </div>
      ));
    }

    // Ανεπιβεβαίωτες άδειες
    if (groupId === "unverified_license") {
      return items.map(t => (
        <div key={t.id} style={rowStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A", marginBottom: 3 }}>{t.name || "—"}</div>
            <div style={{ fontSize: 12, color: "#64748B" }}>
              {t.specialty || "—"}{t.area ? ` · ${t.area}` : ""}
            </div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#0891B2", background: "#ECFEFF", border: "1px solid #A5F3FC", padding: "3px 10px", borderRadius: 999, flexShrink: 0, whiteSpace: "nowrap" }}>
            Θέλει έλεγχο
          </span>
        </div>
      ));
    }

    // Κακές αξιολογήσεις
    if (groupId === "bad_reviews") {
      return items.map(rv => (
        <div key={rv.id} style={rowStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: "#0F172A" }}>{rv.therapist_name}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#BE123C" }}>{rv.rating}/5</span>
              {!rv.is_published && <Badge label="Μη δημοσιευμένη" bg="#F1F5F9" color="#475569" />}
            </div>
            {rv.comment && (
              <div style={{ fontSize: 12, color: "#64748B", fontStyle: "italic" }}>{rv.comment}</div>
            )}
            <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{fmtDate(rv.created_at)}</div>
          </div>
        </div>
      ));
    }

    // Ελλιπή προφίλ
    if (groupId === "incomplete_therapists") {
      return items.map(t => (
        <div key={t.id} style={rowStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: "#0F172A" }}>{t.name || "—"}</span>
              {t.is_approved && <Badge label="Εγκεκριμένος" bg="#D1FAE5" color="#065F46" />}
              <span style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>
                {9 - t.missingList.length}/9
              </span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {t.missingList.map(m => (
                <span key={m} style={{ fontSize: 11, color: "#B45309", background: "#FFFBEB", border: "1px solid #FDE68A", padding: "2px 8px", borderRadius: 999, fontWeight: 600 }}>
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      ));
    }

    return null;
  }

  if (loading) {
    return (
      <div style={{ padding: 24, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <div style={{ fontSize: 16, color: "#64748B" }}>Έλεγχος εκκρεμοτήτων...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0F172A", margin: 0 }}>Χρειάζονται Ενέργεια</h1>
          <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>
            Ό,τι εκκρεμεί αυτή τη στιγμή στην πλατφόρμα, σε ένα σημείο.
          </p>
        </div>
        <button onClick={fetchAll}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "1px solid #E2E8F0", background: "#fff", color: "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
          <RefreshCw size={14} />
          Ανανέωση
        </button>
      </div>

      {totalTasks === 0 ? (
        <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 16, padding: "48px 32px", textAlign: "center" }}>
          <CheckCircle2 size={40} color="#15803D" strokeWidth={1.8} style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 18, fontWeight: 700, color: "#065F46", marginBottom: 6 }}>Όλα καθαρά</div>
          <div style={{ fontSize: 14, color: "#15803D" }}>Δεν υπάρχουν εκκρεμότητες αυτή τη στιγμή.</div>
        </div>
      ) : (
        <>
          {/* Σύνοψη */}
          <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12, padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <AlertTriangle size={20} color="#B45309" strokeWidth={2.2} />
            <div style={{ fontSize: 14, color: "#92400E" }}>
              <strong>{totalTasks}</strong> {totalTasks === 1 ? "εκκρεμότητα" : "εκκρεμότητες"} συνολικά
            </div>
            {data.overdue.length > 0 && (
              <div style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: "#BE123C", background: "#FFF1F2", border: "1px solid #FECDD3", padding: "4px 12px", borderRadius: 999 }}>
                {data.overdue.length} ληξιπρόθεσμες
              </div>
            )}
          </div>

          {/* Groups */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {GROUPS.map(g => {
              const items = data[g.id] || [];
              const count = items.length;
              const isOpen = open === g.id;
              const GIcon = g.Icon;

              return (
                <div key={g.id} style={{
                  background: "#fff",
                  border: `1px solid ${count > 0 ? g.border : "#E2E8F0"}`,
                  borderRadius: 14,
                  overflow: "hidden",
                  opacity: count === 0 ? 0.55 : 1,
                }}>
                  <div
                    onClick={() => count > 0 && setOpen(isOpen ? null : g.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "16px 20px",
                      cursor: count > 0 ? "pointer" : "default",
                      background: count > 0 ? g.bg : "#fff",
                    }}
                  >
                    <div style={{
                      width: 38, height: 38, borderRadius: 10,
                      background: "#fff", border: `1px solid ${g.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <GIcon size={18} color={count > 0 ? g.color : "#94A3B8"} strokeWidth={2} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 2 }}>{g.label}</div>
                      <div style={{ fontSize: 12, color: "#64748B" }}>{g.hint}</div>
                    </div>

                    <div style={{
                      fontSize: 20, fontWeight: 700, flexShrink: 0,
                      color: count > 0 ? g.color : "#CBD5E1",
                      minWidth: 32, textAlign: "right",
                    }}>
                      {count}
                    </div>

                    {count > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onNavigate && onNavigate(g.goTo); }}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          padding: "6px 14px", borderRadius: 8,
                          border: `1px solid ${g.border}`, background: "#fff",
                          color: g.color, fontSize: 12, fontWeight: 700,
                          cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
                        }}>
                        Άνοιγμα
                        <ArrowRight size={13} />
                      </button>
                    )}
                  </div>

                  {isOpen && count > 0 && (
                    <div style={{ borderTop: `1px solid ${g.border}` }}>
                      {renderRows(g.id)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

const rowStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: 12,
  padding: "12px 20px",
  borderBottom: "1px solid #F1F5F9",
};