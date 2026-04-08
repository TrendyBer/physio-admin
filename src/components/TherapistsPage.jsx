"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const STATUS_MAP = {
  active:    { label:"Ενεργός",    bg:"#D1FAE5", color:"#065F46" },
  pending:   { label:"Σε αναμονή", bg:"#FEF3C7", color:"#92400E" },
  suspended: { label:"Ανεστ/νος", bg:"#FFE4E6", color:"#9F1239" },
};
const SPEC_COLORS = {
  "Ορθοπαιδική":   { bg:"#EFF6FF", color:"#1D4ED8" },
  "Νευρολογική":   { bg:"#FAF5FF", color:"#7E22CE" },
  "Αθλητική":      { bg:"#F0FDF4", color:"#15803D" },
  "Παιδιατρική":   { bg:"#FFF7ED", color:"#C2410C" },
  "Αναπνευστική":  { bg:"#F0FDFA", color:"#0F766E" },
};

function Badge({ label, bg, color }) {
  return <span style={{ background:bg, color, padding:"2px 10px", borderRadius:999, fontSize:11, fontWeight:700, letterSpacing:"0.04em", textTransform:"uppercase", whiteSpace:"nowrap" }}>{label}</span>;
}
function Btn({ children, onClick, variant="primary", small }) {
  const s = {
    primary: { background:"#1D4ED8", color:"#fff", border:"none" },
    success: { background:"#15803D", color:"#fff", border:"none" },
    danger:  { background:"transparent", color:"#BE123C", border:"1px solid #FECDD3" },
    ghost:   { background:"transparent", color:"#64748B", border:"1px solid #E2E8F0" },
    warning: { background:"#F59E0B", color:"#fff", border:"none" },
  }[variant];
  return (
    <button onClick={onClick} style={{...s, padding:small?"4px 10px":"7px 16px", borderRadius:8, fontSize:small?11:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit"}}
      onMouseEnter={e=>e.currentTarget.style.opacity="0.8"}
      onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
      {children}
    </button>
  );
}
function Avatar({ name, photo, size=44 }) {
  if (photo) return <img src={photo} alt={name} style={{ width:size, height:size, borderRadius:"50%", objectFit:"cover", flexShrink:0 }} />;
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:"#EFF6FF", color:"#1D4ED8", display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.33, fontWeight:700, flexShrink:0 }}>
      {name?.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
    </div>
  );
}

function ProfileModal({ therapist, onClose, onUpdateStatus }) {
  const st = STATUS_MAP[therapist.status] || STATUS_MAP.pending;
  const spec = SPEC_COLORS[therapist.specialty] || { bg:"#F3F4F6", color:"#374151" };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:24 }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:"#fff", borderRadius:18, width:"100%", maxWidth:680, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>

        {/* Header */}
        <div style={{ padding:"24px 28px 20px", borderBottom:"1px solid #F1F5F9", display:"flex", alignItems:"flex-start", gap:16 }}>
          <Avatar name={therapist.name} photo={therapist.photo_url} size={56}/>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
              <h2 style={{ fontSize:20, fontWeight:700, color:"#0F172A", margin:0 }}>{therapist.name}</h2>
              <Badge label={st.label} bg={st.bg} color={st.color}/>
              {therapist.specialty && <Badge label={therapist.specialty} bg={spec.bg} color={spec.color}/>}
            </div>
            <div style={{ fontSize:13, color:"#64748B", marginTop:4 }}>{therapist.email} · {therapist.phone} · {therapist.area}</div>
            <div style={{ fontSize:12, color:"#94A3B8", marginTop:2 }}>{therapist.experience} χρόνια εμπειρία</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#94A3B8", padding:4 }}>✕</button>
        </div>

        <div style={{ padding:"20px 28px", display:"flex", flexDirection:"column", gap:20 }}>
          {/* Bio */}
          {therapist.bio && (
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Βιογραφικό</div>
              <p style={{ fontSize:14, color:"#475569", lineHeight:1.6, margin:0, background:"#F8FAFC", padding:"12px 14px", borderRadius:8, borderLeft:"3px solid #CBD5E1" }}>{therapist.bio}</p>
            </div>
          )}

          {/* Specialties */}
          {therapist.specialties && (
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Ειδικότητες</div>
              <p style={{ fontSize:14, color:"#475569", margin:0 }}>{therapist.specialties}</p>
            </div>
          )}

          {/* Actions */}
          <div style={{ display:"flex", gap:10, paddingTop:4, borderTop:"1px solid #F1F5F9", flexWrap:"wrap" }}>
            {therapist.status==="pending"   && <><Btn variant="success" onClick={()=>{onUpdateStatus(therapist.id,"active");onClose();}}>Έγκριση ✓</Btn><Btn variant="danger" onClick={()=>{onUpdateStatus(therapist.id,"suspended");onClose();}}>Απόρριψη</Btn></>}
            {therapist.status==="active"    && <Btn variant="warning" onClick={()=>{onUpdateStatus(therapist.id,"suspended");onClose();}}>Αναστολή</Btn>}
            {therapist.status==="suspended" && <Btn variant="success" onClick={()=>{onUpdateStatus(therapist.id,"active");onClose();}}>Επαναενεργοποίηση</Btn>}
            <Btn variant="ghost" onClick={onClose}>Κλείσιμο</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TherapistsPage() {
  const [therapists, setTherapists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(null); // therapist id being uploaded

  useEffect(() => {
    fetchTherapists();
  }, []);

  async function fetchTherapists() {
    setLoading(true);
    const { data, error } = await supabase
      .from("therapists")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setTherapists(data);
    setLoading(false);
  }

  async function updateStatus(id, newStatus) {
    const { error } = await supabase
      .from("therapists")
      .update({ status: newStatus })
      .eq("id", id);
    if (!error) await fetchTherapists();
  }

  async function uploadPhoto(therapistId, file) {
    setUploading(therapistId);
    const ext = file.name.split(".").pop();
    const path = `therapists/${therapistId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("photos")
      .upload(path, file, { upsert: true });

    if (!uploadError) {
      const { data } = supabase.storage.from("photos").getPublicUrl(path);
      await supabase.from("therapists").update({ photo_url: data.publicUrl }).eq("id", therapistId);
      await fetchTherapists();
    } else {
      alert("Σφάλμα ανεβάσματος: " + uploadError.message);
    }
    setUploading(null);
  }

  const counts = {
    all:       therapists.length,
    active:    therapists.filter(t=>t.status==="active").length,
    pending:   therapists.filter(t=>t.status==="pending").length,
    suspended: therapists.filter(t=>t.status==="suspended").length,
  };

  const filtered = therapists.filter(t =>
    (filter==="all" || t.status===filter) &&
    ((t.name||"")+(t.specialty||"")+(t.area||"")).toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div style={{ padding:24, display:"flex", alignItems:"center", justifyContent:"center", minHeight:400 }}>
      <div style={{ fontSize:16, color:"#64748B" }}>Φόρτωση θεραπευτών...</div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:26, fontWeight:700, color:"#0F172A", margin:0 }}>Φυσιοθεραπευτές</h1>
        <p style={{ fontSize:13, color:"#94A3B8", marginTop:4 }}>Διαχείριση όλων των εγγεγραμμένων θεραπευτών</p>
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:12, marginBottom:20, alignItems:"center", flexWrap:"wrap" }}>
        <div style={{ display:"flex", gap:4, background:"#E2E8F0", padding:4, borderRadius:10 }}>
          {[["all","Όλοι"],["active","Ενεργοί"],["pending","Σε αναμονή"],["suspended","Ανεστ/νοι"]].map(([val,label])=>(
            <button key={val} onClick={()=>setFilter(val)} style={{ padding:"6px 14px", borderRadius:7, border:"none", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", background:filter===val?"#fff":"transparent", color:filter===val?"#0F172A":"#64748B", boxShadow:filter===val?"0 1px 4px rgba(0,0,0,0.1)":"none" }}>
              {label} <span style={{ marginLeft:4, background:filter===val?"#EFF6FF":"transparent", color:filter===val?"#1D4ED8":"#94A3B8", padding:"0 6px", borderRadius:999, fontSize:11 }}>{counts[val]}</span>
            </button>
          ))}
        </div>
        <input type="text" placeholder="Αναζήτηση..." value={search} onChange={e=>setSearch(e.target.value)}
          style={{ flex:1, minWidth:200, padding:"9px 14px", borderRadius:8, border:"1px solid #E2E8F0", fontSize:13, fontFamily:"inherit", background:"#fff", outline:"none", color:"#0F172A" }}/>
      </div>

      {/* Table */}
      <div style={{ background:"#fff", borderRadius:14, border:"1px solid #E2E8F0", overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 120px 200px", padding:"10px 20px", background:"#F8FAFC", borderBottom:"1px solid #E2E8F0", fontSize:11, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.05em" }}>
          <span>Θεραπευτής</span><span>Ειδικότητα</span><span>Περιοχή</span><span>Εμπειρία</span><span>Status</span><span>Ενέργειες</span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding:40, textAlign:"center", color:"#94A3B8", fontSize:14 }}>
            {therapists.length === 0 ? "Δεν υπάρχουν θεραπευτές ακόμα." : "Δεν βρέθηκαν θεραπευτές"}
          </div>
        ) : filtered.map((t, i) => {
          const st = STATUS_MAP[t.status] || STATUS_MAP.pending;
          const spec = SPEC_COLORS[t.specialty] || { bg:"#F3F4F6", color:"#374151" };
          return (
            <div key={t.id} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 120px 200px", padding:"14px 20px", borderTop:i>0?"1px solid #F1F5F9":"none", alignItems:"center" }}
              onMouseEnter={e=>e.currentTarget.style.background="#FAFAFA"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>

              {/* Name + Avatar */}
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ position:"relative" }}>
                  <Avatar name={t.name} photo={t.photo_url} size={38}/>
                  {/* Upload photo button */}
                  <label style={{ position:"absolute", bottom:-2, right:-2, background:"#2563EB", borderRadius:"50%", width:16, height:16, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:9, color:"#fff" }}>
                    {uploading===t.id ? "..." : "📷"}
                    <input type="file" accept="image/*" style={{ display:"none" }} onChange={e=>{ if(e.target.files[0]) uploadPhoto(t.id, e.target.files[0]); }}/>
                  </label>
                </div>
                <div>
                  <div style={{ fontWeight:600, fontSize:14, color:"#0F172A" }}>{t.name}</div>
                  <div style={{ fontSize:11, color:"#94A3B8" }}>{t.email}</div>
                </div>
              </div>

              <span>{t.specialty ? <Badge label={t.specialty} bg={spec.bg} color={spec.color}/> : <span style={{ color:"#94A3B8", fontSize:12 }}>—</span>}</span>
              <span style={{ fontSize:13, color:"#475569" }}>{t.area || "—"}</span>
              <span style={{ fontSize:13, color:"#475569" }}>{t.experience ? `${t.experience} χρόνια` : "—"}</span>
              <Badge label={st.label} bg={st.bg} color={st.color}/>

              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                <Btn variant="ghost" small onClick={()=>setSelected(t)}>Προφίλ</Btn>
                {t.status==="pending"   && <Btn variant="success" small onClick={()=>updateStatus(t.id,"active")}>Έγκριση</Btn>}
                {t.status==="active"    && <Btn variant="danger"  small onClick={()=>updateStatus(t.id,"suspended")}>Αναστολή</Btn>}
                {t.status==="suspended" && <Btn variant="warning" small onClick={()=>updateStatus(t.id,"active")}>Επαναφορά</Btn>}
              </div>
            </div>
          );
        })}
      </div>

      {selected && <ProfileModal therapist={selected} onClose={()=>setSelected(null)} onUpdateStatus={updateStatus}/>}
    </div>
  );
}