"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const REQ_STATUS = {
  active:    { label:"Ενεργό",      bg:"#DBEAFE", color:"#1E40AF" },
  completed: { label:"Ολοκλ/θηκε", bg:"#D1FAE5", color:"#065F46" },
  pending:   { label:"Εκκρεμές",   bg:"#FEF3C7", color:"#92400E" },
};

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

function PatientModal({ patient, onClose, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fullAddress = [patient.street, patient.city, patient.zip, patient.country].filter(Boolean).join(", ");

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:24 }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:"#fff", borderRadius:18, width:"100%", maxWidth:640, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>

        <div style={{ padding:"24px 28px 20px", borderBottom:"1px solid #F1F5F9", display:"flex", alignItems:"flex-start", gap:16 }}>
          <Avatar name={patient.name} size={52}/>
          <div style={{ flex:1 }}>
            <h2 style={{ fontSize:20, fontWeight:700, color:"#0F172A", margin:0 }}>{patient.name}</h2>
            <div style={{ fontSize:13, color:"#64748B", marginTop:4 }}>{patient.email} · {patient.phone}</div>
            {fullAddress && <div style={{ fontSize:12, color:"#1D4ED8", marginTop:2, fontWeight:500 }}>📍 {fullAddress}</div>}
            <div style={{ fontSize:12, color:"#94A3B8", marginTop:2 }}>
              Εγγραφή: {patient.created_at ? new Date(patient.created_at).toLocaleDateString("el-GR") : "—"}
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#94A3B8" }}>✕</button>
        </div>

        <div style={{ padding:"20px 28px", display:"flex", flexDirection:"column", gap:20 }}>
          {/* Service */}
          {patient.service && (
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Υπηρεσία / Πρόβλημα</div>
              <p style={{ fontSize:14, color:"#475569", lineHeight:1.6, margin:0, background:"#FFF7ED", padding:"12px 14px", borderRadius:8, borderLeft:"3px solid #F59E0B" }}>
                {patient.service}{patient.description ? ` — ${patient.description}` : ""}
              </p>
            </div>
          )}

          {/* Assignment */}
          {patient.assigned_to && (
            <div style={{ background:"#F0FDF4", border:"1px solid #BBF7D0", borderRadius:10, padding:"12px 16px" }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#15803D" }}>✓ Ανατέθηκε σε: {patient.assigned_to}</div>
            </div>
          )}

          {/* Status */}
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Κατάσταση</div>
            {(() => {
              const st = REQ_STATUS[patient.status] || REQ_STATUS.pending;
              return <Badge label={st.label} bg={st.bg} color={st.color}/>;
            })()}
          </div>

          {/* Delete */}
          <div style={{ paddingTop:8, borderTop:"1px solid #F1F5F9" }}>
            {!confirmDelete ? (
              <button onClick={()=>setConfirmDelete(true)} style={{ padding:"8px 18px", borderRadius:8, border:"1px solid #FECACA", background:"#FEF2F2", color:"#DC2626", fontSize:13, fontWeight:600, cursor:"pointer" }}>
                🗑 Διαγραφή Αιτήματος
              </button>
            ) : (
              <div style={{ display:"flex", alignItems:"center", gap:10, background:"#FEF2F2", padding:"10px 14px", borderRadius:8, border:"1px solid #FECACA" }}>
                <span style={{ fontSize:13, color:"#DC2626", fontWeight:600 }}>Σίγουρα θέλεις να διαγράψεις;</span>
                <button onClick={()=>{ onDelete(patient.id); onClose(); }} style={{ padding:"6px 14px", borderRadius:8, border:"none", background:"#DC2626", color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer" }}>Ναι</button>
                <button onClick={()=>setConfirmDelete(false)} style={{ padding:"6px 14px", borderRadius:8, border:"1px solid #E2E8F0", background:"transparent", color:"#64748B", fontSize:12, fontWeight:600, cursor:"pointer" }}>Όχι</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => { fetchPatients(); }, []);

  async function fetchPatients() {
    setLoading(true);
    const { data } = await supabase
      .from("requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setPatients(data);
    setLoading(false);
  }

  async function deletePatient(id) {
    const { error } = await supabase.from("requests").delete().eq("id", id);
    if (!error) {
      setPatients(prev => prev.filter(p => p.id !== id));
    } else {
      alert("Σφάλμα διαγραφής: " + error.message);
    }
  }

  const filtered = patients.filter(p => {
    const matchFilter =
      filter === "all"       ? true :
      filter === "active"    ? p.status === "active" :
      filter === "pending"   ? p.status === "pending" :
      filter === "completed" ? p.status === "completed" : true;
    const matchSearch = ((p.name||"")+(p.email||"")+(p.city||"")+(p.service||"")).toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const counts = {
    all:       patients.length,
    pending:   patients.filter(p=>p.status==="pending").length,
    active:    patients.filter(p=>p.status==="active").length,
    completed: patients.filter(p=>p.status==="completed").length,
  };

  if (loading) return (
    <div style={{ padding:24, display:"flex", alignItems:"center", justifyContent:"center", minHeight:400 }}>
      <div style={{ fontSize:16, color:"#64748B" }}>Φόρτωση...</div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:26, fontWeight:700, color:"#0F172A", margin:0 }}>Χρήστες / Ασθενείς</h1>
        <p style={{ fontSize:13, color:"#94A3B8", marginTop:4 }}>Όλα τα αιτήματα ασθενών</p>
      </div>

      <div style={{ display:"flex", gap:12, marginBottom:20, alignItems:"center", flexWrap:"wrap" }}>
        <div style={{ display:"flex", gap:4, background:"#E2E8F0", padding:4, borderRadius:10 }}>
          {[["all","Όλοι"],["pending","Εκκρεμή"],["active","Ενεργοί"],["completed","Ολοκλ/θηκαν"]].map(([val,label])=>(
            <button key={val} onClick={()=>setFilter(val)} style={{ padding:"6px 14px", borderRadius:7, border:"none", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", background:filter===val?"#fff":"transparent", color:filter===val?"#0F172A":"#64748B", boxShadow:filter===val?"0 1px 4px rgba(0,0,0,0.1)":"none" }}>
              {label} <span style={{ marginLeft:4, fontSize:11, color:filter===val?"#1D4ED8":"#94A3B8" }}>{counts[val]}</span>
            </button>
          ))}
        </div>
        <input type="text" placeholder="Αναζήτηση ονόματος, email, περιοχής..." value={search} onChange={e=>setSearch(e.target.value)}
          style={{ flex:1, minWidth:200, padding:"9px 14px", borderRadius:8, border:"1px solid #E2E8F0", fontSize:13, fontFamily:"inherit", background:"#fff", outline:"none", color:"#0F172A" }}/>
      </div>

      <div style={{ background:"#fff", borderRadius:14, border:"1px solid #E2E8F0", overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1.5fr 1fr 1fr 80px", padding:"10px 20px", background:"#F8FAFC", borderBottom:"1px solid #E2E8F0", fontSize:11, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.05em" }}>
          <span>Ασθενής</span><span>Υπηρεσία</span><span>Διεύθυνση</span><span>Κατάσταση</span><span></span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding:40, textAlign:"center", color:"#94A3B8", fontSize:14 }}>
            {patients.length === 0 ? "Δεν υπάρχουν αιτήματα ακόμα." : "Δεν βρέθηκαν αποτελέσματα"}
          </div>
        ) : filtered.map((p, i) => {
          const st = REQ_STATUS[p.status] || REQ_STATUS.pending;
          const fullAddress = [p.street, p.city].filter(Boolean).join(", ");
          return (
            <div key={p.id} style={{ display:"grid", gridTemplateColumns:"2fr 1.5fr 1fr 1fr 80px", padding:"14px 20px", borderTop:i>0?"1px solid #F1F5F9":"none", alignItems:"center" }}
              onMouseEnter={e=>e.currentTarget.style.background="#FAFAFA"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>

              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <Avatar name={p.name}/>
                <div>
                  <div style={{ fontWeight:600, fontSize:14, color:"#0F172A" }}>{p.name}</div>
                  <div style={{ fontSize:11, color:"#94A3B8" }}>{p.phone} · {p.email}</div>
                </div>
              </div>

              <div style={{ fontSize:12, color:"#475569", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", paddingRight:8 }}>
                {p.service || "—"}
              </div>

              <div style={{ fontSize:12, color:"#1D4ED8", fontWeight:500 }}>
                {fullAddress || "—"}
              </div>

              <Badge label={st.label} bg={st.bg} color={st.color}/>

              <button onClick={()=>setSelected(p)} style={{ padding:"5px 12px", borderRadius:8, border:"1px solid #E2E8F0", background:"transparent", color:"#64748B", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                Προβολή
              </button>
            </div>
          );
        })}
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