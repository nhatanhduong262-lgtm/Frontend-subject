import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

const API_URL = "/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("user");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const result = await response.json();
      const resolvedRole = result.user?.role || selectedRole;
      const userProfile = { ...result.user, role: resolvedRole };

      window.localStorage.setItem("token", result.token);
      window.localStorage.setItem("userId", String(result.user.id));
      window.localStorage.setItem("profile", JSON.stringify(userProfile));

      router.push(resolvedRole === "admin" ? "/admin" : "/dashboard");
    } catch (requestError) {
      setError(requestError.message || "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };

  const handleReturnToDashboard = () => {
    const hasSession = typeof window !== "undefined" && !!window.localStorage.getItem("token");
    router.push(hasSession ? "/dashboard" : "/");
  };

  const isAdminMode = selectedRole === "admin";

  const pageStyle = {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: isAdminMode
      ? "radial-gradient(circle at top, rgba(45, 212, 191, 0.18), transparent 30%), linear-gradient(135deg, #031914 0%, #0a1d1c 45%, #08161c 100%)"
      : "radial-gradient(circle at top, rgba(96, 165, 250, 0.14), transparent 32%), radial-gradient(circle at bottom right, rgba(168,85,247,0.12), transparent 24%), linear-gradient(135deg, #020817 0%, #0b1120 48%, #111827 100%)",
    padding: "32px 20px",
    fontFamily: "Inter, Arial, sans-serif",
    position: "relative",
    overflow: "hidden",
  };

  const cardStyle = {
    width: "100%",
    maxWidth: "460px",
    background: isAdminMode ? "linear-gradient(180deg, rgba(8, 27, 26, 0.94), rgba(15, 23, 42, 0.82))" : "linear-gradient(180deg, rgba(15, 23, 42, 0.9), rgba(17, 24, 39, 0.8))",
    border: isAdminMode ? "1px solid rgba(94, 234, 212, 0.38)" : "1px solid rgba(125, 211, 252, 0.22)",
    borderRadius: "26px",
    boxShadow: isAdminMode
      ? "0 24px 70px rgba(16, 185, 129, 0.18), 0 0 0 1px rgba(45, 212, 191, 0.12)"
      : "0 24px 70px rgba(125, 211, 252, 0.10), 0 0 0 1px rgba(167, 139, 250, 0.12)",
    padding: "32px",
    backdropFilter: "blur(18px)",
    position: "relative",
    zIndex: 1,
  };

  const labelStyle = {
    display: "grid",
    gap: 8,
    color: "#e2e8f0",
    fontWeight: 600,
    fontSize: 14,
  };

  const inputStyle = {
    width: "100%",
    border: "1px solid rgba(148, 163, 184, 0.25)",
    borderRadius: "12px",
    padding: "12px 14px",
    fontSize: "15px",
    background: "rgba(15, 23, 42, 0.72)",
    color: "#f8fafc",
    boxSizing: "border-box",
    outline: "none",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.02)",
  };

  const buttonStyle = {
    width: "100%",
    background: isAdminMode
      ? "linear-gradient(135deg, #10b981 0%, #14b8a6 100%)"
      : "linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    padding: "14px 18px",
    fontSize: "15px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: isAdminMode
      ? "0 16px 30px rgba(16, 185, 129, 0.28)"
      : "0 16px 30px rgba(124, 58, 237, 0.35)",
    letterSpacing: "0.02em",
  };

  return (
    <main style={pageStyle}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: isAdminMode
            ? "linear-gradient(90deg, rgba(16,185,129,0.08), rgba(20,184,166,0.08), rgba(59,130,246,0.08))"
            : "linear-gradient(90deg, rgba(15,118,110,0.08), rgba(124,58,237,0.08), rgba(59,130,246,0.08))",
        }}
      />

      <div style={cardStyle}>
        <div style={{ marginBottom: 20 }}>
          <div className="brand-mark" style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 10, textShadow: isAdminMode ? "0 0 16px rgba(52,211,153,0.45)" : "0 0 16px rgba(125,211,252,0.45)" }}>
            <span className="brand-dot" style={{ boxShadow: isAdminMode ? "0 0 18px rgba(52,211,153,0.8)" : "0 0 18px rgba(168,85,247,0.75)" }} />
            PixelPulse
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: isAdminMode ? "rgba(16, 185, 129, 0.14)" : "rgba(6, 182, 212, 0.14)",
              color: isAdminMode ? "#9ae6b4" : "#67e8f9",
              borderRadius: "999px",
              padding: "7px 12px",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              border: "1px solid rgba(103, 232, 249, 0.2)",
            }}
          >
            {isAdminMode ? "Admin console" : "Player portal"}
          </div>

          <h1 style={{ margin: "16px 0 8px", fontSize: "34px", color: "#f8fafc", letterSpacing: "0.03em", textShadow: isAdminMode ? "0 0 18px rgba(52,211,153,0.18)" : "0 0 18px rgba(125,211,252,0.18)" }}>
            {isAdminMode ? "Control center" : "Welcome back"}
          </h1>

          <p style={{ margin: 0, color: "#cbd5e1", fontSize: "15px" }}>
            {isAdminMode ? "Manage content, players, and live systems." : "Sign in to continue to your dashboard."}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20, padding: 6, borderRadius: 14, background: "rgba(15, 23, 42, 0.62)", border: "1px solid rgba(148,163,184,0.18)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05)" }}>
          <button
            type="button"
            onClick={() => setSelectedRole("user")}
            style={{
              border: "none",
              borderRadius: 10,
              padding: "10px 12px",
              fontWeight: 700,
              background: !isAdminMode ? "linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)" : "transparent",
              color: !isAdminMode ? "#fff" : "#cbd5e1",
              boxShadow: !isAdminMode ? "0 10px 22px rgba(124,58,237,0.28)" : "none",
            }}
          >
            Player
          </button>
          <button
            type="button"
            onClick={() => setSelectedRole("admin")}
            style={{
              border: "none",
              borderRadius: 10,
              padding: "10px 12px",
              fontWeight: 700,
              background: isAdminMode ? "linear-gradient(135deg, #10b981 0%, #14b8a6 100%)" : "transparent",
              color: isAdminMode ? "#fff" : "#cbd5e1",
              boxShadow: isAdminMode ? "0 10px 22px rgba(16,185,129,0.28)" : "none",
            }}
          >
            Admin
          </button>
        </div>

        <form onSubmit={handleLogin} style={{ display: "grid", gap: 18 }}>
          <label style={labelStyle}>
            Email address
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
              style={inputStyle}
            />
          </label>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "#cbd5e1" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" style={{ accentColor: isAdminMode ? "#34d399" : "#8b5cf6" }} />
              Remember me
            </label>
            <Link href="/change-password" style={{ color: isAdminMode ? "#99f6e4" : "#67e8f9", textDecoration: "none", fontWeight: 700 }}>
              Forgot password?
            </Link>
          </div>

          <button type="submit" disabled={loading} style={{ ...buttonStyle, opacity: loading ? 0.7 : 1 }}>
            {loading ? (isAdminMode ? "Opening admin..." : "Signing in...") : isAdminMode ? "Open admin console" : "Sign in"}
          </button>
        </form>

        {error ? <p style={{ marginTop: 18, color: "#fca5a5", fontWeight: 700 }}>{error}</p> : null}

        <div style={{ marginTop: 24, display: "grid", gap: 10 }}>
          <button
            type="button"
            onClick={handleReturnToDashboard}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
              color: "#e2e8f0",
              background: "rgba(15, 23, 42, 0.7)",
              border: "1px solid rgba(148, 163, 184, 0.3)",
              borderRadius: "12px",
              padding: "12px 16px",
              fontSize: "14px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Return to dashboard
          </button>

          <Link
            href="/register"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
              color: "#0f172a",
              background: isAdminMode ? "linear-gradient(135deg, #7dd3fc 0%, #a7f3d0 100%)" : "linear-gradient(135deg, #7dd3fc 0%, #a78bfa 100%)",
              borderRadius: "12px",
              padding: "12px 16px",
              fontSize: "14px",
              fontWeight: 800,
              boxShadow: isAdminMode ? "0 12px 24px rgba(16, 185, 129, 0.18)" : "0 12px 24px rgba(125, 211, 252, 0.18)",
            }}
          >
            Create account
          </Link>
        </div>

        <p style={{ margin: "20px 0 0", textAlign: "center", color: "#cbd5e1", fontSize: "14px" }}>
          Need access? <Link href="/register" style={{ color: isAdminMode ? "#7dd3fc" : "#7dd3fc", fontWeight: 800, textDecoration: "none" }}>Join now</Link>
        </p>
      </div>
    </main>
  );
}
