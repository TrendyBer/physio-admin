"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  CreditCard, Users, FileText, Plus, Pencil, Check, X, Star, Ban,
  AlertTriangle, RefreshCw, Search, ShieldOff, Wallet,
  TrendingUp, CheckCircle2, Save, Trash2, Tag, Lock, Archive,
} from "lucide-react";

// ─── HELPERS ────────────────────────────────────────────────────────────
const num = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v));
const eur = (v) => `${num(v).toFixed(num(v) % 1 === 0 ? 0 : 2)}€`;

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("el-GR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function monthLabel(d) {
  return new Date(d).toLocaleDateString("el-GR", { month: "long", year: "numeric" });
}

function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

const STATUS_META = {
  trialing:  { label: "Δοκιμή",        bg: "#EFF6FF", fg: "#1D4ED8", br: "#BFDBFE" },
  active:    { label: "Ενεργή",        bg: "#F0FDF4", fg: "#15803D", br: "#BBF7D0" },
  past_due:  { label: "Ληξιπρόθεσμη",  bg: "#FFFBEB", fg: "#B45309", br: "#FDE68A" },
  expired:   { label: "Έληξε",         bg: "#FEF2F2", fg: "#BE123C", br: "#FECACA" },
  canceled:  { label: "Ακυρωμένη",     bg: "#F8FAFC", fg: "#64748B", br: "#E2E8F0" },
  exempt:    { label: "Εξαιρείται",    bg: "#F5F3FF", fg: "#6D28D9", br: "#DDD6FE" },
  none:      { label: "Χωρίς πακέτο",  bg: "#F8FAFC", fg: "#94A3B8", br: "#E2E8F0" },
};

const INVOICE_META = {
  open:    { label: "Ανοιχτό",   bg: "#EFF6FF", fg: "#1D4ED8", br: "#BFDBFE" },
  paid:    { label: "Πληρωμένο", bg: "#F0FDF4", fg: "#15803D", br: "#BBF7D0" },
  overdue: { label: "Εκπρόθεσμο", bg: "#FEF2F2", fg: "#BE123C", br: "#FECACA" },
  waived:  { label: "Διαγραφή",  bg: "#F5F3FF", fg: "#6D28D9", br: "#DDD6FE" },
  void:    { label: "Άκυρο",     bg: "#F8FAFC", fg: "#94A3B8", br: "#E2E8F0" },
};

// ─── UI PRIMITIVES ──────────────────────────────────────────────────────
function Pill({ meta, children }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 11px", borderRadius: 30, fontSize: 11, fontWeight: 700,
      background: meta.bg, color: meta.fg, border: `1px solid ${meta.br}`,
      whiteSpace: "nowrap",
    }}>
      {children || meta.label}
    </span>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0",
      overflow: "hidden", ...style,
    }}>
      {children}
    </div>
  );
}

function Stat({ Icon, label, value, sub, color = "#1D4ED8" }) {
  return (
    <Card style={{ padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Icon size={14} color={color} strokeWidth={2.2} />
        <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: "#0F172A", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 5 }}>{sub}</div>}
    </Card>
  );
}

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
        {label}
      </label>
      {children}
      {hint && <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 5 }}>{hint}</div>}
    </div>
  );
}

function Input({ value, onChange, type = "text", placeholder, min, max, step }) {
  return (
    <input
      type={type} value={value ?? ""} onChange={onChange} placeholder={placeholder}
      min={min} max={max} step={step}
      style={{
        width: "100%", padding: "10px 13px", borderRadius: 8, border: "1px solid #E2E8F0",
        fontSize: 14, fontFamily: "inherit", outline: "none", color: "#0F172A", boxSizing: "border-box",
      }}
      onFocus={(e) => (e.target.style.borderColor = "#1D4ED8")}
      onBlur={(e) => (e.target.style.borderColor = "#E2E8F0")}
    />
  );
}

function TextArea({ value, onChange, rows = 3, placeholder }) {
  return (
    <textarea
      value={value ?? ""} onChange={onChange} rows={rows} placeholder={placeholder}
      style={{
        width: "100%", padding: "10px 13px", borderRadius: 8, border: "1px solid #E2E8F0",
        fontSize: 14, fontFamily: "inherit", outline: "none", color: "#0F172A",
        boxSizing: "border-box", resize: "vertical", lineHeight: 1.6,
      }}
      onFocus={(e) => (e.target.style.borderColor = "#1D4ED8")}
      onBlur={(e) => (e.target.style.borderColor = "#E2E8F0")}
    />
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
  const styles = {
    primary:  { bg: "#1D4ED8", fg: "#fff",     br: "#1D4ED8" },
    success:  { bg: "#15803D", fg: "#fff",     br: "#15803D" },
    ghost:    { bg: "#fff",    fg: "#334155",  br: "#E2E8F0" },
    danger:   { bg: "#fff",    fg: "#BE123C",  br: "#FECACA" },
  }[variant];
  return (
    <button
      onClick={onClick} disabled={disabled}
      style={{
        padding: small ? "6px 13px" : "9px 20px", borderRadius: 8,
        border: `1px solid ${disabled ? "#CBD5E1" : styles.br}`,
        background: disabled ? "#F1F5F9" : styles.bg,
        color: disabled ? "#94A3B8" : styles.fg,
        fontSize: small ? 12 : 13, fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit",
        display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
      }}
    >
      {Icon && <Icon size={small ? 12 : 14} strokeWidth={2.2} />}
      {children}
    </button>
  );
}

function Modal({ title, onClose, children, footer, width = 620 }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 20, width: "100%", maxWidth: width,
          maxHeight: "88vh", display: "flex", flexDirection: "column", overflow: "hidden",
        }}
      >
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0F172A" }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", padding: 4, display: "flex" }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>{children}</div>
        {footer && (
          <div style={{ padding: "14px 24px", borderTop: "1px solid #F1F5F9", display: "flex", gap: 10, justifyContent: "flex-end", background: "#F8FAFC" }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════
export default function SubscriptionsPage() {
  const [tab, setTab] = useState("plans");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [plans, setPlans] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [subs, setSubs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [settings, setSettings] = useState({});

  const [planModal, setPlanModal] = useState(null);
  const [assignModal, setAssignModal] = useState(null);
  const [search, setSearch] = useState("");
  const [invFilter, setInvFilter] = useState("open");

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [
      { data: p },
      { data: t },
      { data: s },
      { data: i },
      { data: cfg },
    ] = await Promise.all([
      supabase.from("subscription_plans").select("*").order("display_order"),
      supabase.from("therapist_profiles")
        .select("id, name, specialty, area, photo_url, is_approved, is_profile_complete, subscription_exempt, fee_exempt, exempt_reason"),
      supabase.from("therapist_subscriptions").select("*").order("created_at", { ascending: false }),
      supabase.from("subscription_invoices").select("*").order("period_start", { ascending: false }),
      supabase.from("platform_settings").select("key, value"),
    ]);

    const cfgMap = {};
    (cfg || []).forEach((r) => { cfgMap[r.key] = r.value; });

    setPlans(p || []);
    setTherapists((t || []).sort((a, b) => (a.name || "").localeCompare(b.name || "", "el")));
    setSubs(s || []);
    setInvoices(i || []);
    setSettings(cfgMap);
    setLoading(false);
  }

  // ─── DERIVED ──────────────────────────────────────────────────────────
  const planMap = {};
  plans.forEach((p) => { planMap[p.id] = p; });

  const subMap = {};
  subs.forEach((s) => {
    if (["trialing", "active", "past_due", "exempt"].includes(s.status) && !subMap[s.therapist_id]) {
      subMap[s.therapist_id] = s;
    }
  });

  const defaultFee = num(settings.first_session_fee_default) || 10;

  const rows = therapists.map((t) => {
    const sub = subMap[t.id] || null;
    const plan = sub ? planMap[sub.plan_id] : null;

    let status = "none";
    if (t.subscription_exempt) status = "exempt";
    else if (!sub) status = "none";
    else if (sub.current_period_end && new Date(sub.current_period_end) < new Date()) status = "expired";
    else status = sub.status;

    const open = invoices.filter((iv) => iv.therapist_id === t.id && ["open", "overdue"].includes(iv.status));

    return {
      ...t,
      sub,
      plan,
      status,
      // ΠΡΑΓΜΑΤΙΚΗ τιμή: το effective_* είναι ό,τι πληρώνει σήμερα, μετά
      // την προσφορά. Το *_locked είναι η τιμή καταλόγου που θα ισχύσει
      // όταν λήξει ο κωδικός. Αν μετρούσαμε το locked, οι προσφορές θα
      // ήταν αόρατες στα έσοδα και τα νούμερα θα έλεγαν ψέματα.
      price: sub ? num(sub.effective_price ?? sub.price_locked ?? plan?.price_monthly) : 0,
      listPrice: sub ? num(sub.price_locked ?? plan?.price_monthly) : 0,
      fee: t.fee_exempt ? 0 : num(sub?.effective_first_session_fee ?? sub?.first_session_fee_locked ?? plan?.first_session_fee ?? defaultFee),
      listFee: num(sub?.first_session_fee_locked ?? plan?.first_session_fee ?? defaultFee),
      promoCode: sub?.promo_code_text || null,
      promoEndsAt: sub?.promo_ends_at || null,
      promoLive: !!sub?.promo_code_text && (!sub?.promo_ends_at || new Date(sub.promo_ends_at) > new Date()),
      planName: sub?.plan_snapshot?.name_el || plan?.name_el || null,
      planVersion: sub?.plan_version || null,
      openInvoices: open.length,
      amountDue: open.reduce((a, b) => a + num(b.amount), 0),
    };
  });

  const filteredRows = rows.filter((r) =>
    !search.trim() || (r.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const mrr = rows
    .filter((r) => ["active", "trialing", "past_due"].includes(r.status))
    .reduce((a, b) => a + b.price, 0);

  const activeCount = rows.filter((r) => ["active", "trialing"].includes(r.status)).length;
  const noPlanCount = rows.filter((r) => r.status === "none" && r.is_approved).length;
  const totalDue = rows.reduce((a, b) => a + b.amountDue, 0);

  const filteredInvoices = invoices.filter((iv) => {
    if (invFilter === "open") return ["open", "overdue"].includes(iv.status);
    if (invFilter === "paid") return iv.status === "paid";
    return true;
  });

  // ─── ACTIONS ──────────────────────────────────────────────────────────
  async function savePlan(form) {
    setBusy(true);
    const payload = {
      code: form.code?.trim() || null,
      name_el: form.name_el?.trim() || "Χωρίς όνομα",
      name_en: form.name_en?.trim() || null,
      description_el: form.description_el?.trim() || null,
      description_en: form.description_en?.trim() || null,
      price_monthly: num(form.price_monthly),
      price_yearly: form.price_yearly === "" ? null : num(form.price_yearly),
      first_session_fee: num(form.first_session_fee),
      max_active_requests: form.max_active_requests === "" ? null : parseInt(form.max_active_requests, 10),
      max_areas: form.max_areas === "" ? null : parseInt(form.max_areas, 10),
      featured_listing: !!form.featured_listing,
      priority_matching: !!form.priority_matching,
      rank_weight: parseInt(form.rank_weight, 10) || 0,
      features_el: (form.features_text || "").split("\n").map((x) => x.trim()).filter(Boolean),
      badge_label: form.badge_label?.trim() || null,
      display_order: parseInt(form.display_order, 10) || 0,
      is_active: !!form.is_active,
      features_en: (form.features_text_en || "").split("\n").map((x) => x.trim()).filter(Boolean),
      is_recommended: !!form.is_recommended,
      is_archived: !!form.is_archived,
    };

    const { error } = form.id
      ? await supabase.from("subscription_plans").update(payload).eq("id", form.id)
      : await supabase.from("subscription_plans").insert([payload]);

    if (error) alert("Σφάλμα: " + error.message);
    setPlanModal(null);
    await fetchAll();
    setBusy(false);
  }

  async function deletePlan(id) {
    if (!confirm("Διαγραφή πακέτου;\n\nΟι θεραπευτές που το έχουν κρατούν τις κλειδωμένες τιμές τους.")) return;
    setBusy(true);
    const { error } = await supabase.from("subscription_plans").delete().eq("id", id);
    if (error) alert("Σφάλμα: " + error.message);
    setPlanModal(null);
    await fetchAll();
    setBusy(false);
  }

  async function assignPlan(therapistId, planId, billing, months) {
    setBusy(true);
    const plan = planMap[planId];
    const now = new Date();
    const end = addMonths(now, months);

    // Κλείνουμε τυχόν προηγούμενη ενεργή συνδρομή
    await supabase
      .from("therapist_subscriptions")
      .update({ status: "canceled", canceled_at: now.toISOString() })
      .eq("therapist_id", therapistId)
      .in("status", ["trialing", "active", "past_due", "exempt"]);

    const lockedPrice = num(billing === "yearly" ? plan?.price_yearly : plan?.price_monthly);
    const lockedFee = num(plan?.first_session_fee);

    // ΦΩΤΟΓΡΑΦΙΑ ΟΡΩΝ.
    // Παλιά η χειροκίνητη ανάθεση έγραφε μόνο price_locked και
    // first_session_fee_locked — χωρίς snapshot. Δηλαδή ο θεραπευτής που
    // τον έβαζες εσύ έπαιρνε συνδρομή χωρίς παγωμένους όρους, ενώ αυτός
    // που περνούσε από το onboarding έπαιρνε. Η πρώτη αλλαγή τιμής θα
    // άλλαζε αναδρομικά τους όρους του πρώτου.
    // Εδώ γράφουμε ΤΑ ΙΔΙΑ πεδία με την activate_subscription.
    const { error } = await supabase.from("therapist_subscriptions").insert([{
      therapist_id: therapistId,
      plan_id: planId,
      status: "active",
      billing_interval: billing,
      price_locked: lockedPrice,
      first_session_fee_locked: lockedFee,
      effective_price: lockedPrice,
      effective_first_session_fee: lockedFee,
      plan_snapshot: plan || null,
      plan_version: plan?.version || 1,
      agreement_version: "admin",
      agreement_accepted_at: now.toISOString(),
      agreement_snapshot: {
        assigned_by_admin: true,
        plan_name_el: plan?.name_el || null,
        billing_interval: billing,
        list_price: lockedPrice,
        list_fee: lockedFee,
        assigned_at: now.toISOString(),
      },
      started_at: now.toISOString(),
      current_period_start: now.toISOString(),
      current_period_end: end.toISOString(),
    }]);

    if (error) alert("Σφάλμα: " + error.message);
    setAssignModal(null);
    await fetchAll();
    setBusy(false);
  }

  async function cancelSub(subId) {
    if (!confirm("Ακύρωση συνδρομής;")) return;
    setBusy(true);
    const { error } = await supabase
      .from("therapist_subscriptions")
      .update({ status: "canceled", canceled_at: new Date().toISOString() })
      .eq("id", subId);
    if (error) alert("Σφάλμα: " + error.message);
    await fetchAll();
    setBusy(false);
  }

  async function toggleFlag(therapistId, field, value) {
    setBusy(true);
    const { error } = await supabase
      .from("therapist_profiles")
      .update({ [field]: value })
      .eq("id", therapistId);
    if (error) alert("Σφάλμα: " + error.message);
    await fetchAll();
    setBusy(false);
  }

  async function generateInvoices() {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const ps = periodStart.toISOString().slice(0, 10);

    const targets = rows.filter(
      (r) => r.sub && !r.subscription_exempt && ["active", "trialing", "past_due"].includes(r.status) && r.price > 0
    );

    const existing = new Set(
      invoices.filter((iv) => iv.period_start === ps).map((iv) => iv.therapist_id)
    );
    const toCreate = targets.filter((r) => !existing.has(r.id));

    if (toCreate.length === 0) {
      alert(`Δεν υπάρχει τίποτα νέο για ${monthLabel(periodStart)}.\n\nΌλα τα τιμολόγια του μήνα έχουν ήδη δημιουργηθεί.`);
      return;
    }

    const total = toCreate.reduce((a, b) => a + b.price, 0);
    if (!confirm(`Δημιουργία ${toCreate.length} τιμολογίων για ${monthLabel(periodStart)};\n\nΣύνολο: ${eur(total)}`)) return;

    setBusy(true);
    const { error } = await supabase.from("subscription_invoices").insert(
      toCreate.map((r) => ({
        subscription_id: r.sub.id,
        therapist_id: r.id,
        plan_id: r.sub.plan_id,
        period_start: ps,
        period_end: periodEnd.toISOString().slice(0, 10),
        amount: r.price,
        status: "open",
        due_at: new Date(now.getFullYear(), now.getMonth(), 10).toISOString(),
      }))
    );
    if (error) alert("Σφάλμα: " + error.message);
    await fetchAll();
    setBusy(false);
  }

  async function setInvoiceStatus(id, status) {
    setBusy(true);
    const patch = { status };
    if (status === "paid") patch.paid_at = new Date().toISOString();
    const { error } = await supabase.from("subscription_invoices").update(patch).eq("id", id);
    if (error) alert("Σφάλμα: " + error.message);
    await fetchAll();
    setBusy(false);
  }

  // ─── RENDER ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: "#64748B", fontSize: 15 }}>
        Φόρτωση συνδρομών...
      </div>
    );
  }

  const TABS = [
    { id: "plans",      label: "Πακέτα",     Icon: CreditCard },
    { id: "therapists", label: "Θεραπευτές", Icon: Users },
    { id: "invoices",   label: "Τιμολόγια",  Icon: FileText },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 22, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0F172A", margin: 0 }}>Συνδρομές</h1>
          <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>
            Πακέτα θεραπευτών και προμήθεια πρώτης συνεδρίας
          </p>
        </div>
        <Btn onClick={fetchAll} variant="ghost" Icon={RefreshCw} disabled={busy}>Ανανέωση</Btn>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 24 }}>
        <Stat Icon={TrendingUp} label="Μηνιαία έσοδα" value={eur(mrr)} sub="από ενεργές συνδρομές" color="#15803D" />
        <Stat Icon={CheckCircle2} label="Ενεργές" value={activeCount} sub={`από ${therapists.length} θεραπευτές`} />
        <Stat Icon={AlertTriangle} label="Χωρίς πακέτο" value={noPlanCount} sub="εγκεκριμένοι θεραπευτές" color="#B45309" />
        <Stat Icon={Wallet} label="Ανείσπρακτα" value={eur(totalDue)} sub="ανοιχτά τιμολόγια" color="#BE123C" />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: "#E2E8F0", padding: 4, borderRadius: 10, width: "fit-content", marginBottom: 20 }}>
        {TABS.map((t) => (
          <button
            key={t.id} onClick={() => setTab(t.id)}
            style={{
              padding: "8px 18px", borderRadius: 7, border: "none", fontSize: 13, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
              background: tab === t.id ? "#fff" : "transparent",
              color: tab === t.id ? "#0F172A" : "#64748B",
              boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              display: "inline-flex", alignItems: "center", gap: 7,
            }}
          >
            <t.Icon size={14} strokeWidth={2.2} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ TAB: ΠΑΚΕΤΑ ══════════════════════════════════════════════════ */}
      {tab === "plans" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
            <div style={{ fontSize: 13, color: "#64748B", maxWidth: 620, lineHeight: 1.6 }}>
              Οι τιμές κλειδώνουν τη στιγμή που ο θεραπευτής μπαίνει σε πακέτο. Αν αλλάξεις μια τιμή εδώ,
              επηρεάζονται μόνο οι <strong>νέες</strong> εγγραφές.
            </div>
            <Btn onClick={() => setPlanModal({ is_active: true, display_order: plans.length + 1, first_session_fee: defaultFee })} Icon={Plus}>
              Νέο πακέτο
            </Btn>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 16 }}>
            {plans.map((p) => {
              const count = rows.filter((r) => r.sub?.plan_id === p.id).length;
              return (
                <Card key={p.id} style={{ padding: 22, borderColor: p.is_active ? "#E2E8F0" : "#F1F5F9", opacity: p.is_active ? 1 : 0.72 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 700, color: "#0F172A" }}>{p.name_el}</div>
                      <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {p.code || "—"}
                      </div>
                    </div>
                    {p.badge_label && (
                      <Pill meta={{ bg: "#EFF6FF", fg: "#1D4ED8", br: "#BFDBFE" }}>
                        <Star size={10} strokeWidth={2.5} />{p.badge_label}
                      </Pill>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 32, fontWeight: 700, color: "#0F172A" }}>{eur(p.price_monthly)}</span>
                    <span style={{ fontSize: 13, color: "#94A3B8" }}>/μήνα</span>
                  </div>
                  {p.price_yearly ? (
                    <div style={{ fontSize: 12, color: "#15803D", fontWeight: 600, marginBottom: 14 }}>
                      {eur(p.price_yearly)}/έτος
                    </div>
                  ) : <div style={{ height: 14 }} />}

                  <div style={{
                    background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10,
                    padding: "10px 14px", marginBottom: 14,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}>
                    <span style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>Προμήθεια 1ης συνεδρίας</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: "#1D4ED8" }}>{eur(p.first_session_fee)}</span>
                  </div>

                  {Array.isArray(p.features_el) && p.features_el.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      {p.features_el.slice(0, 4).map((f, i) => (
                        <div key={i} style={{ display: "flex", gap: 7, alignItems: "flex-start", marginBottom: 5 }}>
                          <Check size={13} color="#15803D" strokeWidth={2.6} style={{ marginTop: 2, flexShrink: 0 }} />
                          <span style={{ fontSize: 12.5, color: "#475569" }}>{f}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {num(p.rank_weight) > 0 && (
                    <div style={{
                      background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 10,
                      padding: "8px 14px", marginBottom: 14,
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                    }}>
                      <span style={{ fontSize: 12, color: "#6D28D9", fontWeight: 600 }}>Προβάδισμα κατάταξης</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#6D28D9" }}>+{p.rank_weight}</span>
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTop: "1px solid #F1F5F9" }}>
                    <span style={{ fontSize: 12, color: "#64748B" }}>
                      {count} {count === 1 ? "θεραπευτής" : "θεραπευτές"}
                    </span>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {!p.is_active && <Pill meta={{ bg: "#F8FAFC", fg: "#94A3B8", br: "#E2E8F0" }}>Ανενεργό</Pill>}
                      <Btn small variant="ghost" Icon={Pencil} onClick={() => setPlanModal({
                        ...p,
                        features_text: Array.isArray(p.features_el) ? p.features_el.join("\n") : "",
                        features_text_en: Array.isArray(p.features_en) ? p.features_en.join("\n") : "",
                      })}>
                        Επεξεργασία
                      </Btn>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ TAB: ΘΕΡΑΠΕΥΤΕΣ ══════════════════════════════════════════════ */}
      {tab === "therapists" && (
        <div>
          <div style={{ position: "relative", marginBottom: 16, maxWidth: 340 }}>
            <Search size={15} color="#94A3B8" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Αναζήτηση θεραπευτή..."
              style={{
                width: "100%", padding: "10px 13px 10px 36px", borderRadius: 8,
                border: "1px solid #E2E8F0", fontSize: 14, fontFamily: "inherit",
                outline: "none", color: "#0F172A", boxSizing: "border-box",
              }}
            />
          </div>

          <Card>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
                <thead>
                  <tr style={{ background: "#F8FAFC" }}>
                    {["Θεραπευτής", "Πακέτο", "Κατάσταση", "Συνδρομή", "Προμήθεια 1ης", "Λήξη", "Εξαιρέσεις", ""].map((h, i) => (
                      <th key={i} style={{
                        padding: "11px 14px", textAlign: i > 2 && i < 6 ? "right" : "left",
                        fontSize: 11, fontWeight: 700, color: "#64748B",
                        textTransform: "uppercase", letterSpacing: "0.05em",
                        borderBottom: "1px solid #E2E8F0", whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((r) => {
                    const meta = STATUS_META[r.status] || STATUS_META.none;
                    return (
                      <tr key={r.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>{r.name || "—"}</div>
                          <div style={{ fontSize: 12, color: "#94A3B8" }}>{r.specialty || r.area || "—"}</div>
                        </td>
                        <td style={{ padding: "12px 14px", fontSize: 13, color: "#334155" }}>
                          {/* Το όνομα από το snapshot, όχι από το τρέχον πακέτο:
                              αν το πακέτο μετονομαστεί, ο θεραπευτής πρέπει να
                              συνεχίσει να δείχνει αυτό που αποδέχτηκε. */}
                          {r.planName || <span style={{ color: "#CBD5E1" }}>—</span>}
                          {r.planVersion && (
                            <span style={{ fontSize: 11, color: "#94A3B8", marginLeft: 6 }}>v{r.planVersion}</span>
                          )}
                          {r.promoCode && (
                            <div style={{ fontSize: 11, marginTop: 3, display: "inline-flex", alignItems: "center", gap: 4, color: r.promoLive ? "#6D28D9" : "#94A3B8" }}>
                              <Tag size={10} strokeWidth={2.4} />
                              <span style={{ fontWeight: 700, fontFamily: "ui-monospace, monospace" }}>{r.promoCode}</span>
                              {r.promoEndsAt && (
                                <span>{r.promoLive ? `έως ${fmtDate(r.promoEndsAt)}` : `έληξε`}</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "12px 14px" }}><Pill meta={meta} /></td>
                        <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, fontWeight: 600, color: "#0F172A" }}>
                          {r.sub ? (
                            <>
                              {eur(r.price)}
                              {r.listPrice > r.price && (
                                <span style={{ marginLeft: 6, fontSize: 11.5, fontWeight: 400, color: "#94A3B8", textDecoration: "line-through" }}>{eur(r.listPrice)}</span>
                              )}
                            </>
                          ) : <span style={{ color: "#CBD5E1" }}>—</span>}
                        </td>
                        <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, fontWeight: 700, color: r.fee > 0 ? "#1D4ED8" : "#94A3B8" }}>
                          {eur(r.fee)}
                          {r.listFee > r.fee && !r.fee_exempt && (
                            <span style={{ marginLeft: 6, fontSize: 11.5, fontWeight: 400, color: "#94A3B8", textDecoration: "line-through" }}>{eur(r.listFee)}</span>
                          )}
                        </td>
                        <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 12, color: "#64748B", whiteSpace: "nowrap" }}>
                          {fmtDate(r.sub?.current_period_end)}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                            {r.subscription_exempt && (
                              <Pill meta={{ bg: "#F5F3FF", fg: "#6D28D9", br: "#DDD6FE" }}>
                                <ShieldOff size={10} strokeWidth={2.5} />Συνδρομή
                              </Pill>
                            )}
                            {r.fee_exempt && (
                              <Pill meta={{ bg: "#F5F3FF", fg: "#6D28D9", br: "#DDD6FE" }}>
                                <Ban size={10} strokeWidth={2.5} />Προμήθεια
                              </Pill>
                            )}
                            {!r.subscription_exempt && !r.fee_exempt && <span style={{ fontSize: 12, color: "#CBD5E1" }}>—</span>}
                          </div>
                        </td>
                        <td style={{ padding: "12px 14px", textAlign: "right" }}>
                          <Btn small variant="ghost" Icon={Pencil} onClick={() => setAssignModal(r)}>Διαχείριση</Btn>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredRows.length === 0 && (
                    <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "#94A3B8", fontSize: 14 }}>
                      Κανένας θεραπευτής.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ══ TAB: ΤΙΜΟΛΟΓΙΑ ═══════════════════════════════════════════════ */}
      {tab === "invoices" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 4, background: "#E2E8F0", padding: 3, borderRadius: 8 }}>
              {[
                { id: "open",  label: "Ανοιχτά" },
                { id: "paid",  label: "Πληρωμένα" },
                { id: "all",   label: "Όλα" },
              ].map((f) => (
                <button key={f.id} onClick={() => setInvFilter(f.id)}
                  style={{
                    padding: "6px 15px", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit",
                    background: invFilter === f.id ? "#fff" : "transparent",
                    color: invFilter === f.id ? "#0F172A" : "#64748B",
                  }}>
                  {f.label}
                </button>
              ))}
            </div>
            <Btn onClick={generateInvoices} Icon={Plus} disabled={busy}>
              Τιμολόγια {monthLabel(new Date())}
            </Btn>
          </div>

          <Card>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                <thead>
                  <tr style={{ background: "#F8FAFC" }}>
                    {["Θεραπευτής", "Περίοδος", "Ποσό", "Κατάσταση", "Πληρώθηκε", ""].map((h, i) => (
                      <th key={i} style={{
                        padding: "11px 14px", textAlign: i === 2 ? "right" : "left",
                        fontSize: 11, fontWeight: 700, color: "#64748B",
                        textTransform: "uppercase", letterSpacing: "0.05em",
                        borderBottom: "1px solid #E2E8F0", whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((iv) => {
                    const th = therapists.find((t) => t.id === iv.therapist_id);
                    const meta = INVOICE_META[iv.status] || INVOICE_META.open;
                    return (
                      <tr key={iv.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                        <td style={{ padding: "12px 14px", fontSize: 14, fontWeight: 600, color: "#0F172A" }}>
                          {th?.name || "Άγνωστος"}
                        </td>
                        <td style={{ padding: "12px 14px", fontSize: 13, color: "#64748B" }}>
                          {monthLabel(iv.period_start)}
                        </td>
                        <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 14, fontWeight: 700, color: "#0F172A" }}>
                          {eur(iv.amount)}
                        </td>
                        <td style={{ padding: "12px 14px" }}><Pill meta={meta} /></td>
                        <td style={{ padding: "12px 14px", fontSize: 12, color: "#64748B" }}>{fmtDate(iv.paid_at)}</td>
                        <td style={{ padding: "12px 14px", textAlign: "right" }}>
                          <div style={{ display: "flex", gap: 7, justifyContent: "flex-end" }}>
                            {["open", "overdue"].includes(iv.status) && (
                              <>
                                <Btn small variant="success" Icon={Check} onClick={() => setInvoiceStatus(iv.id, "paid")} disabled={busy}>
                                  Πληρώθηκε
                                </Btn>
                                <Btn small variant="ghost" onClick={() => setInvoiceStatus(iv.id, "waived")} disabled={busy}>
                                  Διαγραφή
                                </Btn>
                              </>
                            )}
                            {iv.status === "paid" && (
                              <Btn small variant="ghost" onClick={() => setInvoiceStatus(iv.id, "open")} disabled={busy}>
                                Αναίρεση
                              </Btn>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredInvoices.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#94A3B8", fontSize: 14 }}>
                      Κανένα τιμολόγιο.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ══ MODAL: ΠΑΚΕΤΟ ════════════════════════════════════════════════ */}
      {planModal && (
        <PlanModal
          initial={planModal}
          busy={busy}
          onClose={() => setPlanModal(null)}
          onSave={savePlan}
          subscribers={planModal.id ? rows.filter((r) => r.sub && r.sub.plan_id === planModal.id && ["active", "trialing", "past_due", "exempt"].includes(r.status)).length : 0}
          onDelete={planModal.id ? () => deletePlan(planModal.id) : null}
        />
      )}

      {/* ══ MODAL: ΑΝΑΘΕΣΗ ═══════════════════════════════════════════════ */}
      {assignModal && (
        <AssignModal
          row={assignModal}
          plans={plans.filter((p) => p.is_active)}
          busy={busy}
          defaultFee={defaultFee}
          onClose={() => setAssignModal(null)}
          onAssign={assignPlan}
          onCancelSub={cancelSub}
          onToggleFlag={toggleFlag}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// MODAL: ΕΠΕΞΕΡΓΑΣΙΑ ΠΑΚΕΤΟΥ
// ════════════════════════════════════════════════════════════════════════
function PlanModal({ initial, onClose, onSave, onDelete, busy, subscribers = 0 }) {
  const [f, setF] = useState({
    code: "", name_el: "", name_en: "", description_el: "", description_en: "",
    price_monthly: 0, price_yearly: "", first_session_fee: 10,
    max_active_requests: "", max_areas: "", featured_listing: false, priority_matching: false,
    rank_weight: 0,
    features_text: "", features_text_en: "", badge_label: "", display_order: 0,
    is_active: true, is_recommended: false, is_archived: false,
    ...initial,
  });
  const upd = (k, v) => setF((p) => ({ ...p, [k]: v }));

  // Άλλαξε οικονομικός όρος σε πακέτο που ήδη χρησιμοποιείται;
  const priceChanged = initial.id && (
    num(f.price_monthly) !== num(initial.price_monthly) ||
    num(f.first_session_fee) !== num(initial.first_session_fee)
  );

  return (
    <Modal
      title={initial.id ? "Επεξεργασία πακέτου" : "Νέο πακέτο"}
      onClose={onClose}
      footer={
        <>
          {onDelete && <Btn variant="danger" Icon={Trash2} onClick={onDelete} disabled={busy}>Διαγραφή</Btn>}
          <div style={{ flex: 1 }} />
          <Btn variant="ghost" onClick={onClose}>Άκυρο</Btn>
          <Btn Icon={Save} onClick={() => onSave(f)} disabled={busy}>
            {busy ? "Αποθήκευση..." : "Αποθήκευση"}
          </Btn>
        </>
      }
    >
      {/* Η κεντρική αρχή, ακριβώς τη στιγμή που έχει σημασία */}
      {priceChanged && subscribers > 0 && (
        <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, padding: "13px 17px", marginBottom: 20, fontSize: 12.5, color: "#166534", lineHeight: 1.65, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Lock size={15} strokeWidth={2.2} style={{ marginTop: 1, flexShrink: 0 }} />
          <span>
            Άλλαξες οικονομικό όρο. Οι <strong>{subscribers}</strong> ενεργοί συνδρομητές
            <strong> δεν επηρεάζονται</strong> — κρατούν τους όρους που αποδέχτηκαν.
            Η νέα τιμή ισχύει μόνο για όποιον επιλέξει το πακέτο από εδώ και πέρα.
          </span>
        </div>
      )}

      {initial.id && initial.version && (
        <div style={{ fontSize: 11.5, color: "#94A3B8", marginBottom: 14 }}>
          Τρέχουσα έκδοση πακέτου: <strong>v{initial.version}</strong> · κάθε αλλαγή τιμής ανεβάζει έκδοση
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label="Όνομα (EL)"><Input value={f.name_el} onChange={(e) => upd("name_el", e.target.value)} placeholder="π.χ. Pro" /></Field>
        <Field label="Όνομα (EN)"><Input value={f.name_en} onChange={(e) => upd("name_en", e.target.value)} /></Field>
      </div>

      <Field label="Κωδικός" hint="Μικρά λατινικά, χωρίς κενά. Χρησιμοποιείται στον κώδικα — μην τον αλλάζεις μετά.">
        <Input value={f.code} onChange={(e) => upd("code", e.target.value)} placeholder="basic / pro / premium" />
      </Field>

      <Field label="Περιγραφή (EL)">
        <TextArea value={f.description_el} onChange={(e) => upd("description_el", e.target.value)} rows={2} />
      </Field>

      <div style={{ height: 1, background: "#F1F5F9", margin: "6px 0 20px" }} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <Field label="Τιμή / μήνα (€)">
          <Input type="number" min={0} step="0.01" value={f.price_monthly} onChange={(e) => upd("price_monthly", e.target.value)} />
        </Field>
        <Field label="Τιμή / έτος (€)" hint="Προαιρετικό">
          <Input type="number" min={0} step="0.01" value={f.price_yearly} onChange={(e) => upd("price_yearly", e.target.value)} />
        </Field>
        <Field label="Προμήθεια 1ης (€)">
          <Input type="number" min={0} step="0.01" value={f.first_session_fee} onChange={(e) => upd("first_session_fee", e.target.value)} />
        </Field>
      </div>

      <div style={{
        background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 12,
        padding: "12px 16px", marginBottom: 20, fontSize: 12.5, color: "#1E40AF", lineHeight: 1.6,
      }}>
        Η <strong>προμήθεια 1ης</strong> παρακρατείται μία φορά, στην πρώτη συνεδρία κάθε νέου
        ασθενή με αυτόν τον θεραπευτή. Σε όλες τις επόμενες συνεδρίες είναι μηδενική.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label="Μέγιστα ενεργά αιτήματα" hint="Κενό = απεριόριστα">
          <Input type="number" min={0} value={f.max_active_requests} onChange={(e) => upd("max_active_requests", e.target.value)} />
        </Field>
        <Field label="Μέγιστες περιοχές" hint="Κενό = απεριόριστες">
          <Input type="number" min={0} value={f.max_areas} onChange={(e) => upd("max_areas", e.target.value)} />
        </Field>
      </div>

      <Field label="Χαρακτηριστικά (EL)" hint="Ένα ανά γραμμή. Εμφανίζονται στην κάρτα του πακέτου.">
        <TextArea value={f.features_text} onChange={(e) => upd("features_text", e.target.value)} rows={5}
          placeholder={"Απεριόριστα αιτήματα\nΠροβολή στην κορυφή\nΥποστήριξη κατά προτεραιότητα"} />
      </Field>

      {/* Το onboarding του θεραπευτή είναι δίγλωσσο. Χωρίς αγγλικά
          χαρακτηριστικά, ο αγγλόφωνος βλέπει ελληνικά μέσα σε αγγλική οθόνη. */}
      <Field label="Χαρακτηριστικά (EN)" hint="Ένα ανά γραμμή. Αν μείνει κενό, εμφανίζονται τα ελληνικά.">
        <TextArea value={f.features_text_en} onChange={(e) => upd("features_text_en", e.target.value)} rows={3}
          placeholder={"Unlimited requests\nTop placement\nPriority support"} />
      </Field>

      <Field
        label="Βάρος κατάταξης"
        hint="Πόντοι που προστίθενται στη σειρά εμφάνισης. 0 = καθαρή αξιοκρατία · 10 = ελαφρύ σπρώξιμο · 50 = ισχυρό · 200 = πάντα πρώτοι."
      >
        <div style={{ maxWidth: 160 }}>
          <Input type="number" min={0} max={500} value={f.rank_weight} onChange={(e) => upd("rank_weight", e.target.value)} />
        </div>
      </Field>

      <div style={{
        background: num(f.rank_weight) >= 100 ? "#FFFBEB" : "#F8FAFC",
        border: `1px solid ${num(f.rank_weight) >= 100 ? "#FDE68A" : "#E2E8F0"}`,
        borderRadius: 12, padding: "12px 16px", marginBottom: 20,
        fontSize: 12.5, color: num(f.rank_weight) >= 100 ? "#B45309" : "#64748B", lineHeight: 1.6,
      }}>
        {num(f.rank_weight) === 0
          ? "Ουδέτερο: οι θεραπευτές αυτού του πακέτου κατατάσσονται μόνο βάσει βαθμολογίας, διαθεσιμότητας και εμπειρίας."
          : num(f.rank_weight) >= 100
            ? "Προσοχή: με τόσο υψηλό βάρος, ένας θεραπευτής με χαμηλή βαθμολογία θα εμφανίζεται πάνω από έναν άριστο δωρεάν. Χρήσιμο για έσοδα, ρίσκο για την εμπειρία του ασθενή."
            : "Οι θεραπευτές αυτού του πακέτου ξεκινούν με προβάδισμα, αλλά μια πολύ καλή βαθμολογία μπορεί να το ξεπεράσει."}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label="Ετικέτα" hint="π.χ. Δημοφιλές">
          <Input value={f.badge_label} onChange={(e) => upd("badge_label", e.target.value)} />
        </Field>
        <Field label="Σειρά εμφάνισης">
          <Input type="number" value={f.display_order} onChange={(e) => upd("display_order", e.target.value)} />
        </Field>
      </div>

      <div style={{ height: 1, background: "#F1F5F9", margin: "6px 0 18px" }} />

      <Toggle checked={f.featured_listing} onChange={() => upd("featured_listing", !f.featured_listing)}
        label="Προβολή στην κορυφή" hint="Οι θεραπευτές του πακέτου εμφανίζονται πρώτοι στα αποτελέσματα" />
      <Toggle checked={f.priority_matching} onChange={() => upd("priority_matching", !f.priority_matching)}
        label="Προτεραιότητα στα αιτήματα" hint="Λαμβάνουν πρώτοι νέα αιτήματα στην περιοχή τους" />
      <Toggle checked={f.is_active} onChange={() => upd("is_active", !f.is_active)}
        label="Ενεργό πακέτο" hint="Μόνο τα ενεργά εμφανίζονται στο onboarding και μπορούν να ανατεθούν" />

      <Toggle checked={f.is_recommended} onChange={() => upd("is_recommended", !f.is_recommended)}
        label="Προτεινόμενο" hint="Προβάλλεται με σήμα στην επιλογή πακέτου του θεραπευτή" />

      {/* Η αρχειοθέτηση κρύβει το πακέτο από ΝΕΕΣ εγγραφές χωρίς να
          αγγίζει κανέναν υπάρχοντα — προτιμότερη από τη διαγραφή. */}
      <Toggle checked={f.is_archived} onChange={() => upd("is_archived", !f.is_archived)}
        label="Αρχειοθετημένο" hint="Κρύβεται από νέες εγγραφές. Οι υπάρχοντες συνδρομητές δεν επηρεάζονται." />
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════════
// MODAL: ΔΙΑΧΕΙΡΙΣΗ ΘΕΡΑΠΕΥΤΗ
// ════════════════════════════════════════════════════════════════════════
function AssignModal({ row, plans, onClose, onAssign, onCancelSub, onToggleFlag, busy, defaultFee }) {
  const [planId, setPlanId] = useState(row.sub?.plan_id || (plans[0]?.id ?? ""));
  const [billing, setBilling] = useState(row.sub?.billing_interval || "monthly");
  const [months, setMonths] = useState(row.sub?.billing_interval === "yearly" ? 12 : 1);

  const selected = plans.find((p) => p.id === planId);
  const meta = STATUS_META[row.status] || STATUS_META.none;

  return (
    <Modal
      title={row.name || "Θεραπευτής"}
      onClose={onClose}
      footer={
        <>
          {row.sub && (
            <Btn variant="danger" Icon={Ban} onClick={() => onCancelSub(row.sub.id)} disabled={busy}>
              Ακύρωση συνδρομής
            </Btn>
          )}
          <div style={{ flex: 1 }} />
          <Btn variant="ghost" onClick={onClose}>Κλείσιμο</Btn>
          <Btn Icon={Check} onClick={() => onAssign(row.id, planId, billing, months)} disabled={busy || !planId}>
            {row.sub ? "Αλλαγή πακέτου" : "Ανάθεση πακέτου"}
          </Btn>
        </>
      }
    >
      {/* Τρέχουσα κατάσταση */}
      <div style={{
        background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12,
        padding: "14px 18px", marginBottom: 22,
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 14,
      }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>Κατάσταση</div>
          <Pill meta={meta} />
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>Πακέτο</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>{row.plan?.name_el || "—"}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>Συνδρομή</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>{row.sub ? eur(row.price) : "—"}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>Προμήθεια 1ης</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: row.fee > 0 ? "#1D4ED8" : "#94A3B8" }}>{eur(row.fee)}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>Λήξη</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>{fmtDate(row.sub?.current_period_end)}</div>
        </div>
      </div>

      {/* Ανάθεση */}
      <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 14 }}>Ανάθεση πακέτου</div>

      {plans.length === 0 ? (
        <div style={{
          background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12,
          padding: "12px 16px", marginBottom: 22, fontSize: 13, color: "#B45309",
          display: "flex", gap: 9, alignItems: "flex-start",
        }}>
          <AlertTriangle size={15} strokeWidth={2.2} style={{ marginTop: 1, flexShrink: 0 }} />
          <span>Δεν υπάρχει ενεργό πακέτο. Πήγαινε στην καρτέλα «Πακέτα» και ενεργοποίησε τουλάχιστον ένα.</span>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 18 }}>
            {plans.map((p) => (
              <div key={p.id} onClick={() => setPlanId(p.id)}
                style={{
                  padding: "13px 16px", borderRadius: 12, cursor: "pointer",
                  border: `2px solid ${planId === p.id ? "#1D4ED8" : "#E2E8F0"}`,
                  background: planId === p.id ? "#EFF6FF" : "#fff",
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{p.name_el}</div>
                  <div style={{ fontSize: 12, color: "#64748B" }}>
                    Προμήθεια 1ης συνεδρίας: {eur(p.first_session_fee)}
                  </div>
                </div>
                <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#0F172A" }}>{eur(p.price_monthly)}</div>
                  <div style={{ fontSize: 11, color: "#94A3B8" }}>/μήνα</div>
                </div>
                {planId === p.id && <Check size={17} color="#1D4ED8" strokeWidth={2.6} />}
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Χρέωση">
              <select value={billing}
                onChange={(e) => { setBilling(e.target.value); setMonths(e.target.value === "yearly" ? 12 : 1); }}
                style={{
                  width: "100%", padding: "10px 13px", borderRadius: 8, border: "1px solid #E2E8F0",
                  fontSize: 14, fontFamily: "inherit", outline: "none", color: "#0F172A",
                  boxSizing: "border-box", background: "#fff",
                }}>
                <option value="monthly">Μηνιαία</option>
                <option value="yearly">Ετήσια</option>
              </select>
            </Field>
            <Field label="Διάρκεια περιόδου (μήνες)">
              <Input type="number" min={1} max={36} value={months} onChange={(e) => setMonths(parseInt(e.target.value, 10) || 1)} />
            </Field>
          </div>

          {selected && (
            <div style={{
              background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 12,
              padding: "12px 16px", marginBottom: 22, fontSize: 12.5, color: "#1E40AF", lineHeight: 1.6,
            }}>
              Θα κλειδωθούν: <strong>{eur(billing === "yearly" ? (selected.price_yearly ?? 0) : selected.price_monthly)}</strong> συνδρομή
              και <strong>{eur(selected.first_session_fee)}</strong> προμήθεια 1ης συνεδρίας.
              Μελλοντικές αλλαγές στο πακέτο δεν θα τον επηρεάσουν.
            </div>
          )}
        </>
      )}

      <div style={{ height: 1, background: "#F1F5F9", margin: "4px 0 18px" }} />

      <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 14 }}>Εξαιρέσεις</div>

      <Toggle
        checked={!!row.subscription_exempt}
        onChange={() => onToggleFlag(row.id, "subscription_exempt", !row.subscription_exempt)}
        label="Χωρίς μηνιαία συνδρομή"
        hint="Δεν δημιουργούνται τιμολόγια συνδρομής για αυτόν τον θεραπευτή"
      />
      <Toggle
        checked={!!row.fee_exempt}
        onChange={() => onToggleFlag(row.id, "fee_exempt", !row.fee_exempt)}
        label="Χωρίς προμήθεια 1ης συνεδρίας"
        hint={`Ο ασθενής δεν χρεώνεται τα ${eur(defaultFee)} στην πρώτη συνεδρία`}
      />
    </Modal>
  );
}