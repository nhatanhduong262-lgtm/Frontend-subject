import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

const API_URL = "/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      if (!response.ok) throw new Error(await response.text());
      const result = await response.json();
      window.localStorage.setItem("token", result.token);
      window.localStorage.setItem("userId", String(result.user.id));
      window.localStorage.setItem("profile", JSON.stringify(result.user));
      router.push("/dashboard");
    } catch (requestError) {
      setError(requestError.message || "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };

  const pageStyle = {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "radial-gradient(circle at top, rgba(96, 165, 250, 0.14), transparent 32%), linear-gradient(135deg, #020817 0%, #0b1120 48%, #111827 100%)",
    padding: "32px 20px",
    fontFamily: "Inter, Arial, sans-serif",
    position: "relative",
    overflow: "hidden",
  };

  const cardStyle = {
    width: "100%",
    maxWidth: "440px",
    background: "rgba(15, 23, 42, 0.82)",
    border: "1px solid rgba(94, 234, 212, 0.24)",
    borderRadius: "26px",
    boxShadow: "0 24px 70px rgba(15, 118, 110, 0.2), 0 0 0 1px rgba(147, 197, 253, 0.12)",
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
  };

  const buttonStyle = {
    width: "100%",
    background: "linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    padding: "14px 18px",
    fontSize: "15px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 16px 30px rgba(124, 58, 237, 0.35)",
    letterSpacing: "0.02em",
  };

  return (
    <main style={pageStyle}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(15,118,110,0.08), rgba(124,58,237,0.08), rgba(59,130,246,0.08))" }} />

      <div style={cardStyle}>
        <div style={{ marginBottom: 24 }}>
          <div className="brand-mark" style={{ marginBottom: 14 }}>
            <span className="brand-dot" />
            PixelPulse
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "rgba(6, 182, 212, 0.14)",
              color: "#67e8f9",
              borderRadius: "999px",
              padding: "7px 12px",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              border: "1px solid rgba(103, 232, 249, 0.2)",
            }}
          >
            Secure access
          </div>
          <h1 style={{ margin: "16px 0 8px", fontSize: "34px", color: "#f8fafc" }}>Welcome back</h1>
          <p style={{ margin: 0, color: "#cbd5e1", fontSize: "15px" }}>Sign in to continue to your dashboard.</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: "grid", gap: 18 }}>
          <label style={labelStyle}>
            Email address
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required style={inputStyle} />
          </label>

          <label style={labelStyle}>
            Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required style={inputStyle} />
          </label>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "#cbd5e1" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" style={{ accentColor: "#8b5cf6" }} />
              Remember me
            </label>
            <Link href="/change-password" style={{ color: "#67e8f9", textDecoration: "none", fontWeight: 700 }}>Forgot password?</Link>
          </div>

          <button type="submit" disabled={loading} style={{ ...buttonStyle, opacity: loading ? 0.7 : 1 }}>{loading ? "Signing in..." : "Sign in"}</button>
        </form>

        {error ? <p style={{ marginTop: 18, color: "#fca5a5", fontWeight: 700 }}>{error}</p> : null}

        <div style={{ marginTop: 24, display: "grid", gap: 10 }}>
          <Link
            href="/register"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
              color: "#0f172a",
              background: "linear-gradient(135deg, #7dd3fc 0%, #a78bfa 100%)",
              borderRadius: "12px",
              padding: "12px 16px",
              fontSize: "14px",
              fontWeight: 800,
              boxShadow: "0 12px 24px rgba(125, 211, 252, 0.18)",
            }}
          >
            Create account
          </Link>
        </div>

        <p style={{ margin: "20px 0 0", textAlign: "center", color: "#cbd5e1", fontSize: "14px" }}>
          Need access? <Link href="/register" style={{ color: "#7dd3fc", fontWeight: 800, textDecoration: "none" }}>Join now</Link>
        </p>
      </div>
    </main>
  );
}
