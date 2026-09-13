import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

const API_URL = "/api";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", phone: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password, phone: form.phone }),
      });
      if (!response.ok) throw new Error(await response.text());
      setMessage("Account created. You can now sign in.");
      setForm({ name: "", email: "", password: "", confirmPassword: "", phone: "" });
    } catch (requestError) {
      setError(requestError.message || "Unable to create account.");
    } finally {
      setLoading(false);
    }
  };

  const handleReturnToDashboard = () => {
    const hasSession = typeof window !== "undefined" && !!window.localStorage.getItem("token");
    router.push(hasSession ? "/dashboard" : "/");
  };

  const handleBackToLogin = () => {
    const hasSession = typeof window !== "undefined" && !!window.localStorage.getItem("token");
    router.push(hasSession ? "/dashboard" : "/login");
  };

  const pageStyle = {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "radial-gradient(circle at top, rgba(139, 92, 246, 0.18), transparent 30%), radial-gradient(circle at bottom right, rgba(6,182,212,0.12), transparent 24%), linear-gradient(135deg, #020817 0%, #0b1120 48%, #111827 100%)",
    padding: "32px 20px",
    fontFamily: "Inter, Arial, sans-serif",
    position: "relative",
    overflow: "hidden",
  };

  const cardStyle = {
    width: "100%",
    maxWidth: "500px",
    background: "linear-gradient(180deg, rgba(15, 23, 42, 0.92), rgba(17, 24, 39, 0.82))",
    border: "1px solid rgba(125, 211, 252, 0.22)",
    borderRadius: "26px",
    boxShadow: "0 24px 70px rgba(125, 211, 252, 0.10), 0 0 0 1px rgba(167, 139, 250, 0.12)",
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
    background: "linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    padding: "14px 18px",
    fontSize: "15px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 18px 30px rgba(139, 92, 246, 0.28)",
    letterSpacing: "0.02em",
  };

  return (
    <main style={pageStyle}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(124,58,237,0.07), rgba(6,182,212,0.07), rgba(59,130,246,0.08))" }} />

      <div style={cardStyle}>
        <div style={{ marginBottom: 24 }}>
          <div className="brand-mark" style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 10, textShadow: "0 0 16px rgba(125,211,252,0.45)" }}>
            <span className="brand-dot" style={{ boxShadow: "0 0 18px rgba(168,85,247,0.75)" }} />
            PixelPulse
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "rgba(167, 139, 250, 0.14)",
              color: "#ddd6fe",
              borderRadius: "999px",
              padding: "7px 12px",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              border: "1px solid rgba(167, 139, 250, 0.2)",
            }}
          >
            Create account
          </div>
          <h1 style={{ margin: "16px 0 8px", fontSize: "34px", color: "#f8fafc", letterSpacing: "0.03em", textShadow: "0 0 18px rgba(125,211,252,0.18)" }}>Get started</h1>
          <p style={{ margin: 0, color: "#cbd5e1", fontSize: "15px" }}>Set up your profile and enter the arena.</p>
        </div>

        <form onSubmit={handleRegister} style={{ display: "grid", gap: 18 }}>
          <label style={labelStyle}>
            Full name
            <input type="text" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="John Smith" required style={inputStyle} />
          </label>

          <label style={labelStyle}>
            Email address
            <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" required style={inputStyle} />
          </label>

          <label style={labelStyle}>
            Password
            <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Create a secure password" required style={inputStyle} />
          </label>

          <label style={labelStyle}>
            Confirm password
            <input type="password" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} placeholder="Re-enter your password" required style={inputStyle} />
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 10, color: "#cbd5e1", fontSize: "14px" }}>
            <input type="checkbox" style={{ accentColor: "#8b5cf6" }} />
            I agree to the terms and privacy policy.
          </label>

          <button type="submit" disabled={loading} style={{ ...buttonStyle, opacity: loading ? 0.7 : 1 }}>{loading ? "Creating account..." : "Create account"}</button>
        </form>

        {error ? <p style={{ marginTop: 18, color: "#fca5a5", fontWeight: 700 }}>{error}</p> : null}
        {message ? <p style={{ marginTop: 18, color: "#a7f3d0", fontWeight: 700 }}>{message}</p> : null}

        <p style={{ margin: "24px 0 0", textAlign: "center", color: "#cbd5e1", fontSize: "14px" }}>
          Already have an account? <Link href="/login" style={{ color: "#7dd3fc", fontWeight: 800, textDecoration: "none" }}>Sign in</Link>
        </p>

        <div style={{ marginTop: 18, display: "grid", gap: 10, textAlign: "center" }}>
          <button
            type="button"
            onClick={handleReturnToDashboard}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
              color: "#e2e8f0",
              background: "rgba(15, 23, 42, 0.8)",
              border: "1px solid rgba(148, 163, 184, 0.2)",
              borderRadius: "12px",
              padding: "10px 16px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Return to dashboard
          </button>

          <button
            type="button"
            onClick={handleBackToLogin}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
              color: "#e2e8f0",
              background: "rgba(15, 23, 42, 0.8)",
              border: "1px solid rgba(148, 163, 184, 0.2)",
              borderRadius: "12px",
              padding: "10px 16px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ← Back to login
          </button>
        </div>
      </div>
    </main>
  );
}
