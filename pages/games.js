import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import BackButton from "../components/BackButton";

const demoGames = [
  { id: 1, title: "Sky Hopper", genre: "Arcade", stage: "Flappy-style", progress: 78, status: "Live", href: "/flappy" },
  { id: 2, title: "Neon Match", genre: "Puzzle", stage: "Memory", progress: 64, status: "Live", href: "/memory" },
  { id: 3, title: "Pulse Reflex", genre: "Speed", stage: "Reaction", progress: 69, status: "Live", href: "/reaction" },
  { id: 4, title: "Lucky Dice", genre: "Chance", stage: "Dice duel", progress: 57, status: "Live", href: "/dice" },
  { id: 5, title: "Neon Snake", genre: "Arcade", stage: "Grid chase", progress: 71, status: "Live", href: "/snake" },
  { id: 6, title: "Pong Arena", genre: "Arcade", stage: "2-player duel", progress: 83, status: "Live", href: "/pong" },
  { id: 7, title: "Echo Rift", genre: "Action RPG", stage: "Stage 3", progress: 62, status: "Live", href: "/dashboard" },
  { id: 8, title: "Crystal Drift", genre: "Adventure", stage: "Stage 1", progress: 24, status: "New", href: "/dashboard" },
  { id: 9, title: "Vanguard Zero", genre: "Shooter", stage: "Stage 9", progress: 91, status: "Live", href: "/dashboard" },
];

export default function GamesPage() {
  const router = useRouter();
  const [games, setGames] = useState(demoGames);

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
          <h1>Game library</h1>
        </div>

        <div className="dashboard-actions">
          <BackButton label="← Back" />
          <Link href="/dashboard" className="ghost-button">Dashboard</Link>
          <Link href="/profile" className="ghost-button">Profile</Link>
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
          <span className="label">Total games</span>
          <strong>{games.length}</strong>
        </div>
        <div className="stat-card">
          <span className="label">Live quests</span>
          <strong>{games.filter((game) => game.status === "Live").length}</strong>
        </div>
        <div className="stat-card">
          <span className="label">Avg. progress</span>
          <strong>{Math.round(games.reduce((sum, game) => sum + game.progress, 0) / games.length)}%</strong>
        </div>
        <div className="stat-card">
          <span className="label">Player rank</span>
          <strong>Diamond</strong>
        </div>
      </div>

      <div className="dashboard-content">
        <section className="panel-card">
          <h2>Available games</h2>
          <div className="game-list">
            {games.map((game) => (
              <div key={game.id} className="game-list-item">
                <div>
                  <strong>{game.title}</strong>
                  <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
                    {game.genre} • {game.stage}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span className="progress-badge">{game.progress}%</span>
                  <Link href={game.href || "/dashboard"} className="primary-button" style={{ minHeight: 40, padding: "0 18px" }}>
                    Play now
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="panel-card">
          <h2>Current challenges</h2>
          <div className="game-list">
            <div className="game-list-item">
              <div>
                <strong>Boss rush</strong>
                <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>3 matches left</div>
              </div>
              <span className="progress-badge">Ready</span>
            </div>
            <div className="game-list-item">
              <div>
                <strong>XP boost</strong>
                <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>+1200 points</div>
              </div>
              <span className="progress-badge">Active</span>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
