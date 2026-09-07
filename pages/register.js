import { useState } from "react";
import Link from "next/link";

const API_URL = "/api";

export default function RegisterPage() {
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

  const pageStyle = {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "radial-gradient(circle at top, #eef4ff 0%, #f8fafc 45%, #edfdf7 100%)",
    padding: "32px 20px",
    fontFamily: "Inter, Arial, sans-serif",
  };

  const cardStyle = {
    width: "100%",
    maxWidth: "500px",
    background: "rgba(255,255,255,0.96)",
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
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    padding: "14px 18px",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 12px 24px rgba(15, 23, 42, 0.18)",
  };

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "#e0f2fe",
              color: "#0f766e",
              borderRadius: "999px",
              padding: "7px 12px",
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Create account
          </div>
          <h1 style={{ margin: "16px 0 8px", fontSize: "34px", color: "#0f172a" }}>Get started</h1>
          <p style={{ margin: 0, color: "#475569", fontSize: "15px" }}>Set up your profile in just a few steps.</p>
        </div>

        <form onSubmit={handleRegister} style={{ display: "grid", gap: 18 }}>
          <label style={{ display: "grid", gap: 8, color: "#0f172a", fontWeight: 600 }}>
            Full name
            <input type="text" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="John Smith" required style={inputStyle} />
          </label>

          <label style={{ display: "grid", gap: 8, color: "#0f172a", fontWeight: 600 }}>
            Email address
            <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" required style={inputStyle} />
          </label>

          <label style={{ display: "grid", gap: 8, color: "#0f172a", fontWeight: 600 }}>
            Password
            <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Create a secure password" required style={inputStyle} />
          </label>

          <label style={{ display: "grid", gap: 8, color: "#0f172a", fontWeight: 600 }}>
            Confirm password
            <input type="password" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} placeholder="Re-enter your password" required style={inputStyle} />
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 10, color: "#475569", fontSize: "14px" }}>
            <input type="checkbox" style={{ accentColor: "#0f172a" }} />
            I agree to the terms and privacy policy.
          </label>

          <button type="submit" disabled={loading} style={{ ...buttonStyle, opacity: loading ? 0.7 : 1 }}>{loading ? "Creating account..." : "Create account"}</button>
        </form>

        {error ? <p style={{ marginTop: 18, color: "#dc2626", fontWeight: 600 }}>{error}</p> : null}
        {message ? <p style={{ marginTop: 18, color: "#15803d", fontWeight: 600 }}>{message}</p> : null}

        <p style={{ margin: "24px 0 0", textAlign: "center", color: "#475569", fontSize: "14px" }}>
          Already have an account? <Link href="/login" style={{ color: "#2563eb", fontWeight: 700, textDecoration: "none" }}>Sign in</Link>
        </p>

        <div style={{ marginTop: 18, textAlign: "center" }}>
          <Link
            href="/login"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
              color: "#0f172a",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "10px 16px",
              fontWeight: 700,
            }}
          >
            ← Back to login
          </Link>
        </div>
      </div>
    </main>
  );
}
