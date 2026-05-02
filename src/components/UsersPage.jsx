"use client";
import { useState } from "react";
import { Stethoscope, User } from "lucide-react";
import TherapistsPage from "./TherapistsPage";
import PatientsPage from "./PatientsPage";

const TABS = [
  { id: "therapists", label: "Φυσιοθεραπευτές", Icon: Stethoscope },
  { id: "patients",   label: "Ασθενείς",        Icon: User },
];

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState("therapists");

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0F172A", margin: 0 }}>Χρήστες</h1>
        <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>
          Διαχείριση φυσιοθεραπευτών και ασθενών της πλατφόρμας
        </p>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 4, background: "#E2E8F0", padding: 4, borderRadius: 12, width: "fit-content", marginBottom: 24, flexWrap: "wrap" }}>
        {TABS.map(t => {
          const TabIcon = t.Icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: "9px 20px",
                borderRadius: 8,
                border: "none",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                background: isActive ? "#fff" : "transparent",
                color: isActive ? "#0F172A" : "#64748B",
                boxShadow: isActive ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <TabIcon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "therapists" && <TherapistsPage hideHeader />}
        {activeTab === "patients" && <PatientsPage hideHeader />}
      </div>
    </div>
  );
}