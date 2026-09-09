import { useState } from "react";
import Link from "next/link";

const API_URL = "/api";

export default function ChangePasswordPage() {
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (event) => {
    event.preventDefault();

    if (newPass !== confirmPass) {
      setError("The new password and confirmation do not match.");
      setMessage("");
      return;
    }

    setLoading(true);
    try {
      const userId = window.localStorage.getItem("userId");
      const token = window.localStorage.getItem("token");
      if (!userId) throw new Error("Please sign in before changing your password.");
      const response = await fetch(`${API_URL}/change-password/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ oldPassword: oldPass, newPassword: newPass }),
      });
      if (!response.ok) throw new Error(await response.text());
      setMessage("Password changed successfully.");
      setError("");
      setOldPass("");
      setNewPass("");
      setConfirmPass("");
    } catch (requestError) {
      setError(requestError.message || "Unable to change password.");
      setMessage("");
    } finally {
      setLoading(false);
    }
  };

  const pageStyle = {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "radial-gradient(circle at top, rgba(16, 185, 129, 0.12), transparent 30%), linear-gradient(135deg, #020817 0%, #0b1120 48%, #111827 100%)",
    padding: "32px 20px",
    fontFamily: "Inter, Arial, sans-serif",
    position: "relative",
    overflow: "hidden",
  };

  const cardStyle = {
    width: "100%",
    maxWidth: "480px",
    background: "rgba(15, 23, 42, 0.82)",
    border: "1px solid rgba(16, 185, 129, 0.24)",
    borderRadius: "26px",
    boxShadow: "0 24px 70px rgba(16, 185, 129, 0.16), 0 0 0 1px rgba(103, 232, 249, 0.1)",
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
    background: "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    padding: "14px 18px",
    fontSize: "15px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 18px 30px rgba(16, 185, 129, 0.24)",
    letterSpacing: "0.02em",
  };

  return (
    <main style={pageStyle}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(16,185,129,0.06), rgba(6,182,212,0.08), rgba(59,130,246,0.07))" }} />

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
              background: "rgba(16, 185, 129, 0.12)",
              color: "#a7f3d0",
              borderRadius: "999px",
              padding: "7px 12px",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              border: "1px solid rgba(16, 185, 129, 0.2)",
            }}
          >
            Security
          </div>
          <h1 style={{ margin: "16px 0 8px", fontSize: "34px", color: "#f8fafc" }}>Change password</h1>
          <p style={{ margin: 0, color: "#cbd5e1", fontSize: "15px" }}>Choose a strong password to protect your account.</p>
        </div>

        <form onSubmit={handleChangePassword} style={{ display: "grid", gap: 18 }}>
          <label style={labelStyle}>
            Current password
            <input
              type="password"
              required
              value={oldPass}
              onChange={(event) => setOldPass(event.target.value)}
              placeholder="Enter current password"
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            New password
            <input
              type="password"
              required
              value={newPass}
              onChange={(event) => setNewPass(event.target.value)}
              placeholder="Enter new password"
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Confirm new password
            <input
              type="password"
              required
              value={confirmPass}
              onChange={(event) => setConfirmPass(event.target.value)}
              placeholder="Confirm new password"
              style={inputStyle}
            />
          </label>

          <button type="submit" disabled={loading} style={{ ...buttonStyle, opacity: loading ? 0.7 : 1 }}>{loading ? "Updating..." : "Update password"}</button>
        </form>

        {error ? <p style={{ marginTop: 18, color: "#fca5a5", fontWeight: 700 }}>{error}</p> : null}
        {message ? <p style={{ marginTop: 18, color: "#a7f3d0", fontWeight: 700 }}>{message}</p> : null}

        <div style={{ marginTop: 22, textAlign: "center" }}>
          <Link
            href="/login"
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
            }}
          >
            ← Back to login
          </Link>
        </div>
      </div>
    </main>
  );
}
