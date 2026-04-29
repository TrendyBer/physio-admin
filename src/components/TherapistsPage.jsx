"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const APP_STATUS = {
  incomplete: { label:"Ελλιπή",       bg:"#F1F5F9", color:"#475569" },
  pending:    { label:"Σε αναμονή",   bg:"#FEF3C7", color:"#92400E" },
  approved:   { label:"Εγκεκριμένος", bg:"#D1FAE5", color:"#065F46" },
  rejected:   { label:"Απορρίφθηκε",  bg:"#FEE2E2", color:"#B91C1C" },
};

function Badge({ label, bg, color }) {
  return <span style={{ background:bg, color, padding:"2px 10px", borderRadius:999, fontSize:11, fontWeight:700, letterSpacing:"0.04em", textTransform:"uppercase", whiteSpace:"nowrap" }}>{label}</span>;
}
function Btn({ children, onClick, variant="primary", small, disabled }) {
  const s = {
    primary: { background:"#1D4ED8", color:"#fff", border:"none" },
    success: { background:"#15803D", color:"#fff", border:"none" },
    danger:  { background:"#BE123C", color:"#fff", border:"none" },
    ghost:   { background:"transparent", color:"#64748B", border:"1px solid #E2E8F0" },
    warning: { background:"#F59E0B", color:"#fff", border:"none" },
    delete:  { background:"#FEF2F2", color:"#DC2626", border:"1px solid #FECACA" },
  }[variant];
  return (
    <button onClick={onClick} disabled={disabled} style={{...s, padding:small?"4px 10px":"8px 18px", borderRadius:8, fontSize:small?11:13, fontWeight:600, cursor:disabled?"not-allowed":"pointer", fontFamily:"inherit", opacity:disabled?0.5:1}}
      onMouseEnter={e=>{ if(!disabled) e.currentTarget.style.opacity="0.85"; }}
      onMouseLeave={e=>{ if(!disabled) e.currentTarget.style.opacity="1"; }}>
      {children}
    </button>
  );
}
function Avatar({ name, photo, size=44 }) {
  if (photo) return <img src={photo} alt={name} style={{ width:size, height:size, borderRadius:"50%", objectFit:"cover", flexShrink:0 }} />;
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:"#EFF6FF", color:"#1D4ED8", display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.33, fontWeight:700, flexShrink:0 }}>
      {name?.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase() || "?"}
    </div>
  );
}

// ─── PROFILE/APPROVAL MODAL ──────────────────────────────────────────────────
function ProfileModal({ therapist, onClose, onApprove, onReject, onSuspend, onActivate, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loadingDoc, setLoadingDoc] = useState(null);

  const status = therapist.is_approved ? "approved" : (therapist.application_status || "incomplete");
  const st = APP_STATUS[status] || APP_STATUS.incomplete;

  async function viewDocument(path) {
    if (!path) return;
    setLoadingDoc(path);
    const { data, error } = await supabase.storage
      .from("therapist-documents")
      .createSignedUrl(path, 3600);
    setLoadingDoc(null);
    if (error) {
      alert("Σφάλμα: " + error.message);
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  const hasLicense = !!therapist.license_url;
  const hasCv = !!therapist.cv_url;
  const certs = therapist.certifications_urls || [];
  const areas = therapist.service_areas || [];

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:24 }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:"#fff", borderRadius:18, width:"100%", maxWidth:680, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>

        {/* Header */}
        <div style={{ padding:"24px 28px 20px", borderBottom:"1px solid #F1F5F9", display:"flex", alignItems:"flex-start", gap:16 }}>
          <Avatar name={therapist.name} photo={therapist.photo_url} size={56}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
              <h2 style={{ fontSize:20, fontWeight:700, color:"#0F172A", margin:0 }}>{therapist.name || "—"}</h2>
              <Badge label={st.label} bg={st.bg} color={st.color}/>
            </div>
            <div style={{ fontSize:13, color:"#64748B", marginTop:4 }}>
              {therapist.specialty || "—"} · {therapist.area || "—"}
            </div>
            {therapist.years_experience && (
              <div style={{ fontSize:12, color:"#94A3B8", marginTop:2 }}>{therapist.years_experience} χρόνια εμπειρία</div>
            )}
            {therapist.price_per_session && (
              <div style={{ fontSize:13, color:"#1D4ED8", marginTop:4, fontWeight:600 }}>💰 {therapist.price_per_session}€/συνεδρία</div>
            )}
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#94A3B8", padding:4 }}>✕</button>
        </div>

        <div style={{ padding:"20px 28px", display:"flex", flexDirection:"column", gap:20 }}>
          {/* Bio */}
          {therapist.bio && (
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Βιογραφικό</div>
              <p style={{ fontSize:14, color:"#475569", lineHeight:1.6, margin:0, background:"#F8FAFC", padding:"12px 14px", borderRadius:8, borderLeft:"3px solid #CBD5E1" }}>
                {therapist.bio}
              </p>
            </div>
          )}

          {/* Service Areas */}
          {areas.length > 0 && (
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>📍 Περιοχές Εξυπηρέτησης ({areas.length})</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {areas.map(a => (
                  <span key={a} style={{ background:"#EFF6FF", color:"#1D4ED8", padding:"4px 10px", borderRadius:999, fontSize:12, fontWeight:500, border:"1px solid #BFDBFE" }}>
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>📄 Δικαιολογητικά</div>

            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {/* License (required) */}
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background: hasLicense ? "#F0FDF4" : "#FEF3C7", border:`1px solid ${hasLicense ? "#BBF7D0" : "#FDE68A"}`, borderRadius:10 }}>
                <span style={{ fontSize:18 }}>{hasLicense ? "✅" : "⚠️"}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:"#0F172A" }}>Άδεια Εξασκήσεως</div>
                  <div style={{ fontSize:11, color:"#64748B" }}>{hasLicense ? "Ανέβηκε" : "Δεν έχει ανεβεί (υποχρεωτικό)"}</div>
                </div>
                {hasLicense && (
                  <button onClick={()=>viewDocument(therapist.license_url)} disabled={loadingDoc===therapist.license_url}
                    style={{ background:"#15803D", color:"#fff", border:"none", borderRadius:8, padding:"6px 14px", fontSize:12, fontWeight:600, cursor:"pointer" }}>
                    {loadingDoc===therapist.license_url ? "..." : "👁️ Προβολή"}
                  </button>
                )}
              </div>

              {/* CV */}
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"#F8FAFC", border:"1px solid #E2E8F0", borderRadius:10 }}>
                <span style={{ fontSize:18 }}>{hasCv ? "✅" : "➖"}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:"#0F172A" }}>Βιογραφικό</div>
                  <div style={{ fontSize:11, color:"#64748B" }}>{hasCv ? "Ανέβηκε" : "Προαιρετικό"}</div>
                </div>
                {hasCv && (
                  <button onClick={()=>viewDocument(therapist.cv_url)} disabled={loadingDoc===therapist.cv_url}
                    style={{ background:"#1D4ED8", color:"#fff", border:"none", borderRadius:8, padding:"6px 14px", fontSize:12, fontWeight:600, cursor:"pointer" }}>
                    {loadingDoc===therapist.cv_url ? "..." : "👁️ Προβολή"}
                  </button>
                )}
              </div>

              {/* Certifications */}
              {certs.length > 0 ? (
                certs.map((path, idx) => (
                  <div key={path} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"#FAF5FF", border:"1px solid #E9D5FF", borderRadius:10 }}>
                    <span style={{ fontSize:18 }}>🏆</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:"#0F172A" }}>Πιστοποιητικό {idx+1}</div>
                      <div style={{ fontSize:11, color:"#64748B" }}>Ανέβηκε</div>
                    </div>
                    <button onClick={()=>viewDocument(path)} disabled={loadingDoc===path}
                      style={{ background:"#7E22CE", color:"#fff", border:"none", borderRadius:8, padding:"6px 14px", fontSize:12, fontWeight:600, cursor:"pointer" }}>
                      {loadingDoc===path ? "..." : "👁️ Προβολή"}
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"#F8FAFC", border:"1px solid #E2E8F0", borderRadius:10 }}>
                  <span style={{ fontSize:18 }}>➖</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:"#0F172A" }}>Πιστοποιητικά</div>
                    <div style={{ fontSize:11, color:"#64748B" }}>Δεν υπάρχουν (προαιρετικά)</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Contact info */}
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Στοιχεία Επικοινωνίας</div>
            <div style={{ background:"#F8FAFC", borderRadius:10, padding:"12px 14px", fontSize:13, color:"#475569", lineHeight:1.7 }}>
              <div>📧 <strong>Email:</strong> {therapist.email || "—"}</div>
              {therapist.phone && <div>📞 <strong>Τηλέφωνο:</strong> {therapist.phone}</div>}
              <div>🆔 <strong>User ID:</strong> <code style={{ fontSize:11, background:"#fff", padding:"1px 6px", borderRadius:4 }}>{therapist.id}</code></div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display:"flex", gap:10, paddingTop:8, borderTop:"1px solid #F1F5F9", flexWrap:"wrap", alignItems:"center" }}>
            {/* Pending → Approve / Reject */}
            {status === "pending" && hasLicense && (
              <>
                <Btn variant="success" onClick={()=>{ onApprove(therapist.id); onClose(); }}>✓ Έγκριση</Btn>
                <Btn variant="danger" onClick={()=>{ onReject(therapist.id); onClose(); }}>✕ Απόρριψη</Btn>
              </>
            )}

            {/* Pending without license */}
            {status === "pending" && !hasLicense && (
              <div style={{ background:"#FEF3C7", color:"#92400E", padding:"8px 14px", borderRadius:8, fontSize:13, fontWeight:600 }}>
                ⚠️ Δεν μπορεί να εγκριθεί χωρίς άδεια
              </div>
            )}

            {/* Incomplete */}
            {status === "incomplete" && (
              <div style={{ background:"#F1F5F9", color:"#475569", padding:"8px 14px", borderRadius:8, fontSize:13 }}>
                ℹ️ Ο θεραπευτής δεν έχει ανεβάσει ακόμα τα δικαιολογητικά
              </div>
            )}

            {/* Rejected → Re-approve */}
            {status === "rejected" && (
              <Btn variant="success" onClick={()=>{ onApprove(therapist.id); onClose(); }}>▶ Έγκριση</Btn>
            )}

            {/* Approved → Suspend */}
            {therapist.is_approved && (
              <Btn variant="warning" onClick={()=>{ onSuspend(therapist.id); onClose(); }}>⏸ Αναστολή</Btn>
            )}

            {/* Delete */}
            <div style={{ marginLeft:"auto" }}>
              {!confirmDelete ? (
                <Btn variant="delete" onClick={()=>setConfirmDelete(true)}>🗑 Διαγραφή</Btn>
              ) : (
                <div style={{ display:"flex", alignItems:"center", gap:8, background:"#FEF2F2", padding:"8px 12px", borderRadius:8, border:"1px solid #FECACA" }}>
                  <span style={{ fontSize:12, color:"#DC2626", fontWeight:600 }}>Σίγουρα;</span>
                  <Btn variant="danger" small onClick={()=>{ onDelete(therapist.id); onClose(); }}>Ναι</Btn>
                  <Btn variant="ghost" small onClick={()=>setConfirmDelete(false)}>Όχι</Btn>
                </div>
              )}
            </div>

            <Btn variant="ghost" onClick={onClose}>Κλείσιμο</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────
export default function TherapistsPage() {
  const [therapists, setTherapists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => { fetchTherapists(); }, []);

  async function fetchTherapists() {
    setLoading(true);
    // Get therapists
    const { data: profiles } = await supabase
      .from("therapist_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    // Get auth users to merge emails
    const ids = (profiles || []).map(p => p.id);
    let emailMap = {};
    if (ids.length > 0) {
      // Try to get from user_profiles or auth (we use admin API workaround via separate query if needed)
      // For now we rely on profile data only - email might be stored in profile or not
    }

    setTherapists(profiles || []);
    setLoading(false);
  }

  async function approveTherapist(id) {
    await supabase.from("therapist_profiles").update({
      is_approved: true,
      application_status: "approved",
    }).eq("id", id);
    await fetchTherapists();
  }

  async function rejectTherapist(id) {
    await supabase.from("therapist_profiles").update({
      is_approved: false,
      application_status: "rejected",
    }).eq("id", id);
    await fetchTherapists();
  }

  async function suspendTherapist(id) {
    await supabase.from("therapist_profiles").update({
      is_approved: false,
      application_status: "rejected",
    }).eq("id", id);
    await fetchTherapists();
  }

  async function deleteTherapist(id) {
    const { error } = await supabase.from("therapist_profiles").delete().eq("id", id);
    if (error) {
      alert("Σφάλμα διαγραφής: " + error.message);
    } else {
      await fetchTherapists();
    }
  }

  // Compute status for filtering
  function getStatus(t) {
    if (t.is_approved) return "approved";
    return t.application_status || "incomplete";
  }

  const counts = {
    all:        therapists.length,
    approved:   therapists.filter(t => t.is_approved).length,
    pending:    therapists.filter(t => !t.is_approved && t.application_status === "pending").length,
    incomplete: therapists.filter(t => !t.is_approved && (!t.application_status || t.application_status === "incomplete")).length,
    rejected:   therapists.filter(t => !t.is_approved && t.application_status === "rejected").length,
  };

  const filtered = therapists.filter(t => {
    const status = getStatus(t);
    const matchFilter = filter === "all" || status === filter;
    const matchSearch = ((t.name||"") + (t.specialty||"") + (t.area||"")).toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  if (loading) return (
    <div style={{ padding:24, display:"flex", alignItems:"center", justifyContent:"center", minHeight:400 }}>
      <div style={{ fontSize:16, color:"#64748B" }}>Φόρτωση θεραπευτών...</div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:26, fontWeight:700, color:"#0F172A", margin:0 }}>Φυσιοθεραπευτές</h1>
        <p style={{ fontSize:13, color:"#94A3B8", marginTop:4 }}>Διαχείριση και έγκριση εγγεγραμμένων θεραπευτών</p>
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:12, marginBottom:20, alignItems:"center", flexWrap:"wrap" }}>
        <div style={{ display:"flex", gap:4, background:"#E2E8F0", padding:4, borderRadius:10, flexWrap:"wrap" }}>
          {[
            ["all", "Όλοι"],
            ["pending", "🔔 Σε αναμονή"],
            ["approved", "Εγκεκριμένοι"],
            ["incomplete", "Ελλιπή"],
            ["rejected", "Απορριφθέντες"],
          ].map(([val, label]) => (
            <button key={val} onClick={()=>setFilter(val)} style={{ padding:"6px 14px", borderRadius:7, border:"none", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", background:filter===val?"#fff":"transparent", color:filter===val?"#0F172A":"#64748B", boxShadow:filter===val?"0 1px 4px rgba(0,0,0,0.1)":"none" }}>
              {label} <span style={{ marginLeft:4, background:filter===val?"#EFF6FF":"transparent", color:filter===val?"#1D4ED8":"#94A3B8", padding:"0 6px", borderRadius:999, fontSize:11 }}>{counts[val]}</span>
            </button>
          ))}
        </div>
        <input type="text" placeholder="Αναζήτηση..." value={search} onChange={e=>setSearch(e.target.value)}
          style={{ flex:1, minWidth:200, padding:"9px 14px", borderRadius:8, border:"1px solid #E2E8F0", fontSize:13, fontFamily:"inherit", background:"#fff", outline:"none", color:"#0F172A" }}/>
      </div>

      {/* Pending alert */}
      {counts.pending > 0 && filter !== "pending" && (
        <div style={{ background:"#FEF3C7", border:"1px solid #FDE68A", borderRadius:10, padding:"12px 16px", marginBottom:16, display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:24 }}>🔔</span>
          <div style={{ flex:1, fontSize:13, color:"#92400E" }}>
            <strong>{counts.pending}</strong> θεραπευτής/ές περιμένουν έγκριση
          </div>
          <Btn variant="warning" small onClick={()=>setFilter("pending")}>Δες τους →</Btn>
        </div>
      )}

      {/* List */}
      <div style={{ background:"#fff", borderRadius:14, border:"1px solid #E2E8F0", overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 80px 120px 180px", padding:"10px 20px", background:"#F8FAFC", borderBottom:"1px solid #E2E8F0", fontSize:11, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.05em" }}>
          <span>Θεραπευτής</span><span>Ειδικότητα</span><span>Περιοχή</span><span>Εμπ.</span><span>Status</span><span>Ενέργειες</span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding:40, textAlign:"center", color:"#94A3B8", fontSize:14 }}>
            {therapists.length === 0 ? "Δεν υπάρχουν θεραπευτές ακόμα." : "Δεν βρέθηκαν θεραπευτές με αυτά τα φίλτρα."}
          </div>
        ) : filtered.map((t, i) => {
          const status = getStatus(t);
          const st = APP_STATUS[status] || APP_STATUS.incomplete;
          const hasLicense = !!t.license_url;
          return (
            <div key={t.id} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 80px 120px 180px", padding:"14px 20px", borderTop:i>0?"1px solid #F1F5F9":"none", alignItems:"center" }}
              onMouseEnter={e=>e.currentTarget.style.background="#FAFAFA"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>

              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <Avatar name={t.name} photo={t.photo_url} size={38}/>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:14, color:"#0F172A", display:"flex", alignItems:"center", gap:6 }}>
                    {t.name || "—"}
                    {hasLicense && <span title="Έχει ανεβάσει άδεια" style={{ fontSize:11 }}>📄</span>}
                  </div>
                  <div style={{ fontSize:11, color:"#94A3B8", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {t.id?.slice(0,8)}...
                  </div>
                </div>
              </div>

              <span style={{ fontSize:13, color:"#475569" }}>{t.specialty || "—"}</span>
              <span style={{ fontSize:13, color:"#475569" }}>{t.area || "—"}</span>
              <span style={{ fontSize:12, color:"#475569" }}>{t.years_experience ? `${t.years_experience}χρ` : "—"}</span>
              <Badge label={st.label} bg={st.bg} color={st.color}/>

              <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                <Btn variant="ghost" small onClick={()=>setSelected(t)}>Προφίλ</Btn>
                {status === "pending" && hasLicense && (
                  <>
                    <Btn variant="success" small onClick={()=>approveTherapist(t.id)}>✓</Btn>
                    <Btn variant="danger"  small onClick={()=>rejectTherapist(t.id)}>✕</Btn>
                  </>
                )}
                {t.is_approved && (
                  <Btn variant="warning" small onClick={()=>suspendTherapist(t.id)}>⏸</Btn>
                )}
                {status === "rejected" && (
                  <Btn variant="success" small onClick={()=>approveTherapist(t.id)}>▶</Btn>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <ProfileModal
          therapist={selected}
          onClose={()=>setSelected(null)}
          onApprove={approveTherapist}
          onReject={rejectTherapist}
          onSuspend={suspendTherapist}
          onActivate={approveTherapist}
          onDelete={deleteTherapist}
        />
      )}
    </div>
  );
}