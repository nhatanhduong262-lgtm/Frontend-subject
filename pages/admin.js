import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import BackButton from "../components/BackButton";
import { normalizeGamePayload, buildGameCatalogSummary, updateGameInList, removeGameFromList } from "../server/gameCatalog";

const demoGames = [
  { id: 1, title: "Nightfall Circuit", status: "Live", players: 1240, progress: 78, genre: "Racing" },
  { id: 2, title: "Echo Rift", status: "Live", players: 980, progress: 62, genre: "Action RPG" },
  { id: 3, title: "Crystal Drift", status: "New", players: 430, progress: 24, genre: "Adventure" },
];

export default function AdminPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [games, setGames] = useState(demoGames);
  const [form, setForm] = useState({ title: "", genre: "Action", status: "Live", stage: "Stage 1", description: "" });
  const [editingGameId, setEditingGameId] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", genre: "Action", status: "Live", stage: "Stage 1", description: "", progress: 0 });

  useEffect(() => {
    const token = window.localStorage.getItem("token");
    const savedProfile = JSON.parse(window.localStorage.getItem("profile") || "null");

    if (!token || !savedProfile) {
      router.replace("/login");
      return;
    }

    if (savedProfile.role !== "admin") {
      router.replace("/dashboard");
      return;
    }

    setProfile(savedProfile);
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

  const handleManageGame = (game) => {
    setEditingGameId(game.id);
    setEditForm({
      title: game.title,
      genre: game.genre,
      status: game.status,
      stage: game.stage,
      description: game.description || "",
      progress: game.progress || 0,
    });
  };

  const handleUpdateGame = (event) => {
    event.preventDefault();

    if (!editingGameId) return;

    setGames((current) => updateGameInList(current, editingGameId, {
      title: editForm.title,
      genre: editForm.genre,
      status: editForm.status,
      stage: editForm.stage,
      description: editForm.description,
      progress: editForm.progress,
      players: current.find((game) => Number(game.id) === Number(editingGameId))?.players ?? 0,
    }));

    setEditingGameId(null);
    setEditForm({ title: "", genre: "Action", status: "Live", stage: "Stage 1", description: "", progress: 0 });
  };

  const handleRemoveGame = (gameId) => {
    setGames((current) => removeGameFromList(current, gameId));

    if (Number(editingGameId) === Number(gameId)) {
      setEditingGameId(null);
      setEditForm({ title: "", genre: "Action", status: "Live", stage: "Stage 1", description: "", progress: 0 });
    }
  };

  const handleLogout = () => {
    window.localStorage.removeItem("token");
    window.localStorage.removeItem("userId");
    window.localStorage.removeItem("profile");
    router.push("/login");
  };

  if (!profile) return null;

  const shellStyle = {
    minHeight: "100vh",
    background: "radial-gradient(circle at top left, rgba(34,211,238,0.18), transparent 26%), radial-gradient(circle at right, rgba(16,185,129,0.18), transparent 24%), linear-gradient(135deg, #030d0c 0%, #071b1a 35%, #0a1220 100%)",
    color: "#edfdf7",
    padding: "28px 20px 40px",
    position: "relative",
    overflow: "hidden",
  };

  const panelHeaderStyle = {
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    fontSize: 12,
    color: "#7dd3fc",
    marginBottom: 12,
    fontWeight: 700,
  };

  return (
    <main className="dashboard-shell" style={shellStyle}>
      <header className="dashboard-header" style={{ marginBottom: 28, position: "relative", zIndex: 1 }}>
        <div>
          <div className="brand-mark" style={{ display: "flex", alignItems: "center", gap: 10, textShadow: "0 0 14px rgba(34,211,238,0.45)" }}>
            <span className="brand-dot" style={{ boxShadow: "0 0 18px rgba(52,211,153,0.8)" }} />
            <span>PixelPulse</span>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 12, padding: "6px 12px", borderRadius: 999, background: "rgba(16,185,129,0.14)", border: "1px solid rgba(94,234,212,0.35)", color: "#a7f3d0", fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, boxShadow: "0 0 18px rgba(16, 185, 129, 0.2)" }}>
            Admin mode
          </div>
          <h1 style={{ marginTop: 12, color: "#ecfef5", textShadow: "0 0 18px rgba(52,211,153,0.35)", letterSpacing: "0.04em" }}>Admin control room</h1>
        </div>

        <div className="dashboard-actions">
          <BackButton label="← Back" />
          <Link href="/games" className="ghost-button">Games</Link>
          <Link href="/progress" className="ghost-button">Progress</Link>
          <Link href="/users" className="ghost-button">Users</Link>
          <button type="button" className="ghost-button" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div className="stats-grid" style={{ position: "relative", zIndex: 1 }}>
        <div className="stat-card" style={{ background: "linear-gradient(180deg, rgba(16,185,129,0.18), rgba(15,23,42,0.72))", borderColor: "rgba(94,234,212,0.36)", boxShadow: "0 0 22px rgba(16,185,129,0.18)" }}>
          <span className="label">Total users</span>
          <strong>1,248</strong>
        </div>
        <div className="stat-card" style={{ background: "linear-gradient(180deg, rgba(45,212,191,0.18), rgba(15,23,42,0.72))", borderColor: "rgba(45,212,191,0.32)", boxShadow: "0 0 20px rgba(45,212,191,0.16)" }}>
          <span className="label">Games live</span>
          <strong>{buildGameCatalogSummary(games).liveGames}</strong>
        </div>
        <div className="stat-card" style={{ background: "linear-gradient(180deg, rgba(59,130,246,0.18), rgba(15,23,42,0.72))", borderColor: "rgba(96,165,250,0.28)", boxShadow: "0 0 20px rgba(59,130,246,0.16)" }}>
          <span className="label">Avg. completion</span>
          <strong>{buildGameCatalogSummary(games).averageProgress}%</strong>
        </div>
        <div className="stat-card" style={{ background: "linear-gradient(180deg, rgba(168,85,247,0.20), rgba(15,23,42,0.72))", borderColor: "rgba(192,132,252,0.30)", boxShadow: "0 0 20px rgba(168,85,247,0.14)" }}>
          <span className="label">Active players</span>
          <strong>{games.reduce((sum, game) => sum + (game.players || 0), 0).toLocaleString()}</strong>
        </div>
      </div>

      <div className="dashboard-content" style={{ position: "relative", zIndex: 1 }}>
        <section className="panel-card" style={{ background: "linear-gradient(180deg, rgba(5, 18, 21, 0.94), rgba(15, 23, 42, 0.78))", border: "1px solid rgba(125, 211, 252, 0.18)", boxShadow: "0 0 28px rgba(34,211,238,0.08)" }}>
          <div style={panelHeaderStyle}>System command</div>
          <h2 style={{ marginTop: 0, color: "#ecfeff" }}>Game management</h2>
          <div className="game-list">
            {games.map((game) => {
              const palette = {
                Action: ["#7c3aed", "#22d3ee"],
                Racing: ["#f97316", "#facc15"],
                RPG: ["#10b981", "#14b8a6"],
                Adventure: ["#ec4899", "#a78bfa"],
                Strategy: ["#3b82f6", "#60a5fa"],
              };

              const colors = palette[game.genre] || ["#7c3aed", "#22d3ee"];

              return (
                <div key={game.id} className="game-list-item" style={{
                  background: `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%)`,
                  border: "1px solid rgba(255,255,255,0.18)",
                  boxShadow: "0 16px 40px rgba(15, 23, 42, 0.32)",
                  padding: 16,
                  borderRadius: 18,
                  color: "#fff",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{
                      width: 72,
                      height: 72,
                      borderRadius: 16,
                      background: "linear-gradient(135deg, rgba(255,255,255,0.35), rgba(15,23,42,0.15))",
                      border: "2px solid rgba(255,255,255,0.35)",
                      boxShadow: "inset 0 0 0 4px rgba(15,23,42,0.15)",
                      position: "relative",
                      overflow: "hidden",
                    }}>
                      <div style={{
                        position: "absolute",
                        inset: 0,
                        background: "repeating-linear-gradient(0deg, rgba(255,255,255,0.18) 0, rgba(255,255,255,0.18) 8px, rgba(255,255,255,0.04) 8px, rgba(255,255,255,0.04) 16px)",
                        opacity: 0.75,
                      }} />
                      <div style={{
                        position: "absolute",
                        left: 12,
                        right: 12,
                        bottom: 12,
                        top: 12,
                        borderRadius: 12,
                        background: "rgba(15,23,42,0.18)",
                        border: "2px solid rgba(255,255,255,0.20)",
                      }} />
                    </div>

                    <div style={{ flex: 1 }}>
                      <strong style={{ display: "block", fontSize: 18 }}>{game.title}</strong>
                      <div style={{ opacity: 0.9, fontSize: 13, marginTop: 6 }}>
                        {game.genre || "Action"} • {(game.players || 0).toLocaleString()} players • {game.progress || 0}% progress
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 14 }}>
                    <span className="progress-badge" style={{ background: "rgba(15,23,42,0.22)", color: "#fff", borderColor: "rgba(255,255,255,0.18)" }}>{game.status}</span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" className="ghost-button" style={{ minHeight: 38, padding: "0 12px", background: "rgba(15,23,42,0.18)", borderColor: "rgba(255,255,255,0.22)", color: "#fff" }} onClick={() => handleManageGame(game)}>Manage</button>
                      <button type="button" className="ghost-button" style={{ minHeight: 38, padding: "0 12px", background: "rgba(127,29,29,0.28)", borderColor: "rgba(255,255,255,0.2)", color: "#fff" }} onClick={() => handleRemoveGame(game.id)}>Remove</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {editingGameId ? (
            <form onSubmit={handleUpdateGame} className="game-list" style={{ gap: 12, marginTop: 18 }}>
              <div className="form-field">
                <label>Game title</label>
                <input
                  value={editForm.title}
                  onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))}
                />
              </div>

              <div className="form-field">
                <label>Genre</label>
                <select
                  value={editForm.genre}
                  onChange={(event) => setEditForm((current) => ({ ...current, genre: event.target.value }))}
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
                  value={editForm.status}
                  onChange={(event) => setEditForm((current) => ({ ...current, status: event.target.value }))}
                >
                  <option value="Live">Live</option>
                  <option value="New">New</option>
                  <option value="Coming Soon">Coming Soon</option>
                </select>
              </div>

              <div className="form-field">
                <label>Stage</label>
                <input
                  value={editForm.stage}
                  onChange={(event) => setEditForm((current) => ({ ...current, stage: event.target.value }))}
                />
              </div>

              <div className="form-field">
                <label>Progress (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editForm.progress}
                  onChange={(event) => setEditForm((current) => ({ ...current, progress: Number(event.target.value || 0) }))}
                />
              </div>

              <div className="form-field">
                <label>Description</label>
                <input
                  value={editForm.description}
                  onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))}
                />
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" className="primary-button" style={{ flex: 1 }}>Save changes</button>
                <button type="button" className="ghost-button" onClick={() => setEditingGameId(null)}>Cancel</button>
              </div>
            </form>
          ) : null}
        </section>

        <aside className="panel-card" style={{ background: "linear-gradient(180deg, rgba(15, 118, 110, 0.22), rgba(15, 23, 42, 0.72))", borderColor: "rgba(94,234,212,0.26)", boxShadow: "0 0 26px rgba(16,185,129,0.12)" }}>
          <div style={panelHeaderStyle}>Command queue</div>
          <h2 style={{ marginTop: 0, color: "#b7f7dc" }}>Quick actions</h2>
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
