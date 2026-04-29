"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

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

const EMPTY = { name:"", description:"", color:"#1D4ED8", bg:"#EFF6FF", display_order:0 };

function Badge({ label, bg, color }) {
  return <span style={{ background:bg, color, padding:"2px 10px", borderRadius:999, fontSize:11, fontWeight:700, letterSpacing:"0.04em", textTransform:"uppercase" }}>{label}</span>;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [therapistCounts, setTherapistCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [{ data: cats }, { data: therapists }] = await Promise.all([
      supabase.from("specialties").select("*").order("display_order"),
      supabase.from("therapist_profiles").select("specialty").eq("is_approved", true),
    ]);

    // Count therapists per specialty
    const counts = {};
    (therapists || []).forEach(t => {
      if (t.specialty) counts[t.specialty] = (counts[t.specialty] || 0) + 1;
    });

    setCategories(cats || []);
    setTherapistCounts(counts);
    setLoading(false);
  }

  function openAdd() {
    setEditId(null);
    setForm({ ...EMPTY, display_order: categories.length + 1 });
    setShowForm(true);
  }

  function openEdit(cat) {
    setEditId(cat.id);
    setForm({
      name: cat.name,
      description: cat.description || "",
      color: cat.color,
      bg: cat.bg,
      display_order: cat.display_order || 0,
    });
    setShowForm(true);
  }

  async function saveForm() {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      color: form.color,
      bg: form.bg,
      display_order: parseInt(form.display_order) || 0,
      updated_at: new Date().toISOString(),
    };

    if (editId) {
      const { error } = await supabase.from("specialties").update(payload).eq("id", editId);
      if (error) alert("Σφάλμα: " + error.message);
    } else {
      const { error } = await supabase.from("specialties").insert([{ ...payload, is_active: true }]);
      if (error) alert("Σφάλμα: " + error.message);
    }
    setSaving(false);
    setShowForm(false);
    setEditId(null);
    await fetchAll();
  }

  async function toggleActive(id, currentValue) {
    await supabase.from("specialties").update({ is_active: !currentValue }).eq("id", id);
    await fetchAll();
  }

  async function deleteCategory(id) {
    const { error } = await supabase.from("specialties").delete().eq("id", id);
    if (error) {
      alert("Σφάλμα διαγραφής: " + error.message);
    } else {
      setDeleteConfirm(null);
      await fetchAll();
    }
  }

  const active = categories.filter(c => c.is_active);
  const inactive = categories.filter(c => !c.is_active);

  if (loading) return (
    <div style={{ padding:24, display:"flex", alignItems:"center", justifyContent:"center", minHeight:400 }}>
      <div style={{ fontSize:16, color:"#64748B" }}>Φόρτωση κατηγοριών...</div>
    </div>
  );

  return (
    <div>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:700, color:"#0F172A", margin:0 }}>Κατηγορίες / Ειδικότητες</h1>
          <p style={{ fontSize:13, color:"#94A3B8", marginTop:4 }}>Διαχείριση ειδικοτήτων που εμφανίζονται στο public site</p>
        </div>
        <button onClick={openAdd} style={{ padding:"10px 20px", borderRadius:10, border:"none", background:"#1D4ED8", color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
          + Νέα Κατηγορία
        </button>
      </div>

      {/* Summary */}
      <div style={{ display:"flex", gap:14, marginBottom:24, flexWrap:"wrap" }}>
        {[
          { label:"Συνολικές", value:categories.length, bg:"#F8FAFC", border:"#E2E8F0", text:"#475569" },
          { label:"Ενεργές",   value:active.length,     bg:"#F0FDF4", border:"#BBF7D0", text:"#15803D" },
          { label:"Ανενεργές", value:inactive.length,   bg:"#FFF7ED", border:"#FED7AA", text:"#C2410C" },
        ].map(c=>(
          <div key={c.label} style={{ flex:1, minWidth:120, background:c.bg, border:`1px solid ${c.border}`, borderRadius:12, padding:"16px 20px" }}>
            <div style={{ fontSize:11, fontWeight:700, color:c.text, textTransform:"uppercase", letterSpacing:"0.05em" }}>{c.label}</div>
            <div style={{ fontSize:30, fontWeight:700, color:c.text, marginTop:4 }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Active categories */}
      <div style={{ fontSize:13, fontWeight:700, color:"#0F172A", marginBottom:12 }}>Ενεργές Κατηγορίες</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:12, marginBottom:24 }}>
        {active.length === 0 && (
          <div style={{ padding:30, textAlign:"center", color:"#94A3B8", fontSize:14, background:"#fff", borderRadius:14, border:"1px solid #E2E8F0", gridColumn:"1 / -1" }}>
            Δεν υπάρχουν ενεργές κατηγορίες
          </div>
        )}
        {active.map(cat => {
          const count = therapistCounts[cat.name] || 0;
          return (
            <div key={cat.id} style={{ background:"#fff", borderRadius:14, border:`1px solid ${cat.color}33`, padding:"18px 20px" }}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:cat.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <div style={{ width:14, height:14, borderRadius:"50%", background:cat.color }}/>
                  </div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:15, color:"#0F172A" }}>{cat.name}</div>
                    <div style={{ fontSize:11, color:"#94A3B8" }}>{count} {count === 1 ? "θεραπευτής" : "θεραπευτές"}</div>
                  </div>
                </div>
                <Badge label="Ενεργή" bg="#D1FAE5" color="#065F46"/>
              </div>
              {cat.description && (
                <p style={{ fontSize:12, color:"#64748B", margin:"0 0 14px", lineHeight:1.5 }}>{cat.description}</p>
              )}
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={()=>openEdit(cat)} style={{ flex:1, padding:"6px 0", borderRadius:8, border:"1px solid #E2E8F0", background:"transparent", color:"#475569", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                  Επεξεργασία
                </button>
                <button onClick={()=>toggleActive(cat.id, cat.is_active)} style={{ flex:1, padding:"6px 0", borderRadius:8, border:"1px solid #FDE68A", background:"transparent", color:"#B45309", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                  Απενεργοποίηση
                </button>
                {count === 0 && (
                  <button onClick={()=>setDeleteConfirm(cat.id)} style={{ padding:"6px 10px", borderRadius:8, border:"1px solid #FECDD3", background:"transparent", color:"#BE123C", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                    ✕
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Inactive categories */}
      {inactive.length > 0 && (
        <>
          <div style={{ fontSize:13, fontWeight:700, color:"#94A3B8", marginBottom:12 }}>Ανενεργές Κατηγορίες</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:12, marginBottom:24 }}>
            {inactive.map(cat => (
              <div key={cat.id} style={{ background:"#F8FAFC", borderRadius:14, border:"1px solid #E2E8F0", padding:"18px 20px", opacity:0.85 }}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:10 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:"#F1F5F9", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <div style={{ width:14, height:14, borderRadius:"50%", background:"#CBD5E1" }}/>
                    </div>
                    <div>
                      <div style={{ fontWeight:700, fontSize:15, color:"#64748B" }}>{cat.name}</div>
                      <div style={{ fontSize:11, color:"#94A3B8" }}>{therapistCounts[cat.name] || 0} θεραπευτές</div>
                    </div>
                  </div>
                  <Badge label="Ανενεργή" bg="#F1F5F9" color="#64748B"/>
                </div>
                {cat.description && <p style={{ fontSize:12, color:"#94A3B8", margin:"0 0 14px", lineHeight:1.5 }}>{cat.description}</p>}
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={()=>toggleActive(cat.id, cat.is_active)} style={{ flex:1, padding:"6px 0", borderRadius:8, border:"none", background:"#15803D", color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                    Ενεργοποίηση
                  </button>
                  <button onClick={()=>openEdit(cat)} style={{ padding:"6px 12px", borderRadius:8, border:"1px solid #E2E8F0", background:"transparent", color:"#475569", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                    ✏️
                  </button>
                  <button onClick={()=>setDeleteConfirm(cat.id)} style={{ padding:"6px 10px", borderRadius:8, border:"1px solid #FECDD3", background:"transparent", color:"#BE123C", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:24 }}
          onClick={e=>{ if(e.target===e.currentTarget) setShowForm(false); }}>
          <div style={{ background:"#fff", borderRadius:18, width:"100%", maxWidth:480, boxShadow:"0 20px 60px rgba(0,0,0,0.2)", padding:"28px", maxHeight:"90vh", overflowY:"auto" }}>
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
              <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Σύντομη περιγραφή..." rows={3}
                style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:"1px solid #E2E8F0", fontSize:14, fontFamily:"inherit", outline:"none", color:"#0F172A", resize:"vertical", boxSizing:"border-box" }}/>
            </div>

            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:12, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:6 }}>Σειρά Εμφάνισης</label>
              <input type="number" value={form.display_order} onChange={e=>setForm(p=>({...p,display_order:e.target.value}))} placeholder="0" min={0}
                style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:"1px solid #E2E8F0", fontSize:14, fontFamily:"inherit", outline:"none", color:"#0F172A", boxSizing:"border-box" }}/>
            </div>

            <div style={{ marginBottom:24 }}>
              <label style={{ fontSize:12, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:8 }}>Χρώμα</label>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {COLORS.map(c => (
                  <div key={c.color} onClick={()=>setForm(p=>({...p,color:c.color,bg:c.bg}))}
                    style={{ width:32, height:32, borderRadius:"50%", background:c.color, cursor:"pointer", border:`3px solid ${form.color===c.color?"#0F172A":"transparent"}` }}
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
              <button onClick={saveForm} disabled={!form.name.trim() || saving} style={{ flex:1, padding:"10px 0", borderRadius:8, border:"none", background:form.name.trim() && !saving?"#1D4ED8":"#E2E8F0", color:form.name.trim() && !saving?"#fff":"#94A3B8", fontSize:14, fontWeight:600, cursor:form.name.trim() && !saving?"pointer":"not-allowed", fontFamily:"inherit" }}>
                {saving ? "Αποθήκευση..." : editId ? "💾 Αποθήκευση" : "➕ Προσθήκη"}
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