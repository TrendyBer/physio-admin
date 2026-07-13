"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  AlertTriangle, UserX, UserCheck, CreditCard, Star, CalendarX,
  FileWarning, CheckCircle2, ArrowRight, RefreshCw, Banknote, ShieldAlert,
} from "lucide-react";

// Καταστάσεις πληρωμής που θεωρούνται "εισπραγμένες"
const COLLECTED = ["paid", "pending_payout", "paid_out"];
const isCancelled = (s) => (s || "").startsWith("cancelled");

// ─── ΟΡΙΣΜΟΙ TASK GROUPS ────────────────────────────────────────────────
const GROUPS = [
  {
    id: "unassigned",
    label: "Αιτήματα χωρίς θεραπευτή",
    hint: "Νέα αιτήματα που δεν έχουν ανατεθεί σε κανέναν",
    Icon: UserX,
    color: "#B45309", bg: "#FFFBEB", border: "#FDE68A",
    goTo: "requests",
  },
  {
    id: "pending_therapists",
    label: "Θεραπευτές σε αναμονή έγκρισης",
    hint: "Έχουν υποβάλει αίτηση και περιμένουν έλεγχο",
    Icon: UserCheck,
    color: "#1D4ED8", bg: "#EFF6FF", border: "#BFDBFE",
    goTo: "therapists",
  },
  {
    id: "unverified_license",
    label: "Άδειες που δεν έχουν ελεγχθεί",
    hint: "Ανεβασμένες άδειες που περιμένουν επιβεβαίωση από admin",
    Icon: ShieldAlert,
    color: "#0891B2", bg: "#ECFEFF", border: "#A5F3FC",
    goTo: "therapists",
  },
  {
    id: "overdue",
    label: "Ληξιπρόθεσμες προμήθειες (30+ ημέρες)",
    hint: "Απλήρωτες για πάνω από έναν μήνα — χρειάζονται επικοινωνία",
    Icon: AlertTriangle,
    color: "#BE123C", bg: "#FFF1F2", border: "#FECDD3",
    goTo: "payments",
  },
  {
    id: "unpaid",
    label: "Απλήρωτες προμήθειες",
    hint: "Προμήθειες που δεν έχουν εισπραχθεί ακόμα",
    Icon: CreditCard,
    color: "#B45309", bg: "#FFFBEB", border: "#FDE68A",
    goTo: "payments",
  },
  {
    id: "pending_payout",
    label: "Εκκρεμείς πληρωμές προς θεραπευτές",
    hint: "Η προμήθεια εισπράχθηκε — μένει να πληρωθεί ο θεραπευτής",
    Icon: Banknote,
    color: "#4338CA", bg: "#EEF2FF", border: "#C7D2FE",
    goTo: "payments",
  },
  {
    id: "bad_reviews",
    label: "Αξιολογήσεις κάτω από 3 αστέρια",
    hint: "Χρειάζονται έλεγχο ή επικοινωνία με τον ασθενή",
    Icon: Star,
    color: "#C2410C", bg: "#FFF7ED", border: "#FED7AA",
    goTo: "reviews",
  },
  {
    id: "confirmed_no_sessions",
    label: "Επιβεβαιωμένα χωρίς προγραμματισμένη συνεδρία",
    hint: "Έχουν επιβεβαιωθεί αλλά δεν υπάρχει ημερομηνία",
    Icon: CalendarX,
    color: "#7E22CE", bg: "#FAF5FF", border: "#E9D5FF",
    goTo: "requests",
  },
  {
    id: "incomplete_therapists",
    label: "Θεραπευτές με ελλιπές προφίλ",
    hint: "Λείπουν υποχρεωτικά στοιχεία από το checklist",
    Icon: FileWarning,
    color: "#475569", bg: "#F8FAFC", border: "#E2E8F0",
    goTo: "therapists",
  },
];

const STATUS_MAP = {
  pending:   { label: "Εκκρεμές",      bg: "#FEF3C7", color: "#92400E" },
  confirmed: { label: "Επιβεβαιωμένο", bg: "#DBEAFE", color: "#1D4ED8" },
  completed: { label: "Ολοκληρώθηκε",  bg: "#D1FAE5", color: "#065F46" },
  cancelled: { label: "Ακυρώθηκε",     bg: "#FFE4E6", color: "#9F1239" },
};

function Badge({ label, bg, color }) {
  return (
    <span style={{ background: bg, color, padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("el-GR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function daysAgo(d) {
  if (!d) return 0;
  return Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24));
}

export default function TasksPage({ onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    unassigned: [],
    pending_therapists: [],
    unverified_license: [],
    overdue: [],
    unpaid: [],
    pending_payout: [],
    bad_reviews: [],
    confirmed_no_sessions: [],
    incomplete_therapists: [],
  });
  const [open, setOpen] = useState(null);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);

    const [
      { data: reqs },
      { data: therapists },
      { data: patients },
      { data: bookings },
      { data: reviews },
      { data: payments },
    ] = await Promise.all([
      supabase.from("session_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("therapist_profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("patient_profiles").select("id, name"),
      supabase.from("session_bookings").select("id, request_id, session_date, status"),
      supabase.from("reviews").select("id, therapist_id, rating, comment, created_at, is_published").order("created_at", { ascending: false }),
      supabase.from("payments").select("*").order("created_at", { ascending: false }),
    ]);

    const patientMap = {};
    (patients || []).forEach(p => { patientMap[p.id] = p.name; });

    const therapistMap = {};
    (therapists || []).forEach(t => { therapistMap[t.id] = t; });

    const bookingsByRequest = {};
    (bookings || []).forEach(b => {
      if (!bookingsByRequest[b.request_id]) bookingsByRequest[b.request_id] = [];
      bookingsByRequest[b.request_id].push(b);
    });

    const enrichedReqs = (reqs || []).map(r => ({
      ...r,
      patient_name: patientMap[r.patient_id] || "Άγνωστο",
      therapist_name: therapistMap[r.therapist_id]?.name || null,
      bookings: bookingsByRequest[r.id] || [],
    }));

    // Κανονικοποίηση πληρωμών (legacy rows χωρίς status)
    const pays = (payments || []).map(p => {
      const req = enrichedReqs.find(r => r.id === p.request_id);
      return {
        ...p,
        status: p.status || (p.paid ? "paid" : "unpaid"),
        amount: Number(p.amount) || 0,
        therapist_name: therapistMap[p.therapist_id]?.name || "Άγνωστος θεραπευτής",
        patient: p.patient_name || req?.patient_name || "Άγνωστος",
        age: daysAgo(p.created_at),
      };
    });

    // 1. Αιτήματα χωρίς θεραπευτή
    const unassigned = enrichedReqs.filter(
      r => !r.therapist_id && !isCancelled(r.status) && r.status !== "completed"
    );

    // 2. Θεραπευτές σε αναμονή έγκρισης
    const pending_therapists = (therapists || []).filter(
      t => !t.is_approved && t.application_status === "pending"
    );

    // 3. Άδειες ανεβασμένες αλλά μη ελεγμένες
    const unverified_license = (therapists || []).filter(
      t => t.license_url && !t.license_verified
    );

    // 4/5. Απλήρωτες προμήθειες — ΑΠΟ ΤΟΝ ΠΙΝΑΚΑ payments
    const openPays = pays.filter(
      p => !COLLECTED.includes(p.status) && p.status !== "refunded"
    );
    const overdue = openPays.filter(p => p.age >= 30);
    const unpaid = openPays.filter(p => p.age < 30);

    // 6. Εκκρεμείς πληρωμές προς θεραπευτές
    const pending_payout = pays.filter(p => p.status === "pending_payout");

    // 7. Κακές αξιολογήσεις
    const bad_reviews = (reviews || [])
      .filter(rv => rv.rating < 3)
      .map(rv => ({ ...rv, therapist_name: therapistMap[rv.therapist_id]?.name || "Άγνωστος" }));

    // 8. Επιβεβαιωμένα χωρίς συνεδρία
    const confirmed_no_sessions = enrichedReqs.filter(
      r => r.status === "confirmed" && r.bookings.length === 0
    );

    // 9. Ελλιπή προφίλ — ίδια υποχρεωτικά με το checklist του TherapistsPage
    const incomplete_therapists = (therapists || []).map(t => {
      const missingList = [];
      if (!t.name) missingList.push("Ονοματεπώνυμο");
      if (!t.license_url) missingList.push("Άδεια ασκήσεως");
      if (!t.license_verified) missingList.push("Έλεγχος άδειας");
      if (!t.specialty) missingList.push("Ειδικότητα");
      if (!t.area && (!t.service_areas || t.service_areas.length === 0)) missingList.push("Περιοχές");
      if (!Number(t.price_per_session)) missingList.push("Τιμή συνεδρίας");
      if (!t.email || !t.phone) missingList.push("Επικοινωνία");
      return { ...t, missingList };
    }).filter(t => t.missingList.length > 0 && t.application_status !== "rejected");

    setData({
      unassigned, pending_therapists, unverified_license,
      overdue, unpaid, pending_payout,
      bad_reviews, confirmed_no_sessions, incomplete_therapists,
    });
    setLoading(false);
  }

  const totalTasks = Object.values(data).reduce((s, arr) => s + arr.length, 0);

  // ─── RENDER ROWS ──────────────────────────────────────────────────────
  function renderRows(groupId) {
    const items = data[groupId] || [];

    // Αιτήματα
    if (groupId === "unassigned" || groupId === "confirmed_no_sessions") {
      return items.map(r => {
        const st = STATUS_MAP[r.status] || STATUS_MAP.pending;
        const age = daysAgo(r.created_at);
        return (
          <div key={r.id} style={rowStyle}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: "#0F172A" }}>{r.patient_name}</span>
                <Badge label={st.label} bg={st.bg} color={st.color} />
                {age >= 2 && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#BE123C", background: "#FFF1F2", padding: "2px 8px", borderRadius: 999, border: "1px solid #FECDD3" }}>
                    {age} μέρες
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: "#64748B" }}>
                {r.problem_type || r.problem_description || "Χωρίς περιγραφή"}
                {r.area ? ` · ${r.area}` : ""}
              </div>
              <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{fmtDate(r.created_at)}</div>
            </div>
            {r.therapist_name && (
              <span style={{ fontSize: 12, color: "#7E22CE", fontWeight: 600, flexShrink: 0 }}>{r.therapist_name}</span>
            )}
          </div>
        );
      });
    }

    // Πληρωμές
    if (groupId === "overdue" || groupId === "unpaid" || groupId === "pending_payout") {
      return items.map(p => (
        <div key={p.id} style={rowStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: "#0F172A" }}>{p.therapist_name}</span>
              {p.age >= 30 && (
                <span style={{ fontSize: 11, fontWeight: 700, color: "#BE123C", background: "#FFF1F2", padding: "2px 8px", borderRadius: 999, border: "1px solid #FECDD3" }}>
                  {p.age} ημέρες
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: "#64748B" }}>Ασθενής: {p.patient}</div>
            <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{fmtDate(p.created_at)}</div>
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#0F172A", flexShrink: 0 }}>
            {groupId === "pending_payout" ? `${Number(p.therapist_net) || 0}€` : `${p.amount}€`}
          </span>
        </div>
      ));
    }

    // Θεραπευτές σε αναμονή
    if (groupId === "pending_therapists") {
      return items.map(t => (
        <div key={t.id} style={rowStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A", marginBottom: 3 }}>{t.name || "—"}</div>
            <div style={{ fontSize: 12, color: "#64748B" }}>
              {t.specialty || "Χωρίς ειδικότητα"}{t.area ? ` · ${t.area}` : ""}
            </div>
            <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>Αίτηση: {fmtDate(t.created_at)}</div>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 700, flexShrink: 0,
            color: t.license_url ? "#15803D" : "#B45309",
            background: t.license_url ? "#F0FDF4" : "#FFFBEB",
            border: `1px solid ${t.license_url ? "#BBF7D0" : "#FDE68A"}`,
            padding: "3px 10px", borderRadius: 999,
          }}>
            {t.license_url ? "Άδεια ανεβασμένη" : "Χωρίς άδεια"}
          </span>
        </div>
      ));
    }

    // Ανεπιβεβαίωτες άδειες
    if (groupId === "unverified_license") {
      return items.map(t => (
        <div key={t.id} style={rowStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A", marginBottom: 3 }}>{t.name || "—"}</div>
            <div style={{ fontSize: 12, color: "#64748B" }}>
              {t.specialty || "—"}{t.area ? ` · ${t.area}` : ""}
            </div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#0891B2", background: "#ECFEFF", border: "1px solid #A5F3FC", padding: "3px 10px", borderRadius: 999, flexShrink: 0 }}>
            Θέλει έλεγχο
          </span>
        </div>
      ));
    }

    // Κακές αξιολογήσεις
    if (groupId === "bad_reviews") {
      return items.map(rv => (
        <div key={rv.id} style={rowStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: "#0F172A" }}>{rv.therapist_name}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#BE123C" }}>{rv.rating}/5</span>
              {!rv.is_published && <Badge label="Μη δημοσιευμένη" bg="#F1F5F9" color="#475569" />}
            </div>
            {rv.comment && (
              <div style={{ fontSize: 12, color: "#64748B", fontStyle: "italic" }}>{rv.comment}</div>
            )}
            <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{fmtDate(rv.created_at)}</div>
          </div>
        </div>
      ));
    }

    // Ελλιπή προφίλ
    if (groupId === "incomplete_therapists") {
      return items.map(t => (
        <div key={t.id} style={rowStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: "#0F172A" }}>{t.name || "—"}</span>
              {t.is_approved && <Badge label="Εγκεκριμένος" bg="#D1FAE5" color="#065F46" />}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {t.missingList.map(m => (
                <span key={m} style={{ fontSize: 11, color: "#B45309", background: "#FFFBEB", border: "1px solid #FDE68A", padding: "2px 8px", borderRadius: 999, fontWeight: 600 }}>
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      ));
    }

    return null;
  }

  if (loading) {
    return (
      <div style={{ padding: 24, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <div style={{ fontSize: 16, color: "#64748B" }}>Έλεγχος εκκρεμοτήτων...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0F172A", margin: 0 }}>Χρειάζονται Ενέργεια</h1>
          <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>
            Ό,τι εκκρεμεί αυτή τη στιγμή στην πλατφόρμα, σε ένα σημείο.
          </p>
        </div>
        <button onClick={fetchAll}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "1px solid #E2E8F0", background: "#fff", color: "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
          <RefreshCw size={14} />
          Ανανέωση
        </button>
      </div>

      {totalTasks === 0 ? (
        <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 16, padding: "48px 32px", textAlign: "center" }}>
          <CheckCircle2 size={40} color="#15803D" strokeWidth={1.8} style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 18, fontWeight: 700, color: "#065F46", marginBottom: 6 }}>Όλα καθαρά</div>
          <div style={{ fontSize: 14, color: "#15803D" }}>Δεν υπάρχουν εκκρεμότητες αυτή τη στιγμή.</div>
        </div>
      ) : (
        <>
          {/* Σύνοψη */}
          <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12, padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
            <AlertTriangle size={20} color="#B45309" strokeWidth={2.2} />
            <div style={{ fontSize: 14, color: "#92400E" }}>
              <strong>{totalTasks}</strong> {totalTasks === 1 ? "εκκρεμότητα" : "εκκρεμότητες"} συνολικά
            </div>
            {data.overdue.length > 0 && (
              <div style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: "#BE123C", background: "#FFF1F2", border: "1px solid #FECDD3", padding: "4px 12px", borderRadius: 999 }}>
                {data.overdue.length} ληξιπρόθεσμες
              </div>
            )}
          </div>

          {/* Groups */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {GROUPS.map(g => {
              const items = data[g.id] || [];
              const count = items.length;
              const isOpen = open === g.id;
              const GIcon = g.Icon;

              return (
                <div key={g.id} style={{
                  background: "#fff",
                  border: `1px solid ${count > 0 ? g.border : "#E2E8F0"}`,
                  borderRadius: 14,
                  overflow: "hidden",
                  opacity: count === 0 ? 0.55 : 1,
                }}>
                  <div
                    onClick={() => count > 0 && setOpen(isOpen ? null : g.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "16px 20px",
                      cursor: count > 0 ? "pointer" : "default",
                      background: count > 0 ? g.bg : "#fff",
                    }}
                  >
                    <div style={{
                      width: 38, height: 38, borderRadius: 10,
                      background: "#fff", border: `1px solid ${g.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <GIcon size={18} color={count > 0 ? g.color : "#94A3B8"} strokeWidth={2} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 2 }}>{g.label}</div>
                      <div style={{ fontSize: 12, color: "#64748B" }}>{g.hint}</div>
                    </div>

                    <div style={{
                      fontSize: 20, fontWeight: 700, flexShrink: 0,
                      color: count > 0 ? g.color : "#CBD5E1",
                      minWidth: 32, textAlign: "right",
                    }}>
                      {count}
                    </div>

                    {count > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onNavigate && onNavigate(g.goTo); }}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          padding: "6px 14px", borderRadius: 8,
                          border: `1px solid ${g.border}`, background: "#fff",
                          color: g.color, fontSize: 12, fontWeight: 700,
                          cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
                        }}>
                        Άνοιγμα
                        <ArrowRight size={13} />
                      </button>
                    )}
                  </div>

                  {isOpen && count > 0 && (
                    <div style={{ borderTop: `1px solid ${g.border}` }}>
                      {renderRows(g.id)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

const rowStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: 12,
  padding: "12px 20px",
  borderBottom: "1px solid #F1F5F9",
};