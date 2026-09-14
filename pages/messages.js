import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import BackButton from "../components/BackButton";

function AuthGuard({ children }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = window.localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) return null;
  return children;
}

export default function MessagesPage() {
  const router = useRouter();
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [newMessage, setNewMessage] = useState("");
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  const currentUserId = typeof window !== 'undefined' ? Number(window.localStorage.getItem("userId")) : null;
  const token = typeof window !== 'undefined' ? window.localStorage.getItem("token") : null;
  
  const messagesEndRef = useRef(null);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch Friends
  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const res = await fetch("/api/friends", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          // data.friends only contains accepted friends
          const accepted = data.friends.map(f => ({ ...f.user, friendshipId: f.friendshipId }));
          setFriends(accepted);
          
          // Auto-select friend if passed in URL
          const { to } = router.query;
          if (to && accepted.length > 0) {
            const friend = accepted.find(f => String(f.id) === String(to));
            if (friend) setSelectedFriend(friend);
          }
        }
      } catch (err) {
        console.error("Failed to load friends", err);
      } finally {
        setLoadingFriends(false);
      }
    };
    if (token) fetchFriends();
  }, [token, router.query]);

  // Fetch Messages for selected friend
  useEffect(() => {
    if (!selectedFriend || !token) return;

    const fetchMessages = async () => {
      setLoadingMessages(true);
      try {
        const res = await fetch(`/api/messages/${selectedFriend.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages);
        }
        // Mark as read
        await fetch(`/api/messages/read/${selectedFriend.id}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        console.error("Failed to load messages", err);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [selectedFriend, token]);

  const selectedFriendRef = useRef(selectedFriend);
  useEffect(() => {
    selectedFriendRef.current = selectedFriend;
  }, [selectedFriend]);

  // Realtime Subscription
  useEffect(() => {
    if (!currentUserId) return;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
    
    if (!url || !key) return;

    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const channel = supabase.channel(`messages-${currentUserId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new;
          const currentFriend = selectedFriendRef.current;
          
          // If the message is part of the CURRENT active conversation
          if (
            currentFriend && 
            ((newMsg.sender_id === currentUserId && newMsg.receiver_id === currentFriend.id) ||
             (newMsg.sender_id === currentFriend.id && newMsg.receiver_id === currentUserId))
          ) {
            setMessages(prev => [...prev, newMsg]);
            
            // Mark as read immediately if it's from the current friend
            if (newMsg.sender_id === currentFriend.id) {
              fetch(`/api/messages/read/${currentFriend.id}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
              });
            }
          }  
          // If we received a message from someone else (or no one is selected)
          else if (newMsg.receiver_id === currentUserId) {
            setUnreadCounts(prev => ({
              ...prev,
              [newMsg.sender_id]: (prev[newMsg.sender_id] || 0) + 1
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedFriend) return;

    const content = newMessage;
    setNewMessage(""); // Optimistic clear

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ receiverId: selectedFriend.id, content })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        console.error("Failed to send message:", data);
        alert(`Không thể gửi tin nhắn: ${data.message || 'Lỗi hệ thống'}\n\n(Nếu báo lỗi database, có thể bạn chưa chạy mã SQL tạo bảng messages trong Supabase)`);
        setNewMessage(content); // Restore message
      } else {
        // Optimistically add to UI in case Realtime is slow or disabled
        setMessages(prev => {
          if (prev.some(m => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi kết nối mạng, không thể gửi tin nhắn.");
      setNewMessage(content); // Restore message
    }
  };

  const getAvatarUrl = (name) => `https://api.dicebear.com/9.x/initials/svg?backgroundColor=0f766e&fontFamily=Inter&seed=${encodeURIComponent(name || 'User')}`;

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <AuthGuard>
      <main className="dashboard-shell" style={{ minHeight: "100vh", padding: "28px 20px" }}>
        <header className="dashboard-header" style={{ marginBottom: 20 }}>
          <div>
            <div className="brand-mark" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="brand-dot" style={{ boxShadow: "0 0 18px rgba(168,85,247,0.8)" }} />
              <span>PixelPulse</span>
            </div>
            <h1 style={{ marginTop: 12 }}>Messages</h1>
          </div>
          <div className="dashboard-actions">
            <BackButton label="← Back" />
            <Link href="/dashboard" className="ghost-button">Dashboard</Link>
          </div>
        </header>

        <div className={`messages-layout-mobile ${!selectedFriend ? 'show-sidebar' : ''}`} style={{ display: "flex", gap: 20, height: "calc(100vh - 140px)", minHeight: 500, maxWidth: 1200, margin: "0 auto" }}>
          
          {/* Sidebar - Friends List */}
          <div className="panel-card sidebar" style={{ width: 320, display: "flex", flexDirection: "column", padding: 0, overflow: "hidden", border: "1px solid var(--border)" }}>
            <div style={{ padding: "20px", borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Your Friends</h2>
            </div>
            
            <div style={{ flex: 1, overflowY: "auto" }}>
              {loadingFriends ? (
                <div style={{ padding: 20, color: "var(--muted)", textAlign: "center" }}>Loading friends...</div>
              ) : friends.length === 0 ? (
                <div style={{ padding: 20, color: "var(--muted)", textAlign: "center", fontSize: 14 }}>
                  No friends yet. Add friends from their profile to start chatting!
                </div>
              ) : (
                friends.map(friend => (
                  <div 
                    key={friend.id}
                    onClick={() => {
                      setSelectedFriend(friend);
                      setUnreadCounts(prev => ({ ...prev, [friend.id]: 0 }));
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "16px 20px",
                      cursor: "pointer",
                      background: selectedFriend?.id === friend.id ? "rgba(255,255,255,0.08)" : "transparent",
                      borderBottom: "1px solid var(--border)",
                      transition: "background 0.2s",
                      position: "relative"
                    }}
                  >
                    <div style={{ position: "relative" }}>
                      <img src={getAvatarUrl(friend.name)} alt="" style={{ width: 40, height: 40, borderRadius: "50%" }} />
                      {unreadCounts[friend.id] > 0 && (
                        <div style={{
                          position: "absolute", top: -2, right: -2, width: 12, height: 12, 
                          background: "#ef4444", borderRadius: "50%", border: "2px solid var(--bg-card)"
                        }} />
                      )}
                    </div>
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <strong style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: unreadCounts[friend.id] > 0 ? "#fff" : "inherit" }}>
                        {friend.name}
                      </strong>
                      <span style={{ fontSize: 12, color: unreadCounts[friend.id] > 0 ? "#ef4444" : "var(--muted)", fontWeight: unreadCounts[friend.id] > 0 ? 700 : 400 }}>
                        {unreadCounts[friend.id] > 0 ? `+${unreadCounts[friend.id]} tin nhắn mới` : `#${friend.id}`}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="panel-card chat-area" style={{ flex: 1, display: "flex", flexDirection: "column", padding: 0, overflow: "hidden", border: "1px solid var(--border)" }}>
            {!selectedFriend ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
                Select a friend to start messaging
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.02)", display: "flex", alignItems: "center", gap: 12 }}>
                  <button 
                    onClick={() => setSelectedFriend(null)} 
                    className="ghost-button" 
                    style={{ padding: "0 10px", minHeight: 36, marginRight: 4, display: typeof window !== 'undefined' && window.innerWidth <= 640 ? 'inline-flex' : 'none' }}
                  >
                    ←
                  </button>
                  <img src={getAvatarUrl(selectedFriend.name)} alt="" style={{ width: 44, height: 44, borderRadius: "50%" }} />
                  <div>
                    <strong style={{ fontSize: 16 }}>{selectedFriend.name}</strong>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>#{selectedFriend.id}</div>
                  </div>
                </div>

                {/* Messages List */}
                <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
                  {loadingMessages ? (
                    <div style={{ color: "var(--muted)", textAlign: "center" }}>Loading messages...</div>
                  ) : messages.length === 0 ? (
                    <div style={{ color: "var(--muted)", textAlign: "center", marginTop: "auto", marginBottom: "auto" }}>
                      No messages yet. Say hi!
                    </div>
                  ) : (
                    messages.map(msg => {
                      const isMe = msg.sender_id === currentUserId;
                      return (
                        <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                          <div style={{
                            maxWidth: "70%",
                            padding: "12px 16px",
                            borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                            background: isMe ? "linear-gradient(135deg, var(--accent-teal), #0284c7)" : "rgba(255,255,255,0.1)",
                            color: isMe ? "#fff" : "var(--text-main)",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                            wordBreak: "break-word"
                          }}>
                            {msg.content}
                          </div>
                          <span style={{ fontSize: 11, color: "var(--muted)", marginTop: 6, padding: "0 4px" }}>
                            {formatTime(msg.created_at)}
                          </span>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <form onSubmit={handleSendMessage} style={{ padding: "16px 20px", borderTop: "1px solid var(--border)", background: "var(--bg-card)", display: "flex", gap: 12 }}>
                  <input 
                    type="text" 
                    placeholder="Type a message..." 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="form-input"
                    style={{ flex: 1, borderRadius: 24, padding: "12px 20px" }}
                  />
                  <button type="submit" disabled={!newMessage.trim()} className="primary-button" style={{ borderRadius: 24, padding: "0 24px" }}>
                    Send
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
