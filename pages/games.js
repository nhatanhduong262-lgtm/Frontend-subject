import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import ThemeToggle from "../components/ThemeToggle";
import BackButton from "../components/BackButton";
import { getQuestState, getRankFromPoints } from "../lib/quests";

const demoGames = [
  { id: 1, title: "Sky Hopper", genre: "Arcade", stage: "Flappy-style", progress: 78, status: "Live", href: "/flappy", image: "/images/sky_hopper_1789299722470.png" },
  { id: 2, title: "Neon Match", genre: "Puzzle", stage: "Memory", progress: 64, status: "Live", href: "/memory", image: "/images/neon_match_1789299759422.png" },
  { id: 3, title: "Pulse Reflex", genre: "Speed", stage: "Reaction", progress: 69, status: "Live", href: "/reaction", image: "/images/pulse_reflex_1789299783039.png" },
  { id: 4, title: "Lucky Dice", genre: "Chance", stage: "Dice duel", progress: 57, status: "Live", href: "/dice", image: "/images/lucky_dice_1789299795505.png" },
  { id: 5, title: "Neon Snake", genre: "Arcade", stage: "Grid chase", progress: 71, status: "Live", href: "/snake", image: "/images/neon_snake_1789299734826.png" },
  { id: 6, title: "Pong Arena", genre: "Arcade", stage: "2-player duel", progress: 83, status: "Live", href: "/pong", image: "/images/pong_arena_1789299746830.png" },
  { id: 7, title: "Aim Blaster", genre: "Action", stage: "Target rush", progress: 0, status: "Live", href: "/aimblaster", image: "/images/aim_blaster.png" },
  { id: 8, title: "Number Crush", genre: "Puzzle", stage: "Speed order", progress: 0, status: "Live", href: "/numbercrush", image: "/images/number_crush.png" },
  { id: 9, title: "Color Storm", genre: "Memory", stage: "Pattern recall", progress: 0, status: "Live", href: "/colorstorm", image: "/images/color_storm.png" },
  { id: 10, title: "Echo Rift", genre: "Action RPG", stage: "Stage 3", progress: 62, status: "Live", href: "/dashboard" },
  { id: 11, title: "Crystal Drift", genre: "Adventure", stage: "Stage 1", progress: 24, status: "New", href: "/dashboard" },
  { id: 12, title: "Vanguard Zero", genre: "Shooter", stage: "Stage 9", progress: 91, status: "Live", href: "/dashboard" },
];

const genres = ["All", "Arcade", "Puzzle", "Speed", "Chance", "Action", "Memory", "Action RPG", "Adventure", "Shooter"];

export default function GamesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [questState, setQuestState] = useState(null);

  useEffect(() => {
    if (!window.localStorage.getItem("userId")) {
      router.replace("/login");
      return undefined;
    }
    
    setQuestState(getQuestState());
    const handleQuestUpdate = (e) => setQuestState(e.detail);
    window.addEventListener('pixelpulse-quests-updated', handleQuestUpdate);
    
    return () => {
      window.removeEventListener('pixelpulse-quests-updated', handleQuestUpdate);
    };
  }, [router]);
  
  const currentRank = getRankFromPoints(questState?.totalPoints || 0);

  const filteredGames = useMemo(() => {
    return demoGames.filter((game) => {
      const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            game.stage.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGenre = selectedGenre === "All" || game.genre === selectedGenre;
      return matchesSearch && matchesGenre;
    });
  }, [searchQuery, selectedGenre]);

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
          <strong>{demoGames.length}</strong>
        </div>
        <div className="stat-card">
          <span className="label">Live quests</span>
          <strong>{demoGames.filter((game) => game.status === "Live").length}</strong>
        </div>
        <div className="stat-card">
          <span className="label">Avg. progress</span>
          <strong>{Math.round(demoGames.reduce((sum, game) => sum + game.progress, 0) / demoGames.length)}%</strong>
        </div>
        <div className="stat-card">
          <span className="label">Player rank</span>
          <strong style={{ background: currentRank.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {currentRank.name}
          </strong>
        </div>
      </div>

      {/* Filters Section */}
      <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <input 
          type="text" 
          placeholder="🔍 Search for games or stages..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="form-input"
          style={{ width: '100%', maxWidth: 400 }}
        />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {genres.map(genre => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              style={{
                padding: '6px 16px',
                borderRadius: 20,
                border: 'none',
                background: selectedGenre === genre ? 'var(--accent-teal)' : 'rgba(255,255,255,0.05)',
                color: selectedGenre === genre ? '#000' : 'var(--text-main)',
                cursor: 'pointer',
                fontWeight: 500,
                transition: 'all 0.2s ease',
              }}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      <div className="dashboard-content">
        <section className="panel-card">
          <h2>Available games ({filteredGames.length})</h2>
          {filteredGames.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--muted)' }}>
              No games found matching your filters.
            </div>
          ) : (
            <div className="game-list">
              {filteredGames.map((game) => (
                <div key={game.id} className="game-list-item" style={{ display: "flex", gap: 16 }}>
                  {game.image && (
                    <div style={{
                      width: 80,
                      height: 80,
                      borderRadius: 14,
                      overflow: "hidden",
                      flexShrink: 0,
                      boxShadow: "0 8px 16px rgba(0,0,0,0.2)",
                      border: "1px solid var(--border)"
                    }}>
                      <img src={game.image} alt={game.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  )}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <strong style={{ fontSize: "1.15rem", margin: 0 }}>{game.title}</strong>
                    <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>
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
          )}
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
