"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

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

function Avatar({ name, size=40, color="patient" }) {
  const colors = {
    patient:   { bg:"#F0FDF4", text:"#15803D" },
    therapist: { bg:"#EFF6FF", text:"#1D4ED8" },
  }[color];
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:colors.bg, color:colors.text, display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.33, fontWeight:700, flexShrink:0 }}>
      {(name||"?").split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
    </div>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all / pending / published / unpublished
  const [search, setSearch] = useState("");

  useEffect(() => { fetchReviews(); }, []);

  async function fetchReviews() {
    setLoading(true);
    const [
      { data: rvs },
      { data: patients },
      { data: therapists },
    ] = await Promise.all([
      supabase.from("reviews").select("*").order("created_at", { ascending: false }),
      supabase.from("patient_profiles").select("id, name"),
      supabase.from("therapist_profiles").select("id, name, specialty"),
    ]);

    const patientMap = {};
    (patients || []).forEach(p => { patientMap[p.id] = p.name; });

    const therapistMap = {};
    (therapists || []).forEach(t => { therapistMap[t.id] = t; });

    const enriched = (rvs || []).map(r => ({
      ...r,
      patient_name: patientMap[r.patient_id] || "Άγνωστος ασθενής",
      therapist_name: therapistMap[r.therapist_id]?.name || "Άγνωστος θεραπευτής",
      therapist_specialty: therapistMap[r.therapist_id]?.specialty || "",
    }));

    setReviews(enriched);
    setLoading(false);
  }

  async function publishReview(id) {
    await supabase.from("reviews").update({
      is_published: true,
      status: "published",
    }).eq("id", id);
    await fetchReviews();
  }

  async function unpublishReview(id) {
    await supabase.from("reviews").update({
      is_published: false,
      status: "hidden",
    }).eq("id", id);
    await fetchReviews();
  }

  async function deleteReview(id) {
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) {
      alert("Σφάλμα διαγραφής: " + error.message);
    } else {
      await fetchReviews();
    }
  }

  // Categorize reviews
  function getCategory(r) {
    if (r.is_published) return "published";
    if (r.status === "hidden") return "unpublished";
    return "pending";
  }

  const counts = {
    all:         reviews.length,
    pending:     reviews.filter(r => getCategory(r) === "pending").length,
    published:   reviews.filter(r => getCategory(r) === "published").length,
    unpublished: reviews.filter(r => getCategory(r) === "unpublished").length,
  };

  const filtered = reviews.filter(r => {
    const cat = getCategory(r);
    const matchFilter = filter === "all" || cat === filter;
    const matchSearch = ((r.patient_name||"") + (r.therapist_name||"") + (r.comment||"")).toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  // Stats
  const publishedReviews = reviews.filter(r => r.is_published);
  const avgRating = publishedReviews.length > 0
    ? (publishedReviews.reduce((s,r) => s + (r.rating||0), 0) / publishedReviews.length).toFixed(1)
    : "—";

  if (loading) return (
    <div style={{ padding:24, display:"flex", alignItems:"center", justifyContent:"center", minHeight:400 }}>
      <div style={{ fontSize:16, color:"#64748B" }}>Φόρτωση reviews...</div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:26, fontWeight:700, color:"#0F172A", margin:0 }}>Reviews</h1>
        <p style={{ fontSize:13, color:"#94A3B8", marginTop:4 }}>Moderation και διαχείριση αξιολογήσεων</p>
      </div>

      {/* KPI cards */}
      <div style={{ display:"flex", gap:14, marginBottom:24, flexWrap:"wrap" }}>
        {[
          { label:"Μέση Βαθμολογία", value:avgRating,            sub:"από δημοσιευμένα",   bg:"#FFFBEB", border:"#FDE68A", text:"#B45309" },
          { label:"Εκκρεμή",         value:counts.pending,       sub:"χρειάζονται έγκριση", bg:"#FEF3C7", border:"#FDE68A", text:"#92400E" },
          { label:"Δημοσιευμένα",    value:counts.published,     sub:"ορατά στο site",      bg:"#F0FDF4", border:"#BBF7D0", text:"#15803D" },
          { label:"Απόκρυψη",        value:counts.unpublished,   sub:"αποκρύφθηκαν",        bg:"#FFF1F2", border:"#FECDD3", text:"#BE123C" },
        ].map(c => (
          <div key={c.label} style={{ flex:1, minWidth:130, background:c.bg, border:`1px solid ${c.border}`, borderRadius:14, padding:"16px 20px" }}>
            <div style={{ fontSize:11, fontWeight:700, color:c.text, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:4 }}>{c.label}</div>
            <div style={{ fontSize:30, fontWeight:700, color:c.text, lineHeight:1 }}>{c.value}</div>
            <div style={{ fontSize:11, color:c.text, opacity:0.7, marginTop:4 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Pending alert */}
      {counts.pending > 0 && filter !== "pending" && (
        <div style={{ background:"#FEF3C7", border:"1px solid #FDE68A", borderRadius:10, padding:"12px 16px", marginBottom:16, display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:24 }}>🔔</span>
          <div style={{ flex:1, fontSize:13, color:"#92400E" }}>
            <strong>{counts.pending}</strong> review{counts.pending > 1 ? "s" : ""} περιμένουν έγκριση για δημοσίευση
          </div>
          <button onClick={()=>setFilter("pending")} style={{ background:"#F59E0B", color:"#fff", border:"none", borderRadius:6, padding:"5px 12px", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
            Δες τα →
          </button>
        </div>
      )}

      {/* Filters */}
      <div style={{ display:"flex", gap:12, marginBottom:16, alignItems:"center", flexWrap:"wrap" }}>
        <div style={{ display:"flex", gap:4, background:"#E2E8F0", padding:4, borderRadius:10, flexWrap:"wrap" }}>
          {[
            ["all", "Όλα"],
            ["pending", "🔔 Εκκρεμή"],
            ["published", "Δημοσιευμένα"],
            ["unpublished", "Απόκρυψη"],
          ].map(([val,label])=>(
            <button key={val} onClick={()=>setFilter(val)} style={{ padding:"6px 14px", borderRadius:7, border:"none", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", background:filter===val?"#fff":"transparent", color:filter===val?"#0F172A":"#64748B", boxShadow:filter===val?"0 1px 4px rgba(0,0,0,0.1)":"none" }}>
              {label} <span style={{ marginLeft:4, fontSize:11, color:filter===val?"#1D4ED8":"#94A3B8" }}>{counts[val]}</span>
            </button>
          ))}
        </div>
        <input type="text" placeholder="Αναζήτηση ασθενή, θεραπευτή, σχολίου..." value={search} onChange={e=>setSearch(e.target.value)}
          style={{ flex:1, minWidth:200, padding:"9px 14px", borderRadius:8, border:"1px solid #E2E8F0", fontSize:13, fontFamily:"inherit", background:"#fff", outline:"none", color:"#0F172A" }}/>
      </div>

      {/* Reviews list */}
      {filtered.length === 0 ? (
        <div style={{ padding:40, textAlign:"center", color:"#94A3B8", fontSize:14, background:"#fff", borderRadius:14, border:"1px solid #E2E8F0" }}>
          {reviews.length === 0 ? "Δεν υπάρχουν reviews ακόμα." : "Δεν βρέθηκαν reviews με αυτά τα φίλτρα."}
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {filtered.map(r => {
            const cat = getCategory(r);
            const isPending = cat === "pending";
            const isPublished = cat === "published";
            const isUnpublished = cat === "unpublished";

            return (
              <div key={r.id} style={{ background:"#fff", borderRadius:14, border:`1px solid ${isPending?"#FDE68A":"#E2E8F0"}`, padding:"18px 20px" }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:14 }}>

                  {/* Avatar */}
                  <Avatar name={r.patient_name} color="patient"/>

                  <div style={{ flex:1, minWidth:0 }}>
                    {/* Header line */}
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:6 }}>
                      <span style={{ fontWeight:700, fontSize:14, color:"#0F172A" }}>{r.patient_name}</span>
                      <span style={{ fontSize:13, color:"#94A3B8" }}>→</span>
                      <span style={{ fontSize:13, color:"#1D4ED8", fontWeight:600 }}>{r.therapist_name}</span>
                      {r.therapist_specialty && (
                        <span style={{ fontSize:11, color:"#94A3B8" }}>· {r.therapist_specialty}</span>
                      )}
                      {isPending && <Badge label="Εκκρεμές" bg="#FEF3C7" color="#92400E"/>}
                      {isPublished && <Badge label="Δημοσιευμένο" bg="#D1FAE5" color="#065F46"/>}
                      {isUnpublished && <Badge label="Απόκρυψη" bg="#FFE4E6" color="#9F1239"/>}
                      <span style={{ fontSize:11, color:"#94A3B8", marginLeft:"auto" }}>
                        {r.created_at ? new Date(r.created_at).toLocaleDateString("el-GR", { day:"2-digit", month:"2-digit", year:"numeric" }) : ""}
                      </span>
                    </div>

                    {/* Rating */}
                    {r.rating && (
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                        <Stars rating={r.rating} size={16}/>
                        <span style={{ fontSize:13, fontWeight:700, color:"#0F172A" }}>{r.rating}/5</span>
                      </div>
                    )}

                    {/* Comment */}
                    {r.comment && (
                      <p style={{ fontSize:14, color:"#334155", lineHeight:1.6, margin:"0 0 6px", background:"#F8FAFC", padding:"10px 14px", borderRadius:8, borderLeft:"3px solid #CBD5E1", fontStyle:"italic" }}>
                        "{r.comment}"
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display:"flex", flexDirection:"column", gap:8, flexShrink:0 }}>
                    {isPending && (
                      <>
                        <button onClick={()=>publishReview(r.id)} style={{ padding:"7px 14px", borderRadius:8, border:"none", background:"#15803D", color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                          ✓ Δημοσίευση
                        </button>
                        <button onClick={()=>unpublishReview(r.id)} style={{ padding:"7px 14px", borderRadius:8, border:"1px solid #FECDD3", background:"transparent", color:"#BE123C", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                          Απόκρυψη
                        </button>
                      </>
                    )}
                    {isPublished && (
                      <button onClick={()=>unpublishReview(r.id)} style={{ padding:"7px 14px", borderRadius:8, border:"1px solid #FECDD3", background:"transparent", color:"#BE123C", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                        Απόκρυψη
                      </button>
                    )}
                    {isUnpublished && (
                      <button onClick={()=>publishReview(r.id)} style={{ padding:"7px 14px", borderRadius:8, border:"none", background:"#15803D", color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                        ▶ Δημοσίευση
                      </button>
                    )}
                    <button onClick={()=>{ if(confirm("Σίγουρα διαγραφή review;")) deleteReview(r.id); }} style={{ padding:"7px 14px", borderRadius:8, border:"1px solid #FECACA", background:"#FEF2F2", color:"#DC2626", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
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