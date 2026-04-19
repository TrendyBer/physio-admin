"use client";
import { useState } from "react";

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

function ComingSoon({ title }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 12 }}>
      <div style={{ fontSize: 48 }}>🚧</div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: "#0F172A", margin: 0, fontFamily: "'DM Serif Display', serif" }}>{title}</h2>
      <p style={{ fontSize: 14, color: "#94A3B8", margin: 0 }}>Αυτό το module είναι σε κατασκευή</p>
    </div>
  );
}

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

function Sidebar({ activePage, onNavigate }) {
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

      <div style={{ margin: "0 12px", padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.05)" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#CBD5E1" }}>Admin</div>
        <div style={{ fontSize: 11, color: "#475569" }}>you@physio.gr</div>
      </div>
    </aside>
  );
}

export default function AdminLayout() {
  const [activePage, setActivePage] = useState("dashboard");

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

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "'DM Sans', sans-serif", display: "flex" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap');`}</style>
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main style={{ flex: 1, padding: "32px 36px", minWidth: 0 }}>
        {renderPage()}
      </main>
    </div>
  );
}