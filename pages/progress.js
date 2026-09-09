import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/router";
import BackButton from "../components/BackButton";

const leaderboard = [
  { name: "Kai", rank: 1, progress: 92, xp: 24890 },
  { name: "Ava", rank: 2, progress: 88, xp: 23120 },
  { name: "Leo", rank: 3, progress: 81, xp: 21450 },
  { name: "Mia", rank: 4, progress: 75, xp: 19800 },
];

const stages = [
  { name: "Prologue", progress: 100, status: "Complete" },
  { name: "Training grounds", progress: 82, status: "In progress" },
  { name: "Boss arena", progress: 48, status: "In progress" },
  { name: "Final chapter", progress: 18, status: "Locked" },
];

export default function ProgressPage() {
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
          <h1>Player progression</h1>
        </div>

        <div className="dashboard-actions">
          <BackButton label="← Back" fallback="/dashboard" />
          <Link href="/dashboard" className="ghost-button">Dashboard</Link>
          <Link href="/games" className="ghost-button">Games</Link>
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
          <span className="label">Current level</span>
          <strong>24</strong>
        </div>
        <div className="stat-card">
          <span className="label">XP earned</span>
          <strong>24,890</strong>
        </div>
        <div className="stat-card">
          <span className="label">Stages cleared</span>
          <strong>3/4</strong>
        </div>
        <div className="stat-card">
          <span className="label">Completion</span>
          <strong>82%</strong>
        </div>
      </div>

      <div className="dashboard-content">
        <section className="panel-card">
          <h2>Stage progression</h2>
          <div className="game-list">
            {stages.map((stage) => (
              <div key={stage.name} className="game-list-item">
                <div>
                  <strong>{stage.name}</strong>
                  <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>{stage.status}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span className="progress-badge">{stage.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="panel-card">
          <h2>Leaderboard</h2>
          <div className="game-list">
            {leaderboard.map((player) => (
              <div key={player.name} className="game-list-item">
                <div>
                  <strong>#{player.rank} {player.name}</strong>
                  <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>{player.xp.toLocaleString()} XP</div>
                </div>
                <span className="progress-badge">{player.progress}%</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
