"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const CATEGORIES = ["Pain Management", "Recovery Tips", "Post-Surgery", "Home Physiotherapy", "Mobility & Balance", "Sports Injuries"];
const MONTHS = ["Νοε", "Δεκ", "Ιαν", "Φεβ", "Μαρ", "Απρ"];

const colors = {
  navy: "#0F172A", blue: "#2563EB", lightBlue: "#EFF6FF",
  green: "#10B981", red: "#EF4444", yellow: "#F59E0B",
  gray: "#6B7280", border: "#E2E8F0", bg: "#F8FAFC",
};

export default function BlogPage() {
  const [view, setView] = useState("list");
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({
    title_en: "", title_el: "", excerpt_en: "", excerpt_el: "",
    category: CATEGORIES[0], status: "draft",
    content_en: "", content_el: "", slug: "", image_url: ""
  });

  // Fetch articles from Supabase
  useEffect(() => {
    fetchArticles();
  }, []);

  async function fetchArticles() {
    setLoading(true);
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setArticles(data);
    setLoading(false);
  }

  const filtered = filter === "all" ? articles : articles.filter(a => a.status === filter);

  function generateSlug(title) {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  function openEdit(article) {
    setSelected(article);
    setForm({
      title_en: article.title_en || "",
      title_el: article.title_el || "",
      excerpt_en: article.excerpt_en || "",
      excerpt_el: article.excerpt_el || "",
      category: article.category || CATEGORIES[0],
      status: article.status || "draft",
      content_en: article.content_en || "",
      content_el: article.content_el || "",
      slug: article.slug || "",
      image_url: article.image_url || "",
    });
    setView("edit");
  }

  function openNew() {
    setSelected(null);
    setForm({
      title_en: "", title_el: "", excerpt_en: "", excerpt_el: "",
      category: CATEGORIES[0], status: "draft",
      content_en: "", content_el: "", slug: "", image_url: ""
    });
    setView("new");
  }

  async function saveArticle() {
    if (!form.title_en) return alert("Παρακαλώ συμπλήρωσε τον τίτλο στα αγγλικά!");
    setSaving(true);

    const slug = form.slug || generateSlug(form.title_en);
    const payload = { ...form, slug };

    let error;
    if (view === "new") {
      ({ error } = await supabase.from("articles").insert([payload]));
    } else {
      ({ error } = await supabase.from("articles").update(payload).eq("id", selected.id));
    }

    if (error) {
      alert("Σφάλμα αποθήκευσης: " + error.message);
    } else {
      await fetchArticles();
      setView("list");
    }
    setSaving(false);
  }

  async function deleteArticle(id) {
    if (!confirm("Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το άρθρο;")) return;
    const { error } = await supabase.from("articles").delete().eq("id", id);
    if (!error) await fetchArticles();
  }

  async function toggleStatus(article) {
    const newStatus = article.status === "published" ? "draft" : "published";
    const { error } = await supabase.from("articles").update({ status: newStatus }).eq("id", article.id);
    if (!error) await fetchArticles();
  }

  const totalReads = articles.reduce((s, a) => s + (a.reads || 0), 0);
  const published = articles.filter(a => a.status === "published").length;

  // ===== LOADING =====
  if (loading) return (
    <div style={{ padding: 24, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
      <div style={{ fontSize: 16, color: colors.gray }}>Φόρτωση άρθρων...</div>
    </div>
  );

  // ===== LIST VIEW =====
  if (view === "list") return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.navy }}>Blog</h1>
          <p style={{ fontSize: 14, color: colors.gray }}>Διαχείριση άρθρων και στατιστικά</p>
        </div>
        <button onClick={openNew} style={{ background: colors.blue, color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          + Νέο Άρθρο
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Συνολικά Άρθρα", value: articles.length, color: colors.blue },
          { label: "Δημοσιευμένα", value: published, color: colors.green },
          { label: "Συνολικές Αναγνώσεις", value: totalReads.toLocaleString(), color: colors.navy },
          { label: "Πρόχειρα", value: articles.length - published, color: colors.yellow },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 13, color: colors.gray, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["all", "published", "draft"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 16px", borderRadius: 20, border: `1px solid ${colors.border}`, background: filter === f ? colors.navy : "#fff", color: filter === f ? "#fff" : colors.gray, fontSize: 13, cursor: "pointer", fontWeight: filter === f ? 600 : 400 }}>
            {f === "all" ? "Όλα" : f === "published" ? "Δημοσιευμένα" : "Πρόχειρα"}
          </button>
        ))}
      </div>

      {/* Articles Table */}
      <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: 12, overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: colors.gray }}>
            Δεν υπάρχουν άρθρα ακόμα. Πάτα "+ Νέο Άρθρο" για να ξεκινήσεις!
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: colors.bg }}>
                {["Τίτλος", "Κατηγορία", "Κατάσταση", "Αναγνώσεις", "Ημερομηνία", "Ενέργειες"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: colors.gray, textTransform: "uppercase", letterSpacing: ".05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((article, i) => (
                <tr key={article.id} style={{ borderTop: `1px solid ${colors.border}`, background: i % 2 === 0 ? "#fff" : colors.bg }}>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: colors.navy, maxWidth: 280 }}>{article.title_en}</div>
                    <div style={{ fontSize: 12, color: colors.gray, marginTop: 2 }}>{article.title_el}</div>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{ background: colors.lightBlue, color: colors.blue, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>{article.category}</span>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <button onClick={() => toggleStatus(article)} style={{ background: article.status === "published" ? "#D1FAE5" : "#FEF3C7", color: article.status === "published" ? colors.green : colors.yellow, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer" }}>
                      {article.status === "published" ? "✓ Δημοσιευμένο" : "✎ Πρόχειρο"}
                    </button>
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 14, color: colors.navy, fontWeight: 600 }}>{article.reads || 0}</td>
                  <td style={{ padding: "14px 16px", fontSize: 13, color: colors.gray }}>
                    {new Date(article.created_at).toLocaleDateString("el-GR")}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => openEdit(article)} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${colors.border}`, background: "#fff", fontSize: 12, cursor: "pointer", color: colors.navy, fontWeight: 500 }}>✎ Επεξεργασία</button>
                      <button onClick={() => deleteArticle(article.id)} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid #FEE2E2`, background: "#FEF2F2", fontSize: 12, cursor: "pointer", color: colors.red, fontWeight: 500 }}>🗑 Διαγραφή</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  // ===== EDIT / NEW VIEW =====
  if (view === "edit" || view === "new") return (
    <div style={{ padding: 24, maxWidth: 860 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={() => setView("list")} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: colors.gray }}>←</button>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: colors.navy }}>{view === "new" ? "Νέο Άρθρο" : "Επεξεργασία Άρθρου"}</h1>
      </div>

      <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Titles */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: colors.navy, display: "block", marginBottom: 6 }}>Τίτλος (Αγγλικά) *</label>
            <input value={form.title_en} onChange={e => setForm({ ...form, title_en: e.target.value, slug: generateSlug(e.target.value) })} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} placeholder="Title in English" />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: colors.navy, display: "block", marginBottom: 6 }}>Τίτλος (Ελληνικά)</label>
            <input value={form.title_el} onChange={e => setForm({ ...form, title_el: e.target.value })} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} placeholder="Τίτλος στα Ελληνικά" />
          </div>
        </div>

        {/* Excerpts */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: colors.navy, display: "block", marginBottom: 6 }}>Περίληψη (Αγγλικά)</label>
            <textarea value={form.excerpt_en} onChange={e => setForm({ ...form, excerpt_en: e.target.value })} rows={3} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} placeholder="Short description in English..." />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: colors.navy, display: "block", marginBottom: 6 }}>Περίληψη (Ελληνικά)</label>
            <textarea value={form.excerpt_el} onChange={e => setForm({ ...form, excerpt_el: e.target.value })} rows={3} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} placeholder="Σύντομη περιγραφή στα ελληνικά..." />
          </div>
        </div>

        {/* Category, Status, Slug */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: colors.navy, display: "block", marginBottom: 6 }}>Κατηγορία</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit" }}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: colors.navy, display: "block", marginBottom: 6 }}>Κατάσταση</label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit" }}>
              <option value="draft">Πρόχειρο</option>
              <option value="published">Δημοσιευμένο</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: colors.navy, display: "block", marginBottom: 6 }}>Slug (URL)</label>
            <input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} placeholder="auto-generated-from-title" />
          </div>
        </div>

        {/* Image URL */}
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: colors.navy, display: "block", marginBottom: 6 }}>URL Εικόνας (προαιρετικό)</label>
          <input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} placeholder="https://..." />
        </div>

        {/* Content EN */}
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: colors.navy, display: "block", marginBottom: 6 }}>Περιεχόμενο (Αγγλικά)</label>
          <textarea value={form.content_en} onChange={e => setForm({ ...form, content_en: e.target.value })} rows={10} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} placeholder="Write the article content in English..." />
        </div>

        {/* Content EL */}
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: colors.navy, display: "block", marginBottom: 6 }}>Περιεχόμενο (Ελληνικά)</label>
          <textarea value={form.content_el} onChange={e => setForm({ ...form, content_el: e.target.value })} rows={10} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} placeholder="Γράψε το περιεχόμενο του άρθρου στα ελληνικά..." />
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button onClick={() => setView("list")} style={{ padding: "10px 24px", borderRadius: 8, border: `1px solid ${colors.border}`, background: "#fff", fontSize: 14, cursor: "pointer", color: colors.gray }}>Ακύρωση</button>
          <button onClick={saveArticle} disabled={saving} style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: saving ? colors.gray : colors.blue, color: "#fff", fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Αποθήκευση..." : form.status === "published" ? "✓ Δημοσίευση" : "💾 Αποθήκευση"}
          </button>
        </div>
      </div>
    </div>
  );
}