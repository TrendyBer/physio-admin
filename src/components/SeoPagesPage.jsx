"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  Globe, Search, X, Save, RefreshCw, Plus, Trash2, Eye, EyeOff,
  AlertTriangle, CheckCircle2, MapPin, Stethoscope, ExternalLink, Users,
} from "lucide-react";

/*
  SEO ΣΕΛΙΔΕΣ

  ΤΙ ΚΑΝΕΙ: γράφεις το περιεχόμενο που κάνει μια σελίδα άξια για index.

  ΓΙΑΤΙ ΕΧΕΙ ΣΗΜΑΣΙΑ:
  Οι σελίδες /pathiseis/[slug] και /fysiotherapeia-sto-spiti/[slug]
  υπάρχουν ήδη και δουλεύουν. Αλλά μένουν noindex μέχρι να περάσουν
  τον φραγμό:

    Πάθηση:  ≥1 ορατός θεραπευτής + intro ≥120 χαρακτήρες
    Περιοχή: ≥2 ορατοί θεραπευτές + intro ≥120 χαρακτήρες

  Ο φραγμός δεν είναι γραφειοκρατία. Σαράντα κενές σελίδες κάνουν τη
  Google να θεωρήσει ΟΛΟ το domain χαμηλής αξίας — όχι μόνο αυτές.
  Δέκα καλές σελίδες αξίζουν περισσότερο από σαράντα άδειες.
*/

const MIN_INTRO = 120;

function Card({ children, style }) {
  return <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0", overflow: "hidden", ...style }}>{children}</div>;
}

function Pill({ bg, fg, br, children, Icon }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 11px", borderRadius: 30, fontSize: 11, fontWeight: 700,
      background: bg, color: fg, border: `1px solid ${br}`,
      whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: ".04em",
    }}>
      {Icon && <Icon size={11} strokeWidth={2.5} />}
      {children}
    </span>
  );
}

function Stat({ Icon, label, value, sub, color }) {
  return (
    <Card style={{ padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Icon size={14} color={color} strokeWidth={2.2} />
        <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</span>
      </div>
      <div style={{ fontSize: 25, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 5 }}>{sub}</div>}
    </Card>
  );
}

function Btn({ children, onClick, variant = "primary", disabled, Icon, small }) {
  const s = {
    primary: { bg: "#1D4ED8", fg: "#fff", br: "#1D4ED8" },
    ghost:   { bg: "#fff", fg: "#334155", br: "#E2E8F0" },
    danger:  { bg: "#fff", fg: "#BE123C", br: "#FECACA" },
    success: { bg: "#15803D", fg: "#fff", br: "#15803D" },
  }[variant];
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        padding: small ? "6px 13px" : "9px 18px", borderRadius: 8,
        border: `1px solid ${disabled ? "#CBD5E1" : s.br}`,
        background: disabled ? "#F1F5F9" : s.bg, color: disabled ? "#94A3B8" : s.fg,
        fontSize: small ? 12 : 12.5, fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit",
        display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
      }}>
      {Icon && <Icon size={small ? 12 : 14} strokeWidth={2.2} />}
      {children}
    </button>
  );
}

const inputStyle = {
  width: "100%", padding: "10px 13px", borderRadius: 9, border: "1.5px solid #E2E8F0",
  fontSize: 14, fontFamily: "inherit", outline: "none", color: "#0F172A",
  boxSizing: "border-box", background: "#fff",
};

function Field({ label, hint, children, counter }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</label>
        {counter}
      </div>
      {children}
      {hint && <div style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 5, lineHeight: 1.55 }}>{hint}</div>}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
export default function SeoPagesPage() {
  const [tab, setTab] = useState("conditions");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [conditions, setConditions] = useState([]);
  const [areas, setAreas] = useState([]);
  const [status, setStatus] = useState({});   // slug -> should_index
  const [counts, setCounts] = useState({});   // slug -> πλήθος θεραπευτών

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(null);
  const [form, setForm] = useState(null);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    setError("");

    const [{ data: conds, error: cErr }, { data: ars }, { data: pages }] = await Promise.all([
      supabase.from("conditions")
        .select("id, slug, name_el, name_en, seo_title, seo_description, intro_el, content_el, faq_el, force_noindex, is_active")
        .eq("is_active", true).order("display_order"),
      supabase.from("service_areas")
        .select("id, slug, name_el, name_en, region, seo_title, seo_description, intro_el, content_el, faq_el, force_noindex, is_active, display_order")
        .order("name_el"),
      supabase.rpc("seo_pages"),
    ]);

    if (cErr) setError("Δεν ήταν δυνατή η ανάγνωση: " + cErr.message);

    const st = {};
    (pages || []).forEach(p => { st[`${p.kind}:${p.slug}`] = p.should_index; });

    // Πλήθος ορατών θεραπευτών ανά σελίδα — ο δεύτερος όρος του φραγμού.
    // Χωρίς αυτό, ο admin θα έγραφε κείμενα για σελίδες που δεν θα
    // γίνουν ποτέ index επειδή λείπουν θεραπευτές.
    const cnt = {};
    try {
      const { data: vis } = await supabase
        .from("v_public_therapists")
        .select("id, area, service_areas")
        .eq("is_publicly_visible", true);
      const { data: tc } = await supabase.from("therapist_conditions").select("therapist_id, condition_id");
      const { data: al } = await supabase.from("area_aliases").select("alias, area_id");

      const visIds = new Set((vis || []).map(v => v.id));
      (conds || []).forEach(c => {
        cnt[`condition:${c.slug}`] = (tc || []).filter(x => x.condition_id === c.id && visIds.has(x.therapist_id)).length;
      });

      const aliasMap = {};
      (al || []).forEach(a => { aliasMap[a.alias] = a.area_id; });
      (ars || []).forEach(a => {
        const n = (vis || []).filter(v => {
          const names = [v.area, ...(v.service_areas || [])].filter(Boolean);
          return names.some(nm => aliasMap[nm] === a.id);
        }).length;
        cnt[`area:${a.slug}`] = n;
      });
    } catch (_) {}

    setConditions(conds || []);
    setAreas(ars || []);
    setStatus(st);
    setCounts(cnt);
    setLoading(false);
  }

  const kind = tab === "conditions" ? "condition" : "area";
  const items = tab === "conditions" ? conditions : areas;
  const minTherapists = tab === "conditions" ? 1 : 2;

  function openEditor(item) {
    setOpen(item);
    setForm({
      seo_title: item.seo_title || "",
      seo_description: item.seo_description || "",
      intro_el: item.intro_el || "",
      content_el: Array.isArray(item.content_el) ? item.content_el : [],
      faq_el: Array.isArray(item.faq_el) ? item.faq_el : [],
      force_noindex: !!item.force_noindex,
    });
  }

  async function save() {
    if (!open) return;
    setBusy(true);
    const table = tab === "conditions" ? "conditions" : "service_areas";
    const { error: err } = await supabase.from(table).update({
      seo_title: form.seo_title.trim() || null,
      seo_description: form.seo_description.trim() || null,
      intro_el: form.intro_el.trim() || null,
      content_el: form.content_el.filter(s => s.title?.trim() && s.body?.trim()),
      faq_el: form.faq_el.filter(f => f.q?.trim() && f.a?.trim()),
      force_noindex: form.force_noindex,
    }).eq("id", open.id);
    setBusy(false);
    if (err) { alert("Σφάλμα: " + err.message); return; }
    setOpen(null);
    await fetchAll();
  }

  const withStatus = items.map(it => {
    const n = counts[`${kind}:${it.slug}`] ?? 0;
    const introLen = (it.intro_el || "").length;
    const indexed = status[`${kind}:${it.slug}`] === true;
    // Γιατί ΔΕΝ είναι indexable — ο admin πρέπει να ξέρει τι λείπει,
    // όχι απλώς ότι κάτι λείπει.
    const missing = [];
    if (it.force_noindex) missing.push("χειροκίνητο noindex");
    if (n < minTherapists) missing.push(`${minTherapists - n} ακόμα ${minTherapists - n === 1 ? "θεραπευτής" : "θεραπευτές"}`);
    if (introLen < MIN_INTRO) missing.push(`${MIN_INTRO - introLen} χαρακτήρες intro`);
    return { ...it, therapists: n, introLen, indexed, missing };
  });

  const filtered = withStatus.filter(it => {
    if (filter === "indexed" && !it.indexed) return false;
    if (filter === "blocked" && it.indexed) return false;
    if (filter === "ready" && (it.indexed || it.therapists < minTherapists)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (it.name_el || "").toLowerCase().includes(q) || (it.slug || "").includes(q);
    }
    return true;
  });

  const indexedCount = withStatus.filter(i => i.indexed).length;
  // «Έτοιμες»: έχουν θεραπευτές, λείπει μόνο το κείμενο. Εκεί αξίζει
  // να ξεκινήσει το γράψιμο — απόδοση με τη λιγότερη προσπάθεια.
  const readyCount = withStatus.filter(i => !i.indexed && i.therapists >= minTherapists).length;

  if (loading) {
    return <div style={{ padding: 48, textAlign: "center", color: "#64748B", fontSize: 15 }}>Φόρτωση...</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 22, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0F172A", margin: 0 }}>SEO σελίδες</h1>
          <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>
            Περιεχόμενο για τις σελίδες παθήσεων και περιοχών
          </p>
        </div>
        <Btn variant="ghost" Icon={RefreshCw} onClick={fetchAll}>Ανανέωση</Btn>
      </div>

      {error && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "13px 17px", marginBottom: 20, fontSize: 13, color: "#BE123C", display: "flex", gap: 10, alignItems: "flex-start", lineHeight: 1.6 }}>
          <AlertTriangle size={16} strokeWidth={2.2} style={{ marginTop: 1, flexShrink: 0 }} />
          <span>{error}<br />Τρέξε το <strong>migration-seo-architecture.sql</strong>.</span>
        </div>
      )}

      {/* Ο κανόνας, εξηγημένος μία φορά στην κορυφή */}
      <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 12, padding: "14px 18px", marginBottom: 20, fontSize: 12.5, color: "#1E40AF", lineHeight: 1.7 }}>
        Μια σελίδα μπαίνει στη Google μόνο όταν έχει <strong>αρκετούς θεραπευτές</strong> και
        <strong> κείμενο τουλάχιστον {MIN_INTRO} χαρακτήρων</strong>.
        Οι υπόλοιπες λειτουργούν κανονικά αλλά μένουν εκτός index — σαράντα κενές σελίδες
        βλάπτουν όλο το site, όχι μόνο τον εαυτό τους.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 22 }}>
        <Stat Icon={CheckCircle2} label="Στη Google" value={indexedCount} sub={`από ${withStatus.length}`} color="#15803D" />
        <Stat Icon={AlertTriangle} label="Έτοιμες για κείμενο" value={readyCount} sub="έχουν θεραπευτές" color="#B45309" />
        <Stat Icon={Users} label="Χωρίς θεραπευτές" value={withStatus.filter(i => i.therapists < minTherapists).length} sub="δεν αξίζει ακόμα" color="#64748B" />
        <Stat Icon={Globe} label="Σύνολο" value={withStatus.length} sub={tab === "conditions" ? "παθήσεις" : "περιοχές"} color="#1D4ED8" />
      </div>

      {readyCount > 0 && (
        <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12, padding: "14px 18px", marginBottom: 18, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <AlertTriangle size={19} color="#B45309" strokeWidth={2.2} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#92400E" }}>
              {readyCount} {readyCount === 1 ? "σελίδα περιμένει" : "σελίδες περιμένουν"} μόνο κείμενο
            </div>
            <div style={{ fontSize: 12, color: "#92400E", opacity: 0.85, marginTop: 2 }}>
              Έχουν ήδη θεραπευτές. Γράψε το intro και μπαίνουν στη Google.
            </div>
          </div>
          <Btn onClick={() => setFilter("ready")}>Δες τες</Btn>
        </div>
      )}

      <div style={{ display: "flex", gap: 4, background: "#E2E8F0", padding: 4, borderRadius: 10, width: "fit-content", marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { id: "conditions", label: `Παθήσεις (${conditions.length})`, Icon: Stethoscope },
          { id: "areas",      label: `Περιοχές (${areas.length})`,      Icon: MapPin },
        ].map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setFilter("all"); }}
            style={{
              padding: "8px 18px", borderRadius: 7, border: "none", fontSize: 13, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
              background: tab === t.id ? "#fff" : "transparent",
              color: tab === t.id ? "#0F172A" : "#64748B",
              boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              display: "inline-flex", alignItems: "center", gap: 7,
            }}>
            <t.Icon size={14} strokeWidth={2.2} />
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 4, background: "#F1F5F9", padding: 3, borderRadius: 8 }}>
          {[
            { id: "all",     label: "Όλες" },
            { id: "ready",   label: "Έτοιμες" },
            { id: "indexed", label: "Στη Google" },
            { id: "blocked", label: "Εκτός" },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              style={{
                padding: "6px 14px", borderRadius: 6, border: "none", fontSize: 12.5, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
                background: filter === f.id ? "#fff" : "transparent",
                color: filter === f.id ? "#0F172A" : "#64748B",
              }}>
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
          <Search size={15} color="#94A3B8" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Αναζήτηση..."
            style={{ ...inputStyle, paddingLeft: 38 }} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card style={{ padding: 48, textAlign: "center" }}>
          <Globe size={30} color="#CBD5E1" style={{ margin: "0 auto 12px" }} />
          <div style={{ fontSize: 15, color: "#64748B" }}>Καμία σελίδα σε αυτή την κατηγορία.</div>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {filtered.map(it => (
            <div key={it.id} onClick={() => openEditor(it)}
              style={{
                background: "#fff", borderRadius: 12, padding: "15px 18px", cursor: "pointer",
                border: `1px solid ${it.indexed ? "#BBF7D0" : "#E2E8F0"}`,
                borderLeft: `3px solid ${it.indexed ? "#15803D" : it.therapists >= minTherapists ? "#B45309" : "#CBD5E1"}`,
                display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
              }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", marginBottom: 5 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#0F172A" }}>{it.name_el}</span>
                  {it.indexed
                    ? <Pill bg="#F0FDF4" fg="#15803D" br="#BBF7D0" Icon={Eye}>Στη Google</Pill>
                    : <Pill bg="#F8FAFC" fg="#64748B" br="#E2E8F0" Icon={EyeOff}>Εκτός index</Pill>}
                  <span style={{ fontSize: 11.5, color: "#94A3B8", fontFamily: "ui-monospace, monospace" }}>/{it.slug}</span>
                </div>

                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12.5, color: "#64748B" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <Users size={12} />
                    {it.therapists} {it.therapists === 1 ? "θεραπευτής" : "θεραπευτές"}
                  </span>
                  <span>{it.introLen} χαρ. intro</span>
                  {(it.content_el || []).length > 0 && <span>{it.content_el.length} ενότητες</span>}
                  {(it.faq_el || []).length > 0 && <span>{it.faq_el.length} ερωτήσεις</span>}
                </div>

                {/* ΤΙ ΑΚΡΙΒΩΣ ΛΕΙΠΕΙ — όχι απλώς «δεν είναι έτοιμη» */}
                {!it.indexed && it.missing.length > 0 && (
                  <div style={{ fontSize: 12, color: "#B45309", marginTop: 6 }}>
                    Λείπουν: {it.missing.join(" · ")}
                  </div>
                )}
              </div>

              <a href={`${tab === "conditions" ? "/pathiseis" : "/fysiotherapeia-sto-spiti"}/${it.slug}`}
                target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                style={{ color: "#94A3B8", padding: 4, display: "flex" }}>
                <ExternalLink size={15} />
              </a>
            </div>
          ))}
        </div>
      )}

      {/* ══ EDITOR ══ */}
      {open && form && (
        <div onClick={e => { if (e.target === e.currentTarget) setOpen(null); }}
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 1000, display: "flex", justifyContent: "flex-end" }}>
          <div style={{ background: "#F8FAFC", width: "min(720px, 96vw)", height: "100%", overflowY: "auto" }}>

            <div style={{ background: "#fff", padding: "20px 26px", borderBottom: "1px solid #E2E8F0", position: "sticky", top: 0, zIndex: 5 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 19, fontWeight: 700, color: "#0F172A" }}>{open.name_el}</div>
                  <div style={{ fontSize: 12.5, color: "#94A3B8", fontFamily: "ui-monospace, monospace", marginTop: 3 }}>
                    {tab === "conditions" ? "/pathiseis" : "/fysiotherapeia-sto-spiti"}/{open.slug}
                  </div>
                </div>
                <button onClick={() => setOpen(null)}
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94A3B8", padding: 4, lineHeight: 0 }}>
                  <X size={20} />
                </button>
              </div>
            </div>

            <div style={{ padding: "22px 26px 100px" }}>
              {/* Ζωντανή πρόοδος: πόσο απέχει από το να μπει στη Google */}
              {(() => {
                const n = counts[`${kind}:${open.slug}`] ?? 0;
                const len = form.intro_el.trim().length;
                const okT = n >= minTherapists;
                const okI = len >= MIN_INTRO;
                const ready = okT && okI && !form.force_noindex;
                return (
                  <div style={{
                    background: ready ? "#F0FDF4" : "#FFFBEB",
                    border: `1px solid ${ready ? "#BBF7D0" : "#FDE68A"}`,
                    borderRadius: 12, padding: "13px 17px", marginBottom: 22,
                    fontSize: 12.5, color: ready ? "#166534" : "#92400E", lineHeight: 1.7,
                  }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>
                      {ready ? "Έτοιμη για τη Google" : "Δεν μπαίνει ακόμα στη Google"}
                    </div>
                    <div>{okT ? "✓" : "✗"} {n} από {minTherapists} απαιτούμενους θεραπευτές</div>
                    <div>{okI ? "✓" : "✗"} {len} από {MIN_INTRO} χαρακτήρες intro</div>
                    {form.force_noindex && <div>✗ Χειροκίνητο noindex ενεργό</div>}
                  </div>
                );
              })()}

              <Field label="Τίτλος Google" hint="Αν μείνει κενό, παράγεται αυτόματα. Ιδανικά 50-60 χαρακτήρες."
                counter={<span style={{ fontSize: 11.5, color: form.seo_title.length > 60 ? "#BE123C" : "#94A3B8" }}>{form.seo_title.length}/60</span>}>
                <input value={form.seo_title} onChange={e => setForm(f => ({ ...f, seo_title: e.target.value }))}
                  placeholder={tab === "conditions" ? `Φυσικοθεραπεία στο σπίτι για ${open.name_el}` : `Φυσικοθεραπεία στο σπίτι ${open.name_el}`}
                  style={inputStyle} />
              </Field>

              <Field label="Περιγραφή Google" hint="Εμφανίζεται κάτω από τον τίτλο στα αποτελέσματα. Ιδανικά 140-155 χαρακτήρες."
                counter={<span style={{ fontSize: 11.5, color: form.seo_description.length > 155 ? "#BE123C" : "#94A3B8" }}>{form.seo_description.length}/155</span>}>
                <textarea value={form.seo_description} onChange={e => setForm(f => ({ ...f, seo_description: e.target.value }))}
                  rows={2} style={{ ...inputStyle, resize: "vertical" }} />
              </Field>

              <Field
                label="Εισαγωγή"
                hint="Το κείμενο κάτω από τον τίτλο της σελίδας. Απλή γλώσσα, χωρίς υποσχέσεις θεραπείας."
                counter={<span style={{ fontSize: 11.5, fontWeight: 600, color: form.intro_el.trim().length >= MIN_INTRO ? "#15803D" : "#B45309" }}>
                  {form.intro_el.trim().length}/{MIN_INTRO}
                </span>}>
                <textarea value={form.intro_el} onChange={e => setForm(f => ({ ...f, intro_el: e.target.value }))}
                  rows={4} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.65 }} />
              </Field>

              {/* ── ΕΝΟΤΗΤΕΣ ── */}
              <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: 20, marginTop: 24 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>Ενότητες περιεχομένου</span>
                  <Btn small variant="ghost" Icon={Plus}
                    onClick={() => setForm(f => ({ ...f, content_el: [...f.content_el, { title: "", body: "" }] }))}>
                    Προσθήκη
                  </Btn>
                </div>

                {form.content_el.length === 0 ? (
                  <div style={{ fontSize: 12.5, color: "#94A3B8", fontStyle: "italic", marginBottom: 14 }}>
                    {tab === "conditions"
                      ? "π.χ. «Πότε μπορεί να βοηθήσει η φυσικοθεραπεία», «Τι μπορεί να περιλαμβάνει η αποκατάσταση»"
                      : "π.χ. «Πώς λειτουργεί η κατ' οίκον φυσικοθεραπεία στην περιοχή»"}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 14 }}>
                    {form.content_el.map((sec, i) => (
                      <Card key={i} style={{ padding: 16 }}>
                        <div style={{ display: "flex", gap: 9, marginBottom: 10 }}>
                          <input value={sec.title}
                            onChange={e => setForm(f => {
                              const c = [...f.content_el]; c[i] = { ...c[i], title: e.target.value }; return { ...f, content_el: c };
                            })}
                            placeholder="Τίτλος ενότητας" style={{ ...inputStyle, fontWeight: 600 }} />
                          <button onClick={() => setForm(f => ({ ...f, content_el: f.content_el.filter((_, j) => j !== i) }))}
                            style={{ background: "transparent", border: "none", color: "#BE123C", cursor: "pointer", padding: 6, display: "flex", flexShrink: 0 }}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                        <textarea value={sec.body}
                          onChange={e => setForm(f => {
                            const c = [...f.content_el]; c[i] = { ...c[i], body: e.target.value }; return { ...f, content_el: c };
                          })}
                          rows={4} placeholder="Κείμενο..." style={{ ...inputStyle, resize: "vertical", lineHeight: 1.65 }} />
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* ── FAQ ── */}
              <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: 20, marginTop: 8 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>Συχνές ερωτήσεις</span>
                  <Btn small variant="ghost" Icon={Plus}
                    onClick={() => setForm(f => ({ ...f, faq_el: [...f.faq_el, { q: "", a: "" }] }))}>
                    Προσθήκη
                  </Btn>
                </div>
                <div style={{ fontSize: 11.5, color: "#94A3B8", marginBottom: 14, lineHeight: 1.55 }}>
                  Εμφανίζονται και ως FAQ schema — η Google μπορεί να τις δείξει απευθείας
                  στα αποτελέσματα.
                </div>

                {form.faq_el.map((f2, i) => (
                  <Card key={i} style={{ padding: 16, marginBottom: 12 }}>
                    <div style={{ display: "flex", gap: 9, marginBottom: 10 }}>
                      <input value={f2.q}
                        onChange={e => setForm(f => {
                          const q = [...f.faq_el]; q[i] = { ...q[i], q: e.target.value }; return { ...f, faq_el: q };
                        })}
                        placeholder="Ερώτηση" style={{ ...inputStyle, fontWeight: 600 }} />
                      <button onClick={() => setForm(f => ({ ...f, faq_el: f.faq_el.filter((_, j) => j !== i) }))}
                        style={{ background: "transparent", border: "none", color: "#BE123C", cursor: "pointer", padding: 6, display: "flex", flexShrink: 0 }}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <textarea value={f2.a}
                      onChange={e => setForm(f => {
                        const q = [...f.faq_el]; q[i] = { ...q[i], a: e.target.value }; return { ...f, faq_el: q };
                      })}
                      rows={3} placeholder="Απάντηση" style={{ ...inputStyle, resize: "vertical", lineHeight: 1.65 }} />
                  </Card>
                ))}
              </div>

              <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: 20, marginTop: 8 }}>
                <label style={{ display: "flex", alignItems: "flex-start", gap: 11, cursor: "pointer" }}>
                  <input type="checkbox" checked={form.force_noindex}
                    onChange={e => setForm(f => ({ ...f, force_noindex: e.target.checked }))}
                    style={{ marginTop: 3, accentColor: "#BE123C" }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>Κράτησέ τη εκτός Google</div>
                    <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2, lineHeight: 1.55 }}>
                      Η σελίδα συνεχίζει να λειτουργεί, αλλά δεν εμφανίζεται στα αποτελέσματα.
                      Χρήσιμο όσο γράφεις το κείμενο.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div style={{ position: "sticky", bottom: 0, background: "#fff", borderTop: "1px solid #E2E8F0", padding: "14px 26px", display: "flex", gap: 9, justifyContent: "flex-end" }}>
              <Btn variant="ghost" onClick={() => setOpen(null)}>Άκυρο</Btn>
              <Btn Icon={Save} onClick={save} disabled={busy}>
                {busy ? "Αποθήκευση..." : "Αποθήκευση"}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}