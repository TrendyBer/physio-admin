"use client";
import { useState, useEffect } from "react";

const THERAPISTS_LIST = [
  { id:1, name:"Νίκος Γεωργίου",    specialty:"Νευρολογική" },
  { id:2, name:"Ελένη Κωστοπούλου", specialty:"Αθλητική" },
  { id:3, name:"Μαρία Παπαδοπούλου",specialty:"Ορθοπαιδική" },
  { id:4, name:"Δημήτρης Αλεξίου",  specialty:"Παιδιατρική" },
];

const MOCK_REQUESTS = [
  { id:1,  name:"Γιώργος Μπέης",      phone:"697-123-4567", email:"g.beis@gmail.com",      area:"Αθήνα",        source:"Google",    description:"Πόνος στη μέση μετά από ατύχημα.", status:"active",    assignedTo:"Νίκος Γεωργίου",    freeAssessment:true,  submittedAt:"2025-03-10", preferredTherapist: null },
  { id:2,  name:"Ελένη Σταύρου",      phone:"693-234-5678", email:"eleni.s@hotmail.com",   area:"Γλυφάδα",      source:"Instagram", description:"Αποκατάσταση μετά από εγχείρηση γόνατος.", status:"active",    assignedTo:"Νίκος Γεωργίου",    freeAssessment:true,  submittedAt:"2025-03-15", preferredTherapist: null },
  { id:3,  name:"Μάριος Αντωνίου",    phone:"699-567-8901", email:"m.antoniou@gmail.com",  area:"Πάτρα",        source:"Google",    description:"Αθλητικός τραυματισμός στον αστράγαλο.", status:"active",    assignedTo:"Ελένη Κωστοπούλου", freeAssessment:true,  submittedAt:"2025-03-20", preferredTherapist: null },
  { id:4,  name:"Σοφία Δημητρίου",    phone:"695-678-9012", email:"sofia.d@hotmail.com",   area:"Πάτρα",        source:"Instagram", description:"Χρόνιος πόνος στον ώμο.", status:"pending",   assignedTo:null,                freeAssessment:false, submittedAt:"2025-03-22", preferredTherapist: null },
  { id:5,  name:"Μαρία Θεοδώρου",     phone:"694-321-9870", email:"mtheo@gmail.com",       area:"Μαρούσι",      source:"Facebook",  description:"Φυσικοθεραπεία για αθλητικό τραυματισμό.", status:"pending",   assignedTo:null,                freeAssessment:false, submittedAt:"2025-03-30", preferredTherapist: null },
  { id:6,  name:"Άννα Στεφανίδη",     phone:"693-987-6543", email:"anna.s@hotmail.com",    area:"Γλυφάδα",      source:"Instagram", description:"Αποκατάσταση μετά από εγχείρηση γόνατος.", status:"pending",   assignedTo:null,                freeAssessment:false, submittedAt:"2025-03-31", preferredTherapist: null },
  { id:7,  name:"Κώστας Λεβέντης",    phone:"699-555-1234", email:"k.leventis@yahoo.com",  area:"Πειραιάς",     source:"Φίλος",     description:"Αυχενικό σύνδρομο εδώ και 3 χρόνια.", status:"pending",   assignedTo:null,                freeAssessment:false, submittedAt:"2025-03-30", preferredTherapist: null },
  { id:8,  name:"Κώστας Παπαδάκης",   phone:"698-345-6789", email:"k.papadakis@yahoo.com", area:"Πειραιάς",     source:"Φίλος",     description:"Αυχενικό σύνδρομο. Μούδιασμα στα χέρια.", status:"completed", assignedTo:"Νίκος Γεωργίου",    freeAssessment:true,  submittedAt:"2025-02-20", preferredTherapist: null },
  { id:9,  name:"Άννα Μιχαλοπούλου",  phone:"694-456-7890", email:"anna.m@gmail.com",      area:"Μαρούσι",      source:"Facebook",  description:"Μυοσκελετικό πρόβλημα στον αριστερό ώμο.", status:"completed", assignedTo:"Νίκος Γεωργίου",    freeAssessment:true,  submittedAt:"2025-01-05", preferredTherapist: null },
  { id:10, name:"Νίκος Θεοδώρου",     phone:"696-789-0123", email:"n.theodorou@yahoo.com", area:"Αθήνα",        source:"Φίλος",     description:"COPD και δυσκολία στην αναπνοή.", status:"completed", assignedTo:"Σοφία Νικολάου",    freeAssessment:true,  submittedAt:"2025-02-01", preferredTherapist: null },
];

const STATUS_MAP = {
  pending:   { label:"Εκκρεμές",    bg:"#FEF3C7", color:"#92400E" },
  active:    { label:"Ενεργό",      bg:"#DBEAFE", color:"#1E40AF" },
  completed: { label:"Ολοκλ/θηκε", bg:"#D1FAE5", color:"#065F46" },
};
const SOURCE_COLORS = {
  "Google":    { bg:"#EFF6FF", color:"#1D4ED8" },
  "Instagram": { bg:"#FAF5FF", color:"#7E22CE" },
  "Facebook":  { bg:"#EFF6FF", color:"#1D4ED8" },
  "Φίλος":     { bg:"#F0FDF4", color:"#15803D" },
};

function Badge({ label, bg, color }) {
  return <span style={{ background:bg, color, padding:"2px 10px", borderRadius:999, fontSize:11, fontWeight:700, letterSpacing:"0.04em", textTransform:"uppercase", whiteSpace:"nowrap" }}>{label}</span>;
}
function Avatar({ name, size=40 }) {
  return <div style={{ width:size, height:size, borderRadius:"50%", background:"#FFF7ED", color:"#C2410C", display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.33, fontWeight:700, flexShrink:0 }}>{name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}</div>;
}

function AssignModal({ request, onClose, onAssign }) {
  const [selected, setSelected] = useState(request.assignedTo || request.preferredTherapist || "");
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:24 }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:"#fff", borderRadius:18, width:"100%", maxWidth:580, boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ padding:"24px 28px 20px", borderBottom:"1px solid #F1F5F9", display:"flex", alignItems:"flex-start", gap:16 }}>
          <Avatar name={request.name} size={48}/>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
              <h2 style={{ fontSize:18, fontWeight:700, color:"#0F172A", margin:0 }}>{request.name}</h2>
              {request.preferredTherapist && (
                <span style={{ background:"#FEF3C7", color:"#92400E", padding:"2px 10px", borderRadius:999, fontSize:11, fontWeight:700 }}>
                  ⭐ Προτίμηση: {request.preferredTherapist}
                </span>
              )}
            </div>
            <div style={{ fontSize:13, color:"#64748B", marginTop:3 }}>{request.phone} · {request.email} · {request.area}</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#94A3B8" }}>✕</button>
        </div>
        <div style={{ padding:"20px 28px", display:"flex", flexDirection:"column", gap:16 }}>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Πρόβλημα Ασθενή</div>
            <p style={{ fontSize:14, color:"#475569", lineHeight:1.6, margin:0, background:"#FFF7ED", padding:"12px 14px", borderRadius:8, borderLeft:"3px solid #F59E0B" }}>
              {request.description}
            </p>
          </div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {(() => { const s = SOURCE_COLORS[request.source]||{bg:"#F3F4F6",color:"#374151"}; return <Badge label={`Πηγή: ${request.source}`} bg={s.bg} color={s.color}/>; })()}
            <Badge label={`Ημ/νία: ${request.submittedAt}`} bg="#F8FAFC" color="#475569"/>
            <Badge label={request.freeAssessment ? "✓ Αξιολόγηση" : "! Χωρίς αξιολόγηση"} bg={request.freeAssessment?"#D1FAE5":"#FEF3C7"} color={request.freeAssessment?"#065F46":"#92400E"}/>
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>Ανάθεση Θεραπευτή</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {THERAPISTS_LIST.map(t => (
                <div key={t.id} onClick={()=>setSelected(t.name)} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderRadius:10, border:`2px solid ${selected===t.name?"#1D4ED8":"#E2E8F0"}`, background:selected===t.name?"#EFF6FF":"#fff", cursor:"pointer", transition:"all 0.15s" }}>
                  <div style={{ width:36, height:36, borderRadius:"50%", background:"#EFF6FF", color:"#1D4ED8", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700 }}>
                    {t.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:14, color:"#0F172A", display:"flex", alignItems:"center", gap:8 }}>
                      {t.name}
                      {request.preferredTherapist === t.name && (
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
              {request.assignedTo ? "Αλλαγή Θεραπευτή" : "Ανάθεση →"}
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
  const [requests, setRequests] = useState(MOCK_REQUESTS);
  const [selected, setSelected]  = useState(null);
  const [filter, setFilter]      = useState("all");
  const [search, setSearch]      = useState("");
  const [newFromSite, setNewFromSite] = useState(0);

  // Load requests from site (localStorage)
  useEffect(() => {
    const siteRequests = JSON.parse(localStorage.getItem('sessionRequests') || '[]');
    if (siteRequests.length > 0) {
      const formatted = siteRequests.map(r => ({
        id: r.id,
        name: r.name,
        phone: r.phone || '—',
        email: r.email,
        area: r.city || r.area || '—',
        source: r.howHeard || 'Site',
        description: r.description || r.service || '—',
        status: 'pending',
        assignedTo: null,
        freeAssessment: false,
        submittedAt: r.submittedAt,
        preferredTherapist: r.preferredTherapist || null,
        fromSite: true,
      }));
      setRequests(prev => {
        const existingIds = new Set(prev.map(r => r.id));
        const newOnes = formatted.filter(r => !existingIds.has(r.id));
        const count = newOnes.filter(r => r.preferredTherapist).length;
        if (count > 0) setNewFromSite(count);
        return newOnes.length > 0 ? [...prev, ...newOnes] : prev;
      });
    }
  }, []);

  const assignTherapist = (id, therapistName) => {
    setRequests(prev => prev.map(r => r.id===id ? { ...r, assignedTo:therapistName, status:"active", freeAssessment:true } : r));
  };

  const counts = {
    all:       requests.length,
    pending:   requests.filter(r=>r.status==="pending").length,
    active:    requests.filter(r=>r.status==="active").length,
    completed: requests.filter(r=>r.status==="completed").length,
  };

  const filtered = requests.filter(r => {
    const matchFilter = filter==="all" || r.status===filter;
    const matchSearch = (r.name+r.area+r.description).toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <div>
      <div style={{ marginBottom:24, display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:700, color:"#0F172A", fontFamily:"'DM Serif Display',serif", margin:0 }}>Αιτήματα</h1>
          <p style={{ fontSize:13, color:"#94A3B8", marginTop:4 }}>Διαχείριση όλων των αιτημάτων ασθενών</p>
        </div>
        {newFromSite > 0 && (
          <div style={{ background:"#FEF3C7", border:"1px solid #FCD34D", borderRadius:10, padding:"10px 16px", fontSize:13, color:"#92400E", fontWeight:600 }}>
            ⭐ {newFromSite} αίτημα με προτίμηση θεραπευτή από το site
          </div>
        )}
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
            <div style={{ fontSize:32, fontWeight:700, color:c.text, fontFamily:"'DM Serif Display',serif", lineHeight:1.1, marginTop:4 }}>{c.value}</div>
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
        <input type="text" placeholder="Αναζήτηση ονόματος, περιοχής, προβλήματος..." value={search} onChange={e=>setSearch(e.target.value)}
          style={{ flex:1, minWidth:200, padding:"9px 14px", borderRadius:8, border:"1px solid #E2E8F0", fontSize:13, fontFamily:"inherit", background:"#fff", outline:"none", color:"#0F172A" }}/>
      </div>

      {/* Requests list */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {filtered.length===0
          ? <div style={{ padding:40, textAlign:"center", color:"#94A3B8", fontSize:14, background:"#fff", borderRadius:14, border:"1px solid #E2E8F0" }}>Δεν βρέθηκαν αιτήματα</div>
          : filtered.map(r => {
            const st = STATUS_MAP[r.status];
            const src = SOURCE_COLORS[r.source]||{bg:"#F3F4F6",color:"#374151"};
            return (
              <div key={r.id} style={{ background:"#fff", borderRadius:14, border:`1px solid ${r.preferredTherapist && r.status==="pending" ? "#FCD34D" : "#E2E8F0"}`, padding:"16px 20px", display:"flex", alignItems:"flex-start", gap:14 }}>
                <Avatar name={r.name}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:4 }}>
                    <span style={{ fontWeight:700, fontSize:15, color:"#0F172A" }}>{r.name}</span>
                    <Badge label={st.label} bg={st.bg} color={st.color}/>
                    <Badge label={r.source} bg={src.bg} color={src.color}/>
                    {r.freeAssessment && <Badge label="✓ Αξιολόγηση" bg="#D1FAE5" color="#065F46"/>}
                    {r.fromSite && <Badge label="🌐 Από Site" bg="#EFF6FF" color="#1D4ED8"/>}
                  </div>
                  <div style={{ fontSize:12, color:"#64748B", marginBottom:6 }}>{r.phone} · {r.email} · {r.area} · {r.submittedAt}</div>
                  {/* Therapist preference badge */}
                  {r.preferredTherapist && (
                    <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"#FEF3C7", border:"1px solid #FCD34D", borderRadius:8, padding:"6px 12px", fontSize:12, fontWeight:600, color:"#92400E", marginBottom:8 }}>
                      ⭐ Προτίμηση θεραπευτή: <strong>{r.preferredTherapist}</strong>
                    </div>
                  )}
                  <div style={{ fontSize:13, color:"#475569", background:"#F8FAFC", padding:"8px 12px", borderRadius:8, borderLeft:"3px solid #CBD5E1", marginBottom:r.assignedTo?8:0 }}>
                    {r.description}
                  </div>
                  {r.assignedTo && (
                    <div style={{ fontSize:12, color:"#1D4ED8", marginTop:6, fontWeight:600 }}>
                      ✓ Ανατέθηκε σε: {r.assignedTo}
                    </div>
                  )}
                </div>
                <div style={{ flexShrink:0 }}>
                  {r.status !== "completed" && (
                    <button onClick={()=>setSelected(r)}
                      style={{ padding:"8px 16px", borderRadius:8, border: r.assignedTo?"1px solid #E2E8F0":"none", background:r.assignedTo?"#F8FAFC":"#1D4ED8", color:r.assignedTo?"#475569":"#fff", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}
                      onMouseEnter={e=>e.currentTarget.style.opacity="0.8"}
                      onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                      {r.assignedTo ? "Αλλαγή →" : "Ανάθεση →"}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        }
      </div>

      {selected && <AssignModal request={selected} onClose={()=>setSelected(null)} onAssign={assignTherapist}/>}
    </div>
  );
}