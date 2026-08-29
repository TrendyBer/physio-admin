"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  Search, X, Mail, Phone, MapPin, Home, Calendar, Download, Save,
  Ban, CheckCircle2, AlertTriangle, User, ClipboardList, StickyNote,
  Tag, Clock, ShieldOff, Star, Euro, Trash2, Plus,
} from "lucide-react";
import { exportToCsv, csvDate } from "../lib/exportCsv";

/*
  ΑΣΘΕΝΕΙΣ

  Το email ΔΕΝ υπάρχει στο patient_profiles — ζει στο auth.users.
  Έρχεται μέσω της admin_get_user_contacts (admin-only RPC).
  Αν λείπει το migration, η σελίδα δουλεύει κανονικά, απλά χωρίς emails.

  Η διεύθυνση εμφανίζεται ΜΟΝΟ εδώ. Δημόσια δεν φαίνεται πουθενά —
  ο θεραπευτής τη βλέπει μόνο αφού αποδεχτεί το αίτημα.
*/

const SUPPORT_TAGS = [
  "Επείγον", "Θέλει follow-up", "Πρόβλημα πληρωμής", "Παράπονο",
  "VIP", "Χρειάζεται τηλεφώνημα", "Πολλές ακυρώσεις", "Ύποπτη δραστηριότητα",
];

const num = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v));

// ── ΔΥΝΑΜΙΚΑ ΠΕΔΙΑ ΕΠΙΚΟΙΝΩΝΙΑΣ ──
// Δεν γράφουμε λίστα με σταθερά πεδία: αν αύριο προστεθεί στήλη στο
// patient_profiles, θα εμφανιστεί εδώ ΜΟΝΗ ΤΗΣ. Αλλιώς κάθε νέο πεδίο
// θα ήταν αόρατο στο admin μέχρι να το θυμηθεί κάποιος.
const CONTACT_ORDER = [
  "email", "phone", "mobile", "telephone", "phone2",
  "emergency_contact", "emergency_phone",
  "address", "area", "region", "city", "postal_code", "zip", "zip_code",
  "date_of_birth", "birth_date", "gender", "notes",
];

const CONTACT_EXCLUDE = new Set([
  "id", "user_id", "auth_id", "created_at", "updated_at",
  "support_tags", "admin_comment", "name", "full_name",
  "is_blocked", "blocked_reason", "photo_url", "avatar_url",
]);

const FIELD_LABELS = {
  email: "Email", phone: "Τηλέφωνο", phone2: "Τηλέφωνο 2",
  mobile: "Κινητό", telephone: "Τηλέφωνο",
  emergency_contact: "Επαφή έκτακτης ανάγκης", emergency_phone: "Τηλέφωνο έκτακτης ανάγκης",
  address: "Διεύθυνση", area: "Περιοχή", region: "Περιοχή", city: "Πόλη",
  postal_code: "Τ.Κ.", zip: "Τ.Κ.", zip_code: "Τ.Κ.",
  date_of_birth: "Ημ. γέννησης", birth_date: "Ημ. γέννησης",
  gender: "Φύλο", notes: "Σημειώσεις ασθενή",
};

const cmPretty = (k) => FIELD_LABELS[k] || k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const cmShowable = (v) => v !== null && v !== undefined && v !== "" && typeof v !== "object" && typeof v !== "boolean";

function buildContactRows(rec) {
  if (!rec) return [];
  const known = new Set(CONTACT_ORDER);
  const ordered = CONTACT_ORDER.filter((k) => cmShowable(rec[k])).map((k) => [cmPretty(k), String(rec[k])]);
  const extra = Object.keys(rec)
    .filter((k) => !CONTACT_EXCLUDE.has(k) && !known.has(k) && cmShowable(rec[k]))
    .map((k) => [cmPretty(k), String(rec[k])]);
  return [...ordered, ...extra];
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("el-GR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("el-GR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const isCancelled = (s) => String(s || "").startsWith("cancelled");

const STATUS = {
  pending:   { label: "Εκκρεμεί",      bg: "#FEF3C7", color: "#92400E" },
  confirmed: { label: "Επιβεβαιωμένο", bg: "#DBEAFE", color: "#1D4ED8" },
  completed: { label: "Ολοκληρώθηκε",  bg: "#EDE9FE", color: "#5B21B6" },
  cancelled: { label: "Ακυρώθηκε",     bg: "#FFE4E6", color: "#9F1239" },
};
function statusMeta(s) {
  return STATUS[isCancelled(s) ? "cancelled" : s] || STATUS.pending;
}

function Avatar({ name, size = 46 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "#F0FDF4", color: "#15803D",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.34, fontWeight: 700, flexShrink: 0,
    }}>
      {(name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
    </div>
  );
}

function Badge({ label, bg, color, Icon }) {
  return (
    <span style={{ background: bg, color, padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
      {Icon && <Icon size={11} strokeWidth={2.5} />}
      {label}
    </span>
  );
}

function Panel({ title, Icon, children, accent }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${accent || "#E2E8F0"}`, borderRadius: 14, padding: "18px 20px", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        {Icon && <Icon size={15} color="#64748B" strokeWidth={2} />}
        <span style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function Row({ label, value, mono, last, copyable }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 14, padding: "9px 0", borderBottom: last ? "none" : "1px solid #F1F5F9", fontSize: 13.5 }}>
      <span style={{ color: "#64748B", flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: 600, color: "#0F172A", textAlign: "right", wordBreak: "break-word", fontFamily: mono ? "ui-monospace, monospace" : "inherit" }}>
        {value}
      </span>
    </div>
  );
}

function ActionBtn({ children, onClick, disabled, bg, color, border, Icon }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        padding: "9px 18px", borderRadius: 8,
        border: border ? `1.5px solid ${border}` : "none",
        background: bg, color, fontSize: 12.5, fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit", opacity: disabled ? 0.6 : 1,
        display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
      }}>
      {Icon && <Icon size={14} />}
      {children}
    </button>
  );
}

function Empty({ text }) {
  return (
    <div style={{ background: "#fff", border: "1px dashed #E2E8F0", borderRadius: 14, padding: "40px 24px", textAlign: "center", color: "#94A3B8", fontSize: 13.5 }}>
      {text}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
function PatientDrawer({ patient, contact, requests, bookings, therapists, reviews, payments, onClose, onRefresh }) {
  const [tab, setTab] = useState("overview");
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [comment, setComment] = useState(patient.admin_comment || "");
  const [tags, setTags] = useState(patient.support_tags || []);
  const [showBlock, setShowBlock] = useState(false);
  const [blockReason, setBlockReason] = useState("");

  useEffect(() => {
    setComment(patient.admin_comment || "");
    setTags(patient.support_tags || []);
    loadNotes();
  }, [patient.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadNotes() {
    const { data } = await supabase
      .from("patient_notes")
      .select("*")
      .eq("patient_id", patient.id)
      .order("created_at", { ascending: false });
    setNotes(data || []);
  }

  async function addNote() {
    if (!newNote.trim()) return;
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("patient_notes").insert({
      patient_id: patient.id,
      body: newNote.trim(),
      author_id: user?.id || null,
      author_email: user?.email || null,
    });
    setBusy(false);
    if (error) { alert("Σφάλμα: " + error.message); return; }
    setNewNote("");
    await loadNotes();
  }

  async function deleteNote(id) {
    if (!confirm("Διαγραφή σημείωσης;")) return;
    setBusy(true);
    await supabase.from("patient_notes").delete().eq("id", id);
    setNotes((n) => n.filter((x) => x.id !== id));
    setBusy(false);
  }

  const therapistName = (id) => therapists.find(t => t.id === id)?.name || "—";

  async function saveTags(next) {
    setTags(next);
    await supabase.from("patient_profiles").update({ support_tags: next }).eq("id", patient.id);
    onRefresh();
  }
  function toggleTag(t) {
    saveTags(tags.includes(t) ? tags.filter(x => x !== t) : [...tags, t]);
  }

  async function saveComment() {
    setBusy(true);
    await supabase.from("patient_profiles").update({ admin_comment: comment.trim() || null }).eq("id", patient.id);
    setBusy(false);
    onRefresh();
  }

  async function block() {
    if (!blockReason.trim()) { alert("Γράψε τον λόγο αποκλεισμού."); return; }
    setBusy(true);
    await supabase.from("patient_profiles").update({
      is_blocked: true,
      blocked_reason: blockReason.trim(),
    }).eq("id", patient.id);
    setBusy(false);
    setShowBlock(false);
    setBlockReason("");
    onRefresh();
  }

  async function unblock() {
    if (!confirm("Άρση αποκλεισμού;")) return;
    setBusy(true);
    await supabase.from("patient_profiles").update({ is_blocked: false, blocked_reason: null }).eq("id", patient.id);
    setBusy(false);
    onRefresh();
  }

  const completed = bookings.filter(b => b.status === "completed").length;
  const cancelledCount = bookings.filter(b => isCancelled(b.status)).length;
  const upcoming = bookings.filter(b => b.status === "confirmed" && new Date(b.session_date) >= new Date()).length;
  const spent = bookings.filter(b => b.status === "completed").reduce((s, b) => s + num(b.session_amount), 0);

  const fullAddress = [patient.address, patient.area, patient.city, patient.postal_code].filter(Boolean).join(", ");

  const TABS = [
    { id: "overview", label: "Στοιχεία", Icon: User },
    { id: "history",  label: `Ραντεβού (${bookings.length})`, Icon: ClipboardList },
    { id: "reviews",  label: `Αξιολογήσεις (${reviews.length})`, Icon: Star },
    { id: "payments", label: `Πληρωμές (${payments.length})`, Icon: Euro },
    { id: "notes",    label: `Σημειώσεις (${notes.length})`, Icon: StickyNote },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.35)" }} />

      <div style={{ position: "relative", width: "min(720px, 94vw)", height: "100%", background: "#F8FAFC", overflowY: "auto", boxShadow: "-8px 0 40px rgba(15,23,42,0.16)" }}>

        <div style={{ background: "#fff", padding: "22px 28px", borderBottom: "1px solid #E2E8F0", position: "sticky", top: 0, zIndex: 5 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
            <Avatar name={patient.name} size={54} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", marginBottom: 6 }}>
                <span style={{ fontSize: 21, fontWeight: 700, color: "#0F172A" }}>{patient.name || "—"}</span>
                {patient.is_blocked && <Badge label="Αποκλεισμένος" bg="#FEF2F2" color="#BE123C" Icon={Ban} />}
                {tags.length > 0 && <Badge label={`${tags.length} tags`} bg="#EFF6FF" color="#1D4ED8" Icon={Tag} />}
              </div>
              {/* Τα στοιχεία επικοινωνίας ΑΜΕΣΩΣ ορατά — αυτό ζητάει
                  ο admin πρώτο όταν ανοίγει καρτέλα ασθενή. */}
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: "#64748B" }}>
                {contact?.email && (
                  <a href={`mailto:${contact.email}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#1D4ED8", textDecoration: "none", fontWeight: 600 }}>
                    <Mail size={13} /> {contact.email}
                  </a>
                )}
                {patient.phone && (
                  <a href={`tel:${patient.phone}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#1D4ED8", textDecoration: "none", fontWeight: 600 }}>
                    <Phone size={13} /> {patient.phone}
                  </a>
                )}
              </div>
            </div>
            <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94A3B8", padding: 4, lineHeight: 0 }}>
              <X size={22} />
            </button>
          </div>

          {patient.is_blocked && patient.blocked_reason && (
            <div style={{ marginTop: 14, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", fontSize: 12.5, color: "#BE123C", lineHeight: 1.6 }}>
              <strong>Λόγος αποκλεισμού:</strong> {patient.blocked_reason}
            </div>
          )}

          <div style={{ display: "flex", gap: 4, background: "#F1F5F9", padding: 4, borderRadius: 10, marginTop: 16, flexWrap: "wrap" }}>
            {TABS.map(t => {
              const TIcon = t.Icon;
              const active = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  style={{ padding: "8px 15px", borderRadius: 7, border: "none", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: active ? "#fff" : "transparent", color: active ? "#0F172A" : "#64748B", boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <TIcon size={13} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ padding: "22px 28px 110px" }}>

          {tab === "overview" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(125px,1fr))", gap: 12, marginBottom: 20 }}>
                {[
                  { label: "Ραντεβού", value: bookings.length, color: "#1D4ED8" },
                  { label: "Ολοκληρωμένα", value: completed, color: "#15803D" },
                  { label: "Επερχόμενα", value: upcoming, color: "#6D28D9" },
                  { label: "Ακυρώσεις", value: cancelledCount, color: "#BE123C" },
                ].map(c => (
                  <div key={c.label} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "16px 18px" }}>
                    <div style={{ fontSize: 26, fontWeight: 700, color: c.color, lineHeight: 1 }}>{c.value}</div>
                    <div style={{ fontSize: 12, color: "#64748B", marginTop: 5 }}>{c.label}</div>
                  </div>
                ))}
              </div>

              <Panel title="Επικοινωνία" Icon={Mail}>
                <Row label="Email" value={contact?.email || "—"} mono />
                <Row label="Τηλέφωνο" value={patient.phone || "—"} />
                <Row label="Email επιβεβαιωμένο" value={contact?.email_confirmed_at ? fmtDate(contact.email_confirmed_at) : "Όχι"} />
                <Row label="Τελευταία σύνδεση" value={contact?.last_sign_in_at ? fmtDateTime(contact.last_sign_in_at) : "—"} />
                <Row label="Εγγραφή" value={fmtDate(patient.created_at)} last />
              </Panel>

              {/* Η διεύθυνση δεν εμφανίζεται πουθενά δημόσια.
                  Ο θεραπευτής τη βλέπει μόνο αφού αποδεχτεί το αίτημα. */}
              {/* ΟΛΑ τα πεδία του προφίλ, ακόμα και όσα προστεθούν αργότερα */}
              <Panel title="Όλα τα καταχωρημένα στοιχεία" Icon={ClipboardList}>
                {buildContactRows(patient).length === 0 ? (
                  <div style={{ fontSize: 13, color: "#94A3B8", fontStyle: "italic" }}>
                    Δεν έχουν καταχωρηθεί επιπλέον στοιχεία.
                  </div>
                ) : buildContactRows(patient).map(([label, value], i, arr) => (
                  <Row key={label + i} label={label} value={value} last={i === arr.length - 1} />
                ))}
              </Panel>

              <Panel title="Διεύθυνση" Icon={Home}>
                {fullAddress ? (
                  <>
                    <Row label="Οδός" value={patient.address || "—"} />
                    <Row label="Περιοχή" value={patient.area || "—"} />
                    <Row label="Πόλη" value={patient.city || "—"} />
                    <Row label="ΤΚ" value={patient.postal_code || "—"} last />
                    <div style={{ marginTop: 12 }}>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "#1D4ED8", textDecoration: "none" }}>
                        <MapPin size={13} />
                        Άνοιγμα σε χάρτη
                      </a>
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 13, color: "#94A3B8", fontStyle: "italic" }}>
                    Δεν έχει καταχωρηθεί διεύθυνση. Ζητείται στο πρώτο ραντεβού.
                  </div>
                )}
              </Panel>

              <Panel title="Support Tags" Icon={Tag}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {SUPPORT_TAGS.map(t => {
                    const on = tags.includes(t);
                    return (
                      <button key={t} onClick={() => toggleTag(t)}
                        style={{ padding: "6px 13px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: `1.5px solid ${on ? "#1D4ED8" : "#E2E8F0"}`, background: on ? "#EFF6FF" : "#fff", color: on ? "#1D4ED8" : "#64748B" }}>
                        {t}
                      </button>
                    );
                  })}
                </div>
              </Panel>
            </>
          )}

          {tab === "history" && (
            bookings.length === 0 ? <Empty text="Δεν υπάρχουν ραντεβού" /> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {bookings.map(b => {
                  const meta = statusMeta(b.status);
                  return (
                    <div key={b.id} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "14px 18px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", marginBottom: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>
                          {fmtDate(b.session_date)} · {(b.session_time || "").slice(0, 5)}
                        </span>
                        <Badge label={meta.label} bg={meta.bg} color={meta.color} />
                        {num(b.session_amount) > 0 && (
                          <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 700, color: "#15803D" }}>
                            {num(b.session_amount).toFixed(2)}€
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12.5, color: "#64748B" }}>
                        Θεραπευτής: {therapistName(b.therapist_id)}
                        {b.request?.problem_type ? ` · ${b.request.problem_type}` : ""}
                      </div>
                      {isCancelled(b.status) && b.cancelled_reason && (
                        <div style={{ marginTop: 7, fontSize: 12, color: "#9F1239", fontStyle: "italic" }}>
                          {b.cancelled_reason}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}

          {tab === "reviews" && (
            reviews.length === 0 ? <Empty text="Δεν έχει γράψει αξιολογήσεις" /> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {reviews.map((r) => (
                  <div key={r.id} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "14px 18px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 7, flexWrap: "wrap" }}>
                      <span style={{ display: "inline-flex", gap: 2 }}>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star key={i} size={13} fill={i <= (r.rating || 0) ? "#F59E0B" : "none"} color={i <= (r.rating || 0) ? "#F59E0B" : "#E2E8F0"} strokeWidth={2} />
                        ))}
                      </span>
                      <span style={{ fontSize: 12.5, color: "#64748B" }}>{therapistName(r.therapist_id)}</span>
                      {!r.is_published && <Badge label="Μη δημοσιευμένη" bg="#FFFBEB" color="#B45309" />}
                      <span style={{ marginLeft: "auto", fontSize: 11.5, color: "#94A3B8" }}>{fmtDate(r.created_at)}</span>
                    </div>
                    {r.comment && (
                      <p style={{ fontSize: 13.5, color: "#475569", margin: 0, lineHeight: 1.6, fontStyle: "italic" }}>{r.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            )
          )}

          {tab === "payments" && (
            payments.length === 0 ? <Empty text="Δεν υπάρχουν χρεώσεις" /> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {payments.map((p) => (
                  <div key={p.id} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <Euro size={16} color="#64748B" />
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{num(p.amount).toFixed(2)}€</div>
                      <div style={{ fontSize: 12, color: "#94A3B8" }}>{fmtDate(p.created_at)}</div>
                    </div>
                    {p.paid || p.status === "paid"
                      ? <Badge label="Εξοφλήθηκε" bg="#F0FDF4" color="#15803D" Icon={CheckCircle2} />
                      : <Badge label="Ανεξόφλητο" bg="#FFFBEB" color="#B45309" Icon={Clock} />}
                  </div>
                ))}
              </div>
            )
          )}

          {tab === "notes" && (
            <>
              {/* ΙΣΤΟΡΙΚΟ σημειώσεων, όχι ένα κουτί που το ξαναγράφεις.
                  Κρατάει ποιος έγραψε τι και πότε — απαραίτητο όταν
                  περισσότεροι από ένας χειρίζονται υποστήριξη. */}
              <Panel title="Νέα σημείωση" Icon={StickyNote}>
                <textarea value={newNote} onChange={e => setNewNote(e.target.value)} rows={3}
                  placeholder="Τι ειπώθηκε, τι μένει..."
                  style={{ width: "100%", padding: "11px 13px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 13.5, fontFamily: "inherit", outline: "none", resize: "vertical", color: "#0F172A", boxSizing: "border-box" }} />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                  <ActionBtn onClick={addNote} disabled={busy || !newNote.trim()} bg="#0F172A" color="#fff" Icon={Plus}>
                    Προσθήκη
                  </ActionBtn>
                </div>
              </Panel>

              {notes.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 14 }}>
                  {notes.map((n) => (
                    <div key={n.id} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "13px 17px" }}>
                      <p style={{ fontSize: 13.5, color: "#334155", margin: 0, lineHeight: 1.6, whiteSpace: "pre-line" }}>{n.body}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                        <span style={{ fontSize: 11, color: "#94A3B8" }}>
                          {fmtDateTime(n.created_at)}{n.author_email ? ` · ${n.author_email}` : ""}
                        </span>
                        <button onClick={() => deleteNote(n.id)} disabled={busy}
                          style={{ marginLeft: "auto", background: "transparent", border: "none", color: "#BE123C", cursor: "pointer", padding: 2, display: "flex" }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Panel title="Γενικό σχόλιο" Icon={StickyNote}>
                <textarea value={comment} onChange={e => setComment(e.target.value)} rows={4}
                  placeholder="Μόνιμο σχόλιο για τον ασθενή..."
                  style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 13.5, fontFamily: "inherit", outline: "none", resize: "vertical", color: "#0F172A", boxSizing: "border-box" }} />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                  <ActionBtn onClick={saveComment} disabled={busy} bg="#0F172A" color="#fff" Icon={Save}>
                    {busy ? "Αποθήκευση..." : "Αποθήκευση"}
                  </ActionBtn>
                </div>
              </Panel>
            </>
          )}
        </div>

        {/* Action bar */}
        <div style={{ position: "sticky", bottom: 0, background: "#fff", borderTop: "1px solid #E2E8F0", padding: "14px 28px", display: "flex", gap: 9, flexWrap: "wrap", alignItems: "center" }}>
          {!patient.is_blocked
            ? <ActionBtn onClick={() => setShowBlock(true)} disabled={busy} bg="#fff" color="#BE123C" border="#FECDD3" Icon={Ban}>Αποκλεισμός</ActionBtn>
            : <ActionBtn onClick={unblock} disabled={busy} bg="#15803D" color="#fff" Icon={CheckCircle2}>Άρση αποκλεισμού</ActionBtn>}
          <div style={{ marginLeft: "auto" }}>
            <ActionBtn onClick={onClose} bg="#fff" color="#64748B" border="#E2E8F0">Κλείσιμο</ActionBtn>
          </div>
        </div>

        {showBlock && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20, padding: 24 }}
            onClick={e => { if (e.target === e.currentTarget) setShowBlock(false); }}>
            <div style={{ background: "#fff", borderRadius: 16, padding: 28, maxWidth: 440, width: "100%" }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>Αποκλεισμός ασθενή</h3>
              <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6, marginBottom: 16 }}>
                Δεν θα μπορεί να στείλει νέα αιτήματα. Τα υπάρχοντα ραντεβού δεν ακυρώνονται αυτόματα.
              </p>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>Λόγος *</label>
              <textarea value={blockReason} onChange={e => setBlockReason(e.target.value)} rows={3}
                style={{ width: "100%", padding: "11px 13px", border: "1.5px solid #E2E8F0", borderRadius: 9, fontSize: 13.5, fontFamily: "inherit", resize: "vertical", marginBottom: 18, color: "#0F172A", boxSizing: "border-box" }} />
              <div style={{ display: "flex", gap: 9, justifyContent: "flex-end" }}>
                <ActionBtn onClick={() => setShowBlock(false)} bg="#fff" color="#64748B" border="#E2E8F0">Άκυρο</ActionBtn>
                <ActionBtn onClick={block} disabled={busy || !blockReason.trim()} bg="#DC2626" color="#fff" Icon={Ban}>Αποκλεισμός</ActionBtn>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
export default function PatientsPage({ hideHeader }) {
  const [patients, setPatients] = useState([]);
  const [contacts, setContacts] = useState({});
  const [bookingsByPatient, setBookingsByPatient] = useState({});
  const [requestsByPatient, setRequestsByPatient] = useState({});
  const [therapists, setTherapists] = useState([]);
  const [reviewsByPatient, setReviewsByPatient] = useState({});
  const [paymentsByPatient, setPaymentsByPatient] = useState({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [contactsError, setContactsError] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);

    const [{ data: pts }, { data: bks }, { data: reqs }, { data: ths }, { data: rvs }, { data: pays }] = await Promise.all([
      supabase.from("patient_profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("session_bookings").select("*").order("session_date", { ascending: false }),
      supabase.from("session_requests").select("id, patient_id, problem_type, area, status, created_at"),
      supabase.from("therapist_profiles").select("id, name"),
      supabase.from("reviews").select("*").order("created_at", { ascending: false }),
      supabase.from("payments").select("*").order("created_at", { ascending: false }),
    ]);

    const list = pts || [];

    const reqMap = {};
    (reqs || []).forEach(r => {
      if (!r.patient_id) return;
      if (!reqMap[r.patient_id]) reqMap[r.patient_id] = [];
      reqMap[r.patient_id].push(r);
    });

    const reqById = {};
    (reqs || []).forEach(r => { reqById[r.id] = r; });

    const bkMap = {};
    (bks || []).forEach(b => {
      if (!b.patient_id) return;
      if (!bkMap[b.patient_id]) bkMap[b.patient_id] = [];
      bkMap[b.patient_id].push({ ...b, request: reqById[b.request_id] || null });
    });

    // Αξιολογήσεις και χρεώσεις ανά ασθενή
    const rvMap = {};
    (rvs || []).forEach((r) => {
      if (!r.patient_id) return;
      if (!rvMap[r.patient_id]) rvMap[r.patient_id] = [];
      rvMap[r.patient_id].push(r);
    });

    const payMap = {};
    (pays || []).forEach((p) => {
      const pid = p.patient_id || (reqById[p.request_id]?.patient_id);
      if (!pid) return;
      if (!payMap[pid]) payMap[pid] = [];
      payMap[pid].push(p);
    });

    setReviewsByPatient(rvMap);
    setPaymentsByPatient(payMap);
    setPatients(list);
    setBookingsByPatient(bkMap);
    setRequestsByPatient(reqMap);
    setTherapists(ths || []);

    // Emails — απαιτεί το migration-admin-contacts.sql
    if (list.length > 0) {
      const { data: cts, error } = await supabase.rpc("admin_get_user_contacts", { p_ids: list.map(p => p.id) });
      if (error) {
        setContactsError(true);
      } else if (cts) {
        const cm = {};
        cts.forEach(c => { cm[c.id] = c; });
        setContacts(cm);
        setContactsError(false);
      }
    }

    setLoading(false);
  }

  const withBookings = (id) => (bookingsByPatient[id] || []).length;

  const filtered = patients.filter(p => {
    if (filter === "active"   && withBookings(p.id) === 0) return false;
    if (filter === "inactive" && withBookings(p.id) > 0) return false;
    if (filter === "blocked"  && !p.is_blocked) return false;
    if (filter === "tagged"   && (p.support_tags || []).length === 0) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const email = (contacts[p.id]?.email || "").toLowerCase();
      if (!(p.name || "").toLowerCase().includes(q) &&
          !(p.phone || "").includes(q) &&
          !(p.area || "").toLowerCase().includes(q) &&
          !email.includes(q)) return false;
    }
    return true;
  });

  const counts = {
    all:      patients.length,
    active:   patients.filter(p => withBookings(p.id) > 0).length,
    inactive: patients.filter(p => withBookings(p.id) === 0).length,
    blocked:  patients.filter(p => p.is_blocked).length,
    tagged:   patients.filter(p => (p.support_tags || []).length > 0).length,
  };

  function doExport() {
    exportToCsv("patients", filtered.map(p => ({
      Ονοματεπώνυμο: p.name || "",
      Email: contacts[p.id]?.email || "",
      Τηλέφωνο: p.phone || "",
      Διεύθυνση: p.address || "",
      Περιοχή: p.area || "",
      Πόλη: p.city || "",
      ΤΚ: p.postal_code || "",
      Ραντεβού: withBookings(p.id),
      Αποκλεισμένος: p.is_blocked ? "Ναι" : "Όχι",
      Tags: (p.support_tags || []).join(" | "),
      Εγγραφή: csvDate(p.created_at),
      ΤελευταίαΣύνδεση: contacts[p.id]?.last_sign_in_at ? csvDate(contacts[p.id].last_sign_in_at) : "",
    })));
  }

  const TABS = [
    { id: "all",      label: "Όλοι",           n: counts.all },
    { id: "active",   label: "Με ραντεβού",    n: counts.active },
    { id: "inactive", label: "Χωρίς ραντεβού", n: counts.inactive },
    { id: "tagged",   label: "Με tags",        n: counts.tagged },
    { id: "blocked",  label: "Αποκλεισμένοι",  n: counts.blocked },
  ];

  if (loading) {
    return <div style={{ padding: 60, textAlign: "center", color: "#64748B", fontSize: 15 }}>Φόρτωση...</div>;
  }

  return (
    <div>
      {!hideHeader && (
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0F172A", margin: 0 }}>Ασθενείς</h1>
          <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>Στοιχεία επικοινωνίας, ιστορικό, υποστήριξη</p>
        </div>
      )}

      {contactsError && (
        <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12, padding: "13px 17px", marginBottom: 18, fontSize: 12.5, color: "#92400E", display: "flex", gap: 10, alignItems: "flex-start", lineHeight: 1.6 }}>
          <AlertTriangle size={16} strokeWidth={2.2} style={{ marginTop: 1, flexShrink: 0 }} />
          <span>
            Τα emails δεν φορτώθηκαν. Λείπει η συνάρτηση <strong>admin_get_user_contacts</strong> —
            τρέξε το <strong>migration-admin-contacts.sql</strong> στο Supabase.
          </span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(165px,1fr))", gap: 14, marginBottom: 22 }}>
        {[
          { label: "Σύνολο",         value: counts.all,      sub: "εγγεγραμμένοι",  bg: "#F8FAFC", border: "#E2E8F0", color: "#0F172A", Icon: User },
          { label: "Με ραντεβού",    value: counts.active,   sub: "ενεργοί",        bg: "#F0FDF4", border: "#BBF7D0", color: "#15803D", Icon: CheckCircle2 },
          { label: "Χωρίς ραντεβού", value: counts.inactive, sub: "δεν έκλεισαν",   bg: "#FFFBEB", border: "#FDE68A", color: "#B45309", Icon: Clock },
          { label: "Αποκλεισμένοι",  value: counts.blocked,  sub: "μπλοκαρισμένοι", bg: "#FFF1F2", border: "#FECDD3", color: "#BE123C", Icon: ShieldOff },
        ].map(c => {
          const CIcon = c.Icon;
          return (
            <div key={c.label} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 14, padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                <CIcon size={14} color={c.color} strokeWidth={2.2} />
                <span style={{ fontSize: 11, fontWeight: 700, color: c.color, textTransform: "uppercase", letterSpacing: ".05em" }}>{c.label}</span>
              </div>
              <div style={{ fontSize: 30, fontWeight: 700, color: c.color, lineHeight: 1 }}>{c.value}</div>
              <div style={{ fontSize: 12, color: c.color, opacity: 0.75, marginTop: 4 }}>{c.sub}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 4, background: "#E2E8F0", padding: 4, borderRadius: 12, width: "fit-content", marginBottom: 14, flexWrap: "wrap" }}>
        {TABS.map(t => {
          const active = filter === t.id;
          return (
            <button key={t.id} onClick={() => setFilter(t.id)}
              style={{ padding: "8px 15px", borderRadius: 8, border: "none", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: active ? "#fff" : "transparent", color: active ? "#0F172A" : "#64748B", boxShadow: active ? "0 1px 4px rgba(0,0,0,0.1)" : "none" }}>
              {t.label} <span style={{ opacity: 0.6, marginLeft: 3 }}>{t.n}</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
          <Search size={15} color="#94A3B8" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Αναζήτηση ονόματος, email, τηλεφώνου, περιοχής..."
            style={{ width: "100%", padding: "10px 14px 10px 38px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 13, fontFamily: "inherit", outline: "none", color: "#0F172A", boxSizing: "border-box" }} />
        </div>
        <button onClick={doExport}
          style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid #E2E8F0", background: "#fff", color: "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Download size={14} />
          Εξαγωγή CSV ({filtered.length})
        </button>
      </div>

      {filtered.length === 0 ? (
        <Empty text="Δεν βρέθηκαν ασθενείς" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(p => {
            const email = contacts[p.id]?.email;
            const bCount = withBookings(p.id);
            return (
              <div key={p.id} onClick={() => setSelected(p)}
                style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 16, transition: "all .15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#CBD5E1"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(15,23,42,0.06)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.boxShadow = "none"; }}>

                <Avatar name={p.name} size={46} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", marginBottom: 5 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#0F172A" }}>{p.name || "—"}</span>
                    {p.is_blocked && <Badge label="Αποκλεισμένος" bg="#FEF2F2" color="#BE123C" Icon={Ban} />}
                    {(p.support_tags || []).slice(0, 2).map(t => (
                      <Badge key={t} label={t} bg="#EFF6FF" color="#1D4ED8" />
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12.5, color: "#64748B" }}>
                    {email && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Mail size={12} />{email}</span>}
                    {p.phone && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Phone size={12} />{p.phone}</span>}
                    {p.area && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><MapPin size={12} />{p.area}</span>}
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Calendar size={12} />{fmtDate(p.created_at)}</span>
                  </div>
                </div>

                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: bCount > 0 ? "#15803D" : "#CBD5E1", lineHeight: 1 }}>{bCount}</div>
                  <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 3 }}>ραντεβού</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <PatientDrawer
          patient={patients.find(p => p.id === selected.id) || selected}
          contact={contacts[selected.id]}
          requests={requestsByPatient[selected.id] || []}
          bookings={bookingsByPatient[selected.id] || []}
          therapists={therapists}
          reviews={reviewsByPatient[selected.id] || []}
          payments={paymentsByPatient[selected.id] || []}
          onClose={() => setSelected(null)}
          onRefresh={fetchAll}
        />
      )}
    </div>
  );
}