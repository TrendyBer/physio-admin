import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const EMPTY = {
  name_el: '', name_en: '',
  sessions: '', price_per_session: '',
  discount_percent: 0,
  description_el: '', description_en: '',
  is_active: true, display_order: 0,
};

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
    const { data } = await supabase.from('packages').select('*').order('display_order');
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
    setForm({ ...pkg });
    setModal(true);
  }

  async function savePackage() {
    if (!form.name_el || !form.sessions || !form.price_per_session) {
      alert('Συμπλήρωσε: Όνομα (ΕΛ), Αριθμός Συνεδριών, Τιμή/Συνεδρία');
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

    if (editing) {
      await supabase.from('packages').update(payload).eq('id', editing);
    } else {
      await supabase.from('packages').insert([payload]);
    }
    setSaving(false);
    setModal(false);
    fetchPackages();
  }

  async function deletePackage(id) {
    await supabase.from('packages').delete().eq('id', id);
    setDeleteConfirm(null);
    fetchPackages();
  }

  async function toggleActive(pkg) {
    await supabase.from('packages').update({ is_active: !pkg.is_active }).eq('id', pkg.id);
    fetchPackages();
  }

  function finalPrice(pkg) {
    const total = pkg.sessions * pkg.price_per_session;
    return (total * (1 - pkg.discount_percent / 100)).toFixed(2);
  }

  const inp = { width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', color: '#0F172A' };
  const lbl = { fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 };

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>📦 Διαχείριση Πακέτων</h1>
          <p style={{ fontSize: 13, color: '#64748B' }}>Δημιουργία, επεξεργασία και ενεργοποίηση πακέτων συνεδριών.</p>
        </div>
        <button onClick={openNew}
          style={{ background: '#1a2e44', color: '#fff', padding: '10px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
          + Νέο Πακέτο
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Σύνολο', value: packages.length, bg: '#EFF6FF', color: '#1D4ED8' },
          { label: 'Ενεργά', value: packages.filter(p => p.is_active).length, bg: '#F0FDF4', color: '#15803D' },
          { label: 'Ανενεργά', value: packages.filter(p => !p.is_active).length, bg: '#FEF2F2', color: '#DC2626' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '14px 20px', flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: s.color, textTransform: 'uppercase', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Φόρτωση...</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['Σειρά', 'Όνομα', 'Συνεδρίες', 'Τιμή/Συνεδρία', 'Έκπτωση', 'Τελική Τιμή', 'Κατάσταση', 'Ενέργειες'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#475569', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg, i) => (
                <tr key={pkg.id} style={{ borderBottom: i < packages.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#64748B' }}>{pkg.display_order}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#0F172A' }}>{pkg.name_el}</div>
                    {pkg.name_en && <div style={{ fontSize: 12, color: '#94A3B8' }}>{pkg.name_en}</div>}
                    {pkg.description_el && <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{pkg.description_el.slice(0, 50)}...</div>}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{pkg.sessions}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#0F172A' }}>€{pkg.price_per_session}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {pkg.discount_percent > 0 ? (
                      <span style={{ background: '#D1FAE5', color: '#065F46', padding: '3px 8px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
                        -{pkg.discount_percent}%
                      </span>
                    ) : <span style={{ color: '#94A3B8', fontSize: 13 }}>—</span>}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 700, color: '#1a2e44' }}>€{finalPrice(pkg)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <button onClick={() => toggleActive(pkg)}
                      style={{ background: pkg.is_active ? '#D1FAE5' : '#FEE2E2', color: pkg.is_active ? '#065F46' : '#DC2626', border: 'none', padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      {pkg.is_active ? '✓ Ενεργό' : '✕ Ανενεργό'}
                    </button>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => openEdit(pkg)}
                        style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        ✏️ Επεξ.
                      </button>
                      <button onClick={() => setDeleteConfirm(pkg.id)}
                        style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {packages.length === 0 && (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Δεν υπάρχουν πακέτα ακόμα.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) setModal(false); }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px 32px', width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 20 }}>
              {editing ? '✏️ Επεξεργασία Πακέτου' : '+ Νέο Πακέτο'}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Names */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Όνομα (Ελληνικά) *</label>
                  <input value={form.name_el} onChange={e => setForm(p => ({ ...p, name_el: e.target.value }))} style={inp} placeholder="π.χ. Πακέτο 5 Συνεδριών" />
                </div>
                <div>
                  <label style={lbl}>Όνομα (Αγγλικά)</label>
                  <input value={form.name_en} onChange={e => setForm(p => ({ ...p, name_en: e.target.value }))} style={inp} placeholder="e.g. 5 Session Package" />
                </div>
              </div>

              {/* Numbers */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Αριθμός Συνεδριών *</label>
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
                  <label style={lbl}>Σειρά Εμφάνισης</label>
                  <input type="number" min={0} value={form.display_order} onChange={e => setForm(p => ({ ...p, display_order: e.target.value }))} style={inp} placeholder="0" />
                </div>
              </div>

              {/* Final price preview */}
              {form.sessions && form.price_per_session && (
                <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '12px 16px', fontSize: 13 }}>
                  <span style={{ color: '#64748B' }}>Τελική τιμή: </span>
                  <strong style={{ color: '#1D4ED8' }}>
                    €{(parseFloat(form.sessions) * parseFloat(form.price_per_session) * (1 - (parseFloat(form.discount_percent) || 0) / 100)).toFixed(2)}
                  </strong>
                  <span style={{ color: '#94A3B8', marginLeft: 8 }}>
                    (€{(parseFloat(form.sessions) * parseFloat(form.price_per_session)).toFixed(2)} - {form.discount_percent || 0}%)
                  </span>
                </div>
              )}

              {/* Descriptions */}
              <div>
                <label style={lbl}>Περιγραφή (Ελληνικά)</label>
                <textarea value={form.description_el} onChange={e => setForm(p => ({ ...p, description_el: e.target.value }))} rows={2}
                  style={{ ...inp, resize: 'vertical' }} placeholder="Σύντομη περιγραφή πακέτου..." />
              </div>
              <div>
                <label style={lbl}>Περιγραφή (Αγγλικά)</label>
                <textarea value={form.description_en} onChange={e => setForm(p => ({ ...p, description_en: e.target.value }))} rows={2}
                  style={{ ...inp, resize: 'vertical' }} placeholder="Short package description..." />
              </div>

              {/* Active toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: '#0F172A' }}>
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
                  style={{ width: 18, height: 18, accentColor: '#2a6fdb', cursor: 'pointer' }} />
                Ενεργό (εμφανίζεται στο site)
              </label>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={savePackage} disabled={saving}
                style={{ flex: 1, background: '#1a2e44', color: '#fff', padding: '12px', borderRadius: 30, fontSize: 14, fontWeight: 600, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Αποθήκευση...' : editing ? '💾 Αποθήκευση' : '+ Δημιουργία'}
              </button>
              <button onClick={() => setModal(false)}
                style={{ padding: '12px 20px', borderRadius: 30, border: '1px solid #e2e8f0', background: 'transparent', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Άκυρο
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px 32px', maxWidth: 400, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Διαγραφή Πακέτου;</h3>
            <p style={{ fontSize: 14, color: '#64748B', marginBottom: 24 }}>Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => deletePackage(deleteConfirm)}
                style={{ flex: 1, background: '#DC2626', color: '#fff', padding: '12px', borderRadius: 30, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                Διαγραφή
              </button>
              <button onClick={() => setDeleteConfirm(null)}
                style={{ flex: 1, padding: '12px', borderRadius: 30, border: '1px solid #e2e8f0', background: 'transparent', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Άκυρο
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}