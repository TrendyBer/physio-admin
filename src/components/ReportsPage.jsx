"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

function KPICard({ label, value, sub, bg, border, text }) {
  return (
    <div style={{ background:bg, border:`1px solid ${border}`, borderRadius:14, padding:"18px 20px", flex:1, minWidth:180 }}>
      <div style={{ fontSize:11, fontWeight:700, color:text, textTransform:"uppercase", letterSpacing:"0.05em", opacity:0.8, marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:28, fontWeight:700, color:text, lineHeight:1.1 }}>{value}</div>
      {sub && <div style={{ fontSize:12, color:text, opacity:0.7, marginTop:4 }}>{sub}</div>}
    </div>
  );
}

function Stars({ rating }) {
  return (
    <span style={{ fontSize:12, color:"#F59E0B" }}>
      {"★".repeat(Math.floor(rating))}{"☆".repeat(5-Math.floor(rating))}
      <span style={{ color:"#64748B", marginLeft:4 }}>{rating}</span>
    </span>
  );
}

export default function ReportsPage() {
  const [stats, setStats] = useState({
    totalRequests: 0, completedRequests: 0, activeRequests: 0, pendingRequests: 0,
    totalTherapists: 0, activeTherapists: 0, pendingTherapists: 0,
    totalPayments: 0, paidPayments: 0, unpaidPayments: 0,
    totalReviews: 0, avgRating: 0, commission: 20,
  });
  const [topTherapists, setTopTherapists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStats(); }, []);

  async function fetchStats() {
    setLoading(true);
    const [
      { data: requests },
      { data: therapists },
      { data: payments },
      { data: reviews },
      { data: settingsData },
    ] = await Promise.all([
      supabase.from("requests").select("status, assigned_to, created_at"),
      supabase.from("therapists").select("status, name, specialty"),
      supabase.from("payments").select("paid, amount"),
      supabase.from("therapist_reviews").select("rating, therapist_name, status"),
      supabase.from("platform_settings").select("value").eq("key","commission").single(),
    ]);

    const commission = parseInt(settingsData?.value || 20);
    const rq = requests || [];
    const th = therapists || [];
    const pm = payments || [];
    const rv = reviews || [];

    // Top therapists by cases
    const therapistCases = {};
    rq.filter(r=>r.assigned_to).forEach(r => {
      therapistCases[r.assigned_to] = (therapistCases[r.assigned_to] || 0) + 1;
    });

    // Avg rating per therapist
    const therapistRatings = {};
    rv.filter(r=>r.status==="published" && r.therapist_name && r.rating).forEach(r => {
      if (!therapistRatings[r.therapist_name]) therapistRatings[r.therapist_name] = { sum:0, count:0 };
      therapistRatings[r.therapist_name].sum += r.rating;
      therapistRatings[r.therapist_name].count++;
    });

    const top = Object.entries(therapistCases)
      .sort((a,b) => b[1]-a[1])
      .slice(0, 5)
      .map(([name, cases]) => ({
        name,
        specialty: th.find(t=>t.name===name)?.specialty || "",
        cases,
        rating: therapistRatings[name] ? (therapistRatings[name].sum/therapistRatings[name].count).toFixed(1) : null,
      }));

    const publishedReviews = rv.filter(r=>r.status==="published" && r.rating);
    const avgRating = publishedReviews.length > 0
      ? (publishedReviews.reduce((s,r)=>s+r.rating,0)/publishedReviews.length).toFixed(1)
      : 0;

    setStats({
      totalRequests:     rq.length,
      completedRequests: rq.filter(r=>r.status==="completed").length,
      activeRequests:    rq.filter(r=>r.status==="active").length,
      pendingRequests:   rq.filter(r=>r.status==="pending").length,
      totalTherapists:   th.length,
      activeTherapists:  th.filter(t=>t.status==="active").length,
      pendingTherapists: th.filter(t=>t.status==="pending").length,
      totalPayments:     pm.length * commission,
      paidPayments:      pm.filter(p=>p.paid).length * commission,
      unpaidPayments:    pm.filter(p=>!p.paid).length * commission,
      totalReviews:      rv.length,
      avgRating,
      commission,
    });
    setTopTherapists(top);
    setLoading(false);
  }

  const exportCSV = () => {
    const headers = "Μέτρηση,Τιμή\n";
    const rows = [
      ["Συνολικά Αιτήματα", stats.totalRequests],
      ["Ολοκληρωμένα", stats.completedRequests],
      ["Ενεργά", stats.activeRequests],
      ["Εκκρεμή", stats.pendingRequests],
      ["Ενεργοί Θεραπευτές", stats.activeTherapists],
      ["Σε αναμονή έγκρισης", stats.pendingTherapists],
      ["Εισπραγμένα", `${stats.paidPayments}€`],
      ["Απλήρωτα", `${stats.unpaidPayments}€`],
      ["Μέση Βαθμολογία", stats.avgRating],
    ].map(([k,v])=>`${k},${v}`).join("\n");

    const blob = new Blob([headers+rows], { type:"text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "physio_reports.csv"; a.click();
  };

  if (loading) return (
    <div style={{ padding:24, display:"flex", alignItems:"center", justifyContent:"center", minHeight:400 }}>
      <div style={{ fontSize:16, color:"#64748B" }}>Φόρτωση...</div>
    </div>
  );

  const conversionRate = stats.totalRequests > 0
    ? ((stats.completedRequests / stats.totalRequests) * 100).toFixed(1)
    : 0;

  return (
    <div>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:700, color:"#0F172A", margin:0 }}>Αναφορές</h1>
          <p style={{ fontSize:13, color:"#94A3B8", marginTop:4 }}>Πραγματικά δεδομένα από τη βάση</p>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={fetchStats} style={{ padding:"9px 18px", borderRadius:10, border:"1px solid #E2E8F0", background:"#fff", color:"#475569", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>🔄 Ανανέωση</button>
          <button onClick={exportCSV} style={{ padding:"9px 18px", borderRadius:10, border:"1px solid #E2E8F0", background:"#fff", color:"#475569", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>↓ Export CSV</button>
        </div>
      </div>

      {/* Αιτήματα */}
      <div style={{ fontSize:12, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:12 }}>Αιτήματα & Conversion</div>
      <div style={{ display:"flex", gap:12, marginBottom:24, flexWrap:"wrap" }}>
        <KPICard label="Συνολικά Αιτήματα"  value={stats.totalRequests}     sub="όλα τα αιτήματα"         bg="#F8FAFC" border="#E2E8F0" text="#475569"/>
        <KPICard label="Ολοκληρωμένα"        value={stats.completedRequests} sub={`${conversionRate}% conversion`} bg="#F0FDF4" border="#BBF7D0" text="#15803D"/>
        <KPICard label="Ενεργά"              value={stats.activeRequests}    sub="σε εξέλιξη"              bg="#EFF6FF" border="#BFDBFE" text="#1D4ED8"/>
        <KPICard label="Εκκρεμή"             value={stats.pendingRequests}   sub="χωρίς ανάθεση"           bg="#FFFBEB" border="#FDE68A" text="#B45309"/>
      </div>

      {/* Θεραπευτές */}
      <div style={{ fontSize:12, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:12 }}>Θεραπευτές</div>
      <div style={{ display:"flex", gap:12, marginBottom:24, flexWrap:"wrap" }}>
        <KPICard label="Ενεργοί Θεραπευτές"  value={stats.activeTherapists}  sub="εγκεκριμένοι"           bg="#F0FDF4" border="#BBF7D0" text="#15803D"/>
        <KPICard label="Σε Αναμονή"           value={stats.pendingTherapists} sub="περιμένουν έγκριση"     bg="#FEF3C7" border="#FDE68A" text="#92400E"/>
      </div>

      {/* Έσοδα */}
      <div style={{ fontSize:12, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:12 }}>Έσοδα & Πληρωμές</div>
      <div style={{ display:"flex", gap:12, marginBottom:24, flexWrap:"wrap" }}>
        <KPICard label="Εισπραγμένα"     value={`${stats.paidPayments}€`}   sub="επιβεβαιωμένες πληρωμές" bg="#F0FDF4" border="#BBF7D0" text="#15803D"/>
        <KPICard label="Απλήρωτα"        value={`${stats.unpaidPayments}€`} sub="εκκρεμείς πληρωμές"      bg="#FFF1F2" border="#FECDD3" text="#BE123C"/>
        <KPICard label="Προμήθεια/Περιστ." value={`${stats.commission}€`}   sub="ανά περιστατικό"         bg="#FFFBEB" border="#FDE68A" text="#B45309"/>
      </div>

      {/* Ποιότητα */}
      <div style={{ fontSize:12, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:12 }}>Ποιότητα & Reviews</div>
      <div style={{ display:"flex", gap:12, marginBottom:24, flexWrap:"wrap" }}>
        <KPICard label="Συνολικά Reviews" value={stats.totalReviews} sub="από ασθενείς"          bg="#FAF5FF" border="#E9D5FF" text="#7E22CE"/>
        <KPICard label="Μέση Βαθμολογία" value={stats.avgRating || "—"} sub="δημοσιευμένα reviews" bg="#FFFBEB" border="#FDE68A" text="#B45309"/>
      </div>

      {/* Top Therapists */}
      {topTherapists.length > 0 && (
        <>
          <div style={{ fontSize:12, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:12 }}>Top Θεραπευτές (βάσει περιστατικών)</div>
          <div style={{ background:"#fff", borderRadius:14, border:"1px solid #E2E8F0", overflow:"hidden", marginBottom:24 }}>
            <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 80px 1fr", padding:"8px 20px", background:"#F8FAFC", fontSize:11, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.04em" }}>
              <span>Θεραπευτής</span><span>Περιστατικά</span><span>Rating</span><span>Έσοδα</span>
            </div>
            {topTherapists.map((t,i) => (
              <div key={t.name} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 80px 1fr", padding:"12px 20px", borderTop:"1px solid #F1F5F9", alignItems:"center", background:i%2===0?"#fff":"#FAFAFA" }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:14, color:"#0F172A" }}>{t.name}</div>
                  <div style={{ fontSize:11, color:"#94A3B8" }}>{t.specialty}</div>
                </div>
                <span style={{ fontSize:16, fontWeight:700, color:"#0F172A" }}>{t.cases}</span>
                {t.rating ? <Stars rating={parseFloat(t.rating)}/> : <span style={{ fontSize:12, color:"#94A3B8" }}>—</span>}
                <span style={{ fontSize:14, fontWeight:600, color:"#15803D" }}>{t.cases * stats.commission}€</span>
              </div>
            ))}
          </div>
        </>
      )}

      {topTherapists.length === 0 && (
        <div style={{ background:"#fff", borderRadius:14, border:"1px solid #E2E8F0", padding:40, textAlign:"center", color:"#94A3B8", fontSize:14 }}>
          Δεν υπάρχουν δεδομένα ακόμα. Θα εμφανιστούν μόλις γίνουν αναθέσεις.
        </div>
      )}
    </div>
  );
}