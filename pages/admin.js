import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import BackButton from "../components/BackButton";
import ThemeToggle from "../components/ThemeToggle";
import { normalizeGamePayload, buildGameCatalogSummary, updateGameInList, removeGameFromList } from "../server/gameCatalog";
import { createClient } from '@supabase/supabase-js';

const demoGames = [
  { id: 1, title: "Nightfall Circuit", status: "Live", players: 1240, progress: 78, genre: "Racing" },
  { id: 2, title: "Echo Rift", status: "Live", players: 980, progress: 62, genre: "Action RPG" },
  { id: 3, title: "Crystal Drift", status: "New", players: 430, progress: 24, genre: "Adventure" },
];

let cachedStats = { users: 0, activePlayers: 0, averageProgress: 0 };
let cachedGames = demoGames;

export default function AdminDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(cachedStats);
  const [games, setGames] = useState(cachedGames);
  const [form, setForm] = useState({ title: "", genre: "Action", status: "Live", stage: "Stage 1", description: "" });
  const [editingGameId, setEditingGameId] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", genre: "Action", status: "Live", stage: "Stage 1", description: "", progress: 0 });
  const [searchQuery, setSearchQuery] = useState("");

  const filteredGames = games.filter(game => 
    game.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (game.genre || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

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

    Promise.all([
      fetch(`/api/admin/summary?t=${Date.now()}`, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()),
      fetch(`/api/games?t=${Date.now()}`).then(res => res.json())
    ])
      .then(([summaryData, gamesData]) => {
        if (summaryData.summary) {
          const newStats = {
            users: summaryData.summary.users || summaryData.summary.totalUsers || 0,
            activePlayers: summaryData.summary.activePlayers || 0,
            averageProgress: summaryData.summary.averageProgress || 0
          };
          cachedStats = newStats;
          setStats(newStats);
        }
        
        if (gamesData.games && gamesData.games.length > 0) {
          // Merge real games from DB with progress stats from summary
          const statsMap = {};
          if (summaryData.summary && summaryData.summary.games) {
            summaryData.summary.games.forEach(g => {
              statsMap[g.title] = { players: g.players, progress: g.progress };
            });
          }
          
          const finalGames = gamesData.games.map(g => ({
            ...g,
            players: statsMap[g.title]?.players || 0,
            progress: statsMap[g.title]?.progress || 0
          }));
          
          cachedGames = finalGames;
          setGames(finalGames);
        }
      })
      .catch(err => console.error("Error fetching admin data:", err));

    // Realtime subscription setup
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
    
    if (!url || !key) return;

    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const channel = supabase.channel('public:games')
      .on(
        'broadcast',
        { event: 'game_updated' },
        (payload) => {
          if (payload && payload.payload && payload.payload.game) {
            const updatedGame = payload.payload.game;
            setGames(prevGames => {
              const existingIndex = prevGames.findIndex(g => Number(g.id) === Number(updatedGame.id));
              if (existingIndex >= 0) {
                const newGames = [...prevGames];
                newGames[existingIndex] = { ...prevGames[existingIndex], ...updatedGame };
                cachedGames = newGames;
                return newGames;
              } else {
                const newGames = [updatedGame, ...prevGames];
                cachedGames = newGames;
                return newGames;
              }
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

  }, [router]);

  const handleAddGame = async (event) => {
    event.preventDefault();

    if (!form.title.trim()) return;
    
    // Find if the game exists (case-insensitive)
    const gameToUpdate = games.find(g => g.title.toLowerCase() === form.title.trim().toLowerCase());
    
    if (!gameToUpdate) {
      alert("Game not found. Quick actions can only be used to update existing games.");
      return;
    }

    const token = window.localStorage.getItem("token");

    try {
      const res = await fetch(`/api/admin/games/${gameToUpdate.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: gameToUpdate.title, genre: form.genre, status: form.status, stage: gameToUpdate.stage, description: gameToUpdate.description, progress: gameToUpdate.progress })
      });
      
      if (res.ok) {
        const { game } = await res.json();
        
        const newGames = games.map(g => Number(g.id) === Number(game.id) ? { ...g, ...game } : g);
        
        cachedGames = newGames;
        setGames(newGames);
        setForm({ title: "", genre: "Action", status: "Live", stage: "Stage 1", description: "" });
        alert("Game updated successfully!");
      } else {
        const err = await res.json();
        alert(err.message || "Failed to update game");
      }
    } catch (error) {
      console.error(error);
      alert("Error updating game");
    }
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

  const handleUpdateGame = async (event) => {
    event.preventDefault();
    if (!editingGameId) return;

    const token = window.localStorage.getItem("token");
    try {
      const res = await fetch(`/api/admin/games/${editingGameId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        const { game } = await res.json();
        // Giữ lại các stats (players, progress) do API /games chỉ trả về info gốc, còn ở Admin thì games có kèm stats
        const newGames = games.map(g => Number(g.id) === Number(game.id) ? { ...g, ...game } : g);
        cachedGames = newGames;
        setGames(newGames);
        setEditingGameId(null);
        setEditForm({ title: "", genre: "Action", status: "Live", stage: "Stage 1", description: "", progress: 0 });
      } else {
        const err = await res.json();
        alert(err.message || "Failed to update game");
      }
    } catch (error) {
      console.error(error);
      alert("Error updating game");
    }
  };

  const handleRemoveGame = async (gameId) => {
    if (!confirm("Are you sure you want to remove this game?")) return;
    
    const token = window.localStorage.getItem("token");
    try {
      const res = await fetch(`/api/admin/games/${gameId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const newGames = games.filter(g => Number(g.id) !== Number(gameId));
        cachedGames = newGames;
        setGames(newGames);
        if (Number(editingGameId) === Number(gameId)) {
          setEditingGameId(null);
          setEditForm({ title: "", genre: "Action", status: "Live", stage: "Stage 1", description: "", progress: 0 });
        }
      } else {
        const err = await res.json();
        alert(err.message || "Failed to remove game");
      }
    } catch (error) {
      console.error(error);
      alert("Error removing game");
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
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 12, padding: "6px 12px", borderRadius: 999, background: "rgba(16,185,129,0.14)", border: "1px solid rgba(94,234,212,0.35)", color: "var(--mint)", fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, boxShadow: "0 0 18px rgba(16, 185, 129, 0.2)" }}>
            Admin mode
          </div>
          <h1 style={{ marginTop: 12, textShadow: "0 0 18px rgba(52,211,153,0.35)", letterSpacing: "0.04em" }}>Admin control room</h1>
        </div>

        <div className="dashboard-actions">
          <BackButton label="← Back" />
          <Link href="/games" className="ghost-button">Games</Link>
          <Link href="/progress" className="ghost-button">Progress</Link>
          <Link href="/users" className="ghost-button">Users</Link>
          <Link href="/messages" className="ghost-button">Messages</Link>
          <ThemeToggle />
          <button type="button" className="ghost-button" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div className="stats-grid" style={{ position: "relative", zIndex: 1 }}>
        <div className="stat-card" style={{ background: "linear-gradient(180deg, rgba(var(--card-tint-1, 16, 185, 129), 0.18), transparent)", borderColor: "rgba(var(--card-tint-1, 94, 234, 212), 0.36)" }}>
          <span className="label">Total users</span>
          <strong>{stats.users.toLocaleString()}</strong>
        </div>
        <div className="stat-card" style={{ background: "linear-gradient(180deg, rgba(var(--card-tint-2, 45, 212, 191), 0.18), transparent)", borderColor: "rgba(var(--card-tint-2, 45, 212, 191), 0.32)" }}>
          <span className="label">Games live</span>
          <strong>{buildGameCatalogSummary(games).liveGames}</strong>
        </div>
        <div className="stat-card" style={{ background: "linear-gradient(180deg, rgba(var(--card-tint-3, 59, 130, 246), 0.18), transparent)", borderColor: "rgba(var(--card-tint-3, 96, 165, 250), 0.28)" }}>
          <span className="label">Avg. completion</span>
          <strong>{stats.averageProgress}%</strong>
        </div>
        <div className="stat-card" style={{ background: "linear-gradient(180deg, rgba(var(--card-tint-4, 168, 85, 247), 0.20), transparent)", borderColor: "rgba(var(--card-tint-4, 192, 132, 252), 0.30)" }}>
          <span className="label">Active players</span>
          <strong>{stats.activePlayers.toLocaleString()}</strong>
        </div>
      </div>

      <div className="dashboard-content" style={{ position: "relative", zIndex: 1 }}>
        <section className="panel-card" style={{ boxShadow: "0 0 28px rgba(34,211,238,0.08)" }}>
          <div style={panelHeaderStyle}>Library Management</div>
          <h2 style={{ marginTop: 0, color: "#ecfeff" }}>Game management</h2>
          
          <input 
            className="form-input"
            type="text"
            placeholder="🔍 Search games..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: "100%", marginBottom: 20, color: "#fff", backgroundColor: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.2)", padding: "10px 14px", borderRadius: 8 }}
          />

          <datalist id="game-titles">
            <option value="Flappy Bird" />
            <option value="Tetris" />
            <option value="Pacman" />
            <option value="Snake" />
            <option value="Space Invaders" />
            <option value="2048" />
            {games.map(g => <option key={g.id} value={g.title} />)}
          </datalist>

          <div className="game-list">
            {filteredGames.map((game) => {
              const palette = {
                Action: ["#7c3aed", "#22d3ee"],
                Racing: ["#f97316", "#facc15"],
                RPG: ["#10b981", "#14b8a6"],
                Adventure: ["#ec4899", "#a78bfa"],
                Strategy: ["#3b82f6", "#60a5fa"],
              };

              const colors = palette[game.genre] || ["#7c3aed", "#22d3ee"];
              const isMaintenance = game.status === "Maintenance";

              return (
                <div key={game.id} className="game-list-item" style={{
                  background: isMaintenance 
                    ? "linear-gradient(135deg, #334155 0%, #0f172a 100%)" 
                    : `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%)`,
                  border: isMaintenance ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(255,255,255,0.18)",
                  boxShadow: "0 16px 40px rgba(15, 23, 42, 0.32)",
                  padding: 16,
                  borderRadius: 18,
                  color: isMaintenance ? "rgba(255,255,255,0.6)" : "#fff",
                  filter: isMaintenance ? "grayscale(100%) opacity(0.8)" : "none",
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
                      flexShrink: 0
                    }}>
                      {game.image ? (
                        <img src={game.image} alt={game.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "100%",
                          height: "100%",
                          fontSize: 32,
                          background: "linear-gradient(135deg, rgba(255,255,255,0.15), rgba(15,23,42,0.15))"
                        }}>
                          🕹️
                        </div>
                      )}
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
                  list={editForm.title.length > 0 ? "game-titles" : undefined}
                  className="form-input"
                  style={{ color: "#fff", backgroundColor: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.2)", padding: "10px 14px", borderRadius: 8 }}
                  value={editForm.title}
                  onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))}
                />
              </div>

              <div className="form-field">
                <label>Genre</label>
                <select
                  className="form-input"
                  style={{ color: "#fff", backgroundColor: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.2)", padding: "10px 14px", borderRadius: 8 }}
                  value={editForm.genre}
                  onChange={(event) => setEditForm((current) => ({ ...current, genre: event.target.value }))}
                >
                  <option value="Arcade" style={{ color: "#000" }}>Arcade</option>
                  <option value="Puzzle" style={{ color: "#000" }}>Puzzle</option>
                  <option value="Speed" style={{ color: "#000" }}>Speed</option>
                  <option value="Chance" style={{ color: "#000" }}>Chance</option>
                  <option value="Action" style={{ color: "#000" }}>Action</option>
                  <option value="Memory" style={{ color: "#000" }}>Memory</option>
                  <option value="Action RPG" style={{ color: "#000" }}>Action RPG</option>
                  <option value="Adventure" style={{ color: "#000" }}>Adventure</option>
                  <option value="Shooter" style={{ color: "#000" }}>Shooter</option>
                </select>
              </div>

              <div className="form-field">
                <label>Status</label>
                <select
                  className="form-input"
                  style={{ color: "#fff", backgroundColor: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.2)", padding: "10px 14px", borderRadius: 8 }}
                  value={editForm.status}
                  onChange={(event) => setEditForm((current) => ({ ...current, status: event.target.value }))}
                >
                  <option value="Live" style={{ color: "#000" }}>Live</option>
                  <option value="New" style={{ color: "#000" }}>New</option>
                  <option value="Coming Soon" style={{ color: "#000" }}>Coming Soon</option>
                  <option value="Maintenance" style={{ color: "#000" }}>Maintenance</option>
                </select>
              </div>





              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" className="primary-button" style={{ flex: 1 }}>Save changes</button>
                <button type="button" className="ghost-button" onClick={() => setEditingGameId(null)}>Cancel</button>
              </div>
            </form>
          ) : null}
        </section>

        <aside className="panel-card" style={{ boxShadow: "0 0 26px rgba(16,185,129,0.12)" }}>
          <div style={panelHeaderStyle}>System Settings</div>
          <h2 style={{ marginTop: 0, color: "#b7f7dc" }}>Quick Edit</h2>
          <form onSubmit={handleAddGame} className="game-list" style={{ gap: 12 }}>
            <div className="form-field">
              <label>Game title</label>
              <input
                list={form.title.length > 0 ? "game-titles" : undefined}
                className="form-input"
                style={{ color: "#fff", backgroundColor: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.2)", padding: "10px 14px", borderRadius: 8 }}
                value={form.title}
                onChange={(event) => {
                  const newTitle = event.target.value;
                  setForm((current) => {
                    const matchedGame = games.find(g => g.title.toLowerCase() === newTitle.trim().toLowerCase());
                    if (matchedGame) {
                      return { ...current, title: newTitle, genre: matchedGame.genre, status: matchedGame.status };
                    }
                    return { ...current, title: newTitle };
                  });
                }}
                placeholder="Select an existing game to edit"
              />
            </div>

            <div className="form-field">
              <label>Genre</label>
              <select
                className="form-input"
                style={{ color: "#fff", backgroundColor: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.2)", padding: "10px 14px", borderRadius: 8 }}
                value={form.genre}
                onChange={(event) => setForm((current) => ({ ...current, genre: event.target.value }))}
              >
                <option value="Arcade" style={{ color: "#000" }}>Arcade</option>
                <option value="Puzzle" style={{ color: "#000" }}>Puzzle</option>
                <option value="Speed" style={{ color: "#000" }}>Speed</option>
                <option value="Chance" style={{ color: "#000" }}>Chance</option>
                <option value="Action" style={{ color: "#000" }}>Action</option>
                <option value="Memory" style={{ color: "#000" }}>Memory</option>
                <option value="Action RPG" style={{ color: "#000" }}>Action RPG</option>
                <option value="Adventure" style={{ color: "#000" }}>Adventure</option>
                <option value="Shooter" style={{ color: "#000" }}>Shooter</option>
              </select>
            </div>

            <div className="form-field">
              <label>Status</label>
              <select
                className="form-input"
                style={{ color: "#fff", backgroundColor: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.2)", padding: "10px 14px", borderRadius: 8 }}
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
              >
                <option value="Live" style={{ color: "#000" }}>Live</option>
                <option value="New" style={{ color: "#000" }}>New</option>
                <option value="Coming Soon" style={{ color: "#000" }}>Coming Soon</option>
                <option value="Maintenance" style={{ color: "#000" }}>Maintenance</option>
              </select>
            </div>





            <button type="submit" className="primary-button" style={{ width: "100%", justifyContent: "center" }}>Update game</button>
          </form>
        </aside>

      </div>
    </main>
  );
}
