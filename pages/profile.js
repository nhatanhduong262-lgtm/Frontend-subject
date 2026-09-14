import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import BackButton from "../components/BackButton";

const API_URL = "/api";

// ─── Friends Panel ─────────────────────────────────────────────────────────────
function FriendsPanel({ currentUserId, token }) {
  const [searchId, setSearchId] = useState("");
  const [searchResult, setSearchResult] = useState(null);   // { id, name }
  const [searchError, setSearchError] = useState("");
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);

  const [friends, setFriends] = useState([]);
  const [pendingIncoming, setPendingIncoming] = useState([]);
  const [pendingOutgoing, setPendingOutgoing] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(true);

  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  const loadFriends = useCallback(async () => {
    if (!token) return;
    setLoadingFriends(true);
    try {
      const res = await fetch(`${API_URL}/friends`, { headers: authHeader });
      if (res.ok) {
        const data = await res.json();
        setFriends(data.friends || []);
        setPendingIncoming(data.pendingIncoming || []);
        setPendingOutgoing(data.pendingOutgoing || []);
      }
    } catch (e) {
      console.error("Failed to load friends", e);
    } finally {
      setLoadingFriends(false);
    }
  }, [token]);

  useEffect(() => { loadFriends(); }, [loadFriends]);

  const handleSearch = async () => {
    const id = searchId.trim();
    if (!id) return;
    if (Number(id) === Number(currentUserId)) {
      setSearchError("That's your own ID!");
      setSearchResult(null);
      return;
    }
    setSearching(true);
    setSearchError("");
    setSearchResult(null);
    try {
      const res = await fetch(`${API_URL}/users/${id}/public`);
      if (!res.ok) { setSearchError("No player found with this ID."); return; }
      setSearchResult(await res.json());
    } catch {
      setSearchError("Network error. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async () => {
    if (!searchResult) return;
    setSending(true);
    try {
      const res = await fetch(`${API_URL}/friends/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ friendId: searchResult.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setSearchResult(null);
        setSearchId("");
        loadFriends();
      } else {
        setSearchError(data.message || "Failed to send request.");
      }
    } catch {
      setSearchError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleAccept = async (friendshipId) => {
    try {
      await fetch(`${API_URL}/friends/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ friendshipId }),
      });
      loadFriends();
    } catch (e) { console.error(e); }
  };

  const handleRemove = async (friendshipId) => {
    try {
      await fetch(`${API_URL}/friends/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ friendshipId }),
      });
      loadFriends();
    } catch (e) { console.error(e); }
  };

  const sectionStyle = {
    marginTop: 12,
    borderRadius: 16,
    border: "1px solid var(--border)",
    background: "rgba(255,255,255,0.03)",
    overflow: "hidden",
  };

  const rowStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "14px 18px",
    borderBottom: "1px solid var(--border)",
  };

  const smallBtn = (bg, color = "#fff") => ({
    background: bg,
    color,
    border: "none",
    borderRadius: 10,
    padding: "7px 14px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    transition: "opacity 0.2s",
  });

  return (
    <div style={{ marginTop: 36 }}>
      {/* Divider */}
      <div style={{ height: 1, background: "var(--border)", margin: "0 0 28px" }} />

      <h2 style={{ fontSize: 22, margin: "0 0 6px", color: "var(--text)" }}>👥 Friends</h2>
      <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 20px" }}>
        Share your Player ID with friends so they can add you.
      </p>

      {/* Your Player ID */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 18px",
        borderRadius: 14,
        background: "linear-gradient(135deg, rgba(79,70,229,0.15), rgba(61,217,255,0.1))",
        border: "1px solid rgba(79,70,229,0.35)",
        marginBottom: 22,
        flexWrap: "wrap",
      }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
            Your Player ID
          </div>
          <strong style={{ fontSize: 22, letterSpacing: "0.05em", color: "var(--text)" }}>#{currentUserId}</strong>
        </div>
        <button
          onClick={() => navigator.clipboard.writeText(String(currentUserId))}
          style={{ ...smallBtn("rgba(79,70,229,0.25)", "var(--accent)"), border: "1px solid rgba(79,70,229,0.4)", marginLeft: "auto" }}
        >
          📋 Copy ID
        </button>
      </div>

      {/* Search bar */}
      <div style={{ marginBottom: 6 }}>
        <label style={{ display: "block", fontWeight: 600, color: "var(--text)", marginBottom: 8, fontSize: 14 }}>
          Add a friend by Player ID
        </label>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            type="number"
            placeholder="Enter Player ID…"
            value={searchId}
            onChange={e => { setSearchId(e.target.value); setSearchResult(null); setSearchError(""); }}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            style={{
              flex: 1,
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "11px 14px",
              fontSize: 15,
              background: "rgba(255,255,255,0.04)",
              color: "var(--text)",
              outline: "none",
            }}
          />
          <button onClick={handleSearch} disabled={searching || !searchId.trim()} style={{ ...smallBtn("var(--accent)"), padding: "11px 20px", fontSize: 14 }}>
            {searching ? "…" : "Search"}
          </button>
        </div>
      </div>

      {/* Search result preview */}
      {searchResult && (
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 18px",
          borderRadius: 14,
          background: "rgba(16,185,129,0.1)",
          border: "1px solid rgba(16,185,129,0.35)",
          marginTop: 10,
        }}>
          <div>
            <div style={{ fontSize: 12, color: "#10b981", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Player Found</div>
            <strong style={{ color: "var(--text)", fontSize: 16 }}>{searchResult.name}</strong>
            <span style={{ color: "var(--muted)", fontSize: 13, marginLeft: 8 }}>#{searchResult.id}</span>
          </div>
          <button onClick={handleSendRequest} disabled={sending} style={smallBtn("#10b981")}>
            {sending ? "Sending…" : "➕ Add Friend"}
          </button>
        </div>
      )}
      {searchError && <p style={{ color: "#ef4444", fontSize: 13, marginTop: 8, fontWeight: 600 }}>{searchError}</p>}

      {/* Pending incoming requests */}
      {pendingIncoming.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            Friend Requests ({pendingIncoming.length})
          </div>
          <div style={sectionStyle}>
            {pendingIncoming.map((item, i) => (
              <div key={item.friendshipId} style={{ ...rowStyle, borderBottom: i < pendingIncoming.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div>
                  <strong style={{ color: "var(--text)" }}>{item.user.name}</strong>
                  <span style={{ color: "var(--muted)", fontSize: 13, marginLeft: 8 }}>#{item.user.id}</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => handleAccept(item.friendshipId)} style={smallBtn("#10b981")}>✓ Accept</button>
                  <button onClick={() => handleRemove(item.friendshipId)} style={smallBtn("rgba(239,68,68,0.15)", "#ef4444")}>✕ Decline</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending outgoing requests */}
      {pendingOutgoing.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            Sent Requests
          </div>
          <div style={sectionStyle}>
            {pendingOutgoing.map((item, i) => (
              <div key={item.friendshipId} style={{ ...rowStyle, borderBottom: i < pendingOutgoing.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div>
                  <strong style={{ color: "var(--text)" }}>{item.user.name}</strong>
                  <span style={{ color: "var(--muted)", fontSize: 13, marginLeft: 8 }}>#{item.user.id}</span>
                  <span style={{ marginLeft: 10, fontSize: 12, color: "#f59e0b", fontWeight: 700 }}>Pending…</span>
                </div>
                <button onClick={() => handleRemove(item.friendshipId)} style={smallBtn("rgba(239,68,68,0.15)", "#ef4444")}>Cancel</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends list */}
      <div style={{ marginTop: 22 }}>
        <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          Friends {friends.length > 0 && `(${friends.length})`}
        </div>
        {loadingFriends ? (
          <p style={{ color: "var(--muted)", fontSize: 14 }}>Loading…</p>
        ) : friends.length === 0 ? (
          <div style={{ padding: "20px 18px", color: "var(--muted)", fontSize: 14, textAlign: "center", border: "1px dashed var(--border)", borderRadius: 14 }}>
            No friends yet. Add some using their Player ID!
          </div>
        ) : (
          <div style={sectionStyle}>
            {friends.map((item, i) => (
              <div key={item.friendshipId} style={{ ...rowStyle, borderBottom: i < friends.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    background: "linear-gradient(135deg, var(--accent), var(--cyan))",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700, fontSize: 16, color: "#fff", flexShrink: 0,
                  }}>
                    {item.user.name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <strong style={{ color: "var(--text)" }}>{item.user.name}</strong>
                    <span style={{ color: "var(--muted)", fontSize: 13, marginLeft: 8 }}>#{item.user.id}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Link href={`/messages?to=${item.user.id}`} style={{ ...smallBtn("rgba(16, 185, 129, 0.15)", "#10b981"), textDecoration: "none" }}>💬 Message</Link>
                  <button onClick={() => handleRemove(item.friendshipId)} style={smallBtn("rgba(239,68,68,0.1)", "#ef4444")}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Profile Page ─────────────────────────────────────────────────────────
export default function ProfilePage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setCurrentUserId(window.localStorage.getItem("userId"));
    setToken(window.localStorage.getItem("token"));

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
      const tok = window.localStorage.getItem("token");
      if (!userId) throw new Error("Please sign in before updating your profile.");
      const response = await fetch(`${API_URL}/profile/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
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

  const handleResetProgress = async () => {
    if (confirm("Are you sure you want to reset all scores and progress?")) {
      setLoading(true);
      setError("");
      try {
        const { resetPlayerProgress } = await import("../lib/playerProgress");
        await resetPlayerProgress();
        setMessage("Your scores have been reset to 0.");
      } catch (err) {
        setError("Failed to reset scores.");
      } finally {
        setLoading(false);
      }
    }
  };

  const pageStyle = {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: "32px 20px",
  };

  const cardStyle = {
    width: "100%",
    maxWidth: "800px",
    background: "var(--panel)",
    border: "1px solid var(--border)",
    borderRadius: "24px",
    boxShadow: "var(--shadow)",
    padding: "32px",
    backdropFilter: "blur(12px)",
  };

  const inputStyle = {
    width: "100%",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    padding: "12px 14px",
    fontSize: "15px",
    background: "rgba(255, 255, 255, 0.04)",
    color: "var(--text)",
    boxSizing: "border-box",
    outline: "none",
  };

  const buttonStyle = {
    background: "linear-gradient(135deg, var(--accent), var(--cyan))",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    padding: "14px 18px",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 10px 20px rgba(109, 94, 252, 0.28)",
  };

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          <div>
            <div
              className="eyebrow"
              style={{
                display: "inline-flex",
                alignItems: "center",
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
            <h1 style={{ margin: "16px 0 8px", fontSize: "34px", color: "var(--text)" }}>Profile</h1>
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
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "14px", padding: "12px 14px" }}>
              <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: 6 }}>Status</div>
              <strong style={{ color: "var(--text)" }}>Active</strong>
            </div>
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "14px", padding: "12px 14px" }}>
              <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: 6 }}>Member</div>
              <strong style={{ color: "var(--text)" }}>Pro</strong>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} style={{ display: "grid", gap: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18 }}>
            <label style={{ display: "grid", gap: 8, color: "var(--text)", fontWeight: 600 }}>
              Full name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                style={inputStyle}
              />
            </label>

            <label style={{ display: "grid", gap: 8, color: "var(--text)", fontWeight: 600 }}>
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

          <label style={{ display: "grid", gap: 8, color: "var(--text)", fontWeight: 600 }}>
            Phone number
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              style={inputStyle}
            />
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <button type="button" onClick={handleResetProgress} disabled={loading} style={{ ...buttonStyle, background: "#dc2626", boxShadow: "0 10px 20px rgba(220, 38, 38, 0.28)", opacity: loading ? 0.7 : 1 }}>{loading ? "..." : "Reset progress"}</button>
            <button type="submit" disabled={loading} style={{ ...buttonStyle, opacity: loading ? 0.7 : 1 }}>{loading ? "Saving..." : "Save changes"}</button>
          </div>
        </form>

        {error ? <p style={{ marginTop: 18, color: "#dc2626", fontWeight: 600 }}>{error}</p> : null}
        {message ? <p style={{ marginTop: 18, color: "#15803d", fontWeight: 600 }}>{message}</p> : null}

        {/* Friends Section */}
        {currentUserId && (
          <FriendsPanel currentUserId={currentUserId} token={token} />
        )}

        <div style={{ marginTop: 28, display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
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
