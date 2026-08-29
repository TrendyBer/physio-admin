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
  const r = parseFloat(rating);
  return (
    <span style={{ fontSize:12, color:"#F59E0B", whiteSpace:"nowrap" }}>
      {"★".repeat(Math.floor(r))}{"☆".repeat(5-Math.floor(r))}
      <span style={{ color:"#64748B", marginLeft:4 }}>{rating}</span>
    </span>
  );
}

function Avatar({ name, photo, size=36 }) {
  if (photo) return <img src={photo} alt={name} style={{ width:size, height:size, borderRadius:"50%", objectFit:"cover", flexShrink:0 }}/>;
  return <div style={{ width:size, height:size, borderRadius:"50%", background:"#EFF6FF", color:"#1D4ED8", display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.33, fontWeight:700, flexShrink:0 }}>{(name||"?").split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}</div>;
}

export default function ReportsPage() {
  const [stats, setStats] = useState({
    totalRequests: 0, completedRequests: 0, confirmedRequests: 0, pendingRequests: 0, cancelledRequests: 0,
    bookingRequests: 0, freeAssessments: 0,
    totalTherapists: 0, approvedTherapists: 0, pendingTherapists: 0,
    totalPatients: 0,
    totalReviews: 0, publishedReviews: 0, avgRating: 0,
    totalBookings: 0,
    // ΠΡΑΓΜΑΤΙΚΑ ΕΣΟΔΑ.
    // Το παλιό νούμερο ήταν «ολοκληρωμένα αιτήματα × προμήθεια», που είναι
    // λάθος με δύο τρόπους:
    //   1. Η προμήθεια ήταν 20€ ενώ το τέλος είναι 10€.
    //   2. Το τέλος χρεώνεται ΜΙΑ ΦΟΡΑ ανά νέο ασθενή, όχι ανά συνεδρία.
    //      Ασθενής με 6 συνεδρίες έδινε 6 × 20€ = 120€ αντί για 10€.
    // Τώρα διαβάζουμε τον πίνακα payments, δηλαδή τι χρεώθηκε πραγματικά.
    feeCharges: 0, feePaid: 0, feeUnpaid: 0,
    revenueCollected: 0, revenueOutstanding: 0,
    defaultFee: 10,
  });
  const [topTherapists, setTopTherapists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStats(); }, []);

  async function fetchStats() {
    setLoading(true);
    const [
      { data: requests },
      { data: therapists },
      { data: patients },
      { data: bookings },
      { data: reviews },
      { data: settingsData },
      { data: paymentsData },
    ] = await Promise.all([
      supabase.from("session_requests").select("id, status, type, therapist_id, created_at"),
      supabase.from("therapist_profiles").select("id, name, specialty, area, is_approved, application_status, photo_url"),
      supabase.from("patient_profiles").select("id"),
      supabase.from("session_bookings").select("id, request_id, status, therapist_id, session_amount, net_to_therapist"),
      supabase.from("reviews").select("rating, therapist_id, is_published"),
      supabase.from("platform_settings").select("value").eq("key","first_session_fee_default").maybeSingle(),
      supabase.from("payments").select("id, amount, paid, status, therapist_id, created_at"),
    ]);

    const defaultFee = parseFloat(settingsData?.value) || 10;
    const pay = paymentsData || [];

    // Εισπραγμένα vs ανεξόφλητα. Το `paid` είναι η πηγή αλήθειας —
    // το `status` κρατάει και παλιές τιμές από το προηγούμενο μοντέλο.
    const paidRows = pay.filter(p => p.paid || p.status === "paid");
    const openRows = pay.filter(p => !p.paid && p.status !== "paid" && p.status !== "refunded");
    const sumAmt = (arr) => arr.reduce((a, b) => a + (parseFloat(b.amount) || 0), 0);
    const rq = requests || [];
    const th = therapists || [];
    const pt = patients || [];
    const bk = bookings || [];
    const rv = reviews || [];

    // Therapist map
    const therapistMap = {};
    th.forEach(t => { therapistMap[t.id] = t; });

    // Top therapists by completed/confirmed cases
    const therapistCases = {};
    rq.filter(r => r.therapist_id && (r.status === "completed" || r.status === "confirmed")).forEach(r => {
      therapistCases[r.therapist_id] = (therapistCases[r.therapist_id] || 0) + 1;
    });

    // Avg rating per therapist (only published reviews)
    const therapistRatings = {};
    rv.filter(r => r.is_published && r.therapist_id && r.rating).forEach(r => {
      if (!therapistRatings[r.therapist_id]) therapistRatings[r.therapist_id] = { sum:0, count:0 };
      therapistRatings[r.therapist_id].sum += r.rating;
      therapistRatings[r.therapist_id].count++;
    });

    // Τζίρος θεραπευτή: τι εισέπραξε ΑΥΤΟΣ σε μετρητά από ολοκληρωμένες
    // συνεδρίες. Δεν είναι έσοδο της πλατφόρμας.
    const therapistRevenue = {};
    bk.filter(b => b.status === "completed" && b.therapist_id).forEach(b => {
      const amt = parseFloat(b.net_to_therapist ?? b.session_amount) || 0;
      therapistRevenue[b.therapist_id] = (therapistRevenue[b.therapist_id] || 0) + amt;
    });

    const top = Object.entries(therapistCases)
      .sort((a,b) => b[1]-a[1])
      .slice(0, 5)
      .map(([tId, cases]) => {
        const t = therapistMap[tId];
        return {
          id: tId,
          name: t?.name || "Άγνωστος",
          specialty: t?.specialty || "",
          area: t?.area || "",
          photo_url: t?.photo_url || null,
          cases,
          revenue: therapistRevenue[tId] ? Math.round(therapistRevenue[tId] * 100) / 100 : 0,
          rating: therapistRatings[tId]
            ? (therapistRatings[tId].sum/therapistRatings[tId].count).toFixed(1)
            : null,
        };
      });

    const publishedRvs = rv.filter(r => r.is_published && r.rating);
    const avgRating = publishedRvs.length > 0
      ? (publishedRvs.reduce((s,r) => s + r.rating, 0) / publishedRvs.length).toFixed(1)
      : 0;

    setStats({
      totalRequests:      rq.length,
      completedRequests:  rq.filter(r => r.status === "completed").length,
      confirmedRequests:  rq.filter(r => r.status === "confirmed").length,
      pendingRequests:    rq.filter(r => r.status === "pending").length,
      cancelledRequests:  rq.filter(r => r.status === "cancelled").length,
      bookingRequests:    rq.filter(r => r.type === "booking").length,
      freeAssessments:    rq.filter(r => r.type === "free_assessment").length,
      totalTherapists:    th.length,
      approvedTherapists: th.filter(t => t.is_approved).length,
      pendingTherapists:  th.filter(t => !t.is_approved && t.application_status === "pending").length,
      totalPatients:      pt.length,
      totalReviews:       rv.length,
      publishedReviews:   publishedRvs.length,
      avgRating,
      totalBookings:      bk.length,
      feeCharges:         pay.length,
      feePaid:            paidRows.length,
      feeUnpaid:          openRows.length,
      revenueCollected:   Math.round(sumAmt(paidRows) * 100) / 100,
      revenueOutstanding: Math.round(sumAmt(openRows) * 100) / 100,
      defaultFee,
    });
    setTopTherapists(top);
    setLoading(false);
  }

  function exportCSV() {
    const headers = "Μέτρηση,Τιμή\n";
    const rows = [
      ["Συνολικά Αιτήματα",                stats.totalRequests],
      ["Ολοκληρωμένα",                     stats.completedRequests],
      ["Επιβεβαιωμένα (σε εξέλιξη)",       stats.confirmedRequests],
      ["Εκκρεμή (χωρίς ανάθεση)",          stats.pendingRequests],
      ["Ακυρωμένα",                        stats.cancelledRequests],
      ["Αιτήματα ραντεβού",                stats.bookingRequests],
      ["Δωρεάν Εκτιμήσεις",                stats.freeAssessments],
      ["Εγκεκριμένοι Θεραπευτές",          stats.approvedTherapists],
      ["Σε αναμονή έγκρισης",              stats.pendingTherapists],
      ["Συνολικοί Ασθενείς",               stats.totalPatients],
      ["Συνολικές Συνεδρίες",              stats.totalBookings],
      ["Δημοσιευμένα Reviews",             stats.publishedReviews],
      ["Μέση Βαθμολογία",                  stats.avgRating],
      ["Έσοδα εισπραγμένα (€)",            stats.revenueCollected],
      ["Έσοδα ανεξόφλητα (€)",             stats.revenueOutstanding],
      ["Χρεώσεις τέλους νέου ασθενή",      stats.feeCharges],
    ].map(([k,v])=>`${k},${v}`).join("\n");

    const blob = new Blob(["\uFEFF" + headers + rows], { type:"text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `physiohome_report_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  }

  if (loading) return (
    <div style={{ padding:24, display:"flex", alignItems:"center", justifyContent:"center", minHeight:400 }}>
      <div style={{ fontSize:16, color:"#64748B" }}>Φόρτωση αναφορών...</div>
    </div>
  );

  const conversionRate = stats.totalRequests > 0
    ? ((stats.completedRequests / stats.totalRequests) * 100).toFixed(1)
    : 0;

  const cancellationRate = stats.totalRequests > 0
    ? ((stats.cancelledRequests / stats.totalRequests) * 100).toFixed(1)
    : 0;

  return (
    <div>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:700, color:"#0F172A", margin:0 }}>Αναφορές</h1>
          <p style={{ fontSize:13, color:"#94A3B8", marginTop:4 }}>Πραγματικά δεδομένα από τη βάση · {new Date().toLocaleDateString("el-GR", { day:"2-digit", month:"long", year:"numeric" })}</p>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={fetchStats} style={{ padding:"9px 18px", borderRadius:10, border:"1px solid #E2E8F0", background:"#fff", color:"#475569", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>🔄 Ανανέωση</button>
          <button onClick={exportCSV} style={{ padding:"9px 18px", borderRadius:10, border:"none", background:"#1D4ED8", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>↓ Export CSV</button>
        </div>
      </div>

      {/* Section: Αιτήματα */}
      <div style={{ fontSize:12, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:12 }}>📋 Αιτήματα & Conversion</div>
      <div style={{ display:"flex", gap:12, marginBottom:24, flexWrap:"wrap" }}>
        <KPICard label="Συνολικά Αιτήματα"  value={stats.totalRequests}     sub="όλοι οι τύποι"                        bg="#F8FAFC" border="#E2E8F0" text="#475569"/>
        <KPICard label="Ολοκληρωμένα"        value={stats.completedRequests} sub={`${conversionRate}% conversion rate`} bg="#F0FDF4" border="#BBF7D0" text="#15803D"/>
        <KPICard label="Σε Εξέλιξη"          value={stats.confirmedRequests} sub="confirmed status"                     bg="#EFF6FF" border="#BFDBFE" text="#1D4ED8"/>
        <KPICard label="Εκκρεμή"             value={stats.pendingRequests}   sub="χωρίς ανάθεση"                        bg="#FFFBEB" border="#FDE68A" text="#B45309"/>
        <KPICard label="Ακυρωμένα"           value={stats.cancelledRequests} sub={`${cancellationRate}% cancel rate`}   bg="#FFF1F2" border="#FECDD3" text="#BE123C"/>
      </div>

      {/* Section: Τύποι Αιτημάτων */}
      <div style={{ fontSize:12, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:12 }}>🎯 Τύποι Αιτημάτων</div>
      <div style={{ display:"flex", gap:12, marginBottom:24, flexWrap:"wrap" }}>
        <KPICard label="📅 Κρατήσεις"         value={stats.bookingRequests}   sub="πακέτα ή μεμονωμένα" bg="#EFF6FF" border="#BFDBFE" text="#1D4ED8"/>
        <KPICard label="🆓 Δωρεάν Εκτιμήσεις" value={stats.freeAssessments}    sub="ζητήσεις εκτίμησης"  bg="#FEF3C7" border="#FDE68A" text="#92400E"/>
        <KPICard label="📅 Συνεδρίες"         value={stats.totalBookings}      sub="προγραμματισμένες"   bg="#F0FDF4" border="#BBF7D0" text="#15803D"/>
      </div>

      {/* Section: Θεραπευτές & Ασθενείς */}
      <div style={{ fontSize:12, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:12 }}>👥 Χρήστες</div>
      <div style={{ display:"flex", gap:12, marginBottom:24, flexWrap:"wrap" }}>
        <KPICard label="Εγκεκριμένοι Θεραπευτές" value={stats.approvedTherapists} sub={`από ${stats.totalTherapists} συνολικά`} bg="#F0FDF4" border="#BBF7D0" text="#15803D"/>
        <KPICard label="Σε Αναμονή Έγκρισης"      value={stats.pendingTherapists}  sub="με υποβληθέντα δικαιολογητικά"          bg="#FEF3C7" border="#FDE68A" text="#92400E"/>
        <KPICard label="Συνολικοί Ασθενείς"       value={stats.totalPatients}      sub="εγγεγραμμένοι"                          bg="#EFF6FF" border="#BFDBFE" text="#1D4ED8"/>
      </div>

      {/* ── ΕΣΟΔΑ ──
          ΠΡΑΓΜΑΤΙΚΑ νούμερα από τον πίνακα payments, όχι εκτίμηση.
          Το τέλος νέου ασθενή χρεώνεται ΜΙΑ φορά ανά νέο ασθενή· ένας
          ασθενής με 6 συνεδρίες δίνει 10€, όχι 60€. */}
      <div style={{ fontSize:12, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:12 }}>Έσοδα πλατφόρμας</div>
      <div style={{ display:"flex", gap:12, marginBottom:12, flexWrap:"wrap" }}>
        <KPICard label="Εισπραγμένα"        value={`${stats.revenueCollected}€`}   sub={`${stats.feePaid} εξοφλημένα τέλη`}      bg="#F0FDF4" border="#BBF7D0" text="#15803D"/>
        <KPICard label="Ανεξόφλητα"         value={`${stats.revenueOutstanding}€`} sub={`${stats.feeUnpaid} εκκρεμούν`}          bg="#FFFBEB" border="#FDE68A" text="#B45309"/>
        <KPICard label="Χρεώσεις σύνολο"    value={stats.feeCharges}               sub="τέλη νέου ασθενή"                        bg="#EFF6FF" border="#BFDBFE" text="#1D4ED8"/>
        <KPICard label="Τέλος/νέο ασθενή"   value={`${stats.defaultFee}€`}         sub="προεπιλογή · ρύθμιση στα Πακέτα"         bg="#F8FAFC" border="#E2E8F0" text="#475569"/>
      </div>

      <div style={{ background:"#EFF6FF", border:"1px solid #BFDBFE", borderRadius:12, padding:"12px 16px", marginBottom:24, fontSize:12.5, color:"#1E40AF", lineHeight:1.65 }}>
        Ο ασθενής πληρώνει τον θεραπευτή <strong>απευθείας σε μετρητά</strong>. Η πλατφόρμα δεν κρατάει
        τίποτα από τη συνεδρία — το μοναδικό έσοδο είναι το τέλος νέου ασθενή, που χρεώνεται
        <strong> μία φορά</strong> για κάθε νέο ζευγάρι ασθενή–θεραπευτή.
      </div>

      {/* Section: Reviews */}
      <div style={{ fontSize:12, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:12 }}>⭐ Ποιότητα & Reviews</div>
      <div style={{ display:"flex", gap:12, marginBottom:28, flexWrap:"wrap" }}>
        <KPICard label="Συνολικά Reviews"  value={stats.totalReviews}                    sub="από ασθενείς"          bg="#FAF5FF" border="#E9D5FF" text="#7E22CE"/>
        <KPICard label="Δημοσιευμένα"      value={stats.publishedReviews}                sub="ορατά στο site"        bg="#F0FDF4" border="#BBF7D0" text="#15803D"/>
        <KPICard label="Μέση Βαθμολογία"   value={stats.avgRating || "—"}                sub={stats.avgRating ? "⭐ από 5.0" : "καμία αξιολόγηση"} bg="#FFFBEB" border="#FDE68A" text="#B45309"/>
      </div>

      {/* Top Therapists */}
      {topTherapists.length > 0 ? (
        <>
          <div style={{ fontSize:12, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:12 }}>🏆 Top Θεραπευτές (βάσει περιστατικών)</div>
          <div style={{ background:"#fff", borderRadius:14, border:"1px solid #E2E8F0", overflow:"hidden", marginBottom:24 }}>
            <div style={{ display:"grid", gridTemplateColumns:"50px 2fr 1fr 100px 120px 100px", padding:"10px 20px", background:"#F8FAFC", fontSize:11, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.04em" }}>
              <span>#</span><span>Θεραπευτής</span><span>Περιοχή</span><span>Περιστ.</span><span>Rating</span><span>Τζίρος</span>
            </div>
            {topTherapists.map((t,i) => (
              <div key={t.id} style={{ display:"grid", gridTemplateColumns:"50px 2fr 1fr 100px 120px 100px", padding:"12px 20px", borderTop:"1px solid #F1F5F9", alignItems:"center", background:i===0?"#FFFBEB":(i%2===0?"#fff":"#FAFAFA") }}>
                <span style={{ fontSize:18, fontWeight:700, color:i===0?"#F59E0B":"#94A3B8" }}>
                  {i===0 ? "🥇" : i===1 ? "🥈" : i===2 ? "🥉" : `#${i+1}`}
                </span>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <Avatar name={t.name} photo={t.photo_url}/>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:14, color:"#0F172A" }}>{t.name}</div>
                    <div style={{ fontSize:11, color:"#94A3B8" }}>{t.specialty}</div>
                  </div>
                </div>
                <span style={{ fontSize:13, color:"#475569" }}>{t.area || "—"}</span>
                <span style={{ fontSize:18, fontWeight:700, color:"#0F172A" }}>{t.cases}</span>
                {t.rating ? <Stars rating={t.rating}/> : <span style={{ fontSize:12, color:"#94A3B8" }}>—</span>}
                {/* Τζίρος του ΘΕΡΑΠΕΥΤΗ, όχι έσοδο της πλατφόρμας.
                    Παλιά έγραφε «Έσοδα» και πολλαπλασίαζε με την προμήθεια. */}
                <span style={{ fontSize:14, fontWeight:600, color:"#475569" }} title="Τζίρος θεραπευτή, όχι έσοδο πλατφόρμας">
                  {t.revenue ? `${t.revenue}€` : "—"}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ background:"#fff", borderRadius:14, border:"1px solid #E2E8F0", padding:40, textAlign:"center", color:"#94A3B8", fontSize:14 }}>
          Δεν υπάρχουν δεδομένα για top therapists ακόμα. Θα εμφανιστούν μόλις ολοκληρωθούν αιτήματα.
        </div>
      )}
    </div>
  );
}