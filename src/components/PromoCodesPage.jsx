"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  Tag, Plus, Pencil, Trash2, Check, X, Save, Search, RefreshCw,
  AlertTriangle, Users, Ban, CheckCircle2,
} from "lucide-react";

/*
  ΚΩΔΙΚΟΙ ΠΡΟΣΦΟΡΑΣ

  Η έκπτωση έχει ΔΥΟ ανεξάρτητα σκέλη:
    · μηνιαία συνδρομή
    · τέλος νέου ασθενή
  Ένας κωδικός μπορεί να αγγίζει το ένα, το άλλο ή και τα δύο.

  ΚΡΙΣΙΜΟ: αλλαγή ή απενεργοποίηση κωδικού ΔΕΝ αγγίζει όσους τον έχουν
  ήδη χρησιμοποιήσει. Οι όροι τους έχουν παγώσει στο promo_snapshot της
  συνδρομής τους. Επηρεάζονται μόνο ΝΕΕΣ χρήσεις.
*/

const num = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v));
const eur = (v) => `${num(v).toFixed(num(v) % 1 === 0 ? 0 : 2)}€`;

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("el-GR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function toInputDate(d) {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

// Περιγράφει με λόγια τι κάνει ο κωδικός
function describe(c) {
  const parts = [];
  if (c.subscription_discount_type && num(c.subscription_discount_value) > 0) {
    parts.push(
      c.subscription_discount_type === "percent"
        ? `−${num(c.subscription_discount_value)}% συνδρομή`
        : `−${eur(c.subscription_discount_value)} συνδρομή`
    );
  }
  if (c.fee_discount_type && num(c.fee_discount_value) > 0) {
    parts.push(
      c.fee_discount_type === "percent"
        ? `−${num(c.fee_discount_value)}% τέλος νέου ασθενή`
        : `−${eur(c.fee_discount_value)} τέλος νέου ασθενή`
    );
  }
  if (parts.length === 0) return "Χωρίς έκπτωση";
  const dur = c.duration_months ? ` · ${c.duration_months} μήνες` : " · για πάντα";
  return parts.join(" + ") + dur;
}

function statusOf(c) {
  const now = new Date();
  if (!c.is_active) return { label: "Ανενεργός", bg: "#F8FAFC", fg: "#64748B", br: "#E2E8F0" };
  if (c.starts_at && new Date(c.starts_at) > now) return { label: "Προγραμματισμένος", bg: "#EFF6FF", fg: "#1D4ED8", br: "#BFDBFE" };
  if (c.ends_at && new Date(c.ends_at) < now) return { label: "Έληξε", bg: "#FEF2F2", fg: "#BE123C", br: "#FECACA" };
  if (c.max_uses !== null && num(c.uses_count) >= num(c.max_uses)) return { label: "Εξαντλήθηκε", bg: "#FFFBEB", fg: "#B45309", br: "#FDE68A" };
  return { label: "Ενεργός", bg: "#F0FDF4", fg: "#15803D", br: "#BBF7D0" };
}

// ─── UI ─────────────────────────────────────────────────────────────────
function Pill({ meta, children }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 11px", borderRadius: 30, fontSize: 11, fontWeight: 700,
      background: meta.bg, color: meta.fg, border: `1px solid ${meta.br}`, whiteSpace: "nowrap",
    }}>
      {children || meta.label}
    </span>
  );
}

function Card({ children, style }) {
  return <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0", overflow: "hidden", ...style }}>{children}</div>;
}

function Stat({ Icon, label, value, sub, color = "#1D4ED8" }) {
  return (
    <Card style={{ padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Icon size={14} color={color} strokeWidth={2.2} />
        <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: "#0F172A", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 5 }}>{sub}</div>}
    </Card>
  );
}

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 5 }}>{hint}</div>}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "10px 13px", borderRadius: 8, border: "1px solid #E2E8F0",
  fontSize: 14, fontFamily: "inherit", outline: "none", color: "#0F172A", boxSizing: "border-box", background: "#fff",
};

function Input({ value, onChange, type = "text", placeholder, min, max, step, style }) {
  return (
    <input type={type} value={value ?? ""} onChange={onChange} placeholder={placeholder}
      min={min} max={max} step={step} style={{ ...inputStyle, ...style }} />
  );
}

function Toggle({ checked, onChange, label, hint }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14, cursor: "pointer" }} onClick={onChange}>
      <div style={{ position: "relative", width: 42, height: 23, flexShrink: 0, marginTop: 1 }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 12, background: checked ? "#1D4ED8" : "#CBD5E1", transition: "background .2s" }} />
        <div style={{ position: "absolute", top: 2, left: checked ? 21 : 2, width: 19, height: 19, borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
      </div>
      <div>
        <div style={{ fontSize: 14, color: "#334155", fontWeight: 500 }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{hint}</div>}
      </div>
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", disabled, Icon, small }) {
  const s = {
    primary: { bg: "#1D4ED8", fg: "#fff", br: "#1D4ED8" },
    ghost:   { bg: "#fff", fg: "#334155", br: "#E2E8F0" },
    danger:  { bg: "#fff", fg: "#BE123C", br: "#FECACA" },
  }[variant];
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        padding: small ? "6px 13px" : "9px 20px", borderRadius: 8,
        border: `1px solid ${disabled ? "#CBD5E1" : s.br}`,
        background: disabled ? "#F1F5F9" : s.bg, color: disabled ? "#94A3B8" : s.fg,
        fontSize: small ? 12 : 13, fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit",
        display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
      }}>
      {Icon && <Icon size={small ? 12 : 14} strokeWidth={2.2} />}
      {children}
    </button>
  );
}

function Modal({ title, onClose, children, footer, width = 640 }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: width, maxHeight: "88vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0F172A" }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", padding: 4, display: "flex" }}><X size={18} /></button>
        </div>
        <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>{children}</div>
        {footer && (
          <div style={{ padding: "14px 24px", borderTop: "1px solid #F1F5F9", display: "flex", gap: 10, justifyContent: "flex-end", background: "#F8FAFC" }}>{footer}</div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
export default function PromoCodesPage() {
  const [tab, setTab] = useState("codes");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [codes, setCodes] = useState([]);
  const [plans, setPlans] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [therapists, setTherapists] = useState([]);

  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    setError("");

    const [{ data: c, error: cErr }, { data: p }, { data: r }, { data: t }] = await Promise.all([
      supabase.from("promo_codes").select("*").order("created_at", { ascending: false }),
      supabase.from("subscription_plans").select("id, code, name_el, price_monthly, first_session_fee").order("display_order"),
      supabase.from("promo_redemptions").select("*").order("redeemed_at", { ascending: false }),
      supabase.from("therapist_profiles").select("id, name"),
    ]);

    // Αν λείπει η policy, το query γυρίζει άδειο χωρίς σφάλμα.
    // Καλύτερα να το πούμε ρητά παρά να δείχνουμε άδεια λίστα.
    if (cErr) setError("Δεν ήταν δυνατή η ανάγνωση των κωδικών: " + cErr.message);

    setCodes(c || []);
    setPlans(p || []);
    setRedemptions(r || []);
    setTherapists(t || []);
    setLoading(false);
  }

  const therapistName = (id) => therapists.find((t) => t.id === id)?.name || "Άγνωστος";
  const planName = (id) => plans.find((p) => p.id === id)?.name_el || "—";

  async function save(form) {
    setBusy(true);

    const payload = {
      code: (form.code || "").trim().toUpperCase(),
      label: form.label?.trim() || null,
      description_el: form.description_el?.trim() || null,
      description_en: form.description_en?.trim() || null,
      is_active: !!form.is_active,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      ends_at: form.ends_at ? new Date(form.ends_at + "T23:59:59").toISOString() : null,
      max_uses: form.max_uses === "" ? null : parseInt(form.max_uses, 10),
      max_uses_per_therapist: parseInt(form.max_uses_per_therapist, 10) || 1,
      plan_ids: form.plan_ids || [],
      new_therapists_only: !!form.new_therapists_only,
      subscription_discount_type: form.subscription_discount_type || null,
      subscription_discount_value: num(form.subscription_discount_value),
      fee_discount_type: form.fee_discount_type || null,
      fee_discount_value: num(form.fee_discount_value),
      duration_months: form.duration_months === "" ? null : parseInt(form.duration_months, 10),
      updated_at: new Date().toISOString(),
    };

    if (!payload.code) { alert("Ο κωδικός είναι υποχρεωτικός."); setBusy(false); return; }

    const { error: err } = form.id
      ? await supabase.from("promo_codes").update(payload).eq("id", form.id)
      : await supabase.from("promo_codes").insert([payload]);

    if (err) {
      alert(err.message.includes("duplicate") || err.message.includes("unique")
        ? "Υπάρχει ήδη κωδικός με αυτό το όνομα."
        : "Σφάλμα: " + err.message);
      setBusy(false);
      return;
    }

    setModal(null);
    await fetchAll();
    setBusy(false);
  }

  async function toggleActive(c) {
    setBusy(true);
    await supabase.from("promo_codes").update({ is_active: !c.is_active, updated_at: new Date().toISOString() }).eq("id", c.id);
    await fetchAll();
    setBusy(false);
  }

  async function remove(id) {
    const used = redemptions.filter((r) => r.promo_code_id === id).length;
    const msg = used > 0
      ? `Ο κωδικός έχει χρησιμοποιηθεί ${used} φορές.\n\nΗ διαγραφή θα σβήσει και το ιστορικό χρήσεων.\nΟι θεραπευτές ΚΡΑΤΟΥΝ τους όρους τους — είναι παγωμένοι στη συνδρομή τους.\n\nΠροτιμότερο: απενεργοποίησέ τον αντί να τον σβήσεις.\n\nΣίγουρα διαγραφή;`
      : "Διαγραφή κωδικού;";
    if (!confirm(msg)) return;
    setBusy(true);
    const { error: err } = await supabase.from("promo_codes").delete().eq("id", id);
    if (err) alert("Σφάλμα: " + err.message);
    setModal(null);
    await fetchAll();
    setBusy(false);
  }

  const filtered = codes.filter((c) =>
    !search.trim() ||
    (c.code || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.label || "").toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = codes.filter((c) => statusOf(c).label === "Ενεργός").length;
  const totalUses = redemptions.length;

  if (loading) {
    return <div style={{ padding: 48, textAlign: "center", color: "#64748B", fontSize: 15 }}>Φόρτωση κωδικών...</div>;
  }

  const TABS = [
    { id: "codes", label: "Κωδικοί", Icon: Tag },
    { id: "uses", label: `Χρήσεις (${totalUses})`, Icon: Users },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 22, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0F172A", margin: 0 }}>Κωδικοί Προσφοράς</h1>
          <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>
            Εκπτώσεις σε συνδρομή και τέλος νέου ασθενή
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn onClick={fetchAll} variant="ghost" Icon={RefreshCw} disabled={busy}>Ανανέωση</Btn>
          <Btn onClick={() => setModal({ is_active: true, max_uses_per_therapist: 1, new_therapists_only: true, plan_ids: [] })} Icon={Plus}>
            Νέος κωδικός
          </Btn>
        </div>
      </div>

      {error && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "13px 17px", marginBottom: 20, fontSize: 13, color: "#BE123C", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <AlertTriangle size={16} strokeWidth={2.2} style={{ marginTop: 1, flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 24 }}>
        <Stat Icon={Tag} label="Σύνολο" value={codes.length} sub="κωδικοί" />
        <Stat Icon={CheckCircle2} label="Ενεργοί" value={activeCount} sub="διαθέσιμοι τώρα" color="#15803D" />
        <Stat Icon={Users} label="Χρήσεις" value={totalUses} sub="συνολικά" color="#6D28D9" />
      </div>

      {/* Η αρχή που δεν πρέπει να ξεχαστεί ποτέ */}
      <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 12, padding: "13px 17px", marginBottom: 20, fontSize: 12.5, color: "#1E40AF", lineHeight: 1.65 }}>
        Αλλαγή ή απενεργοποίηση κωδικού επηρεάζει <strong>μόνο νέες χρήσεις</strong>. Όποιος τον έχει ήδη
        ενεργοποιήσει κρατάει τους όρους που πήρε — είναι παγωμένοι στη συνδρομή του.
      </div>

      <div style={{ display: "flex", gap: 4, background: "#E2E8F0", padding: 4, borderRadius: 10, width: "fit-content", marginBottom: 20 }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
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

      {/* ══ ΚΩΔΙΚΟΙ ══ */}
      {tab === "codes" && (
        <>
          <div style={{ position: "relative", marginBottom: 16, maxWidth: 340 }}>
            <Search size={15} color="#94A3B8" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Αναζήτηση κωδικού..."
              style={{ ...inputStyle, paddingLeft: 36 }} />
          </div>

          {filtered.length === 0 ? (
            <Card style={{ padding: 48, textAlign: "center" }}>
              <Tag size={30} color="#CBD5E1" style={{ margin: "0 auto 12px" }} />
              <div style={{ fontSize: 15, color: "#64748B" }}>Δεν υπάρχουν κωδικοί.</div>
            </Card>
          ) : (
            <Card>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 940 }}>
                  <thead>
                    <tr style={{ background: "#F8FAFC" }}>
                      {["Κωδικός", "Έκπτωση", "Πακέτα", "Χρήσεις", "Ισχύς", "Κατάσταση", ""].map((h, i) => (
                        <th key={i} style={{
                          padding: "11px 14px", textAlign: i === 3 ? "right" : "left",
                          fontSize: 11, fontWeight: 700, color: "#64748B",
                          textTransform: "uppercase", letterSpacing: "0.05em",
                          borderBottom: "1px solid #E2E8F0", whiteSpace: "nowrap",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c) => {
                      const meta = statusOf(c);
                      const uses = redemptions.filter((r) => r.promo_code_id === c.id).length;
                      const scope = (c.plan_ids || []).length === 0
                        ? "Όλα"
                        : (c.plan_ids || []).map(planName).join(", ");
                      return (
                        <tr key={c.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                          <td style={{ padding: "12px 14px" }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", fontFamily: "ui-monospace, monospace", letterSpacing: ".03em" }}>
                              {c.code}
                            </div>
                            {c.label && <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>{c.label}</div>}
                          </td>
                          <td style={{ padding: "12px 14px", fontSize: 12.5, color: "#334155" }}>{describe(c)}</td>
                          <td style={{ padding: "12px 14px", fontSize: 12.5, color: "#64748B" }}>{scope}</td>
                          <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, fontWeight: 600, color: "#0F172A" }}>
                            {uses}{c.max_uses !== null ? ` / ${c.max_uses}` : ""}
                          </td>
                          <td style={{ padding: "12px 14px", fontSize: 12, color: "#64748B", whiteSpace: "nowrap" }}>
                            {c.starts_at || c.ends_at
                              ? `${fmtDate(c.starts_at)} — ${fmtDate(c.ends_at)}`
                              : "Χωρίς όριο"}
                          </td>
                          <td style={{ padding: "12px 14px" }}><Pill meta={meta} /></td>
                          <td style={{ padding: "12px 14px", textAlign: "right" }}>
                            <div style={{ display: "flex", gap: 7, justifyContent: "flex-end" }}>
                              <Btn small variant="ghost" Icon={c.is_active ? Ban : Check} onClick={() => toggleActive(c)} disabled={busy}>
                                {c.is_active ? "Απενεργ." : "Ενεργ."}
                              </Btn>
                              <Btn small variant="ghost" Icon={Pencil} onClick={() => setModal({
                                ...c,
                                starts_at: toInputDate(c.starts_at),
                                ends_at: toInputDate(c.ends_at),
                                max_uses: c.max_uses ?? "",
                                duration_months: c.duration_months ?? "",
                              })}>
                                Επεξ.
                              </Btn>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* ══ ΧΡΗΣΕΙΣ ══ */}
      {tab === "uses" && (
        redemptions.length === 0 ? (
          <Card style={{ padding: 48, textAlign: "center" }}>
            <Users size={30} color="#CBD5E1" style={{ margin: "0 auto 12px" }} />
            <div style={{ fontSize: 15, color: "#64748B" }}>Κανείς δεν έχει χρησιμοποιήσει κωδικό ακόμα.</div>
          </Card>
        ) : (
          <Card>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
                <thead>
                  <tr style={{ background: "#F8FAFC" }}>
                    {["Θεραπευτής", "Κωδικός", "Τι πήρε", "Ημερομηνία"].map((h, i) => (
                      <th key={i} style={{
                        padding: "11px 14px", textAlign: "left", fontSize: 11, fontWeight: 700,
                        color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em",
                        borderBottom: "1px solid #E2E8F0", whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {redemptions.map((r) => {
                    const s = r.snapshot || {};
                    return (
                      <tr key={r.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                        <td style={{ padding: "12px 14px", fontSize: 14, fontWeight: 600, color: "#0F172A" }}>
                          {therapistName(r.therapist_id)}
                        </td>
                        <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, color: "#6D28D9", fontFamily: "ui-monospace, monospace" }}>
                          {r.code_text}
                        </td>
                        <td style={{ padding: "12px 14px", fontSize: 12.5, color: "#334155" }}>
                          {/* Οι όροι που ΠΑΓΩΣΑΝ, όχι οι σημερινοί του κωδικού */}
                          Συνδρομή {eur(s.final_price)} <span style={{ color: "#94A3B8" }}>(από {eur(s.base_price)})</span>
                          {" · "}
                          Τέλος {eur(s.final_fee)} <span style={{ color: "#94A3B8" }}>(από {eur(s.base_fee)})</span>
                          {s.duration_months ? ` · ${s.duration_months} μήνες` : ""}
                        </td>
                        <td style={{ padding: "12px 14px", fontSize: 12.5, color: "#64748B", whiteSpace: "nowrap" }}>
                          {fmtDate(r.redeemed_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )
      )}

      {modal && (
        <CodeModal
          initial={modal}
          plans={plans}
          busy={busy}
          onClose={() => setModal(null)}
          onSave={save}
          onDelete={modal.id ? () => remove(modal.id) : null}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
function CodeModal({ initial, plans, onClose, onSave, onDelete, busy }) {
  const [f, setF] = useState({
    code: "", label: "", description_el: "", description_en: "",
    is_active: true, starts_at: "", ends_at: "",
    max_uses: "", max_uses_per_therapist: 1, plan_ids: [], new_therapists_only: true,
    subscription_discount_type: "", subscription_discount_value: 0,
    fee_discount_type: "", fee_discount_value: 0,
    duration_months: "",
    ...initial,
  });
  const upd = (k, v) => setF((p) => ({ ...p, [k]: v }));

  function togglePlan(id) {
    const cur = f.plan_ids || [];
    upd("plan_ids", cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  }

  // Ζωντανή προεπισκόπηση πάνω στο πρώτο πακέτο — ο admin πρέπει να
  // βλέπει τι θα δει ο θεραπευτής, όχι να το υπολογίζει με το μυαλό.
  const sample = plans.find((p) => (f.plan_ids || []).length === 0 || f.plan_ids.includes(p.id)) || plans[0];
  function calc(base, type, val) {
    if (!type || num(val) === 0) return num(base);
    if (type === "percent") return Math.max(0, num(base) * (1 - Math.min(num(val), 100) / 100));
    return Math.max(0, num(base) - num(val));
  }

  return (
    <Modal
      title={initial.id ? "Επεξεργασία κωδικού" : "Νέος κωδικός"}
      onClose={onClose}
      footer={
        <>
          {onDelete && <Btn variant="danger" Icon={Trash2} onClick={onDelete} disabled={busy}>Διαγραφή</Btn>}
          <div style={{ flex: 1 }} />
          <Btn variant="ghost" onClick={onClose}>Άκυρο</Btn>
          <Btn Icon={Save} onClick={() => onSave(f)} disabled={busy}>{busy ? "Αποθήκευση..." : "Αποθήκευση"}</Btn>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label="Κωδικός" hint="Κεφαλαία, χωρίς κενά">
          <Input value={f.code} onChange={(e) => upd("code", e.target.value.toUpperCase().replace(/\s/g, ""))}
            placeholder="FOUNDERS100" style={{ fontFamily: "ui-monospace, monospace", letterSpacing: ".05em" }} />
        </Field>
        <Field label="Ονομασία" hint="Μόνο για εσένα, δεν φαίνεται">
          <Input value={f.label} onChange={(e) => upd("label", e.target.value)} placeholder="Ιδρυτικά μέλη" />
        </Field>
      </div>

      <Field label="Περιγραφή (EL)" hint="Εμφανίζεται στον θεραπευτή όταν εφαρμοστεί ο κωδικός">
        <Input value={f.description_el} onChange={(e) => upd("description_el", e.target.value)}
          placeholder="Δωρεάν συνδρομή για 12 μήνες" />
      </Field>

      <div style={{ height: 1, background: "#F1F5F9", margin: "6px 0 20px" }} />

      {/* ── ΕΚΠΤΩΣΗ ΣΥΝΔΡΟΜΗΣ ── */}
      <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 12 }}>Έκπτωση στη μηνιαία συνδρομή</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label="Τύπος">
          <select value={f.subscription_discount_type || ""} onChange={(e) => upd("subscription_discount_type", e.target.value)} style={inputStyle}>
            <option value="">Καμία</option>
            <option value="percent">Ποσοστό (%)</option>
            <option value="fixed">Σταθερό ποσό (€)</option>
          </select>
        </Field>
        <Field label={f.subscription_discount_type === "percent" ? "Ποσοστό" : "Ποσό"}>
          <Input type="number" min={0} step="0.01" value={f.subscription_discount_value}
            onChange={(e) => upd("subscription_discount_value", e.target.value)} />
        </Field>
      </div>

      {/* ── ΕΚΠΤΩΣΗ ΤΕΛΟΥΣ ── */}
      <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 12 }}>Έκπτωση στο τέλος νέου ασθενή</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label="Τύπος">
          <select value={f.fee_discount_type || ""} onChange={(e) => upd("fee_discount_type", e.target.value)} style={inputStyle}>
            <option value="">Καμία</option>
            <option value="percent">Ποσοστό (%)</option>
            <option value="fixed">Σταθερό ποσό (€)</option>
          </select>
        </Field>
        <Field label={f.fee_discount_type === "percent" ? "Ποσοστό" : "Ποσό"}>
          <Input type="number" min={0} step="0.01" value={f.fee_discount_value}
            onChange={(e) => upd("fee_discount_value", e.target.value)} />
        </Field>
      </div>

      <Field label="Διάρκεια (μήνες)" hint="Κενό = ισχύει για όσο διαρκεί η συνδρομή">
        <div style={{ maxWidth: 160 }}>
          <Input type="number" min={1} max={60} value={f.duration_months} onChange={(e) => upd("duration_months", e.target.value)} placeholder="12" />
        </div>
      </Field>

      {/* Προεπισκόπηση */}
      {sample && (
        <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, padding: "13px 17px", marginBottom: 20, fontSize: 12.5, color: "#166534", lineHeight: 1.7 }}>
          <strong>Προεπισκόπηση στο «{sample.name_el}»:</strong><br />
          Συνδρομή {eur(sample.price_monthly)} → <strong>{eur(calc(sample.price_monthly, f.subscription_discount_type, f.subscription_discount_value))}</strong>
          {" · "}
          Τέλος νέου ασθενή {eur(sample.first_session_fee)} → <strong>{eur(calc(sample.first_session_fee, f.fee_discount_type, f.fee_discount_value))}</strong>
          {f.duration_months ? ` · για ${f.duration_months} μήνες` : " · χωρίς λήξη"}
        </div>
      )}

      <div style={{ height: 1, background: "#F1F5F9", margin: "6px 0 20px" }} />

      {/* ── ΠΕΡΙΟΡΙΣΜΟΙ ── */}
      <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 12 }}>Περιορισμοί</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label="Έναρξη" hint="Κενό = ισχύει αμέσως">
          <Input type="date" value={f.starts_at} onChange={(e) => upd("starts_at", e.target.value)} />
        </Field>
        <Field label="Λήξη" hint="Κενό = χωρίς λήξη">
          <Input type="date" value={f.ends_at} onChange={(e) => upd("ends_at", e.target.value)} />
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label="Μέγιστες χρήσεις" hint="Κενό = απεριόριστες">
          <Input type="number" min={1} value={f.max_uses} onChange={(e) => upd("max_uses", e.target.value)} placeholder="50" />
        </Field>
        <Field label="Χρήσεις ανά θεραπευτή">
          <Input type="number" min={1} max={10} value={f.max_uses_per_therapist} onChange={(e) => upd("max_uses_per_therapist", e.target.value)} />
        </Field>
      </div>

      <Field label="Ισχύει στα πακέτα" hint="Καμία επιλογή = ισχύει σε όλα">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {plans.map((p) => {
            const on = (f.plan_ids || []).includes(p.id);
            return (
              <button key={p.id} type="button" onClick={() => togglePlan(p.id)}
                style={{
                  padding: "7px 14px", borderRadius: 30, fontSize: 12.5, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit",
                  border: `1.5px solid ${on ? "#1D4ED8" : "#E2E8F0"}`,
                  background: on ? "#EFF6FF" : "#fff", color: on ? "#1D4ED8" : "#64748B",
                  display: "inline-flex", alignItems: "center", gap: 5,
                }}>
                {on && <Check size={12} strokeWidth={3} />}
                {p.name_el}
              </button>
            );
          })}
        </div>
      </Field>

      <Toggle checked={f.new_therapists_only} onChange={() => upd("new_therapists_only", !f.new_therapists_only)}
        label="Μόνο για νέους θεραπευτές" hint="Δεν μπορεί να τον χρησιμοποιήσει κάποιος με ήδη ενεργή συνδρομή" />
      <Toggle checked={f.is_active} onChange={() => upd("is_active", !f.is_active)}
        label="Ενεργός" hint="Μόνο οι ενεργοί μπορούν να εφαρμοστούν" />
    </Modal>
  );
}