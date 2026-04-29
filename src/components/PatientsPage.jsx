"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

function Badge({ label, bg, color }) {
  return <span style={{ background:bg, color, padding:"2px 10px", borderRadius:999, fontSize:11, fontWeight:700, letterSpacing:"0.04em", textTransform:"uppercase", whiteSpace:"nowrap" }}>{label}</span>;
}

function Avatar({ name, size=40 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:"#F0FDF4", color:"#15803D", display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.33, fontWeight:700, flexShrink:0 }}>
      {(name||"?").split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
    </div>
  );
}

const STATUS_MAP = {
  pending:   { label:"Εκκρεμές",      bg:"#FEF3C7", color:"#92400E" },
  confirmed: { label:"Επιβεβαιωμένο", bg:"#DBEAFE", color:"#1D4ED8" },
  completed: { label:"Ολοκληρώθηκε", bg:"#D1FAE5", color:"#065F46" },
  cancelled: { label:"Ακυρώθηκε",    bg:"#FFE4E6", color:"#9F1239" },
};

const TYPE_MAP = {
  booking:         { label:"📅 Κράτηση",        bg:"#DBEAFE", color:"#1E40AF" },
  free_assessment: { label:"🆓 Δωρ. Εκτίμηση", bg:"#FEF3C7", color:"#92400E" },
};

// ─── PATIENT MODAL ──────────────────────────────────────────────────────────
function PatientModal({ patient, onClose, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fullAddress = [patient.address, patient.area, patient.city, patient.postal_code].filter(Boolean).join(", ");

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:24 }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:"#fff", borderRadius:18, width:"100%", maxWidth:680, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>

        {/* Header */}
        <div style={{ padding:"24px 28px 20px", borderBottom:"1px solid #F1F5F9", display:"flex", alignItems:"flex-start", gap:16 }}>
          <Avatar name={patient.name} size={56}/>
          <div style={{ flex:1, minWidth:0 }}>
            <h2 style={{ fontSize:20, fontWeight:700, color:"#0F172A", margin:0 }}>{patient.name || "—"}</h2>
            <div style={{ fontSize:13, color:"#64748B", marginTop:4 }}>
              📞 {patient.phone || "—"}
            </div>
            {fullAddress && (
              <div style={{ fontSize:12, color:"#1D4ED8", marginTop:4, fontWeight:500 }}>📍 {fullAddress}</div>
            )}
            <div style={{ fontSize:11, color:"#94A3B8", marginTop:6 }}>
              Εγγραφή: {patient.created_at ? new Date(patient.created_at).toLocaleDateString("el-GR", { day:"2-digit", month:"2-digit", year:"numeric" }) : "—"}
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#94A3B8", padding:4 }}>✕</button>
        </div>

        <div style={{ padding:"20px 28px", display:"flex", flexDirection:"column", gap:18 }}>
          {/* Stats */}
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            <div style={{ flex:1, minWidth:120, background:"#EFF6FF", border:"1px solid #BFDBFE", borderRadius:10, padding:"12px 16px" }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#1D4ED8", textTransform:"uppercase", letterSpacing:"0.05em" }}>Αιτήματα</div>
              <div style={{ fontSize:24, fontWeight:700, color:"#1D4ED8", marginTop:2 }}>{patient.requests?.length || 0}</div>
            </div>
            <div style={{ flex:1, minWidth:120, background:"#F0FDF4", border:"1px solid #BBF7D0", borderRadius:10, padding:"12px 16px" }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#15803D", textTransform:"uppercase", letterSpacing:"0.05em" }}>Συνεδρίες</div>
              <div style={{ fontSize:24, fontWeight:700, color:"#15803D", marginTop:2 }}>{patient.totalBookings || 0}</div>
            </div>
            <div style={{ flex:1, minWidth:120, background:"#FAF5FF", border:"1px solid #E9D5FF", borderRadius:10, padding:"12px 16px" }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#7E22CE", textTransform:"uppercase", letterSpacing:"0.05em" }}>Reviews</div>
              <div style={{ fontSize:24, fontWeight:700, color:"#7E22CE", marginTop:2 }}>{patient.totalReviews || 0}</div>
            </div>
          </div>

          {/* Profile fields */}
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>👤 Στοιχεία Προφίλ</div>
            <div style={{ background:"#F8FAFC", border:"1px solid #E2E8F0", borderRadius:10, padding:"12px 16px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 16px", fontSize:13 }}>
              <div><span style={{ color:"#94A3B8" }}>Περιοχή:</span> <strong style={{ color:"#0F172A" }}>{patient.area || "—"}</strong></div>
              <div><span style={{ color:"#94A3B8" }}>Πόλη:</span> <strong style={{ color:"#0F172A" }}>{patient.city || "—"}</strong></div>
              <div style={{ gridColumn:"1 / -1" }}><span style={{ color:"#94A3B8" }}>Διεύθυνση:</span> <strong style={{ color:"#0F172A" }}>{patient.address || "—"}</strong></div>
              <div><span style={{ color:"#94A3B8" }}>ΤΚ:</span> <strong style={{ color:"#0F172A" }}>{patient.postal_code || "—"}</strong></div>
            </div>
          </div>

          {/* Requests history */}
          {patient.requests && patient.requests.length > 0 ? (
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>📋 Ιστορικό Αιτημάτων</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {patient.requests.map(r => {
                  const st = STATUS_MAP[r.status] || STATUS_MAP.pending;
                  const tm = TYPE_MAP[r.type] || TYPE_MAP.booking;
                  return (
                    <div key={r.id} style={{ background:"#F8FAFC", border:"1px solid #E2E8F0", borderRadius:10, padding:"10px 14px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:4 }}>
                        <Badge label={st.label} bg={st.bg} color={st.color}/>
                        <Badge label={tm.label} bg={tm.bg} color={tm.color}/>
                        <span style={{ fontSize:11, color:"#94A3B8", marginLeft:"auto" }}>
                          {new Date(r.created_at).toLocaleDateString("el-GR", { day:"2-digit", month:"2-digit", year:"numeric" })}
                        </span>
                      </div>
                      <div style={{ fontSize:13, color:"#475569" }}>
                        {r.problem_type ? <strong>{r.problem_type}</strong> : ""}
                        {r.problem_description ? ` — ${r.problem_description}` : (!r.problem_type && "Χωρίς περιγραφή")}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ background:"#F8FAFC", border:"1px solid #E2E8F0", borderRadius:10, padding:"16px", textAlign:"center", fontSize:13, color:"#94A3B8" }}>
              Δεν έχει υποβάλει αιτήματα ακόμα
            </div>
          )}

          {/* User ID */}
          <div style={{ background:"#F8FAFC", borderRadius:10, padding:"10px 14px", fontSize:11, color:"#64748B" }}>
            🆔 User ID: <code style={{ background:"#fff", padding:"1px 6px", borderRadius:4, fontSize:10 }}>{patient.id}</code>
          </div>

          {/* Actions */}
          <div style={{ display:"flex", gap:10, paddingTop:8, borderTop:"1px solid #F1F5F9" }}>
            <button onClick={onClose} style={{ flex:1, padding:"9px 18px", borderRadius:8, border:"1px solid #E2E8F0", background:"transparent", color:"#64748B", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
              Κλείσιμο
            </button>
            {!confirmDelete ? (
              <button onClick={()=>setConfirmDelete(true)} style={{ padding:"9px 18px", borderRadius:8, border:"1px solid #FECACA", background:"#FEF2F2", color:"#DC2626", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                🗑 Διαγραφή Λογαριασμού
              </button>
            ) : (
              <div style={{ display:"flex", alignItems:"center", gap:8, background:"#FEF2F2", padding:"6px 12px", borderRadius:8, border:"1px solid #FECACA" }}>
                <span style={{ fontSize:12, color:"#DC2626", fontWeight:600 }}>Σίγουρα;</span>
                <button onClick={()=>{ onDelete(patient.id); onClose(); }} style={{ padding:"5px 12px", borderRadius:6, border:"none", background:"#DC2626", color:"#fff", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Ναι</button>
                <button onClick={()=>setConfirmDelete(false)} style={{ padding:"5px 12px", borderRadius:6, border:"1px solid #E2E8F0", background:"transparent", color:"#64748B", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Όχι</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────
export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all / active / inactive

  useEffect(() => { fetchPatients(); }, []);

  async function fetchPatients() {
    setLoading(true);
    const [
      { data: profiles },
      { data: requests },
      { data: bookings },
      { data: reviews },
    ] = await Promise.all([
      supabase.from("patient_profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("session_requests").select("*"),
      supabase.from("session_bookings").select("id, request_id"),
      supabase.from("reviews").select("id, patient_id"),
    ]);

    const reqsByPatient = {};
    (requests || []).forEach(r => {
      if (!reqsByPatient[r.patient_id]) reqsByPatient[r.patient_id] = [];
      reqsByPatient[r.patient_id].push(r);
    });

    const bookingsByRequest = {};
    (bookings || []).forEach(b => {
      bookingsByRequest[b.request_id] = (bookingsByRequest[b.request_id] || 0) + 1;
    });

    const reviewsByPatient = {};
    (reviews || []).forEach(r => {
      reviewsByPatient[r.patient_id] = (reviewsByPatient[r.patient_id] || 0) + 1;
    });

    const enriched = (profiles || []).map(p => {
      const myReqs = reqsByPatient[p.id] || [];
      const totalBookings = myReqs.reduce((sum, r) => sum + (bookingsByRequest[r.id] || 0), 0);
      return {
        ...p,
        requests: myReqs.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)),
        totalBookings,
        totalReviews: reviewsByPatient[p.id] || 0,
      };
    });

    setPatients(enriched);
    setLoading(false);
  }

  async function deletePatient(id) {
    // Cascade: delete reviews, bookings, requests, then profile
    const { data: reqs } = await supabase.from("session_requests").select("id").eq("patient_id", id);
    const reqIds = (reqs || []).map(r => r.id);

    if (reqIds.length > 0) {
      await supabase.from("session_bookings").delete().in("request_id", reqIds);
      await supabase.from("session_requests").delete().eq("patient_id", id);
    }
    await supabase.from("reviews").delete().eq("patient_id", id);

    const { error } = await supabase.from("patient_profiles").delete().eq("id", id);
    if (error) {
      alert("Σφάλμα διαγραφής: " + error.message);
    } else {
      await fetchPatients();
    }
  }

  const counts = {
    all:      patients.length,
    active:   patients.filter(p => p.requests && p.requests.length > 0).length,
    inactive: patients.filter(p => !p.requests || p.requests.length === 0).length,
  };

  const filtered = patients.filter(p => {
    const matchFilter =
      filter === "all" ? true :
      filter === "active" ? (p.requests && p.requests.length > 0) :
      filter === "inactive" ? (!p.requests || p.requests.length === 0) : true;
    const haystack = [
      p.name || "",
      p.phone || "",
      p.area || "",
      p.address || "",
      p.city || "",
      p.postal_code || "",
    ].join(" ").toLowerCase();
    const matchSearch = haystack.includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  if (loading) return (
    <div style={{ padding:24, display:"flex", alignItems:"center", justifyContent:"center", minHeight:400 }}>
      <div style={{ fontSize:16, color:"#64748B" }}>Φόρτωση ασθενών...</div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:26, fontWeight:700, color:"#0F172A", margin:0 }}>Χρήστες / Ασθενείς</h1>
        <p style={{ fontSize:13, color:"#94A3B8", marginTop:4 }}>Όλοι οι εγγεγραμμένοι ασθενείς της πλατφόρμας</p>
      </div>

      {/* KPI cards */}
      <div style={{ display:"flex", gap:14, marginBottom:24, flexWrap:"wrap" }}>
        {[
          { label:"Συνολικοί",   value:counts.all,      bg:"#F8FAFC", border:"#E2E8F0", text:"#475569" },
          { label:"Ενεργοί",     value:counts.active,   bg:"#F0FDF4", border:"#BBF7D0", text:"#15803D", sub:"Με αιτήματα" },
          { label:"Ανενεργοί",   value:counts.inactive, bg:"#FFFBEB", border:"#FDE68A", text:"#B45309", sub:"Χωρίς αιτήματα" },
        ].map(c => (
          <div key={c.label} style={{ flex:1, minWidth:140, background:c.bg, border:`1px solid ${c.border}`, borderRadius:12, padding:"16px 20px" }}>
            <div style={{ fontSize:11, fontWeight:700, color:c.text, textTransform:"uppercase", letterSpacing:"0.05em" }}>{c.label}</div>
            <div style={{ fontSize:32, fontWeight:700, color:c.text, lineHeight:1.1, marginTop:4 }}>{c.value}</div>
            {c.sub && <div style={{ fontSize:11, color:c.text, opacity:0.7, marginTop:2 }}>{c.sub}</div>}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:12, marginBottom:20, alignItems:"center", flexWrap:"wrap" }}>
        <div style={{ display:"flex", gap:4, background:"#E2E8F0", padding:4, borderRadius:10 }}>
          {[
            ["all", "Όλοι"],
            ["active", "Ενεργοί"],
            ["inactive", "Ανενεργοί"],
          ].map(([val,label])=>(
            <button key={val} onClick={()=>setFilter(val)} style={{ padding:"6px 14px", borderRadius:7, border:"none", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", background:filter===val?"#fff":"transparent", color:filter===val?"#0F172A":"#64748B", boxShadow:filter===val?"0 1px 4px rgba(0,0,0,0.1)":"none" }}>
              {label} <span style={{ marginLeft:4, fontSize:11, color:filter===val?"#1D4ED8":"#94A3B8" }}>{counts[val]}</span>
            </button>
          ))}
        </div>
        <input type="text" placeholder="Αναζήτηση ονόματος, τηλεφώνου, περιοχής, πόλης..." value={search} onChange={e=>setSearch(e.target.value)}
          style={{ flex:1, minWidth:200, padding:"9px 14px", borderRadius:8, border:"1px solid #E2E8F0", fontSize:13, fontFamily:"inherit", background:"#fff", outline:"none", color:"#0F172A" }}/>
      </div>

      {/* Patients table */}
      <div style={{ background:"#fff", borderRadius:14, border:"1px solid #E2E8F0", overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1.2fr 1.2fr 70px 70px 90px", padding:"10px 20px", background:"#F8FAFC", borderBottom:"1px solid #E2E8F0", fontSize:11, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.05em" }}>
          <span>Ασθενής</span><span>Τηλέφωνο</span><span>Περιοχή</span><span>Αιτ.</span><span>Συν.</span><span></span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding:40, textAlign:"center", color:"#94A3B8", fontSize:14 }}>
            {patients.length === 0 ? "Δεν υπάρχουν ασθενείς ακόμα." : "Δεν βρέθηκαν αποτελέσματα"}
          </div>
        ) : filtered.map((p, i) => (
          <div key={p.id} style={{ display:"grid", gridTemplateColumns:"2fr 1.2fr 1.2fr 70px 70px 90px", padding:"14px 20px", borderTop:i>0?"1px solid #F1F5F9":"none", alignItems:"center", cursor:"pointer" }}
            onClick={()=>setSelected(p)}
            onMouseEnter={e=>e.currentTarget.style.background="#FAFAFA"}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>

            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <Avatar name={p.name}/>
              <div style={{ minWidth:0 }}>
                <div style={{ fontWeight:600, fontSize:14, color:"#0F172A" }}>{p.name || "—"}</div>
                <div style={{ fontSize:11, color:"#94A3B8" }}>
                  {p.created_at ? `Εγγραφή ${new Date(p.created_at).toLocaleDateString("el-GR", { day:"2-digit", month:"2-digit", year:"2-digit" })}` : "—"}
                </div>
              </div>
            </div>

            <div style={{ fontSize:12, color:"#475569" }}>{p.phone || "—"}</div>
            <div style={{ fontSize:12, color:"#1D4ED8", fontWeight:500 }}>{p.area || "—"}</div>

            <div style={{ fontSize:14, fontWeight:700, color:p.requests?.length > 0 ? "#1D4ED8" : "#94A3B8" }}>
              {p.requests?.length || 0}
            </div>
            <div style={{ fontSize:14, fontWeight:700, color:p.totalBookings > 0 ? "#15803D" : "#94A3B8" }}>
              {p.totalBookings || 0}
            </div>

            <button onClick={e=>{ e.stopPropagation(); setSelected(p); }} style={{ padding:"5px 12px", borderRadius:8, border:"1px solid #E2E8F0", background:"transparent", color:"#64748B", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
              Προβολή
            </button>
          </div>
        ))}
      </div>

      {selected && (
        <PatientModal
          patient={selected}
          onClose={()=>setSelected(null)}
          onDelete={deletePatient}
        />
      )}
    </div>
  );
}