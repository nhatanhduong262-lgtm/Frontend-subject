import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

const API_URL = `http://${typeof window !== "undefined" ? window.location.hostname : "localhost"}:5000`;

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
      window.localStorage.setItem("userId", String(result.user.id));
      window.localStorage.setItem("profile", JSON.stringify(result.user));
      router.push("/users");
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
    background: "linear-gradient(135deg, #eef4ff 0%, #f8fafc 45%, #edfdf7 100%)",
    padding: "32px 20px",
    fontFamily: "Inter, Arial, sans-serif",
  };

  const cardStyle = {
    width: "100%",
    maxWidth: "440px",
    background: "rgba(255,255,255,0.9)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    borderRadius: "24px",
    boxShadow: "0 24px 60px rgba(15, 23, 42, 0.12)",
    padding: "32px",
  };

  const inputStyle = {
    width: "100%",
    border: "1px solid #dbe3f0",
    borderRadius: "12px",
    padding: "12px 14px",
    fontSize: "15px",
    background: "#f8fafc",
    boxSizing: "border-box",
    outline: "none",
  };

  const buttonStyle = {
    width: "100%",
    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    padding: "14px 18px",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 10px 20px rgba(37, 99, 235, 0.25)",
  };

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "#dbeafe",
              color: "#1d4ed8",
              borderRadius: "999px",
              padding: "7px 12px",
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Secure access
          </div>
          <h1 style={{ margin: "16px 0 8px", fontSize: "34px", color: "#0f172a" }}>Welcome back</h1>
          <p style={{ margin: 0, color: "#475569", fontSize: "15px" }}>Sign in to continue to your dashboard.</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: "grid", gap: 18 }}>
          <label style={{ display: "grid", gap: 8, color: "#0f172a", fontWeight: 600 }}>
            Email address
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required style={inputStyle} />
          </label>

          <label style={{ display: "grid", gap: 8, color: "#0f172a", fontWeight: 600 }}>
            Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required style={inputStyle} />
          </label>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "#475569" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" style={{ accentColor: "#2563eb" }} />
              Remember me
            </label>
            <Link href="/change-password" style={{ color: "#2563eb", textDecoration: "none", fontWeight: 600 }}>Forgot password?</Link>
          </div>

          <button type="submit" disabled={loading} style={{ ...buttonStyle, opacity: loading ? 0.7 : 1 }}>{loading ? "Signing in..." : "Sign in"}</button>
        </form>

        {error ? <p style={{ marginTop: 18, color: "#dc2626", fontWeight: 600 }}>{error}</p> : null}

        <div
          style={{
            marginTop: 24,
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          {[
            { label: "Profile", href: "/profile" },
            { label: "Register", href: "/register" },
            { label: "Password", href: "/change-password" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                textAlign: "center",
                textDecoration: "none",
                color: "#1e293b",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "10px 8px",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <p style={{ margin: "24px 0 0", textAlign: "center", color: "#475569", fontSize: "14px" }}>
          Don&apos;t have an account? <Link href="/register" style={{ color: "#2563eb", fontWeight: 700, textDecoration: "none" }}>Create one</Link>
        </p>
      </div>
    </main>
  );
}
