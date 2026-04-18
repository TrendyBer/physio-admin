"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

function Avatar({ name, size=40 }) {
  return <div style={{ width:size, height:size, borderRadius:"50%", background:"#EFF6FF", color:"#1D4ED8", display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.33, fontWeight:700, flexShrink:0 }}>{(name||"?").split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}</div>;
}

function StatCard({ label, value, sub, bg, border, text }) {
  return (
    <div style={{ flex:1, minWidth:140, background:bg, border:`1px solid ${border}`, borderRadius:14, padding:"20px 24px" }}>
      <div style={{ fontSize:11, fontWeight:700, color:text, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:34, fontWeight:700, color:text, lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:12, color:text, opacity:0.7, marginTop:6 }}>{sub}</div>}
    </div>
  );
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [commission, setCommission] = useState(20);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);

    // Fetch commission from settings
    const { data: settingsData } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "commission")
      .single();
    if (settingsData) setCommission(parseInt(settingsData.value) || 20);

    // Fetch payments grouped by therapist
    const { data: paymentsData } = await supabase
      .from("payments")
      .select(`*, therapists(name, specialty, area)`)
      .order("created_at", { ascending: false });

    if (paymentsData) {
      // Group by therapist
      const grouped = {};
      paymentsData.forEach(p => {
        const key = p.therapist_id;
        if (!grouped[key]) {
          grouped[key] = {
            id: p.therapist_id,
            name: p.therapists?.name || "Άγνωστος",
            specialty: p.therapists?.specialty || "",
            area: p.therapists?.area || "",
            cases: [],
          };
        }
        grouped[key].cases.push({
          id: p.id,
          patient: p.patient_name,
          date: new Date(p.created_at).toLocaleDateString("el-GR"),
          paid: p.paid,
        });
      });
      setPayments(Object.values(grouped));
    }
    setLoading(false);
  }

  async function markCasePaid(caseId) {
    await supabase
      .from("payments")
      .update({ paid: true, paid_at: new Date().toISOString() })
      .eq("id", caseId);
    await fetchAll();
  }

  async function markAllPaid(therapistId) {
    const therapist = payments.find(t => t.id === therapistId);
    if (!therapist) return;
    const unpaidIds = therapist.cases.filter(c => !c.paid).map(c => c.id);
    await supabase
      .from("payments")
      .update({ paid: true, paid_at: new Date().toISOString() })
      .in("id", unpaidIds);
    await fetchAll();
  }

  const totalCases  = payments.reduce((sum,t) => sum + t.cases.length, 0);
  const totalEarned = payments.reduce((sum,t) => sum + t.cases.filter(c=>c.paid).length, 0) * commission;
  const totalUnpaid = payments.reduce((sum,t) => sum + t.cases.filter(c=>!c.paid).length, 0) * commission;

  if (loading) return (
    <div style={{ padding:24, display:"flex", alignItems:"center", justifyContent:"center", minHeight:400 }}>
      <div style={{ fontSize:16, color:"#64748B" }}>Φόρτωση...</div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:26, fontWeight:700, color:"#0F172A", margin:0 }}>Πληρωμές</h1>
        <p style={{ fontSize:13, color:"#94A3B8", marginTop:4 }}>Παρακολούθηση προμηθειών · {commission}€ ανά περιστατικό</p>
      </div>

      <div style={{ display:"flex", gap:14, marginBottom:28, flexWrap:"wrap" }}>
        <StatCard label="Συνολικά Έσοδα"   value={`${totalCases * commission}€`}  sub={`${totalCases} περιστατικά`}  bg="#F8FAFC" border="#E2E8F0" text="#475569"/>
        <StatCard label="Εισπραγμένα"       value={`${totalEarned}€`}              sub={`${totalEarned/commission || 0} περιστατικά`} bg="#F0FDF4" border="#BBF7D0" text="#15803D"/>
        <StatCard label="Απλήρωτα"          value={`${totalUnpaid}€`}              sub={`${totalUnpaid/commission || 0} περιστατικά`} bg="#FFF1F2" border="#FECDD3" text="#BE123C"/>
        <StatCard label="Προμήθεια/Περιστ." value={`${commission}€`}               sub="ανά ανατεθέν περιστατικό"    bg="#FFFBEB" border="#FDE68A" text="#B45309"/>
      </div>

      {payments.length === 0 ? (
        <div style={{ background:"#fff", borderRadius:14, border:"1px solid #E2E8F0", padding:40, textAlign:"center", color:"#94A3B8", fontSize:14 }}>
          Δεν υπάρχουν πληρωμές ακόμα. Θα εμφανιστούν αυτόματα όταν κάνεις ανάθεση αιτήματος σε θεραπευτή.
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {payments.map(t => {
            const unpaidCases  = t.cases.filter(c=>!c.paid).length;
            const paidCases    = t.cases.filter(c=>c.paid).length;
            const unpaidAmount = unpaidCases * commission;
            const paidAmount   = paidCases * commission;
            const isExpanded   = expanded === t.id;

            return (
              <div key={t.id} style={{ background:"#fff", borderRadius:14, border:"1px solid #E2E8F0", overflow:"hidden" }}>
                <div style={{ padding:"16px 20px", display:"flex", alignItems:"center", gap:14, cursor:"pointer" }}
                  onClick={() => setExpanded(isExpanded ? null : t.id)}
                  onMouseEnter={e=>e.currentTarget.style.background="#FAFAFA"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>

                  <Avatar name={t.name}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:15, color:"#0F172A" }}>{t.name}</div>
                    <div style={{ fontSize:12, color:"#64748B", marginTop:2 }}>{t.specialty} · {t.area}</div>
                  </div>

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
                      <div style={{ fontSize:18, fontWeight:700, color:unpaidAmount>0?"#BE123C":"#15803D" }}>{unpaidAmount}€</div>
                      <div style={{ fontSize:11, color:"#94A3B8" }}>απλήρωτα</div>
                    </div>
                    {unpaidCases > 0 && (
                      <button onClick={e=>{ e.stopPropagation(); markAllPaid(t.id); }}
                        style={{ padding:"7px 14px", borderRadius:8, border:"none", background:"#15803D", color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                        Όλα ✓
                      </button>
                    )}
                    {unpaidCases === 0 && t.cases.length > 0 && (
                      <span style={{ fontSize:12, color:"#15803D", fontWeight:600 }}>✓ Τακτοποιημένο</span>
                    )}
                    <div style={{ fontSize:18, color:"#94A3B8", transition:"transform 0.2s", transform:isExpanded?"rotate(180deg)":"rotate(0deg)" }}>▾</div>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ borderTop:"1px solid #F1F5F9" }}>
                    {t.cases.length === 0 ? (
                      <div style={{ padding:"16px 20px", fontSize:13, color:"#94A3B8", fontStyle:"italic" }}>Δεν υπάρχουν περιστατικά ακόμα.</div>
                    ) : (
                      <>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 100px 120px", padding:"8px 20px", background:"#F8FAFC", fontSize:11, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.04em" }}>
                          <span>Ασθενής</span><span>Ημ/νία</span><span>Ποσό</span><span>Κατάσταση</span>
                        </div>
                        {t.cases.map((c,i) => (
                          <div key={c.id} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 100px 120px", padding:"12px 20px", borderTop:"1px solid #F8FAFC", alignItems:"center", background:i%2===0?"#fff":"#FAFAFA" }}>
                            <span style={{ fontWeight:600, fontSize:13, color:"#0F172A" }}>{c.patient}</span>
                            <span style={{ fontSize:13, color:"#64748B" }}>{c.date}</span>
                            <span style={{ fontSize:13, fontWeight:700, color:"#0F172A" }}>{commission}€</span>
                            <div>
                              {c.paid ? (
                                <span style={{ fontSize:12, color:"#15803D", fontWeight:600 }}>✓ Εισπράχθηκε</span>
                              ) : (
                                <button onClick={()=>markCasePaid(c.id)}
                                  style={{ padding:"4px 12px", borderRadius:6, border:"1px solid #BBF7D0", background:"#F0FDF4", color:"#15803D", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                                  Εισπράχθηκε ✓
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 100px 120px", padding:"10px 20px", background:"#F8FAFC", borderTop:"1px solid #E2E8F0" }}>
                          <span style={{ fontSize:12, fontWeight:700, color:"#475569" }}>Σύνολο</span>
                          <span></span>
                          <span style={{ fontSize:13, fontWeight:700, color:"#0F172A" }}>{t.cases.length * commission}€</span>
                          <span style={{ fontSize:12, color:unpaidAmount>0?"#BE123C":"#15803D", fontWeight:600 }}>
                            {unpaidAmount>0 ? `${unpaidAmount}€ απλήρωτα` : "✓ Τακτοποιημένο"}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}