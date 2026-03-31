"use client";
import { useState } from "react";

const MOCK_THERAPISTS = [
  { id:1, name:"Μαρία Παπαδοπούλου", email:"maria.p@gmail.com", phone:"694-123-4567", specialty:"Ορθοπαιδική",  area:"Αθήνα",        postalCode:"11521", experience:7,  status:"pending",   submittedAt:"2025-03-29", bio:"Εξειδικευμένη στην αποκατάσταση μετά από χειρουργικές επεμβάσεις και αθλητικές κακώσεις. Έχω εργαστεί σε νοσοκομεία και ιδιωτικά κέντρα.", documents:[{name:"Πτυχίο Φυσιοθεραπείας.pdf",type:"degree"},{name:"Άδεια Ασκήσεως Επαγγέλματος.pdf",type:"license"}], patients:[] },
  { id:2, name:"Νίκος Γεωργίου",     email:"nikos.g@hotmail.com", phone:"697-234-5678", specialty:"Νευρολογική",  area:"Θεσσαλονίκη", postalCode:"54621", experience:12, status:"active",    submittedAt:"2025-02-10", bio:"Με 12 χρόνια εμπειρία στη νευρολογική αποκατάσταση, έχω βοηθήσει ασθενείς με εγκεφαλικό, Parkinson και πολλαπλή σκλήρυνση.", documents:[{name:"Πτυχίο Φυσιοθεραπείας.pdf",type:"degree"},{name:"Άδεια Ασκήσεως Επαγγέλματος.pdf",type:"license"},{name:"Μεταπτυχιακό Νευρολογική.pdf",type:"extra"}], patients:[{id:1,name:"Γιώργος Μπέης",assignedAt:"2025-03-10",status:"active"},{id:2,name:"Ελένη Σταύρου",assignedAt:"2025-03-15",status:"active"},{id:3,name:"Κώστας Παπαδάκης",assignedAt:"2025-02-20",status:"completed"},{id:4,name:"Άννα Μιχαλοπούλου",assignedAt:"2025-01-05",status:"completed"}] },
  { id:3, name:"Ελένη Κωστοπούλου", email:"eleni.k@yahoo.com", phone:"698-345-6789", specialty:"Αθλητική",     area:"Πάτρα",        postalCode:"26221", experience:4,  status:"active",    submittedAt:"2025-01-20", bio:"Εξειδικευμένη στην αθλητική αποκατάσταση και πρόληψη τραυματισμών. Συνεργάζομαι με αθλητικούς συλλόγους της περιοχής.", documents:[{name:"Πτυχίο Φυσιοθεραπείας.pdf",type:"degree"},{name:"Άδεια Ασκήσεως Επαγγέλματος.pdf",type:"license"}], patients:[{id:5,name:"Μάριος Αντωνίου",assignedAt:"2025-03-20",status:"active"},{id:6,name:"Σοφία Δημητρίου",assignedAt:"2025-03-22",status:"active"}] },
  { id:4, name:"Δημήτρης Αλεξίου",  email:"d.alexiou@gmail.com", phone:"693-456-7890", specialty:"Παιδιατρική", area:"Ηράκλειο",    postalCode:"71201", experience:9,  status:"pending",   submittedAt:"2025-03-26", bio:"Εξειδικεύομαι στη φυσιοθεραπεία παιδιών με αναπτυξιακές διαταραχές, εγκεφαλική παράλυση και μυοσκελετικά προβλήματα.", documents:[{name:"Πτυχίο Φυσιοθεραπείας.pdf",type:"degree"},{name:"Άδεια Ασκήσεως Επαγγέλματος.pdf",type:"license"}], patients:[] },
  { id:5, name:"Σοφία Νικολάου",    email:"sofia.n@gmail.com",  phone:"699-567-8901", specialty:"Αναπνευστική",area:"Αθήνα",        postalCode:"11741", experience:3,  status:"suspended", submittedAt:"2025-01-15", bio:"Εξειδικευμένη στη φυσιοθεραπεία αναπνευστικών παθήσεων, COPD και μετα-COVID αποκατάσταση.", documents:[{name:"Πτυχίο Φυσιοθεραπείας.pdf",type:"degree"},{name:"Άδεια Ασκήσεως Επαγγέλματος.pdf",type:"license"}], patients:[{id:7,name:"Νίκος Θεοδώρου",assignedAt:"2025-02-01",status:"completed"}] },
];

const STATUS_MAP = { active:{label:"Ενεργός",bg:"#D1FAE5",color:"#065F46"}, pending:{label:"Σε αναμονή",bg:"#FEF3C7",color:"#92400E"}, suspended:{label:"Ανεστ/νος",bg:"#FFE4E6",color:"#9F1239"} };
const PATIENT_STATUS_MAP = { active:{label:"Ενεργό",bg:"#DBEAFE",color:"#1E40AF"}, completed:{label:"Ολοκλ/θηκε",bg:"#F3F4F6",color:"#374151"} };
const SPEC_COLORS = { "Ορθοπαιδική":{bg:"#EFF6FF",color:"#1D4ED8"}, "Νευρολογική":{bg:"#FAF5FF",color:"#7E22CE"}, "Αθλητική":{bg:"#F0FDF4",color:"#15803D"}, "Παιδιατρική":{bg:"#FFF7ED",color:"#C2410C"}, "Αναπνευστική":{bg:"#F0FDFA",color:"#0F766E"} };

function Badge({ label, bg, color }) {
  return <span style={{ background:bg, color, padding:"2px 10px", borderRadius:999, fontSize:11, fontWeight:700, letterSpacing:"0.04em", textTransform:"uppercase", whiteSpace:"nowrap" }}>{label}</span>;
}
function Btn({ children, onClick, variant="primary", small }) {
  const s = { primary:{background:"#1D4ED8",color:"#fff",border:"none"}, success:{background:"#15803D",color:"#fff",border:"none"}, danger:{background:"transparent",color:"#BE123C",border:"1px solid #FECDD3"}, ghost:{background:"transparent",color:"#64748B",border:"1px solid #E2E8F0"}, warning:{background:"#F59E0B",color:"#fff",border:"none"} }[variant];
  return <button onClick={onClick} style={{...s,padding:small?"4px 10px":"7px 16px",borderRadius:8,fontSize:small?11:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}} onMouseEnter={e=>e.currentTarget.style.opacity="0.8"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>{children}</button>;
}
function Avatar({ name, size=44 }) {
  return <div style={{ width:size,height:size,borderRadius:"50%",background:"#EFF6FF",color:"#1D4ED8",display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.33,fontWeight:700,flexShrink:0 }}>{name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}</div>;
}
function DocBadge({ doc }) {
  const d = { degree:{icon:"🎓",label:"Πτυχίο",bg:"#EFF6FF",color:"#1D4ED8"}, license:{icon:"📋",label:"Άδεια",bg:"#F0FDF4",color:"#15803D"}, extra:{icon:"📄",label:"Επιπλέον",bg:"#FAF5FF",color:"#7E22CE"} }[doc.type] || {};
  return (
    <div style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:d.bg,borderRadius:8,border:`1px solid ${d.color}22`,cursor:"pointer" }}>
      <span style={{ fontSize:16 }}>{d.icon}</span>
      <div><div style={{ fontSize:11,fontWeight:700,color:d.color,textTransform:"uppercase",letterSpacing:"0.04em" }}>{d.label}</div><div style={{ fontSize:11,color:"#64748B",marginTop:1 }}>{doc.name}</div></div>
    </div>
  );
}

function ProfileModal({ therapist, onClose, onUpdateStatus }) {
  const st = STATUS_MAP[therapist.status];
  const spec = SPEC_COLORS[therapist.specialty] || { bg:"#F3F4F6",color:"#374151" };
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(15,23,42,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:24 }} onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:"#fff",borderRadius:18,width:"100%",maxWidth:680,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ padding:"24px 28px 20px",borderBottom:"1px solid #F1F5F9",display:"flex",alignItems:"flex-start",gap:16 }}>
          <Avatar name={therapist.name} size={56}/>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex",alignItems:"center",gap:10,flexWrap:"wrap" }}>
              <h2 style={{ fontSize:20,fontWeight:700,color:"#0F172A",margin:0 }}>{therapist.name}</h2>
              <Badge label={st.label} bg={st.bg} color={st.color}/>
              <Badge label={therapist.specialty} bg={spec.bg} color={spec.color}/>
            </div>
            <div style={{ fontSize:13,color:"#64748B",marginTop:4 }}>{therapist.email} · {therapist.phone} · {therapist.area} {therapist.postalCode}</div>
            <div style={{ fontSize:12,color:"#94A3B8",marginTop:2 }}>{therapist.experience} χρόνια εμπειρία · Υποβλήθηκε: {therapist.submittedAt}</div>
          </div>
          <button onClick={onClose} style={{ background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#94A3B8",padding:4 }}>✕</button>
        </div>
        <div style={{ padding:"20px 28px",display:"flex",flexDirection:"column",gap:20 }}>
          <div>
            <div style={{ fontSize:12,fontWeight:700,color:"#94A3B8",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8 }}>Βιογραφικό</div>
            <p style={{ fontSize:14,color:"#475569",lineHeight:1.6,margin:0,background:"#F8FAFC",padding:"12px 14px",borderRadius:8,borderLeft:"3px solid #CBD5E1" }}>{therapist.bio}</p>
          </div>
          <div>
            <div style={{ fontSize:12,fontWeight:700,color:"#94A3B8",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8 }}>Έγγραφα & Πιστοποιητικά</div>
            <div style={{ display:"flex",gap:10,flexWrap:"wrap" }}>{therapist.documents.map((doc,i)=><DocBadge key={i} doc={doc}/>)}</div>
          </div>
          <div>
            <div style={{ fontSize:12,fontWeight:700,color:"#94A3B8",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8 }}>Περιστατικά μέσω πλατφόρμας ({therapist.patients.length})</div>
            {therapist.patients.length===0
              ? <div style={{ fontSize:13,color:"#94A3B8",fontStyle:"italic" }}>Δεν έχουν ανατεθεί περιστατικά ακόμα.</div>
              : <>
                  <div style={{ border:"1px solid #E2E8F0",borderRadius:10,overflow:"hidden" }}>
                    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",background:"#F8FAFC",padding:"8px 16px",fontSize:11,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:"0.04em" }}>
                      <span>Ασθενής</span><span>Ημ/νία Ανάθεσης</span><span>Κατάσταση</span>
                    </div>
                    {therapist.patients.map((p,i)=>{
                      const ps = PATIENT_STATUS_MAP[p.status];
                      return (
                        <div key={p.id} style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",padding:"10px 16px",borderTop:"1px solid #F1F5F9",fontSize:13,alignItems:"center",background:i%2===0?"#fff":"#FAFAFA" }}>
                          <span style={{ fontWeight:600,color:"#0F172A" }}>{p.name}</span>
                          <span style={{ color:"#64748B" }}>{p.assignedAt}</span>
                          <Badge label={ps.label} bg={ps.bg} color={ps.color}/>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display:"flex",gap:12,marginTop:12 }}>
                    {[["Συνολικά",therapist.patients.length,"#EFF6FF","#1D4ED8"],["Ενεργά",therapist.patients.filter(p=>p.status==="active").length,"#D1FAE5","#065F46"],["Ολοκλ/θηκαν",therapist.patients.filter(p=>p.status==="completed").length,"#F3F4F6","#374151"]].map(([label,val,bg,color])=>(
                      <div key={label} style={{ flex:1,background:bg,borderRadius:10,padding:"12px 16px",textAlign:"center" }}>
                        <div style={{ fontSize:24,fontWeight:700,color }}>{val}</div>
                        <div style={{ fontSize:11,color,opacity:0.8,marginTop:2 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                </>
            }
          </div>
          <div style={{ display:"flex",gap:10,paddingTop:4,borderTop:"1px solid #F1F5F9",flexWrap:"wrap" }}>
            {therapist.status==="pending"   && <><Btn variant="success" onClick={()=>{onUpdateStatus(therapist.id,"active");onClose();}}>Έγκριση ✓</Btn><Btn variant="danger" onClick={()=>{onUpdateStatus(therapist.id,"suspended");onClose();}}>Απόρριψη</Btn></>}
            {therapist.status==="active"    && <Btn variant="warning" onClick={()=>{onUpdateStatus(therapist.id,"suspended");onClose();}}>Αναστολή</Btn>}
            {therapist.status==="suspended" && <Btn variant="success" onClick={()=>{onUpdateStatus(therapist.id,"active");onClose();}}>Επαναενεργοποίηση</Btn>}
            <Btn variant="ghost" onClick={onClose}>Κλείσιμο</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TherapistsPage() {
  const [therapists, setTherapists] = useState(MOCK_THERAPISTS);
  const [selected, setSelected]     = useState(null);
  const [filter, setFilter]         = useState("all");
  const [search, setSearch]         = useState("");

  const updateStatus = (id, newStatus) => setTherapists(prev=>prev.map(t=>t.id===id?{...t,status:newStatus}:t));
  const counts = { all:therapists.length, active:therapists.filter(t=>t.status==="active").length, pending:therapists.filter(t=>t.status==="pending").length, suspended:therapists.filter(t=>t.status==="suspended").length };
  const filtered = therapists.filter(t=>(filter==="all"||t.status===filter)&&(t.name+t.specialty+t.area).toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:26,fontWeight:700,color:"#0F172A",fontFamily:"'DM Serif Display',serif",margin:0 }}>Φυσιοθεραπευτές</h1>
        <p style={{ fontSize:13,color:"#94A3B8",marginTop:4 }}>Διαχείριση όλων των εγγεγραμμένων θεραπευτών</p>
      </div>
      <div style={{ display:"flex",gap:12,marginBottom:20,alignItems:"center",flexWrap:"wrap" }}>
        <div style={{ display:"flex",gap:4,background:"#E2E8F0",padding:4,borderRadius:10 }}>
          {[["all","Όλοι"],["active","Ενεργοί"],["pending","Σε αναμονή"],["suspended","Ανεστ/νοι"]].map(([val,label])=>(
            <button key={val} onClick={()=>setFilter(val)} style={{ padding:"6px 14px",borderRadius:7,border:"none",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",background:filter===val?"#fff":"transparent",color:filter===val?"#0F172A":"#64748B",boxShadow:filter===val?"0 1px 4px rgba(0,0,0,0.1)":"none" }}>
              {label} <span style={{ marginLeft:4,background:filter===val?"#EFF6FF":"transparent",color:filter===val?"#1D4ED8":"#94A3B8",padding:"0 6px",borderRadius:999,fontSize:11 }}>{counts[val]}</span>
            </button>
          ))}
        </div>
        <input type="text" placeholder="Αναζήτηση..." value={search} onChange={e=>setSearch(e.target.value)} style={{ flex:1,minWidth:200,padding:"9px 14px",borderRadius:8,border:"1px solid #E2E8F0",fontSize:13,fontFamily:"inherit",background:"#fff",outline:"none",color:"#0F172A" }}/>
      </div>
      <div style={{ background:"#fff",borderRadius:14,border:"1px solid #E2E8F0",overflow:"hidden" }}>
        <div style={{ display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 80px 160px",padding:"10px 20px",background:"#F8FAFC",borderBottom:"1px solid #E2E8F0",fontSize:11,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:"0.05em" }}>
          <span>Θεραπευτής</span><span>Ειδικότητα</span><span>Περιοχή</span><span>Περιστατικά</span><span>Status</span><span>Ενέργειες</span>
        </div>
        {filtered.length===0
          ? <div style={{ padding:40,textAlign:"center",color:"#94A3B8",fontSize:14 }}>Δεν βρέθηκαν θεραπευτές</div>
          : filtered.map((t,i)=>{
            const st = STATUS_MAP[t.status];
            const spec = SPEC_COLORS[t.specialty] || {bg:"#F3F4F6",color:"#374151"};
            const activeP = t.patients.filter(p=>p.status==="active").length;
            return (
              <div key={t.id} style={{ display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 80px 160px",padding:"14px 20px",borderTop:i>0?"1px solid #F1F5F9":"none",alignItems:"center" }} onMouseEnter={e=>e.currentTarget.style.background="#FAFAFA"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                  <Avatar name={t.name} size={38}/>
                  <div><div style={{ fontWeight:600,fontSize:14,color:"#0F172A" }}>{t.name}</div><div style={{ fontSize:11,color:"#94A3B8" }}>{t.experience} χρόνια · {t.email}</div></div>
                </div>
                <Badge label={t.specialty} bg={spec.bg} color={spec.color}/>
                <span style={{ fontSize:13,color:"#475569" }}>{t.area}</span>
                <div>
                  <span style={{ fontSize:16,fontWeight:700,color:"#0F172A" }}>{t.patients.length}</span>
                  <span style={{ fontSize:11,color:"#94A3B8",marginLeft:4 }}>συνολικά</span>
                  {activeP>0 && <div style={{ fontSize:11,color:"#15803D",marginTop:2 }}>● {activeP} ενεργά</div>}
                </div>
                <Badge label={st.label} bg={st.bg} color={st.color}/>
                <div style={{ display:"flex",gap:6 }}>
                  <Btn variant="ghost" small onClick={()=>setSelected(t)}>Προφίλ</Btn>
                  {t.status==="pending"   && <Btn variant="success" small onClick={()=>updateStatus(t.id,"active")}>Έγκριση</Btn>}
                  {t.status==="active"    && <Btn variant="danger"  small onClick={()=>updateStatus(t.id,"suspended")}>Αναστολή</Btn>}
                  {t.status==="suspended" && <Btn variant="warning" small onClick={()=>updateStatus(t.id,"active")}>Επαναφορά</Btn>}
                </div>
              </div>
            );
          })
        }
      </div>
      {selected && <ProfileModal therapist={selected} onClose={()=>setSelected(null)} onUpdateStatus={updateStatus}/>}
    </div>
  );
}
