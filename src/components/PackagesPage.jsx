"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  Package, Plus, Pencil, Trash2, Check, X, Save, AlertTriangle,
  Eye, EyeOff, Info, Tag,
} from "lucide-react";

const EMPTY = {
  name_el: "", name_en: "",
  sessions: "", price_per_session: "",
  discount_percent: 0,
  description_el: "", description_en: "",
  is_active: true, display_order: 0,
};

const eur = (v) => {
  const n = Number(v);
  return isNaN(n) ? "—" : `${n.toFixed(2)}€`;
};

// Ασφαλής υπολογισμός τελικής τιμής — επιστρέφει null αν λείπουν δεδομένα
function finalPriceValue(pkg) {
  const s = Number(pkg.sessions);
  const p = Number(pkg.price_per_session);
  if (!s || !p) return null;
  const total = s * p;
  const disc = Number(pkg.discount_percent) || 0;
  return total * (1 - disc / 100);
}

function StatCard({ label, value, color, bg, border }) {
  return (
    <div style={{ flex: 1, minWidth: 130, background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "16px 20px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

export default function PackagesPage() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => { fetchPackages(); }, []);

  async function fetchPackages() {
    setLoading(true);
    const { data } = await supabase.from("packages").select("*").order("display_order");
    setPackages(data || []);
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setForm(EMPTY);
    setModal(true);
  }

  function openEdit(pkg) {
    setEditing(pkg.id);
    setForm({ ...EMPTY, ...pkg });
    setModal(true);
  }

  async function savePackage() {
    if (!form.name_el || !form.sessions || !form.price_per_session) {
      alert("Συμπλήρωσε: Όνομα (ΕΛ), Αριθμός Συνεδριών, Τιμή/Συνεδρία");
      return;
    }
    setSaving(true);
    const payload = {
      name_el: form.name_el,
      name_en: form.name_en,
      sessions: parseInt(form.sessions),
      price_per_session: parseFloat(form.price_per_session),
      discount_percent: parseFloat(form.discount_percent) || 0,
      description_el: form.description_el,
      description_en: form.description_en,
      is_active: form.is_active,
      display_order: parseInt(form.display_order) || 0,
    };

    let error;
    if (editing) {
      ({ error } = await supabase.from("packages").update(payload).eq("id", editing));
    } else {
      ({ error } = await supabase.from("packages").insert([payload]));
    }
    setSaving(false);
    if (error) { alert("Σφάλμα: " + error.message); return; }
    setModal(false);
    fetchPackages();
  }

  async function deletePackage(id) {
    const { error } = await supabase.from("packages").delete().eq("id", id);
    if (error) { alert("Σφάλμα: " + error.message); return; }
    setDeleteConfirm(null);
    fetchPackages();
  }

  async function toggleActive(pkg) {
    await supabase.from("packages").update({ is_active: !pkg.is_active }).eq("id", pkg.id);
    fetchPackages();
  }

  const inp = { width: "100%", padding: "10px 12px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", color: "#0F172A" };
  const lbl = { fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 };

  const formFinal = finalPriceValue(form);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0F172A", margin: 0 }}>Πακέτα Συνεδριών</h1>
          <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>
            Πακέτα πολλαπλών συνεδριών που βλέπει ο ασθενής στο site (διαφορετικά από τις συνδρομές θεραπευτών)
          </p>
        </div>
        <button onClick={openNew}
          style={{ background: "#1D4ED8", color: "#fff", padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Plus size={15} /> Νέο Πακέτο
        </button>
      </div>

      {/* Info */}
      <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: "11px 16px", marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 10 }}>
        <Info size={16} color="#1D4ED8" strokeWidth={2} style={{ marginTop: 1, flexShrink: 0 }} />
        <div style={{ fontSize: 12.5, color: "#1E40AF", lineHeight: 1.6 }}>
          Αυτά είναι <strong>πακέτα συνεδριών για ασθενείς</strong> (π.χ. «5 συνεδρίες με έκπτωση»).
          Οι <strong>συνδρομές θεραπευτών</strong> διαχειρίζονται από τη σελίδα «Συνδρομές».
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
        <StatCard label="Σύνολο"   value={packages.length}                          color="#1D4ED8" bg="#EFF6FF" border="#BFDBFE" />
        <StatCard label="Ενεργά"   value={packages.filter(p => p.is_active).length}  color="#15803D" bg="#F0FDF4" border="#BBF7D0" />
        <StatCard label="Ανενεργά" value={packages.filter(p => !p.is_active).length} color="#BE123C" bg="#FFF1F2" border="#FECDD3" />
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#64748B", fontSize: 15 }}>Φόρτωση...</div>
      ) : packages.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 14, border: "1px dashed #E2E8F0", padding: 48, textAlign: "center" }}>
          <Package size={32} color="#94A3B8" style={{ margin: "0 auto 12px" }} />
          <div style={{ fontSize: 15, color: "#64748B", marginBottom: 16 }}>Δεν υπάρχουν πακέτα ακόμα.</div>
          <button onClick={openNew}
            style={{ background: "#1D4ED8", color: "#fff", padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Plus size={14} /> Δημιουργία πρώτου πακέτου
          </button>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 780 }}>
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                  {["Σειρά", "Όνομα", "Συνεδρίες", "Τιμή/Συνεδρία", "Έκπτωση", "Τελική Τιμή", "Κατάσταση", "Ενέργειες"].map(h => (
                    <th key={h} style={{ padding: "12px 16px", fontSize: 11, fontWeight: 700, color: "#64748B", textAlign: "left", textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {packages.map((pkg, i) => {
                  const fp = finalPriceValue(pkg);
                  const missingPrice = !pkg.price_per_session;
                  return (
                    <tr key={pkg.id} style={{ borderBottom: i < packages.length - 1 ? "1px solid #F1F5F9" : "none" }}>
                      <td style={{ padding: "12px 16px", fontSize: 14, color: "#64748B" }}>{pkg.display_order}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "#0F172A" }}>{pkg.name_el || "—"}</div>
                        {pkg.name_en && <div style={{ fontSize: 12, color: "#94A3B8" }}>{pkg.name_en}</div>}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 600, color: "#0F172A" }}>{pkg.sessions || "—"}</td>
                      <td style={{ padding: "12px 16px", fontSize: 14, color: missingPrice ? "#B45309" : "#0F172A" }}>
                        {missingPrice
                          ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600 }}><AlertTriangle size={12} /> Λείπει τιμή</span>
                          : eur(pkg.price_per_session)}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {pkg.discount_percent > 0 ? (
                          <span style={{ background: "#D1FAE5", color: "#065F46", padding: "3px 8px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
                            -{pkg.discount_percent}%
                          </span>
                        ) : <span style={{ color: "#94A3B8", fontSize: 13 }}>—</span>}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 700, color: fp === null ? "#94A3B8" : "#0F172A" }}>
                        {fp === null ? "—" : eur(fp)}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <button onClick={() => toggleActive(pkg)}
                          style={{ background: pkg.is_active ? "#D1FAE5" : "#FEE2E2", color: pkg.is_active ? "#065F46" : "#DC2626", border: "none", padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 4 }}>
                          {pkg.is_active ? <><Eye size={12} /> Ενεργό</> : <><EyeOff size={12} /> Ανενεργό</>}
                        </button>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => openEdit(pkg)}
                            style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #E2E8F0", background: "#fff", color: "#475569", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <Pencil size={12} /> Επεξ.
                          </button>
                          <button onClick={() => setDeleteConfirm(pkg.id)}
                            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #FECACA", background: "#FEF2F2", color: "#DC2626", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center" }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) setModal(false); }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: "26px 30px", width: "100%", maxWidth: 620, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              {editing ? <Pencil size={18} color="#1D4ED8" /> : <Plus size={18} color="#1D4ED8" />}
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", margin: 0 }}>
                {editing ? "Επεξεργασία Πακέτου" : "Νέο Πακέτο"}
              </h2>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>Όνομα (Ελληνικά) *</label>
                  <input value={form.name_el} onChange={e => setForm(p => ({ ...p, name_el: e.target.value }))} style={inp} placeholder="π.χ. Πακέτο 5 Συνεδριών" />
                </div>
                <div>
                  <label style={lbl}>Όνομα (Αγγλικά)</label>
                  <input value={form.name_en} onChange={e => setForm(p => ({ ...p, name_en: e.target.value }))} style={inp} placeholder="e.g. 5 Session Package" />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>Συνεδρίες *</label>
                  <input type="number" min={1} value={form.sessions} onChange={e => setForm(p => ({ ...p, sessions: e.target.value }))} style={inp} placeholder="5" />
                </div>
                <div>
                  <label style={lbl}>Τιμή/Συνεδρία (€) *</label>
                  <input type="number" min={0} step={0.01} value={form.price_per_session} onChange={e => setForm(p => ({ ...p, price_per_session: e.target.value }))} style={inp} placeholder="40" />
                </div>
                <div>
                  <label style={lbl}>Έκπτωση (%)</label>
                  <input type="number" min={0} max={100} value={form.discount_percent} onChange={e => setForm(p => ({ ...p, discount_percent: e.target.value }))} style={inp} placeholder="10" />
                </div>
                <div>
                  <label style={lbl}>Σειρά</label>
                  <input type="number" min={0} value={form.display_order} onChange={e => setForm(p => ({ ...p, display_order: e.target.value }))} style={inp} placeholder="0" />
                </div>
              </div>

              {/* Final price preview */}
              {formFinal !== null && (
                <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: "12px 16px", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                  <Tag size={14} color="#1D4ED8" />
                  <span style={{ color: "#64748B" }}>Τελική τιμή:</span>
                  <strong style={{ color: "#1D4ED8", fontSize: 15 }}>{eur(formFinal)}</strong>
                  <span style={{ color: "#94A3B8" }}>
                    ({eur(Number(form.sessions) * Number(form.price_per_session))} − {form.discount_percent || 0}%)
                  </span>
                </div>
              )}

              <div>
                <label style={lbl}>Περιγραφή (Ελληνικά)</label>
                <textarea value={form.description_el} onChange={e => setForm(p => ({ ...p, description_el: e.target.value }))} rows={2}
                  style={{ ...inp, resize: "vertical" }} placeholder="Σύντομη περιγραφή πακέτου..." />
              </div>
              <div>
                <label style={lbl}>Περιγραφή (Αγγλικά)</label>
                <textarea value={form.description_en} onChange={e => setForm(p => ({ ...p, description_en: e.target.value }))} rows={2}
                  style={{ ...inp, resize: "vertical" }} placeholder="Short package description..." />
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, color: "#0F172A" }}>
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
                  style={{ width: 18, height: 18, accentColor: "#1D4ED8", cursor: "pointer" }} />
                Ενεργό (εμφανίζεται στο site)
              </label>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
              <button onClick={() => setModal(false)}
                style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #E2E8F0", background: "transparent", color: "#64748B", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Άκυρο
              </button>
              <button onClick={savePackage} disabled={saving}
                style={{ background: saving ? "#94A3B8" : "#1D4ED8", color: "#fff", padding: "10px 24px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none", cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Save size={14} />
                {saving ? "Αποθήκευση..." : editing ? "Αποθήκευση" : "Δημιουργία"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: "28px 32px", maxWidth: 400, width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <Trash2 size={22} color="#DC2626" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>Διαγραφή Πακέτου;</h3>
            <p style={{ fontSize: 14, color: "#64748B", marginBottom: 24 }}>Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setDeleteConfirm(null)}
                style={{ flex: 1, padding: "11px", borderRadius: 8, border: "1px solid #E2E8F0", background: "transparent", color: "#64748B", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Άκυρο
              </button>
              <button onClick={() => deletePackage(deleteConfirm)}
                style={{ flex: 1, background: "#DC2626", color: "#fff", padding: "11px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                Διαγραφή
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}