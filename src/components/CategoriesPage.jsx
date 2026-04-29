"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const COLOR_PRESETS = [
  { color: "#1D4ED8", bg: "#EFF6FF", label: "Μπλε" },
  { color: "#7E22CE", bg: "#FAF5FF", label: "Μωβ" },
  { color: "#15803D", bg: "#F0FDF4", label: "Πράσινο" },
  { color: "#C2410C", bg: "#FFF7ED", label: "Πορτοκαλί" },
  { color: "#0F766E", bg: "#F0FDFA", label: "Τιρκουάζ" },
  { color: "#BE123C", bg: "#FFF1F2", label: "Κόκκινο" },
  { color: "#475569", bg: "#F8FAFC", label: "Γκρι" },
  { color: "#BE185D", bg: "#FDF2F8", label: "Ροζ" },
];

export default function CategoriesPage() {
  const [specialties, setSpecialties] = useState([]);
  const [therapistCounts, setTherapistCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [colorIdx, setColorIdx] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    await Promise.all([loadSpecialties(), loadTherapistCounts()]);
    setLoading(false);
  }

  async function loadSpecialties() {
    const { data, error } = await supabase
      .from("specialties")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Error loading specialties:", error);
      return;
    }
    setSpecialties(data || []);
  }

  async function loadTherapistCounts() {
    const { data, error } = await supabase
      .from("therapist_profiles")
      .select("specialty");

    if (error) {
      console.error("Error loading therapist counts:", error);
      return;
    }

    const counts = {};
    (data || []).forEach((row) => {
      const key = (row.specialty || "").trim();
      if (!key) return;
      counts[key] = (counts[key] || 0) + 1;
    });
    setTherapistCounts(counts);
  }

  function openNew() {
    setEditing(null);
    setName("");
    setDescription("");
    setColorIdx(0);
    setIsActive(true);
    setDisplayOrder(specialties.length + 1);
    setShowModal(true);
  }

  function openEdit(item) {
    setEditing(item);
    setName(item.name || "");
    setDescription(item.description || "");
    const idx = COLOR_PRESETS.findIndex((c) => c.color === item.color);
    setColorIdx(idx >= 0 ? idx : 0);
    setIsActive(!!item.is_active);
    setDisplayOrder(item.display_order || 0);
    setShowModal(true);
  }

  async function handleSave() {
    if (!name.trim()) {
      alert("Το όνομα είναι υποχρεωτικό");
      return;
    }
    setSaving(true);

    const preset = COLOR_PRESETS[colorIdx] || COLOR_PRESETS[0];
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      color: preset.color,
      bg: preset.bg,
      is_active: isActive,
      display_order: Number(displayOrder) || 0,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (editing) {
      ({ error } = await supabase
        .from("specialties")
        .update(payload)
        .eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("specialties").insert(payload));
    }

    setSaving(false);

    if (error) {
      console.error(error);
      alert("Σφάλμα: " + error.message);
      return;
    }

    setShowModal(false);
    await loadSpecialties();
  }

  async function handleToggleActive(item) {
    const { error } = await supabase
      .from("specialties")
      .update({
        is_active: !item.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    if (error) {
      alert("Σφάλμα: " + error.message);
      return;
    }
    loadSpecialties();
  }

  async function handleDelete(item) {
    const count = therapistCounts[item.name] || 0;
    let confirmMsg = `Διαγραφή της ειδικότητας "${item.name}";`;
    if (count > 0) {
      confirmMsg = `⚠️ Η ειδικότητα "${item.name}" χρησιμοποιείται από ${count} θεραπευτή/ές. Είστε σίγουροι ότι θέλετε να τη διαγράψετε;`;
    }
    if (!confirm(confirmMsg)) return;

    const { error } = await supabase
      .from("specialties")
      .delete()
      .eq("id", item.id);

    if (error) {
      alert("Σφάλμα: " + error.message);
      return;
    }
    loadSpecialties();
  }

  const activeCount = specialties.filter((s) => s.is_active).length;
  const totalTherapists = Object.values(therapistCounts).reduce(
    (a, b) => a + b,
    0
  );

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "#0F172A",
              margin: 0,
              fontFamily: "'DM Serif Display', serif",
            }}
          >
            🏷️ Ειδικότητες
          </h1>
          <p style={{ color: "#64748B", margin: "4px 0 0 0" }}>
            Διαχείριση κατηγοριών φυσιοθεραπείας
          </p>
        </div>
        <button
          onClick={openNew}
          style={{
            background: "#38BDF8",
            color: "white",
            border: "none",
            padding: "12px 24px",
            borderRadius: 30,
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(56,189,248,0.3)",
            fontFamily: "inherit",
          }}
        >
          + Νέα Ειδικότητα
        </button>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            background: "white",
            padding: 20,
            borderRadius: 16,
            border: "1px solid #E2E8F0",
          }}
        >
          <div style={{ fontSize: 13, color: "#64748B", marginBottom: 4 }}>
            Σύνολο
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#0F172A" }}>
            {specialties.length}
          </div>
        </div>
        <div
          style={{
            background: "white",
            padding: 20,
            borderRadius: 16,
            border: "1px solid #E2E8F0",
          }}
        >
          <div style={{ fontSize: 13, color: "#64748B", marginBottom: 4 }}>
            Ενεργές
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#15803D" }}>
            {activeCount}
          </div>
        </div>
        <div
          style={{
            background: "white",
            padding: 20,
            borderRadius: 16,
            border: "1px solid #E2E8F0",
          }}
        >
          <div style={{ fontSize: 13, color: "#64748B", marginBottom: 4 }}>
            Θεραπευτές με ειδικότητα
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#1D4ED8" }}>
            {totalTherapists}
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#64748B" }}>
          Φόρτωση...
        </div>
      ) : specialties.length === 0 ? (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            color: "#64748B",
            background: "white",
            borderRadius: 16,
            border: "1px dashed #CBD5E1",
          }}
        >
          Δεν υπάρχουν ειδικότητες ακόμη.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {specialties.map((item) => {
            const count = therapistCounts[item.name] || 0;
            return (
              <div
                key={item.id}
                style={{
                  background: "white",
                  borderRadius: 16,
                  border: `1px solid ${item.is_active ? "#E2E8F0" : "#F1F5F9"}`,
                  overflow: "hidden",
                  opacity: item.is_active ? 1 : 0.6,
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 12px rgba(0,0,0,0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {/* Color band */}
                <div
                  style={{
                    height: 60,
                    background: item.bg,
                    borderBottom: `3px solid ${item.color}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 16px",
                  }}
                >
                  <span
                    style={{
                      color: item.color,
                      fontWeight: 700,
                      fontSize: 16,
                    }}
                  >
                    {item.name}
                  </span>
                  <span
                    style={{
                      background: item.color,
                      color: "white",
                      padding: "4px 10px",
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {count} θεραπ.
                  </span>
                </div>

                {/* Body */}
                <div style={{ padding: 16 }}>
                  <p
                    style={{
                      fontSize: 13,
                      color: "#475569",
                      margin: 0,
                      minHeight: 40,
                      lineHeight: 1.5,
                    }}
                  >
                    {item.description || (
                      <em style={{ color: "#94A3B8" }}>
                        (χωρίς περιγραφή)
                      </em>
                    )}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: 12,
                      fontSize: 12,
                      color: "#94A3B8",
                    }}
                  >
                    <span>Σειρά: {item.display_order || 0}</span>
                    <span>
                      {item.is_active ? (
                        <span style={{ color: "#15803D", fontWeight: 600 }}>
                          ● Ενεργή
                        </span>
                      ) : (
                        <span style={{ color: "#94A3B8" }}>○ Ανενεργή</span>
                      )}
                    </span>
                  </div>

                  {/* Actions */}
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      marginTop: 14,
                      paddingTop: 14,
                      borderTop: "1px solid #F1F5F9",
                    }}
                  >
                    <button
                      onClick={() => openEdit(item)}
                      style={{
                        flex: 1,
                        background: "#EFF6FF",
                        color: "#1D4ED8",
                        border: "none",
                        padding: "8px 0",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      ✏️ Επεξ.
                    </button>
                    <button
                      onClick={() => handleToggleActive(item)}
                      style={{
                        flex: 1,
                        background: item.is_active ? "#FEF3C7" : "#DCFCE7",
                        color: item.is_active ? "#A16207" : "#15803D",
                        border: "none",
                        padding: "8px 0",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      {item.is_active ? "⏸️ Παύση" : "▶️ Ενεργ."}
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      style={{
                        background: "#FEE2E2",
                        color: "#BE123C",
                        border: "none",
                        padding: "8px 12px",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white",
              borderRadius: 20,
              maxWidth: 520,
              width: "100%",
              padding: 28,
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <h2
              style={{
                fontSize: 22,
                fontWeight: 700,
                margin: "0 0 20px 0",
                color: "#0F172A",
              }}
            >
              {editing ? "Επεξεργασία Ειδικότητας" : "Νέα Ειδικότητα"}
            </h2>

            {/* Name */}
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#475569",
                  marginBottom: 6,
                }}
              >
                Όνομα *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="π.χ. Ορθοπαιδική"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid #CBD5E1",
                  borderRadius: 10,
                  fontSize: 15,
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
            </div>

            {/* Description */}
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#475569",
                  marginBottom: 6,
                }}
              >
                Περιγραφή
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Σύντομη περιγραφή..."
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid #CBD5E1",
                  borderRadius: 10,
                  fontSize: 14,
                  outline: "none",
                  fontFamily: "inherit",
                  resize: "vertical",
                }}
              />
            </div>

            {/* Color picker */}
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#475569",
                  marginBottom: 8,
                }}
              >
                Χρώμα
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 8,
                }}
              >
                {COLOR_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => setColorIdx(idx)}
                    style={{
                      background: preset.bg,
                      border:
                        colorIdx === idx
                          ? `2px solid ${preset.color}`
                          : "2px solid transparent",
                      borderRadius: 10,
                      padding: "10px 6px",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                      color: preset.color,
                      fontFamily: "inherit",
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Display order + Active */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginBottom: 24,
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#475569",
                    marginBottom: 6,
                  }}
                >
                  Σειρά εμφάνισης
                </label>
                <input
                  type="number"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid #CBD5E1",
                    borderRadius: 10,
                    fontSize: 15,
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#475569",
                    marginBottom: 6,
                  }}
                >
                  Κατάσταση
                </label>
                <button
                  onClick={() => setIsActive(!isActive)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid #CBD5E1",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    background: isActive ? "#DCFCE7" : "#F1F5F9",
                    color: isActive ? "#15803D" : "#64748B",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {isActive ? "● Ενεργή" : "○ Ανενεργή"}
                </button>
              </div>
            </div>

            {/* Buttons */}
            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setShowModal(false)}
                disabled={saving}
                style={{
                  padding: "10px 20px",
                  border: "1px solid #CBD5E1",
                  borderRadius: 30,
                  background: "white",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#475569",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Άκυρο
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: "10px 24px",
                  border: "none",
                  borderRadius: 30,
                  background: "#38BDF8",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "white",
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.6 : 1,
                  fontFamily: "inherit",
                }}
              >
                {saving ? "Αποθήκευση..." : "💾 Αποθήκευση"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}