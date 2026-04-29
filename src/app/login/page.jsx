"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Step 1: Sign in with Supabase
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("Λάθος email ή password");
      setLoading(false);
      return;
    }

    // Step 2: Check role
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", signInData.user.id)
      .single();

    if (profileError || !profile) {
      setError("Δεν βρέθηκε προφίλ χρήστη");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    if (profile.role !== "admin") {
      setError("Δεν έχετε δικαιώματα administrator");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    // Step 3: Redirect to admin
    window.location.href = "/";
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      <div style={{
        background: "#fff",
        borderRadius: 20,
        padding: "40px 36px",
        width: "100%",
        maxWidth: 420,
        boxShadow: "0 25px 80px rgba(0,0,0,0.3)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#0F172A", marginBottom: 8, letterSpacing: "-0.02em" }}>
            Physio<span style={{ color: "#38BDF8" }}>Admin</span>
          </div>
          <div style={{ fontSize: 13, color: "#94A3B8" }}>Σύνδεση Διαχειριστή</div>
        </div>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "1.5px solid #E2E8F0",
                borderRadius: 10,
                fontSize: 14,
                fontFamily: "inherit",
                outline: "none",
                color: "#0F172A",
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "1.5px solid #E2E8F0",
                borderRadius: 10,
                fontSize: 14,
                fontFamily: "inherit",
                outline: "none",
                color: "#0F172A",
              }}
            />
          </div>

          {error && (
            <div style={{
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              color: "#B91C1C",
              padding: "10px 14px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
            }}>
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? "#94A3B8" : "#0F172A",
              color: "#fff",
              border: "none",
              padding: "13px",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              marginTop: 8,
              transition: "all 0.15s",
            }}
          >
            {loading ? "Σύνδεση..." : "Σύνδεση →"}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: "center", fontSize: 11, color: "#94A3B8" }}>
          🔒 Μόνο εξουσιοδοτημένο προσωπικό
        </div>
      </div>
    </div>
  );
}