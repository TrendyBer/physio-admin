"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Star, Search, Eye, EyeOff, AlertCircle, X, MessageSquare, ArrowRight, Check, Calendar } from "lucide-react";

function Stars({ rating, size = 14 }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={size}
          fill={i <= (rating || 0) ? "#F59E0B" : "none"}
          color={i <= (rating || 0) ? "#F59E0B" : "#E2E8F0"}
          strokeWidth={2}
        />
      ))}
    </div>
  );
}

function Badge({ label, bg, color, icon: Icon }) {
  return (
    <span style={{ background: bg, color, padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 4 }}>
      {Icon && <Icon size={11} strokeWidth={2.5} />}
      {label}
    </span>
  );
}

function Avatar({ name, size = 40, color = "patient" }) {
  const colors = {
    patient:   { bg: "#F0FDF4", text: "#15803D" },
    therapist: { bg: "#EFF6FF", text: "#1D4ED8" },
  }[color];
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: colors.bg, color: colors.text, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.33, fontWeight: 700, flexShrink: 0 }}>
      {(name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
    </div>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all / published / hidden
  const [search, setSearch] = useState("");
  const [user, setUser] = useState(null);

  // Hide modal
  const [hideModal, setHideModal] = useState(null);
  const [hideReason, setHideReason] = useState("");
  const [hiding, setHiding] = useState(false);

  // Show modal (re-publish)
  const [showModal, setShowModal] = useState(null);
  const [showing, setShowing] = useState(false);

  useEffect(() => { init(); }, []);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    await fetchReviews();
  }

  async function fetchReviews() {
    setLoading(true);
    const [
      { data: rvs },
      { data: patients },
      { data: therapists },
      { data: admins },
    ] = await Promise.all([
      supabase.from("reviews").select("*").order("created_at", { ascending: false }),
      supabase.from("patient_profiles").select("id, name"),
      supabase.from("therapist_profiles").select("id, name, specialty"),
      supabase.from("user_profiles").select("id, full_name, email"),
    ]);

    const patientMap = {};
    (patients || []).forEach(p => { patientMap[p.id] = p.name; });

    const therapistMap = {};
    (therapists || []).forEach(t => { therapistMap[t.id] = t; });

    const adminMap = {};
    (admins || []).forEach(a => { adminMap[a.id] = a.full_name || a.email; });

    const enriched = (rvs || []).map(r => ({
      ...r,
      patient_name: patientMap[r.patient_id] || "Άγνωστος ασθενής",
      therapist_name: therapistMap[r.therapist_id]?.name || "Άγνωστος θεραπευτής",
      therapist_specialty: therapistMap[r.therapist_id]?.specialty || "",
      hidden_by_name: r.hidden_by_admin_id ? (adminMap[r.hidden_by_admin_id] || "Άγνωστος admin") : null,
    }));

    setReviews(enriched);
    setLoading(false);
  }

  // ═══ HIDE FLOW ═══
  function openHideModal(review) {
    setHideModal(review);
    setHideReason("");
  }

  async function confirmHide() {
    if (!hideReason.trim()) {
      alert("Παρακαλώ συμπληρώστε λόγο απόκρυψης.");
      return;
    }
    setHiding(true);

    const { error } = await supabase.from("reviews").update({
      is_published: false,
      status: "hidden",
      hidden_at: new Date().toISOString(),
      hidden_by_admin_id: user?.id,
      hidden_reason: hideReason.trim(),
    }).eq("id", hideModal.id);

    if (error) {
      alert("Σφάλμα: " + error.message);
      setHiding(false);
      return;
    }

    await fetchReviews();
    setHiding(false);
    setHideModal(null);
    setHideReason("");
  }

  // ═══ SHOW FLOW ═══
  function openShowModal(review) {
    setShowModal(review);
  }

  async function confirmShow() {
    if (!showModal) return;
    setShowing(true);

    const { error } = await supabase.from("reviews").update({
      is_published: true,
      status: "published",
      hidden_at: null,
      hidden_by_admin_id: null,
      hidden_reason: null,
    }).eq("id", showModal.id);

    if (error) {
      alert("Σφάλμα: " + error.message);
      setShowing(false);
      return;
    }

    await fetchReviews();
    setShowing(false);
    setShowModal(null);
  }

  // Categorize reviews
  function getCategory(r) {
    if (r.is_published) return "published";
    return "hidden";
  }

  const counts = {
    all:       reviews.length,
    published: reviews.filter(r => getCategory(r) === "published").length,
    hidden:    reviews.filter(r => getCategory(r) === "hidden").length,
  };

  const filtered = reviews.filter(r => {
    const cat = getCategory(r);
    const matchFilter = filter === "all" || cat === filter;
    const matchSearch = ((r.patient_name || "") + (r.therapist_name || "") + (r.comment || "")).toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  // Stats
  const publishedReviews = reviews.filter(r => r.is_published);
  const avgRating = publishedReviews.length > 0
    ? (publishedReviews.reduce((s, r) => s + (r.rating || 0), 0) / publishedReviews.length).toFixed(1)
    : "—";

  if (loading) return (
    <div style={{ padding: 24, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
      <div style={{ fontSize: 16, color: "#64748B" }}>Φόρτωση reviews...</div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0F172A", margin: 0 }}>Reviews</h1>
        <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>
          Τα reviews δημοσιεύονται αυτόματα. Ο admin μπορεί να αποκρύψει review που περιέχει βρισιές ή ακατάλληλο περιεχόμενο.
        </p>
      </div>

      {/* KPI cards */}
      <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
        {[
          { label: "Μέση Βαθμολογία", value: avgRating,         sub: "από δημοσιευμένα", bg: "#FFFBEB", border: "#FDE68A", text: "#B45309" },
          { label: "Σύνολο Reviews",  value: counts.all,        sub: "όλα μαζί",         bg: "#EFF6FF", border: "#BFDBFE", text: "#1D4ED8" },
          { label: "Δημοσιευμένα",    value: counts.published,  sub: "ορατά στο site",   bg: "#F0FDF4", border: "#BBF7D0", text: "#15803D" },
          { label: "Κρυμμένα",        value: counts.hidden,     sub: "αποκρύφθηκαν",     bg: "#FFF1F2", border: "#FECDD3", text: "#BE123C" },
        ].map(c => (
          <div key={c.label} style={{ flex: 1, minWidth: 130, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 14, padding: "16px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: c.text, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: c.text, lineHeight: 1 }}>{c.value}</div>
            <div style={{ fontSize: 11, color: c.text, opacity: 0.7, marginTop: 4 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 4, background: "#E2E8F0", padding: 4, borderRadius: 10, flexWrap: "wrap" }}>
          {[
            ["all", "Όλα"],
            ["published", "Δημοσιευμένα"],
            ["hidden", "Κρυμμένα"],
          ].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)}
              style={{ padding: "6px 14px", borderRadius: 7, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: filter === val ? "#fff" : "transparent", color: filter === val ? "#0F172A" : "#64748B", boxShadow: filter === val ? "0 1px 4px rgba(0,0,0,0.1)" : "none" }}>
              {label} <span style={{ marginLeft: 4, fontSize: 11, color: filter === val ? "#1D4ED8" : "#94A3B8" }}>{counts[val]}</span>
            </button>
          ))}
        </div>
        <div style={{ flex: 1, minWidth: 200, display: "flex", alignItems: "center", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, padding: "0 14px" }}>
          <Search size={14} color="#94a3b8" />
          <input type="text" placeholder="Αναζήτηση ασθενή, θεραπευτή, σχολίου..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, padding: "9px 10px", border: "none", fontSize: 13, fontFamily: "inherit", background: "transparent", outline: "none", color: "#0F172A" }} />
        </div>
      </div>

      {/* Reviews list */}
      {filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "#94A3B8", fontSize: 14, background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0" }}>
          {reviews.length === 0 ? "Δεν υπάρχουν reviews ακόμα." : "Δεν βρέθηκαν reviews με αυτά τα φίλτρα."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map(r => {
            const cat = getCategory(r);
            const isPublished = cat === "published";
            const isHidden = cat === "hidden";

            return (
              <div key={r.id} style={{ background: "#fff", borderRadius: 14, border: `1px solid ${isHidden ? "#FECDD3" : "#E2E8F0"}`, padding: "18px 20px", opacity: isHidden ? 0.85 : 1 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>

                  {/* Avatar */}
                  <Avatar name={r.patient_name} color="patient" />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Header line */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "#0F172A" }}>{r.patient_name}</span>
                      <ArrowRight size={13} color="#94A3B8" />
                      <span style={{ fontSize: 13, color: "#1D4ED8", fontWeight: 600 }}>{r.therapist_name}</span>
                      {r.therapist_specialty && (
                        <span style={{ fontSize: 11, color: "#94A3B8" }}>· {r.therapist_specialty}</span>
                      )}
                      {isPublished && <Badge label="Δημοσιευμένο" bg="#D1FAE5" color="#065F46" icon={Eye} />}
                      {isHidden && <Badge label="Κρυμμένο" bg="#FFE4E6" color="#9F1239" icon={EyeOff} />}
                      <span style={{ fontSize: 11, color: "#94A3B8", marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Calendar size={11} />
                        {r.created_at ? new Date(r.created_at).toLocaleDateString("el-GR", { day: "2-digit", month: "2-digit", year: "numeric" }) : ""}
                      </span>
                    </div>

                    {/* Rating */}
                    {r.rating && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <Stars rating={r.rating} size={16} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{r.rating}/5</span>
                      </div>
                    )}

                    {/* Comment */}
                    {r.comment && (
                      <p style={{ fontSize: 14, color: "#334155", lineHeight: 1.6, margin: "0 0 6px", background: "#F8FAFC", padding: "10px 14px", borderRadius: 8, borderLeft: "3px solid #CBD5E1", fontStyle: "italic" }}>
                        "{r.comment}"
                      </p>
                    )}

                    {/* Hidden info */}
                    {isHidden && r.hidden_reason && (
                      <div style={{ marginTop: 10, padding: "10px 14px", background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#9F1239", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4, display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <AlertCircle size={11} />
                          Λόγος Απόκρυψης
                        </div>
                        <div style={{ fontSize: 13, color: "#9F1239", lineHeight: 1.5 }}>
                          {r.hidden_reason}
                        </div>
                        <div style={{ fontSize: 11, color: "#9F1239", opacity: 0.7, marginTop: 6 }}>
                          {r.hidden_by_name && `Από: ${r.hidden_by_name}`}
                          {r.hidden_at && ` · ${new Date(r.hidden_at).toLocaleDateString("el-GR", { day: "2-digit", month: "2-digit", year: "numeric" })}`}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                    {isPublished && (
                      <button onClick={() => openHideModal(r)}
                        style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #FECDD3", background: "transparent", color: "#BE123C", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                        <EyeOff size={13} />
                        Απόκρυψη
                      </button>
                    )}
                    {isHidden && (
                      <button onClick={() => openShowModal(r)}
                        style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#15803D", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                        <Eye size={13} />
                        Επανεμφάνιση
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* HIDE MODAL */}
      {hideModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) setHideModal(null); }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "32px", maxWidth: 480, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#FFF1F2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <EyeOff size={28} color="#BE123C" strokeWidth={2.2} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0F172A", marginBottom: 12, textAlign: "center" }}>
              Απόκρυψη Review
            </h2>
            <p style={{ fontSize: 14, color: "#64748B", marginBottom: 16, lineHeight: 1.6, textAlign: "center" }}>
              Το review θα κρυφτεί από το site. Ο ασθενής δεν θα ειδοποιηθεί.
            </p>

            {/* Review preview */}
            <div style={{ background: "#F8FAFC", borderRadius: 10, padding: "12px 16px", marginBottom: 20, borderLeft: "3px solid #CBD5E1" }}>
              <div style={{ fontSize: 12, color: "#64748B", marginBottom: 4 }}>
                <strong>{hideModal.patient_name}</strong> → {hideModal.therapist_name}
              </div>
              <Stars rating={hideModal.rating} size={13} />
              {hideModal.comment && (
                <p style={{ fontSize: 13, color: "#334155", marginTop: 6, fontStyle: "italic" }}>
                  "{hideModal.comment}"
                </p>
              )}
            </div>

            <label style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", display: "block", marginBottom: 6 }}>
              Λόγος απόκρυψης <span style={{ color: "#BE123C" }}>*</span>
            </label>
            <textarea
              value={hideReason}
              onChange={e => setHideReason(e.target.value)}
              rows={3}
              placeholder="π.χ. Περιέχει βρισιές, δυσφημιστικό περιεχόμενο, off-topic..."
              maxLength={300}
              style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, fontFamily: "inherit", outline: "none", color: "#0F172A", resize: "vertical", boxSizing: "border-box", marginBottom: 4 }}
            />
            <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "right", marginBottom: 20 }}>
              {hideReason.length}/300 — Ο λόγος αποθηκεύεται για audit, δεν φαίνεται στον ασθενή.
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setHideModal(null)} disabled={hiding}
                style={{ flex: 1, padding: "12px", borderRadius: 30, border: "1px solid #e2e8f0", background: "transparent", color: "#64748b", fontSize: 14, fontWeight: 600, cursor: hiding ? "not-allowed" : "pointer" }}>
                Ακύρωση
              </button>
              <button onClick={confirmHide} disabled={hiding || !hideReason.trim()}
                style={{ flex: 2, padding: "12px", borderRadius: 30, border: "none", background: hiding || !hideReason.trim() ? "#94a3b8" : "#BE123C", color: "#fff", fontSize: 14, fontWeight: 600, cursor: hiding || !hideReason.trim() ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <EyeOff size={14} />
                {hiding ? "Απόκρυψη..." : "Απόκρυψη Review"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHOW MODAL */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(null); }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "32px", maxWidth: 460, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#D1FAE5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <Eye size={28} color="#15803D" strokeWidth={2.2} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0F172A", marginBottom: 12, textAlign: "center" }}>
              Επανεμφάνιση Review;
            </h2>
            <p style={{ fontSize: 14, color: "#64748B", marginBottom: 20, lineHeight: 1.6, textAlign: "center" }}>
              Το review θα ξαναεμφανιστεί στο site. Ο λόγος απόκρυψης θα διαγραφεί από το ιστορικό.
            </p>

            <div style={{ background: "#F8FAFC", borderRadius: 10, padding: "12px 16px", marginBottom: 20, borderLeft: "3px solid #CBD5E1" }}>
              <div style={{ fontSize: 12, color: "#64748B", marginBottom: 4 }}>
                <strong>{showModal.patient_name}</strong> → {showModal.therapist_name}
              </div>
              <Stars rating={showModal.rating} size={13} />
              {showModal.comment && (
                <p style={{ fontSize: 13, color: "#334155", marginTop: 6, fontStyle: "italic" }}>
                  "{showModal.comment}"
                </p>
              )}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowModal(null)} disabled={showing}
                style={{ flex: 1, padding: "12px", borderRadius: 30, border: "1px solid #e2e8f0", background: "transparent", color: "#64748b", fontSize: 14, fontWeight: 600, cursor: showing ? "not-allowed" : "pointer" }}>
                Ακύρωση
              </button>
              <button onClick={confirmShow} disabled={showing}
                style={{ flex: 2, padding: "12px", borderRadius: 30, border: "none", background: showing ? "#94a3b8" : "#15803D", color: "#fff", fontSize: 14, fontWeight: 600, cursor: showing ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Check size={14} strokeWidth={3} />
                {showing ? "Επανεμφάνιση..." : "Ναι, εμφάνιση"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}