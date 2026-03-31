"use client";
import { useState } from "react";

const INITIAL_SETTINGS = {
  platformName: "PhysioMarket",
  email: "info@physiomarket.gr",
  phone: "210-123-4567",
  address: "Αθήνα, Ελλάδα",
  commission: 20,
  notifications: {
    newRequest:      true,
    newTherapist:    true,
    newReview:       true,
    paymentReceived: false,
    weeklyReport:    true,
  },
};

const INITIAL_BLOG = [
  { id:1, title:"5 ασκήσεις για τον πόνο στη μέση", category:"Ορθοπαιδική", status:"published", date:"2025-03-15", views:234 },
  { id:2, title:"Πώς να επιλέξετε φυσιοθεραπευτή", category:"Γενικά",       status:"published", date:"2025-03-10", views:412 },
  { id:3, title:"Αποκατάσταση μετά από εγχείρηση γόνατος", category:"Ορθοπαιδική", status:"published", date:"2025-02-28", views:187 },
  { id:4, title:"Φυσιοθεραπεία και αθλητισμός",    category:"Αθλητική",      status:"draft",     date:"2025-03-20", views:0   },
  { id:5, title:"COVID-19 και αναπνευστική αποκατάσταση", category:"Αναπνευστική", status:"draft", date:"2025-03-25", views:0  },
];

const BLOG_CATEGORIES = ["Ορθοπαιδική","Νευρολογική","Αθλητική","Παιδιατρική","Αναπνευστική","Γενικά"];

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
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:"1px solid #E2E8F0", fontSize:14, fontFamily:"inherit", outline:"none", color:"#0F172A", boxSizing:"border-box" }}
      onFocus={e=>e.target.style.borderColor="#1D4ED8"}
      onBlur={e=>e.target.style.borderColor="#E2E8F0"}/>
  );
}

function SaveBtn({ onClick, saved }) {
  return (
    <button onClick={onClick} style={{ padding:"9px 22px", borderRadius:8, border:"none", background: saved?"#15803D":"#1D4ED8", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", transition:"background 0.3s" }}>
      {saved ? "✓ Αποθηκεύτηκε!" : "Αποθήκευση"}
    </button>
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
  const [settings, setSettings]   = useState(INITIAL_SETTINGS);
  const [blog, setBlog]           = useState(INITIAL_BLOG);
  const [activeTab, setActiveTab] = useState("general");
  const [saved, setSaved]         = useState({});
  const [showBlogForm, setShowBlogForm] = useState(false);
  const [editBlog, setEditBlog]   = useState(null);
  const [blogForm, setBlogForm]   = useState({ title:"", category:"Γενικά", status:"draft", content:"" });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [password, setPassword]   = useState({ current:"", new:"", confirm:"" });

  const save = (key) => {
    setSaved(p=>({...p,[key]:true}));
    setTimeout(()=>setSaved(p=>({...p,[key]:false})), 2000);
  };

  const openAddBlog = () => {
    setEditBlog(null);
    setBlogForm({ title:"", category:"Γενικά", status:"draft", content:"" });
    setShowBlogForm(true);
  };

  const openEditBlog = (post) => {
    setEditBlog(post.id);
    setBlogForm({ title:post.title, category:post.category, status:post.status, content:"" });
    setShowBlogForm(true);
  };

  const saveBlog = () => {
    if (!blogForm.title.trim()) return;
    if (editBlog) {
      setBlog(prev=>prev.map(p=>p.id===editBlog?{...p,...blogForm,date:new Date().toISOString().slice(0,10)}:p));
    } else {
      setBlog(prev=>[...prev,{ id:Date.now(), ...blogForm, date:new Date().toISOString().slice(0,10), views:0 }]);
    }
    setShowBlogForm(false);
  };

  const deleteBlog = (id) => {
    setBlog(prev=>prev.filter(p=>p.id!==id));
    setDeleteConfirm(null);
  };

  const toggleNotif = (key) => {
    setSettings(p=>({...p, notifications:{...p.notifications,[key]:!p.notifications[key]}}));
  };

  const TABS = [
    { id:"general",  label:"Γενικές" },
    { id:"commission",label:"Προμήθεια" },
    { id:"notifications", label:"Ειδοποιήσεις" },
    { id:"account",  label:"Λογαριασμός" },
    { id:"blog",     label:"Blog" },
  ];

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:26, fontWeight:700, color:"#0F172A", fontFamily:"'DM Serif Display',serif", margin:0 }}>Ρυθμίσεις</h1>
        <p style={{ fontSize:13, color:"#94A3B8", marginTop:4 }}>Διαχείριση πλατφόρμας και περιεχομένου</p>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:4, background:"#E2E8F0", padding:4, borderRadius:10, width:"fit-content", marginBottom:24 }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{ padding:"8px 18px", borderRadius:7, border:"none", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", background:activeTab===t.id?"#fff":"transparent", color:activeTab===t.id?"#0F172A":"#64748B", boxShadow:activeTab===t.id?"0 1px 4px rgba(0,0,0,0.1)":"none" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── GENERAL ── */}
      {activeTab==="general" && (
        <Section title="Γενικές Ρυθμίσεις">
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            <Field label="Όνομα Πλατφόρμας">
              <Input value={settings.platformName} onChange={e=>setSettings(p=>({...p,platformName:e.target.value}))}/>
            </Field>
            <Field label="Email Επικοινωνίας">
              <Input value={settings.email} onChange={e=>setSettings(p=>({...p,email:e.target.value}))} type="email"/>
            </Field>
            <Field label="Τηλέφωνο">
              <Input value={settings.phone} onChange={e=>setSettings(p=>({...p,phone:e.target.value}))}/>
            </Field>
            <Field label="Διεύθυνση">
              <Input value={settings.address} onChange={e=>setSettings(p=>({...p,address:e.target.value}))}/>
            </Field>
          </div>
          <SaveBtn onClick={()=>save("general")} saved={saved.general}/>
        </Section>
      )}

      {/* ── COMMISSION ── */}
      {activeTab==="commission" && (
        <Section title="Ρυθμίσεις Προμήθειας">
          <div style={{ maxWidth:400 }}>
            <Field label="Προμήθεια ανά Περιστατικό (€)">
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <input type="number" value={settings.commission} min={1} max={100}
                  onChange={e=>setSettings(p=>({...p,commission:parseInt(e.target.value)||0}))}
                  style={{ width:120, padding:"10px 14px", borderRadius:8, border:"1px solid #E2E8F0", fontSize:18, fontWeight:700, fontFamily:"inherit", outline:"none", color:"#0F172A", textAlign:"center" }}/>
                <span style={{ fontSize:14, color:"#64748B" }}>€ ανά ανατεθέν περιστατικό</span>
              </div>
            </Field>
            <div style={{ background:"#FFFBEB", border:"1px solid #FDE68A", borderRadius:10, padding:"12px 16px", marginBottom:20 }}>
              <div style={{ fontSize:13, fontWeight:600, color:"#B45309", marginBottom:4 }}>Εκτιμώμενα Μηνιαία Έσοδα</div>
              <div style={{ fontSize:22, fontWeight:700, color:"#B45309", fontFamily:"'DM Serif Display',serif" }}>
                {settings.commission * 38}€
              </div>
              <div style={{ fontSize:12, color:"#92400E", marginTop:2 }}>βάσει 38 περιστατικών/μήνα (mock)</div>
            </div>
            <SaveBtn onClick={()=>save("commission")} saved={saved.commission}/>
          </div>
        </Section>
      )}

      {/* ── NOTIFICATIONS ── */}
      {activeTab==="notifications" && (
        <Section title="Email Ειδοποιήσεις">
          <div style={{ maxWidth:400 }}>
            <p style={{ fontSize:13, color:"#64748B", marginBottom:20 }}>Επέλεξε πότε να λαμβάνεις email στο <strong>{settings.email}</strong></p>
            <Toggle checked={settings.notifications.newRequest}      onChange={()=>toggleNotif("newRequest")}      label="Νέο αίτημα ασθενή"/>
            <Toggle checked={settings.notifications.newTherapist}    onChange={()=>toggleNotif("newTherapist")}    label="Νέα εγγραφή θεραπευτή"/>
            <Toggle checked={settings.notifications.newReview}       onChange={()=>toggleNotif("newReview")}       label="Νέο review"/>
            <Toggle checked={settings.notifications.paymentReceived} onChange={()=>toggleNotif("paymentReceived")} label="Εισπραγμένη πληρωμή"/>
            <Toggle checked={settings.notifications.weeklyReport}    onChange={()=>toggleNotif("weeklyReport")}    label="Εβδομαδιαία αναφορά"/>
            <div style={{ marginTop:8 }}>
              <SaveBtn onClick={()=>save("notifications")} saved={saved.notifications}/>
            </div>
          </div>
        </Section>
      )}

      {/* ── ACCOUNT ── */}
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
            <SaveBtn onClick={()=>{ if(password.new===password.confirm) { save("account"); setPassword({current:"",new:"",confirm:""}); }}} saved={saved.account}/>
          </div>
        </Section>
      )}

      {/* ── BLOG ── */}
      {activeTab==="blog" && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <div style={{ fontSize:13, color:"#64748B" }}>{blog.filter(p=>p.status==="published").length} δημοσιευμένα · {blog.filter(p=>p.status==="draft").length} drafts</div>
            <button onClick={openAddBlog} style={{ padding:"9px 18px", borderRadius:10, border:"none", background:"#1D4ED8", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}
              onMouseEnter={e=>e.currentTarget.style.opacity="0.8"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
              + Νέο Άρθρο
            </button>
          </div>

          <div style={{ background:"#fff", borderRadius:14, border:"1px solid #E2E8F0", overflow:"hidden" }}>
            <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 100px 80px 120px", padding:"10px 20px", background:"#F8FAFC", fontSize:11, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.04em" }}>
              <span>Τίτλος</span><span>Κατηγορία</span><span>Κατάσταση</span><span>Views</span><span>Ενέργειες</span>
            </div>
            {blog.map((post,i)=>(
              <div key={post.id} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 100px 80px 120px", padding:"13px 20px", borderTop:"1px solid #F1F5F9", alignItems:"center", background:i%2===0?"#fff":"#FAFAFA" }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:14, color:"#0F172A" }}>{post.title}</div>
                  <div style={{ fontSize:11, color:"#94A3B8", marginTop:2 }}>{post.date}</div>
                </div>
                <span style={{ fontSize:12, color:"#475569" }}>{post.category}</span>
                <span style={{ fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:999, background:post.status==="published"?"#D1FAE5":"#F1F5F9", color:post.status==="published"?"#065F46":"#64748B", textTransform:"uppercase", letterSpacing:"0.04em" }}>
                  {post.status==="published"?"Δημοσιευμένο":"Draft"}
                </span>
                <span style={{ fontSize:13, color:"#64748B" }}>{post.views}</span>
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={()=>openEditBlog(post)} style={{ padding:"5px 10px", borderRadius:6, border:"1px solid #E2E8F0", background:"transparent", color:"#475569", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Επεξ.</button>
                  <button onClick={()=>setDeleteConfirm(post.id)} style={{ padding:"5px 10px", borderRadius:6, border:"1px solid #FECDD3", background:"transparent", color:"#BE123C", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Blog Form Modal */}
      {showBlogForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:24 }}
          onClick={e=>{ if(e.target===e.currentTarget) setShowBlogForm(false); }}>
          <div style={{ background:"#fff", borderRadius:18, width:"100%", maxWidth:560, boxShadow:"0 20px 60px rgba(0,0,0,0.2)", padding:"28px" }}>
            <h2 style={{ fontSize:20, fontWeight:700, color:"#0F172A", margin:"0 0 20px" }}>
              {editBlog ? "Επεξεργασία Άρθρου" : "Νέο Άρθρο"}
            </h2>
            <Field label="Τίτλος *">
              <Input value={blogForm.title} onChange={e=>setBlogForm(p=>({...p,title:e.target.value}))} placeholder="Τίτλος άρθρου..."/>
            </Field>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
              <Field label="Κατηγορία">
                <select value={blogForm.category} onChange={e=>setBlogForm(p=>({...p,category:e.target.value}))}
                  style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:"1px solid #E2E8F0", fontSize:14, fontFamily:"inherit", outline:"none", color:"#0F172A", background:"#fff" }}>
                  {BLOG_CATEGORIES.map(c=><option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Κατάσταση">
                <select value={blogForm.status} onChange={e=>setBlogForm(p=>({...p,status:e.target.value}))}
                  style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:"1px solid #E2E8F0", fontSize:14, fontFamily:"inherit", outline:"none", color:"#0F172A", background:"#fff" }}>
                  <option value="draft">Draft</option>
                  <option value="published">Δημοσίευση</option>
                </select>
              </Field>
            </div>
            <Field label="Περιεχόμενο">
              <textarea value={blogForm.content} onChange={e=>setBlogForm(p=>({...p,content:e.target.value}))} placeholder="Γράψε το περιεχόμενο του άρθρου εδώ..." rows={6}
                style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:"1px solid #E2E8F0", fontSize:14, fontFamily:"inherit", outline:"none", color:"#0F172A", resize:"vertical", boxSizing:"border-box" }}/>
            </Field>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={saveBlog} disabled={!blogForm.title.trim()} style={{ flex:1, padding:"10px 0", borderRadius:8, border:"none", background:blogForm.title.trim()?"#1D4ED8":"#E2E8F0", color:blogForm.title.trim()?"#fff":"#94A3B8", fontSize:14, fontWeight:600, cursor:blogForm.title.trim()?"pointer":"not-allowed", fontFamily:"inherit" }}>
                {editBlog ? "Αποθήκευση" : "Δημιουργία"}
              </button>
              <button onClick={()=>setShowBlogForm(false)} style={{ padding:"10px 20px", borderRadius:8, border:"1px solid #E2E8F0", background:"transparent", color:"#64748B", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                Άκυρο
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:24 }}>
          <div style={{ background:"#fff", borderRadius:18, width:"100%", maxWidth:380, padding:"28px", textAlign:"center" }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🗑️</div>
            <h2 style={{ fontSize:18, fontWeight:700, color:"#0F172A", margin:"0 0 8px" }}>Διαγραφή Άρθρου</h2>
            <p style={{ fontSize:14, color:"#64748B", margin:"0 0 24px" }}>Είσαι σίγουρος; Δεν μπορεί να αναιρεθεί.</p>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>deleteBlog(deleteConfirm)} style={{ flex:1, padding:"10px 0", borderRadius:8, border:"none", background:"#BE123C", color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Διαγραφή</button>
              <button onClick={()=>setDeleteConfirm(null)} style={{ flex:1, padding:"10px 0", borderRadius:8, border:"1px solid #E2E8F0", background:"transparent", color:"#64748B", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Άκυρο</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
