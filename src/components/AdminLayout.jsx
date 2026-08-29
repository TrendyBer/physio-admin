"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  LayoutDashboard, ListChecks, ClipboardList, CreditCard, Users,
  Star, FileText, Heart, FolderTree, Settings, LogOut, Lock,
  Repeat, Tag, Inbox,
} from "lucide-react";

import AdminDashboard from "./AdminDashboard";
import TasksPage from "./TasksPage";
import UsersPage from "./UsersPage";
import RequestsPage from "./RequestsPage";
import PaymentsPage from "./PaymentsPage";
import ReviewsPage from "./ReviewsPage";
import CategoriesPage from "./CategoriesPage";
import SettingsPage from "./SettingsPage";
import BlogPage from "./BlogPage";
import CMSPage from "./CMSPage";
import SubscriptionsPage from "./SubscriptionsPage";
import PromoCodesPage from "./PromoCodesPage";
import LeadsPage from "./LeadsPage";

// ─── NAV STRUCTURE ──────────────────────────────────────────────────────
// ΑΦΑΙΡΕΘΗΚΕ: «Πακέτα» (PackagesPage).
// Ήταν τα πακέτα συνεδριών του ΑΣΘΕΝΗ (πίνακας `packages`) — η δημόσια
// σελίδα /packages καταργήθηκε και κάθε αίτημα αφορά πλέον μία συνεδρία.
// Η σελίδα διάβαζε πίνακα που δεν τροφοδοτεί τίποτα.
//
// ΠΡΟΣΤΕΘΗΚΕ: «Κωδικοί προσφοράς».
const NAV_SECTIONS = [
  {
    section: null,
    items: [
      { id: "dashboard", label: "Dashboard",            Icon: LayoutDashboard },
      { id: "tasks",     label: "Χρειάζονται Ενέργεια", Icon: ListChecks },
    ],
  },
  {
    section: "Λειτουργία",
    items: [
      { id: "requests",  label: "Αιτήματα",  Icon: ClipboardList },
      { id: "leads",     label: "Leads",     Icon: Inbox },
      { id: "payments",  label: "Πληρωμές",  Icon: CreditCard },
    ],
  },
  {
    section: "Χρήστες",
    items: [
      { id: "users", label: "Θεραπευτές & Ασθενείς", Icon: Users },
    ],
  },
  {
    section: "Περιεχόμενο",
    items: [
      { id: "reviews",  label: "Αξιολογήσεις", Icon: Star },
      { id: "blog",     label: "Άρθρα Blog",   Icon: FileText },
      { id: "cms",      label: "Περιστατικά",  Icon: Heart },
    ],
  },
  {
    section: "Διαμόρφωση",
    items: [
      { id: "subscriptions", label: "Πακέτα συνδρομής",  Icon: Repeat },
      { id: "promos",        label: "Κωδικοί προσφοράς", Icon: Tag },
      { id: "categories",    label: "Κατηγορίες",        Icon: FolderTree },
      { id: "settings",      label: "Ρυθμίσεις",         Icon: Settings },
    ],
  },
];

function Sidebar({ activePage, onNavigate, adminEmail, onLogout, taskCount }) {
  return (
    <aside style={{
      width: 240, minHeight: "100vh",
      background: "#0F172A",
      display: "flex", flexDirection: "column",
      padding: "0 0 20px",
      position: "sticky", top: 0,
      flexShrink: 0,
    }}>
      <div style={{ padding: "26px 22px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#F1F5F9", letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#38BDF8", display: "inline-block" }} />
          Physio<span style={{ color: "#38BDF8" }}>Admin</span>
        </div>
        <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>Marketplace Panel</div>
      </div>

      <nav style={{ padding: "12px 12px", flex: 1, overflowY: "auto" }}>
        {NAV_SECTIONS.map((section, sectionIdx) => (
          <div key={sectionIdx} style={{ marginBottom: 14 }}>
            {section.section && (
              <div style={{
                fontSize: 10, fontWeight: 700, color: "#475569",
                textTransform: "uppercase", letterSpacing: "0.1em",
                padding: "10px 14px 6px",
              }}>
                {section.section}
              </div>
            )}

            {section.items.map(item => {
              const isActive = activePage === item.id;
              const ItemIcon = item.Icon;
              const showBadge = item.id === "tasks" && taskCount > 0;
              return (
                <div
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  style={{
                    padding: "9px 14px", borderRadius: 8, marginBottom: 2,
                    fontSize: 13, fontWeight: isActive ? 600 : 500,
                    color: isActive ? "#F1F5F9" : "#94A3B8",
                    background: isActive ? "rgba(56,189,248,0.12)" : "transparent",
                    borderLeft: isActive ? "2px solid #38BDF8" : "2px solid transparent",
                    cursor: "pointer", transition: "all 0.15s", userSelect: "none",
                    display: "flex", alignItems: "center", gap: 10,
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      e.currentTarget.style.color = "#CBD5E1";
                      e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.color = "#94A3B8";
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  <ItemIcon size={15} strokeWidth={isActive ? 2.2 : 2} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {showBadge && (
                    <span style={{
                      background: "#F59E0B", color: "#0F172A",
                      fontSize: 10, fontWeight: 700, padding: "1px 7px",
                      borderRadius: 999, minWidth: 18, textAlign: "center",
                    }}>
                      {taskCount}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      <div style={{ margin: "0 12px", padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.05)" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#CBD5E1", marginBottom: 2 }}>Admin</div>
        <div style={{ fontSize: 11, color: "#64748B", marginBottom: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{adminEmail}</div>
        <button
          onClick={onLogout}
          style={{
            width: "100%", background: "rgba(239,68,68,0.1)", color: "#FCA5A5",
            border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6,
            padding: "7px 10px", fontSize: 11, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.2)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
        >
          <LogOut size={11} />
          Αποσύνδεση
        </button>
      </div>
    </aside>
  );
}

export default function AdminLayout() {
  const [activePage, setActivePage] = useState("dashboard");
  const [authChecking, setAuthChecking] = useState(true);
  const [adminUser, setAdminUser] = useState(null);
  const [taskCount, setTaskCount] = useState(0);

  useEffect(() => { checkAuth(); }, []);

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      await supabase.auth.signOut();
      window.location.href = "/login";
      return;
    }

    setAdminUser(user);
    setAuthChecking(false);
    fetchTaskCount();
  }

  // Μετράει τις εκκρεμότητες για το badge στο sidebar
  async function fetchTaskCount() {
    try {
      const [
        { data: reqs },
        { data: therapists },
        { data: reviews },
        { data: bookings },
        { data: paymentsData },
        { data: leadsData },
      ] = await Promise.all([
        supabase.from("session_requests").select("id, status, therapist_id, type"),
        supabase.from("therapist_profiles").select("id, is_approved, application_status, license_url, license_verified"),
        supabase.from("reviews").select("id, rating, is_published"),
        supabase.from("session_bookings").select("request_id"),
        supabase.from("payments").select("id, paid"),
        supabase.from("leads").select("id, status, created_at"),
      ]);

      const bookedIds = new Set((bookings || []).map(b => b.request_id));

      const unassigned = (reqs || []).filter(
        r => !r.therapist_id && r.status !== "cancelled" && r.status !== "completed"
      ).length;

      // Άδειες που περιμένουν έλεγχο. Το κριτήριο είναι η ίδια η άδεια,
      // όχι το application_status: ένας θεραπευτής μπορεί να ανέβασε την
      // άδεια αλλά το status να έμεινε πίσω.
      const pendingLicences = (therapists || []).filter(
        t => t.license_url && !t.license_verified && t.application_status !== "rejected"
      ).length;

      const unpaid = (paymentsData || []).filter(p => !p.paid).length;

      const badReviews = (reviews || []).filter(rv => rv.rating < 3).length;
      const pendingReviews = (reviews || []).filter(rv => !rv.is_published).length;

      const confirmedNoSessions = (reqs || []).filter(
        r => r.status === "confirmed" && !bookedIds.has(r.id)
      ).length;

      // Leads που περιμένουν πάνω από 24 ώρες — η σελίδα υπόσχεται
      // επικοινωνία εντός 24 ωρών, οπότε είναι πραγματική εκκρεμότητα.
      const staleLeads = (leadsData || []).filter(
        l => l.status === "new" && (Date.now() - new Date(l.created_at).getTime()) >= 86400000
      ).length;

      setTaskCount(unassigned + pendingLicences + unpaid + badReviews + confirmedNoSessions + pendingReviews + staleLeads);
    } catch (_) {
      setTaskCount(0);
    }
  }

  async function handleLogout() {
    if (!confirm("Σίγουρα θέλετε να αποσυνδεθείτε;")) return;
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  function renderPage() {
    switch (activePage) {
      case "dashboard":     return <AdminDashboard onNavigate={setActivePage} />;
      case "tasks":         return <TasksPage onNavigate={setActivePage} />;
      case "users":         return <UsersPage />;
      case "therapists":    return <UsersPage />;
      case "requests":      return <RequestsPage />;
      case "leads":         return <LeadsPage />;
      case "subscriptions": return <SubscriptionsPage />;
      case "promos":        return <PromoCodesPage />;
      case "payments":      return <PaymentsPage />;
      case "reviews":       return <ReviewsPage />;
      case "categories":    return <CategoriesPage />;
      case "settings":      return <SettingsPage />;
      case "blog":          return <BlogPage />;
      case "cms":           return <CMSPage />;
      default:              return <AdminDashboard onNavigate={setActivePage} />;
    }
  }

  if (authChecking) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#F8FAFC", fontFamily: "'DM Sans', sans-serif",
      }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 16, color: "#64748B", marginBottom: 8, display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Lock size={16} color="#64748B" />
            Έλεγχος ταυτότητας...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "'DM Sans', sans-serif", display: "flex" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap');`}</style>
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        adminEmail={adminUser?.email}
        onLogout={handleLogout}
        taskCount={taskCount}
      />
      <main style={{ flex: 1, padding: "32px 36px", minWidth: 0 }}>
        {renderPage()}
      </main>
    </div>
  );
}