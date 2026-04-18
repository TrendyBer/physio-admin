"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

function Section({ title, children }) {
  return (
    <div style={{ background:"#fff", borderRadius:14, border:"1px solid #E2E8F0", overflow:"hidden", marginBottom:20 }}>
      <div style={{ padding:"14px 20px", borderBottom:"1px solid #F1F5F9", fontSize:14, fontWeight:700, color:"#0F172A" }}>{title}</div>
      <div style={{ padding:"20px" }}>{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ fontSize:12, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:6 }}>{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, type="text", placeholder }) {
  return (
    <input type={type} value={value||""} onChange={onChange} placeholder={placeholder}
      style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:"1px solid #E2E8F0", fontSize:14, fontFamily:"inherit", outline:"none", color:"#0F172A", boxSizing:"border-box" }}
      onFocus={e=>e.target.style.borderColor="#1D4ED8"}
      onBlur={e=>e.target.style.borderColor="#E2E8F0"}/>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <label style={{ display:"flex", alignItems:"center", gap:12, cursor:"pointer", marginBottom:12 }}>
      <div style={{ position:"relative", width:44, height:24, flexShrink:0 }} onClick={onChange}>
        <div style={{ position:"absolute", inset:0, borderRadius:12, background:checked?"#1D4ED8":"#CBD5E1", transition:"background 0.2s" }}/>
        <div style={{ position:"absolute", top:2, left:checked?22:2, width:20, height:20, borderRadius:"50%", background:"#fff", transition:"left 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.2)" }}/>
      </div>
      <span style={{ fontSize:14, color:"#334155" }}>{label}</span>
    </label>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    platform_name: "PhysioHome",
    email: "info@physiohome.gr",
    phone: "210-123-4567",
    address: "Αθήνα, Ελλάδα",
    commission: "20",
  });
  const [notifications, setNotifications] = useState({
    newRequest: true, newTherapist: true, newReview: true,
    paymentReceived: false, weeklyReport: true,
  });
  const [activeTab, setActiveTab] = useState("general");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState({ current:"", new:"", confirm:"" });

  useEffect(() => { fetchSettings(); }, []);

  async function fetchSettings() {
    setLoading(true);
    const { data } = await supabase.from("platform_settings").select("*");
    if (data) {
      const s = {};
      data.forEach(row => { s[row.key] = row.value; });
      setSettings(prev => ({ ...prev, ...s }));
    }
    setLoading(false);
  }

  async function saveSettings() {
    setSaving(true);
    const upserts = Object.entries(settings).map(([key, value]) => ({
      key, value: String(value), updated_at: new Date().toISOString()
    }));
    const { error } = await supabase
      .from("platform_settings")
      .upsert(upserts, { onConflict: "key" });

    if (error) {
      alert("Σφάλμα: " + error.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  }

  const upd = (key, val) => setSettings(prev => ({ ...prev, [key]: val }));

  const TABS = [
    { id:"general",       label:"Γενικές" },
    { id:"commission",    label:"Προμήθεια" },
    { id:"notifications", label:"Ειδοποιήσεις" },
    { id:"account",       label:"Λογαριασμός" },
  ];

  if (loading) return (
    <div style={{ padding:24, display:"flex", alignItems:"center", justifyContent:"center", minHeight:400 }}>
      <div style={{ fontSize:16, color:"#64748B" }}>Φόρτωση ρυθμίσεων...</div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:26, fontWeight:700, color:"#0F172A", margin:0 }}>Ρυθμίσεις</h1>
        <p style={{ fontSize:13, color:"#94A3B8", marginTop:4 }}>Διαχείριση πλατφόρμας</p>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:4, background:"#E2E8F0", padding:4, borderRadius:10, width:"fit-content", marginBottom:24 }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{ padding:"8px 18px", borderRadius:7, border:"none", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", background:activeTab===t.id?"#fff":"transparent", color:activeTab===t.id?"#0F172A":"#64748B", boxShadow:activeTab===t.id?"0 1px 4px rgba(0,0,0,0.1)":"none" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* GENERAL */}
      {activeTab==="general" && (
        <Section title="Γενικές Ρυθμίσεις">
          <div style={{ background:"#EFF6FF", border:"1px solid #BFDBFE", borderRadius:10, padding:"12px 16px", marginBottom:20 }}>
            <div style={{ fontSize:13, fontWeight:600, color:"#1D4ED8", marginBottom:4 }}>ℹ️ Αυτόματη ενημέρωση</div>
            <div style={{ fontSize:12, color:"#1E40AF" }}>
              Οι αλλαγές εδώ ενημερώνουν αυτόματα το Footer, τα στοιχεία επικοινωνίας και όλες τις σελίδες του site.
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            <Field label="Όνομα Πλατφόρμας">
              <Input value={settings.platform_name} onChange={e=>upd("platform_name", e.target.value)}/>
            </Field>
            <Field label="Email Επικοινωνίας">
              <Input value={settings.email} onChange={e=>upd("email", e.target.value)} type="email"/>
            </Field>
            <Field label="Τηλέφωνο">
              <Input value={settings.phone} onChange={e=>upd("phone", e.target.value)}/>
            </Field>
            <Field label="Διεύθυνση">
              <Input value={settings.address} onChange={e=>upd("address", e.target.value)}/>
            </Field>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <button onClick={saveSettings} disabled={saving} style={{ padding:"9px 22px", borderRadius:8, border:"none", background:saving?"#94A3B8":saved?"#15803D":"#1D4ED8", color:"#fff", fontSize:13, fontWeight:600, cursor:saving?"not-allowed":"pointer", fontFamily:"inherit" }}>
              {saving ? "Αποθήκευση..." : saved ? "✓ Αποθηκεύτηκε!" : "💾 Αποθήκευση"}
            </button>
            {saved && <span style={{ fontSize:13, color:"#15803D", fontWeight:600 }}>Οι αλλαγές θα φανούν στο site σε λίγα λεπτά.</span>}
          </div>
        </Section>
      )}

      {/* COMMISSION */}
      {activeTab==="commission" && (
        <Section title="Ρυθμίσεις Προμήθειας">
          <div style={{ maxWidth:400 }}>
            <Field label="Προμήθεια ανά Περιστατικό (€)">
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <input type="number" value={settings.commission} min={1} max={100}
                  onChange={e=>upd("commission", e.target.value)}
                  style={{ width:120, padding:"10px 14px", borderRadius:8, border:"1px solid #E2E8F0", fontSize:18, fontWeight:700, fontFamily:"inherit", outline:"none", color:"#0F172A", textAlign:"center" }}/>
                <span style={{ fontSize:14, color:"#64748B" }}>€ ανά ανατεθέν περιστατικό</span>
              </div>
            </Field>
            <div style={{ background:"#FFFBEB", border:"1px solid #FDE68A", borderRadius:10, padding:"12px 16px", marginBottom:20 }}>
              <div style={{ fontSize:13, fontWeight:600, color:"#B45309", marginBottom:4 }}>Εκτιμώμενα Μηνιαία Έσοδα</div>
              <div style={{ fontSize:22, fontWeight:700, color:"#B45309" }}>
                {parseInt(settings.commission || 0) * 38}€
              </div>
              <div style={{ fontSize:12, color:"#92400E", marginTop:2 }}>βάσει 38 περιστατικών/μήνα</div>
            </div>
            <button onClick={saveSettings} disabled={saving} style={{ padding:"9px 22px", borderRadius:8, border:"none", background:saved?"#15803D":"#1D4ED8", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
              {saving ? "Αποθήκευση..." : saved ? "✓ Αποθηκεύτηκε!" : "💾 Αποθήκευση"}
            </button>
          </div>
        </Section>
      )}

      {/* NOTIFICATIONS */}
      {activeTab==="notifications" && (
        <Section title="Email Ειδοποιήσεις">
          <div style={{ maxWidth:400 }}>
            <p style={{ fontSize:13, color:"#64748B", marginBottom:20 }}>
              Emails στο <strong>{settings.email}</strong>
            </p>
            <Toggle checked={notifications.newRequest}      onChange={()=>setNotifications(p=>({...p,newRequest:!p.newRequest}))}           label="Νέο αίτημα ασθενή"/>
            <Toggle checked={notifications.newTherapist}    onChange={()=>setNotifications(p=>({...p,newTherapist:!p.newTherapist}))}         label="Νέα εγγραφή θεραπευτή"/>
            <Toggle checked={notifications.newReview}       onChange={()=>setNotifications(p=>({...p,newReview:!p.newReview}))}               label="Νέο review"/>
            <Toggle checked={notifications.paymentReceived} onChange={()=>setNotifications(p=>({...p,paymentReceived:!p.paymentReceived}))}   label="Εισπραγμένη πληρωμή"/>
            <Toggle checked={notifications.weeklyReport}    onChange={()=>setNotifications(p=>({...p,weeklyReport:!p.weeklyReport}))}         label="Εβδομαδιαία αναφορά"/>
            <div style={{ marginTop:8 }}>
              <button onClick={()=>{ setSaved(true); setTimeout(()=>setSaved(false),2000); }} style={{ padding:"9px 22px", borderRadius:8, border:"none", background:saved?"#15803D":"#1D4ED8", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                {saved ? "✓ Αποθηκεύτηκε!" : "💾 Αποθήκευση"}
              </button>
            </div>
          </div>
        </Section>
      )}

      {/* ACCOUNT */}
      {activeTab==="account" && (
        <Section title="Λογαριασμός Admin">
          <div style={{ maxWidth:400 }}>
            <Field label="Τρέχον Password">
              <Input type="password" value={password.current} onChange={e=>setPassword(p=>({...p,current:e.target.value}))} placeholder="••••••••"/>
            </Field>
            <Field label="Νέο Password">
              <Input type="password" value={password.new} onChange={e=>setPassword(p=>({...p,new:e.target.value}))} placeholder="••••••••"/>
            </Field>
            <Field label="Επιβεβαίωση Νέου Password">
              <Input type="password" value={password.confirm} onChange={e=>setPassword(p=>({...p,confirm:e.target.value}))} placeholder="••••••••"/>
            </Field>
            {password.new && password.confirm && password.new!==password.confirm && (
              <div style={{ fontSize:12, color:"#BE123C", marginBottom:12 }}>⚠ Τα passwords δεν ταιριάζουν</div>
            )}
            <button onClick={()=>{ if(password.new===password.confirm && password.new) { setSaved(true); setPassword({current:"",new:"",confirm:""}); setTimeout(()=>setSaved(false),2000); }}}
              style={{ padding:"9px 22px", borderRadius:8, border:"none", background:saved?"#15803D":"#1D4ED8", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
              {saved ? "✓ Αποθηκεύτηκε!" : "💾 Αποθήκευση"}
            </button>
          </div>
        </Section>
      )}
    </div>
  );
}