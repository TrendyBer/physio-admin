"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const STATUS_MAP = {
  pending:   { label:"Εκκρεμές",    bg:"#FEF3C7", color:"#92400E" },
  active:    { label:"Ενεργό",      bg:"#DBEAFE", color:"#1E40AF" },
  completed: { label:"Ολοκλ/θηκε", bg:"#D1FAE5", color:"#065F46" },
};

function Badge({ label, bg, color }) {
  return <span style={{ background:bg, color, padding:"2px 10px", borderRadius:999, fontSize:11, fontWeight:700, letterSpacing:"0.04em", textTransform:"uppercase", whiteSpace:"nowrap" }}>{label}</span>;
}
function Avatar({ name, size=40 }) {
  return <div style={{ width:size, height:size, borderRadius:"50%", background:"#FFF7ED", color:"#C2410C", display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.33, fontWeight:700, flexShrink:0 }}>{(name||"?").split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}</div>;
}

function AssignModal({ request, therapists, onClose, onAssign }) {
  const [selected, setSelected] = useState(request.assigned_to || request.preferred_therapist || "");

  const fullAddress = [request.street, request.city, request.zip, request.country].filter(Boolean).join(", ");

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:24 }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:"#fff", borderRadius:18, width:"100%", maxWidth:600, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ padding:"24px 28px 20px", borderBottom:"1px solid #F1F5F9", display:"flex", alignItems:"flex-start", gap:16 }}>
          <Avatar name={request.name} size={48}/>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
              <h2 style={{ fontSize:18, fontWeight:700, color:"#0F172A", margin:0 }}>{request.name}</h2>
              {request.preferred_therapist && (
                <span style={{ background:"#FEF3C7", color:"#92400E", padding:"2px 10px", borderRadius:999, fontSize:11, fontWeight:700 }}>
                  ⭐ Προτίμηση: {request.preferred_therapist}
                </span>
              )}
            </div>
            <div style={{ fontSize:13, color:"#64748B", marginTop:3 }}>{request.phone} · {request.email}</div>
            {fullAddress && (
              <div style={{ fontSize:13, color:"#1D4ED8", marginTop:4, fontWeight:500 }}>
                📍 {fullAddress}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#94A3B8" }}>✕</button>
        </div>
        <div style={{ padding:"20px 28px", display:"flex", flexDirection:"column", gap:16 }}>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Πρόβλημα Ασθενή</div>
            <p style={{ fontSize:14, color:"#475569", lineHeight:1.6, margin:0, background:"#FFF7ED", padding:"12px 14px", borderRadius:8, borderLeft:"3px solid #F59E0B" }}>
              {request.service}{request.description ? ` - ${request.description}` : ''}
            </p>
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>Ανάθεση Θεραπευτή</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {therapists.map(t => (
                <div key={t.id} onClick={()=>setSelected(t.name)} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderRadius:10, border:`2px solid ${selected===t.name?"#1D4ED8":"#E2E8F0"}`, background:selected===t.name?"#EFF6FF":"#fff", cursor:"pointer" }}>
                  <div style={{ width:36, height:36, borderRadius:"50%", background:"#EFF6FF", color:"#1D4ED8", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700 }}>
                    {t.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:14, color:"#0F172A", display:"flex", alignItems:"center", gap:8 }}>
                      {t.name}
                      {request.preferred_therapist === t.name && (
                        <span style={{ background:"#FEF3C7", color:"#92400E", padding:"1px 8px", borderRadius:999, fontSize:10, fontWeight:700 }}>⭐ Προτίμηση</span>
                      )}
                    </div>
                    <div style={{ fontSize:12, color:"#64748B" }}>{t.specialty}</div>
                  </div>
                  {selected===t.name && <div style={{ width:20, height:20, borderRadius:"50%", background:"#1D4ED8", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12 }}>✓</div>}
                </div>
              ))}
            </div>
          </div>
          <div style={{ display:"flex", gap:10, paddingTop:4, borderTop:"1px solid #F1F5F9" }}>
            <button onClick={()=>{ if(selected) { onAssign(request.id, selected); onClose(); }}} disabled={!selected}
              style={{ flex:1, padding:"10px 0", borderRadius:8, border:"none", background:selected?"#1D4ED8":"#E2E8F0", color:selected?"#fff":"#94A3B8", fontSize:14, fontWeight:600, cursor:selected?"pointer":"not-allowed", fontFamily:"inherit" }}>
              {request.assigned_to ? "Αλλαγή Θεραπευτή" : "Ανάθεση →"}
            </button>
            <button onClick={onClose} style={{ padding:"10px 20px", borderRadius:8, border:"1px solid #E2E8F0", background:"transparent", color:"#64748B", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
              Άκυρο
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RequestsPage() {
  const [requests, setRequests] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [{ data: reqs }, { data: thers }] = await Promise.all([
      supabase.from("requests").select("*").order("created_at", { ascending: false }),
      supabase.from("therapists").select("id, name, specialty").eq("status", "active"),
    ]);
    if (reqs) setRequests(reqs);
    if (thers) setTherapists(thers);
    setLoading(false);
  }

  async function assignTherapist(id, therapistName) {
    const { error } = await supabase
      .from("requests")
      .update({ assigned_to: therapistName, status: "active" })
      .eq("id", id);
    if (!error) await fetchAll();
  }

  async function updateStatus(id, newStatus) {
    const { error } = await supabase
      .from("requests")
      .update({ status: newStatus })
      .eq("id", id);
    if (!error) await fetchAll();
  }

  const counts = {
    all:       requests.length,
    pending:   requests.filter(r=>r.status==="pending").length,
    active:    requests.filter(r=>r.status==="active").length,
    completed: requests.filter(r=>r.status==="completed").length,
  };

  const filtered = requests.filter(r => {
    const matchFilter = filter==="all" || r.status===filter;
    const matchSearch = ((r.name||"")+(r.city||"")+(r.street||"")+(r.service||"")+(r.description||"")).toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
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

      {/* Summary cards */}
      <div style={{ display:"flex", gap:14, marginBottom:24, flexWrap:"wrap" }}>
        {[
          { label:"Εκκρεμή",      value:counts.pending,   bg:"#FFFBEB", border:"#FDE68A", text:"#B45309" },
          { label:"Ενεργά",       value:counts.active,    bg:"#EFF6FF", border:"#BFDBFE", text:"#1D4ED8" },
          { label:"Ολοκλ/θηκαν", value:counts.completed, bg:"#F0FDF4", border:"#BBF7D0", text:"#15803D" },
          { label:"Συνολικά",     value:counts.all,       bg:"#F8FAFC", border:"#E2E8F0", text:"#475569" },
        ].map(c => (
          <div key={c.label} style={{ flex:1, minWidth:120, background:c.bg, border:`1px solid ${c.border}`, borderRadius:12, padding:"16px 20px" }}>
            <div style={{ fontSize:11, fontWeight:700, color:c.text, textTransform:"uppercase", letterSpacing:"0.05em" }}>{c.label}</div>
            <div style={{ fontSize:32, fontWeight:700, color:c.text, lineHeight:1.1, marginTop:4 }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:12, marginBottom:20, alignItems:"center", flexWrap:"wrap" }}>
        <div style={{ display:"flex", gap:4, background:"#E2E8F0", padding:4, borderRadius:10 }}>
          {[["all","Όλα"],["pending","Εκκρεμή"],["active","Ενεργά"],["completed","Ολοκλ/θηκαν"]].map(([val,label])=>(
            <button key={val} onClick={()=>setFilter(val)} style={{ padding:"6px 14px", borderRadius:7, border:"none", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", background:filter===val?"#fff":"transparent", color:filter===val?"#0F172A":"#64748B", boxShadow:filter===val?"0 1px 4px rgba(0,0,0,0.1)":"none" }}>
              {label} <span style={{ marginLeft:4, fontSize:11, color:filter===val?"#1D4ED8":"#94A3B8" }}>{counts[val]}</span>
            </button>
          ))}
        </div>
        <input type="text" placeholder="Αναζήτηση..." value={search} onChange={e=>setSearch(e.target.value)}
          style={{ flex:1, minWidth:200, padding:"9px 14px", borderRadius:8, border:"1px solid #E2E8F0", fontSize:13, fontFamily:"inherit", background:"#fff", outline:"none", color:"#0F172A" }}/>
      </div>

      {/* Requests list */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {filtered.length===0 ? (
          <div style={{ padding:40, textAlign:"center", color:"#94A3B8", fontSize:14, background:"#fff", borderRadius:14, border:"1px solid #E2E8F0" }}>
            {requests.length === 0 ? "Δεν υπάρχουν αιτήματα ακόμα." : "Δεν βρέθηκαν αιτήματα"}
          </div>
        ) : filtered.map(r => {
          const st = STATUS_MAP[r.status] || STATUS_MAP.pending;
          const fullAddress = [r.street, r.city, r.zip, r.country].filter(Boolean).join(", ");
          return (
            <div key={r.id} style={{ background:"#fff", borderRadius:14, border:`1px solid ${r.preferred_therapist && r.status==="pending" ? "#FCD34D" : "#E2E8F0"}`, padding:"16px 20px", display:"flex", alignItems:"flex-start", gap:14 }}>
              <Avatar name={r.name}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:4 }}>
                  <span style={{ fontWeight:700, fontSize:15, color:"#0F172A" }}>{r.name}</span>
                  <Badge label={st.label} bg={st.bg} color={st.color}/>
                  {r.preferred_therapist && <Badge label="⭐ Έχει προτίμηση" bg="#FEF3C7" color="#92400E"/>}
                </div>
                {/* Contact info */}
                <div style={{ fontSize:12, color:"#64748B", marginBottom:4 }}>
                  {r.phone} · {r.email}
                </div>
                {/* Full address */}
                {fullAddress && (
                  <div style={{ fontSize:12, color:"#1D4ED8", fontWeight:500, marginBottom:6, display:"flex", alignItems:"center", gap:4 }}>
                    📍 {fullAddress}
                  </div>
                )}
                <div style={{ fontSize:12, color:"#94A3B8", marginBottom:6 }}>
                  {new Date(r.created_at).toLocaleDateString("el-GR", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" })}
                </div>
                {r.preferred_therapist && (
                  <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"#FEF3C7", border:"1px solid #FCD34D", borderRadius:8, padding:"6px 12px", fontSize:12, fontWeight:600, color:"#92400E", marginBottom:8 }}>
                    ⭐ Προτίμηση: <strong>{r.preferred_therapist}</strong>
                  </div>
                )}
                <div style={{ fontSize:13, color:"#475569", background:"#F8FAFC", padding:"8px 12px", borderRadius:8, borderLeft:"3px solid #CBD5E1" }}>
                  {r.service}{r.description ? ` — ${r.description}` : ''}
                </div>
                {r.assigned_to && (
                  <div style={{ fontSize:12, color:"#1D4ED8", marginTop:6, fontWeight:600 }}>
                    ✓ Ανατέθηκε σε: {r.assigned_to}
                  </div>
                )}
              </div>
              <div style={{ flexShrink:0, display:"flex", flexDirection:"column", gap:6 }}>
                {r.status !== "completed" && (
                  <button onClick={()=>setSelected(r)}
                    style={{ padding:"8px 16px", borderRadius:8, border:r.assigned_to?"1px solid #E2E8F0":"none", background:r.assigned_to?"#F8FAFC":"#1D4ED8", color:r.assigned_to?"#475569":"#fff", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                    {r.assigned_to ? "Αλλαγή →" : "Ανάθεση →"}
                  </button>
                )}
                {r.status === "active" && (
                  <button onClick={()=>updateStatus(r.id, "completed")}
                    style={{ padding:"8px 16px", borderRadius:8, border:"none", background:"#D1FAE5", color:"#065F46", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                    ✓ Ολοκλήρωση
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <AssignModal
          request={selected}
          therapists={therapists}
          onClose={()=>setSelected(null)}
          onAssign={assignTherapist}
        />
      )}
    </div>
  );
}