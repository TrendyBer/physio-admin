"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const STATUS_MAP = {
  pending:   { label:"Εκκρεμές",      bg:"#FEF3C7", color:"#92400E" },
  published: { label:"Δημοσιευμένο",  bg:"#D1FAE5", color:"#065F46" },
  hidden:    { label:"Κρυμμένο",      bg:"#FFE4E6", color:"#9F1239" },
};

function Stars({ rating, size=14 }) {
  return (
    <div style={{ display:"flex", gap:2 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ fontSize:size, color:i<=rating?"#F59E0B":"#E2E8F0" }}>★</span>
      ))}
    </div>
  );
}

function Badge({ label, bg, color }) {
  return <span style={{ background:bg, color, padding:"2px 10px", borderRadius:999, fontSize:11, fontWeight:700, letterSpacing:"0.04em", textTransform:"uppercase", whiteSpace:"nowrap" }}>{label}</span>;
}

function Avatar({ name, size=40 }) {
  return <div style={{ width:size, height:size, borderRadius:"50%", background:"#FAF5FF", color:"#7E22CE", display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.33, fontWeight:700, flexShrink:0 }}>{(name||"?").split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}</div>;
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => { fetchReviews(); }, []);

  async function fetchReviews() {
    setLoading(true);
    const { data } = await supabase
      .from("therapist_reviews")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setReviews(data);
    setLoading(false);
  }

  async function updateStatus(id, status) {
    await supabase.from("therapist_reviews").update({ status }).eq("id", id);
    setReviews(prev => prev.map(r => r.id===id ? {...r, status} : r));
  }

  async function deleteReview(id) {
    await supabase.from("therapist_reviews").delete().eq("id", id);
    setReviews(prev => prev.filter(r => r.id !== id));
  }

  const counts = {
    all:       reviews.length,
    pending:   reviews.filter(r=>r.status==="pending").length,
    published: reviews.filter(r=>r.status==="published").length,
    hidden:    reviews.filter(r=>r.status==="hidden").length,
  };

  const filtered = reviews.filter(r => {
    const matchFilter = filter==="all" || r.status===filter;
    const matchSearch = ((r.patient_name||"")+(r.therapist_name||"")+(r.comment||"")).toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const publishedReviews = reviews.filter(r=>r.status==="published");
  const avgRating = publishedReviews.length > 0
    ? (publishedReviews.reduce((s,r)=>s+(r.rating||0),0) / publishedReviews.length).toFixed(1)
    : "—";

  if (loading) return (
    <div style={{ padding:24, display:"flex", alignItems:"center", justifyContent:"center", minHeight:400 }}>
      <div style={{ fontSize:16, color:"#64748B" }}>Φόρτωση...</div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:26, fontWeight:700, color:"#0F172A", margin:0 }}>Reviews</h1>
        <p style={{ fontSize:13, color:"#94A3B8", marginTop:4 }}>Moderation αξιολογήσεων</p>
      </div>

      {/* Summary */}
      <div style={{ display:"flex", gap:14, marginBottom:24, flexWrap:"wrap" }}>
        {[
          { label:"Μέση Βαθμολογία", value:avgRating,        sub:"από δημοσιευμένα",    bg:"#FFFBEB", border:"#FDE68A", text:"#B45309" },
          { label:"Εκκρεμή",         value:counts.pending,   sub:"περιμένουν έγκριση",  bg:"#FEF3C7", border:"#FDE68A", text:"#92400E" },
          { label:"Δημοσιευμένα",    value:counts.published, sub:"φαίνονται στο site",  bg:"#F0FDF4", border:"#BBF7D0", text:"#15803D" },
          { label:"Κρυμμένα",        value:counts.hidden,    sub:"αποκρύφθηκαν",        bg:"#FFF1F2", border:"#FECDD3", text:"#BE123C" },
        ].map(c => (
          <div key={c.label} style={{ flex:1, minWidth:130, background:c.bg, border:`1px solid ${c.border}`, borderRadius:14, padding:"16px 20px" }}>
            <div style={{ fontSize:11, fontWeight:700, color:c.text, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:4 }}>{c.label}</div>
            <div style={{ fontSize:30, fontWeight:700, color:c.text, lineHeight:1 }}>{c.value}</div>
            <div style={{ fontSize:11, color:c.text, opacity:0.7, marginTop:4 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:12, marginBottom:16, alignItems:"center", flexWrap:"wrap" }}>
        <div style={{ display:"flex", gap:4, background:"#E2E8F0", padding:4, borderRadius:10 }}>
          {[["all","Όλα"],["pending","Εκκρεμή"],["published","Δημοσιευμένα"],["hidden","Κρυμμένα"]].map(([val,label])=>(
            <button key={val} onClick={()=>setFilter(val)} style={{ padding:"6px 14px", borderRadius:7, border:"none", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", background:filter===val?"#fff":"transparent", color:filter===val?"#0F172A":"#64748B", boxShadow:filter===val?"0 1px 4px rgba(0,0,0,0.1)":"none" }}>
              {label} <span style={{ marginLeft:4, fontSize:11, color:filter===val?"#1D4ED8":"#94A3B8" }}>{counts[val]}</span>
            </button>
          ))}
        </div>
        <input type="text" placeholder="Αναζήτηση..." value={search} onChange={e=>setSearch(e.target.value)}
          style={{ flex:1, minWidth:200, padding:"9px 14px", borderRadius:8, border:"1px solid #E2E8F0", fontSize:13, fontFamily:"inherit", background:"#fff", outline:"none", color:"#0F172A" }}/>
      </div>

      {/* Reviews list */}
      {filtered.length === 0 ? (
        <div style={{ padding:40, textAlign:"center", color:"#94A3B8", fontSize:14, background:"#fff", borderRadius:14, border:"1px solid #E2E8F0" }}>
          {reviews.length === 0 ? "Δεν υπάρχουν reviews ακόμα." : "Δεν βρέθηκαν reviews"}
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {filtered.map(r => {
            const st = STATUS_MAP[r.status] || STATUS_MAP.pending;
            return (
              <div key={r.id} style={{ background:"#fff", borderRadius:14, border:`1px solid ${r.status==="pending"?"#FDE68A":"#E2E8F0"}`, padding:"18px 20px" }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:14 }}>
                  <Avatar name={r.patient_name || r.name}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:4 }}>
                      <span style={{ fontWeight:700, fontSize:14, color:"#0F172A" }}>{r.patient_name || r.name || "Ασθενής"}</span>
                      {r.therapist_name && <>
                        <span style={{ fontSize:12, color:"#94A3B8" }}>→</span>
                        <span style={{ fontSize:13, color:"#475569", fontWeight:600 }}>{r.therapist_name}</span>
                      </>}
                      {r.rating && <Stars rating={r.rating}/>}
                      <Badge label={st.label} bg={st.bg} color={st.color}/>
                      <span style={{ fontSize:11, color:"#94A3B8", marginLeft:"auto" }}>
                        {r.created_at ? new Date(r.created_at).toLocaleDateString("el-GR") : ""}
                      </span>
                    </div>
                    {(r.comment || r.text) && (
                      <p style={{ fontSize:14, color:"#334155", lineHeight:1.6, margin:"8px 0", background:"#F8FAFC", padding:"10px 14px", borderRadius:8, borderLeft:"3px solid #CBD5E1" }}>
                        "{r.comment || r.text}"
                      </p>
                    )}
                    {r.therapist_reply && (
                      <div style={{ fontSize:13, color:"#475569", background:"#F0FDF4", padding:"8px 14px", borderRadius:8, borderLeft:"3px solid #22C55E", marginTop:6 }}>
                        <span style={{ fontSize:11, fontWeight:700, color:"#15803D", textTransform:"uppercase", letterSpacing:"0.04em" }}>Απάντηση: </span>
                        {r.therapist_reply}
                      </div>
                    )}
                  </div>

                  <div style={{ display:"flex", flexDirection:"column", gap:8, flexShrink:0 }}>
                    {r.status==="pending" && (
                      <>
                        <button onClick={()=>updateStatus(r.id,"published")} style={{ padding:"7px 14px", borderRadius:8, border:"none", background:"#15803D", color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                          Δημοσίευση ✓
                        </button>
                        <button onClick={()=>updateStatus(r.id,"hidden")} style={{ padding:"7px 14px", borderRadius:8, border:"1px solid #FECDD3", background:"transparent", color:"#BE123C", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                          Απόκρυψη
                        </button>
                      </>
                    )}
                    {r.status==="published" && (
                      <button onClick={()=>updateStatus(r.id,"hidden")} style={{ padding:"7px 14px", borderRadius:8, border:"1px solid #FECDD3", background:"transparent", color:"#BE123C", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                        Απόκρυψη
                      </button>
                    )}
                    {r.status==="hidden" && (
                      <button onClick={()=>updateStatus(r.id,"published")} style={{ padding:"7px 14px", borderRadius:8, border:"none", background:"#15803D", color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                        Επαναδημοσίευση
                      </button>
                    )}
                    <button onClick={()=>deleteReview(r.id)} style={{ padding:"7px 14px", borderRadius:8, border:"1px solid #FECACA", background:"#FEF2F2", color:"#DC2626", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                      🗑 Διαγραφή
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}