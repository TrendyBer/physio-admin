"use client";
import { useState } from "react";

const MOCK_REVIEWS = [
  { id:1,  patient:"Γιώργος Μπέης",      therapist:"Νίκος Γεωργίου",     rating:5, text:"Εξαιρετικός επαγγελματίας! Με βοήθησε να ανακάμψω γρήγορα από τον τραυματισμό μου. Τον συστήνω ανεπιφύλακτα.", date:"2025-03-20", status:"pending",   therapistReply:null },
  { id:2,  patient:"Ελένη Σταύρου",      therapist:"Νίκος Γεωργίου",     rating:4, text:"Πολύ καλός θεραπευτής, ξέρει τη δουλειά του. Μόνο η αναμονή για ραντεβού ήταν λίγο μεγάλη.", date:"2025-03-18", status:"published", therapistReply:"Ευχαριστώ πολύ Ελένη! Προσπαθούμε να βελτιώσουμε τους χρόνους αναμονής." },
  { id:3,  patient:"Κώστας Παπαδάκης",   therapist:"Νίκος Γεωργίου",     rating:5, text:"Απίστευτα αποτελέσματα σε πολύ σύντομο χρόνο. Το αυχενικό μου έχει βελτιωθεί κατά 80%.", date:"2025-03-15", status:"published", therapistReply:null },
  { id:4,  patient:"Μάριος Αντωνίου",    therapist:"Ελένη Κωστοπούλου",  rating:5, text:"Η καλύτερη φυσιοθεραπεύτρια που έχω επισκεφτεί! Εξειδικευμένη στους αθλητικούς τραυματισμούς.", date:"2025-03-22", status:"pending",   therapistReply:null },
  { id:5,  patient:"Σοφία Δημητρίου",    therapist:"Ελένη Κωστοπούλου",  rating:3, text:"Καλή θεραπεύτρια αλλά δεν είδα τα αποτελέσματα που περίμενα. Ίσως χρειαστώ περισσότερες συνεδρίες.", date:"2025-03-21", status:"pending",   therapistReply:null },
  { id:6,  patient:"Νίκος Θεοδώρου",     therapist:"Σοφία Νικολάου",     rating:4, text:"Πολύ καλή γνώση της αναπνευστικής φυσιοθεραπείας. Με βοήθησε πολύ με το COPD μου.", date:"2025-02-10", status:"published", therapistReply:"Χαίρομαι που βοήθησα! Συνεχίστε τις ασκήσεις που σας έδωσα." },
  { id:7,  patient:"Άννα Μιχαλοπούλου",  therapist:"Νίκος Γεωργίου",     rating:2, text:"Δεν ήμουν ικανοποιημένη από την εμπειρία. Ο θεραπευτής φαινόταν βιαστικός και δεν εξήγησε τις ασκήσεις σωστά.", date:"2025-03-10", status:"pending",   therapistReply:null },
  { id:8,  patient:"Κώστας Λεβέντης",    therapist:"Νίκος Γεωργίου",     rating:5, text:"Φανταστικός! Επιτέλους βρήκα κάποιον που καταλαβαίνει το πρόβλημά μου.", date:"2025-03-28", status:"pending",   therapistReply:null },
  { id:9,  patient:"Μαρία Θεοδώρου",     therapist:"Ελένη Κωστοπούλου",  rating:1, text:"Απογοητευτική εμπειρία. Αισθάνθηκα ότι δεν με άκουσε καθόλου.", date:"2025-03-25", status:"hidden",    therapistReply:null },
];

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
  return <div style={{ width:size, height:size, borderRadius:"50%", background:"#FAF5FF", color:"#7E22CE", display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.33, fontWeight:700, flexShrink:0 }}>{name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}</div>;
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState(MOCK_REVIEWS);
  const [filter, setFilter]   = useState("all");
  const [search, setSearch]   = useState("");

  const updateStatus = (id, status) => {
    setReviews(prev => prev.map(r => r.id===id ? {...r, status} : r));
  };

  const counts = {
    all:       reviews.length,
    pending:   reviews.filter(r=>r.status==="pending").length,
    published: reviews.filter(r=>r.status==="published").length,
    hidden:    reviews.filter(r=>r.status==="hidden").length,
  };

  const filtered = reviews.filter(r => {
    const matchFilter = filter==="all" || r.status===filter;
    const matchSearch = (r.patient+r.therapist+r.text).toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  // Stats ανά θεραπευτή
  const therapistStats = {};
  reviews.filter(r=>r.status==="published").forEach(r => {
    if (!therapistStats[r.therapist]) therapistStats[r.therapist] = { total:0, sum:0 };
    therapistStats[r.therapist].total++;
    therapistStats[r.therapist].sum += r.rating;
  });

  const avgRating = reviews.filter(r=>r.status==="published").length > 0
    ? (reviews.filter(r=>r.status==="published").reduce((s,r)=>s+r.rating,0) / reviews.filter(r=>r.status==="published").length).toFixed(1)
    : "—";

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:26, fontWeight:700, color:"#0F172A", fontFamily:"'DM Serif Display',serif", margin:0 }}>Reviews</h1>
        <p style={{ fontSize:13, color:"#94A3B8", marginTop:4 }}>Moderation αξιολογήσεων — εσύ εγκρίνεις πριν φανούν στο site</p>
      </div>

      {/* Summary cards */}
      <div style={{ display:"flex", gap:14, marginBottom:24, flexWrap:"wrap" }}>
        {[
          { label:"Μέση Βαθμολογία", value:avgRating, sub:"από δημοσιευμένα",       bg:"#FFFBEB", border:"#FDE68A", text:"#B45309" },
          { label:"Εκκρεμή",         value:counts.pending,   sub:"περιμένουν έγκριση",   bg:"#FEF3C7", border:"#FDE68A", text:"#92400E" },
          { label:"Δημοσιευμένα",    value:counts.published, sub:"φαίνονται στο site",   bg:"#F0FDF4", border:"#BBF7D0", text:"#15803D" },
          { label:"Κρυμμένα",        value:counts.hidden,    sub:"αποκρύφθηκαν",         bg:"#FFF1F2", border:"#FECDD3", text:"#BE123C" },
        ].map(c => (
          <div key={c.label} style={{ flex:1, minWidth:130, background:c.bg, border:`1px solid ${c.border}`, borderRadius:14, padding:"16px 20px" }}>
            <div style={{ fontSize:11, fontWeight:700, color:c.text, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:4 }}>{c.label}</div>
            <div style={{ fontSize:30, fontWeight:700, color:c.text, fontFamily:"'DM Serif Display',serif", lineHeight:1 }}>{c.value}</div>
            <div style={{ fontSize:11, color:c.text, opacity:0.7, marginTop:4 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Therapist averages */}
      {Object.keys(therapistStats).length > 0 && (
        <div style={{ background:"#fff", borderRadius:14, border:"1px solid #E2E8F0", padding:"16px 20px", marginBottom:20 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#0F172A", marginBottom:12 }}>Μέση Βαθμολογία ανά Θεραπευτή</div>
          <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
            {Object.entries(therapistStats).map(([name, s]) => (
              <div key={name} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 14px", background:"#F8FAFC", borderRadius:10, border:"1px solid #E2E8F0" }}>
                <Avatar name={name} size={32}/>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:"#0F172A" }}>{name}</div>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:2 }}>
                    <Stars rating={Math.round(s.sum/s.total)} size={12}/>
                    <span style={{ fontSize:12, color:"#64748B" }}>{(s.sum/s.total).toFixed(1)} ({s.total} reviews)</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters + search */}
      <div style={{ display:"flex", gap:12, marginBottom:16, alignItems:"center", flexWrap:"wrap" }}>
        <div style={{ display:"flex", gap:4, background:"#E2E8F0", padding:4, borderRadius:10 }}>
          {[["all","Όλα"],["pending","Εκκρεμή"],["published","Δημοσιευμένα"],["hidden","Κρυμμένα"]].map(([val,label])=>(
            <button key={val} onClick={()=>setFilter(val)} style={{ padding:"6px 14px", borderRadius:7, border:"none", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", background:filter===val?"#fff":"transparent", color:filter===val?"#0F172A":"#64748B", boxShadow:filter===val?"0 1px 4px rgba(0,0,0,0.1)":"none" }}>
              {label} <span style={{ marginLeft:4, fontSize:11, color:filter===val?"#1D4ED8":"#94A3B8" }}>{counts[val]}</span>
            </button>
          ))}
        </div>
        <input type="text" placeholder="Αναζήτηση ασθενή, θεραπευτή, κειμένου..." value={search} onChange={e=>setSearch(e.target.value)}
          style={{ flex:1, minWidth:200, padding:"9px 14px", borderRadius:8, border:"1px solid #E2E8F0", fontSize:13, fontFamily:"inherit", background:"#fff", outline:"none", color:"#0F172A" }}/>
      </div>

      {/* Reviews list */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {filtered.length===0
          ? <div style={{ padding:40, textAlign:"center", color:"#94A3B8", fontSize:14, background:"#fff", borderRadius:14, border:"1px solid #E2E8F0" }}>Δεν βρέθηκαν reviews</div>
          : filtered.map(r => {
            const st = STATUS_MAP[r.status];
            return (
              <div key={r.id} style={{ background:"#fff", borderRadius:14, border:`1px solid ${r.status==="pending"?"#FDE68A":"#E2E8F0"}`, padding:"18px 20px" }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:14 }}>
                  <Avatar name={r.patient}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    {/* Header */}
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:4 }}>
                      <span style={{ fontWeight:700, fontSize:14, color:"#0F172A" }}>{r.patient}</span>
                      <span style={{ fontSize:12, color:"#94A3B8" }}>→</span>
                      <span style={{ fontSize:13, color:"#475569", fontWeight:600 }}>{r.therapist}</span>
                      <Stars rating={r.rating}/>
                      <Badge label={st.label} bg={st.bg} color={st.color}/>
                      <span style={{ fontSize:11, color:"#94A3B8", marginLeft:"auto" }}>{r.date}</span>
                    </div>

                    {/* Review text */}
                    <p style={{ fontSize:14, color:"#334155", lineHeight:1.6, margin:"8px 0", background:"#F8FAFC", padding:"10px 14px", borderRadius:8, borderLeft:"3px solid #CBD5E1" }}>
                      "{r.text}"
                    </p>

                    {/* Therapist reply */}
                    {r.therapistReply && (
                      <div style={{ fontSize:13, color:"#475569", background:"#F0FDF4", padding:"8px 14px", borderRadius:8, borderLeft:"3px solid #22C55E", marginTop:6 }}>
                        <span style={{ fontSize:11, fontWeight:700, color:"#15803D", textTransform:"uppercase", letterSpacing:"0.04em" }}>Απάντηση θεραπευτή: </span>
                        {r.therapistReply}
                      </div>
                    )}
                    {!r.therapistReply && r.status==="published" && (
                      <div style={{ fontSize:11, color:"#94A3B8", marginTop:6, fontStyle:"italic" }}>Ο θεραπευτής δεν έχει απαντήσει ακόμα</div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display:"flex", flexDirection:"column", gap:8, flexShrink:0 }}>
                    {r.status==="pending" && (
                      <>
                        <button onClick={()=>updateStatus(r.id,"published")} style={{ padding:"7px 14px", borderRadius:8, border:"none", background:"#15803D", color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}
                          onMouseEnter={e=>e.currentTarget.style.opacity="0.8"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                          Δημοσίευση ✓
                        </button>
                        <button onClick={()=>updateStatus(r.id,"hidden")} style={{ padding:"7px 14px", borderRadius:8, border:"1px solid #FECDD3", background:"transparent", color:"#BE123C", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}
                          onMouseEnter={e=>e.currentTarget.style.opacity="0.8"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                          Απόκρυψη
                        </button>
                      </>
                    )}
                    {r.status==="published" && (
                      <button onClick={()=>updateStatus(r.id,"hidden")} style={{ padding:"7px 14px", borderRadius:8, border:"1px solid #FECDD3", background:"transparent", color:"#BE123C", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}
                        onMouseEnter={e=>e.currentTarget.style.opacity="0.8"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                        Απόκρυψη
                      </button>
                    )}
                    {r.status==="hidden" && (
                      <button onClick={()=>updateStatus(r.id,"published")} style={{ padding:"7px 14px", borderRadius:8, border:"none", background:"#15803D", color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}
                        onMouseEnter={e=>e.currentTarget.style.opacity="0.8"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                        Επαναδημοσίευση
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        }
      </div>
    </div>
  );
}
