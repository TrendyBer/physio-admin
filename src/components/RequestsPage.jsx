"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  MapPin, Home, Stethoscope, Calendar, MessageSquare, XCircle, CheckCircle2,
  Trash2, Search, Clock, User, Euro, Tag, Activity, Plus, AlertTriangle,
  UserPlus, RefreshCw, Ban, CircleCheck, X, Send, Download,
} from "lucide-react";
import { exportToCsv, csvDate } from "../lib/exportCsv";

// Ποιος ακύρωσε — για εμφάνιση στον admin
const CANCELLED_BY = {
  therapist: "από τον θεραπευτή",
  patient:   "από τον ασθενή",
  admin:     "από την πλατφόρμα",
  system:    "αυτόματα",
};

const STATUS_MAP = {
  pending:   { label:"Εκκρεμές",      bg:"#FEF3C7", color:"#92400E" },
  confirmed: { label:"Επιβεβαιωμένο", bg:"#DBEAFE", color:"#1D4ED8" },
  completed: { label:"Ολοκληρώθηκε",  bg:"#D1FAE5", color:"#065F46" },
  cancelled: { label:"Ακυρώθηκε",     bg:"#FFE4E6", color:"#9F1239" },
  cancelled_by_admin:     { label:"Ακυρώθηκε (admin)",      bg:"#FFE4E6", color:"#9F1239" },
  cancelled_by_patient:   { label:"Ακυρώθηκε (ασθενής)",    bg:"#FFE4E6", color:"#9F1239" },
  cancelled_by_therapist: { label:"Ακυρώθηκε (θεραπευτής)", bg:"#FFE4E6", color:"#9F1239" },
};

const TYPE_MAP = {
  booking:         { label:"Κράτηση",          bg:"#DBEAFE", color:"#1E40AF" },
  free_assessment: { label:"Δωρεάν Εκτίμηση",  bg:"#FEF3C7", color:"#92400E" },
};

// Καταστάσεις πληρωμής (πίνακας `payments`)
const PAY_STATUS = {
  unpaid:         { label:"Απλήρωτο",        bg:"#FEF3C7", color:"#B45309" },
  partially_paid: { label:"Μερική είσπραξη", bg:"#FEF3C7", color:"#B45309" },
  paid:           { label:"Εισπράχθηκε",     bg:"#D1FAE5", color:"#065F46" },
  pending_payout: { label:"Προς θεραπευτή",  bg:"#DBEAFE", color:"#1D4ED8" },
  paid_out:       { label:"Πληρώθηκε",       bg:"#E0E7FF", color:"#4338CA" },
  refunded:       { label:"Επιστροφή",       bg:"#FFE4E6", color:"#9F1239" },
  failed:         { label:"Απέτυχε",         bg:"#FFE4E6", color:"#9F1239" },
};

const COLLECTED = ["paid", "pending_payout", "paid_out"];

const isCancelled = (s) => (s || "").startsWith("cancelled");

// Λόγοι ακύρωσης — κωδικός + ετικέτα
const CANCEL_REASONS = [
  { code: "patient_cancelled",  label: "Ο ασθενής ακύρωσε" },
  { code: "no_therapist",       label: "Δεν βρέθηκε διαθέσιμος θεραπευτής" },
  { code: "area_not_served",    label: "Η περιοχή δεν εξυπηρετείται" },
  { code: "therapist_no_reply", label: "Ο θεραπευτής δεν απάντησε" },
  { code: "wrong_details",      label: "Λάθος στοιχεία ασθενή" },
  { code: "duplicate",          label: "Διπλό αίτημα" },
  { code: "other",              label: "Άλλος λόγος" },
];

// Support tags για αιτήματα
const SUPPORT_TAGS = [
  "Επείγον",
  "Θέλει follow-up",
  "Πρόβλημα πληρωμής",
  "Πρόβλημα θεραπευτή",
  "Πρόβλημα ασθενή",
  "Χρειάζεται αλλαγή ώρας",
  "Χρειάζεται αλλαγή θεραπευτή",
  "Παράπονο",
  "Προτεραιότητα",
  "Χρειάζεται τηλεφώνημα",
];

const DAYS_EL = ['Κυρ', 'Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ'];

const EVENT_ICONS = {
  created:        { Icon: Plus,         color: "#1D4ED8" },
  assigned:       { Icon: UserPlus,     color: "#7E22CE" },
  status_changed: { Icon: RefreshCw,    color: "#0891B2" },
  confirmed:      { Icon: CheckCircle2, color: "#15803D" },
  completed:      { Icon: CircleCheck,  color: "#7C3AED" },
  cancelled:      { Icon: Ban,          color: "#BE123C" },
  paid:           { Icon: Euro,         color: "#15803D" },
  note_added:     { Icon: MessageSquare,color: "#B45309" },
};

function Badge({ label, bg, color }) {
  return <span style={{ background:bg, color, padding:"2px 10px", borderRadius:999, fontSize:11, fontWeight:700, letterSpacing:"0.04em", textTransform:"uppercase", whiteSpace:"nowrap" }}>{label}</span>;
}

function Avatar({ name, size=40 }) {
  return <div style={{ width:size, height:size, borderRadius:"50%", background:"#FFF7ED", color:"#C2410C", display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.33, fontWeight:700, flexShrink:0 }}>{(name||"?").split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}</div>;
}

function fmtDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("el-GR", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" });
}

function daysAgo(d) {
  if (!d) return 0;
  return Math.floor((Date.now() - new Date(d).getTime()) / (1000*60*60*24));
}

// ─── CANCEL MODAL ──────────────────────────────────────────────────────────
function CancelModal({ onConfirm, onClose }) {
  const [code, setCode] = useState("");
  const [comment, setComment] = useState("");

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1100, padding:24 }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:"#fff", borderRadius:18, width:"100%", maxWidth:460, padding:"26px 28px", boxShadow:"0 20px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
          <AlertTriangle size={20} color="#BE123C" strokeWidth={2.2} />
          <h3 style={{ fontSize:17, fontWeight:700, color:"#0F172A", margin:0 }}>Ακύρωση αιτήματος</h3>
        </div>
        <p style={{ fontSize:13, color:"#64748B", marginBottom:18 }}>Επιλέξτε τον λόγο ακύρωσης. Καταγράφεται στο ιστορικό.</p>

        <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:16 }}>
          {CANCEL_REASONS.map(r => (
            <label key={r.code} style={{
              display:"flex", alignItems:"center", gap:10, padding:"10px 14px",
              border:`1.5px solid ${code===r.code ? "#BE123C" : "#E2E8F0"}`,
              background: code===r.code ? "#FFF1F2" : "#fff",
              borderRadius:10, cursor:"pointer", fontSize:13,
              color: code===r.code ? "#9F1239" : "#475569",
              fontWeight: code===r.code ? 600 : 500,
            }}>
              <input type="radio" name="cancel_reason" value={r.code} checked={code===r.code}
                onChange={()=>setCode(r.code)} style={{ accentColor:"#BE123C" }} />
              {r.label}
            </label>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={e=>setComment(e.target.value)}
          placeholder="Σχόλιο admin (προαιρετικό)"
          rows={3}
          style={{ width:"100%", padding:"10px 14px", border:"1px solid #E2E8F0", borderRadius:10, fontSize:13, fontFamily:"inherit", color:"#0F172A", outline:"none", resize:"vertical", boxSizing:"border-box", marginBottom:16 }}
        />

        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ padding:"9px 18px", borderRadius:8, border:"1px solid #E2E8F0", background:"transparent", color:"#64748B", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
            Άκυρο
          </button>
          <button
            onClick={()=>onConfirm(code, comment)}
            disabled={!code}
            style={{ padding:"9px 20px", borderRadius:8, border:"none", background: code ? "#BE123C" : "#CBD5E1", color:"#fff", fontSize:13, fontWeight:600, cursor: code ? "pointer" : "not-allowed", fontFamily:"inherit" }}>
            Ακύρωση αιτήματος
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ASSIGN THERAPIST MODAL ────────────────────────────────────────────────
function AssignModal({ therapists, current, onConfirm, onClose }) {
  const [pick, setPick] = useState(current || "");
  const [q, setQ] = useState("");

  const list = therapists.filter(t =>
    ((t.name||"") + (t.specialty||"") + (t.area||"")).toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1100, padding:24 }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:"#fff", borderRadius:18, width:"100%", maxWidth:480, maxHeight:"80vh", display:"flex", flexDirection:"column", boxShadow:"0 20px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ padding:"24px 28px 16px", borderBottom:"1px solid #F1F5F9" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
            <UserPlus size={20} color="#1D4ED8" strokeWidth={2.2} />
            <h3 style={{ fontSize:17, fontWeight:700, color:"#0F172A", margin:0 }}>
              {current ? "Αλλαγή θεραπευτή" : "Ανάθεση θεραπευτή"}
            </h3>
          </div>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Αναζήτηση θεραπευτή..."
            style={{ width:"100%", padding:"9px 14px", border:"1px solid #E2E8F0", borderRadius:8, fontSize:13, fontFamily:"inherit", color:"#0F172A", outline:"none", boxSizing:"border-box" }} />
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"12px 20px" }}>
          {list.length === 0 ? (
            <div style={{ padding:24, textAlign:"center", color:"#94A3B8", fontSize:13 }}>Δεν βρέθηκαν θεραπευτές</div>
          ) : list.map(t => (
            <div key={t.id} onClick={()=>setPick(t.id)}
              style={{
                display:"flex", alignItems:"center", gap:12, padding:"10px 14px", marginBottom:5,
                border:`1.5px solid ${pick===t.id ? "#1D4ED8" : "#E2E8F0"}`,
                background: pick===t.id ? "#EFF6FF" : "#fff",
                borderRadius:10, cursor:"pointer",
              }}>
              <Avatar name={t.name} size={34} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#0F172A" }}>{t.name}</div>
                <div style={{ fontSize:11, color:"#64748B" }}>
                  {t.specialty || "—"}{t.area ? ` · ${t.area}` : ""}
                  {t.price_per_session ? ` · ${t.price_per_session}€` : ""}
                </div>
              </div>
              {pick===t.id && <CheckCircle2 size={17} color="#1D4ED8" />}
            </div>
          ))}
        </div>

        <div style={{ padding:"16px 28px", borderTop:"1px solid #F1F5F9", display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ padding:"9px 18px", borderRadius:8, border:"1px solid #E2E8F0", background:"transparent", color:"#64748B", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
            Άκυρο
          </button>
          <button onClick={()=>onConfirm(pick)} disabled={!pick}
            style={{ padding:"9px 20px", borderRadius:8, border:"none", background: pick ? "#1D4ED8" : "#CBD5E1", color:"#fff", fontSize:13, fontWeight:600, cursor: pick ? "pointer" : "not-allowed", fontFamily:"inherit" }}>
            Ανάθεση
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DETAIL MODAL (case file) ──────────────────────────────────────────────
function RequestModal({ request, therapists, adminUser, onClose, onRefresh }) {
  const [tab, setTab] = useState("details");
  const [notes, setNotes] = useState([]);
  const [activity, setActivity] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [tags, setTags] = useState(request.support_tags || []);
  const [busy, setBusy] = useState(false);

  // Οι ακυρωμένες συνεδρίες κρατούν τον λόγο — όχι το αίτημα
  const cancelledBookings = (request.bookings || []).filter(b => isCancelled(b.status));

  const st = STATUS_MAP[request.status] || STATUS_MAP.pending;
  const typeMap = TYPE_MAP[request.type] || TYPE_MAP.booking;
  const pay = request.payment;

  useEffect(() => { loadNotesAndActivity(); }, [request.id]);

  async function loadNotesAndActivity() {
    const [{ data: n }, { data: a }] = await Promise.all([
      supabase.from("request_notes").select("*").eq("request_id", request.id).order("created_at", { ascending: false }),
      supabase.from("request_activity").select("*").eq("request_id", request.id).order("created_at", { ascending: false }),
    ]);
    setNotes(n || []);
    setActivity(a || []);
  }

  async function addNote() {
    if (!newNote.trim()) return;
    setSavingNote(true);
    await supabase.from("request_notes").insert({
      request_id: request.id,
      body: newNote.trim(),
      author_id: adminUser?.id || null,
      author_email: adminUser?.email || null,
    });
    await supabase.from("request_activity").insert({
      request_id: request.id,
      event_type: "note_added",
      description: "Προστέθηκε εσωτερική σημείωση",
      actor_id: adminUser?.id || null,
      actor_email: adminUser?.email || null,
      actor_role: "admin",
    });
    setNewNote("");
    setSavingNote(false);
    await loadNotesAndActivity();
    await onRefresh();
  }

  async function deleteNote(id) {
    await supabase.from("request_notes").delete().eq("id", id);
    await loadNotesAndActivity();
    await onRefresh();
  }

  async function setStatus(newStatus) {
    setBusy(true);
    await supabase.from("session_requests").update({ status: newStatus }).eq("id", request.id);
    setBusy(false);
    await onRefresh();
    onClose();
  }

  // ΠΡΟΣΟΧΗ: η πληρωμή γράφεται στον πίνακα `payments`, ΟΧΙ στο session_requests.is_paid
  async function markPaid() {
    if (!pay) {
      alert("Δεν υπάρχει εγγραφή πληρωμής για αυτό το αίτημα.\nΔημιουργείται αυτόματα όταν ανατίθεται θεραπευτής.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("payments").update({ status: "paid" }).eq("id", pay.id);
    if (error) alert("Σφάλμα: " + error.message);
    setBusy(false);
    await onRefresh();
    onClose();
  }

  async function doCancel(code, comment) {
    setBusy(true);
    const label = CANCEL_REASONS.find(r => r.code === code)?.label || "Άλλος λόγος";
    await supabase.from("session_requests").update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancel_reason_code: code,
      cancelled_reason: label,
      admin_comment: comment || null,
    }).eq("id", request.id);
    setShowCancel(false);
    setBusy(false);
    await onRefresh();
    onClose();
  }

  async function doAssign(therapistId) {
    setBusy(true);
    await supabase.from("session_requests").update({ therapist_id: therapistId }).eq("id", request.id);
    setShowAssign(false);
    setBusy(false);
    await onRefresh();
    onClose();
  }

  async function toggleTag(tag) {
    const next = tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag];
    setTags(next);
    await supabase.from("session_requests").update({ support_tags: next }).eq("id", request.id);
    await onRefresh();
  }

  async function doDelete() {
    await supabase.from("session_bookings").delete().eq("request_id", request.id);
    const { error } = await supabase.from("session_requests").delete().eq("id", request.id);
    if (error) { alert("Σφάλμα διαγραφής: " + error.message); return; }
    await onRefresh();
    onClose();
  }

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
            <Avatar name={request.patient_name} size={52}/>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                <h2 style={{ fontSize:18, fontWeight:700, color:"#0F172A", margin:0 }}>{request.patient_name || "—"}</h2>
                <Badge label={st.label} bg={st.bg} color={st.color}/>
                <Badge label={typeMap.label} bg={typeMap.bg} color={typeMap.color}/>
                {pay && <Badge label={PAY_STATUS[pay.status]?.label || "—"} bg={PAY_STATUS[pay.status]?.bg || "#F1F5F9"} color={PAY_STATUS[pay.status]?.color || "#64748B"}/>}
              </div>
              <div style={{ fontSize:12, color:"#94A3B8", marginTop:3, display:"inline-flex", alignItems:"center", gap:5 }}>
                <Clock size={12}/> {fmtDateTime(request.created_at)}
              </div>
            </div>
            <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#94A3B8", padding:4, display:"flex" }}>
              <X size={20}/>
            </button>
          </div>

          {/* ── SLA ──
              Το ρολόι ξεκινά από το notified_at, ΟΧΙ από τη δημιουργία.
              Αν το notified_at είναι κενό, ο θεραπευτής δεν ειδοποιήθηκε ποτέ
              και το αίτημα κάθεται αόρατο — αυτό είναι το χειρότερο σενάριο
              και πρέπει να φαίνεται αμέσως, όχι θαμμένο σε καρτέλα. */}
          {request.type === "booking" && request.status === "pending" && (
            <div style={{ padding:"0 28px", flexShrink:0 }}>
              {(() => {
                const notified = request.notified_at;
                const due = request.sla_due_at;
                const overdue = due && new Date(due) < new Date();
                const style = !notified
                  ? { bg:"#FEF2F2", br:"#FECACA", fg:"#BE123C" }
                  : overdue
                    ? { bg:"#FFFBEB", br:"#FDE68A", fg:"#B45309" }
                    : { bg:"#F0FDF4", br:"#BBF7D0", fg:"#15803D" };
                return (
                  <div style={{
                    background: style.bg, border:`1px solid ${style.br}`, borderRadius:10,
                    padding:"10px 14px", marginTop:12, fontSize:12.5, color: style.fg,
                    display:"flex", alignItems:"flex-start", gap:8, lineHeight:1.6,
                  }}>
                    <AlertTriangle size={14} strokeWidth={2.2} style={{ marginTop:1, flexShrink:0 }}/>
                    <span>
                      {!notified
                        ? "Ο θεραπευτής ΔΕΝ έχει ειδοποιηθεί. Το SLA ρολόι δεν έχει ξεκινήσει — το αίτημα μπορεί να μείνει αναπάντητο χωρίς να το μάθει κανείς."
                        : overdue
                          ? `Εκπρόθεσμο. Ειδοποιήθηκε ${fmtDateTime(notified)}, προθεσμία ${fmtDateTime(due)}.`
                          : `Ειδοποιήθηκε ${fmtDateTime(notified)}${due ? ` · προθεσμία ${fmtDateTime(due)}` : ""}.`}
                      {request.needs_support && <strong> · Σημειωμένο για υποστήριξη.</strong>}
                    </span>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Tabs */}
          <div style={{ padding:"14px 28px 0", flexShrink:0 }}>
            <div style={{ display:"inline-flex", gap:4, background:"#E2E8F0", padding:4, borderRadius:10 }}>
              <button onClick={()=>setTab("details")}  style={tabStyle(tab==="details")}>
                <User size={14}/> Στοιχεία
              </button>
              <button onClick={()=>setTab("notes")}    style={tabStyle(tab==="notes")}>
                <MessageSquare size={14}/> Σημειώσεις
                {notes.length > 0 && <span style={{ fontSize:11, color:"#1D4ED8" }}>{notes.length}</span>}
              </button>
              <button onClick={()=>setTab("timeline")} style={tabStyle(tab==="timeline")}>
                <Activity size={14}/> Ιστορικό
              </button>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding:"20px 28px", overflowY:"auto", flex:1 }}>

            {/* ── TAB: ΣΤΟΙΧΕΙΑ ── */}
            {tab === "details" && (
              <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
                {/* Address */}
                <div style={{ background:"#EFF6FF", border:"1px solid #BFDBFE", borderRadius:10, padding:"12px 16px" }}>
                  <div style={{ fontSize:11, fontWeight:700, color:"#1D4ED8", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6, display:"inline-flex", alignItems:"center", gap:5 }}>
                    <MapPin size={12}/> Διεύθυνση
                  </div>
                  <div style={{ fontSize:14, color:"#0F172A", fontWeight:600 }}>
                    {request.address || "—"}{request.area ? `, ${request.area}` : ""}{request.postal_code ? `, ${request.postal_code}` : ""}
                  </div>
                  {request.floor_info && (
                    <div style={{ fontSize:12, color:"#64748B", marginTop:4, display:"inline-flex", alignItems:"center", gap:5 }}>
                      <Home size={12}/> {request.floor_info}
                    </div>
                  )}
                </div>

                {/* Problem */}
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Πρόβλημα</div>
                  <div style={{ background:"#FFF7ED", border:"1px solid #FED7AA", borderRadius:10, padding:"12px 16px" }}>
                    {request.problem_type && (
                      <div style={{ fontSize:13, fontWeight:700, color:"#C2410C", marginBottom:6 }}>{request.problem_type}</div>
                    )}
                    <p style={{ fontSize:14, color:"#475569", lineHeight:1.6, margin:0 }}>
                      {request.problem_description || "Χωρίς περιγραφή"}
                    </p>
                  </div>
                </div>

                {/* Therapist */}
                <div style={{ background: request.therapist_name ? "#FAF5FF" : "#FFFBEB", border:`1px solid ${request.therapist_name ? "#E9D5FF" : "#FDE68A"}`, borderRadius:10, padding:"12px 16px", display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:11, fontWeight:700, color: request.therapist_name ? "#7E22CE" : "#B45309", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4, display:"inline-flex", alignItems:"center", gap:5 }}>
                      <Stethoscope size={12}/> Θεραπευτής
                    </div>
                    {request.therapist_name ? (
                      <>
                        <div style={{ fontSize:14, fontWeight:700, color:"#0F172A" }}>{request.therapist_name}</div>
                        {request.therapist_specialty && (
                          <div style={{ fontSize:12, color:"#64748B", marginTop:2 }}>{request.therapist_specialty}</div>
                        )}
                      </>
                    ) : (
                      <div style={{ fontSize:13, color:"#92400E", fontWeight:600 }}>Δεν έχει ανατεθεί</div>
                    )}
                  </div>
                  <button onClick={()=>setShowAssign(true)}
                    style={{ padding:"7px 14px", borderRadius:8, border:"1px solid #E2E8F0", background:"#fff", color:"#1D4ED8", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"inline-flex", alignItems:"center", gap:5, flexShrink:0 }}>
                    <UserPlus size={13}/>
                    {request.therapist_name ? "Αλλαγή" : "Ανάθεση"}
                  </button>
                </div>

                {/* Payment */}
                {pay && (
                  <div style={{ background:"#F8FAFC", border:"1px solid #E2E8F0", borderRadius:10, padding:"12px 16px" }}>
                    <div style={{ fontSize:11, fontWeight:700, color:"#475569", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6, display:"inline-flex", alignItems:"center", gap:5 }}>
                      <Euro size={12}/> Πληρωμή
                    </div>
                    <div style={{ display:"flex", gap:16, flexWrap:"wrap", fontSize:13, color:"#0F172A" }}>
                      <span><strong>Προμήθεια:</strong> {pay.amount}€</span>
                      {pay.patient_amount && <span><strong>Ασθενής:</strong> {pay.patient_amount}€</span>}
                      {pay.therapist_net && <span><strong>Θεραπευτής:</strong> {pay.therapist_net}€</span>}
                      <Badge label={PAY_STATUS[pay.status]?.label || "—"} bg={PAY_STATUS[pay.status]?.bg || "#F1F5F9"} color={PAY_STATUS[pay.status]?.color || "#64748B"}/>
                    </div>
                  </div>
                )}

                {/* Bookings */}
                {request.bookings && request.bookings.length > 0 && (
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8, display:"inline-flex", alignItems:"center", gap:5 }}>
                      <Calendar size={12}/> Συνεδρίες ({request.bookings.length})
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                      {request.bookings.map((b, i) => {
                        const bSt = STATUS_MAP[b.status] || STATUS_MAP.pending;
                        const d = new Date(b.session_date + 'T12:00:00');
                        const cancelled = isCancelled(b.status);
                        return (
                          <div key={b.id} style={{
                            display:"flex", flexDirection:"column", gap:5, padding:"9px 12px",
                            background: cancelled ? "#FEF2F2" : "#F8FAFC",
                            border: cancelled ? "1px solid #FECACA" : "none",
                            borderRadius:8, fontSize:12,
                          }}>
                            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                              <span style={{ color:"#64748B", fontWeight:600 }}>{i+1}.</span>
                              <span style={{ color:"#0F172A", fontWeight:500, flex:1 }}>
                                {DAYS_EL[d.getDay()]} {d.toLocaleDateString('el-GR', { day:'2-digit', month:'2-digit' })} στις {b.session_time?.slice(0, 5)}
                              </span>
                              <Badge label={bSt.label} bg={bSt.bg} color={bSt.color}/>
                            </div>
                            {cancelled && (
                              <div style={{ fontSize:11.5, color:"#991B1B", paddingLeft:20 }}>
                                {CANCELLED_BY[b.cancelled_by_role] || CANCELLED_BY.admin}
                                {b.cancelled_reason && (
                                  <span style={{ color:"#78350F", fontStyle:"italic" }}> · {b.cancelled_reason}</span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Support tags */}
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8, display:"inline-flex", alignItems:"center", gap:5 }}>
                    <Tag size={12}/> Ετικέτες
                  </div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {SUPPORT_TAGS.map(t => {
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

                {/* ΛΟΓΟΣ ΑΚΥΡΩΣΗΣ
                    Ο λόγος γράφεται στο session_bookings.cancelled_reason
                    από τη cancel_booking(). Το session_requests ΔΕΝ έχει
                    στήλη cancelled_reason — γι' αυτό έδειχνε πάντα «—». */}
                {(isCancelled(request.status) || cancelledBookings.length > 0) && (
                  <div style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:10, padding:"14px 16px" }}>
                    <div style={{ fontSize:11, fontWeight:700, color:"#BE123C", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10, display:"inline-flex", alignItems:"center", gap:5 }}>
                      <XCircle size={12}/> Λόγος Ακύρωσης
                    </div>

                    {cancelledBookings.length > 0 ? (
                      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                        {cancelledBookings.map(b => {
                          const cd = new Date(b.session_date + 'T12:00:00');
                          return (
                          <div key={b.id}>
                            <div style={{ fontSize:12.5, fontWeight:700, color:"#991B1B", marginBottom:3 }}>
                              {DAYS_EL[cd.getDay()]} {cd.toLocaleDateString('el-GR', { day:'2-digit', month:'2-digit' })} στις {b.session_time?.slice(0,5)}
                              <span style={{ fontWeight:500, marginLeft:8 }}>
                                {CANCELLED_BY[b.cancelled_by_role] || CANCELLED_BY.admin}
                              </span>
                            </div>
                            <div style={{
                              fontSize:13,
                              color: b.cancelled_reason ? "#78350F" : "#94A3B8",
                              fontStyle: b.cancelled_reason ? "italic" : "normal",
                            }}>
                              {b.cancelled_reason || "Δεν δόθηκε αιτιολογία"}
                            </div>
                            {b.cancellation_hours_before != null && (
                              <div style={{ fontSize:11, color: Number(b.cancellation_hours_before) < 24 ? "#BE123C" : "#94A3B8", marginTop:3, fontWeight: Number(b.cancellation_hours_before) < 24 ? 700 : 400 }}>
                                {Math.round(b.cancellation_hours_before)}h πριν τη συνεδρία
                                {Number(b.cancellation_hours_before) < 24 && " — strike"}
                              </div>
                            )}
                          </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ fontSize:13, color:"#991B1B", fontWeight:600 }}>
                        {request.admin_comment || "Δεν δόθηκε αιτιολογία"}
                      </div>
                    )}

                    {request.admin_comment && cancelledBookings.length > 0 && (
                      <div style={{ fontSize:12, color:"#B91C1C", marginTop:10, paddingTop:10, borderTop:"1px solid #FECACA", fontStyle:"italic" }}>
                        Σχόλιο admin: {request.admin_comment}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── TAB: ΣΗΜΕΙΩΣΕΙΣ ── */}
            {tab === "notes" && (
              <div>
                <div style={{ display:"flex", gap:8, marginBottom:18 }}>
                  <textarea
                    value={newNote}
                    onChange={e=>setNewNote(e.target.value)}
                    placeholder="Εσωτερική σημείωση (μόνο ο admin τη βλέπει)..."
                    rows={2}
                    style={{ flex:1, padding:"10px 14px", border:"1px solid #E2E8F0", borderRadius:10, fontSize:13, fontFamily:"inherit", color:"#0F172A", outline:"none", resize:"vertical" }}
                  />
                  <button onClick={addNote} disabled={!newNote.trim() || savingNote}
                    style={{ padding:"10px 16px", borderRadius:10, border:"none", background: newNote.trim() ? "#1D4ED8" : "#CBD5E1", color:"#fff", fontSize:13, fontWeight:600, cursor: newNote.trim() ? "pointer" : "not-allowed", fontFamily:"inherit", alignSelf:"flex-start", display:"inline-flex", alignItems:"center", gap:6 }}>
                    <Send size={14}/>
                    {savingNote ? "..." : "Προσθήκη"}
                  </button>
                </div>

                {notes.length === 0 ? (
                  <div style={{ padding:32, textAlign:"center", color:"#94A3B8", fontSize:13, background:"#F8FAFC", borderRadius:12, border:"1px dashed #E2E8F0" }}>
                    Δεν υπάρχουν σημειώσεις ακόμα.
                  </div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {notes.map(n => (
                      <div key={n.id} style={{ background:"#FFFBEB", border:"1px solid #FDE68A", borderRadius:10, padding:"12px 14px" }}>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                          <span style={{ fontSize:11, color:"#92400E", fontWeight:700 }}>{n.author_email || "Admin"}</span>
                          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                            <span style={{ fontSize:11, color:"#B45309" }}>{fmtDateTime(n.created_at)}</span>
                            <button onClick={()=>deleteNote(n.id)} style={{ background:"none", border:"none", cursor:"pointer", color:"#DC2626", padding:0, display:"flex" }}>
                              <Trash2 size={13}/>
                            </button>
                          </div>
                        </div>
                        <p style={{ fontSize:13, color:"#78350F", lineHeight:1.6, margin:0, whiteSpace:"pre-wrap" }}>{n.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── TAB: ΙΣΤΟΡΙΚΟ ── */}
            {tab === "timeline" && (
              <div>
                {activity.length === 0 ? (
                  <div style={{ padding:32, textAlign:"center", color:"#94A3B8", fontSize:13, background:"#F8FAFC", borderRadius:12, border:"1px dashed #E2E8F0" }}>
                    Δεν υπάρχει καταγεγραμμένη δραστηριότητα.
                  </div>
                ) : (
                  <div style={{ position:"relative", paddingLeft:8 }}>
                    {activity.map((a, i) => {
                      const ev = EVENT_ICONS[a.event_type] || { Icon: Activity, color: "#64748B" };
                      const EIcon = ev.Icon;
                      const isLast = i === activity.length - 1;
                      return (
                        <div key={a.id} style={{ display:"flex", gap:14, position:"relative", paddingBottom: isLast ? 0 : 18 }}>
                          {!isLast && (
                            <div style={{ position:"absolute", left:15, top:32, bottom:0, width:2, background:"#E2E8F0" }} />
                          )}
                          <div style={{
                            width:32, height:32, borderRadius:"50%", flexShrink:0, zIndex:1,
                            background:"#fff", border:`2px solid ${ev.color}`,
                            display:"flex", alignItems:"center", justifyContent:"center",
                          }}>
                            <EIcon size={14} color={ev.color} strokeWidth={2.2}/>
                          </div>
                          <div style={{ flex:1, paddingTop:5 }}>
                            <div style={{ fontSize:13, fontWeight:600, color:"#0F172A" }}>{a.description}</div>
                            <div style={{ fontSize:11, color:"#94A3B8", marginTop:2 }}>
                              {fmtDateTime(a.created_at)}
                              {a.actor_email ? ` · ${a.actor_email}` : a.actor_role ? ` · ${a.actor_role}` : ""}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions footer */}
          <div style={{ padding:"16px 28px", borderTop:"1px solid #F1F5F9", display:"flex", gap:10, flexWrap:"wrap", alignItems:"center", flexShrink:0 }}>
            {request.status === "pending" && (
              <>
                <button onClick={()=>setStatus("confirmed")} disabled={busy}
                  style={{ padding:"8px 18px", borderRadius:8, border:"none", background:"#15803D", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", display:"inline-flex", alignItems:"center", gap:6 }}>
                  <CheckCircle2 size={15}/> Επιβεβαίωση
                </button>
                <button onClick={()=>setShowCancel(true)} disabled={busy}
                  style={{ padding:"8px 18px", borderRadius:8, border:"1px solid #FECDD3", background:"transparent", color:"#BE123C", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", display:"inline-flex", alignItems:"center", gap:6 }}>
                  <XCircle size={15}/> Ακύρωση
                </button>
              </>
            )}

            {request.status === "confirmed" && (
              <>
                <button onClick={()=>setStatus("completed")} disabled={busy}
                  style={{ padding:"8px 18px", borderRadius:8, border:"none", background:"#7C3AED", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", display:"inline-flex", alignItems:"center", gap:6 }}>
                  <CircleCheck size={15}/> Ολοκλήρωση
                </button>
                <button onClick={()=>setShowCancel(true)} disabled={busy}
                  style={{ padding:"8px 18px", borderRadius:8, border:"1px solid #FECDD3", background:"transparent", color:"#BE123C", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", display:"inline-flex", alignItems:"center", gap:6 }}>
                  <XCircle size={15}/> Ακύρωση
                </button>
              </>
            )}

            {request.status === "completed" && pay && !COLLECTED.includes(pay.status) && (
              <button onClick={markPaid} disabled={busy}
                style={{ padding:"8px 18px", borderRadius:8, border:"none", background:"#15803D", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", display:"inline-flex", alignItems:"center", gap:6 }}>
                <Euro size={15}/> Είσπραξη προμήθειας ({pay.amount}€)
              </button>
            )}

            <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center" }}>
              {!confirmDelete ? (
                <button onClick={()=>setConfirmDelete(true)}
                  style={{ padding:"8px 14px", borderRadius:8, border:"1px solid #FECACA", background:"#FEF2F2", color:"#DC2626", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", display:"inline-flex", alignItems:"center", gap:5 }}>
                  <Trash2 size={13}/> Διαγραφή
                </button>
              ) : (
                <div style={{ display:"flex", alignItems:"center", gap:8, background:"#FEF2F2", padding:"6px 12px", borderRadius:8, border:"1px solid #FECACA" }}>
                  <span style={{ fontSize:12, color:"#DC2626", fontWeight:600 }}>Σίγουρα;</span>
                  <button onClick={doDelete} style={{ padding:"4px 12px", borderRadius:6, border:"none", background:"#DC2626", color:"#fff", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Ναι</button>
                  <button onClick={()=>setConfirmDelete(false)} style={{ padding:"4px 12px", borderRadius:6, border:"1px solid #E2E8F0", background:"transparent", color:"#64748B", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Όχι</button>
                </div>
              )}
              <button onClick={onClose} style={{ padding:"8px 18px", borderRadius:8, border:"1px solid #E2E8F0", background:"transparent", color:"#64748B", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                Κλείσιμο
              </button>
            </div>
          </div>
        </div>
      </div>

      {showCancel && <CancelModal onConfirm={doCancel} onClose={()=>setShowCancel(false)} />}
      {showAssign && (
        <AssignModal
          therapists={therapists}
          current={request.therapist_id}
          onConfirm={doAssign}
          onClose={()=>setShowAssign(false)}
        />
      )}
    </>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────
export default function RequestsPage() {
  const [requests, setRequests] = useState([]);
  const [therapistList, setTherapistList] = useState([]);
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterTherapist, setFilterTherapist] = useState("all");
  const [filterArea, setFilterArea] = useState("all");
  const [filterProblem, setFilterProblem] = useState("all");
  const [filterPaid, setFilterPaid] = useState("all");   // all | collected | open | none
  const [filterNotes, setFilterNotes] = useState("all"); // all | has | none
  const [filterTags, setFilterTags] = useState("all");   // all | has | none
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [needsAction, setNeedsAction] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAdminUser(data?.user || null));
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    const [
      { data: reqs },
      { data: patients },
      { data: therapists },
      { data: bookings },
      { data: payments },
      { data: notes },
    ] = await Promise.all([
      supabase.from("session_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("patient_profiles").select("id, name"),
      supabase.from("therapist_profiles").select("id, name, specialty, area, price_per_session").order("name"),
      supabase.from("session_bookings").select("*").order("session_date", { ascending: true }),
      supabase.from("payments").select("*"),
      supabase.from("request_notes").select("request_id"),
    ]);

    const patientMap = {};
    (patients || []).forEach(p => { patientMap[p.id] = p.name; });

    const therapistMap = {};
    (therapists || []).forEach(t => { therapistMap[t.id] = t; });

    const bookingsByRequest = {};
    (bookings || []).forEach(b => {
      if (!bookingsByRequest[b.request_id]) bookingsByRequest[b.request_id] = [];
      bookingsByRequest[b.request_id].push(b);
    });

    const paymentByRequest = {};
    (payments || []).forEach(p => {
      if (p.request_id) paymentByRequest[p.request_id] = { ...p, status: p.status || (p.paid ? "paid" : "unpaid") };
    });

    const notesCount = {};
    (notes || []).forEach(n => { notesCount[n.request_id] = (notesCount[n.request_id] || 0) + 1; });

    const enriched = (reqs || []).map(r => ({
      ...r,
      patient_name: patientMap[r.patient_id] || "Άγνωστο",
      therapist_name: therapistMap[r.therapist_id]?.name || null,
      therapist_specialty: therapistMap[r.therapist_id]?.specialty || null,
      bookings: bookingsByRequest[r.id] || [],
      payment: paymentByRequest[r.id] || null,
      notesCount: notesCount[r.id] || 0,
      support_tags: r.support_tags || [],
    }));

    setRequests(enriched);
    setTherapistList(therapists || []);
    setLoading(false);
  }

  const counts = {
    all:       requests.length,
    pending:   requests.filter(r=>r.status==="pending").length,
    confirmed: requests.filter(r=>r.status==="confirmed").length,
    completed: requests.filter(r=>r.status==="completed").length,
    cancelled: requests.filter(r=>isCancelled(r.status)).length,
  };

  const typeCounts = {
    all:             requests.length,
    booking:         requests.filter(r=>r.type==="booking").length,
    free_assessment: requests.filter(r=>r.type==="free_assessment").length,
  };

  // "Χρειάζεται ενέργεια"
  function isNeedsAction(r) {
    if (isCancelled(r.status)) return false;
    if (!r.therapist_id && r.status !== "completed") return true;
    if (r.status === "confirmed" && r.bookings.length === 0) return true;
    if (r.status === "completed" && r.payment && !COLLECTED.includes(r.payment.status) && r.type !== "free_assessment") return true;
    if ((r.support_tags || []).length > 0) return true;
    return false;
  }

  const needsActionCount = requests.filter(isNeedsAction).length;

  const uniqueAreas = Array.from(new Set(requests.map(r => r.area).filter(Boolean))).sort((a,b)=>a.localeCompare(b,"el"));
  const uniqueProblems = Array.from(new Set(requests.map(r => r.problem_type).filter(Boolean))).sort((a,b)=>a.localeCompare(b,"el"));

  const filtered = requests.filter(r => {
    if (filterType !== "all" && r.type !== filterType) return false;

    if (filterStatus !== "all") {
      if (filterStatus === "cancelled") { if (!isCancelled(r.status)) return false; }
      else if (r.status !== filterStatus) return false;
    }

    if (filterTherapist !== "all") {
      if (filterTherapist === "none") { if (r.therapist_id) return false; }
      else if (r.therapist_id !== filterTherapist) return false;
    }

    if (filterArea !== "all" && r.area !== filterArea) return false;
    if (filterProblem !== "all" && r.problem_type !== filterProblem) return false;

    if (filterPaid !== "all") {
      if (filterPaid === "none" && r.payment) return false;
      if (filterPaid === "collected" && !(r.payment && COLLECTED.includes(r.payment.status))) return false;
      if (filterPaid === "open" && !(r.payment && !COLLECTED.includes(r.payment.status))) return false;
    }

    if (filterNotes === "has" && r.notesCount === 0) return false;
    if (filterNotes === "none" && r.notesCount > 0) return false;

    if (filterTags === "has" && (r.support_tags || []).length === 0) return false;
    if (filterTags === "none" && (r.support_tags || []).length > 0) return false;

    if (dateFrom && new Date(r.created_at) < new Date(dateFrom + "T00:00:00")) return false;
    if (dateTo && new Date(r.created_at) > new Date(dateTo + "T23:59:59")) return false;

    if (needsAction && !isNeedsAction(r)) return false;

    if (search.trim()) {
      const hay = ((r.patient_name||"") + (r.area||"") + (r.address||"") + (r.problem_type||"") + (r.problem_description||"") + (r.therapist_name||"")).toLowerCase();
      if (!hay.includes(search.trim().toLowerCase())) return false;
    }
    return true;
  });

  function clearFilters() {
    setFilterType("all"); setFilterStatus("all"); setFilterTherapist("all");
    setFilterArea("all"); setFilterProblem("all"); setFilterPaid("all");
    setFilterNotes("all"); setFilterTags("all");
    setDateFrom(""); setDateTo(""); setNeedsAction(false); setSearch("");
  }

  const activeFilters = [
    filterType !== "all", filterStatus !== "all", filterTherapist !== "all",
    filterArea !== "all", filterProblem !== "all", filterPaid !== "all",
    filterNotes !== "all", filterTags !== "all", !!dateFrom, !!dateTo,
    needsAction, !!search.trim(),
  ].filter(Boolean).length;

  // Εξαγωγή CSV — ό,τι φαίνεται στα τρέχοντα φίλτρα
  function handleExport() {
    const columns = [
      { key: "id",             label: "ID Αιτήματος" },
      { key: "created",        label: "Ημερομηνία" },
      { key: "patient",        label: "Ασθενής" },
      { key: "type",           label: "Τύπος" },
      { key: "status",         label: "Κατάσταση" },
      { key: "address",        label: "Διεύθυνση" },
      { key: "area",           label: "Περιοχή" },
      { key: "postal",         label: "ΤΚ" },
      { key: "floor",          label: "Όροφος" },
      { key: "problem",        label: "Περιστατικό" },
      { key: "description",    label: "Περιγραφή" },
      { key: "therapist",      label: "Θεραπευτής" },
      { key: "sessions",       label: "Αριθμός Συνεδριών" },
      { key: "patientAmount",  label: "Ποσό Ασθενή" },
      { key: "commission",     label: "Προμήθεια" },
      { key: "therapistNet",   label: "Καθαρό Θεραπευτή" },
      { key: "notifiedAt",     label: "Ειδοποιήθηκε" },
      { key: "slaDueAt",       label: "Προθεσμία SLA" },
      { key: "respondedAt",    label: "Απάντησε" },
      { key: "payStatus",      label: "Κατάσταση Πληρωμής" },
      { key: "paidAt",         label: "Ημ. Είσπραξης" },
      { key: "cancelReason",   label: "Λόγος Ακύρωσης" },
      { key: "adminComment",   label: "Σχόλιο Admin" },
      { key: "notes",          label: "Αριθμός Σημειώσεων" },
      { key: "tags",           label: "Ετικέτες" },
    ];

    const rows = filtered.map(r => ({
      id:            r.id,
      created:       csvDate(r.created_at),
      patient:       r.patient_name,
      type:          TYPE_MAP[r.type]?.label || r.type,
      status:        STATUS_MAP[r.status]?.label || r.status,
      address:       r.address,
      area:          r.area,
      postal:        r.postal_code,
      floor:         r.floor_info,
      problem:       r.problem_type,
      description:   r.problem_description,
      therapist:     r.therapist_name || "Χωρίς θεραπευτή",
      sessions:      r.bookings?.length || 0,
      patientAmount: r.payment?.patient_amount || "",
      commission:    r.payment?.amount || "",
      therapistNet:  r.payment?.therapist_net || "",
      notifiedAt:    csvDate(r.notified_at),
      slaDueAt:      csvDate(r.sla_due_at),
      respondedAt:   csvDate(r.responded_at),
      payStatus:     r.payment ? (PAY_STATUS[r.payment.status]?.label || r.payment.status) : "Χωρίς εγγραφή",
      paidAt:        csvDate(r.payment?.paid_at),
      cancelReason:  r.cancelled_reason,
      adminComment:  r.admin_comment,
      notes:         r.notesCount,
      tags:          r.support_tags || [],
    }));

    exportToCsv("aitimata", columns, rows);
  }

  const selectStyle = { padding:"8px 12px", borderRadius:8, border:"1px solid #E2E8F0", fontSize:12, fontFamily:"inherit", background:"#fff", color:"#0F172A", outline:"none", cursor:"pointer", minWidth:140 };
  const dateStyle = { padding:"8px 10px", borderRadius:8, border:"1px solid #E2E8F0", fontSize:12, fontFamily:"inherit", background:"#fff", color:"#0F172A", outline:"none" };

  if (loading) return (
    <div style={{ padding:24, display:"flex", alignItems:"center", justifyContent:"center", minHeight:400 }}>
      <div style={{ fontSize:16, color:"#64748B" }}>Φόρτωση αιτημάτων...</div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom:24, display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:16, flexWrap:"wrap" }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:700, color:"#0F172A", margin:0 }}>Αιτήματα</h1>
          <p style={{ fontSize:13, color:"#94A3B8", marginTop:4 }}>Φάκελοι περιστατικών — στοιχεία, σημειώσεις, ιστορικό</p>
        </div>
        <button onClick={handleExport} disabled={filtered.length === 0}
          style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"9px 18px", borderRadius:8, border:"1px solid #E2E8F0", background:"#fff", color: filtered.length ? "#1D4ED8" : "#CBD5E1", fontSize:13, fontWeight:600, cursor: filtered.length ? "pointer" : "not-allowed", fontFamily:"inherit" }}>
          <Download size={15}/>
          Εξαγωγή CSV ({filtered.length})
        </button>
      </div>

      {/* KPI Stats */}
      <div style={{ display:"flex", gap:14, marginBottom:20, flexWrap:"wrap" }}>
        {[
          { label:"Εκκρεμή",       value:counts.pending,    bg:"#FFFBEB", border:"#FDE68A", text:"#B45309" },
          { label:"Επιβεβαιωμένα", value:counts.confirmed,  bg:"#EFF6FF", border:"#BFDBFE", text:"#1D4ED8" },
          { label:"Ολοκληρωμένα",  value:counts.completed,  bg:"#F0FDF4", border:"#BBF7D0", text:"#15803D" },
          { label:"Ακυρωμένα",     value:counts.cancelled,  bg:"#FFF1F2", border:"#FECDD3", text:"#BE123C" },
          { label:"Συνολικά",      value:counts.all,        bg:"#F8FAFC", border:"#E2E8F0", text:"#475569" },
        ].map(c => (
          <div key={c.label} style={{ flex:1, minWidth:120, background:c.bg, border:`1px solid ${c.border}`, borderRadius:12, padding:"16px 20px" }}>
            <div style={{ fontSize:11, fontWeight:700, color:c.text, textTransform:"uppercase", letterSpacing:"0.05em" }}>{c.label}</div>
            <div style={{ fontSize:32, fontWeight:700, color:c.text, lineHeight:1.1, marginTop:4 }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Needs action toggle */}
      {needsActionCount > 0 && (
        <div
          onClick={()=>setNeedsAction(!needsAction)}
          style={{
            background: needsAction ? "#B45309" : "#FFFBEB",
            border:`1px solid ${needsAction ? "#B45309" : "#FDE68A"}`,
            borderRadius:12, padding:"12px 18px", marginBottom:16,
            display:"flex", alignItems:"center", gap:12, cursor:"pointer",
          }}>
          <AlertTriangle size={18} color={needsAction ? "#fff" : "#B45309"} strokeWidth={2.2}/>
          <div style={{ flex:1, fontSize:13, color: needsAction ? "#fff" : "#92400E", fontWeight:600 }}>
            <strong>{needsActionCount}</strong> {needsActionCount === 1 ? "αίτημα χρειάζεται" : "αιτήματα χρειάζονται"} ενέργεια
          </div>
          <span style={{ fontSize:12, fontWeight:700, color: needsAction ? "#fff" : "#B45309" }}>
            {needsAction ? "Εμφάνιση όλων" : "Φιλτράρισμα"}
          </span>
        </div>
      )}

      {/* Type filter */}
      <div style={{ display:"flex", gap:12, marginBottom:12, alignItems:"center", flexWrap:"wrap" }}>
        <span style={{ fontSize:12, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.05em", minWidth:80 }}>Τύπος:</span>
        <div style={{ display:"flex", gap:4, background:"#E2E8F0", padding:4, borderRadius:10 }}>
          {[
            ["all", "Όλα"],
            ["booking", "Κρατήσεις"],
            ["free_assessment", "Δωρεάν Εκτιμήσεις"],
          ].map(([val,label])=>(
            <button key={val} onClick={()=>setFilterType(val)} style={{ padding:"6px 14px", borderRadius:7, border:"none", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", background:filterType===val?"#fff":"transparent", color:filterType===val?"#0F172A":"#64748B", boxShadow:filterType===val?"0 1px 4px rgba(0,0,0,0.1)":"none" }}>
              {label} <span style={{ marginLeft:4, fontSize:11, color:filterType===val?"#1D4ED8":"#94A3B8" }}>{typeCounts[val]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Status filter */}
      <div style={{ display:"flex", gap:12, marginBottom:12, alignItems:"center", flexWrap:"wrap" }}>
        <span style={{ fontSize:12, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.05em", minWidth:80 }}>Κατάσταση:</span>
        <div style={{ display:"flex", gap:4, background:"#E2E8F0", padding:4, borderRadius:10, flexWrap:"wrap" }}>
          {[
            ["all", "Όλα"],
            ["pending", "Εκκρεμή"],
            ["confirmed", "Επιβεβαιωμένα"],
            ["completed", "Ολοκληρωμένα"],
            ["cancelled", "Ακυρωμένα"],
          ].map(([val,label])=>(
            <button key={val} onClick={()=>setFilterStatus(val)} style={{ padding:"6px 14px", borderRadius:7, border:"none", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", background:filterStatus===val?"#fff":"transparent", color:filterStatus===val?"#0F172A":"#64748B", boxShadow:filterStatus===val?"0 1px 4px rgba(0,0,0,0.1)":"none" }}>
              {label} <span style={{ marginLeft:4, fontSize:11, color:filterStatus===val?"#1D4ED8":"#94A3B8" }}>{counts[val]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Advanced filters — row 1 */}
      <div style={{ display:"flex", gap:10, marginBottom:10, alignItems:"center", flexWrap:"wrap" }}>
        <select value={filterTherapist} onChange={e=>setFilterTherapist(e.target.value)} style={selectStyle}>
          <option value="all">Όλοι οι θεραπευτές</option>
          <option value="none">Χωρίς θεραπευτή</option>
          {therapistList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>

        <select value={filterArea} onChange={e=>setFilterArea(e.target.value)} style={selectStyle}>
          <option value="all">Όλες οι περιοχές</option>
          {uniqueAreas.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <select value={filterProblem} onChange={e=>setFilterProblem(e.target.value)} style={selectStyle}>
          <option value="all">Όλα τα περιστατικά</option>
          {uniqueProblems.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <select value={filterPaid} onChange={e=>setFilterPaid(e.target.value)} style={selectStyle}>
          <option value="all">Πληρωμή: όλα</option>
          <option value="collected">Εισπραγμένα</option>
          <option value="open">Απλήρωτα</option>
          <option value="none">Χωρίς εγγραφή πληρωμής</option>
        </select>
      </div>

      {/* Advanced filters — row 2 */}
      <div style={{ display:"flex", gap:10, marginBottom:20, alignItems:"center", flexWrap:"wrap" }}>
        <select value={filterNotes} onChange={e=>setFilterNotes(e.target.value)} style={selectStyle}>
          <option value="all">Σημειώσεις: όλα</option>
          <option value="has">Με σημειώσεις</option>
          <option value="none">Χωρίς σημειώσεις</option>
        </select>

        <select value={filterTags} onChange={e=>setFilterTags(e.target.value)} style={selectStyle}>
          <option value="all">Ετικέτες: όλα</option>
          <option value="has">Με ετικέτα</option>
          <option value="none">Χωρίς ετικέτα</option>
        </select>

        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontSize:12, color:"#94A3B8", fontWeight:600 }}>Από</span>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={dateStyle} />
          <span style={{ fontSize:12, color:"#94A3B8", fontWeight:600 }}>έως</span>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={dateStyle} />
        </div>

        <div style={{ position:"relative", flex:1, minWidth:180 }}>
          <Search size={14} color="#94A3B8" style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }} />
          <input type="text" placeholder="Αναζήτηση..." value={search} onChange={e=>setSearch(e.target.value)}
            style={{ width:"100%", padding:"9px 14px 9px 34px", borderRadius:8, border:"1px solid #E2E8F0", fontSize:13, fontFamily:"inherit", background:"#fff", outline:"none", color:"#0F172A", boxSizing:"border-box" }}/>
        </div>

        {activeFilters > 0 && (
          <button onClick={clearFilters}
            style={{ padding:"8px 14px", borderRadius:8, border:"1px solid #FDE68A", background:"#FFFBEB", color:"#B45309", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", display:"inline-flex", alignItems:"center", gap:5, whiteSpace:"nowrap" }}>
            <X size={13}/> Καθαρισμός ({activeFilters})
          </button>
        )}
      </div>

      {/* Results count */}
      <div style={{ fontSize:12, color:"#94A3B8", marginBottom:12, fontWeight:600 }}>
        {filtered.length} {filtered.length === 1 ? "αποτέλεσμα" : "αποτελέσματα"}
      </div>

      {/* Requests list */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {filtered.length === 0 ? (
          <div style={{ padding:40, textAlign:"center", color:"#94A3B8", fontSize:14, background:"#fff", borderRadius:14, border:"1px solid #E2E8F0" }}>
            {requests.length === 0 ? "Δεν υπάρχουν αιτήματα ακόμα." : "Δεν βρέθηκαν αιτήματα με αυτά τα φίλτρα"}
          </div>
        ) : filtered.map(r => {
          const st = STATUS_MAP[r.status] || STATUS_MAP.pending;
          const typeMap = TYPE_MAP[r.type] || TYPE_MAP.booking;
          const flagged = isNeedsAction(r);
          const age = daysAgo(r.created_at);
          const pay = r.payment;
          return (
            <div key={r.id} onClick={()=>setSelected(r)}
              style={{ background:"#fff", borderRadius:14, border:`1px solid ${flagged ? "#FDE68A" : "#E2E8F0"}`, padding:"16px 20px", display:"flex", alignItems:"flex-start", gap:14, cursor:"pointer", transition:"all .15s" }}
              onMouseEnter={e=>{ e.currentTarget.style.background="#FAFAFA"; }}
              onMouseLeave={e=>{ e.currentTarget.style.background="#fff"; }}>

              <Avatar name={r.patient_name}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:4 }}>
                  <span style={{ fontWeight:700, fontSize:15, color:"#0F172A" }}>{r.patient_name}</span>
                  <Badge label={st.label} bg={st.bg} color={st.color}/>
                  <Badge label={typeMap.label} bg={typeMap.bg} color={typeMap.color}/>
                  {pay && COLLECTED.includes(pay.status) && <Badge label="Εισπράχθηκε" bg="#D1FAE5" color="#065F46"/>}
                  {flagged && (
                    <span style={{ display:"inline-flex", alignItems:"center", gap:4, background:"#FFFBEB", color:"#B45309", border:"1px solid #FDE68A", padding:"2px 8px", borderRadius:999, fontSize:10, fontWeight:700, textTransform:"uppercase" }}>
                      <AlertTriangle size={10}/> Ενέργεια
                    </span>
                  )}
                  {/* Ο θεραπευτής δεν έμαθε ποτέ ότι υπάρχει αίτημα.
                      Χωρίς αυτό το σήμα, το αίτημα κάθεται αόρατο. */}
                  {r.type === "booking" && r.status === "pending" && r.therapist_id && !r.notified_at && (
                    <span style={{ display:"inline-flex", alignItems:"center", gap:4, background:"#FEF2F2", color:"#BE123C", border:"1px solid #FECACA", padding:"2px 8px", borderRadius:999, fontSize:10, fontWeight:700, textTransform:"uppercase" }}>
                      <AlertTriangle size={10}/> Δεν ειδοποιήθηκε
                    </span>
                  )}
                  {r.sla_due_at && r.status === "pending" && new Date(r.sla_due_at) < new Date() && (
                    <span style={{ display:"inline-flex", alignItems:"center", gap:4, background:"#FFF7ED", color:"#C2410C", border:"1px solid #FED7AA", padding:"2px 8px", borderRadius:999, fontSize:10, fontWeight:700, textTransform:"uppercase" }}>
                      <Clock size={10}/> Εκπρόθεσμο
                    </span>
                  )}
                </div>

                <div style={{ fontSize:12, color:"#1D4ED8", fontWeight:500, marginBottom:5, display:"inline-flex", alignItems:"center", gap:4 }}>
                  <MapPin size={12}/> {r.address || "—"}{r.area ? `, ${r.area}` : ""}
                </div>

                <div style={{ fontSize:12, color:"#94A3B8", marginBottom:6, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                  <span>{fmtDateTime(r.created_at)}</span>
                  {age >= 2 && r.status === "pending" && (
                    <span style={{ color:"#BE123C", fontWeight:700 }}>· {age} μέρες σε αναμονή</span>
                  )}
                  {r.notesCount > 0 && (
                    <span style={{ color:"#B45309", fontWeight:600, display:"inline-flex", alignItems:"center", gap:3 }}>
                      · <MessageSquare size={11}/> {r.notesCount}
                    </span>
                  )}
                </div>

                <div style={{ fontSize:13, color:"#475569", background:"#F8FAFC", padding:"8px 12px", borderRadius:8, borderLeft:"3px solid #CBD5E1" }}>
                  {r.problem_type ? <strong>{r.problem_type}</strong> : ""}
                  {r.problem_description ? ` — ${r.problem_description}` : ""}
                  {!r.problem_type && !r.problem_description && "Χωρίς περιγραφή"}
                </div>

                <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginTop:6, alignItems:"center" }}>
                  {r.therapist_name ? (
                    <span style={{ fontSize:12, color:"#7E22CE", fontWeight:600, display:"inline-flex", alignItems:"center", gap:4 }}>
                      <Stethoscope size={12}/> {r.therapist_name}
                    </span>
                  ) : (
                    <span style={{ fontSize:12, color:"#B45309", fontWeight:600, display:"inline-flex", alignItems:"center", gap:4 }}>
                      <UserPlus size={12}/> Χωρίς θεραπευτή
                    </span>
                  )}
                  {r.bookings && r.bookings.length > 0 && (
                    <span style={{ fontSize:12, color:"#15803D", fontWeight:600, display:"inline-flex", alignItems:"center", gap:4 }}>
                      <Calendar size={12}/> {r.bookings.length} {r.bookings.length === 1 ? "συνεδρία" : "συνεδρίες"}
                    </span>
                  )}
                  {pay && (
                    <span style={{ fontSize:12, color: COLLECTED.includes(pay.status) ? "#15803D" : "#BE123C", fontWeight:600, display:"inline-flex", alignItems:"center", gap:4 }}>
                      <Euro size={12}/> {pay.amount}€ {COLLECTED.includes(pay.status) ? "" : "εκκρεμεί"}
                    </span>
                  )}
                </div>

                {(r.support_tags || []).length > 0 && (
                  <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginTop:8 }}>
                    {r.support_tags.map(t => (
                      <span key={t} style={{ fontSize:11, fontWeight:600, color:"#1D4ED8", background:"#EFF6FF", border:"1px solid #BFDBFE", padding:"2px 9px", borderRadius:999 }}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ flexShrink:0, fontSize:11, color:"#94A3B8" }}>Λεπτομέρειες →</div>
            </div>
          );
        })}
      </div>

      {selected && (
        <RequestModal
          request={selected}
          therapists={therapistList}
          adminUser={adminUser}
          onClose={()=>setSelected(null)}
          onRefresh={fetchAll}
        />
      )}
    </div>
  );
}