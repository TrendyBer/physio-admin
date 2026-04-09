"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const colors = {
  navy: "#0F172A", blue: "#2563EB", lightBlue: "#EFF6FF",
  green: "#10B981", gray: "#6B7280", border: "#E2E8F0", bg: "#F8FAFC",
};

const PAGES = [
  { id: "homepage", label: "🏠 Homepage" },
  { id: "services", label: "⚕️ Υπηρεσίες" },
];

const SECTIONS = {
  homepage: [
    { id: "hero", label: "Hero" },
    { id: "whyus", label: "Why Us" },
    { id: "howitworks", label: "How It Works" },
    { id: "benefits", label: "Benefits" },
    { id: "services", label: "Services" },
    { id: "faq", label: "FAQ" },
  ],
  services: [
    { id: "hero", label: "Hero" },
    { id: "services_list", label: "Services List" },
    { id: "conditions", label: "Conditions" },
    { id: "faq", label: "FAQ" },
  ],
};

export default function CMSPage() {
  const [activePage, setActivePage] = useState("homepage");
  const [activeSection, setActiveSection] = useState("hero");
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchContent();
  }, [activePage, activeSection]);

  async function fetchContent() {
    setLoading(true);
    const { data } = await supabase
      .from("site_content")
      .select("*")
      .eq("page", activePage)
      .eq("section", activeSection)
      .single();
    setContent(data || null);
    setLoading(false);
  }

  async function saveContent(elData, enData) {
    setSaving(true);
    const { error } = await supabase
      .from("site_content")
      .upsert({
        page: activePage,
        section: activeSection,
        content_el: elData,
        content_en: enData,
        updated_at: new Date().toISOString(),
      }, { onConflict: "page,section" });

    if (error) {
      alert("Σφάλμα: " + error.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      await fetchContent();
    }
    setSaving(false);
  }

  async function uploadImage(file, callback) {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `cms/${activePage}/${activeSection}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("images").upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("images").getPublicUrl(path);
      callback(data.publicUrl);
    } else {
      alert("Σφάλμα upload: " + error.message);
    }
    setUploading(false);
  }

  const sections = SECTIONS[activePage] || [];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.navy }}>CMS - Διαχείριση Περιεχομένου</h1>
        <p style={{ fontSize: 14, color: colors.gray }}>Επεξεργασία κειμένων και εικόνων του site</p>
      </div>

      {/* Page Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {PAGES.map(p => (
          <button key={p.id} onClick={() => { setActivePage(p.id); setActiveSection(SECTIONS[p.id][0].id); }}
            style={{ padding: "8px 20px", borderRadius: 8, border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", background: activePage === p.id ? colors.navy : "#fff", color: activePage === p.id ? "#fff" : colors.gray, border: `1px solid ${colors.border}` }}>
            {p.label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 24 }}>
        {/* Section Sidebar */}
        <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: 12, padding: 16, height: "fit-content" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: colors.gray, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 12 }}>Sections</div>
          {sections.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              style={{ width: "100%", textAlign: "left", padding: "10px 14px", borderRadius: 8, border: "none", fontSize: 14, cursor: "pointer", marginBottom: 4, background: activeSection === s.id ? colors.lightBlue : "transparent", color: activeSection === s.id ? colors.blue : colors.navy, fontWeight: activeSection === s.id ? 600 : 400 }}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Editor */}
        <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: 12, padding: 24 }}>
          {loading ? (
            <div style={{ textAlign: "center", color: colors.gray, padding: 40 }}>Φόρτωση...</div>
          ) : (
            <SectionEditor
              page={activePage}
              section={activeSection}
              content={content}
              onSave={saveContent}
              onUpload={uploadImage}
              saving={saving}
              uploading={uploading}
              saved={saved}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function SectionEditor({ page, section, content, onSave, onUpload, saving, uploading, saved }) {
  const [elData, setElData] = useState(content?.content_el || {});
  const [enData, setEnData] = useState(content?.content_en || {});

  useEffect(() => {
    setElData(content?.content_el || {});
    setEnData(content?.content_en || {});
  }, [content, section]);

  const key = `${page}-${section}`;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A" }}>
          {section.charAt(0).toUpperCase() + section.slice(1).replace(/_/g, " ")}
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {saved && <span style={{ fontSize: 13, color: "#10B981", fontWeight: 600 }}>✓ Αποθηκεύτηκε!</span>}
          <button onClick={() => onSave(elData, enData)} disabled={saving}
            style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: saving ? "#94A3B8" : "#2563EB", color: "#fff", fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Αποθήκευση..." : "💾 Αποθήκευση"}
          </button>
        </div>
      </div>

      {/* Hero Section */}
      {section === "hero" && page === "homepage" && (
        <HeroEditor elData={elData} enData={enData} setElData={setElData} setEnData={setEnData} onUpload={onUpload} uploading={uploading} />
      )}

      {/* WhyUs Section */}
      {section === "whyus" && (
        <WhyUsEditor elData={elData} enData={enData} setElData={setElData} setEnData={setEnData} />
      )}

      {/* HowItWorks Section */}
      {section === "howitworks" && (
        <HowItWorksEditor elData={elData} enData={enData} setElData={setElData} setEnData={setEnData} />
      )}

      {/* Benefits Section */}
      {section === "benefits" && (
        <BenefitsEditor elData={elData} enData={enData} setElData={setElData} setEnData={setEnData} onUpload={onUpload} uploading={uploading} />
      )}

      {/* Services Section */}
      {section === "services" && (
        <ServicesEditor elData={elData} enData={enData} setElData={setElData} setEnData={setEnData} onUpload={onUpload} uploading={uploading} />
      )}

      {/* FAQ Section */}
      {section === "faq" && (
        <FaqEditor elData={elData} enData={enData} setElData={setElData} setEnData={setEnData} />
      )}

      {/* Services Page Hero */}
      {section === "hero" && page === "services" && (
        <ServicesHeroEditor elData={elData} enData={enData} setElData={setElData} setEnData={setEnData} />
      )}
    </div>
  );
}

// ─── FIELD HELPERS ───────────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder }) {
  return (
    <input value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder || ""}
      style={{ width: "100%", padding: "10px 14px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} />
  );
}

function Textarea({ value, onChange, rows = 3 }) {
  return (
    <textarea value={value || ""} onChange={e => onChange(e.target.value)} rows={rows}
      style={{ width: "100%", padding: "10px 14px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 14, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} />
  );
}

function ImageUpload({ value, onChange, onUpload, uploading, label }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      {value ? (
        <img src={value} alt="" style={{ width: 120, height: 80, objectFit: "cover", borderRadius: 8, border: "1px solid #E2E8F0" }} />
      ) : (
        <div style={{ width: 120, height: 80, borderRadius: 8, border: "1px solid #E2E8F0", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>📷</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <label style={{ background: "#2563EB", color: "#fff", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: uploading ? "not-allowed" : "pointer" }}>
          {uploading ? "⏳..." : "⬆ Upload"}
          <input type="file" accept="image/*" style={{ display: "none" }} disabled={uploading}
            onChange={e => { if (e.target.files[0]) onUpload(e.target.files[0], onChange); }} />
        </label>
        <input value={value || ""} onChange={e => onChange(e.target.value)} placeholder="ή URL εικόνας..."
          style={{ padding: "6px 10px", border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 12, width: 200 }} />
      </div>
    </div>
  );
}

function LangTabs({ active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#F1F5F9", padding: 4, borderRadius: 8, width: "fit-content" }}>
      {["el", "en"].map(l => (
        <button key={l} onClick={() => onChange(l)}
          style={{ padding: "6px 20px", borderRadius: 6, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: active === l ? "#fff" : "transparent", color: active === l ? "#0F172A" : "#64748B" }}>
          {l === "el" ? "🇬🇷 Ελληνικά" : "🇬🇧 English"}
        </button>
      ))}
    </div>
  );
}

// ─── SECTION EDITORS ─────────────────────────────────────────────────────────

function HeroEditor({ elData, enData, setElData, setEnData, onUpload, uploading }) {
  const [lang, setLang] = useState("el");
  const data = lang === "el" ? elData : enData;
  const setData = lang === "el" ? setElData : setEnData;
  const upd = (key, val) => setData(prev => ({ ...prev, [key]: val }));

  return (
    <div>
      <LangTabs active={lang} onChange={setLang} />
      <Field label="Badge"><Input value={data.badge} onChange={v => upd("badge", v)} /></Field>
      <Field label="Τίτλος (μέρος 1)"><Input value={data.title1} onChange={v => upd("title1", v)} /></Field>
      <Field label="Τίτλος (μέρος 2 - italic)"><Input value={data.title2} onChange={v => upd("title2", v)} /></Field>
      <Field label="Περιγραφή"><Textarea value={data.desc} onChange={v => upd("desc", v)} /></Field>
      <Field label="Κουμπί 1 (CTA)"><Input value={data.cta} onChange={v => upd("cta", v)} /></Field>
      <Field label="Κουμπί 2 (How It Works)"><Input value={data.how} onChange={v => upd("how", v)} /></Field>
      <Field label="Pills (χωρισμένα με |)">
        <Input value={(data.pills || []).join(" | ")} onChange={v => upd("pills", v.split(" | "))} />
      </Field>
      <Field label="Εικόνα Hero">
        <ImageUpload value={data.image_url} onChange={v => upd("image_url", v)} onUpload={onUpload} uploading={uploading} />
      </Field>
    </div>
  );
}

function WhyUsEditor({ elData, enData, setElData, setEnData }) {
  const [lang, setLang] = useState("el");
  const data = lang === "el" ? elData : enData;
  const setData = lang === "el" ? setElData : setEnData;
  const upd = (key, val) => setData(prev => ({ ...prev, [key]: val }));
  const updCard = (i, key, val) => {
    const cards = [...(data.cards || [])];
    cards[i] = { ...cards[i], [key]: val };
    upd("cards", cards);
  };

  return (
    <div>
      <LangTabs active={lang} onChange={setLang} />
      <Field label="Τίτλος"><Input value={data.title} onChange={v => upd("title", v)} /></Field>
      <Field label="Τίτλος (italic)"><Input value={data.titleEm} onChange={v => upd("titleEm", v)} /></Field>
      <Field label="Περιγραφή"><Textarea value={data.desc} onChange={v => upd("desc", v)} /></Field>
      {(data.cards || []).map((card, i) => (
        <div key={i} style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 10 }}>Card {i + 1}</div>
          <Field label="Icon"><Input value={card.icon} onChange={v => updCard(i, "icon", v)} /></Field>
          <Field label="Τίτλος"><Input value={card.title} onChange={v => updCard(i, "title", v)} /></Field>
          <Field label="Περιγραφή"><Textarea value={card.desc} onChange={v => updCard(i, "desc", v)} rows={2} /></Field>
        </div>
      ))}
    </div>
  );
}

function HowItWorksEditor({ elData, enData, setElData, setEnData }) {
  const [lang, setLang] = useState("el");
  const data = lang === "el" ? elData : enData;
  const setData = lang === "el" ? setElData : setEnData;
  const upd = (key, val) => setData(prev => ({ ...prev, [key]: val }));
  const updStep = (i, key, val) => {
    const steps = [...(data.steps || [])];
    steps[i] = { ...steps[i], [key]: val };
    upd("steps", steps);
  };

  return (
    <div>
      <LangTabs active={lang} onChange={setLang} />
      <Field label="Τίτλος"><Input value={data.title} onChange={v => upd("title", v)} /></Field>
      <Field label="Τίτλος (italic)"><Input value={data.titleEm} onChange={v => upd("titleEm", v)} /></Field>
      <Field label="Περιγραφή"><Textarea value={data.desc} onChange={v => upd("desc", v)} /></Field>
      <Field label="Κουμπί CTA"><Input value={data.cta} onChange={v => upd("cta", v)} /></Field>
      {(data.steps || []).map((step, i) => (
        <div key={i} style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 10 }}>Step {i + 1}</div>
          <Field label="Label"><Input value={step.label} onChange={v => updStep(i, "label", v)} /></Field>
          <Field label="Τίτλος"><Input value={step.title} onChange={v => updStep(i, "title", v)} /></Field>
          <Field label="Περιγραφή"><Textarea value={step.desc} onChange={v => updStep(i, "desc", v)} rows={2} /></Field>
        </div>
      ))}
    </div>
  );
}

function BenefitsEditor({ elData, enData, setElData, setEnData, onUpload, uploading }) {
  const [lang, setLang] = useState("el");
  const data = lang === "el" ? elData : enData;
  const setData = lang === "el" ? setElData : setEnData;
  const upd = (key, val) => setData(prev => ({ ...prev, [key]: val }));
  const updBenefit = (i, key, val) => {
    const benefits = [...(data.benefits || [])];
    benefits[i] = { ...benefits[i], [key]: val };
    upd("benefits", benefits);
  };

  return (
    <div>
      <LangTabs active={lang} onChange={setLang} />
      <Field label="Τίτλος"><Input value={data.title} onChange={v => upd("title", v)} /></Field>
      <Field label="Τίτλος (italic)"><Input value={data.titleEm} onChange={v => upd("titleEm", v)} /></Field>
      <Field label="Περιγραφή"><Textarea value={data.desc} onChange={v => upd("desc", v)} /></Field>
      <Field label="Εικόνα">
        <ImageUpload value={data.image_url} onChange={v => upd("image_url", v)} onUpload={onUpload} uploading={uploading} />
      </Field>
      {(data.benefits || []).map((b, i) => (
        <div key={i} style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 10 }}>Benefit {i + 1}</div>
          <Field label="Icon"><Input value={b.icon} onChange={v => updBenefit(i, "icon", v)} /></Field>
          <Field label="Τίτλος"><Input value={b.title} onChange={v => updBenefit(i, "title", v)} /></Field>
          <Field label="Περιγραφή"><Textarea value={b.desc} onChange={v => updBenefit(i, "desc", v)} rows={2} /></Field>
        </div>
      ))}
    </div>
  );
}

function ServicesEditor({ elData, enData, setElData, setEnData, onUpload, uploading }) {
  const [lang, setLang] = useState("el");
  const data = lang === "el" ? elData : enData;
  const setData = lang === "el" ? setElData : setEnData;
  const upd = (key, val) => setData(prev => ({ ...prev, [key]: val }));
  const updService = (i, key, val) => {
    const services = [...(data.services || [])];
    services[i] = { ...services[i], [key]: val };
    upd("services", services);
  };

  return (
    <div>
      <LangTabs active={lang} onChange={setLang} />
      <Field label="Τίτλος"><Input value={data.title} onChange={v => upd("title", v)} /></Field>
      <Field label="Τίτλος (italic)"><Input value={data.titleEm} onChange={v => upd("titleEm", v)} /></Field>
      <Field label="Περιγραφή"><Textarea value={data.desc} onChange={v => upd("desc", v)} /></Field>
      <Field label="Κουμπί Όλες οι Υπηρεσίες"><Input value={data.viewAll} onChange={v => upd("viewAll", v)} /></Field>
      {(data.services || []).map((s, i) => (
        <div key={i} style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 10 }}>Service {i + 1}</div>
          <Field label="Τίτλος"><Input value={s.title} onChange={v => updService(i, "title", v)} /></Field>
          <Field label="Περιγραφή"><Textarea value={s.desc} onChange={v => updService(i, "desc", v)} rows={2} /></Field>
          <Field label="Τιμή"><Input value={s.price} onChange={v => updService(i, "price", v)} /></Field>
          <Field label="Εικόνα">
            <ImageUpload value={s.image_url} onChange={v => updService(i, "image_url", v)} onUpload={onUpload} uploading={uploading} />
          </Field>
        </div>
      ))}
    </div>
  );
}

function FaqEditor({ elData, enData, setElData, setEnData }) {
  const [lang, setLang] = useState("el");
  const data = lang === "el" ? elData : enData;
  const setData = lang === "el" ? setElData : setEnData;
  const upd = (key, val) => setData(prev => ({ ...prev, [key]: val }));
  const updFaq = (i, key, val) => {
    const faqs = [...(data.faqs || [])];
    faqs[i] = { ...faqs[i], [key]: val };
    upd("faqs", faqs);
  };
  const addFaq = () => upd("faqs", [...(data.faqs || []), { q: "", a: "" }]);
  const removeFaq = (i) => upd("faqs", (data.faqs || []).filter((_, idx) => idx !== i));

  return (
    <div>
      <LangTabs active={lang} onChange={setLang} />
      <Field label="Τίτλος"><Input value={data.title} onChange={v => upd("title", v)} /></Field>
      <Field label="Τίτλος (italic)"><Input value={data.titleEm} onChange={v => upd("titleEm", v)} /></Field>
      {(data.faqs || []).map((faq, i) => (
        <div key={i} style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: 16, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>FAQ {i + 1}</div>
            <button onClick={() => removeFaq(i)} style={{ background: "#FEF2F2", color: "#EF4444", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}>🗑</button>
          </div>
          <Field label="Ερώτηση"><Input value={faq.q} onChange={v => updFaq(i, "q", v)} /></Field>
          <Field label="Απάντηση"><Textarea value={faq.a} onChange={v => updFaq(i, "a", v)} rows={2} /></Field>
        </div>
      ))}
      <button onClick={addFaq} style={{ background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE", borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
        + Προσθήκη FAQ
      </button>
    </div>
  );
}

function ServicesHeroEditor({ elData, enData, setElData, setEnData }) {
  const [lang, setLang] = useState("el");
  const data = lang === "el" ? elData : enData;
  const setData = lang === "el" ? setElData : setEnData;
  const upd = (key, val) => setData(prev => ({ ...prev, [key]: val }));

  return (
    <div>
      <LangTabs active={lang} onChange={setLang} />
      <Field label="Τίτλος"><Input value={data.heroTitle} onChange={v => upd("heroTitle", v)} /></Field>
      <Field label="Τίτλος (italic)"><Input value={data.heroTitleEm} onChange={v => upd("heroTitleEm", v)} /></Field>
      <Field label="Περιγραφή"><Textarea value={data.heroDesc} onChange={v => upd("heroDesc", v)} /></Field>
      <Field label="Κουμπί CTA"><Input value={data.cta} onChange={v => upd("cta", v)} /></Field>
      <Field label="Badges (χωρισμένα με |)">
        <Input value={(data.badges || []).join(" | ")} onChange={v => upd("badges", v.split(" | "))} />
      </Field>
    </div>
  );
}