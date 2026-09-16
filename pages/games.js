import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import ThemeToggle from "../components/ThemeToggle";
import BackButton from "../components/BackButton";
import { getQuestState, getRankFromPoints, claimQuestReward } from "../lib/quests";
import { getStoredPlayerProgress } from "../lib/playerProgress";



const genres = ["All", "Arcade", "Puzzle", "Speed", "Chance", "Action", "Memory", "Action RPG", "Adventure", "Shooter"];

export default function GamesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [questState, setQuestState] = useState(null);
  const [playerProgress, setPlayerProgress] = useState([]);
  const [games, setGames] = useState([]);

  useEffect(() => {
    if (!window.localStorage.getItem("userId")) {
      router.replace("/login");
      return undefined;
    }
    
    setQuestState(getQuestState());
    
    fetch("/api/games")
      .then(res => res.json())
      .then(data => {
        if (data.games) setGames(data.games);
      })
      .catch(console.error);
    const handleQuestUpdate = (e) => setQuestState(e.detail);
    window.addEventListener('pixelpulse-quests-updated', handleQuestUpdate);

    setPlayerProgress(getStoredPlayerProgress());
    const handleProgressUpdate = (e) => setPlayerProgress(Array.isArray(e.detail) ? e.detail : getStoredPlayerProgress());
    window.addEventListener('pixelpulse-progress-updated', handleProgressUpdate);
    
    return () => {
      window.removeEventListener('pixelpulse-quests-updated', handleQuestUpdate);
      window.removeEventListener('pixelpulse-progress-updated', handleProgressUpdate);
    };
  }, [router]);
  
  const currentRank = getRankFromPoints(questState?.totalPoints || 0);

  const mergedGames = useMemo(() => {
    return games.map(game => {
       const progressRecord = playerProgress.find(p => p.title === game.title);
       return { 
         ...game, 
         playtime: progressRecord?.playtime || 0,
         progress: Number(progressRecord?.progress) || 0 
       };
    });
  }, [games, playerProgress]);

  const filteredGames = useMemo(() => {
    return mergedGames.filter((game) => {
      const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            game.stage.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGenre = selectedGenre === "All" || game.genre === selectedGenre;
      return matchesSearch && matchesGenre;
    });
  }, [searchQuery, selectedGenre, mergedGames]);

  const formatPlaytime = (seconds) => {
    if (!seconds || seconds <= 0) return '0s';
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m < 60) return `${m}m ${s}s`;
    const h = Math.floor(m / 60);
    const m_rem = m % 60;
    return `${h}h ${m_rem}m`;
  };

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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" style={{ marginBottom: 24 }}>
        <div className="stat-card p-3 sm:p-5">
          <span className="label">Total games</span>
          <strong>{mergedGames.length}</strong>
        </div>
        <div className="stat-card p-3 sm:p-5">
          <span className="label">Live quests</span>
          <strong>{mergedGames.filter((game) => game.status === "Live").length}</strong>
        </div>
        <div className="stat-card p-3 sm:p-5">
          <span className="label">Avg. progress</span>
          <strong>{mergedGames.length > 0 ? Math.round(mergedGames.reduce((sum, game) => sum + game.progress, 0) / mergedGames.length) : 0}%</strong>
        </div>
        <div className="stat-card p-3 sm:p-5">
          <span className="label">Player rank</span>
          <strong style={{ backgroundImage: currentRank.gradient, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', WebkitTextFillColor: 'transparent', display: 'inline-block' }}>
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
                background: selectedGenre === genre ? '#3dd9ff' : 'rgba(255,255,255,0.05)',
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
                  <div style={{
                    width: 80,
                    height: 80,
                    borderRadius: 14,
                    overflow: "hidden",
                    flexShrink: 0,
                    boxShadow: "0 8px 16px rgba(0,0,0,0.2)",
                    border: "1px solid var(--border)",
                    background: "linear-gradient(135deg, #1e293b, #0f172a)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 32
                  }}>
                    {game.image ? (
                      <img src={game.image} alt={game.title} style={{ width: "100%", height: "100%", objectFit: "cover", filter: (game.status === 'Maintenance' || game.status === 'Coming Soon') ? 'grayscale(100%) opacity(50%)' : 'none' }} />
                    ) : (
                      "🕹️"
                    )}
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <strong style={{ fontSize: "1.15rem", margin: 0 }}>{game.title}</strong>
                    <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>
                      {game.genre} • {game.stage}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span className="progress-badge" style={{ minWidth: 60, textAlign: "center" }}>
                      {formatPlaytime(game.playtime)}
                    </span>
                    {game.status === 'Maintenance' || game.status === 'Coming Soon' ? (
                      <span className="primary-button" style={{ minHeight: 40, padding: "0 18px", background: "var(--muted)", cursor: "not-allowed", opacity: 0.7 }}>
                        {game.status === 'Maintenance' ? 'Maintenance' : 'Coming Soon'}
                      </span>
                    ) : (
                      <Link href={game.href || "/dashboard"} className="primary-button" style={{ minHeight: 40, padding: "0 18px" }}>
                        Play now
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="panel-card">
          <h2>Current challenges</h2>
          <div className="game-list">
            {questState?.activeQuests?.map(quest => {
              const isReady = quest.current >= quest.target && !quest.claimed;
              const statusBadge = quest.claimed ? "Claimed" : "Active";
              return (
                <div key={quest.id} className="game-list-item">
                  <div>
                    <strong>{quest.title}</strong>
                    <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
                      {quest.current} / {quest.target} • +{quest.reward} points
                    </div>
                  </div>
                  {isReady ? (
                    <button 
                      onClick={() => claimQuestReward(quest.id)}
                      className="primary-button" 
                      style={{ padding: "6px 14px", minHeight: "unset", fontSize: "0.85rem", background: "linear-gradient(135deg, #10b981, #059669)" }}
                    >
                      Claim
                    </button>
                  ) : (
                    <span className="progress-badge">{statusBadge}</span>
                  )}
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </main>
  );
}
