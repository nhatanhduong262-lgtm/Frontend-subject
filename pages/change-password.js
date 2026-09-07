import { useState } from "react";
import Link from "next/link";

const API_URL = `http://${typeof window !== "undefined" ? window.location.hostname : "localhost"}:5000`;

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
      if (!userId) throw new Error("Please sign in before changing your password.");
      const response = await fetch(`${API_URL}/change-password/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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
    background: "linear-gradient(135deg, #f0fdf4 0%, #f8fafc 45%, #eef2ff 100%)",
    padding: "32px 20px",
    fontFamily: "Inter, Arial, sans-serif",
  };

  const cardStyle = {
    width: "100%",
    maxWidth: "480px",
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
    background: "linear-gradient(135deg, #0f766e 0%, #0f172a 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    padding: "14px 18px",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 12px 24px rgba(15, 118, 110, 0.2)",
  };

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "#d1fae5",
              color: "#065f46",
              borderRadius: "999px",
              padding: "7px 12px",
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Security
          </div>
          <h1 style={{ margin: "16px 0 8px", fontSize: "34px", color: "#0f172a" }}>Change password</h1>
          <p style={{ margin: 0, color: "#475569", fontSize: "15px" }}>Choose a strong password to protect your account.</p>
        </div>

        <form onSubmit={handleChangePassword} style={{ display: "grid", gap: 18 }}>
          <label style={{ display: "grid", gap: 8, color: "#0f172a", fontWeight: 600 }}>
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

          <label style={{ display: "grid", gap: 8, color: "#0f172a", fontWeight: 600 }}>
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

          <label style={{ display: "grid", gap: 8, color: "#0f172a", fontWeight: 600 }}>
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

        {error ? <p style={{ marginTop: 18, color: "#dc2626", fontWeight: 600 }}>{error}</p> : null}
        {message ? <p style={{ marginTop: 18, color: "#15803d", fontWeight: 600 }}>{message}</p> : null}

        <div style={{ marginTop: 22, textAlign: "center" }}>
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
