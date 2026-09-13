import { useEffect, useState } from "react";
import Link from "next/link";
import BackButton from "../components/BackButton";

const API_URL = "/api";

export default function ProfilePage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const savedProfile = JSON.parse(window.localStorage.getItem("profile") || "null");
      if (!savedProfile) return;
      const timer = window.setTimeout(() => {
        setName(savedProfile.name || "");
        setEmail(savedProfile.email || "");
        setPhone(savedProfile.phone || "");
      }, 0);
      return () => window.clearTimeout(timer);
    } catch {
      // Ignore invalid stored data
    }
  }, []);

  const handleSave = async (event) => {
    event.preventDefault();

    if (typeof window === "undefined") return;

    setLoading(true);
    setError("");
    try {
      const userId = window.localStorage.getItem("userId");
      const token = window.localStorage.getItem("token");
      if (!userId) throw new Error("Please sign in before updating your profile.");
      const response = await fetch(`${API_URL}/profile/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name, email, phone }),
      });
      if (!response.ok) throw new Error(await response.text());
      window.localStorage.setItem("profile", JSON.stringify({ name, email, phone }));
      setMessage("Profile updated successfully.");
    } catch (requestError) {
      setError(requestError.message || "Unable to update profile.");
    } finally {
      setLoading(false);
    }
  };

  const pageStyle = {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(135deg, #eef2ff 0%, #f8fafc 45%, #ecfeff 100%)",
    padding: "32px 20px",
    fontFamily: "Inter, Arial, sans-serif",
  };

  const cardStyle = {
    width: "100%",
    maxWidth: "760px",
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                background: "#e0e7ff",
                color: "#4338ca",
                borderRadius: "999px",
                padding: "7px 12px",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Account
            </div>
            <h1 style={{ margin: "16px 0 8px", fontSize: "34px", color: "#0f172a" }}>Profile</h1>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(110px, 1fr))",
              gap: 12,
              width: "100%",
              maxWidth: 260,
            }}
          >
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "12px 14px" }}>
              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: 6 }}>Status</div>
              <strong style={{ color: "#0f172a" }}>Active</strong>
            </div>
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "12px 14px" }}>
              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: 6 }}>Member</div>
              <strong style={{ color: "#0f172a" }}>Pro</strong>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} style={{ display: "grid", gap: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18 }}>
            <label style={{ display: "grid", gap: 8, color: "#0f172a", fontWeight: 600 }}>
              Full name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                style={inputStyle}
              />
            </label>

            <label style={{ display: "grid", gap: 8, color: "#0f172a", fontWeight: 600 }}>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                style={inputStyle}
              />
            </label>
          </div>

          <label style={{ display: "grid", gap: 8, color: "#0f172a", fontWeight: 600 }}>
            Phone number
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              style={inputStyle}
            />
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" disabled={loading} style={{ ...buttonStyle, opacity: loading ? 0.7 : 1 }}>{loading ? "Saving..." : "Save changes"}</button>
          </div>
        </form>

        {error ? <p style={{ marginTop: 18, color: "#dc2626", fontWeight: 600 }}>{error}</p> : null}
        {message ? <p style={{ marginTop: 18, color: "#15803d", fontWeight: 600 }}>{message}</p> : null}

        <div style={{ marginTop: 22, display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
          <Link
            href="/users"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
              color: "#fff",
              background: "#0f766e",
              borderRadius: "12px",
              padding: "10px 16px",
              fontWeight: 700,
            }}
          >
            Users dashboard
          </Link>
          <BackButton label="← Back to login" />
        </div>
      </div>
    </main>
  );
}
