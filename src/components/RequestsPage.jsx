"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const STATUS_MAP = {
  pending:   { label:"Εκκρεμές",     bg:"#FEF3C7", color:"#92400E" },
  confirmed: { label:"Επιβεβαιωμένο", bg:"#DBEAFE", color:"#1D4ED8" },
  completed: { label:"Ολοκληρώθηκε", bg:"#D1FAE5", color:"#065F46" },
  cancelled: { label:"Ακυρώθηκε",    bg:"#FFE4E6", color:"#9F1239" },
};

const TYPE_MAP = {
  booking:         { label:"📅 Κράτηση",        bg:"#DBEAFE", color:"#1E40AF" },
  free_assessment: { label:"🆓 Δωρεάν Εκτίμηση", bg:"#FEF3C7", color:"#92400E" },
};

function Badge({ label, bg, color }) {
  return <span style={{ background:bg, color, padding:"2px 10px", borderRadius:999, fontSize:11, fontWeight:700, letterSpacing:"0.04em", textTransform:"uppercase", whiteSpace:"nowrap" }}>{label}</span>;
}

function Avatar({ name, size=40 }) {
  return <div style={{ width:size, height:size, borderRadius:"50%", background:"#FFF7ED", color:"#C2410C", display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.33, fontWeight:700, flexShrink:0 }}>{(name||"?").split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}</div>;
}

const DAYS_EL = ['Κυρ', 'Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ'];

// ─── DETAIL MODAL ──────────────────────────────────────────────────────────
function RequestModal({ request, onClose, onUpdateStatus, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const st = STATUS_MAP[request.status] || STATUS_MAP.pending;
  const typeMap = TYPE_MAP[request.type] || TYPE_MAP.booking;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:24 }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:"#fff", borderRadius:18, width:"100%", maxWidth:680, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>

        {/* Header */}
        <div style={{ padding:"24px 28px 20px", borderBottom:"1px solid #F1F5F9", display:"flex", alignItems:"flex-start", gap:16 }}>
          <Avatar name={request.patient_name} size={52}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
              <h2 style={{ fontSize:18, fontWeight:700, color:"#0F172A", margin:0 }}>{request.patient_name || "—"}</h2>
              <Badge label={st.label} bg={st.bg} color={st.color}/>
              <Badge label={typeMap.label} bg={typeMap.bg} color={typeMap.color}/>
            </div>
            <div style={{ fontSize:12, color:"#94A3B8", marginTop:3 }}>
              Δημιουργήθηκε: {new Date(request.created_at).toLocaleDateString("el-GR", { day:"2-digit", month:"2-digit", year:"numeric" })}
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#94A3B8" }}>✕</button>
        </div>

        <div style={{ padding:"20px 28px", display:"flex", flexDirection:"column", gap:18 }}>
          {/* Address */}
          <div style={{ background:"#EFF6FF", border:"1px solid #BFDBFE", borderRadius:10, padding:"12px 16px" }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#1D4ED8", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>📍 Διεύθυνση</div>
            <div style={{ fontSize:14, color:"#0F172A", fontWeight:600 }}>
              {request.address || "—"}{request.area ? `, ${request.area}` : ""}{request.postal_code ? `, ${request.postal_code}` : ""}
            </div>
            {request.floor_info && <div style={{ fontSize:12, color:"#64748B", marginTop:4 }}>🏠 {request.floor_info}</div>}
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

          {/* Session info */}
          {request.type === "booking" && (
            <div style={{ background:"#F0FDF4", border:"1px solid #BBF7D0", borderRadius:10, padding:"12px 16px" }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#15803D", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>Στοιχεία Κράτησης</div>
              <div style={{ fontSize:13, color:"#0F172A", display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <div>
                  <span style={{ color:"#64748B" }}>Τύπος: </span>
                  <strong>{request.session_type === "single" ? "Μεμονωμένη" : `Πακέτο ${request.package_size || "?"} συνεδρίες`}</strong>
                </div>
                <div>
                  <span style={{ color:"#64748B" }}>Συνεδρίες: </span>
                  <strong>{request.bookings?.length || 0}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Bookings list */}
          {request.bookings && request.bookings.length > 0 && (
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>📅 Συνεδρίες ({request.bookings.length})</div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {request.bookings.map((b, i) => {
                  const bSt = STATUS_MAP[b.status] || STATUS_MAP.pending;
                  const d = new Date(b.session_date + 'T12:00:00');
                  return (
                    <div key={b.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", background:"#F8FAFC", borderRadius:8, fontSize:12 }}>
                      <span style={{ color:"#64748B", fontWeight:600 }}>{i+1}.</span>
                      <span style={{ color:"#0F172A", fontWeight:500, flex:1 }}>
                        {DAYS_EL[d.getDay()]} {d.toLocaleDateString('el-GR', { day:'2-digit', month:'2-digit' })} στις {b.session_time?.slice(0, 5)}
                      </span>
                      <Badge label={bSt.label} bg={bSt.bg} color={bSt.color}/>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Therapist */}
          {request.therapist_name && (
            <div style={{ background:"#FAF5FF", border:"1px solid #E9D5FF", borderRadius:10, padding:"12px 16px" }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#7E22CE", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>👨‍⚕️ Θεραπευτής</div>
              <div style={{ fontSize:14, fontWeight:700, color:"#0F172A" }}>{request.therapist_name}</div>
              {request.therapist_specialty && (
                <div style={{ fontSize:12, color:"#64748B", marginTop:2 }}>{request.therapist_specialty}</div>
              )}
            </div>
          )}

          {/* Notes */}
          {request.notes && (
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>💬 Σημειώσεις</div>
              <p style={{ fontSize:13, color:"#475569", lineHeight:1.5, margin:0, fontStyle:"italic", background:"#F8FAFC", padding:"10px 14px", borderRadius:8 }}>
                {request.notes}
              </p>
            </div>
          )}

          {/* Cancellation */}
          {request.status === "cancelled" && request.cancelled_reason && (
            <div style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:10, padding:"12px 16px" }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#BE123C", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>❌ Λόγος Ακύρωσης</div>
              <div style={{ fontSize:13, color:"#991B1B" }}>{request.cancelled_reason}</div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display:"flex", gap:10, paddingTop:8, borderTop:"1px solid #F1F5F9", flexWrap:"wrap" }}>
            {request.status === "pending" && (
              <>
                <button onClick={()=>{ onUpdateStatus(request.id, "confirmed"); onClose(); }} style={{ padding:"8px 18px", borderRadius:8, border:"none", background:"#15803D", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                  ✓ Επιβεβαίωση
                </button>
                <button onClick={()=>{ onUpdateStatus(request.id, "cancelled"); onClose(); }} style={{ padding:"8px 18px", borderRadius:8, border:"1px solid #FECDD3", background:"transparent", color:"#BE123C", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                  ✕ Ακύρωση
                </button>
              </>
            )}
            {request.status === "confirmed" && (
              <button onClick={()=>{ onUpdateStatus(request.id, "completed"); onClose(); }} style={{ padding:"8px 18px", borderRadius:8, border:"none", background:"#7C3AED", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                ✓ Ολοκλήρωση
              </button>
            )}

            <div style={{ marginLeft:"auto" }}>
              {!confirmDelete ? (
                <button onClick={()=>setConfirmDelete(true)} style={{ padding:"8px 14px", borderRadius:8, border:"1px solid #FECACA", background:"#FEF2F2", color:"#DC2626", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                  🗑 Διαγραφή
                </button>
              ) : (
                <div style={{ display:"flex", alignItems:"center", gap:8, background:"#FEF2F2", padding:"6px 12px", borderRadius:8, border:"1px solid #FECACA" }}>
                  <span style={{ fontSize:12, color:"#DC2626", fontWeight:600 }}>Σίγουρα;</span>
                  <button onClick={()=>{ onDelete(request.id); onClose(); }} style={{ padding:"4px 12px", borderRadius:6, border:"none", background:"#DC2626", color:"#fff", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Ναι</button>
                  <button onClick={()=>setConfirmDelete(false)} style={{ padding:"4px 12px", borderRadius:6, border:"1px solid #E2E8F0", background:"transparent", color:"#64748B", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Όχι</button>
                </div>
              )}
            </div>

            <button onClick={onClose} style={{ padding:"8px 18px", borderRadius:8, border:"1px solid #E2E8F0", background:"transparent", color:"#64748B", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
              Κλείσιμο
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────
export default function RequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [
      { data: reqs },
      { data: patients },
      { data: therapists },
      { data: bookings },
    ] = await Promise.all([
      supabase.from("session_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("patient_profiles").select("id, name"),
      supabase.from("therapist_profiles").select("id, name, specialty"),
      supabase.from("session_bookings").select("*").order("session_date", { ascending: true }),
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

    const enriched = (reqs || []).map(r => ({
      ...r,
      patient_name: patientMap[r.patient_id] || "Άγνωστο",
      therapist_name: therapistMap[r.therapist_id]?.name || null,
      therapist_specialty: therapistMap[r.therapist_id]?.specialty || null,
      bookings: bookingsByRequest[r.id] || [],
    }));

    setRequests(enriched);
    setLoading(false);
  }

  async function updateStatus(id, newStatus) {
    const updates = { status: newStatus };
    if (newStatus === "cancelled") {
      updates.cancelled_at = new Date().toISOString();
      updates.cancelled_reason = "[Admin] Ακυρώθηκε από admin";
    }
    await supabase.from("session_requests").update(updates).eq("id", id);
    await fetchAll();
  }

  async function deleteRequest(id) {
    // First delete bookings
    await supabase.from("session_bookings").delete().eq("request_id", id);
    // Then delete request
    const { error } = await supabase.from("session_requests").delete().eq("id", id);
    if (error) {
      alert("Σφάλμα διαγραφής: " + error.message);
    } else {
      await fetchAll();
    }
  }

  const counts = {
    all:        requests.length,
    pending:    requests.filter(r=>r.status==="pending").length,
    confirmed:  requests.filter(r=>r.status==="confirmed").length,
    completed:  requests.filter(r=>r.status==="completed").length,
    cancelled:  requests.filter(r=>r.status==="cancelled").length,
  };

  const typeCounts = {
    all:             requests.length,
    booking:         requests.filter(r=>r.type==="booking").length,
    free_assessment: requests.filter(r=>r.type==="free_assessment").length,
  };

  const filtered = requests.filter(r => {
    const matchType = filterType === "all" || r.type === filterType;
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    const matchSearch = ((r.patient_name||"") + (r.area||"") + (r.address||"") + (r.problem_type||"") + (r.problem_description||"")).toLowerCase().includes(search.toLowerCase());
    return matchType && matchStatus && matchSearch;
  });

  if (loading) return (
    <div style={{ padding:24, display:"flex", alignItems:"center", justifyContent:"center", minHeight:400 }}>
      <div style={{ fontSize:16, color:"#64748B" }}>Φόρτωση αιτημάτων...</div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:26, fontWeight:700, color:"#0F172A", margin:0 }}>Αιτήματα</h1>
        <p style={{ fontSize:13, color:"#94A3B8", marginTop:4 }}>Διαχείριση όλων των αιτημάτων ασθενών</p>
      </div>

      {/* KPI Stats */}
      <div style={{ display:"flex", gap:14, marginBottom:24, flexWrap:"wrap" }}>
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

      {/* Type filter (booking vs free_assessment) */}
      <div style={{ display:"flex", gap:12, marginBottom:14, alignItems:"center", flexWrap:"wrap" }}>
        <span style={{ fontSize:12, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.05em" }}>Τύπος:</span>
        <div style={{ display:"flex", gap:4, background:"#E2E8F0", padding:4, borderRadius:10 }}>
          {[
            ["all", "Όλα"],
            ["booking", "📅 Κρατήσεις"],
            ["free_assessment", "🆓 Δωρεάν Εκτιμήσεις"],
          ].map(([val,label])=>(
            <button key={val} onClick={()=>setFilterType(val)} style={{ padding:"6px 14px", borderRadius:7, border:"none", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", background:filterType===val?"#fff":"transparent", color:filterType===val?"#0F172A":"#64748B", boxShadow:filterType===val?"0 1px 4px rgba(0,0,0,0.1)":"none" }}>
              {label} <span style={{ marginLeft:4, fontSize:11, color:filterType===val?"#1D4ED8":"#94A3B8" }}>{typeCounts[val]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Status filter */}
      <div style={{ display:"flex", gap:12, marginBottom:20, alignItems:"center", flexWrap:"wrap" }}>
        <span style={{ fontSize:12, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.05em" }}>Κατάσταση:</span>
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
        <input type="text" placeholder="Αναζήτηση..." value={search} onChange={e=>setSearch(e.target.value)}
          style={{ flex:1, minWidth:200, padding:"9px 14px", borderRadius:8, border:"1px solid #E2E8F0", fontSize:13, fontFamily:"inherit", background:"#fff", outline:"none", color:"#0F172A" }}/>
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
          return (
            <div key={r.id} onClick={()=>setSelected(r)} style={{ background:"#fff", borderRadius:14, border:"1px solid #E2E8F0", padding:"16px 20px", display:"flex", alignItems:"flex-start", gap:14, cursor:"pointer", transition:"all .15s" }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor="#CBD5E1"; e.currentTarget.style.background="#FAFAFA"; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor="#E2E8F0"; e.currentTarget.style.background="#fff"; }}>

              <Avatar name={r.patient_name}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:4 }}>
                  <span style={{ fontWeight:700, fontSize:15, color:"#0F172A" }}>{r.patient_name}</span>
                  <Badge label={st.label} bg={st.bg} color={st.color}/>
                  <Badge label={typeMap.label} bg={typeMap.bg} color={typeMap.color}/>
                </div>
                <div style={{ fontSize:12, color:"#1D4ED8", fontWeight:500, marginBottom:6 }}>
                  📍 {r.address || "—"}{r.area ? `, ${r.area}` : ""}
                </div>
                <div style={{ fontSize:12, color:"#94A3B8", marginBottom:6 }}>
                  {new Date(r.created_at).toLocaleDateString("el-GR", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" })}
                </div>
                <div style={{ fontSize:13, color:"#475569", background:"#F8FAFC", padding:"8px 12px", borderRadius:8, borderLeft:"3px solid #CBD5E1" }}>
                  {r.problem_type ? <strong>{r.problem_type}</strong> : ""}
                  {r.problem_description ? ` — ${r.problem_description}` : ""}
                  {!r.problem_type && !r.problem_description && "Χωρίς περιγραφή"}
                </div>
                {r.therapist_name && (
                  <div style={{ fontSize:12, color:"#7E22CE", marginTop:6, fontWeight:600 }}>
                    👨‍⚕️ Θεραπευτής: {r.therapist_name}
                  </div>
                )}
                {r.bookings && r.bookings.length > 0 && (
                  <div style={{ fontSize:12, color:"#15803D", marginTop:4, fontWeight:600 }}>
                    📅 {r.bookings.length} {r.bookings.length === 1 ? "συνεδρία" : "συνεδρίες"}
                  </div>
                )}
              </div>

              <div style={{ flexShrink:0, display:"flex", flexDirection:"column", gap:6, alignItems:"flex-end" }}>
                <div style={{ fontSize:11, color:"#94A3B8" }}>Πάτα για λεπτομέρειες →</div>
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <RequestModal
          request={selected}
          onClose={()=>setSelected(null)}
          onUpdateStatus={updateStatus}
          onDelete={deleteRequest}
        />
      )}
    </div>
  );
}