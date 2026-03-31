"use client";
import { useState } from "react";

const COMMISSION_PER_CASE = 20; // € προμήθεια ανά περιστατικό

const MOCK_PAYMENTS = [
  {
    id:1, name:"Νίκος Γεωργίου", specialty:"Νευρολογική", area:"Θεσσαλονίκη",
    cases:[
      { id:1, patient:"Γιώργος Μπέης",     date:"2025-03-10", paid:false },
      { id:2, patient:"Ελένη Σταύρου",     date:"2025-03-15", paid:false },
      { id:3, patient:"Κώστας Παπαδάκης",  date:"2025-02-20", paid:true  },
      { id:4, patient:"Άννα Μιχαλοπούλου", date:"2025-01-05", paid:true  },
    ],
  },
  {
    id:2, name:"Ελένη Κωστοπούλου", specialty:"Αθλητική", area:"Πάτρα",
    cases:[
      { id:5, patient:"Μάριος Αντωνίου", date:"2025-03-20", paid:false },
      { id:6, patient:"Σοφία Δημητρίου", date:"2025-03-22", paid:false },
    ],
  },
  {
    id:3, name:"Σοφία Νικολάου", specialty:"Αναπνευστική", area:"Αθήνα",
    cases:[
      { id:7, patient:"Νίκος Θεοδώρου", date:"2025-02-01", paid:true },
    ],
  },
  {
    id:4, name:"Μαρία Παπαδοπούλου", specialty:"Ορθοπαιδική", area:"Αθήνα",
    cases:[],
  },
];

function Avatar({ name, size=40 }) {
  return <div style={{ width:size, height:size, borderRadius:"50%", background:"#EFF6FF", color:"#1D4ED8", display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.33, fontWeight:700, flexShrink:0 }}>{name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}</div>;
}

function StatCard({ label, value, sub, bg, border, text }) {
  return (
    <div style={{ flex:1, minWidth:140, background:bg, border:`1px solid ${border}`, borderRadius:14, padding:"20px 24px" }}>
      <div style={{ fontSize:11, fontWeight:700, color:text, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:34, fontWeight:700, color:text, fontFamily:"'DM Serif Display',serif", lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:12, color:text, opacity:0.7, marginTop:6 }}>{sub}</div>}
    </div>
  );
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState(MOCK_PAYMENTS);
  const [expanded, setExpanded] = useState(null);

  const markCasePaid = (therapistId, caseId) => {
    setPayments(prev => prev.map(t =>
      t.id === therapistId
        ? { ...t, cases: t.cases.map(c => c.id===caseId ? {...c, paid:true} : c) }
        : t
    ));
  };

  const markAllPaid = (therapistId) => {
    setPayments(prev => prev.map(t =>
      t.id === therapistId
        ? { ...t, cases: t.cases.map(c => ({...c, paid:true})) }
        : t
    ));
  };

  // Συνολικά stats
  const totalCases     = payments.reduce((sum,t) => sum + t.cases.length, 0);
  const totalEarned    = payments.reduce((sum,t) => sum + t.cases.filter(c=>c.paid).length, 0) * COMMISSION_PER_CASE;
  const totalUnpaid    = payments.reduce((sum,t) => sum + t.cases.filter(c=>!c.paid).length, 0) * COMMISSION_PER_CASE;
  const totalRevenue   = totalCases * COMMISSION_PER_CASE;

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:26, fontWeight:700, color:"#0F172A", fontFamily:"'DM Serif Display',serif", margin:0 }}>Πληρωμές</h1>
        <p style={{ fontSize:13, color:"#94A3B8", marginTop:4 }}>Παρακολούθηση προμηθειών ανά θεραπευτή · {COMMISSION_PER_CASE}€ ανά περιστατικό</p>
      </div>

      {/* Summary cards */}
      <div style={{ display:"flex", gap:14, marginBottom:28, flexWrap:"wrap" }}>
        <StatCard label="Συνολικά Έσοδα"   value={`${totalRevenue}€`}  sub={`${totalCases} περιστατικά`}                       bg="#F8FAFC" border="#E2E8F0" text="#475569"/>
        <StatCard label="Εισπραγμένα"       value={`${totalEarned}€`}   sub={`${totalEarned/COMMISSION_PER_CASE} περιστατικά`}   bg="#F0FDF4" border="#BBF7D0" text="#15803D"/>
        <StatCard label="Απλήρωτα"          value={`${totalUnpaid}€`}   sub={`${totalUnpaid/COMMISSION_PER_CASE} περιστατικά`}   bg="#FFF1F2" border="#FECDD3" text="#BE123C"/>
        <StatCard label="Προμήθεια/Περιστ." value={`${COMMISSION_PER_CASE}€`} sub="ανά ανατεθέν περιστατικό"                    bg="#FFFBEB" border="#FDE68A" text="#B45309"/>
      </div>

      {/* Per therapist */}
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {payments.map(t => {
          const unpaidCases  = t.cases.filter(c=>!c.paid).length;
          const paidCases    = t.cases.filter(c=>c.paid).length;
          const unpaidAmount = unpaidCases * COMMISSION_PER_CASE;
          const paidAmount   = paidCases * COMMISSION_PER_CASE;
          const isExpanded   = expanded === t.id;

          return (
            <div key={t.id} style={{ background:"#fff", borderRadius:14, border:"1px solid #E2E8F0", overflow:"hidden" }}>

              {/* Therapist row */}
              <div style={{ padding:"16px 20px", display:"flex", alignItems:"center", gap:14, cursor:"pointer" }}
                onClick={() => setExpanded(isExpanded ? null : t.id)}
                onMouseEnter={e=>e.currentTarget.style.background="#FAFAFA"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>

                <Avatar name={t.name}/>

                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:15, color:"#0F172A" }}>{t.name}</div>
                  <div style={{ fontSize:12, color:"#64748B", marginTop:2 }}>{t.specialty} · {t.area}</div>
                </div>

                {/* Stats */}
                <div style={{ display:"flex", gap:20, alignItems:"center", flexShrink:0 }}>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontSize:18, fontWeight:700, color:"#0F172A" }}>{t.cases.length}</div>
                    <div style={{ fontSize:11, color:"#94A3B8" }}>περιστατικά</div>
                  </div>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontSize:18, fontWeight:700, color:"#15803D" }}>{paidAmount}€</div>
                    <div style={{ fontSize:11, color:"#94A3B8" }}>εισπράχθηκε</div>
                  </div>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontSize:18, fontWeight:700, color: unpaidAmount>0?"#BE123C":"#15803D" }}>{unpaidAmount}€</div>
                    <div style={{ fontSize:11, color:"#94A3B8" }}>απλήρωτα</div>
                  </div>

                  {/* Mark all paid */}
                  {unpaidCases > 0 && (
                    <button onClick={e=>{ e.stopPropagation(); markAllPaid(t.id); }} style={{ padding:"7px 14px", borderRadius:8, border:"none", background:"#15803D", color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}
                      onMouseEnter={e=>e.currentTarget.style.opacity="0.8"}
                      onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                      Όλα ✓
                    </button>
                  )}
                  {unpaidCases === 0 && t.cases.length > 0 && (
                    <span style={{ fontSize:12, color:"#15803D", fontWeight:600 }}>✓ Τακτοποιημένο</span>
                  )}

                  {/* Expand arrow */}
                  <div style={{ fontSize:18, color:"#94A3B8", transition:"transform 0.2s", transform:isExpanded?"rotate(180deg)":"rotate(0deg)" }}>▾</div>
                </div>
              </div>

              {/* Expanded case list */}
              {isExpanded && (
                <div style={{ borderTop:"1px solid #F1F5F9" }}>
                  {t.cases.length === 0
                    ? <div style={{ padding:"16px 20px", fontSize:13, color:"#94A3B8", fontStyle:"italic" }}>Δεν υπάρχουν περιστατικά ακόμα.</div>
                    : (
                      <>
                        {/* Header */}
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 100px 120px", padding:"8px 20px", background:"#F8FAFC", fontSize:11, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.04em" }}>
                          <span>Ασθενής</span><span>Ημ/νία Ανάθεσης</span><span>Προμήθεια</span><span>Κατάσταση</span>
                        </div>
                        {t.cases.map((c,i) => (
                          <div key={c.id} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 100px 120px", padding:"12px 20px", borderTop:"1px solid #F8FAFC", alignItems:"center", background:i%2===0?"#fff":"#FAFAFA" }}>
                            <span style={{ fontWeight:600, fontSize:13, color:"#0F172A" }}>{c.patient}</span>
                            <span style={{ fontSize:13, color:"#64748B" }}>{c.date}</span>
                            <span style={{ fontSize:13, fontWeight:700, color:"#0F172A" }}>{COMMISSION_PER_CASE}€</span>
                            <div>
                              {c.paid
                                ? <span style={{ fontSize:12, color:"#15803D", fontWeight:600 }}>✓ Εισπράχθηκε</span>
                                : (
                                  <button onClick={()=>markCasePaid(t.id, c.id)} style={{ padding:"4px 12px", borderRadius:6, border:"1px solid #BBF7D0", background:"#F0FDF4", color:"#15803D", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}
                                    onMouseEnter={e=>e.currentTarget.style.background="#D1FAE5"}
                                    onMouseLeave={e=>e.currentTarget.style.background="#F0FDF4"}>
                                    Εισπράχθηκε ✓
                                  </button>
                                )
                              }
                            </div>
                          </div>
                        ))}
                        {/* Therapist total */}
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 100px 120px", padding:"10px 20px", background:"#F8FAFC", borderTop:"1px solid #E2E8F0" }}>
                          <span style={{ fontSize:12, fontWeight:700, color:"#475569" }}>Σύνολο</span>
                          <span></span>
                          <span style={{ fontSize:13, fontWeight:700, color:"#0F172A" }}>{t.cases.length * COMMISSION_PER_CASE}€</span>
                          <span style={{ fontSize:12, color: unpaidAmount>0?"#BE123C":"#15803D", fontWeight:600 }}>
                            {unpaidAmount>0 ? `${unpaidAmount}€ απλήρωτα` : "✓ Τακτοποιημένο"}
                          </span>
                        </div>
                      </>
                    )
                  }
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
