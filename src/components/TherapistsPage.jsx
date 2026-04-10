"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const STATUS_MAP = {
  active:    { label:"Ενεργός",    bg:"#D1FAE5", color:"#065F46" },
  pending:   { label:"Σε αναμονή", bg:"#FEF3C7", color:"#92400E" },
  suspended: { label:"Ανεστ/νος", bg:"#FFE4E6", color:"#9F1239" },
  rejected:  { label:"Απορρίφθηκε", bg:"#FEE2E2", color:"#B91C1C" },
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
function Btn({ children, onClick, variant="primary", small, disabled }) {
  const s = {
    primary: { background:"#1D4ED8", color:"#fff", border:"none" },
    success: { background:"#15803D", color:"#fff", border:"none" },
    danger:  { background:"#BE123C", color:"#fff", border:"none" },
    ghost:   { background:"transparent", color:"#64748B", border:"1px solid #E2E8F0" },
    warning: { background:"#F59E0B", color:"#fff", border:"none" },
    delete:  { background:"#FEF2F2", color:"#DC2626", border:"1px solid #FECACA" },
  }[variant];
  return (
    <button onClick={onClick} disabled={disabled} style={{...s, padding:small?"4px 10px":"8px 18px", borderRadius:8, fontSize:small?11:13, fontWeight:600, cursor:disabled?"not-allowed":"pointer", fontFamily:"inherit", opacity:disabled?0.5:1}}
      onMouseEnter={e=>{ if(!disabled) e.currentTarget.style.opacity="0.85"; }}
      onMouseLeave={e=>{ if(!disabled) e.currentTarget.style.opacity="1"; }}>
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

function Field({ label, children }) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ fontSize:11, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:5 }}>{label}</label>
      {children}
    </div>
  );
}
function Input({ value, onChange, placeholder }) {
  return <input value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder||""} style={{ width:"100%", padding:"9px 12px", border:"1px solid #E2E8F0", borderRadius:8, fontSize:13, fontFamily:"inherit", boxSizing:"border-box" }}/>;
}
function Textarea({ value, onChange, rows=3 }) {
  return <textarea value={value||""} onChange={e=>onChange(e.target.value)} rows={rows} style={{ width:"100%", padding:"9px 12px", border:"1px solid #E2E8F0", borderRadius:8, fontSize:13, fontFamily:"inherit", resize:"vertical", boxSizing:"border-box" }}/>;
}

// ─── EDIT MODAL ───────────────────────────────────────────────────────────────
function EditModal({ therapist, onClose, onSave, onUploadPhoto, uploading }) {
  const [form, setForm] = useState({
    name:        therapist.name || "",
    email:       therapist.email || "",
    phone:       therapist.phone || "",
    specialty:   therapist.specialty || "",
    area:        therapist.area || "",
    experience:  therapist.experience || "",
    title_el:    therapist.title_el || "",
    title_en:    therapist.title_en || "",
    bio_el:      therapist.bio_el || therapist.bio || "",
    bio_en:      therapist.bio_en || "",
    specialties: therapist.specialties || "",
    tags_el:     therapist.tags_el || "",
    tags_en:     therapist.tags_en || "",
    photo_url:   therapist.photo_url || therapist.image_url || "",
  });
  const upd = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.55)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:24 }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:"#fff", borderRadius:18, width:"100%", maxWidth:680, maxHeight:"92vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>

        {/* Header */}
        <div style={{ padding:"22px 28px 18px", borderBottom:"1px solid #F1F5F9", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <h2 style={{ fontSize:18, fontWeight:700, color:"#0F172A", margin:0 }}>✏️ Επεξεργασία Προφίλ</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#94A3B8" }}>✕</button>
        </div>

        <div style={{ padding:"20px 28px", display:"flex", flexDirection:"column", gap:4 }}>

          {/* Photo */}
          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:11, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:10 }}>Φωτογραφία</label>
            <div style={{ display:"flex", alignItems:"center", gap:16 }}>
              <Avatar name={form.name} photo={form.photo_url} size={72}/>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <label style={{ background:"#2563EB", color:"#fff", padding:"8px 16px", borderRadius:8, fontSize:13, fontWeight:600, cursor:uploading?"not-allowed":"pointer", display:"inline-block" }}>
                  {uploading ? "⏳ Ανέβασμα..." : "⬆ Upload Φωτογραφίας"}
                  <input type="file" accept="image/*" style={{ display:"none" }} disabled={uploading}
                    onChange={e=>{ if(e.target.files[0]) onUploadPhoto(therapist.id, e.target.files[0], url => upd("photo_url", url)); }}/>
                </label>
                <input value={form.photo_url} onChange={e=>upd("photo_url", e.target.value)} placeholder="ή βάλε URL..."
                  style={{ padding:"6px 10px", border:"1px solid #E2E8F0", borderRadius:6, fontSize:12, width:240 }}/>
                {form.photo_url && (
                  <button onClick={()=>upd("photo_url","")} style={{ background:"#FEF2F2", color:"#EF4444", border:"1px solid #FEE2E2", borderRadius:6, padding:"4px 10px", fontSize:12, cursor:"pointer", width:"fit-content" }}>
                    🗑 Αφαίρεση
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Basic info */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            <Field label="Ονοματεπώνυμο"><Input value={form.name} onChange={v=>upd("name",v)}/></Field>
            <Field label="Email"><Input value={form.email} onChange={v=>upd("email",v)}/></Field>
            <Field label="Τηλέφωνο"><Input value={form.phone} onChange={v=>upd("phone",v)}/></Field>
            <Field label="Ειδικότητα"><Input value={form.specialty} onChange={v=>upd("specialty",v)}/></Field>
            <Field label="Περιοχή"><Input value={form.area} onChange={v=>upd("area",v)}/></Field>
            <Field label="Χρόνια Εμπειρίας"><Input value={form.experience} onChange={v=>upd("experience",v)} placeholder="π.χ. 5"/></Field>
          </div>

          {/* Titles */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            <Field label="Τίτλος (Ελληνικά)"><Input value={form.title_el} onChange={v=>upd("title_el",v)}/></Field>
            <Field label="Τίτλος (Αγγλικά)"><Input value={form.title_en} onChange={v=>upd("title_en",v)}/></Field>
          </div>

          {/* Bio */}
          <Field label="Βιογραφικό (Ελληνικά)"><Textarea value={form.bio_el} onChange={v=>upd("bio_el",v)} rows={3}/></Field>
          <Field label="Βιογραφικό (Αγγλικά)"><Textarea value={form.bio_en} onChange={v=>upd("bio_en",v)} rows={3}/></Field>

          {/* Specialties & Tags */}
          <Field label="Ειδικεύσεις"><Textarea value={form.specialties} onChange={v=>upd("specialties",v)} rows={2}/></Field>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            <Field label="Tags (Ελληνικά)"><Input value={form.tags_el} onChange={v=>upd("tags_el",v)} placeholder="π.χ. πόνος, ώμος"/></Field>
            <Field label="Tags (Αγγλικά)"><Input value={form.tags_en} onChange={v=>upd("tags_en",v)} placeholder="e.g. pain, shoulder"/></Field>
          </div>

          {/* Actions */}
          <div style={{ display:"flex", gap:10, paddingTop:8, borderTop:"1px solid #F1F5F9", marginTop:8 }}>
            <Btn variant="primary" onClick={()=>onSave(therapist.id, form)}>💾 Αποθήκευση</Btn>
            <Btn variant="ghost" onClick={onClose}>Άκυρο</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PROFILE VIEW MODAL ───────────────────────────────────────────────────────
function ProfileModal({ therapist, onClose, onUpdateStatus, onDelete, onEdit }) {
  const st = STATUS_MAP[therapist.status] || STATUS_MAP.pending;
  const spec = SPEC_COLORS[therapist.specialty] || { bg:"#F3F4F6", color:"#374151" };
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:24 }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:"#fff", borderRadius:18, width:"100%", maxWidth:680, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>

        <div style={{ padding:"24px 28px 20px", borderBottom:"1px solid #F1F5F9", display:"flex", alignItems:"flex-start", gap:16 }}>
          <Avatar name={therapist.name} photo={therapist.photo_url || therapist.image_url} size={56}/>
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
          {(therapist.bio_el || therapist.bio) && (
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Βιογραφικό</div>
              <p style={{ fontSize:14, color:"#475569", lineHeight:1.6, margin:0, background:"#F8FAFC", padding:"12px 14px", borderRadius:8, borderLeft:"3px solid #CBD5E1" }}>
                {therapist.bio_el || therapist.bio}
              </p>
            </div>
          )}
          {therapist.specialties && (
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Ειδικεύσεις</div>
              <p style={{ fontSize:14, color:"#475569", margin:0 }}>{therapist.specialties}</p>
            </div>
          )}

          {/* Actions */}
          <div style={{ display:"flex", gap:10, paddingTop:4, borderTop:"1px solid #F1F5F9", flexWrap:"wrap", alignItems:"center" }}>
            <Btn variant="primary" onClick={()=>{ onClose(); onEdit(therapist); }}>✏️ Επεξεργασία</Btn>
            {therapist.status==="pending"   && <>
              <Btn variant="success" onClick={()=>{onUpdateStatus(therapist.id,"active");onClose();}}>✓ Έγκριση</Btn>
              <Btn variant="danger" onClick={()=>{onUpdateStatus(therapist.id,"rejected");onClose();}}>✕ Απόρριψη</Btn>
            </>}
            {therapist.status==="active"    && <Btn variant="warning" onClick={()=>{onUpdateStatus(therapist.id,"suspended");onClose();}}>⏸ Αναστολή</Btn>}
            {therapist.status==="suspended" && <Btn variant="success" onClick={()=>{onUpdateStatus(therapist.id,"active");onClose();}}>▶ Επαναφορά</Btn>}
            {therapist.status==="rejected"  && <Btn variant="success" onClick={()=>{onUpdateStatus(therapist.id,"active");onClose();}}>▶ Έγκριση</Btn>}

            {/* Delete */}
            <div style={{ marginLeft:"auto" }}>
              {!confirmDelete ? (
                <Btn variant="delete" onClick={()=>setConfirmDelete(true)}>🗑 Διαγραφή</Btn>
              ) : (
                <div style={{ display:"flex", alignItems:"center", gap:8, background:"#FEF2F2", padding:"8px 12px", borderRadius:8, border:"1px solid #FECACA" }}>
                  <span style={{ fontSize:12, color:"#DC2626", fontWeight:600 }}>Σίγουρα;</span>
                  <Btn variant="danger" small onClick={()=>{ onDelete(therapist.id); onClose(); }}>Ναι, Διαγραφή</Btn>
                  <Btn variant="ghost" small onClick={()=>setConfirmDelete(false)}>Όχι</Btn>
                </div>
              )}
            </div>

            <Btn variant="ghost" onClick={onClose}>Κλείσιμο</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function TherapistsPage() {
  const [therapists, setTherapists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);      // profile modal
  const [editing, setEditing] = useState(null);        // edit modal
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => { fetchTherapists(); }, []);

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
    const { error } = await supabase.from("therapists").update({ status: newStatus }).eq("id", id);
    if (!error) await fetchTherapists();
  }

  async function deleteTherapist(id) {
    const { error } = await supabase.from("therapists").delete().eq("id", id);
    if (!error) await fetchTherapists();
    else alert("Σφάλμα διαγραφής: " + error.message);
  }

  async function saveProfile(id, form) {
    const { error } = await supabase.from("therapists").update({
      name:        form.name,
      email:       form.email,
      phone:       form.phone,
      specialty:   form.specialty,
      area:        form.area,
      experience:  form.experience,
      title_el:    form.title_el,
      title_en:    form.title_en,
      bio_el:      form.bio_el,
      bio_en:      form.bio_en,
      bio:         form.bio_el, // keep bio in sync
      specialties: form.specialties,
      tags_el:     form.tags_el,
      tags_en:     form.tags_en,
      photo_url:   form.photo_url,
      image_url:   form.photo_url, // keep image_url in sync
    }).eq("id", id);

    if (!error) {
      await fetchTherapists();
      setEditing(null);
    } else {
      alert("Σφάλμα αποθήκευσης: " + error.message);
    }
  }

  async function uploadPhoto(therapistId, file, callback) {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `therapists/${therapistId}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("photos").upload(path, file, { upsert: true });
    if (!uploadError) {
      const { data } = supabase.storage.from("photos").getPublicUrl(path);
      callback(data.publicUrl);
    } else {
      alert("Σφάλμα ανεβάσματος: " + uploadError.message);
    }
    setUploading(false);
  }

  const counts = {
    all:       therapists.length,
    active:    therapists.filter(t=>t.status==="active").length,
    pending:   therapists.filter(t=>t.status==="pending").length,
    suspended: therapists.filter(t=>t.status==="suspended").length,
    rejected:  therapists.filter(t=>t.status==="rejected").length,
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
          {[["all","Όλοι"],["active","Ενεργοί"],["pending","Σε αναμονή"],["suspended","Ανεστ/νοι"],["rejected","Απορριφθέντες"]].map(([val,label])=>(
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
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 120px 220px", padding:"10px 20px", background:"#F8FAFC", borderBottom:"1px solid #E2E8F0", fontSize:11, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.05em" }}>
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
            <div key={t.id} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 120px 220px", padding:"14px 20px", borderTop:i>0?"1px solid #F1F5F9":"none", alignItems:"center" }}
              onMouseEnter={e=>e.currentTarget.style.background="#FAFAFA"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>

              {/* Name + Avatar */}
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ position:"relative" }}>
                  <Avatar name={t.name} photo={t.photo_url || t.image_url} size={38}/>
                  <label style={{ position:"absolute", bottom:-2, right:-2, background:"#2563EB", borderRadius:"50%", width:16, height:16, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:9, color:"#fff", title:"Ανέβασε φωτογραφία" }}>
                    📷
                    <input type="file" accept="image/*" style={{ display:"none" }}
                      onChange={e=>{ if(e.target.files[0]) uploadPhoto(t.id, e.target.files[0], url => {
                        supabase.from("therapists").update({ photo_url: url, image_url: url }).eq("id", t.id).then(()=>fetchTherapists());
                      }); }}/>
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

              <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                <Btn variant="ghost" small onClick={()=>setSelected(t)}>Προφίλ</Btn>
                <Btn variant="primary" small onClick={()=>setEditing(t)}>✏️</Btn>
                {t.status==="pending"   && <>
                  <Btn variant="success" small onClick={()=>updateStatus(t.id,"active")}>✓</Btn>
                  <Btn variant="danger"  small onClick={()=>updateStatus(t.id,"rejected")}>✕</Btn>
                </>}
                {t.status==="active"    && <Btn variant="warning" small onClick={()=>updateStatus(t.id,"suspended")}>⏸</Btn>}
                {t.status==="suspended" && <Btn variant="success" small onClick={()=>updateStatus(t.id,"active")}>▶</Btn>}
                {t.status==="rejected"  && <Btn variant="success" small onClick={()=>updateStatus(t.id,"active")}>▶</Btn>}
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <ProfileModal
          therapist={selected}
          onClose={()=>setSelected(null)}
          onUpdateStatus={updateStatus}
          onDelete={deleteTherapist}
          onEdit={(t)=>{ setSelected(null); setEditing(t); }}
        />
      )}

      {editing && (
        <EditModal
          therapist={editing}
          onClose={()=>setEditing(null)}
          onSave={saveProfile}
          onUploadPhoto={uploadPhoto}
          uploading={uploading}
        />
      )}
    </div>
  );
}