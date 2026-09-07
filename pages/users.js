import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

const API_URL = "/api";

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/users`);
      if (!response.ok) throw new Error(await response.text());
      const result = await response.json();
      setUsers(result.users || []);
    } catch (requestError) {
      setError(requestError.message || "Unable to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!window.localStorage.getItem("userId")) {
      router.replace("/login");
      return undefined;
    }
    const timer = window.setTimeout(() => loadUsers(), 0);
    return () => window.clearTimeout(timer);
  }, [router]);

  const handleLogout = () => {
    window.localStorage.removeItem("userId");
    window.localStorage.removeItem("profile");
    router.push("/login");
  };

  const pageStyle = {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #eef4ff 0%, #f8fafc 48%, #ecfdf5 100%)",
    padding: "48px 20px",
    fontFamily: "Inter, Arial, sans-serif",
    color: "#0f172a",
  };

  const avatarUrl = (user) => `https://api.dicebear.com/9.x/initials/svg?backgroundColor=0f766e&fontFamily=Arial&seed=${encodeURIComponent(user.name || user.email)}`;

  return (
    <main style={pageStyle}>
      <section style={{ maxWidth: 980, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20, flexWrap: "wrap", marginBottom: 28 }}>
          <div>
            <div style={{ display: "inline-flex", background: "#ccfbf1", color: "#0f766e", borderRadius: 999, padding: "7px 12px", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Supabase directory
            </div>
            <h1 style={{ margin: "16px 0 8px", fontSize: 38 }}>Registered users</h1>
            <p style={{ margin: 0, color: "#475569" }}>A live view of the users stored in Supabase.</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={loadUsers} disabled={loading} style={{ border: "1px solid #cbd5e1", borderRadius: 10, background: "#fff", padding: "11px 16px", fontWeight: 700, cursor: "pointer" }}>
              {loading ? "Loading..." : "Refresh"}
            </button>
            <Link href="/devices" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none", color: "#0f766e", background: "#ccfbf1", borderRadius: 10, padding: "11px 16px", fontWeight: 700 }}>Devices</Link>
            <Link href="/profile" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none", color: "#0f172a", background: "#fff", border: "1px solid #cbd5e1", borderRadius: 10, padding: "11px 16px", fontWeight: 700 }}>Profile</Link>
            <button type="button" onClick={handleLogout} style={{ border: "1px solid #fecaca", borderRadius: 10, background: "#fff1f2", color: "#b91c1c", padding: "11px 16px", fontWeight: 700, cursor: "pointer" }}>Log out</button>
          </div>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 18 }}>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 18 }}>
            <div style={{ color: "#64748b", fontSize: 13 }}>Total accounts</div>
            <strong style={{ display: "block", marginTop: 8, fontSize: 30 }}>{users.length}</strong>
          </div>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 18 }}>
            <div style={{ color: "#64748b", fontSize: 13 }}>Storage</div>
            <strong style={{ display: "block", marginTop: 8, fontSize: 22 }}>Supabase</strong>
          </div>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 18 }}>
            <div style={{ color: "#64748b", fontSize: 13 }}>Devices</div>
            <Link href="/devices" style={{ display: "inline-block", marginTop: 8, color: "#0f766e", fontWeight: 700, textDecoration: "none" }}>Open manager</Link>
          </div>
        </div>

        {error ? <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: 12, padding: 16, marginBottom: 18 }}>{error}</div> : null}

        <div style={{ overflowX: "auto", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, boxShadow: "0 18px 45px rgba(15, 23, 42, 0.08)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                {['User', 'Email', 'Phone', 'ID'].map((heading) => <th key={heading} style={{ padding: "15px 18px", color: "#64748b", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>{heading}</th>)}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "12px 18px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div role="img" aria-label={`${user.name} avatar`} style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0, background: `#ccfbf1 url("${avatarUrl(user)}") center / cover no-repeat` }} />
                      <strong>{user.name}</strong>
                    </div>
                  </td>
                  <td style={{ padding: "16px 18px" }}>{user.email}</td>
                  <td style={{ padding: "16px 18px", color: "#475569" }}>{user.phone || "Not provided"}</td>
                  <td style={{ padding: "16px 18px", color: "#64748b" }}>#{user.id}</td>
                </tr>
              ))}
              {!loading && users.length === 0 ? <tr><td colSpan="4" style={{ padding: 28, textAlign: "center", color: "#64748b" }}>No registered users yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}