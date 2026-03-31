"use client";
import { useState } from "react";

const PERIODS = ["Εβδομάδα", "Μήνας", "Έτος"];

const MONTHLY_DATA = [
  { month:"Ιαν", requests:18, completed:14, revenue:280,  commission:140, newTherapists:1, approved:1 },
  { month:"Φεβ", requests:24, completed:19, revenue:380,  commission:190, newTherapists:2, approved:1 },
  { month:"Μαρ", requests:38, completed:29, revenue:580,  commission:290, newTherapists:3, approved:2 },
  { month:"Απρ", requests:32, completed:25, revenue:500,  commission:250, newTherapists:2, approved:2 },
  { month:"Μαϊ", requests:45, completed:36, revenue:720,  commission:360, newTherapists:4, approved:3 },
  { month:"Ιουν",requests:52, completed:41, revenue:820,  commission:410, newTherapists:3, approved:2 },
];

const TOP_THERAPISTS = [
  { name:"Νίκος Γεωργίου",     specialty:"Νευρολογική",  cases:24, rating:4.8, utilization:85 },
  { name:"Ελένη Κωστοπούλου", specialty:"Αθλητική",      cases:18, rating:4.9, utilization:72 },
  { name:"Σοφία Νικολάου",    specialty:"Αναπνευστική",  cases:12, rating:4.6, utilization:60 },
  { name:"Μαρία Παπαδοπούλου",specialty:"Ορθοπαιδική",   cases:8,  rating:4.7, utilization:45 },
];

const BLOG_ANALYTICS = [
  { title:"5 ασκήσεις για τον πόνο στη μέση",          category:"Ορθοπαιδική", views:234, avgTime:"3:42", bounceRate:38 },
  { title:"Πώς να επιλέξετε φυσιοθεραπευτή",           category:"Γενικά",      views:412, avgTime:"4:15", bounceRate:31 },
  { title:"Αποκατάσταση μετά από εγχείρηση γόνατος",   category:"Ορθοπαιδική", views:187, avgTime:"2:58", bounceRate:44 },
];

const FUNNEL_DATA = [
  { step:"Επισκέπτες site",         value:1840, pct:100, color:"#1D4ED8" },
  { step:"Βλέπουν φόρμα αιτήματος",value:620,  pct:34,  color:"#7E22CE" },
  { step:"Ξεκινούν τη φόρμα",       value:310,  pct:17,  color:"#F59E0B" },
  { step:"Ολοκληρώνουν (submit)",   value:187,  pct:10,  color:"#15803D" },
];

function KPICard({ label, value, sub, trend, bg, border, text, info, badge }) {
  return (
    <div style={{ background:bg, border:`1px solid ${border}`, borderRadius:14, padding:"18px 20px", flex:1, minWidth:180 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
        <div style={{ fontSize:11, fontWeight:700, color:text, textTransform:"uppercase", letterSpacing:"0.05em", opacity:0.8 }}>{label}</div>
        {badge && <span style={{ fontSize:10, fontWeight:700, background:"#FEF3C7", color:"#92400E", padding:"2px 6px", borderRadius:999, textTransform:"uppercase", letterSpacing:"0.04em" }}>GA</span>}
      </div>
      <div style={{ fontSize:28, fontWeight:700, color:text, fontFamily:"'DM Serif Display',serif", lineHeight:1.1 }}>{value}</div>
      {sub && <div style={{ fontSize:12, color:text, opacity:0.7, marginTop:4 }}>{sub}</div>}
      {trend && <div style={{ fontSize:12, color:trend.startsWith("+")?"#15803D":"#BE123C", marginTop:4, fontWeight:600 }}>{trend} vs προηγ. μήνα</div>}
      {info && <div style={{ fontSize:11, color:text, opacity:0.5, marginTop:6, lineHeight:1.4 }}>{info}</div>}
    </div>
  );
}

function MiniBar({ value, max, color }) {
  const pct = Math.round((value/max)*100);
  return (
    <div style={{ flex:1, background:"#F1F5F9", borderRadius:999, height:8, overflow:"hidden" }}>
      <div style={{ width:`${pct}%`, height:"100%", background:color, borderRadius:999 }}/>
    </div>
  );
}

function BarChart({ data, valueKey, color, label }) {
  const max = Math.max(...data.map(d=>d[valueKey]));
  return (
    <div>
      <div style={{ fontSize:12, fontWeight:700, color:"#64748B", marginBottom:12, textTransform:"uppercase", letterSpacing:"0.05em" }}>{label}</div>
      <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:100 }}>
        {data.map(d => {
          const h = Math.round((d[valueKey]/max)*90);
          return (
            <div key={d.month} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
              <div style={{ fontSize:10, color:"#64748B", fontWeight:600 }}>{d[valueKey]}</div>
              <div style={{ width:"100%", height:h, background:color, borderRadius:"4px 4px 0 0", minHeight:4 }}/>
              <div style={{ fontSize:10, color:"#94A3B8" }}>{d.month}</div>
            </div>
          );
        })}
      </div>
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

function SectionTitle({ title, gaLabel }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
      <div style={{ fontSize:13, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.05em" }}>{title}</div>
      {gaLabel && <span style={{ fontSize:10, fontWeight:700, background:"#FEF3C7", color:"#92400E", padding:"2px 8px", borderRadius:999, textTransform:"uppercase" }}>Συνδέεται με Google Analytics</span>}
    </div>
  );
}

export default function ReportsPage() {
  const [period, setPeriod] = useState("Μήνας");

  const lastMonth = MONTHLY_DATA[MONTHLY_DATA.length-1];
  const prevMonth = MONTHLY_DATA[MONTHLY_DATA.length-2];

  const totalCompleted  = MONTHLY_DATA.reduce((s,d)=>s+d.completed,0);
  const totalRequests   = MONTHLY_DATA.reduce((s,d)=>s+d.requests,0);
  const totalRevenue    = MONTHLY_DATA.reduce((s,d)=>s+d.revenue,0);
  const totalCommission = MONTHLY_DATA.reduce((s,d)=>s+d.commission,0);
  const totalNewTherapists = MONTHLY_DATA.reduce((s,d)=>s+d.newTherapists,0);
  const totalApproved   = MONTHLY_DATA.reduce((s,d)=>s+d.approved,0);

  const conversionRate  = ((totalCompleted/totalRequests)*100).toFixed(1);
  const cancellationRate= (((totalRequests-totalCompleted)/totalRequests)*100).toFixed(1);
  const avgOrderValue   = (totalRevenue/totalCompleted).toFixed(0);
  const avgRating       = (TOP_THERAPISTS.reduce((s,t)=>s+t.rating,0)/TOP_THERAPISTS.length).toFixed(1);
  const reviewRate      = "68%";
  const packageRate     = "34%";
  const avgUtilization  = Math.round(TOP_THERAPISTS.reduce((s,t)=>s+t.utilization,0)/TOP_THERAPISTS.length);

  const commissionTrend = lastMonth.commission > prevMonth.commission
    ? `+${lastMonth.commission-prevMonth.commission}€`
    : `-${prevMonth.commission-lastMonth.commission}€`;

  const exportCSV = () => {
    const headers = "Μήνας,Αιτήματα,Ολοκληρωμένα,Έσοδα,Προμήθεια\n";
    const rows = MONTHLY_DATA.map(d=>`${d.month},${d.requests},${d.completed},${d.revenue}€,${d.commission}€`).join("\n");
    const blob = new Blob([headers+rows], { type:"text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "physio_reports.csv"; a.click();
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:700, color:"#0F172A", fontFamily:"'DM Serif Display',serif", margin:0 }}>Αναφορές</h1>
          <p style={{ fontSize:13, color:"#94A3B8", marginTop:4 }}>Business KPIs και analytics · <span style={{ background:"#FEF3C7", color:"#92400E", padding:"1px 6px", borderRadius:4, fontSize:11, fontWeight:700 }}>GA</span> = Συνδέεται με Google Analytics</p>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <div style={{ display:"flex", gap:4, background:"#E2E8F0", padding:4, borderRadius:10 }}>
            {PERIODS.map(p=>(
              <button key={p} onClick={()=>setPeriod(p)} style={{ padding:"6px 14px", borderRadius:7, border:"none", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", background:period===p?"#fff":"transparent", color:period===p?"#0F172A":"#64748B", boxShadow:period===p?"0 1px 4px rgba(0,0,0,0.1)":"none" }}>{p}</button>
            ))}
          </div>
          <button onClick={exportCSV} style={{ padding:"9px 18px", borderRadius:10, border:"1px solid #E2E8F0", background:"#fff", color:"#475569", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>↓ Export CSV</button>
        </div>
      </div>

      {/* ── SECTION 1: Conversion & Bookings ── */}
      <SectionTitle title="Κρατήσεις & Conversion"/>
      <div style={{ display:"flex", gap:12, marginBottom:24, flexWrap:"wrap" }}>
        <KPICard label="Booking Conversion Rate" value={`${conversionRate}%`} sub="επισκέπτες → κράτηση" trend="+2.1%" bg="#F0FDF4" border="#BBF7D0" text="#15803D" info="Πόσοι επισκέπτες τελικά κάνουν κράτηση"/>
        <KPICard label="Completed Bookings" value={totalCompleted} sub={`από ${totalRequests} αιτήματα`} trend="+8" bg="#EFF6FF" border="#BFDBFE" text="#1D4ED8" info="Συνολικές ολοκληρωμένες συνεδρίες"/>
        <KPICard label="Cancellation Rate" value={`${cancellationRate}%`} sub="ακυρώσεις/αλλαγές" trend="-1.2%" bg="#FFF7ED" border="#FED7AA" text="#C2410C" info="Ποσοστό ραντεβού που ακυρώνεται"/>
        <KPICard label="Package Purchase Rate" value={packageRate} sub="αγοράζουν πακέτο" trend="+3%" bg="#FAF5FF" border="#E9D5FF" text="#7E22CE" info="Χρήστες που επιλέγουν πακέτο vs μεμονωμένη"/>
      </div>

      {/* ── FUNNEL ANALYSIS ── */}
      <SectionTitle title="Funnel Ανάλυσης — Πού Χάνουμε Κόσμο" gaLabel={true}/>
      <div style={{ background:"#fff", borderRadius:14, border:"1px solid #E2E8F0", padding:"20px", marginBottom:24 }}>
        <p style={{ fontSize:12, color:"#94A3B8", margin:"0 0 16px" }}>Mock data — θα συνδεθεί με Google Analytics 4 για πραγματικά δεδομένα</p>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {FUNNEL_DATA.map((f, i) => (
            <div key={f.step} style={{ display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ width:28, height:28, borderRadius:"50%", background:f.color, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, flexShrink:0 }}>{i+1}</div>
              <div style={{ width:220, fontSize:13, color:"#334155", flexShrink:0 }}>{f.step}</div>
              <div style={{ flex:1, background:"#F1F5F9", borderRadius:999, height:24, overflow:"hidden", position:"relative" }}>
                <div style={{ width:`${f.pct}%`, height:"100%", background:f.color, borderRadius:999, opacity:0.85 }}/>
                <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:12, fontWeight:700, color:"#fff", mixBlendMode:"normal" }}>{f.value.toLocaleString()}</span>
              </div>
              <div style={{ width:50, fontSize:13, fontWeight:700, color:f.color, textAlign:"right", flexShrink:0 }}>{f.pct}%</div>
              {i > 0 && (
                <div style={{ width:80, fontSize:11, color:"#BE123C", fontWeight:600, flexShrink:0 }}>
                  -{Math.round(100-(f.value/FUNNEL_DATA[i-1].value)*100)}% drop
                </div>
              )}
              {i === 0 && <div style={{ width:80 }}/>}
            </div>
          ))}
        </div>
        <div style={{ marginTop:16, padding:"12px 16px", background:"#FFF7ED", borderRadius:10, border:"1px solid #FED7AA" }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#C2410C", marginBottom:4 }}>Insight</div>
          <div style={{ fontSize:12, color:"#92400E" }}>
            Από τους 620 που βλέπουν τη φόρμα, μόνο οι 310 (50%) την ξεκινούν. Αυτό σημαίνει ότι η φόρμα μπορεί να φαίνεται δύσκολη ή μεγάλη.
          </div>
        </div>
      </div>

      {/* ── SECTION 2: Revenue ── */}
      <SectionTitle title="Έσοδα & Προμήθειες"/>
      <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
        <KPICard label="Revenue This Month" value={`${lastMonth.revenue}€`} sub="συνολικά έσοδα" trend={`+${lastMonth.revenue-prevMonth.revenue}€`} bg="#F0FDF4" border="#BBF7D0" text="#15803D"/>
        <KPICard label="Platform Commission" value={`${lastMonth.commission}€`} sub="καθαρή προμήθεια" trend={commissionTrend} bg="#FFFBEB" border="#FDE68A" text="#B45309"/>
        <KPICard label="Avg Order Value" value={`${avgOrderValue}€`} sub="ανά κράτηση" trend="+2€" bg="#EFF6FF" border="#BFDBFE" text="#1D4ED8"/>
        <KPICard label="Έσοδα YTD" value={`${totalRevenue}€`} sub="συνολικά φέτος" bg="#F8FAFC" border="#E2E8F0" text="#475569"/>
      </div>

      <div style={{ display:"flex", gap:16, marginBottom:24 }}>
        <div style={{ flex:1, background:"#fff", borderRadius:14, border:"1px solid #E2E8F0", padding:"20px" }}>
          <BarChart data={MONTHLY_DATA} valueKey="completed" color="#1D4ED8" label="Ολοκληρωμένες Κρατήσεις ανά Μήνα"/>
        </div>
        <div style={{ flex:1, background:"#fff", borderRadius:14, border:"1px solid #E2E8F0", padding:"20px" }}>
          <BarChart data={MONTHLY_DATA} valueKey="commission" color="#F59E0B" label="Προμήθεια ανά Μήνα (€)"/>
        </div>
      </div>

      {/* ── BLOG ANALYTICS ── */}
      <SectionTitle title="Blog Analytics — Χρόνος στα Άρθρα" gaLabel={true}/>
      <div style={{ background:"#fff", borderRadius:14, border:"1px solid #E2E8F0", overflow:"hidden", marginBottom:24 }}>
        <div style={{ padding:"10px 20px", background:"#F8FAFC", borderBottom:"1px solid #F1F5F9" }}>
          <p style={{ fontSize:12, color:"#94A3B8", margin:0 }}>Mock data — θα συνδεθεί με Google Analytics για πραγματικό "Avg Time on Page"</p>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 100px 100px 120px", padding:"10px 20px", background:"#F8FAFC", fontSize:11, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.04em" }}>
          <span>Άρθρο</span><span>Κατηγορία</span><span>Views</span><span>Avg Time</span><span>Bounce Rate</span>
        </div>
        {BLOG_ANALYTICS.map((a,i) => (
          <div key={a.title} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 100px 100px 120px", padding:"13px 20px", borderTop:"1px solid #F1F5F9", alignItems:"center", background:i%2===0?"#fff":"#FAFAFA" }}>
            <div style={{ fontWeight:600, fontSize:13, color:"#0F172A" }}>{a.title}</div>
            <span style={{ fontSize:12, color:"#64748B" }}>{a.category}</span>
            <span style={{ fontSize:13, fontWeight:700, color:"#0F172A" }}>{a.views}</span>
            <span style={{ fontSize:13, fontWeight:700, color:"#15803D" }}>{a.avgTime}</span>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <MiniBar value={a.bounceRate} max={100} color={a.bounceRate<40?"#15803D":a.bounceRate<50?"#F59E0B":"#BE123C"}/>
              <span style={{ fontSize:12, color:"#64748B", flexShrink:0 }}>{a.bounceRate}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── SECTION 3: Supply ── */}
      <SectionTitle title="Θεραπευτές & Supply"/>
      <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
        <KPICard label="Νέες Αιτήσεις" value={totalNewTherapists} sub="φέτος" bg="#FAF5FF" border="#E9D5FF" text="#7E22CE"/>
        <KPICard label="Εγκρίθηκαν" value={totalApproved} sub={`${Math.round((totalApproved/totalNewTherapists)*100)}% approval rate`} bg="#F0FDF4" border="#BBF7D0" text="#15803D"/>
        <KPICard label="Avg Utilization" value={`${avgUtilization}%`} sub="slots που γεμίζουν" trend="+5%" bg="#EFF6FF" border="#BFDBFE" text="#1D4ED8"/>
      </div>

      <div style={{ background:"#fff", borderRadius:14, border:"1px solid #E2E8F0", overflow:"hidden", marginBottom:24 }}>
        <div style={{ padding:"14px 20px", borderBottom:"1px solid #F1F5F9", fontSize:13, fontWeight:700, color:"#0F172A" }}>Top Θεραπευτές</div>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 80px 1fr 100px", padding:"8px 20px", background:"#F8FAFC", fontSize:11, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.04em" }}>
          <span>Θεραπευτής</span><span>Περιστατικά</span><span>Rating</span><span>Utilization</span><span></span>
        </div>
        {TOP_THERAPISTS.map((t,i) => (
          <div key={t.name} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 80px 1fr 100px", padding:"12px 20px", borderTop:"1px solid #F1F5F9", alignItems:"center", background:i%2===0?"#fff":"#FAFAFA" }}>
            <div>
              <div style={{ fontWeight:600, fontSize:14, color:"#0F172A" }}>{t.name}</div>
              <div style={{ fontSize:11, color:"#94A3B8" }}>{t.specialty}</div>
            </div>
            <span style={{ fontSize:16, fontWeight:700, color:"#0F172A" }}>{t.cases}</span>
            <Stars rating={t.rating}/>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <MiniBar value={t.utilization} max={100} color="#1D4ED8"/>
              <span style={{ fontSize:12, color:"#64748B", flexShrink:0 }}>{t.utilization}%</span>
            </div>
            <span style={{ fontSize:12, color:t.utilization>=80?"#15803D":t.utilization>=60?"#B45309":"#BE123C", fontWeight:600 }}>
              {t.utilization>=80?"Υψηλό":t.utilization>=60?"Μεσαίο":"Χαμηλό"}
            </span>
          </div>
        ))}
      </div>

      {/* ── SECTION 4: Quality ── */}
      <SectionTitle title="Ποιότητα & Trust"/>
      <div style={{ display:"flex", gap:12, marginBottom:24, flexWrap:"wrap" }}>
        <KPICard label="Avg Rating" value={avgRating} sub="μέσο rating θεραπευτών" trend="+0.1" bg="#FFFBEB" border="#FDE68A" text="#B45309"/>
        <KPICard label="Review Rate" value={reviewRate} sub="αφήνουν review" trend="+4%" bg="#F0FDF4" border="#BBF7D0" text="#15803D"/>
      </div>
    </div>
  );
}
