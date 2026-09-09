import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/router";
import BackButton from "../components/BackButton";

const onlinePlayers = [
  { name: "Ava", status: "Ready for raid", rank: "Support" },
  { name: "Kai", status: "Queueing challenge", rank: "Tank" },
  { name: "Milo", status: "Grinding XP", rank: "Scout" },
  { name: "Nova", status: "Hosting match", rank: "Caster" },
];

const feed = [
  { user: "Ava", text: "Nightfall Circuit is live again. Anyone up for a boss run?" },
  { user: "Kai", text: "Squad formed. We are taking the final arena route tonight." },
  { user: "Nova", text: "New challenge event is live in the lobby." },
];

export default function CommunityPage() {
  const router = useRouter();

  useEffect(() => {
    if (!window.localStorage.getItem("userId")) {
      router.replace("/login");
      return undefined;
    }
    return undefined;
  }, [router]);

  return (
    <main className="dashboard-shell" style={{ minHeight: "100vh" }}>
      <header className="dashboard-header" style={{ marginBottom: 28 }}>
        <div>
          <div className="brand-mark">
            <span className="brand-dot" />
            PixelPulse
          </div>
          <h1>Community hub</h1>
        </div>

        <div className="dashboard-actions">
          <BackButton label="← Back" fallback="/dashboard" />
          <Link href="/dashboard" className="ghost-button">Dashboard</Link>
          <Link href="/games" className="ghost-button">Games</Link>
          <Link href="/progress" className="ghost-button">Progress</Link>
          <button
            type="button"
            className="ghost-button"
            onClick={() => {
              window.localStorage.removeItem("token");
              window.localStorage.removeItem("userId");
              window.localStorage.removeItem("profile");
              router.push("/login");
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="label">Online</span>
          <strong>1,248</strong>
        </div>
        <div className="stat-card">
          <span className="label">Squads</span>
          <strong>84</strong>
        </div>
        <div className="stat-card">
          <span className="label">Events</span>
          <strong>12</strong>
        </div>
        <div className="stat-card">
          <span className="label">Clubs</span>
          <strong>7</strong>
        </div>
      </div>

      <div className="dashboard-content">
        <section className="panel-card">
          <h2>Squad online</h2>
          <div className="game-list">
            {onlinePlayers.map((player) => (
              <div key={player.name} className="game-list-item">
                <div>
                  <strong>{player.name}</strong>
                  <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>{player.status}</div>
                </div>
                <span className="progress-badge">{player.rank}</span>
              </div>
            ))}
          </div>
        </section>

        <aside className="panel-card">
          <h2>Event feed</h2>
          <div className="game-list">
            {feed.map((item) => (
              <div key={`${item.user}-${item.text}`} className="game-list-item">
                <div>
                  <strong>{item.user}</strong>
                  <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>{item.text}</div>
                </div>
                <span className="progress-badge">New</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
