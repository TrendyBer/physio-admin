"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

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
      <div style={{ fontSize:36, fontWeight:700, color:c.text, lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:12, color:c.sub, marginTop:6 }}>{sub}</div>}
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
  return <button onClick={onClick} style={{...s, padding:"6px 14px", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit"}}
    onMouseEnter={e=>e.currentTarget.style.opacity="0.8"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>{children}</button>;
}

function Avatar({ name }) {
  return <div style={{ width:40, height:40, borderRadius:"50%", background:"#EFF6FF", color:"#1D4ED8", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, flexShrink:0 }}>{(name||"?").split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}</div>;
}

export default function AdminDashboard({ onNavigate }) {
  const [stats, setStats] = useState({ totalTherapists:0, pendingTherapists:0, totalRequests:0, pendingRequests:0, activeRequests:0 });
  const [pendingTherapists, setPendingTherapists] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("therapists");

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [
      { data: therapists },
      { data: requests },
    ] = await Promise.all([
      supabase.from("therapists").select("*").order("created_at", { ascending: false }),
      supabase.from("requests").select("*").order("created_at", { ascending: false }),
    ]);

    const th = therapists || [];
    const rq = requests || [];

    setStats({
      totalTherapists:   th.filter(t => t.status === "active").length,
      pendingTherapists: th.filter(t => t.status === "pending").length,
      totalRequests:     rq.length,
      pendingRequests:   rq.filter(r => r.status === "pending").length,
      activeRequests:    rq.filter(r => r.status === "active").length,
    });

    setPendingTherapists(th.filter(t => t.status === "pending").slice(0, 10));
    setPendingRequests(rq.filter(r => r.status === "pending").slice(0, 10));
    setLoading(false);
  }

  async function approveTherapist(id) {
    await supabase.from("therapists").update({ status: "active" }).eq("id", id);
    await fetchAll();
  }

  async function rejectTherapist(id) {
    await supabase.from("therapists").update({ status: "rejected" }).eq("id", id);
    await fetchAll();
  }

  const today = new Date().toLocaleDateString("el-GR", { weekday:"long", day:"numeric", month:"long", year:"numeric" });

  if (loading) return (
    <div style={{ padding:24, display:"flex", alignItems:"center", justifyContent:"center", minHeight:400 }}>
      <div style={{ fontSize:16, color:"#64748B" }}>Φόρτωση δεδομένων...</div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:26, fontWeight:700, color:"#0F172A", margin:0 }}>Dashboard</h1>
        <p style={{ fontSize:13, color:"#94A3B8", marginTop:4, textTransform:"capitalize" }}>{today}</p>
      </div>

      {/* KPI Cards */}
      <div style={{ display:"flex", gap:14, marginBottom:28, flexWrap:"wrap" }}>
        <StatCard label="Ενεργοί Θεραπευτές"  value={stats.totalTherapists}   sub={`+ ${stats.pendingTherapists} σε αναμονή`} color="blue" />
        <StatCard label="Εκκρεμείς Εγκρίσεις" value={stats.pendingTherapists} sub="Περιμένουν review"                         color="amber" />
        <StatCard label="Συνολικά Αιτήματα"   value={stats.totalRequests}     sub={`${stats.activeRequests} ενεργά`}          color="green" />
        <StatCard label="Εκκρεμή Αιτήματα"    value={stats.pendingRequests}   sub="Χωρίς ανάθεση"                             color="red" />
      </div>

      {/* Two-column */}
      <div style={{ display:"flex", gap:20, alignItems:"flex-start" }}>
        <div style={{ flex:2, minWidth:0 }}>
          {/* Tabs */}
          <div style={{ display:"flex", gap:4, background:"#E2E8F0", padding:4, borderRadius:10, width:"fit-content", marginBottom:16 }}>
            {[
              { id:"therapists", label:`Θεραπευτές (${pendingTherapists.length})` },
              { id:"requests",   label:`Αιτήματα (${pendingRequests.length})` },
            ].map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{ padding:"7px 18px", borderRadius:7, border:"none", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", background:tab===t.id?"#fff":"transparent", color:tab===t.id?"#0F172A":"#64748B", boxShadow:tab===t.id?"0 1px 4px rgba(0,0,0,0.1)":"none" }}>{t.label}</button>
            ))}
          </div>

          <div style={{ background:"#fff", borderRadius:14, border:"1px solid #E2E8F0", overflow:"hidden" }}>
            {tab==="therapists" && (pendingTherapists.length===0
              ? <div style={{ padding:40, textAlign:"center", color:"#94A3B8", fontSize:14 }}>✓ Δεν υπάρχουν εκκρεμείς εγκρίσεις</div>
              : pendingTherapists.map((t,i)=>(
                <div key={t.id} style={{ padding:"16px 20px", borderBottom:i<pendingTherapists.length-1?"1px solid #F1F5F9":"none", display:"flex", alignItems:"center", gap:14 }}>
                  <Avatar name={t.name}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:14, color:"#0F172A" }}>{t.name}</div>
                    <div style={{ fontSize:12, color:"#64748B", marginTop:2 }}>{t.specialty} · {t.area} · {t.experience ? `${t.experience} χρόνια` : ""}</div>
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <Btn variant="ghost" onClick={()=>onNavigate("therapists")}>Προφίλ</Btn>
                    <Btn variant="danger" onClick={()=>rejectTherapist(t.id)}>Απόρριψη</Btn>
                    <Btn variant="success" onClick={()=>approveTherapist(t.id)}>Έγκριση ✓</Btn>
                  </div>
                </div>
              ))
            )}

            {tab==="requests" && (pendingRequests.length===0
              ? <div style={{ padding:40, textAlign:"center", color:"#94A3B8", fontSize:14 }}>✓ Δεν υπάρχουν εκκρεμή αιτήματα</div>
              : pendingRequests.map((r,i)=>(
                <div key={r.id} style={{ padding:"16px 20px", borderBottom:i<pendingRequests.length-1?"1px solid #F1F5F9":"none" }}>
                  <div style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
                    <Avatar name={r.name}/>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600, fontSize:14, color:"#0F172A" }}>{r.name}</div>
                      <div style={{ fontSize:12, color:"#64748B", marginTop:3 }}>{r.phone} · {r.email} · {r.city}</div>
                      {r.service && (
                        <div style={{ fontSize:12, color:"#475569", background:"#F8FAFC", padding:"6px 10px", borderRadius:6, borderLeft:"3px solid #CBD5E1", marginTop:8 }}>
                          {r.service}{r.description ? ` — ${r.description}` : ""}
                        </div>
                      )}
                    </div>
                    <Btn variant="primary" onClick={()=>onNavigate("requests")}>Ανάθεση →</Btn>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right column — Summary */}
        <div style={{ flex:1, minWidth:220 }}>
          <div style={{ background:"#fff", borderRadius:14, border:"1px solid #E2E8F0", padding:"16px 18px" }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#0F172A", marginBottom:10 }}>Συνοπτικά</div>
            {[
              ["Συνολικά αιτήματα",    stats.totalRequests],
              ["Εκκρεμή αιτήματα",     stats.pendingRequests],
              ["Ενεργά αιτήματα",      stats.activeRequests],
              ["Εγκεκριμένοι θεραπευτές", stats.totalTherapists],
              ["Σε αναμονή έγκρισης",  stats.pendingTherapists],
            ].map(([label,val])=>(
              <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"1px solid #F8FAFC", fontSize:12 }}>
                <span style={{ color:"#64748B" }}>{label}</span>
                <span style={{ fontWeight:700, color:"#0F172A" }}>{val}</span>
              </div>
            ))}
            <button onClick={fetchAll} style={{ marginTop:12, width:"100%", padding:"8px", borderRadius:8, border:"1px solid #E2E8F0", background:"#F8FAFC", color:"#64748B", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
              🔄 Ανανέωση
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}