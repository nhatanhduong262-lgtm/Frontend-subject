import { useEffect, useState } from "react";
import Link from "next/link";
import BackButton from "../components/BackButton";
import { useTheme } from "../hooks/useTheme";

const API_URL = "/api";

// ─── Avatar Presets ──────────────────────────────────────────────────────────
const AVATAR_PRESETS = [
  { url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Destiny", label: "Destiny" },
  { url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix",   label: "Felix" },
  { url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Jasmine", label: "Jasmine" },
  { url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Caleb",   label: "Caleb" },
  { url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Mia",     label: "Mia" },
  { url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Oliver",  label: "Oliver" },
  { url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Chloe",   label: "Chloe" },
  { url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Leo",     label: "Leo" },
  { url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Zoe",     label: "Zoe" },
  { url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Max",     label: "Max" },
];

function getThemeColors(isLight) {
  return isLight ? {
    heroBg:       "rgba(255,253,249,0.90)",
    heroBorder:   "rgba(90,60,30,0.12)",
    heroShadow:   "0 12px 40px rgba(90,60,30,0.10)",
    panelBg:      "rgba(255,253,249,0.92)",
    panelBorder:  "rgba(90,60,30,0.12)",
    panelShadow:  "0 6px 24px rgba(90,60,30,0.08)",
    inputBg:      "rgba(255,253,249,0.9)",
    inputBorder:  "rgba(90,60,30,0.18)",
    text:         "#1a1410",
    muted:        "#6b5e52",
    accent:       "#6d3be8",
    cyan:         "#0369a1",
    greenBg:      "rgba(4,120,87,0.08)",
    greenBorder:  "rgba(4,120,87,0.20)",
    greenText:    "#047857",
    goldBg:       "rgba(180,83,9,0.08)",
    goldBorder:   "rgba(180,83,9,0.20)",
    goldText:     "#b45309",
    dangerBg:     "rgba(185,28,28,0.08)",
    dangerBorder: "rgba(185,28,28,0.20)",
    dangerText:   "#b91c1c",
    cardBorder:   "rgba(90,60,30,0.10)",
    avatarBg:     "rgba(255,253,249,0.98)",
    modalOverlay: "rgba(255,253,249,0.85)",
    itemBg:       "rgba(90,60,30,0.04)",
    itemBgHover:  "rgba(90,60,30,0.08)",
  } : {
    heroBg:       "linear-gradient(135deg, rgba(11,17,33,0.95) 0%, rgba(18,25,45,0.9) 100%)",
    heroBorder:   "rgba(255,255,255,0.08)",
    heroShadow:   "0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
    panelBg:      "rgba(11,17,33,0.85)",
    panelBorder:  "rgba(255,255,255,0.08)",
    panelShadow:  "0 20px 60px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)",
    inputBg:      "rgba(255,255,255,0.04)",
    inputBorder:  "rgba(255,255,255,0.1)",
    text:         "var(--text)",
    muted:        "var(--muted)",
    accent:       "var(--accent)",
    cyan:         "var(--cyan)",
    greenBg:      "rgba(16,185,129,0.1)",
    greenBorder:  "rgba(16,185,129,0.35)",
    greenText:    "#10b981",
    goldBg:       "rgba(245,158,11,0.06)",
    goldBorder:   "rgba(245,158,11,0.2)",
    goldText:     "#f59e0b",
    dangerBg:     "rgba(239,68,68,0.1)",
    dangerBorder: "rgba(239,68,68,0.3)",
    dangerText:   "#ef4444",
    cardBorder:   "var(--border)",
    avatarBg:     "rgba(11,17,33,0.98)",
    modalOverlay: "rgba(0,0,0,0.85)",
    itemBg:       "rgba(255,255,255,0.03)",
    itemBgHover:  "rgba(255,255,255,0.06)",
  };
}

// ─── Main Profile Page ────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { isLight } = useTheme();
  const t = getThemeColors(isLight);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setCurrentUserId(window.localStorage.getItem("userId"));
    try {
      const savedProfile = JSON.parse(window.localStorage.getItem("profile") || "null");
      if (!savedProfile) return;
      setIsAdmin(savedProfile.role === "admin");
      const timer = window.setTimeout(() => {
        setName(savedProfile.name || "");
        setEmail(savedProfile.email || "");
        setPhone(savedProfile.phone || "");
        setAvatarUrl(savedProfile.avatar_url || "");
      }, 0);
      return () => window.clearTimeout(timer);
    } catch { /* ignore */ }
  }, []);

  const handleSave = async (event) => {
    event.preventDefault();
    if (typeof window === "undefined") return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const userId = window.localStorage.getItem("userId");
      const tok = window.localStorage.getItem("token");
      if (!userId) throw new Error("Please sign in before updating your profile.");
      const response = await fetch(`${API_URL}/profile/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
        },
        body: JSON.stringify({ name, email, phone, avatar_url: avatarUrl }),
      });
      if (!response.ok) throw new Error(await response.text());
      window.localStorage.setItem("profile", JSON.stringify({ name, email, phone, avatar_url: avatarUrl }));
      setMessage("Profile updated successfully.");
    } catch (requestError) {
      setError(requestError.message || "Unable to update profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetProgress = async () => {
    if (confirm("Are you sure you want to reset all scores and progress?")) {
      setLoading(true);
      setError("");
      try {
        const { resetPlayerProgress } = await import("../lib/playerProgress");
        await resetPlayerProgress();
        setMessage("Your scores have been reset to 0.");
      } catch {
        setError("Failed to reset scores.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .profile-input:focus {
          border-color: ${isLight ? "rgba(3,105,161,0.6)" : "rgba(61,217,255,0.6)"} !important;
          box-shadow: 0 0 0 3px ${isLight ? "rgba(3,105,161,0.12)" : "rgba(61,217,255,0.12)"} !important;
        }
        .profile-input::placeholder {
          color: ${isLight ? "rgba(107,94,82,0.4)" : "rgba(158,179,217,0.4)"};
        }
      `}</style>

      <main style={{ minHeight: "100vh", padding: "40px 20px", position: "relative", overflow: "hidden" }}>
        {/* Decorative orbs */}
        <div style={{ position: "fixed", top: "15%", left: "5%", width: 300, height: 300, borderRadius: "50%", background: isLight ? "radial-gradient(circle, rgba(109,59,232,0.06) 0%, transparent 70%)" : "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)", pointerEvents: "none", filter: "blur(40px)" }} />
        <div style={{ position: "fixed", bottom: "20%", right: "5%", width: 250, height: 250, borderRadius: "50%", background: isLight ? "radial-gradient(circle, rgba(3,105,161,0.05) 0%, transparent 70%)" : "radial-gradient(circle, rgba(61,217,255,0.1) 0%, transparent 70%)", pointerEvents: "none", filter: "blur(40px)" }} />

        <div style={{ maxWidth: 860, margin: "0 auto", position: "relative", zIndex: 1 }}>

          {/* Top nav */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 999, background: isLight ? "rgba(3,105,161,0.08)" : "rgba(61,217,255,0.08)", border: isLight ? "1px solid rgba(3,105,161,0.25)" : "1px solid rgba(61,217,255,0.25)", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, color: t.cyan }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.cyan, display: "inline-block", boxShadow: `0 0 6px ${t.cyan}` }} />
              Account
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link href="/dashboard" style={{ padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, background: t.itemBg, border: `1px solid ${t.cardBorder}`, color: t.text, textDecoration: "none", transition: "all 0.2s", display: "inline-flex", alignItems: "center", gap: 6 }}
                onMouseOver={e => e.currentTarget.style.background = t.itemBgHover}
                onMouseOut={e => e.currentTarget.style.background = t.itemBg}
              >← Dashboard</Link>
              <Link href="/messages" style={{ padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, background: isLight ? "rgba(16,185,129,0.1)" : "rgba(16,185,129,0.15)", border: isLight ? "1px solid rgba(16,185,129,0.25)" : "1px solid rgba(16,185,129,0.35)", color: isLight ? "#047857" : "#10b981", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>💬 Messages & Friends</Link>
              <Link href="/games" style={{ padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, background: isLight ? "linear-gradient(135deg, rgba(109,59,232,0.10), rgba(3,105,161,0.08))" : "linear-gradient(135deg, rgba(139,92,246,0.25), rgba(61,217,255,0.15))", border: isLight ? "1px solid rgba(109,59,232,0.25)" : "1px solid rgba(139,92,246,0.4)", color: t.accent, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>🎮 Games</Link>
            </div>
          </div>

          {/* Profile Hero Banner */}
          <div style={{ padding: "28px 30px", borderRadius: 24, marginBottom: 24, background: t.heroBg, border: `1px solid ${t.heroBorder}`, boxShadow: t.heroShadow, position: "relative", overflow: "hidden", display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap" }}>
            <div style={{ position: "absolute", top: 0, right: 0, width: "60%", height: "100%", background: isLight ? "linear-gradient(135deg, transparent, rgba(109,59,232,0.04), rgba(3,105,161,0.03))" : "linear-gradient(135deg, transparent, rgba(139,92,246,0.08), rgba(61,217,255,0.06))", pointerEvents: "none" }} />

            {/* Avatar */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div
                onClick={() => setShowAvatarSelector(true)}
                style={{ width: 96, height: 96, borderRadius: "50%", cursor: "pointer", background: avatarUrl ? `url(${avatarUrl}) center/cover` : (isLight ? "linear-gradient(135deg, #6d3be8, #0369a1)" : "linear-gradient(135deg, #8b5cf6, #3dd9ff)"), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, fontWeight: 800, color: "#fff", boxShadow: isLight ? "0 0 0 3px rgba(109,59,232,0.25), 0 0 25px rgba(109,59,232,0.15)" : "0 0 0 3px rgba(139,92,246,0.4), 0 0 25px rgba(139,92,246,0.3)", transition: "box-shadow 0.3s" }}
                onMouseOver={e => e.currentTarget.style.boxShadow = isLight ? "0 0 0 4px rgba(3,105,161,0.4), 0 0 35px rgba(3,105,161,0.2)" : "0 0 0 4px rgba(61,217,255,0.6), 0 0 35px rgba(61,217,255,0.3)"}
                onMouseOut={e => e.currentTarget.style.boxShadow = isLight ? "0 0 0 3px rgba(109,59,232,0.25), 0 0 25px rgba(109,59,232,0.15)" : "0 0 0 3px rgba(139,92,246,0.4), 0 0 25px rgba(139,92,246,0.3)"}
              >
                {!avatarUrl && (name?.[0]?.toUpperCase() || "?")}
              </div>
              <div onClick={() => setShowAvatarSelector(true)} style={{ position: "absolute", bottom: 2, right: 2, width: 28, height: 28, borderRadius: "50%", background: isLight ? "linear-gradient(135deg, #6d3be8, #0369a1)" : "linear-gradient(135deg, #8b5cf6, #3dd9ff)", border: `2px solid ${isLight ? "#fffdf9" : "var(--bg)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>✏️</div>
            </div>

            {/* Player info */}
            <div style={{ flex: 1, position: "relative", zIndex: 1 }}>
              <div style={{ fontSize: 12, color: t.muted, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Player Profile</div>
              <h1 style={{ margin: "0 0 6px", fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em", color: t.text }}>{name || "Player"}</h1>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <span style={{ padding: "4px 12px", borderRadius: 8, background: t.greenBg, border: `1px solid ${t.greenBorder}`, fontSize: 12, fontWeight: 700, color: t.greenText, display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.greenText, boxShadow: `0 0 6px ${t.greenText}`, display: "inline-block" }} />Active
                </span>
                <span style={{ padding: "4px 12px", borderRadius: 8, background: t.goldBg, border: `1px solid ${t.goldBorder}`, fontSize: 12, fontWeight: 700, color: t.goldText }}>⭐ Pro Member</span>
                {currentUserId && (
                  <span style={{ padding: "4px 12px", borderRadius: 8, background: isLight ? "rgba(109,59,232,0.08)" : "rgba(139,92,246,0.12)", border: isLight ? "1px solid rgba(109,59,232,0.2)" : "1px solid rgba(139,92,246,0.3)", fontSize: 12, fontWeight: 700, color: t.accent, fontFamily: "monospace" }}>ID #{currentUserId}</span>
                )}
              </div>
            </div>
          </div>

          {/* Main Card */}
          <div style={{ background: t.panelBg, border: `1px solid ${t.panelBorder}`, borderRadius: 24, padding: "28px 30px", boxShadow: t.panelShadow, backdropFilter: "blur(12px)" }}>
            <div style={{ animation: "slideIn 0.2s ease" }}>


              <form onSubmit={handleSave} style={{ display: "grid", gap: 20 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
                  {[
                    { label: "Full Name",     value: name,  setter: setName,  placeholder: "Your name",        type: "text",  icon: "👤" },
                    { label: "Email Address", value: email, setter: setEmail, placeholder: "you@example.com",  type: "email", icon: "✉️" },
                  ].map(field => (
                    <label key={field.label} style={{ display: "grid", gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: t.muted, textTransform: "uppercase", letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 6 }}>
                        {field.icon} {field.label}
                      </span>
                      <input
                        type={field.type}
                        className="profile-input"
                        value={field.value}
                        onChange={e => field.setter(e.target.value)}
                        placeholder={field.placeholder}
                        required={field.type === "email" || field.label === "Full Name"}
                        style={{ border: `1px solid ${t.inputBorder}`, borderRadius: 12, padding: "13px 16px", fontSize: 15, background: t.inputBg, color: t.text, outline: "none", width: "100%", boxSizing: "border-box", transition: "border-color 0.2s, box-shadow 0.2s" }}
                      />
                    </label>
                  ))}
                </div>

                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: t.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>📱 Phone Number</span>
                  <input type="tel" className="profile-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Your phone number (optional)"
                    style={{ border: `1px solid ${t.inputBorder}`, borderRadius: 12, padding: "13px 16px", fontSize: 15, background: t.inputBg, color: t.text, outline: "none", width: "100%", boxSizing: "border-box", transition: "border-color 0.2s, box-shadow 0.2s" }}
                  />
                </label>

                {error && <div style={{ padding: "12px 16px", borderRadius: 12, background: t.dangerBg, border: `1px solid ${t.dangerBorder}`, color: t.dangerText, fontWeight: 600, fontSize: 14 }}>⚠️ {error}</div>}
                {message && <div style={{ padding: "12px 16px", borderRadius: 12, background: t.greenBg, border: `1px solid ${t.greenBorder}`, color: t.greenText, fontWeight: 600, fontSize: 14 }}>✅ {message}</div>}

                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", paddingTop: 4 }}>
                  <button type="button" onClick={handleResetProgress} disabled={loading} style={{ background: t.dangerBg, color: t.dangerText, border: `1px solid ${t.dangerBorder}`, borderRadius: 12, padding: "12px 20px", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", transition: "all 0.2s", opacity: loading ? 0.6 : 1 }}
                    onMouseOver={e => { if (!loading) e.currentTarget.style.background = isLight ? "rgba(185,28,28,0.15)" : "rgba(220,38,38,0.22)"; }}
                    onMouseOut={e => { e.currentTarget.style.background = t.dangerBg; }}
                  >🔄 Reset Progress</button>
                  <button type="submit" disabled={loading} style={{ background: loading ? (isLight ? "rgba(109,59,232,0.4)" : "rgba(139,92,246,0.4)") : (isLight ? "linear-gradient(135deg, #6d3be8, #0369a1)" : "linear-gradient(135deg, #8b5cf6, #3dd9ff)"), color: "#fff", border: "none", borderRadius: 12, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", boxShadow: loading ? "none" : (isLight ? "0 4px 14px rgba(109,59,232,0.3)" : "0 8px 24px rgba(139,92,246,0.35)"), transition: "all 0.2s", opacity: loading ? 0.7 : 1 }}
                    onMouseOver={e => { if (!loading) e.currentTarget.style.transform = "translateY(-2px)"; }}
                    onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; }}
                  >{loading ? "💾 Saving…" : "💾 Save Changes"}</button>
                </div>
              </form>

              {/* Quick Links */}
              <div style={{ marginTop: 28, paddingTop: 24, borderTop: `1px solid ${t.cardBorder}` }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Link href="/messages" style={{ padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700, background: isLight ? "rgba(16,185,129,0.1)" : "rgba(16,185,129,0.15)", border: isLight ? "1px solid rgba(16,185,129,0.2)" : "1px solid rgba(16,185,129,0.35)", color: isLight ? "#047857" : "#10b981", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>💬 Messages & Friends</Link>
                  {isAdmin && (
                    <Link href="/users" style={{ padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700, background: isLight ? "rgba(4,120,87,0.1)" : "rgba(15,118,110,0.15)", border: isLight ? "1px solid rgba(4,120,87,0.2)" : "1px solid rgba(15,118,110,0.35)", color: isLight ? "#047857" : "#5eead4", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>🏆 Users Dashboard</Link>
                  )}
                  <BackButton label="← Back to Login" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Avatar Selector Modal */}
      {showAvatarSelector && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: t.modalOverlay, backdropFilter: "blur(8px)" }} onClick={() => setShowAvatarSelector(false)}>
          <div style={{ background: t.avatarBg, border: `1px solid ${t.heroBorder}`, borderRadius: 28, padding: "32px 28px", maxWidth: 520, width: "100%", boxShadow: isLight ? "0 20px 60px rgba(90,60,30,0.15), 0 0 40px rgba(109,59,232,0.1)" : "0 30px 80px rgba(0,0,0,0.7), 0 0 40px rgba(139,92,246,0.2)", animation: "slideIn 0.2s ease" }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎭</div>
              <h3 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 900, color: t.text }}>Choose Your Avatar</h3>
              <p style={{ margin: 0, color: t.muted, fontSize: 14 }}>Pick a character to represent you in-game</p>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 14, marginBottom: 24 }}>
              {AVATAR_PRESETS.map((preset, i) => (
                <div key={i} onClick={() => { setAvatarUrl(preset.url); setShowAvatarSelector(false); }} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <div style={{ width: 72, height: 72, borderRadius: "50%", background: `url(${preset.url}) center/cover`, border: avatarUrl === preset.url ? `3px solid ${t.cyan}` : `3px solid ${isLight ? "rgba(90,60,30,0.1)" : "rgba(255,255,255,0.06)"}`, transition: "all 0.2s", boxShadow: avatarUrl === preset.url ? `0 0 16px ${isLight ? "rgba(3,105,161,0.3)" : "rgba(61,217,255,0.5)"}` : "none" }}
                    onMouseOver={e => { e.currentTarget.style.transform = "scale(1.12)"; e.currentTarget.style.borderColor = t.accent; }}
                    onMouseOut={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.borderColor = avatarUrl === preset.url ? t.cyan : (isLight ? "rgba(90,60,30,0.1)" : "rgba(255,255,255,0.06)"); }}
                  />
                  <span style={{ fontSize: 11, color: t.muted, fontWeight: 600 }}>{preset.label}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowAvatarSelector(false)} style={{ flex: 1, padding: "12px", borderRadius: 12, border: `1px solid ${t.cardBorder}`, background: t.itemBg, color: t.text, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
