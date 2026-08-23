"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  Info, Save, Check, AlertTriangle, Repeat, Bell, User, SlidersHorizontal,
  Eye, EyeOff, Ban, Clock, TrendingUp, Mail,
} from "lucide-react";

const num = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v));

function Section({ title, subtitle, children }) {
  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0", overflow: "hidden", marginBottom: 20 }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #F1F5F9" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 3 }}>{subtitle}</div>}
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
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
        width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #E2E8F0",
        fontSize: 14, fontFamily: "inherit", outline: "none", color: "#0F172A", boxSizing: "border-box",
      }}
      onFocus={(e) => (e.target.style.borderColor = "#1D4ED8")}
      onBlur={(e) => (e.target.style.borderColor = "#E2E8F0")}
    />
  );
}

function Toggle({ checked, onChange, label, hint }) {
  return (
    <div onClick={onChange} style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer", marginBottom: 14 }}>
      <div style={{ position: "relative", width: 44, height: 24, flexShrink: 0, marginTop: 1 }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 12, background: checked ? "#1D4ED8" : "#CBD5E1", transition: "background 0.2s" }} />
        <div style={{ position: "absolute", top: 2, left: checked ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
      </div>
      <div>
        <div style={{ fontSize: 14, color: "#334155", fontWeight: 500 }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{hint}</div>}
      </div>
    </div>
  );
}

function Note({ tone = "info", Icon, children }) {
  const c = {
    info:  { bg: "#EFF6FF", br: "#BFDBFE", fg: "#1E40AF" },
    warn:  { bg: "#FFFBEB", br: "#FDE68A", fg: "#B45309" },
    ok:    { bg: "#F0FDF4", br: "#BBF7D0", fg: "#15803D" },
  }[tone];
  return (
    <div style={{
      background: c.bg, border: `1px solid ${c.br}`, borderRadius: 12,
      padding: "12px 16px", marginBottom: 20, fontSize: 12.5, color: c.fg,
      lineHeight: 1.65, display: "flex", gap: 10, alignItems: "flex-start",
    }}>
      {Icon && <Icon size={15} strokeWidth={2.2} style={{ marginTop: 1, flexShrink: 0 }} />}
      <div>{children}</div>
    </div>
  );
}

function SaveButton({ onClick, saving, saved }) {
  return (
    <button
      onClick={onClick} disabled={saving}
      style={{
        padding: "9px 22px", borderRadius: 8, border: "none",
        background: saving ? "#94A3B8" : saved ? "#15803D" : "#1D4ED8",
        color: "#fff", fontSize: 13, fontWeight: 600,
        cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit",
        display: "inline-flex", alignItems: "center", gap: 7,
      }}
    >
      {saved ? <Check size={14} strokeWidth={2.6} /> : <Save size={14} strokeWidth={2.2} />}
      {saving ? "Αποθήκευση..." : saved ? "Αποθηκεύτηκε" : "Αποθήκευση"}
    </button>
  );
}

// ─── ΕΠΙΛΟΓΕΣ ΕΠΙΒΟΛΗΣ ΣΥΝΔΡΟΜΗΣ ────────────────────────────────────────
const ENFORCEMENT_OPTIONS = [
  {
    id: "off",
    Icon: Eye,
    title: "Καμία επίπτωση",
    desc: "Οι θεραπευτές χωρίς ενεργή συνδρομή λειτουργούν κανονικά. Κατάλληλο για την αρχή, όσο χτίζεις το δίκτυο.",
  },
  {
    id: "no_new_requests",
    Icon: Ban,
    title: "Χωρίς νέα αιτήματα",
    desc: "Παραμένουν ορατοί στο site και ολοκληρώνουν τις τρέχουσες συνεδρίες, αλλά δεν λαμβάνουν νέα αιτήματα.",
  },
  {
    id: "hide",
    Icon: EyeOff,
    title: "Απόκρυψη από το site",
    desc: "Εξαφανίζονται εντελώς από αναζητήσεις και λίστες. Το πιο αυστηρό — χρησιμοποίησέ το όταν έχεις αρκετούς θεραπευτές.",
  },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    platform_name: "PhysioHome",
    email: "info@physiohome.gr",
    phone: "210-123-4567",
    address: "Αθήνα, Ελλάδα",
    commission: "3",
    revenue_model: "subscription",
    first_session_fee_default: "10",
    first_session_reset_months: "12",
    subscription_enforcement: "off",
    subscription_grace_days: "7",
    subscription_trial_days: "30",
    sla_hours: "4",
  });

  const [notifications, setNotifications] = useState({
    newRequest: true, newTherapist: true, newReview: true,
    paymentReceived: false, weeklyReport: true,
  });

  const [stats, setStats] = useState({ activeSubs: 0, mrr: 0, firstSessions: 0 });
  const [activeTab, setActiveTab] = useState("general");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState({ current: "", new: "", confirm: "" });
  const [currentEmail, setCurrentEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailSaved, setEmailSaved] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);

  useEffect(() => { fetchSettings(); fetchAuthEmail(); }, []);

  async function fetchAuthEmail() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) setCurrentEmail(user.email);
  }

  async function changeEmail() {
    if (!newEmail || newEmail === currentEmail) return;
    setEmailSaving(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) {
      alert("Σφάλμα: " + error.message);
    } else {
      setEmailSaved(true);
      setNewEmail("");
      setTimeout(() => setEmailSaved(false), 4000);
    }
    setEmailSaving(false);
  }

  async function changePassword() {
    if (password.new !== password.confirm || !password.new) return;
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: password.new });
    if (error) {
      alert("Σφάλμα: " + error.message);
    } else {
      setPwSaved(true);
      setPassword({ current: "", new: "", confirm: "" });
      setTimeout(() => setPwSaved(false), 2000);
    }
    setPwSaving(false);
  }

  async function fetchSettings() {
    setLoading(true);

    const [{ data }, { data: subs }, { data: plans }, { data: pays }] = await Promise.all([
      supabase.from("platform_settings").select("*"),
      supabase.from("therapist_subscriptions").select("plan_id, price_locked, status"),
      supabase.from("subscription_plans").select("id, price_monthly"),
      supabase.from("payments").select("id, fee_type"),
    ]);

    if (data) {
      const s = {};
      data.forEach((row) => { s[row.key] = row.value; });
      setSettings((prev) => ({ ...prev, ...s }));
    }

    const planMap = {};
    (plans || []).forEach((p) => { planMap[p.id] = p; });
    const active = (subs || []).filter((s) => ["active", "trialing", "past_due"].includes(s.status));

    setStats({
      activeSubs: active.length,
      mrr: active.reduce((a, s) => a + num(s.price_locked ?? planMap[s.plan_id]?.price_monthly), 0),
      firstSessions: (pays || []).filter((p) => p.fee_type === "first_session").length,
    });

    setLoading(false);
  }

  async function saveSettings() {
    setSaving(true);
    const upserts = Object.entries(settings).map(([key, value]) => ({
      key, value: String(value), updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from("platform_settings").upsert(upserts, { onConflict: "key" });

    if (error) {
      alert("Σφάλμα: " + error.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  }

  const upd = (key, val) => setSettings((prev) => ({ ...prev, [key]: val }));

  const TABS = [
    { id: "general",       label: "Γενικές",       Icon: SlidersHorizontal },
    { id: "revenue",       label: "Έσοδα",         Icon: Repeat },
    { id: "notifications", label: "Ειδοποιήσεις",  Icon: Bell },
    { id: "account",       label: "Λογαριασμός",   Icon: User },
  ];

  if (loading) {
    return (
      <div style={{ padding: 24, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <div style={{ fontSize: 16, color: "#64748B" }}>Φόρτωση ρυθμίσεων...</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0F172A", margin: 0 }}>Ρυθμίσεις</h1>
        <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>Διαχείριση πλατφόρμας</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: "#E2E8F0", padding: 4, borderRadius: 10, width: "fit-content", marginBottom: 24, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button
            key={t.id} onClick={() => setActiveTab(t.id)}
            style={{
              padding: "8px 18px", borderRadius: 7, border: "none", fontSize: 13, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
              background: activeTab === t.id ? "#fff" : "transparent",
              color: activeTab === t.id ? "#0F172A" : "#64748B",
              boxShadow: activeTab === t.id ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              display: "inline-flex", alignItems: "center", gap: 7,
            }}
          >
            <t.Icon size={14} strokeWidth={2.2} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ ΓΕΝΙΚΕΣ ══════════════════════════════════════════════════════ */}
      {activeTab === "general" && (
        <Section title="Γενικές Ρυθμίσεις">
          <Note tone="info" Icon={Info}>
            Οι αλλαγές εδώ ενημερώνουν αυτόματα το Footer, τα στοιχεία επικοινωνίας
            και όλες τις σελίδες του site.
          </Note>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Όνομα Πλατφόρμας">
              <Input value={settings.platform_name} onChange={(e) => upd("platform_name", e.target.value)} />
            </Field>
            <Field label="Email Επικοινωνίας">
              <Input type="email" value={settings.email} onChange={(e) => upd("email", e.target.value)} />
            </Field>
            <Field label="Τηλέφωνο">
              <Input value={settings.phone} onChange={(e) => upd("phone", e.target.value)} />
            </Field>
            <Field label="Διεύθυνση">
              <Input value={settings.address} onChange={(e) => upd("address", e.target.value)} />
            </Field>
          </div>

          <Field label="Χρόνος απάντησης θεραπευτή (ώρες)" hint="Το SLA ξεκινά μόλις σταλεί η ειδοποίηση, όχι με την ανάθεση.">
            <div style={{ maxWidth: 140 }}>
              <Input type="number" min={1} max={72} value={settings.sla_hours} onChange={(e) => upd("sla_hours", e.target.value)} />
            </div>
          </Field>

          <SaveButton onClick={saveSettings} saving={saving} saved={saved} />
        </Section>
      )}

      {/* ══ ΕΣΟΔΑ ════════════════════════════════════════════════════════ */}
      {activeTab === "revenue" && (
        <div>
          {/* Στατιστικά */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 20 }}>
            {[
              { Icon: TrendingUp, label: "Μηνιαία έσοδα", value: `${stats.mrr}€`, color: "#15803D" },
              { Icon: Repeat, label: "Ενεργές συνδρομές", value: stats.activeSubs, color: "#1D4ED8" },
              { Icon: Check, label: "Πρώτες συνεδρίες", value: stats.firstSessions, color: "#1D4ED8" },
            ].map((s, i) => (
              <div key={i} style={{ background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0", padding: "16px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <s.Icon size={14} color={s.color} strokeWidth={2.2} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {s.label}
                  </span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#0F172A", lineHeight: 1 }}>{s.value}</div>
              </div>
            ))}
          </div>

          <Section title="Μοντέλο Εσόδων" subtitle="Πώς βγάζει χρήματα η πλατφόρμα">
            <Note tone="info" Icon={Info}>
              <strong>Ενεργό μοντέλο:</strong> μηνιαία συνδρομή θεραπευτή + εφάπαξ προμήθεια
              στην πρώτη συνεδρία κάθε νέου ασθενή. Τα πακέτα συνδρομής τα διαχειρίζεσαι
              από τη σελίδα <strong>Συνδρομές</strong>.
            </Note>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Προμήθεια 1ης συνεδρίας (€)" hint="Ισχύει όταν το πακέτο του θεραπευτή δεν ορίζει δικό του ποσό.">
                <Input type="number" min={0} step="0.5" value={settings.first_session_fee_default}
                  onChange={(e) => upd("first_session_fee_default", e.target.value)} />
              </Field>
              <Field label="Επανα-χρέωση μετά από (μήνες)" hint="Αν ο ασθενής επιστρέψει στον ίδιο θεραπευτή μετά από τόσους μήνες αδράνειας, χρεώνεται ξανά ως πρώτη φορά.">
                <Input type="number" min={1} max={60} value={settings.first_session_reset_months}
                  onChange={(e) => upd("first_session_reset_months", e.target.value)} />
              </Field>
            </div>

            <Note tone="ok" Icon={Check}>
              Με {num(settings.first_session_fee_default)}€ ανά νέο ζεύγος ασθενή-θεραπευτή:
              <strong> {num(settings.first_session_fee_default) * 40}€/μήνα</strong> στα 40 νέα ζεύγη,
              συν <strong>{stats.mrr}€</strong> από συνδρομές.
            </Note>

            <SaveButton onClick={saveSettings} saving={saving} saved={saved} />
          </Section>

          <Section title="Επιβολή Συνδρομής" subtitle="Τι συμβαίνει σε θεραπευτή χωρίς ενεργή συνδρομή">
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {ENFORCEMENT_OPTIONS.map((opt) => {
                const active = settings.subscription_enforcement === opt.id;
                return (
                  <div key={opt.id} onClick={() => upd("subscription_enforcement", opt.id)}
                    style={{
                      padding: "14px 18px", borderRadius: 12, cursor: "pointer",
                      border: `2px solid ${active ? "#1D4ED8" : "#E2E8F0"}`,
                      background: active ? "#EFF6FF" : "#fff",
                      display: "flex", gap: 14, alignItems: "flex-start",
                    }}>
                    <opt.Icon size={17} color={active ? "#1D4ED8" : "#94A3B8"} strokeWidth={2.2} style={{ marginTop: 2, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 3 }}>{opt.title}</div>
                      <div style={{ fontSize: 12.5, color: "#64748B", lineHeight: 1.6 }}>{opt.desc}</div>
                    </div>
                    {active && <Check size={17} color="#1D4ED8" strokeWidth={2.6} style={{ marginTop: 2 }} />}
                  </div>
                );
              })}
            </div>

            {settings.subscription_enforcement === "hide" && (
              <Note tone="warn" Icon={AlertTriangle}>
                Προσοχή: με λίγους θεραπευτές, η απόκρυψη μπορεί να αφήσει ολόκληρες περιοχές
                χωρίς κάλυψη. Έλεγξε πρώτα πόσοι έχουν ενεργή συνδρομή ανά περιοχή.
              </Note>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Ημέρες χάριτος" hint="Μετά τη λήξη, πριν εφαρμοστεί η επιβολή.">
                <Input type="number" min={0} max={90} value={settings.subscription_grace_days}
                  onChange={(e) => upd("subscription_grace_days", e.target.value)} />
              </Field>
              <Field label="Δωρεάν δοκιμή (ημέρες)" hint="Για νέους θεραπευτές μετά την έγκριση.">
                <Input type="number" min={0} max={365} value={settings.subscription_trial_days}
                  onChange={(e) => upd("subscription_trial_days", e.target.value)} />
              </Field>
            </div>

            <SaveButton onClick={saveSettings} saving={saving} saved={saved} />
          </Section>

          <Section title="Παλαιό Μοντέλο" subtitle="Διατηρείται μόνο για ιστορικά δεδομένα">
            <Note tone="warn" Icon={Clock}>
              Η σταθερή προμήθεια ανά περιστατικό <strong>δεν χρησιμοποιείται πλέον</strong> για νέες
              συνεδρίες. Οι παλιές πληρωμές έχουν σημανθεί ως <strong>legacy</strong> και παραμένουν
              αμετάβλητες στη σελίδα Πληρωμές.
            </Note>
            <Field label="Παλιά προμήθεια ανά περιστατικό (€)">
              <div style={{ maxWidth: 140 }}>
                <Input type="number" min={0} value={settings.commission} onChange={(e) => upd("commission", e.target.value)} />
              </div>
            </Field>
            <SaveButton onClick={saveSettings} saving={saving} saved={saved} />
          </Section>
        </div>
      )}

      {/* ══ ΕΙΔΟΠΟΙΗΣΕΙΣ ═════════════════════════════════════════════════ */}
      {activeTab === "notifications" && (
        <Section title="Email Ειδοποιήσεις">
          <div style={{ maxWidth: 440 }}>
            <p style={{ fontSize: 13, color: "#64748B", marginBottom: 20 }}>
              Emails στο <strong>{settings.email}</strong>
            </p>
            <Toggle checked={notifications.newRequest}      onChange={() => setNotifications((p) => ({ ...p, newRequest: !p.newRequest }))}           label="Νέο αίτημα ασθενή" />
            <Toggle checked={notifications.newTherapist}    onChange={() => setNotifications((p) => ({ ...p, newTherapist: !p.newTherapist }))}       label="Νέα εγγραφή θεραπευτή" />
            <Toggle checked={notifications.newReview}       onChange={() => setNotifications((p) => ({ ...p, newReview: !p.newReview }))}             label="Νέα αξιολόγηση" />
            <Toggle checked={notifications.paymentReceived} onChange={() => setNotifications((p) => ({ ...p, paymentReceived: !p.paymentReceived }))} label="Εισπραγμένη πληρωμή" />
            <Toggle checked={notifications.weeklyReport}    onChange={() => setNotifications((p) => ({ ...p, weeklyReport: !p.weeklyReport }))}       label="Εβδομαδιαία αναφορά" />
            <div style={{ marginTop: 8 }}>
              <SaveButton onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }} saving={false} saved={saved} />
            </div>
          </div>
        </Section>
      )}

      {/* ══ ΛΟΓΑΡΙΑΣΜΟΣ ══════════════════════════════════════════════════ */}
      {activeTab === "account" && (
        <div>
          {/* Email / Username εισόδου */}
          <Section title="Email Εισόδου (Username)" subtitle="Το email με το οποίο συνδέεσαι στο admin">
            <Note tone="info" Icon={Mail}>
              Το τρέχον email εισόδου είναι <strong>{currentEmail || "—"}</strong>.
            </Note>

            <Note tone="warn" Icon={AlertTriangle}>
              Για ασφάλεια, το Supabase στέλνει <strong>link επιβεβαίωσης</strong> στο νέο email
              (και ενδεχομένως και στο παλιό). Η αλλαγή ολοκληρώνεται <strong>μόνο αφού πατήσεις
              το link</strong>. Μέχρι τότε, συνδέεσαι με το παλιό email.
            </Note>

            <div style={{ maxWidth: 400 }}>
              <Field label="Νέο Email Εισόδου">
                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="new@email.gr" />
              </Field>
              {newEmail && newEmail === currentEmail && (
                <div style={{ fontSize: 12, color: "#B45309", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertTriangle size={13} strokeWidth={2.2} />
                  Το νέο email είναι ίδιο με το τρέχον
                </div>
              )}
              {emailSaved && (
                <div style={{ fontSize: 12, color: "#15803D", marginBottom: 12, display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                  <Check size={13} strokeWidth={2.6} />
                  Στάλθηκε link επιβεβαίωσης — έλεγξε το email σου
                </div>
              )}
              <SaveButton onClick={changeEmail} saving={emailSaving} saved={emailSaved} />
            </div>
          </Section>

          {/* Password */}
          <Section title="Αλλαγή Password" subtitle="Ο κωδικός εισόδου στο admin">
            <div style={{ maxWidth: 400 }}>
              <Field label="Νέο Password" hint="Τουλάχιστον 6 χαρακτήρες.">
                <Input type="password" value={password.new} onChange={(e) => setPassword((p) => ({ ...p, new: e.target.value }))} placeholder="••••••••" />
              </Field>
              <Field label="Επιβεβαίωση Νέου Password">
                <Input type="password" value={password.confirm} onChange={(e) => setPassword((p) => ({ ...p, confirm: e.target.value }))} placeholder="••••••••" />
              </Field>
              {password.new && password.confirm && password.new !== password.confirm && (
                <div style={{ fontSize: 12, color: "#BE123C", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertTriangle size={13} strokeWidth={2.2} />
                  Τα passwords δεν ταιριάζουν
                </div>
              )}
              {password.new && password.new.length > 0 && password.new.length < 6 && (
                <div style={{ fontSize: 12, color: "#B45309", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertTriangle size={13} strokeWidth={2.2} />
                  Πολύ σύντομος κωδικός (τουλάχιστον 6 χαρακτήρες)
                </div>
              )}
              <SaveButton onClick={changePassword} saving={pwSaving} saved={pwSaved} />
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}