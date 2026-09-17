import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import BackButton from "../components/BackButton";

function AuthGuard({ children }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const token = window.localStorage.getItem("token");
    if (!token) { router.replace("/login"); return; }
    setReady(true);
  }, [router]);
  if (!ready) return null;
  return children;
}

export default function MessagesPage() {
  const router = useRouter();

  // ── Auth ───────────────────────────────────────────────
  const currentUserId = typeof window !== "undefined" ? Number(window.localStorage.getItem("userId")) : null;
  const token = typeof window !== "undefined" ? window.localStorage.getItem("token") : null;

  // ── Sidebar tab ────────────────────────────────────────
  const [sidebarTab, setSidebarTab] = useState("chat"); // "chat" | "friends"

  // ── Chat state ─────────────────────────────────────────
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [newMessage, setNewMessage] = useState("");
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // ── Emoji picker ───────────────────────────────────────
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeEmojiCategory, setActiveEmojiCategory] = useState(0);
  const emojiPickerRef = useRef(null);
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const EMOJI_CATEGORIES = [
    { label: "😊 Happy",  emojis: ["😀","😂","🥰","😍","😎","🥳","😜","😇","🤩","😋","😄","🤗","😆","😁","🙂","😊"] },
    { label: "😢 Sad", emojis: ["😢","😭","😔","😞","🥺","😿","😩","😫","😓","😟","🙁","😧","😦","😥","😰","😨"] },
    { label: "😡 Angry",  emojis: ["😡","🤬","😤","😠","👿","💢","😣","😖","🤯","😒","🙄","😑","😐","😶","🫤","😮‍💨"] },
    { label: "❤️ Love", emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","💕","💞","💓","💗","💖","💝","💘","🫶"] },
    { label: "🎮 Game", emojis: ["🎮","🕹️","👾","🏆","🥇","🎯","🎲","🃏","🎰","⚡","🔥","💥","✨","🌟","⭐","🚀"] },
    { label: "👋 Greet", emojis: ["👋","🤝","👍","👎","👏","🙌","🤜","🤛","✌️","🤞","🫵","💪","🫂","🤙","👌","🫡"] },
  ];

  // ── Friends panel state ────────────────────────────────
  const [pendingIncoming, setPendingIncoming] = useState([]);
  const [pendingOutgoing, setPendingOutgoing] = useState([]);
  const [searchId, setSearchId] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState("");
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);
  const [friendActionLoading, setFriendActionLoading] = useState(false);

  // ── Refs ───────────────────────────────────────────────
  const selectedFriendRef = useRef(selectedFriend);
  useEffect(() => { selectedFriendRef.current = selectedFriend; }, [selectedFriend]);

  // ── Close emoji picker on outside click ────────────────
  useEffect(() => {
    const handler = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target))
        setShowEmojiPicker(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Scroll to bottom ───────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Load all friends + requests ────────────────────────
  const loadFriends = useCallback(async (isInitial = false) => {
    if (!token) return;
    if (isInitial) setLoadingFriends(true);
    try {
      const res = await fetch("/api/friends", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        const accepted = (data.friends || []).map(f => ({ ...f.user, friendshipId: f.friendshipId }));
        setFriends(accepted);
        
        const newUnreadCounts = {};
        (data.friends || []).forEach(f => {
           if (f.unreadCount > 0) newUnreadCounts[f.user.id] = f.unreadCount;
        });
        setUnreadCounts(newUnreadCounts);
        
        setPendingIncoming(data.pendingIncoming || []);
        setPendingOutgoing(data.pendingOutgoing || []);

        // Auto-select friend from URL param
        const { to } = router.query;
        if (to && accepted.length > 0) {
          const f = accepted.find(x => String(x.id) === String(to));
          if (f) setSelectedFriend(f);
        }
      }
    } catch (err) { console.error("Failed to load friends", err); }
    finally { if (isInitial) setLoadingFriends(false); }
  }, [token, router.query]);

  useEffect(() => { 
    if (token) loadFriends(true); 
    const interval = setInterval(() => { if (token) loadFriends(false); }, 3000);
    return () => clearInterval(interval);
  }, [token, loadFriends]);

  // ── Load messages ──────────────────────────────────────
  const fetchMessages = useCallback(async (isInitial = false) => {
    if (!selectedFriend || !token) return;
    if (isInitial) setLoadingMessages(true);
    try {
      const res = await fetch(`/api/messages/${selectedFriend.id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { 
        const data = await res.json(); 
        setMessages(prev => {
          if (prev.length !== data.messages.length) return data.messages;
          const lastPrev = prev[prev.length - 1];
          const lastNew = data.messages[data.messages.length - 1];
          if (lastPrev?.id !== lastNew?.id) return data.messages;
          return prev;
        });
      }
      await fetch(`/api/messages/read/${selectedFriend.id}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    } catch (err) { console.error("Failed to load messages", err); }
    finally { if (isInitial) setLoadingMessages(false); }
  }, [selectedFriend, token]);

  useEffect(() => {
    if (!selectedFriend || !token) return;
    fetchMessages(true);
    const interval = setInterval(() => fetchMessages(false), 3000);
    return () => clearInterval(interval);
  }, [selectedFriend, token, fetchMessages]);

  // ── Send message ───────────────────────────────────────
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedFriend) return;
    const content = newMessage;
    setNewMessage("");
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ receiverId: selectedFriend.id, content }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`Cannot send message: ${data.message || "System error"}`);
        setNewMessage(content);
      } else {
        setMessages(prev => { if (prev.some(m => m.id === data.message.id)) return prev; return [...prev, data.message]; });
      }
    } catch { alert("Network connection error."); setNewMessage(content); }
  };

  // ── Friend actions ─────────────────────────────────────
  const handleSearch = async () => {
    const id = searchId.trim();
    if (!id) return;
    if (Number(id) === currentUserId) { setSearchError("That's your own ID!"); return; }
    setSearching(true); setSearchError(""); setSearchResult(null);
    try {
      const res = await fetch(`/api/users/${id}/public`);
      if (!res.ok) { setSearchError("Player with this ID not found."); }
      else setSearchResult(await res.json());
    } catch { setSearchError("Connection error. Please try again."); }
    finally { setSearching(false); }
  };

  const handleSendRequest = async () => {
    if (!searchResult) return;
    setSending(true);
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ friendId: searchResult.id }),
      });
      const data = await res.json();
      if (res.ok) { setSearchResult(null); setSearchId(""); loadFriends(); }
      else setSearchError(data.message || "Cannot send request.");
    } catch { setSearchError("Connection error."); }
    finally { setSending(false); }
  };

  const handleAccept = async (friendshipId) => {
    setFriendActionLoading(true);
    try {
      await fetch("/api/friends/accept", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ friendshipId }) });
      loadFriends();
    } catch { } finally { setFriendActionLoading(false); }
  };

  const handleRemove = async (friendshipId) => {
    setFriendActionLoading(true);
    try {
      await fetch("/api/friends/remove", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ friendshipId }) });
      loadFriends();
    } catch { } finally { setFriendActionLoading(false); }
  };

  // ── Helpers ────────────────────────────────────────────
  const AvatarCircle = ({ user, size = 40 }) => (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: user?.avatar_url ? `url(${user.avatar_url}) center/cover` : "linear-gradient(135deg, #8b5cf6, #3dd9ff)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 800, fontSize: size * 0.38, color: "#fff",
      border: "2px solid rgba(255,255,255,0.1)", boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
    }}>
      {!user?.avatar_url && (user?.name?.[0]?.toUpperCase() || "?")}
    </div>
  );

  const formatTime = (d) => new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const isEmojiOnly = (text) => {
    const r = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic}|\uFE0F|\u200D|\s)+$/u;
    return r.test(text.trim()) && text.trim().length > 0;
  };

  const renderContent = (text) => isEmojiOnly(text)
    ? <span style={{ fontSize: 42, lineHeight: 1.3, display: "block" }}>{text}</span>
    : <span style={{ fontSize: 15, lineHeight: 1.5 }}>{text}</span>;

  const totalPending = pendingIncoming.length;

  // ── UI helpers ─────────────────────────────────────────
  const btnStyle = (active) => ({
    flex: 1, padding: "9px 8px", borderRadius: 10, border: "none", cursor: "pointer",
    fontWeight: 700, fontSize: 13, transition: "all 0.2s",
    background: active ? "linear-gradient(135deg, rgba(139,92,246,0.35), rgba(61,217,255,0.2))" : "transparent",
    color: active ? "#fff" : "rgba(255,255,255,0.45)",
    boxShadow: active ? "0 2px 10px rgba(139,92,246,0.2)" : "none",
    borderBottom: active ? "2px solid rgba(139,92,246,0.6)" : "2px solid transparent",
  });

  return (
    <AuthGuard>
      <style>{`
        @keyframes slideUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .friend-row:hover { background: rgba(255,255,255,0.05) !important; }
        .emoji-btn:hover { background: rgba(255,255,255,0.1) !important; transform: scale(1.25) !important; }
      `}</style>

      <main className="dashboard-shell" style={{ minHeight: "100vh", padding: "28px 20px" }}>
        <header className="dashboard-header" style={{ marginBottom: 20 }}>
          <div>
            <div className="brand-mark" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="brand-dot" style={{ boxShadow: "0 0 18px rgba(168,85,247,0.8)" }} />
              <span>PixelPulse</span>
            </div>
            <h1 style={{ marginTop: 12 }}>Messages & Friends</h1>
          </div>
          <div className="dashboard-actions">
            <BackButton label="← Back" />
            <Link href="/dashboard" className="ghost-button">Dashboard</Link>
          </div>
        </header>

        <div className="flex gap-5 h-[calc(100vh-140px)] min-h-[520px] max-w-[1200px] mx-auto">
          {/* ═══ SIDEBAR ══════════════════════════════════════════════ */}
          <div className={`panel-card w-full md:w-[340px] flex-col p-0 overflow-hidden border border-[var(--border)] ${selectedFriend ? 'hidden md:flex' : 'flex'}`}>

            {/* Sidebar tab bar */}
            <div style={{ display: "flex", padding: "10px 10px 0", gap: 4, background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--border)" }}>
              <button style={btnStyle(sidebarTab === "chat")} onClick={() => setSidebarTab("chat")}>
                💬 Messages
              </button>
              <button style={{ ...btnStyle(sidebarTab === "friends"), position: "relative" }} onClick={() => setSidebarTab("friends")}>
                👥 Friends
                {totalPending > 0 && (
                  <span style={{ position: "absolute", top: 4, right: 6, width: 16, height: 16, borderRadius: "50%", background: "#ef4444", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                    {totalPending}
                  </span>
                )}
              </button>
            </div>

            {/* ── TAB: Chat (friends list) ── */}
            {sidebarTab === "chat" && (
              <div style={{ flex: 1, overflowY: "auto" }}>
                {loadingFriends ? (
                  <div style={{ padding: 24, color: "var(--muted)", textAlign: "center" }}>Loading...</div>
                ) : friends.length === 0 ? (
                  <div style={{ padding: 28, color: "var(--muted)", textAlign: "center", fontSize: 14 }}>
                    <div style={{ fontSize: 40, marginBottom: 10 }}>🤝</div>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>No friends yet</div>
                    <div style={{ opacity: 0.6, fontSize: 12 }}>Switch to the <strong>Friends</strong> tab to add them!</div>
                  </div>
                ) : (
                  friends.map(friend => (
                    <div
                      key={friend.id}
                      className="friend-row"
                      onClick={() => { setSelectedFriend(friend); setUnreadCounts(prev => ({ ...prev, [friend.id]: 0 })); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "14px 18px", cursor: "pointer",
                        background: selectedFriend?.id === friend.id ? "rgba(139,92,246,0.15)" : "transparent",
                        borderBottom: "1px solid var(--border)", transition: "background 0.15s",
                        borderLeft: selectedFriend?.id === friend.id ? "3px solid #8b5cf6" : "3px solid transparent",
                      }}
                    >
                      <div style={{ position: "relative" }}>
                        <AvatarCircle user={friend} size={42} />
                        {unreadCounts[friend.id] > 0 && (
                          <div style={{ position: "absolute", top: -2, right: -2, width: 14, height: 14, background: "#ef4444", borderRadius: "50%", border: "2px solid var(--bg-card)", fontSize: 9, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
                            {unreadCounts[friend.id] > 9 ? "9+" : unreadCounts[friend.id]}
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1, overflow: "hidden" }}>
                        <strong style={{ display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: unreadCounts[friend.id] > 0 ? "#fff" : "inherit", fontSize: 14 }}>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{friend.name}</span>
                          {friend.role === 'admin' && (
                            <span style={{ background: "#ef4444", color: "#fff", fontSize: 10, padding: "2px 6px", borderRadius: 4, fontWeight: 800 }}>ADMIN</span>
                          )}
                        </strong>
                        <span style={{ fontSize: 12, color: unreadCounts[friend.id] > 0 ? "#ef4444" : "var(--muted)", fontWeight: unreadCounts[friend.id] > 0 ? 700 : 400 }}>
                          {unreadCounts[friend.id] > 0 ? `${unreadCounts[friend.id]} new messages` : `#${friend.id}`}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── TAB: Friends management ── */}
            {sidebarTab === "friends" && (
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px" }}>

                {/* Player ID */}
                <div style={{ padding: "10px 14px", borderRadius: 12, marginBottom: 16, background: "linear-gradient(135deg, rgba(79,70,229,0.2), rgba(61,217,255,0.1))", border: "1px solid rgba(79,70,229,0.4)", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>🎮</span>
                  <div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Your ID</div>
                    <strong style={{ fontSize: 18, fontFamily: "monospace", color: "#a78bfa" }}>#{currentUserId}</strong>
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(String(currentUserId))}
                    style={{ marginLeft: "auto", background: "rgba(139,92,246,0.2)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.4)", borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                  >📋 Copy</button>
                </div>

                {/* Search */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Find friends by Player ID</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Enter ID..."
                      value={searchId}
                      onChange={e => { setSearchId(e.target.value.replace(/\D/g, "")); setSearchResult(null); setSearchError(""); }}
                      onKeyDown={e => e.key === "Enter" && handleSearch()}
                      className="form-input"
                      style={{ flex: 1, borderRadius: 10, padding: "9px 12px", fontSize: 14 }}
                    />
                    <button
                      onClick={handleSearch}
                      disabled={searching || !searchId.trim()}
                      style={{ background: "linear-gradient(135deg, #8b5cf6, #3dd9ff)", color: "#fff", border: "none", borderRadius: 10, padding: "9px 14px", fontSize: 13, fontWeight: 700, cursor: searching ? "not-allowed" : "pointer", opacity: searching ? 0.6 : 1 }}
                    >{searching ? "..." : "🔍"}</button>
                  </div>
                </div>

                {/* Search result */}
                {searchResult && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: 12, marginBottom: 12, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", animation: "slideUp 0.2s ease" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <AvatarCircle user={searchResult} size={36} />
                      <div>
                        <div style={{ fontSize: 11, color: "#10b981", fontWeight: 700, marginBottom: 2 }}>Found ✓</div>
                        <strong style={{ fontSize: 14 }}>{searchResult.name}</strong>
                        <span style={{ color: "var(--muted)", fontSize: 12, marginLeft: 6 }}>#{searchResult.id}</span>
                      </div>
                    </div>
                    <button onClick={handleSendRequest} disabled={sending} style={{ background: "linear-gradient(135deg, #10b981, #34d399)", color: "#fff", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      {sending ? "..." : "➕ Add Friend"}
                    </button>
                  </div>
                )}
                {searchError && (
                  <div style={{ padding: "8px 12px", borderRadius: 8, marginBottom: 12, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", fontSize: 12, fontWeight: 600 }}>
                    ⚠️ {searchError}
                  </div>
                )}

                {/* Pending Incoming */}
                {pendingIncoming.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />
                      Friend Requests ({pendingIncoming.length})
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {pendingIncoming.map(item => (
                        <div key={item.friendshipId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 12, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", gap: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                            <AvatarCircle user={item.user} size={34} />
                            <div style={{ minWidth: 0 }}>
                              <strong style={{ fontSize: 13, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.user.name}</strong>
                              <span style={{ color: "var(--muted)", fontSize: 11 }}>#{item.user.id}</span>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                            <button onClick={() => handleAccept(item.friendshipId)} disabled={friendActionLoading} style={{ background: "linear-gradient(135deg, #10b981, #34d399)", color: "#fff", border: "none", borderRadius: 7, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>✓</button>
                            <button onClick={() => handleRemove(item.friendshipId)} disabled={friendActionLoading} style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 7, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pending Outgoing */}
                {pendingOutgoing.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Sent Requests</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {pendingOutgoing.map(item => (
                        <div key={item.friendshipId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", gap: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                            <AvatarCircle user={item.user} size={34} />
                            <div style={{ minWidth: 0 }}>
                              <strong style={{ fontSize: 13, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.user.name}</strong>
                              <span style={{ fontSize: 10, color: "#f59e0b", fontWeight: 700, background: "rgba(245,158,11,0.1)", padding: "1px 6px", borderRadius: 5 }}>Pending</span>
                            </div>
                          </div>
                          <button onClick={() => handleRemove(item.friendshipId)} disabled={friendActionLoading} style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 7, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>Cancel</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Friends list in friends tab */}
                <div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    Friends
                    {friends.length > 0 && <span style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", borderRadius: 20, padding: "1px 8px", fontSize: 11 }}>{friends.length}</span>}
                  </div>
                  {loadingFriends ? (
                    <div style={{ padding: 16, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Loading...</div>
                  ) : friends.length === 0 ? (
                    <div style={{ padding: "20px 14px", textAlign: "center", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 12, background: "rgba(255,255,255,0.02)" }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>🎮</div>
                      <div style={{ color: "var(--muted)", fontSize: 13 }}>No friends yet</div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {friends.map(item => (
                        <div key={item.friendshipId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", gap: 8, transition: "background 0.15s" }}
                          onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                          onMouseOut={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                            <AvatarCircle user={item} size={36} />
                            <div style={{ minWidth: 0 }}>
                              <strong style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {item.name}
                                {item.role === 'admin' && <span style={{ background: "#ef4444", color: "#fff", fontSize: 9, padding: "1px 5px", borderRadius: 4, fontWeight: 800 }}>ADMIN</span>}
                              </strong>
                              <span style={{ color: "var(--muted)", fontSize: 11 }}>#{item.id}</span>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                            <button
                              onClick={() => { setSelectedFriend(item); setSidebarTab("chat"); }}
                              style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 7, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                            >💬</button>
                            <button onClick={() => handleRemove(item.friendshipId)} disabled={friendActionLoading} style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 7, padding: "5px 8px", fontSize: 11, cursor: "pointer" }}>✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ═══ CHAT AREA ════════════════════════════════════════════ */}
          <div className={`panel-card flex-1 flex-col p-0 overflow-hidden border border-[var(--border)] ${selectedFriend ? 'flex' : 'hidden md:flex'}`}>
            {!selectedFriend ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--muted)", gap: 12 }}>
                <div style={{ fontSize: 56 }}>💬</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "rgba(255,255,255,0.6)" }}>Select a friend to chat</div>
                <div style={{ fontSize: 13, opacity: 0.5 }}>Or add new friends in the 👥 Friends tab</div>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.02)", display: "flex", alignItems: "center", gap: 12 }}>
                  <button className="md:hidden" onClick={() => setSelectedFriend(null)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 10px", color: "#fff", cursor: "pointer", fontSize: 13, marginRight: 4 }}>←</button>
                  <AvatarCircle user={selectedFriend} size={44} />
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
                      {selectedFriend.name}
                      {selectedFriend.role === 'admin' && <span style={{ background: "#ef4444", color: "#fff", fontSize: 10, padding: "2px 6px", borderRadius: 4, fontWeight: 800 }}>ADMIN</span>}
                    </strong>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>#{selectedFriend.id}</div>
                  </div>
                  <button onClick={() => setSelectedFriend(null)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 12px", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 13 }}>✕</button>
                </div>

                {/* Messages List */}
                <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 14 }}>
                  {loadingMessages ? (
                    <div style={{ color: "var(--muted)", textAlign: "center" }}>Loading...</div>
                  ) : messages.length === 0 ? (
                    <div style={{ color: "var(--muted)", textAlign: "center", margin: "auto" }}>No messages yet. Say hello! 👋</div>
                  ) : (
                    messages.map(msg => {
                      const isMe = msg.sender_id === currentUserId;
                      return (
                        <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                          <div style={{
                            maxWidth: "70%",
                            padding: isEmojiOnly(msg.content) ? "4px 8px" : "11px 15px",
                            borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                            background: isEmojiOnly(msg.content) ? "transparent" : isMe ? "linear-gradient(135deg, var(--accent-teal), #0284c7)" : "rgba(255,255,255,0.1)",
                            color: isMe ? "#fff" : "var(--text-main)",
                            boxShadow: isEmojiOnly(msg.content) ? "none" : "0 4px 12px rgba(0,0,0,0.12)",
                            wordBreak: "break-word",
                          }}>
                            {renderContent(msg.content)}
                          </div>
                          <span style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, padding: "0 4px" }}>{formatTime(msg.created_at)}</span>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Emoji Picker */}
                {showEmojiPicker && (
                  <div ref={emojiPickerRef} style={{ background: "linear-gradient(135deg, rgba(15,20,40,0.98), rgba(22,30,56,0.98))", border: "1px solid rgba(255,255,255,0.1)", borderTop: "none", padding: "12px 16px 14px", boxShadow: "0 -8px 32px rgba(0,0,0,0.4)" }}>
                    <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto", paddingBottom: 2 }}>
                      {EMOJI_CATEGORIES.map((cat, idx) => (
                        <button key={idx} type="button" onClick={() => setActiveEmojiCategory(idx)} style={{ padding: "4px 10px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", background: activeEmojiCategory === idx ? "linear-gradient(135deg, #8b5cf6, #3dd9ff)" : "rgba(255,255,255,0.07)", color: activeEmojiCategory === idx ? "#fff" : "rgba(255,255,255,0.55)", transition: "all 0.18s" }}>
                          {cat.label}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 4 }}>
                      {EMOJI_CATEGORIES[activeEmojiCategory].emojis.map((emoji, i) => (
                        <button key={i} type="button" className="emoji-btn" onClick={() => { setNewMessage(prev => prev + emoji); inputRef.current?.focus(); }} style={{ fontSize: 22, background: "transparent", border: "none", borderRadius: 8, cursor: "pointer", padding: "6px 2px", transition: "transform 0.12s, background 0.12s", lineHeight: 1 }}>
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input bar */}
                <form onSubmit={handleSendMessage} style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", background: "var(--bg-card)", display: "flex", gap: 10, alignItems: "center" }}>
                  <button type="button" onClick={() => setShowEmojiPicker(p => !p)} title="Emoji" style={{ width: 42, height: 42, borderRadius: "50%", flexShrink: 0, background: showEmojiPicker ? "linear-gradient(135deg, #8b5cf6, #3dd9ff)" : "rgba(255,255,255,0.07)", border: showEmojiPicker ? "1px solid rgba(139,92,246,0.5)" : "1px solid rgba(255,255,255,0.12)", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", boxShadow: showEmojiPicker ? "0 0 16px rgba(139,92,246,0.4)" : "none" }}>
                    😊
                  </button>
                  <input ref={inputRef} type="text" placeholder="Type a message..." value={newMessage} onChange={e => setNewMessage(e.target.value)} className="form-input" style={{ flex: 1, borderRadius: 24, padding: "12px 20px" }} />
                  <button type="submit" disabled={!newMessage.trim()} className="primary-button" style={{ borderRadius: 24, padding: "0 24px", height: 44 }}>Send</button>
                </form>
              </>
            )}
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
