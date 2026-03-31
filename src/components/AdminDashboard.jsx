"use client";
import { useState } from "react";

const mockStats = {
  totalTherapists: 24, pendingTherapists: 5,
  totalPatients: 187, newRequestsToday: 8,
  totalRequests: 412, pendingRequests: 13,
};

const mockMarketing = {
  visitors:       1840,
  uniqueVisitors: 1340,
  conversionRate: 10.2,
  costPerLead:    4.8,
  sources: [
    { name:"Google",    visitors:820, requests:48, color:"#1D4ED8", bg:"#EFF6FF" },
    { name:"Instagram", visitors:510, requests:31, color:"#7E22CE", bg:"#FAF5FF" },
    { name:"Facebook",  visitors:290, requests:18, color:"#1D4ED8", bg:"#DBEAFE" },
    { name:"Φίλος",     visitors:220, requests:16, color:"#15803D", bg:"#F0FDF4" },
  ],
};

const mockPendingTherapists = [
  { id:1, name:"Μαρία Παπαδοπούλου", specialty:"Ορθοπαιδική",  area:"Αθήνα",        experience:7,  submittedAt:"2025-03-29" },
  { id:2, name:"Νίκος Γεωργίου",     specialty:"Νευρολογική",  area:"Θεσσαλονίκη", experience:12, submittedAt:"2025-03-28" },
  { id:3, name:"Ελένη Κωστοπούλου", specialty:"Αθλητική",     area:"Πάτρα",        experience:4,  submittedAt:"2025-03-27" },
  { id:4, name:"Δημήτρης Αλεξίου",  specialty:"Παιδιατρική",  area:"Ηράκλειο",    experience:9,  submittedAt:"2025-03-26" },
  { id:5, name:"Σοφία Νικολάου",    specialty:"Αναπνευστική", area:"Αθήνα",        experience:3,  submittedAt:"2025-03-25" },
];

const mockPendingRequests = [
  { id:1, name:"Γιώργος Μπέης",   email:"g.beis@gmail.com",     phone:"697-123-4567", area:"Αθήνα",   description:"Πόνος στη μέση μετά από ατύχημα",           source:"Google",    submittedAt:"2025-03-31" },
  { id:2, name:"Άννα Στεφανίδη", email:"anna.s@hotmail.com",   phone:"693-987-6543", area:"Γλυφάδα", description:"Αποκατάσταση μετά από εγχείρηση γόνατος",   source:"Instagram", submittedAt:"2025-03-31" },
  { id:3, name:"Κώστας Λεβέντης", email:"k.leventis@yahoo.com",phone:"699-555-1234", area:"Πειραιάς",description:"Αυχενικό σύνδρομο, χρόνιο πρόβλημα",        source:"Φίλος",     submittedAt:"2025-03-30" },
  { id:4, name:"Μαρία Θεοδώρου", email:"mtheo@gmail.com",      phone:"694-321-9870", area:"Μαρούσι", description:"Φυσικοθεραπεία για αθλητικό τραυματισμό",   source:"Facebook",  submittedAt:"2025-03-30" },
];

const mockActivity = [
  { id:1, type:"new_request",      message:"Νέο αίτημα από Γιώργο Μπέη",       time:"πριν 12 λεπτά" },
  { id:2, type:"therapist_signup", message:"Νέα εγγραφή: Σοφία Νικολάου",       time:"πριν 1 ώρα" },
  { id:3, type:"approved",         message:"Εγκρίθηκε ο Παναγιώτης Δήμου",     time:"πριν 2 ώρες" },
  { id:4, type:"new_request",      message:"Νέο αίτημα από Άννα Στεφανίδη",    time:"πριν 3 ώρες" },
  { id:5, type:"rejected",         message:"Απορρίφθηκε η Κατερίνα Σπύρου",    time:"χθες 18:40" },
  { id:6, type:"new_request",      message:"Νέο αίτημα από Κώστα Λεβέντη",     time:"χθες 16:20" },
];

function StatCard({ label, value, sub, color }) {
  const c = {
    blue:  { bg:"#EFF6FF", border:"#BFDBFE", text:"#1D4ED8", sub:"#3B82F6" },
    green: { bg:"#F0FDF4", border:"#BBF7D0", text:"#15803D", sub:"#22C55E" },
    amber: { bg:"#FFFBEB", border:"#FDE68A", text:"#B45309", sub:"#F59E0B" },
    red:   { bg:"#FFF1F2", border:"#FECDD3", text:"#BE123C", sub:"#F43F5E" },
  }[color] || {};
  return (
    <div style={{ background:c.bg, border:`1px solid ${c.border}`, borderRadius:14, padding:"20px 24px", flex:1, minWidth:160 }}>
      <div style={{ fontSize:12, color:c.text, fontWeight:600, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.05em" }}>{label}</div>
      <div style={{ fontSize:36, fontWeight:700, color:c.text, fontFamily:"'DM Serif Display',serif", lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:12, color:c.sub, marginTop:6 }}>{sub}</div>}
    </div>
  );
}

function MiniStatCard({ label, value, sub, bg, border, text }) {
  return (
    <div style={{ background:bg, border:`1px solid ${border}`, borderRadius:12, padding:"16px 18px", flex:1, minWidth:130 }}>
      <div style={{ fontSize:11, color:text, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:4, opacity:0.8 }}>{label}</div>
      <div style={{ fontSize:26, fontWeight:700, color:text, fontFamily:"'DM Serif Display',serif", lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:text, opacity:0.7, marginTop:4 }}>{sub}</div>}
    </div>
  );
}

function Btn({ children, onClick, variant="primary" }) {
  const s = {
    primary: { background:"#1D4ED8", color:"#fff", border:"none" },
    success: { background:"#15803D", color:"#fff", border:"none" },
    danger:  { background:"transparent", color:"#BE123C", border:"1px solid #FECDD3" },
    ghost:   { background:"transparent", color:"#64748B", border:"1px solid #E2E8F0" },
  }[variant];
  return <button onClick={onClick} style={{...s, padding:"6px 14px", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit"}} onMouseEnter={e=>e.currentTarget.style.opacity="0.8"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>{children}</button>;
}

function Avatar({ name }) {
  return <div style={{ width:40, height:40, borderRadius:"50%", background:"#EFF6FF", color:"#1D4ED8", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, flexShrink:0 }}>{name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}</div>;
}

function ActivityDot({ type }) {
  const d = { new_request:{bg:"#DBEAFE",color:"#1D4ED8",sym:"↗"}, therapist_signup:{bg:"#F0FDF4",color:"#15803D",sym:"+"}, approved:{bg:"#D1FAE5",color:"#065F46",sym:"✓"}, rejected:{bg:"#FFE4E6",color:"#9F1239",sym:"✕"} }[type] || {bg:"#F3F4F6",color:"#374151",sym:"·"};
  return <div style={{ width:28, height:28, borderRadius:"50%", background:d.bg, color:d.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, flexShrink:0 }}>{d.sym}</div>;
}

export default function AdminDashboard({ onNavigate }) {
  const [therapists, setTherapists] = useState(mockPendingTherapists);
  const [requests, setRequests]     = useState(mockPendingRequests);
  const [stats, setStats]           = useState(mockStats);
  const [tab, setTab]               = useState("therapists");

  const maxVisitors = Math.max(...mockMarketing.sources.map(s=>s.visitors));

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:26, fontWeight:700, color:"#0F172A", fontFamily:"'DM Serif Display',serif", margin:0 }}>Dashboard</h1>
        <p style={{ fontSize:13, color:"#94A3B8", marginTop:4 }}>Τρίτη, 31 Μαρτίου 2025</p>
      </div>

      {/* KPI Cards */}
      <div style={{ display:"flex", gap:14, marginBottom:28, flexWrap:"wrap" }}>
        <StatCard label="Ενεργοί Θεραπευτές"  value={stats.totalTherapists}   sub={`+ ${stats.pendingTherapists} σε αναμονή`} color="blue" />
        <StatCard label="Εκκρεμείς Εγκρίσεις" value={stats.pendingTherapists} sub="Περιμένουν review"                         color="amber" />
        <StatCard label="Συνολικοί Ασθενείς"  value={stats.totalPatients}     sub="↑ 12 αυτόν τον μήνα"                      color="green" />
        <StatCard label="Νέα Αιτήματα Σήμερα" value={stats.newRequestsToday}  sub={`${stats.pendingRequests} εκκρεμή`}        color="red" />
      </div>

      {/* ── MARKETING SECTION ── */}
      <div style={{ background:"#fff", borderRadius:14, border:"1px solid #E2E8F0", padding:"20px 24px", marginBottom:24 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:"#0F172A" }}>Marketing & Traffic</div>
            <div style={{ fontSize:12, color:"#94A3B8", marginTop:2 }}>Mock data — θα συνδεθεί με Google Analytics</div>
          </div>
          <span style={{ fontSize:11, fontWeight:600, background:"#FEF3C7", color:"#92400E", padding:"3px 10px", borderRadius:999, textTransform:"uppercase", letterSpacing:"0.04em" }}>Mock Data</span>
        </div>

        {/* Mini KPI row */}
        <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
          <MiniStatCard label="Επισκέπτες"      value={mockMarketing.visitors.toLocaleString()}       sub="αυτόν τον μήνα"     bg="#EFF6FF" border="#BFDBFE" text="#1D4ED8"/>
          <MiniStatCard label="Unique Visitors"  value={mockMarketing.uniqueVisitors.toLocaleString()} sub="μοναδικοί"           bg="#F0FDF4" border="#BBF7D0" text="#15803D"/>
          <MiniStatCard label="Conversion Rate"  value={`${mockMarketing.conversionRate}%`}            sub="επισκέπτες→αιτήματα" bg="#FAF5FF" border="#E9D5FF" text="#7E22CE"/>
          <MiniStatCard label="Cost per Lead"    value={`${mockMarketing.costPerLead}€`}               sub="μέσος όρος"          bg="#FFFBEB" border="#FDE68A" text="#B45309"/>
        </div>

        {/* Sources */}
        <div style={{ fontSize:12, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:12 }}>Πηγές Traffic</div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {mockMarketing.sources.map(s => {
            const pct = Math.round((s.visitors / mockMarketing.visitors) * 100);
            const barWidth = Math.round((s.visitors / maxVisitors) * 100);
            return (
              <div key={s.name} style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:70, fontSize:13, fontWeight:600, color:"#0F172A", flexShrink:0 }}>{s.name}</div>
                <div style={{ flex:1, background:"#F1F5F9", borderRadius:999, height:8, overflow:"hidden" }}>
                  <div style={{ width:`${barWidth}%`, height:"100%", background:s.color, borderRadius:999, transition:"width 0.3s" }}/>
                </div>
                <div style={{ width:50, fontSize:12, color:"#64748B", textAlign:"right", flexShrink:0 }}>{s.visitors} επ.</div>
                <div style={{ width:60, fontSize:12, color:"#64748B", textAlign:"right", flexShrink:0 }}>{s.requests} αιτ.</div>
                <span style={{ background:s.bg, color:s.color, padding:"2px 8px", borderRadius:999, fontSize:11, fontWeight:700, flexShrink:0 }}>{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two-column */}
      <div style={{ display:"flex", gap:20, alignItems:"flex-start" }}>
        <div style={{ flex:2, minWidth:0 }}>
          {/* Tabs */}
          <div style={{ display:"flex", gap:4, background:"#E2E8F0", padding:4, borderRadius:10, width:"fit-content", marginBottom:16 }}>
            {[{id:"therapists",label:`Θεραπευτές (${therapists.length})`},{id:"requests",label:`Αιτήματα (${requests.length})`}].map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{ padding:"7px 18px", borderRadius:7, border:"none", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", background:tab===t.id?"#fff":"transparent", color:tab===t.id?"#0F172A":"#64748B", boxShadow:tab===t.id?"0 1px 4px rgba(0,0,0,0.1)":"none" }}>{t.label}</button>
            ))}
          </div>

          <div style={{ background:"#fff", borderRadius:14, border:"1px solid #E2E8F0", overflow:"hidden" }}>
            {tab==="therapists" && (therapists.length===0
              ? <div style={{ padding:40, textAlign:"center", color:"#94A3B8", fontSize:14 }}>✓ Όλες οι εγκρίσεις ολοκληρώθηκαν</div>
              : therapists.map((t,i)=>(
                <div key={t.id} style={{ padding:"16px 20px", borderBottom:i<therapists.length-1?"1px solid #F1F5F9":"none", display:"flex", alignItems:"center", gap:14 }}>
                  <Avatar name={t.name}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:14, color:"#0F172A" }}>{t.name}</div>
                    <div style={{ fontSize:12, color:"#64748B", marginTop:2 }}>{t.specialty} · {t.area} · {t.experience} χρόνια</div>
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <Btn variant="ghost" onClick={()=>onNavigate("therapists")}>Προφίλ</Btn>
                    <Btn variant="danger"  onClick={()=>{setTherapists(p=>p.filter(x=>x.id!==t.id));setStats(p=>({...p,pendingTherapists:p.pendingTherapists-1}))}}>Απόρριψη</Btn>
                    <Btn variant="success" onClick={()=>{setTherapists(p=>p.filter(x=>x.id!==t.id));setStats(p=>({...p,pendingTherapists:p.pendingTherapists-1,totalTherapists:p.totalTherapists+1}))}}>Έγκριση ✓</Btn>
                  </div>
                </div>
              ))
            )}
            {tab==="requests" && (requests.length===0
              ? <div style={{ padding:40, textAlign:"center", color:"#94A3B8", fontSize:14 }}>✓ Δεν υπάρχουν εκκρεμή αιτήματα</div>
              : requests.map((r,i)=>(
                <div key={r.id} style={{ padding:"16px 20px", borderBottom:i<requests.length-1?"1px solid #F1F5F9":"none" }}>
                  <div style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
                    <Avatar name={r.name}/>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600, fontSize:14, color:"#0F172A" }}>{r.name} <span style={{ marginLeft:8, background:"#DBEAFE", color:"#1E40AF", fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:999, textTransform:"uppercase" }}>Νέο</span></div>
                      <div style={{ fontSize:12, color:"#64748B", marginTop:3 }}>{r.phone} · {r.email} · {r.area}</div>
                      <div style={{ fontSize:12, color:"#475569", background:"#F8FAFC", padding:"6px 10px", borderRadius:6, borderLeft:"3px solid #CBD5E1", marginTop:8 }}>"{r.description}"</div>
                    </div>
                    <Btn variant="primary" onClick={()=>{setRequests(p=>p.filter(x=>x.id!==r.id));setStats(p=>({...p,pendingRequests:p.pendingRequests-1}))}}>Ανάθεση →</Btn>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right column */}
        <div style={{ flex:1, minWidth:220 }}>
          <div style={{ background:"#fff", borderRadius:14, border:"1px solid #E2E8F0", overflow:"hidden", marginBottom:16 }}>
            <div style={{ padding:"14px 18px", borderBottom:"1px solid #F1F5F9", fontSize:13, fontWeight:700, color:"#0F172A" }}>Πρόσφατη Δραστηριότητα</div>
            {mockActivity.map((a,i)=>(
              <div key={a.id} style={{ padding:"11px 18px", borderBottom:i<mockActivity.length-1?"1px solid #F8FAFC":"none", display:"flex", gap:10, alignItems:"flex-start" }}>
                <ActivityDot type={a.type}/>
                <div><div style={{ fontSize:12, color:"#334155", lineHeight:1.4 }}>{a.message}</div><div style={{ fontSize:11, color:"#94A3B8", marginTop:2 }}>{a.time}</div></div>
              </div>
            ))}
          </div>
          <div style={{ background:"#fff", borderRadius:14, border:"1px solid #E2E8F0", padding:"16px 18px" }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#0F172A", marginBottom:10 }}>Συνοπτικά</div>
            {[["Συνολικά αιτήματα",stats.totalRequests],["Εκκρεμή αιτήματα",stats.pendingRequests],["Εγκεκριμένοι θεραπευτές",stats.totalTherapists],["Συνολικοί ασθενείς",stats.totalPatients]].map(([label,val])=>(
              <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"1px solid #F8FAFC", fontSize:12 }}>
                <span style={{ color:"#64748B" }}>{label}</span><span style={{ fontWeight:700, color:"#0F172A" }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
