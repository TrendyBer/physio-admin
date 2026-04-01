"use client";
import { useState } from "react";

const MOCK_ARTICLES = [
  {
    id: 1,
    title: "How home physiotherapy can help with back and neck pain",
    titleEl: "Πώς η φυσιοθεραπεία στο σπίτι βοηθά στον πόνο στη μέση και τον αυχένα",
    category: "Pain Management",
    status: "published",
    date: "2026-03-15",
    reads: 342,
    clicks: 89,
    avgTime: "4:32",
    sources: { direct: 58, search: 42 },
    monthlyReads: [12, 28, 45, 67, 89, 101],
  },
  {
    id: 2,
    title: "Simple ways to improve mobility and balance at home",
    titleEl: "Απλοί τρόποι για να βελτιώσετε την κινητικότητα και ισορροπία στο σπίτι",
    category: "Mobility & Balance",
    status: "published",
    date: "2026-03-10",
    reads: 218,
    clicks: 54,
    avgTime: "3:15",
    sources: { direct: 71, search: 29 },
    monthlyReads: [8, 19, 31, 44, 62, 54],
  },
  {
    id: 3,
    title: "What to expect from home physiotherapy after surgery",
    titleEl: "Τι να περιμένετε από τη φυσιοθεραπεία στο σπίτι μετά το χειρουργείο",
    category: "Post-Surgery",
    status: "draft",
    date: "2026-03-28",
    reads: 0,
    clicks: 0,
    avgTime: "0:00",
    sources: { direct: 0, search: 0 },
    monthlyReads: [0, 0, 0, 0, 0, 0],
  },
];

const CATEGORIES = ["Pain Management", "Recovery Tips", "Post-Surgery", "Home Physiotherapy", "Mobility & Balance", "Sports Injuries"];
const MONTHS = ["Νοε", "Δεκ", "Ιαν", "Φεβ", "Μαρ", "Απρ"];

const colors = {
  navy: "#0F172A", blue: "#2563EB", lightBlue: "#EFF6FF",
  green: "#10B981", red: "#EF4444", yellow: "#F59E0B",
  gray: "#6B7280", border: "#E2E8F0", bg: "#F8FAFC",
};

export default function BlogPage() {
  const [view, setView] = useState("list"); // list | edit | new | analytics
  const [articles, setArticles] = useState(MOCK_ARTICLES);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({ title: "", titleEl: "", category: CATEGORIES[0], status: "draft", content: "", contentEl: "" });

  const filtered = filter === "all" ? articles : articles.filter(a => a.status === filter);

  function openEdit(article) {
    setSelected(article);
    setForm({ title: article.title, titleEl: article.titleEl, category: article.category, status: article.status, content: "", contentEl: "" });
    setView("edit");
  }

  function openNew() {
    setSelected(null);
    setForm({ title: "", titleEl: "", category: CATEGORIES[0], status: "draft", content: "", contentEl: "" });
    setView("new");
  }

  function saveArticle() {
    if (view === "new") {
      const newArticle = {
        id: Date.now(), ...form,
        date: new Date().toISOString().split("T")[0],
        reads: 0, clicks: 0, avgTime: "0:00",
        sources: { direct: 0, search: 0 },
        monthlyReads: [0, 0, 0, 0, 0, 0],
      };
      setArticles([...articles, newArticle]);
    } else {
      setArticles(articles.map(a => a.id === selected.id ? { ...a, ...form } : a));
    }
    setView("list");
  }

  function deleteArticle(id) {
    if (confirm("Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το άρθρο;")) {
      setArticles(articles.filter(a => a.id !== id));
    }
  }

  const totalReads = articles.reduce((s, a) => s + a.reads, 0);
  const totalClicks = articles.reduce((s, a) => s + a.clicks, 0);
  const published = articles.filter(a => a.status === "published").length;

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
          { label: "Συνολικά Κλικ", value: totalClicks.toLocaleString(), color: colors.yellow },
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
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: colors.bg }}>
              {["Τίτλος", "Κατηγορία", "Κατάσταση", "Αναγνώσεις", "Κλικ", "Μέσος Χρόνος", "Ενέργειες"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: colors.gray, textTransform: "uppercase", letterSpacing: ".05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((article, i) => (
              <tr key={article.id} style={{ borderTop: `1px solid ${colors.border}`, background: i % 2 === 0 ? "#fff" : colors.bg }}>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: colors.navy, maxWidth: 280 }}>{article.title}</div>
                  <div style={{ fontSize: 12, color: colors.gray, marginTop: 2 }}>{article.date}</div>
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <span style={{ background: colors.lightBlue, color: colors.blue, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>{article.category}</span>
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <span style={{ background: article.status === "published" ? "#D1FAE5" : "#FEF3C7", color: article.status === "published" ? colors.green : colors.yellow, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                    {article.status === "published" ? "✓ Δημοσιευμένο" : "✎ Πρόχειρο"}
                  </span>
                </td>
                <td style={{ padding: "14px 16px", fontSize: 14, color: colors.navy, fontWeight: 600 }}>{article.reads.toLocaleString()}</td>
                <td style={{ padding: "14px 16px", fontSize: 14, color: colors.navy, fontWeight: 600 }}>{article.clicks.toLocaleString()}</td>
                <td style={{ padding: "14px 16px", fontSize: 14, color: colors.navy }}>{article.avgTime}</td>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { setSelected(article); setView("analytics"); }} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${colors.border}`, background: "#fff", fontSize: 12, cursor: "pointer", color: colors.blue, fontWeight: 500 }}>📊 Analytics</button>
                    <button onClick={() => openEdit(article)} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${colors.border}`, background: "#fff", fontSize: 12, cursor: "pointer", color: colors.navy, fontWeight: 500 }}>✎ Επεξεργασία</button>
                    <button onClick={() => deleteArticle(article.id)} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid #FEE2E2`, background: "#FEF2F2", fontSize: 12, cursor: "pointer", color: colors.red, fontWeight: 500 }}>🗑 Διαγραφή</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ===== EDIT / NEW VIEW =====
  if (view === "edit" || view === "new") return (
    <div style={{ padding: 24, maxWidth: 800 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={() => setView("list")} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: colors.gray }}>←</button>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: colors.navy }}>{view === "new" ? "Νέο Άρθρο" : "Επεξεργασία Άρθρου"}</h1>
      </div>

      <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Title EN */}
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: colors.navy, display: "block", marginBottom: 6 }}>Τίτλος (Αγγλικά)</label>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} />
        </div>
        {/* Title EL */}
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: colors.navy, display: "block", marginBottom: 6 }}>Τίτλος (Ελληνικά)</label>
          <input value={form.titleEl} onChange={e => setForm({ ...form, titleEl: e.target.value })} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} />
        </div>
        {/* Category & Status */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
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
        </div>
        {/* Content EN */}
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: colors.navy, display: "block", marginBottom: 6 }}>Περιεχόμενο (Αγγλικά)</label>
          <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={8} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} />
        </div>
        {/* Content EL */}
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: colors.navy, display: "block", marginBottom: 6 }}>Περιεχόμενο (Ελληνικά)</label>
          <textarea value={form.contentEl} onChange={e => setForm({ ...form, contentEl: e.target.value })} rows={8} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} />
        </div>
        {/* Buttons */}
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button onClick={() => setView("list")} style={{ padding: "10px 24px", borderRadius: 8, border: `1px solid ${colors.border}`, background: "#fff", fontSize: 14, cursor: "pointer", color: colors.gray }}>Ακύρωση</button>
          <button onClick={saveArticle} style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: colors.blue, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            {form.status === "published" ? "✓ Δημοσίευση" : "💾 Αποθήκευση"}
          </button>
        </div>
      </div>
    </div>
  );

  // ===== ANALYTICS VIEW =====
  if (view === "analytics" && selected) return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={() => setView("list")} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: colors.gray }}>←</button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: colors.navy }}>Analytics Άρθρου</h1>
          <p style={{ fontSize: 13, color: colors.gray, marginTop: 2 }}>{selected.title}</p>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Συνολικές Αναγνώσεις", value: selected.reads, icon: "👁", color: colors.blue },
          { label: "Κλικ", value: selected.clicks, icon: "🖱", color: colors.green },
          { label: "Μέσος Χρόνος Ανάγνωσης", value: selected.avgTime, icon: "⏱", color: colors.navy },
          { label: "Conversion (κλικ/αναγνώσεις)", value: selected.reads ? `${Math.round((selected.clicks / selected.reads) * 100)}%` : "0%", icon: "📈", color: colors.yellow },
        ].map(k => (
          <div key={k.label} style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{k.icon}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 12, color: colors.gray, marginTop: 4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Monthly Reads Chart */}
        <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: colors.navy, marginBottom: 20 }}>Αναγνώσεις ανά Μήνα</h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 140 }}>
            {selected.monthlyReads.map((v, i) => {
              const max = Math.max(...selected.monthlyReads) || 1;
              const h = Math.round((v / max) * 120);
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, color: colors.gray }}>{v}</span>
                  <div style={{ width: "100%", height: h, background: i === selected.monthlyReads.length - 1 ? colors.blue : "#BFDBFE", borderRadius: "4px 4px 0 0" }} />
                  <span style={{ fontSize: 11, color: colors.gray }}>{MONTHS[i]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Source Breakdown */}
        <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: colors.navy, marginBottom: 20 }}>Πηγή Επισκεπτών</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { label: "🔍 Από Αναζήτηση (Google κλπ)", value: selected.sources.search, color: colors.blue },
              { label: "🌐 Direct (μπήκε απευθείας)", value: selected.sources.direct, color: colors.green },
            ].map(s => (
              <div key={s.label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: colors.gray }}>{s.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: colors.navy }}>{s.value}%</span>
                </div>
                <div style={{ height: 8, background: colors.border, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${s.value}%`, background: s.color, borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 24, padding: 16, background: colors.bg, borderRadius: 8 }}>
            <p style={{ fontSize: 13, color: colors.gray, lineHeight: 1.6 }}>
              <strong style={{ color: colors.navy }}>Ερμηνεία:</strong> Το {selected.sources.search}% των επισκεπτών βρήκε το άρθρο μέσω αναζήτησης, ενώ το {selected.sources.direct}% ήρθε απευθείας από την ιστοσελίδα.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
