"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

import AdminDashboard from "./AdminDashboard";
import TherapistsPage from "./TherapistsPage";
import PatientsPage from "./PatientsPage";
import RequestsPage from "./RequestsPage";
import PaymentsPage from "./PaymentsPage";
import ReviewsPage from "./ReviewsPage";
import CategoriesPage from "./CategoriesPage";
import ReportsPage from "./ReportsPage";
import SettingsPage from "./SettingsPage";
import BlogPage from "./BlogPage";
import CMSPage from "./CMSPage";
import PackagesPage from "./PackagesPage";

const NAV_ITEMS = [
  { id: "dashboard",  label: "Dashboard",           icon: "◈" },
  { id: "therapists", label: "Φυσιοθεραπευτές",    icon: "⊕" },
  { id: "patients",   label: "Χρήστες / Ασθενείς", icon: "◉" },
  { id: "requests",   label: "Αιτήματα",            icon: "◫" },
  { id: "packages",   label: "📦 Πακέτα",           icon: "📦" },
  { id: "payments",   label: "Πληρωμές",            icon: "◈" },
  { id: "reviews",    label: "Reviews",             icon: "◇" },
  { id: "categories", label: "Κατηγορίες",          icon: "⊞" },
  { id: "reports",    label: "Αναφορές",            icon: "◰" },
  { id: "settings",   label: "Ρυθμίσεις",           icon: "⚙" },
  { id: "blog",       label: "Blog",                icon: "✍" },
  { id: "cms",        label: "🎨 CMS Site",         icon: "🎨" },
];

function Sidebar({ activePage, onNavigate, adminEmail, onLogout }) {
  return (
    <aside style={{
      width: 220, minHeight: "100vh",
      background: "#0F172A",
      display: "flex", flexDirection: "column",
      padding: "0 0 24px",
      position: "sticky", top: 0,
      flexShrink: 0,
    }}>
      <div style={{ padding: "28px 24px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#F1F5F9", letterSpacing: "-0.02em" }}>
          Physio<span style={{ color: "#38BDF8" }}>Admin</span>
        </div>
        <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>Marketplace Panel</div>
      </div>

      <nav style={{ padding: "16px 12px", flex: 1 }}>
        {NAV_ITEMS.map(item => {
          const isActive = activePage === item.id;
          return (
            <div
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                padding: "9px 14px",
                borderRadius: 8,
                marginBottom: 2,
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "#F1F5F9" : "#64748B",
                background: isActive ? "rgba(56,189,248,0.1)" : "transparent",
                borderLeft: isActive ? "2px solid #38BDF8" : "2px solid transparent",
                cursor: "pointer",
                transition: "all 0.15s",
                userSelect: "none",
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = "#CBD5E1"; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = "#64748B"; }}
            >
              {item.label}
            </div>
          );
        })}
      </nav>

      <div style={{ margin: "0 12px", padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.05)" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#CBD5E1", marginBottom: 2 }}>Admin</div>
        <div style={{ fontSize: 11, color: "#64748B", marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis" }}>{adminEmail}</div>
        <button
          onClick={onLogout}
          style={{
            width: "100%",
            background: "rgba(239,68,68,0.1)",
            color: "#FCA5A5",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 6,
            padding: "6px 10px",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "all 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.2)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
        >
          Αποσύνδεση
        </button>
      </div>
    </aside>
  );
}

export default function AdminLayout() {
  const router = useRouter();
  const [activePage, setActivePage] = useState("dashboard");
  const [authChecking, setAuthChecking] = useState(true);
  const [adminUser, setAdminUser] = useState(null);

  useEffect(() => { checkAuth(); }, []);

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    // Check admin role
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
  }

  async function handleLogout() {
    if (!confirm("Σίγουρα θέλετε να αποσυνδεθείτε;")) return;
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  function renderPage() {
    switch (activePage) {
      case "dashboard":  return <AdminDashboard onNavigate={setActivePage} />;
      case "therapists": return <TherapistsPage onNavigate={setActivePage} />;
      case "patients":   return <PatientsPage />;
      case "requests":   return <RequestsPage />;
      case "packages":   return <PackagesPage />;
      case "payments":   return <PaymentsPage />;
      case "reviews":    return <ReviewsPage />;
      case "categories": return <CategoriesPage />;
      case "reports":    return <ReportsPage />;
      case "settings":   return <SettingsPage />;
      case "blog":       return <BlogPage />;
      case "cms":        return <CMSPage />;
      default:           return <AdminDashboard onNavigate={setActivePage} />;
    }
  }

  if (authChecking) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#F8FAFC",
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 16, color: "#64748B", marginBottom: 8 }}>🔐 Έλεγχος ταυτότητας...</div>
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
      />
      <main style={{ flex: 1, padding: "32px 36px", minWidth: 0 }}>
        {renderPage()}
      </main>
    </div>
  );
}