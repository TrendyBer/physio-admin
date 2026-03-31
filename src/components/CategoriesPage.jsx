"use client";
import { useState } from "react";

const INITIAL_CATEGORIES = [
  { id:1,  name:"Ορθοπαιδική",        description:"Μυοσκελετικά προβλήματα, αποκατάσταση μετά από χειρουργεία",   therapists:3, color:"#1D4ED8", bg:"#EFF6FF", active:true  },
  { id:2,  name:"Νευρολογική",        description:"Εγκεφαλικό, Parkinson, πολλαπλή σκλήρυνση",                    therapists:2, color:"#7E22CE", bg:"#FAF5FF", active:true  },
  { id:3,  name:"Αθλητική",           description:"Αθλητικοί τραυματισμοί, πρόληψη, επιστροφή στον αθλητισμό",   therapists:2, color:"#15803D", bg:"#F0FDF4", active:true  },
  { id:4,  name:"Παιδιατρική",        description:"Αναπτυξιακές διαταραχές, εγκεφαλική παράλυση",                 therapists:1, color:"#C2410C", bg:"#FFF7ED", active:true  },
  { id:5,  name:"Αναπνευστική",       description:"COPD, άσθμα, μετα-COVID αποκατάσταση",                         therapists:1, color:"#0F766E", bg:"#F0FDFA", active:true  },
  { id:6,  name:"Καρδιαγγειακή",      description:"Αποκατάσταση μετά από καρδιακά επεισόδια",                     therapists:0, color:"#BE123C", bg:"#FFF1F2", active:false },
  { id:7,  name:"Γηριατρική",         description:"Φυσιοθεραπεία για ηλικιωμένους",                               therapists:0, color:"#475569", bg:"#F8FAFC", active:false },
  { id:8,  name:"Μαιευτική",          description:"Προγεννητική και μεταγεννητική φυσιοθεραπεία",                 therapists:0, color:"#BE185D", bg:"#FDF2F8", active:false },
];

const COLORS = [
  { color:"#1D4ED8", bg:"#EFF6FF", label:"Μπλε" },
  { color:"#7E22CE", bg:"#FAF5FF", label:"Μωβ" },
  { color:"#15803D", bg:"#F0FDF4", label:"Πράσινο" },
  { color:"#C2410C", bg:"#FFF7ED", label:"Πορτοκαλί" },
  { color:"#0F766E", bg:"#F0FDFA", label:"Τιρκουάζ" },
  { color:"#BE123C", bg:"#FFF1F2", label:"Κόκκινο" },
  { color:"#475569", bg:"#F8FAFC", label:"Γκρι" },
  { color:"#BE185D", bg:"#FDF2F8", label:"Ροζ" },
];

function Badge({ label, bg, color }) {
  return <span style={{ background:bg, color, padding:"2px 10px", borderRadius:999, fontSize:11, fontWeight:700, letterSpacing:"0.04em", textTransform:"uppercase" }}>{label}</span>;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [showForm, setShowForm]     = useState(false);
  const [editId, setEditId]         = useState(null);
  const [form, setForm]             = useState({ name:"", description:"", color:"#1D4ED8", bg:"#EFF6FF" });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const toggleActive = (id) => {
    setCategories(prev => prev.map(c => c.id===id ? {...c, active:!c.active} : c));
  };

  const deleteCategory = (id) => {
    setCategories(prev => prev.filter(c => c.id!==id));
    setDeleteConfirm(null);
  };

  const openAdd = () => {
    setEditId(null);
    setForm({ name:"", description:"", color:"#1D4ED8", bg:"#EFF6FF" });
    setShowForm(true);
  };

  const openEdit = (cat) => {
    setEditId(cat.id);
    setForm({ name:cat.name, description:cat.description, color:cat.color, bg:cat.bg });
    setShowForm(true);
  };

  const saveForm = () => {
    if (!form.name.trim()) return;
    if (editId) {
      setCategories(prev => prev.map(c => c.id===editId ? {...c, ...form} : c));
    } else {
      setCategories(prev => [...prev, {
        id: Date.now(), name:form.name, description:form.description,
        color:form.color, bg:form.bg, therapists:0, active:true,
      }]);
    }
    setShowForm(false);
    setEditId(null);
  };

  const active   = categories.filter(c=>c.active);
  const inactive = categories.filter(c=>!c.active);

  return (
    <div>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:700, color:"#0F172A", fontFamily:"'DM Serif Display',serif", margin:0 }}>Κατηγορίες</h1>
          <p style={{ fontSize:13, color:"#94A3B8", marginTop:4 }}>Διαχείριση ειδικοτήτων και υπηρεσιών της πλατφόρμας</p>
        </div>
        <button onClick={openAdd} style={{ padding:"10px 20px", borderRadius:10, border:"none", background:"#1D4ED8", color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}
          onMouseEnter={e=>e.currentTarget.style.opacity="0.8"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
          + Νέα Κατηγορία
        </button>
      </div>

      {/* Summary */}
      <div style={{ display:"flex", gap:14, marginBottom:24, flexWrap:"wrap" }}>
        {[
          { label:"Συνολικές",  value:categories.length,  bg:"#F8FAFC", border:"#E2E8F0", text:"#475569" },
          { label:"Ενεργές",    value:active.length,      bg:"#F0FDF4", border:"#BBF7D0", text:"#15803D" },
          { label:"Ανενεργές",  value:inactive.length,    bg:"#FFF7ED", border:"#FED7AA", text:"#C2410C" },
        ].map(c=>(
          <div key={c.label} style={{ flex:1, minWidth:120, background:c.bg, border:`1px solid ${c.border}`, borderRadius:12, padding:"16px 20px" }}>
            <div style={{ fontSize:11, fontWeight:700, color:c.text, textTransform:"uppercase", letterSpacing:"0.05em" }}>{c.label}</div>
            <div style={{ fontSize:30, fontWeight:700, color:c.text, fontFamily:"'DM Serif Display',serif", marginTop:4 }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Active categories */}
      <div style={{ fontSize:13, fontWeight:700, color:"#0F172A", marginBottom:12 }}>Ενεργές Κατηγορίες</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:12, marginBottom:24 }}>
        {active.map(cat => (
          <div key={cat.id} style={{ background:"#fff", borderRadius:14, border:`1px solid ${cat.color}33`, padding:"18px 20px" }}>
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:cat.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>
                  <div style={{ width:14, height:14, borderRadius:"50%", background:cat.color }}/>
                </div>
                <div>
                  <div style={{ fontWeight:700, fontSize:15, color:"#0F172A" }}>{cat.name}</div>
                  <div style={{ fontSize:11, color:"#94A3B8" }}>{cat.therapists} θεραπευτές</div>
                </div>
              </div>
              <Badge label="Ενεργή" bg="#D1FAE5" color="#065F46"/>
            </div>
            <p style={{ fontSize:12, color:"#64748B", margin:"0 0 14px", lineHeight:1.5 }}>{cat.description}</p>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>openEdit(cat)} style={{ flex:1, padding:"6px 0", borderRadius:8, border:"1px solid #E2E8F0", background:"transparent", color:"#475569", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}
                onMouseEnter={e=>e.currentTarget.style.background="#F8FAFC"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                Επεξεργασία
              </button>
              <button onClick={()=>toggleActive(cat.id)} style={{ flex:1, padding:"6px 0", borderRadius:8, border:"1px solid #FDE68A", background:"transparent", color:"#B45309", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}
                onMouseEnter={e=>e.currentTarget.style.background="#FFFBEB"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                Απενεργοποίηση
              </button>
              {cat.therapists===0 && (
                <button onClick={()=>setDeleteConfirm(cat.id)} style={{ padding:"6px 10px", borderRadius:8, border:"1px solid #FECDD3", background:"transparent", color:"#BE123C", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}
                  onMouseEnter={e=>e.currentTarget.style.background="#FFF1F2"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  ✕
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Inactive categories */}
      {inactive.length > 0 && (
        <>
          <div style={{ fontSize:13, fontWeight:700, color:"#94A3B8", marginBottom:12 }}>Ανενεργές Κατηγορίες</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:12, marginBottom:24 }}>
            {inactive.map(cat => (
              <div key={cat.id} style={{ background:"#F8FAFC", borderRadius:14, border:"1px solid #E2E8F0", padding:"18px 20px", opacity:0.8 }}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:10 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:"#F1F5F9", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <div style={{ width:14, height:14, borderRadius:"50%", background:"#CBD5E1" }}/>
                    </div>
                    <div>
                      <div style={{ fontWeight:700, fontSize:15, color:"#64748B" }}>{cat.name}</div>
                      <div style={{ fontSize:11, color:"#94A3B8" }}>{cat.therapists} θεραπευτές</div>
                    </div>
                  </div>
                  <Badge label="Ανενεργή" bg="#F1F5F9" color="#64748B"/>
                </div>
                <p style={{ fontSize:12, color:"#94A3B8", margin:"0 0 14px", lineHeight:1.5 }}>{cat.description}</p>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={()=>toggleActive(cat.id)} style={{ flex:1, padding:"6px 0", borderRadius:8, border:"none", background:"#15803D", color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}
                    onMouseEnter={e=>e.currentTarget.style.opacity="0.8"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                    Ενεργοποίηση
                  </button>
                  <button onClick={()=>setDeleteConfirm(cat.id)} style={{ padding:"6px 10px", borderRadius:8, border:"1px solid #FECDD3", background:"transparent", color:"#BE123C", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}
                    onMouseEnter={e=>e.currentTarget.style.background="#FFF1F2"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:24 }}
          onClick={e=>{ if(e.target===e.currentTarget) setShowForm(false); }}>
          <div style={{ background:"#fff", borderRadius:18, width:"100%", maxWidth:480, boxShadow:"0 20px 60px rgba(0,0,0,0.2)", padding:"28px" }}>
            <h2 style={{ fontSize:20, fontWeight:700, color:"#0F172A", margin:"0 0 20px" }}>
              {editId ? "Επεξεργασία Κατηγορίας" : "Νέα Κατηγορία"}
            </h2>

            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:12, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:6 }}>Όνομα *</label>
              <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="π.χ. Ορθοπαιδική"
                style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:"1px solid #E2E8F0", fontSize:14, fontFamily:"inherit", outline:"none", color:"#0F172A", boxSizing:"border-box" }}/>
            </div>

            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:12, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:6 }}>Περιγραφή</label>
              <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Σύντομη περιγραφή της κατηγορίας..." rows={3}
                style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:"1px solid #E2E8F0", fontSize:14, fontFamily:"inherit", outline:"none", color:"#0F172A", resize:"vertical", boxSizing:"border-box" }}/>
            </div>

            <div style={{ marginBottom:24 }}>
              <label style={{ fontSize:12, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:8 }}>Χρώμα</label>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {COLORS.map(c => (
                  <div key={c.color} onClick={()=>setForm(p=>({...p,color:c.color,bg:c.bg}))}
                    style={{ width:32, height:32, borderRadius:"50%", background:c.color, cursor:"pointer", border:`3px solid ${form.color===c.color?"#0F172A":"transparent"}`, transition:"border 0.15s" }}
                    title={c.label}/>
                ))}
              </div>
            </div>

            {form.name && (
              <div style={{ marginBottom:20, padding:"10px 14px", borderRadius:10, background:form.bg, border:`1px solid ${form.color}33` }}>
                <span style={{ fontSize:13, fontWeight:700, color:form.color }}>Προεπισκόπηση: {form.name}</span>
              </div>
            )}

            <div style={{ display:"flex", gap:10 }}>
              <button onClick={saveForm} disabled={!form.name.trim()} style={{ flex:1, padding:"10px 0", borderRadius:8, border:"none", background:form.name.trim()?"#1D4ED8":"#E2E8F0", color:form.name.trim()?"#fff":"#94A3B8", fontSize:14, fontWeight:600, cursor:form.name.trim()?"pointer":"not-allowed", fontFamily:"inherit" }}>
                {editId ? "Αποθήκευση" : "Προσθήκη"}
              </button>
              <button onClick={()=>setShowForm(false)} style={{ padding:"10px 20px", borderRadius:8, border:"1px solid #E2E8F0", background:"transparent", color:"#64748B", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                Άκυρο
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:24 }}>
          <div style={{ background:"#fff", borderRadius:18, width:"100%", maxWidth:400, padding:"28px", textAlign:"center" }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🗑️</div>
            <h2 style={{ fontSize:18, fontWeight:700, color:"#0F172A", margin:"0 0 8px" }}>Διαγραφή Κατηγορίας</h2>
            <p style={{ fontSize:14, color:"#64748B", margin:"0 0 24px" }}>Είσαι σίγουρος; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.</p>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>deleteCategory(deleteConfirm)} style={{ flex:1, padding:"10px 0", borderRadius:8, border:"none", background:"#BE123C", color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                Διαγραφή
              </button>
              <button onClick={()=>setDeleteConfirm(null)} style={{ flex:1, padding:"10px 0", borderRadius:8, border:"1px solid #E2E8F0", background:"transparent", color:"#64748B", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                Άκυρο
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
