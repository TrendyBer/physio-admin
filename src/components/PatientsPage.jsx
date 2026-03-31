"use client";
import { useState } from "react";

const MOCK_PATIENTS = [
  {
    id:1, name:"Γιώργος Μπέης", email:"g.beis@gmail.com", phone:"697-123-4567",
    area:"Αθήνα", address:"Σταδίου 12", registeredAt:"2025-03-10", source:"Google",
    healthIssue:"Πόνος στη μέση μετά από ατύχημα. Δυσκολεύομαι στις καθημερινές δραστηριότητες.",
    freeAssessment:{ done:true, date:"2025-03-12", therapist:"Νίκος Γεωργίου" },
    requests:[
      { id:1, description:"Πόνος στη μέση", therapist:"Νίκος Γεωργίου", status:"active",    date:"2025-03-10" },
      { id:2, description:"Follow-up",       therapist:"Νίκος Γεωργίου", status:"completed", date:"2025-02-01" },
    ],
  },
  {
    id:2, name:"Ελένη Σταύρου", email:"eleni.s@hotmail.com", phone:"693-234-5678",
    area:"Γλυφάδα", address:"Βουλιαγμένης 45", registeredAt:"2025-03-15", source:"Instagram",
    healthIssue:"Αποκατάσταση μετά από εγχείρηση γόνατος (ΠΧΣ). Χρειάζομαι εντατική φυσιοθεραπεία.",
    freeAssessment:{ done:true, date:"2025-03-16", therapist:"Νίκος Γεωργίου" },
    requests:[
      { id:3, description:"Αποκατάσταση γόνατος", therapist:"Νίκος Γεωργίου", status:"active", date:"2025-03-15" },
    ],
  },
  {
    id:3, name:"Κώστας Παπαδάκης", email:"k.papadakis@yahoo.com", phone:"698-345-6789",
    area:"Πειραιάς", address:"Ακτή Μιαούλη 8", registeredAt:"2025-02-20", source:"Φίλος",
    healthIssue:"Αυχενικό σύνδρομο εδώ και 2 χρόνια. Πονοκέφαλοι και μούδιασμα στα χέρια.",
    freeAssessment:{ done:true, date:"2025-02-22", therapist:"Νίκος Γεωργίου" },
    requests:[
      { id:4, description:"Αυχενικό σύνδρομο", therapist:"Νίκος Γεωργίου", status:"completed", date:"2025-02-20" },
    ],
  },
  {
    id:4, name:"Άννα Μιχαλοπούλου", email:"anna.m@gmail.com", phone:"694-456-7890",
    area:"Μαρούσι", address:"Κηφισίας 120", registeredAt:"2025-01-05", source:"Facebook",
    healthIssue:"Μυοσκελετικό πρόβλημα στον αριστερό ώμο μετά από αθλητικό τραυματισμό.",
    freeAssessment:{ done:true, date:"2025-01-07", therapist:"Νίκος Γεωργίου" },
    requests:[
      { id:5, description:"Πρόβλημα ώμου", therapist:"Νίκος Γεωργίου", status:"completed", date:"2025-01-05" },
    ],
  },
  {
    id:5, name:"Μάριος Αντωνίου", email:"m.antoniou@gmail.com", phone:"699-567-8901",
    area:"Πάτρα", address:"Κορίνθου 33", registeredAt:"2025-03-20", source:"Google",
    healthIssue:"Αθλητικός τραυματισμός στον αστράγαλο. Παίκτης ποδοσφαίρου, θέλω γρήγορη επιστροφή.",
    freeAssessment:{ done:true, date:"2025-03-21", therapist:"Ελένη Κωστοπούλου" },
    requests:[
      { id:6, description:"Τραυματισμός αστράγαλου", therapist:"Ελένη Κωστοπούλου", status:"active", date:"2025-03-20" },
    ],
  },
  {
    id:6, name:"Σοφία Δημητρίου", email:"sofia.d@hotmail.com", phone:"695-678-9012",
    area:"Πάτρα", address:"Μαιζώνος 15", registeredAt:"2025-03-22", source:"Instagram",
    healthIssue:"Χρόνιος πόνος στον ώμο από εργασία σε γραφείο. Δυσκολία στην ανύψωση χεριού.",
    freeAssessment:{ done:false, date:null, therapist:null },
    requests:[
      { id:7, description:"Πόνος στον ώμο", therapist:"Ελένη Κωστοπούλου", status:"active", date:"2025-03-22" },
    ],
  },
  {
    id:7, name:"Νίκος Θεοδώρου", email:"n.theodorou@yahoo.com", phone:"696-789-0123",
    area:"Αθήνα", address:"Πατησίων 55", registeredAt:"2025-02-01", source:"Φίλος",
    healthIssue:"COPD και δυσκολία στην αναπνοή. Ιστορικό καπνίσματος, ψάχνω εξειδικευμένο θεραπευτή.",
    freeAssessment:{ done:true, date:"2025-02-03", therapist:"Σοφία Νικολάου" },
    requests:[
      { id:8, description:"Αναπνευστική αποκατάσταση", therapist:"Σοφία Νικολάου", status:"completed", date:"2025-02-01" },
    ],
  },
  {
    id:8, name:"Μαρία Θεοδώρου", email:"mtheo@gmail.com", phone:"694-321-9870",
    area:"Μαρούσι", address:"Αγίου Κωνσταντίνου 7", registeredAt:"2025-03-30", source:"Facebook",
    healthIssue:"Φυσικοθεραπεία για αθλητικό τραυματισμό στο γόνατο (τένοντας).",
    freeAssessment:{ done:false, date:null, therapist:null },
    requests:[],
  },
  {
    id:9, name:"Άννα Στεφανίδη", email:"anna.s2@hotmail.com", phone:"693-987-6543",
    area:"Γλυφάδα", address:"Λεωφ. Ποσειδώνος 22", registeredAt:"2025-03-31", source:"Instagram",
    healthIssue:"Αποκατάσταση μετά από εγχείρηση γόνατος. Νέα στην πλατφόρμα.",
    freeAssessment:{ done:false, date:null, therapist:null },
    requests:[],
  },
  {
    id:10, name:"Κώστας Λεβέντης", email:"k.leventis@yahoo.com", phone:"699-555-1234",
    area:"Πειραιάς", address:"Νότιος Λιμένας 3", registeredAt:"2025-03-30", source:"Φίλος",
    healthIssue:"Αυχενικό σύνδρομο, χρόνιο πρόβλημα εδώ και 3 χρόνια.",
    freeAssessment:{ done:false, date:null, therapist:null },
    requests:[],
  },
];

const REQ_STATUS = {
  active:    { label:"Ενεργό",      bg:"#DBEAFE", color:"#1E40AF" },
  completed: { label:"Ολοκλ/θηκε", bg:"#D1FAE5", color:"#065F46" },
  pending:   { label:"Εκκρεμές",   bg:"#FEF3C7", color:"#92400E" },
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
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:"#F0FDF4", color:"#15803D", display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.33, fontWeight:700, flexShrink:0 }}>
      {name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
    </div>
  );
}

function PatientModal({ patient, onClose }) {
  const src = SOURCE_COLORS[patient.source] || { bg:"#F3F4F6", color:"#374151" };
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:24 }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:"#fff", borderRadius:18, width:"100%", maxWidth:640, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>

        {/* Header */}
        <div style={{ padding:"24px 28px 20px", borderBottom:"1px solid #F1F5F9", display:"flex", alignItems:"flex-start", gap:16 }}>
          <Avatar name={patient.name} size={52}/>
          <div style={{ flex:1 }}>
            <h2 style={{ fontSize:20, fontWeight:700, color:"#0F172A", margin:0 }}>{patient.name}</h2>
            <div style={{ fontSize:13, color:"#64748B", marginTop:4 }}>{patient.email} · {patient.phone}</div>
            <div style={{ fontSize:12, color:"#94A3B8", marginTop:2 }}>{patient.address}, {patient.area} · Εγγραφή: {patient.registeredAt}</div>
            <div style={{ marginTop:6 }}><Badge label={`Πηγή: ${patient.source}`} bg={src.bg} color={src.color}/></div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#94A3B8" }}>✕</button>
        </div>

        <div style={{ padding:"20px 28px", display:"flex", flexDirection:"column", gap:20 }}>

          {/* Health issue */}
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Πρόβλημα Υγείας</div>
            <p style={{ fontSize:14, color:"#475569", lineHeight:1.6, margin:0, background:"#FFF7ED", padding:"12px 14px", borderRadius:8, borderLeft:"3px solid #F59E0B" }}>
              {patient.healthIssue}
            </p>
          </div>

          {/* Free assessment */}
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Δωρεάν Αξιολόγηση</div>
            {patient.freeAssessment.done
              ? (
                <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", background:"#F0FDF4", borderRadius:10, border:"1px solid #BBF7D0" }}>
                  <div style={{ width:32, height:32, borderRadius:"50%", background:"#15803D", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>✓</div>
                  <div>
                    <div style={{ fontWeight:600, fontSize:14, color:"#15803D" }}>Ολοκληρώθηκε</div>
                    <div style={{ fontSize:12, color:"#64748B", marginTop:2 }}>
                      {patient.freeAssessment.date} · Θεραπευτής: <strong>{patient.freeAssessment.therapist}</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", background:"#FFF7ED", borderRadius:10, border:"1px solid #FDE68A" }}>
                  <div style={{ width:32, height:32, borderRadius:"50%", background:"#F59E0B", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>!</div>
                  <div>
                    <div style={{ fontWeight:600, fontSize:14, color:"#B45309" }}>Δεν έχει κλειστεί ακόμα</div>
                    <div style={{ fontSize:12, color:"#64748B", marginTop:2 }}>Εκκρεμεί ανάθεση θεραπευτή</div>
                  </div>
                </div>
              )
            }
          </div>

          {/* Request history */}
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>
              Ιστορικό Αιτημάτων ({patient.requests.length})
            </div>
            {patient.requests.length === 0
              ? <div style={{ fontSize:13, color:"#94A3B8", fontStyle:"italic" }}>Δεν υπάρχουν αιτήματα ακόμα.</div>
              : patient.requests.map((r, i) => {
                const rs = REQ_STATUS[r.status] || REQ_STATUS.pending;
                return (
                  <div key={r.id} style={{ padding:"12px 16px", borderRadius:10, border:"1px solid #E2E8F0", marginBottom:8, background:i%2===0?"#fff":"#FAFAFA" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, fontSize:14, color:"#0F172A" }}>{r.description}</div>
                        <div style={{ fontSize:12, color:"#64748B", marginTop:3 }}>Θεραπευτής: <strong>{r.therapist}</strong></div>
                        <div style={{ fontSize:11, color:"#94A3B8", marginTop:2 }}>{r.date}</div>
                      </div>
                      <Badge label={rs.label} bg={rs.bg} color={rs.color}/>
                    </div>
                  </div>
                );
              })
            }
          </div>

        </div>
      </div>
    </div>
  );
}

export default function PatientsPage() {
  const [patients]  = useState(MOCK_PATIENTS);
  const [selected, setSelected] = useState(null);
  const [search, setSearch]     = useState("");
  const [filter, setFilter]     = useState("all");

  const filtered = patients.filter(p => {
    const matchSearch = (p.name+p.email+p.area).toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all"      ? true :
      filter === "active"   ? p.requests.some(r=>r.status==="active") :
      filter === "pending"  ? p.freeAssessment.done === false :
      filter === "no_req"   ? p.requests.length === 0 : true;
    return matchSearch && matchFilter;
  });

  const counts = {
    all:     patients.length,
    active:  patients.filter(p=>p.requests.some(r=>r.status==="active")).length,
    pending: patients.filter(p=>!p.freeAssessment.done).length,
    no_req:  patients.filter(p=>p.requests.length===0).length,
  };

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:26, fontWeight:700, color:"#0F172A", fontFamily:"'DM Serif Display',serif", margin:0 }}>Χρήστες / Ασθενείς</h1>
        <p style={{ fontSize:13, color:"#94A3B8", marginTop:4 }}>Όλοι οι εγγεγραμμένοι ασθενείς της πλατφόρμας</p>
      </div>

      {/* Filters + search */}
      <div style={{ display:"flex", gap:12, marginBottom:20, alignItems:"center", flexWrap:"wrap" }}>
        <div style={{ display:"flex", gap:4, background:"#E2E8F0", padding:4, borderRadius:10 }}>
          {[
            ["all",     "Όλοι"],
            ["active",  "Ενεργοί"],
            ["pending", "Χωρίς αξιολόγηση"],
            ["no_req",  "Χωρίς ανάθεση"],
          ].map(([val, label]) => (
            <button key={val} onClick={()=>setFilter(val)} style={{ padding:"6px 14px", borderRadius:7, border:"none", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", background:filter===val?"#fff":"transparent", color:filter===val?"#0F172A":"#64748B", boxShadow:filter===val?"0 1px 4px rgba(0,0,0,0.1)":"none" }}>
              {label} <span style={{ marginLeft:4, background:filter===val?"#EFF6FF":"transparent", color:filter===val?"#1D4ED8":"#94A3B8", padding:"0 6px", borderRadius:999, fontSize:11 }}>{counts[val]}</span>
            </button>
          ))}
        </div>
        <input type="text" placeholder="Αναζήτηση ονόματος, email, περιοχής..." value={search} onChange={e=>setSearch(e.target.value)}
          style={{ flex:1, minWidth:200, padding:"9px 14px", borderRadius:8, border:"1px solid #E2E8F0", fontSize:13, fontFamily:"inherit", background:"#fff", outline:"none", color:"#0F172A" }}/>
      </div>

      {/* Table */}
      <div style={{ background:"#fff", borderRadius:14, border:"1px solid #E2E8F0", overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1.5fr 1fr 1fr 1fr 80px", padding:"10px 20px", background:"#F8FAFC", borderBottom:"1px solid #E2E8F0", fontSize:11, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.05em" }}>
          <span>Ασθενής</span><span>Πρόβλημα</span><span>Πηγή</span><span>Αξιολόγηση</span><span>Αιτήματα</span><span></span>
        </div>

        {filtered.length === 0
          ? <div style={{ padding:40, textAlign:"center", color:"#94A3B8", fontSize:14 }}>Δεν βρέθηκαν ασθενείς</div>
          : filtered.map((p, i) => {
            const src = SOURCE_COLORS[p.source] || { bg:"#F3F4F6", color:"#374151" };
            const activeReqs = p.requests.filter(r=>r.status==="active").length;
            return (
              <div key={p.id} style={{ display:"grid", gridTemplateColumns:"2fr 1.5fr 1fr 1fr 1fr 80px", padding:"14px 20px", borderTop:i>0?"1px solid #F1F5F9":"none", alignItems:"center" }}
                onMouseEnter={e=>e.currentTarget.style.background="#FAFAFA"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>

                {/* Name */}
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <Avatar name={p.name}/>
                  <div>
                    <div style={{ fontWeight:600, fontSize:14, color:"#0F172A" }}>{p.name}</div>
                    <div style={{ fontSize:11, color:"#94A3B8" }}>{p.phone} · {p.area}</div>
                  </div>
                </div>

                {/* Health issue (truncated) */}
                <div style={{ fontSize:12, color:"#475569", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", paddingRight:8 }} title={p.healthIssue}>
                  {p.healthIssue.slice(0, 45)}{p.healthIssue.length > 45 ? "…" : ""}
                </div>

                {/* Source */}
                <Badge label={p.source} bg={src.bg} color={src.color}/>

                {/* Free assessment */}
                <div>
                  {p.freeAssessment.done
                    ? <span style={{ fontSize:12, color:"#15803D", fontWeight:600 }}>✓ Έγινε</span>
                    : <span style={{ fontSize:12, color:"#B45309", fontWeight:600 }}>! Εκκρεμεί</span>
                  }
                </div>

                {/* Requests */}
                <div>
                  <span style={{ fontSize:15, fontWeight:700, color:"#0F172A" }}>{p.requests.length}</span>
                  <span style={{ fontSize:11, color:"#94A3B8", marginLeft:4 }}>συνολικά</span>
                  {activeReqs > 0 && <div style={{ fontSize:11, color:"#1D4ED8", marginTop:2 }}>● {activeReqs} ενεργά</div>}
                </div>

                {/* Action */}
                <button onClick={()=>setSelected(p)} style={{ padding:"5px 12px", borderRadius:8, border:"1px solid #E2E8F0", background:"transparent", color:"#64748B", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}
                  onMouseEnter={e=>e.currentTarget.style.background="#F8FAFC"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  Προβολή
                </button>
              </div>
            );
          })
        }
      </div>

      {selected && <PatientModal patient={selected} onClose={()=>setSelected(null)}/>}
    </div>
  );
}
