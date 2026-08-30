"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  AlertTriangle, Calendar, ClipboardList, Users, Stethoscope, Euro,
  Star, ArrowRight, RefreshCw, CheckCircle2, Clock, TrendingUp,
  UserPlus, Activity, Plus, Ban, CircleCheck, MessageSquare, MapPin,
  XCircle, Percent, Megaphone,
} from "lucide-react";

const STATUS_MAP = {
  pending:   { label:"Εκκρεμές",      bg:"#FEF3C7", color:"#92400E" },
  confirmed: { label:"Επιβεβαιωμένο", bg:"#DBEAFE", color:"#1D4ED8" },
  completed: { label:"Ολοκληρώθηκε",  bg:"#D1FAE5", color:"#065F46" },
  cancelled: { label:"Ακυρώθηκε",     bg:"#FFE4E6", color:"#9F1239" },
  cancelled_by_admin:     { label:"Ακυρώθηκε", bg:"#FFE4E6", color:"#9F1239" },
  cancelled_by_patient:   { label:"Ακυρώθηκε", bg:"#FFE4E6", color:"#9F1239" },
  cancelled_by_therapist: { label:"Ακυρώθηκε", bg:"#FFE4E6", color:"#9F1239" },
};

const EVENT_ICONS = {
  created:        { Icon: Plus,          color: "#1D4ED8" },
  assigned:       { Icon: UserPlus,      color: "#7E22CE" },
  status_changed: { Icon: RefreshCw,     color: "#0891B2" },
  confirmed:      { Icon: CheckCircle2,  color: "#15803D" },
  completed:      { Icon: CircleCheck,   color: "#7C3AED" },
  cancelled:      { Icon: Ban,           color: "#BE123C" },
  paid:           { Icon: Euro,          color: "#15803D" },
  note_added:     { Icon: MessageSquare, color: "#B45309" },
};

const DAYS_EL = ['Κυριακή','Δευτέρα','Τρίτη','Τετάρτη','Πέμπτη','Παρασκευή','Σάββατο'];

// Καταστάσεις πληρωμής που θεωρούνται "εισπραγμένες"
const COLLECTED = ["paid", "pending_payout", "paid_out"];

const isCancelled = (s) => (s || "").startsWith("cancelled");

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function isToday(ts) {
  if (!ts) return false;
  const d = new Date(ts);
  const n = new Date();
  return d.getFullYear()===n.getFullYear() && d.getMonth()===n.getMonth() && d.getDate()===n.getDate();
}

function isThisWeek(ts) {
  if (!ts) return false;
  const d = new Date(ts);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7*24*60*60*1000);
  return d >= weekAgo && d <= now;
}

const fmtTime = (t) => (t ? String(t).slice(0,5) : "—");

function fmtDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("el-GR", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" });
}

function daysAgo(d) {
  if (!d) return 0;
  return Math.floor((Date.now() - new Date(d).getTime()) / (1000*60*60*24));
}

function Badge({ label, bg, color }) {
  return <span style={{ background:bg, color, padding:"2px 9px", borderRadius:999, fontSize:10, fontWeight:700, letterSpacing:"0.04em", textTransform:"uppercase", whiteSpace:"nowrap" }}>{label}</span>;
}

function Avatar({ name, size=34 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:"#EFF6FF", color:"#1D4ED8", display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.36, fontWeight:700, flexShrink:0 }}>
      {(name||"?").split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
    </div>
  );
}

export default function AdminDashboard({ onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [d, setD] = useState({
    requests: [], therapists: [], bookings: [], reviews: [], activity: [], payments: [], patients: 0,
  });

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);

    const [
      { data: requests },
      { data: therapists },
      { data: bookings },
      { data: reviews },
      { data: activity },
      { data: payments },
      { data: patientProfiles },
    ] = await Promise.all([
      supabase.from("session_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("therapist_profiles").select("*"),
      supabase.from("session_bookings").select("*"),
      supabase.from("reviews").select("*").order("created_at", { ascending: false }),
      supabase.from("request_activity").select("*").order("created_at", { ascending: false }).limit(12),
      supabase.from("payments").select("*"),
      supabase.from("patient_profiles").select("id, name"),
    ]);

    const patientMap = {};
    (patientProfiles || []).forEach(p => { patientMap[p.id] = p.name; });

    const therapistMap = {};
    (therapists || []).forEach(t => { therapistMap[t.id] = t; });

    // Κανονικοποίηση status πληρωμών (legacy rows χωρίς status)
    const norm = (payments || []).map(p => ({
      ...p,
      status: p.status || (p.paid ? "paid" : "unpaid"),
      amount: Number(p.amount) || 0,
    }));

    const payByRequest = {};
    norm.forEach(p => { if (p.request_id) payByRequest[p.request_id] = p; });

    const enrichedReqs = (requests || []).map(r => ({
      ...r,
      patient_name: patientMap[r.patient_id] || "Άγνωστο",
      therapist_name: therapistMap[r.therapist_id]?.name || null,
      payment: payByRequest[r.id] || null,
    }));

    const enrichedBookings = (bookings || []).map(b => {
      const req = enrichedReqs.find(r => r.id === b.request_id);
      return {
        ...b,
        patient_name: req?.patient_name || "Άγνωστο",
        therapist_name: req?.therapist_name || null,
        area: req?.area || null,
      };
    });

    setD({
      requests: enrichedReqs,
      therapists: therapists || [],
      bookings: enrichedBookings,
      reviews: reviews || [],
      activity: activity || [],
      payments: norm,
      patients: (patientProfiles || []).length,
    });
    setLoading(false);
  }

  if (loading) return (
    <div style={{ padding:24, display:"flex", alignItems:"center", justifyContent:"center", minHeight:400 }}>
      <div style={{ fontSize:16, color:"#64748B" }}>Φόρτωση...</div>
    </div>
  );

  const { requests, therapists, bookings, reviews, activity, payments, patients } = d;
  const today = todayISO();

  // ── ΣΗΜΕΡΑ ────────────────────────────────────────────────────────────
  const newToday = requests.filter(r => isToday(r.created_at));
  const sessionsToday = bookings
    .filter(b => b.session_date === today && !isCancelled(b.status))
    .sort((a,b) => (a.session_time || "").localeCompare(b.session_time || ""));

  // ── ΕΚΚΡΕΜΟΤΗΤΕΣ ──────────────────────────────────────────────────────
  const bookedIds = new Set(bookings.map(b => b.request_id));

  const unassigned = requests.filter(
    r => !r.therapist_id && !isCancelled(r.status) && r.status !== "completed"
  );
  const pendingTherapists = therapists.filter(
    t => !t.is_approved && t.application_status === "pending"
  );
  // ΠΡΟΣΟΧΗ: οι απλήρωτες διαβάζονται από τον πίνακα `payments`
  const unpaidPayments = payments.filter(p => !COLLECTED.includes(p.status) && p.status !== "refunded");
  const overduePayments = unpaidPayments.filter(p => daysAgo(p.created_at) >= 30);
  const badReviews = reviews.filter(rv => rv.rating < 3);
  const pendingReviews = reviews.filter(rv => !rv.is_published);
  const confirmedNoSession = requests.filter(
    r => r.status === "confirmed" && !bookedIds.has(r.id)
  );

  const totalTasks = unassigned.length + pendingTherapists.length + unpaidPayments.length
    + badReviews.length + confirmedNoSession.length + pendingReviews.length;

  // ── ΕΠΟΜΕΝΗ ΕΝΕΡΓΕΙΑ ──────────────────────────────────────────────────
  let nextAction = null;
  const oldestUnassigned = [...unassigned].sort((a,b) => new Date(a.created_at) - new Date(b.created_at))[0];

  if (oldestUnassigned && daysAgo(oldestUnassigned.created_at) >= 2) {
    nextAction = {
      title: "Αίτημα περιμένει θεραπευτή εδώ και μέρες",
      desc: `${oldestUnassigned.patient_name} · ${oldestUnassigned.area || "—"} · ${daysAgo(oldestUnassigned.created_at)} μέρες`,
      cta: "Ανάθεση θεραπευτή", page: "requests", color: "#BE123C", bg: "#FFF1F2", border: "#FECDD3",
    };
  } else if (pendingTherapists.length > 0) {
    nextAction = {
      title: `${pendingTherapists.length} ${pendingTherapists.length===1 ? "θεραπευτής περιμένει" : "θεραπευτές περιμένουν"} έγκριση`,
      desc: "Ελέγξτε τα έγγραφα και εγκρίνετε ή απορρίψτε",
      cta: "Έλεγχος θεραπευτών", page: "therapists", color: "#B45309", bg: "#FFFBEB", border: "#FDE68A",
    };
  } else if (unassigned.length > 0) {
    nextAction = {
      title: `${unassigned.length} ${unassigned.length===1 ? "αίτημα χωρίς" : "αιτήματα χωρίς"} θεραπευτή`,
      desc: "Αναθέστε θεραπευτή για να προχωρήσουν",
      cta: "Άνοιγμα αιτημάτων", page: "requests", color: "#B45309", bg: "#FFFBEB", border: "#FDE68A",
    };
  } else if (overduePayments.length > 0) {
    nextAction = {
      title: `${overduePayments.length} ληξιπρόθεσμες προμήθειες`,
      desc: `Απλήρωτες πάνω από 30 ημέρες · ${overduePayments.reduce((s,p)=>s+p.amount,0)}€`,
      cta: "Άνοιγμα πληρωμών", page: "payments", color: "#BE123C", bg: "#FFF1F2", border: "#FECDD3",
    };
  } else if (unpaidPayments.length > 0) {
    nextAction = {
      title: `${unpaidPayments.length} ${unpaidPayments.length===1 ? "απλήρωτη προμήθεια" : "απλήρωτες προμήθειες"}`,
      desc: `Σύνολο ${unpaidPayments.reduce((s,p)=>s+p.amount,0)}€ προς είσπραξη`,
      cta: "Άνοιγμα πληρωμών", page: "payments", color: "#B45309", bg: "#FFFBEB", border: "#FDE68A",
    };
  } else if (badReviews.length > 0) {
    nextAction = {
      title: `${badReviews.length} ${badReviews.length===1 ? "χαμηλή αξιολόγηση" : "χαμηλές αξιολογήσεις"}`,
      desc: "Κάτω από 3 αστέρια — χρειάζονται έλεγχο",
      cta: "Άνοιγμα αξιολογήσεων", page: "reviews", color: "#C2410C", bg: "#FFF7ED", border: "#FED7AA",
    };
  } else if (pendingReviews.length > 0) {
    nextAction = {
      title: `${pendingReviews.length} ${pendingReviews.length===1 ? "αξιολόγηση περιμένει" : "αξιολογήσεις περιμένουν"} δημοσίευση`,
      desc: "Ελέγξτε και δημοσιεύστε τις",
      cta: "Άνοιγμα αξιολογήσεων", page: "reviews", color: "#B45309", bg: "#FFFBEB", border: "#FDE68A",
    };
  }

  // ── KPIs ──────────────────────────────────────────────────────────────
  const approvedTherapists = therapists.filter(t => t.is_approved && !t.is_paused).length;
  const completedAll = requests.filter(r => r.status === "completed");
  const completedWeek = completedAll.filter(r => isThisWeek(r.created_at)).length;
  const newRequestsWeek = requests.filter(r => isThisWeek(r.created_at)).length;

  // Έσοδα πλατφόρμας = εισπραγμένες προμήθειες (πίνακας payments)
  const revenue = payments
    .filter(p => COLLECTED.includes(p.status))
    .reduce((s, p) => s + p.amount, 0);

  const publishedReviews = reviews.filter(rv => rv.is_published);
  const avgRating = publishedReviews.length
    ? (publishedReviews.reduce((s, rv) => s + rv.rating, 0) / publishedReviews.length)
    : 0;

  // ── FUNNEL / CONVERSION ───────────────────────────────────────────────
  const totalReqs = requests.length;
  const assignedReqs = requests.filter(r => r.therapist_id).length;
  const confirmedEver = requests.filter(
    r => r.status === "confirmed" || r.status === "completed"
  ).length;
  const completedCount = completedAll.length;
  const cancelledCount = requests.filter(r => isCancelled(r.status)).length;

  const pct = (n, total) => (total > 0 ? Math.round((n / total) * 100) : 0);

  const FUNNEL = [
    { label: "Αιτήματα",       value: totalReqs,      percent: 100,                          color: "#1D4ED8" },
    { label: "Με θεραπευτή",   value: assignedReqs,   percent: pct(assignedReqs, totalReqs), color: "#7E22CE" },
    { label: "Επιβεβαιωμένα",  value: confirmedEver,  percent: pct(confirmedEver, totalReqs), color: "#0891B2" },
    { label: "Ολοκληρωμένα",   value: completedCount, percent: pct(completedCount, totalReqs), color: "#15803D" },
  ];

  const cancelRate = pct(cancelledCount, totalReqs);
  const conversionRate = pct(confirmedEver, totalReqs);

  // ── ΖΗΤΗΣΗ ΑΝΑ ΠΕΡΙΟΧΗ ────────────────────────────────────────────────
  const areaCount = {};
  requests.forEach(r => {
    if (!r.area) return;
    areaCount[r.area] = (areaCount[r.area] || 0) + 1;
  });
  const topAreas = Object.entries(areaCount)
    .map(([area, count]) => ({
      area,
      count,
      therapists: therapists.filter(
        t => t.is_approved && (t.area === area || (t.service_areas || []).includes(area))
      ).length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const maxAreaCount = topAreas.length ? topAreas[0].count : 1;

  // ── ΑΠΟΔΟΣΗ ΑΝΑ ΠΗΓΗ ──
  // Χωρίς αυτό, το funnel δείχνει ΠΟΣΟΙ μετατρέπονται αλλά όχι ΑΠΟ ΠΟΥ
  // ήρθαν. Με τρεις καμπάνιες ταυτόχρονα, δεν ξέρεις ποια να κόψεις.
  //
  // Τα utm_* γράφονται από το new-request τη στιγμή της υποβολής, οπότε
  // η πηγή μένει δεμένη με το αίτημα ακόμα κι αν ο επισκέπτης
  // περιηγήθηκε σε πέντε σελίδες πρώτα.
  const bySource = {};
  requests.filter(r => r.type === "booking").forEach(r => {
    const key = r.utm_source || "organic";
    if (!bySource[key]) {
      bySource[key] = { source: key, total: 0, confirmed: 0, completed: 0, campaigns: new Set() };
    }
    const b = bySource[key];
    b.total += 1;
    if (["confirmed", "accepted", "completed"].includes(r.status)) b.confirmed += 1;
    if (r.status === "completed") b.completed += 1;
    if (r.utm_campaign) b.campaigns.add(r.utm_campaign);
  });

  const sources = Object.values(bySource)
    .map(b => ({ ...b, campaigns: [...b.campaigns], rate: pct(b.confirmed, b.total) }))
    .sort((a, b) => b.total - a.total);

  const hasPaidTraffic = sources.some(s => s.source !== "organic");

  const KPIS = [
    { label:"Νέα αιτήματα (7 ημέρες)", value:newRequestsWeek, Icon:ClipboardList, color:"#1D4ED8", bg:"#EFF6FF", border:"#BFDBFE", page:"requests" },
    { label:"Ενεργοί θεραπευτές",       value:approvedTherapists, Icon:Stethoscope, color:"#7E22CE", bg:"#FAF5FF", border:"#E9D5FF", page:"therapists" },
    { label:"Ασθενείς",                 value:patients, Icon:Users, color:"#0891B2", bg:"#ECFEFF", border:"#A5F3FC", page:"patients" },
    { label:"Ολοκληρωμένες (7 ημέρες)", value:completedWeek, Icon:TrendingUp, color:"#15803D", bg:"#F0FDF4", border:"#BBF7D0", page:"requests" },
    { label:"Εισπραγμένες προμήθειες",  value:`${revenue}€`, Icon:Euro, color:"#065F46", bg:"#ECFDF5", border:"#A7F3D0", page:"payments" },
    { label:"Μέση βαθμολογία",          value: avgRating ? avgRating.toFixed(1) : "—", Icon:Star, color:"#B45309", bg:"#FFFBEB", border:"#FDE68A", page:"reviews" },
    { label:"Conversion (→ επιβεβ.)",   value:`${conversionRate}%`, Icon:Percent, color:"#4338CA", bg:"#EEF2FF", border:"#C7D2FE", page:"requests" },
    { label:"Ποσοστό ακυρώσεων",        value:`${cancelRate}%`, Icon:XCircle, color: cancelRate > 20 ? "#BE123C" : "#64748B", bg: cancelRate > 20 ? "#FFF1F2" : "#F8FAFC", border: cancelRate > 20 ? "#FECDD3" : "#E2E8F0", page:"requests" },
    { label:"Απλήρωτες προμήθειες",     value:`${unpaidPayments.reduce((s,p)=>s+p.amount,0)}€`, Icon:Clock, color:"#B45309", bg:"#FFFBEB", border:"#FDE68A", page:"payments" },
  ];

  const TASKS = [
    { label:"Αιτήματα χωρίς θεραπευτή",     count:unassigned.length,          page:"requests",   color:"#B45309" },
    { label:"Θεραπευτές σε αναμονή",        count:pendingTherapists.length,   page:"therapists", color:"#1D4ED8" },
    { label:"Απλήρωτες προμήθειες",         count:unpaidPayments.length,      page:"payments",   color:"#BE123C" },
    { label:"Χαμηλές αξιολογήσεις",         count:badReviews.length,          page:"reviews",    color:"#C2410C" },
    { label:"Επιβεβαιωμένα χωρίς ώρα",      count:confirmedNoSession.length,  page:"requests",   color:"#7E22CE" },
    { label:"Αξιολογήσεις προς δημοσίευση", count:pendingReviews.length,      page:"reviews",    color:"#0891B2" },
  ];

  const now = new Date();
  const greeting = `${DAYS_EL[now.getDay()]} ${now.toLocaleDateString("el-GR", { day:"2-digit", month:"long" })}`;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:24, display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:16, flexWrap:"wrap" }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:700, color:"#0F172A", margin:0 }}>Dashboard</h1>
          <p style={{ fontSize:13, color:"#94A3B8", marginTop:4 }}>{greeting}</p>
        </div>
        <button onClick={fetchAll}
          style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:8, border:"1px solid #E2E8F0", background:"#fff", color:"#475569", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
          <RefreshCw size={14}/> Ανανέωση
        </button>
      </div>

      {/* ΕΠΟΜΕΝΗ ΕΝΕΡΓΕΙΑ */}
      {nextAction ? (
        <div style={{ background:nextAction.bg, border:`1px solid ${nextAction.border}`, borderRadius:14, padding:"18px 22px", marginBottom:20, display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
          <div style={{ width:42, height:42, borderRadius:11, background:"#fff", border:`1px solid ${nextAction.border}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <AlertTriangle size={20} color={nextAction.color} strokeWidth={2.2}/>
          </div>
          <div style={{ flex:1, minWidth:200 }}>
            <div style={{ fontSize:10, fontWeight:700, color:nextAction.color, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>
              Επόμενη ενέργεια
            </div>
            <div style={{ fontSize:15, fontWeight:700, color:"#0F172A", marginBottom:2 }}>{nextAction.title}</div>
            <div style={{ fontSize:12, color:"#64748B" }}>{nextAction.desc}</div>
          </div>
          <button onClick={()=>onNavigate && onNavigate(nextAction.page)}
            style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"10px 20px", borderRadius:9, border:"none", background:nextAction.color, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", flexShrink:0 }}>
            {nextAction.cta}
            <ArrowRight size={15}/>
          </button>
        </div>
      ) : (
        <div style={{ background:"#F0FDF4", border:"1px solid #BBF7D0", borderRadius:14, padding:"18px 22px", marginBottom:20, display:"flex", alignItems:"center", gap:14 }}>
          <CheckCircle2 size={22} color="#15803D" strokeWidth={2.2}/>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:"#065F46" }}>Όλα καθαρά</div>
            <div style={{ fontSize:12, color:"#15803D" }}>Δεν υπάρχουν εκκρεμότητες αυτή τη στιγμή.</div>
          </div>
        </div>
      )}

      {/* ΣΗΜΕΡΑ */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }} className="dash-today">
        {/* Νέα σήμερα */}
        <div style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:14, padding:"18px 20px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:14 }}>
            <ClipboardList size={17} color="#1D4ED8" strokeWidth={2.2}/>
            <span style={{ fontSize:14, fontWeight:700, color:"#0F172A" }}>Νέα αιτήματα σήμερα</span>
            <span style={{ marginLeft:"auto", fontSize:20, fontWeight:700, color: newToday.length ? "#1D4ED8" : "#CBD5E1" }}>
              {newToday.length}
            </span>
          </div>
          {newToday.length === 0 ? (
            <div style={{ fontSize:13, color:"#94A3B8", padding:"12px 0" }}>Δεν υπάρχουν νέα αιτήματα σήμερα.</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {newToday.slice(0,4).map(r => {
                const st = STATUS_MAP[r.status] || STATUS_MAP.pending;
                return (
                  <div key={r.id} onClick={()=>onNavigate && onNavigate("requests")}
                    style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", background:"#F8FAFC", borderRadius:9, cursor:"pointer" }}>
                    <Avatar name={r.patient_name} size={30}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:"#0F172A" }}>{r.patient_name}</div>
                      <div style={{ fontSize:11, color:"#64748B", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {r.problem_type || r.problem_description || "—"}{r.area ? ` · ${r.area}` : ""}
                      </div>
                    </div>
                    <Badge label={st.label} bg={st.bg} color={st.color}/>
                  </div>
                );
              })}
              {newToday.length > 4 && (
                <button onClick={()=>onNavigate && onNavigate("requests")}
                  style={{ background:"none", border:"none", color:"#1D4ED8", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", textAlign:"left", padding:"4px 0" }}>
                  + {newToday.length - 4} ακόμα →
                </button>
              )}
            </div>
          )}
        </div>

        {/* Συνεδρίες σήμερα */}
        <div style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:14, padding:"18px 20px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:14 }}>
            <Calendar size={17} color="#15803D" strokeWidth={2.2}/>
            <span style={{ fontSize:14, fontWeight:700, color:"#0F172A" }}>Συνεδρίες σήμερα</span>
            <span style={{ marginLeft:"auto", fontSize:20, fontWeight:700, color: sessionsToday.length ? "#15803D" : "#CBD5E1" }}>
              {sessionsToday.length}
            </span>
          </div>
          {sessionsToday.length === 0 ? (
            <div style={{ fontSize:13, color:"#94A3B8", padding:"12px 0" }}>Δεν υπάρχουν προγραμματισμένες συνεδρίες σήμερα.</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {sessionsToday.slice(0,4).map(b => (
                <div key={b.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", background:"#F0FDF4", borderRadius:9, border:"1px solid #DCFCE7" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:13, fontWeight:700, color:"#15803D", flexShrink:0, minWidth:46 }}>
                    <Clock size={12}/> {fmtTime(b.session_time)}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:"#0F172A" }}>{b.patient_name}</div>
                    <div style={{ fontSize:11, color:"#64748B", display:"flex", alignItems:"center", gap:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {b.therapist_name && <><Stethoscope size={10}/> {b.therapist_name}</>}
                      {b.area && <><MapPin size={10}/> {b.area}</>}
                    </div>
                  </div>
                </div>
              ))}
              {sessionsToday.length > 4 && (
                <div style={{ fontSize:12, color:"#64748B", padding:"4px 0" }}>+ {sessionsToday.length - 4} ακόμα</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:14, marginBottom:20 }} className="dash-kpis">
        {KPIS.map(k => {
          const KIcon = k.Icon;
          return (
            <div key={k.label} onClick={()=>onNavigate && onNavigate(k.page)}
              style={{ background:k.bg, border:`1px solid ${k.border}`, borderRadius:12, padding:"16px 18px", cursor:"pointer", transition:"transform .15s" }}
              onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-2px)"; }}
              onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)"; }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                <KIcon size={15} color={k.color} strokeWidth={2.2}/>
                <span style={{ fontSize:11, fontWeight:700, color:k.color, textTransform:"uppercase", letterSpacing:"0.05em" }}>{k.label}</span>
              </div>
              <div style={{ fontSize:28, fontWeight:700, color:k.color, lineHeight:1.1 }}>{k.value}</div>
            </div>
          );
        })}
      </div>

      {/* FUNNEL + ΠΕΡΙΟΧΕΣ */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }} className="dash-bottom">

        {/* Funnel */}
        <div style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:14, padding:"18px 20px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:16 }}>
            <TrendingUp size={17} color="#1D4ED8" strokeWidth={2.2}/>
            <span style={{ fontSize:14, fontWeight:700, color:"#0F172A" }}>Πορεία αιτημάτων</span>
          </div>

          {totalReqs === 0 ? (
            <div style={{ fontSize:13, color:"#94A3B8", padding:"12px 0" }}>Δεν υπάρχουν αιτήματα ακόμα.</div>
          ) : (
            <>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {FUNNEL.map(f => (
                  <div key={f.label}>
                    <div style={{ display:"flex", alignItems:"center", marginBottom:5 }}>
                      <span style={{ flex:1, fontSize:12, fontWeight:600, color:"#475569" }}>{f.label}</span>
                      <span style={{ fontSize:13, fontWeight:700, color:"#0F172A", marginRight:8 }}>{f.value}</span>
                      <span style={{ fontSize:11, fontWeight:700, color:f.color, minWidth:36, textAlign:"right" }}>{f.percent}%</span>
                    </div>
                    <div style={{ height:8, background:"#F1F5F9", borderRadius:99, overflow:"hidden" }}>
                      <div style={{ width:`${f.percent}%`, height:"100%", background:f.color, borderRadius:99, transition:"width .3s" }} />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display:"flex", gap:10, marginTop:16, paddingTop:14, borderTop:"1px solid #F1F5F9" }}>
                <div style={{ flex:1, background:"#EEF2FF", border:"1px solid #C7D2FE", borderRadius:10, padding:"10px 12px" }}>
                  <div style={{ fontSize:10, fontWeight:700, color:"#4338CA", textTransform:"uppercase", letterSpacing:"0.05em" }}>Conversion</div>
                  <div style={{ fontSize:20, fontWeight:700, color:"#4338CA", marginTop:2 }}>{conversionRate}%</div>
                  <div style={{ fontSize:10, color:"#4338CA", opacity:0.75 }}>αίτημα → επιβεβαίωση</div>
                </div>
                <div style={{ flex:1, background: cancelRate > 20 ? "#FFF1F2" : "#F8FAFC", border:`1px solid ${cancelRate > 20 ? "#FECDD3" : "#E2E8F0"}`, borderRadius:10, padding:"10px 12px" }}>
                  <div style={{ fontSize:10, fontWeight:700, color: cancelRate > 20 ? "#BE123C" : "#64748B", textTransform:"uppercase", letterSpacing:"0.05em" }}>Ακυρώσεις</div>
                  <div style={{ fontSize:20, fontWeight:700, color: cancelRate > 20 ? "#BE123C" : "#64748B", marginTop:2 }}>{cancelRate}%</div>
                  <div style={{ fontSize:10, color: cancelRate > 20 ? "#BE123C" : "#94A3B8", opacity:0.85 }}>{cancelledCount} από {totalReqs}</div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ΑΠΟΔΟΣΗ ΑΝΑ ΠΗΓΗ.
            Εμφανίζεται μόνο όταν υπάρχει πληρωμένη κίνηση — με μόνο
            organic θα ήταν μία γραμμή που δεν λέει τίποτα. */}
        {hasPaidTraffic && (
          <div style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:14, padding:"18px 20px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:6 }}>
              <Megaphone size={17} color="#1D4ED8" strokeWidth={2.2}/>
              <span style={{ fontSize:14, fontWeight:700, color:"#0F172A" }}>Απόδοση ανά πηγή</span>
            </div>
            <div style={{ fontSize:12, color:"#94A3B8", marginBottom:16 }}>
              Από τα δεδομένα της βάσης — ανεξάρτητα από το Analytics
            </div>

            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", minWidth:460 }}>
                <thead>
                  <tr style={{ background:"#F8FAFC" }}>
                    <th style={{ padding:"9px 12px", textAlign:"left", fontSize:11, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:".05em" }}>Πηγή</th>
                    <th style={{ padding:"9px 12px", textAlign:"right", fontSize:11, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:".05em" }}>Αιτήματα</th>
                    <th style={{ padding:"9px 12px", textAlign:"right", fontSize:11, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:".05em" }}>Επιβεβ.</th>
                    <th style={{ padding:"9px 12px", textAlign:"right", fontSize:11, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:".05em" }}>Ολοκλ.</th>
                    <th style={{ padding:"9px 12px", textAlign:"right", fontSize:11, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:".05em" }}>Μετατροπή</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map(src => (
                    <tr key={src.source} style={{ borderBottom:"1px solid #F1F5F9" }}>
                      <td style={{ padding:"11px 12px", fontSize:13.5, fontWeight:600, color:"#0F172A" }}>
                        {src.source === "organic" ? "Οργανικά" : src.source}
                        {src.campaigns.length > 0 && (
                          <div style={{ fontSize:11.5, color:"#94A3B8", fontWeight:400, marginTop:2 }}>
                            {src.campaigns.slice(0, 2).join(" · ")}
                            {src.campaigns.length > 2 ? ` +${src.campaigns.length - 2}` : ""}
                          </div>
                        )}
                      </td>
                      <td style={{ padding:"11px 12px", textAlign:"right", fontSize:13 }}>{src.total}</td>
                      <td style={{ padding:"11px 12px", textAlign:"right", fontSize:13, color:"#0891B2", fontWeight:600 }}>{src.confirmed}</td>
                      <td style={{ padding:"11px 12px", textAlign:"right", fontSize:13, color:"#15803D", fontWeight:600 }}>{src.completed}</td>
                      <td style={{ padding:"11px 12px", textAlign:"right", fontSize:13, fontWeight:700,
                                   color: src.rate >= 50 ? "#15803D" : src.rate >= 25 ? "#B45309" : "#BE123C" }}>
                        {src.rate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Ζήτηση ανά περιοχή */}
        <div style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:14, padding:"18px 20px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:16 }}>
            <MapPin size={17} color="#7E22CE" strokeWidth={2.2}/>
            <span style={{ fontSize:14, fontWeight:700, color:"#0F172A" }}>Ζήτηση ανά περιοχή</span>
          </div>

          {topAreas.length === 0 ? (
            <div style={{ fontSize:13, color:"#94A3B8", padding:"12px 0" }}>Δεν υπάρχουν δεδομένα περιοχών.</div>
          ) : (
            <>
              <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
                {topAreas.map(a => {
                  const gap = a.therapists === 0;
                  return (
                    <div key={a.area}>
                      <div style={{ display:"flex", alignItems:"center", marginBottom:5 }}>
                        <span style={{ flex:1, fontSize:12, fontWeight:600, color:"#475569" }}>{a.area}</span>
                        {gap && (
                          <span style={{ fontSize:10, fontWeight:700, color:"#BE123C", background:"#FFF1F2", padding:"1px 7px", borderRadius:999, marginRight:8, textTransform:"uppercase" }}>
                            0 θεραπευτές
                          </span>
                        )}
                        {!gap && (
                          <span style={{ fontSize:11, color:"#94A3B8", marginRight:8 }}>{a.therapists} θερ.</span>
                        )}
                        <span style={{ fontSize:13, fontWeight:700, color:"#0F172A", minWidth:22, textAlign:"right" }}>{a.count}</span>
                      </div>
                      <div style={{ height:8, background:"#F1F5F9", borderRadius:99, overflow:"hidden" }}>
                        <div style={{ width:`${(a.count / maxAreaCount) * 100}%`, height:"100%", background: gap ? "#BE123C" : "#7E22CE", borderRadius:99 }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {topAreas.some(a => a.therapists === 0) && (
                <div style={{ marginTop:14, padding:"10px 12px", background:"#FFF1F2", border:"1px solid #FECDD3", borderRadius:9, fontSize:11, color:"#9F1239", lineHeight:1.5 }}>
                  Υπάρχει ζήτηση σε περιοχές χωρίς κανέναν εγκεκριμένο θεραπευτή. Προτεραιότητα στην προσέλκυση συνεργατών εκεί.
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Εκκρεμότητες + Δραστηριότητα */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }} className="dash-bottom">

        {/* Εκκρεμότητες */}
        <div style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:14, padding:"18px 20px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:14 }}>
            <AlertTriangle size={17} color="#B45309" strokeWidth={2.2}/>
            <span style={{ fontSize:14, fontWeight:700, color:"#0F172A" }}>Εκκρεμότητες</span>
            {totalTasks > 0 && (
              <span style={{ marginLeft:"auto", background:"#F59E0B", color:"#fff", fontSize:11, fontWeight:700, padding:"2px 9px", borderRadius:999 }}>
                {totalTasks}
              </span>
            )}
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {TASKS.map(t => (
              <div key={t.label} onClick={()=>t.count > 0 && onNavigate && onNavigate(t.page)}
                style={{
                  display:"flex", alignItems:"center", gap:10, padding:"10px 12px",
                  background: t.count > 0 ? "#F8FAFC" : "transparent",
                  borderRadius:9,
                  cursor: t.count > 0 ? "pointer" : "default",
                  opacity: t.count > 0 ? 1 : 0.5,
                }}>
                <span style={{ flex:1, fontSize:13, fontWeight: t.count > 0 ? 600 : 500, color: t.count > 0 ? "#0F172A" : "#94A3B8" }}>
                  {t.label}
                </span>
                <span style={{ fontSize:16, fontWeight:700, color: t.count > 0 ? t.color : "#CBD5E1", minWidth:22, textAlign:"right" }}>
                  {t.count}
                </span>
                {t.count > 0 && <ArrowRight size={13} color={t.color}/>}
              </div>
            ))}
          </div>

          {totalTasks > 0 && (
            <button onClick={()=>onNavigate && onNavigate("tasks")}
              style={{ width:"100%", marginTop:12, padding:"9px", borderRadius:9, border:"1px solid #FDE68A", background:"#FFFBEB", color:"#B45309", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"inline-flex", alignItems:"center", justifyContent:"center", gap:6 }}>
              Άνοιγμα όλων των εκκρεμοτήτων
              <ArrowRight size={13}/>
            </button>
          )}
        </div>

        {/* Πρόσφατη δραστηριότητα */}
        <div style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:14, padding:"18px 20px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:14 }}>
            <Activity size={17} color="#0891B2" strokeWidth={2.2}/>
            <span style={{ fontSize:14, fontWeight:700, color:"#0F172A" }}>Πρόσφατη δραστηριότητα</span>
          </div>

          {activity.length === 0 ? (
            <div style={{ fontSize:13, color:"#94A3B8", padding:"12px 0" }}>Δεν υπάρχει καταγεγραμμένη δραστηριότητα ακόμα.</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10, maxHeight:300, overflowY:"auto" }}>
              {activity.map(a => {
                const ev = EVENT_ICONS[a.event_type] || { Icon: Activity, color: "#64748B" };
                const EIcon = ev.Icon;
                return (
                  <div key={a.id} style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                    <div style={{
                      width:26, height:26, borderRadius:"50%", flexShrink:0,
                      background:"#fff", border:`1.5px solid ${ev.color}`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                    }}>
                      <EIcon size={12} color={ev.color} strokeWidth={2.2}/>
                    </div>
                    <div style={{ flex:1, minWidth:0, paddingTop:2 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:"#0F172A" }}>{a.description}</div>
                      <div style={{ fontSize:10, color:"#94A3B8", marginTop:1 }}>
                        {fmtDateTime(a.created_at)}
                        {a.actor_role ? ` · ${a.actor_role}` : ""}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 1100px) {
          .dash-kpis { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 860px) {
          .dash-today { grid-template-columns: 1fr !important; }
          .dash-bottom { grid-template-columns: 1fr !important; }
          .dash-kpis { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}