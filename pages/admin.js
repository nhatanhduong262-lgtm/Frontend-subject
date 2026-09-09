import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import BackButton from "../components/BackButton";
import { normalizeGamePayload, buildGameCatalogSummary } from "../server/gameCatalog";

const demoGames = [
  { id: 1, title: "Nightfall Circuit", status: "Live", players: 1240, progress: 78, genre: "Racing" },
  { id: 2, title: "Echo Rift", status: "Live", players: 980, progress: 62, genre: "Action RPG" },
  { id: 3, title: "Crystal Drift", status: "New", players: 430, progress: 24, genre: "Adventure" },
];

export default function AdminPage() {
  const router = useRouter();
  const [games, setGames] = useState(demoGames);
  const [form, setForm] = useState({ title: "", genre: "Action", status: "Live", stage: "Stage 1", description: "" });

  useEffect(() => {
    if (!window.localStorage.getItem("userId")) {
      router.replace("/login");
      return undefined;
    }
    return undefined;
  }, [router]);

  const handleAddGame = (event) => {
    event.preventDefault();

    if (!form.title.trim()) return;

    const nextGame = normalizeGamePayload(
      {
        ...form,
        title: form.title,
        genre: form.genre,
        status: form.status,
        stage: form.stage,
        description: form.description,
        progress: 0,
        players: 0,
      },
      Date.now(),
    );

    setGames((current) => [nextGame, ...current]);
    setForm({ title: "", genre: "Action", status: "Live", stage: "Stage 1", description: "" });
  };

  return (
    <main className="dashboard-shell" style={{ minHeight: "100vh" }}>
      <header className="dashboard-header" style={{ marginBottom: 28 }}>
        <div>
          <div className="brand-mark">
            <span className="brand-dot" />
            PixelPulse
          </div>
          <h1>Admin control room</h1>
        </div>

        <div className="dashboard-actions">
          <BackButton label="← Back" fallback="/dashboard" />
          <Link href="/games" className="ghost-button">Games</Link>
          <Link href="/progress" className="ghost-button">Progress</Link>
          <Link href="/users" className="ghost-button">Users</Link>
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
          <span className="label">Total users</span>
          <strong>1,248</strong>
        </div>
        <div className="stat-card">
          <span className="label">Games live</span>
          <strong>{buildGameCatalogSummary(games).liveGames}</strong>
        </div>
        <div className="stat-card">
          <span className="label">Avg. completion</span>
          <strong>{buildGameCatalogSummary(games).averageProgress}%</strong>
        </div>
        <div className="stat-card">
          <span className="label">Active players</span>
          <strong>{games.reduce((sum, game) => sum + (game.players || 0), 0).toLocaleString()}</strong>
        </div>
      </div>

      <div className="dashboard-content">
        <section className="panel-card">
          <h2>Game management</h2>
          <div className="game-list">
            {games.map((game) => (
              <div key={game.id} className="game-list-item">
                <div>
                  <strong>{game.title}</strong>
                  <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
                    {game.genre || "Action"} • {(game.players || 0).toLocaleString()} players • {game.progress || 0}% tracked progress
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span className="progress-badge">{game.status}</span>
                  <button type="button" className="ghost-button" style={{ minHeight: 40, padding: "0 16px" }}>Manage</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="panel-card">
          <h2>Quick actions</h2>
          <form onSubmit={handleAddGame} className="game-list" style={{ gap: 12 }}>
            <div className="form-field">
              <label>Game title</label>
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Enter a game title"
              />
            </div>

            <div className="form-field">
              <label>Genre</label>
              <select
                value={form.genre}
                onChange={(event) => setForm((current) => ({ ...current, genre: event.target.value }))}
              >
                <option value="Action">Action</option>
                <option value="Racing">Racing</option>
                <option value="RPG">RPG</option>
                <option value="Adventure">Adventure</option>
                <option value="Strategy">Strategy</option>
              </select>
            </div>

            <div className="form-field">
              <label>Status</label>
              <select
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
              >
                <option value="Live">Live</option>
                <option value="New">New</option>
                <option value="Coming Soon">Coming Soon</option>
              </select>
            </div>

            <div className="form-field">
              <label>Stage</label>
              <input
                value={form.stage}
                onChange={(event) => setForm((current) => ({ ...current, stage: event.target.value }))}
                placeholder="Stage 1"
              />
            </div>

            <div className="form-field">
              <label>Description</label>
              <input
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Short challenge description"
              />
            </div>

            <button type="submit" className="primary-button" style={{ width: "100%", justifyContent: "center" }}>Add new game</button>
          </form>
        </aside>
      </div>
    </main>
  );
}
