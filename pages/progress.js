import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import BackButton from "../components/BackButton";
import { DEFAULT_PLAYER_PROGRESS, getStoredPlayerProgress, loadPlayerProgressFromDatabase, subscribeToUserProgress } from "../lib/playerProgress";
import { getQuestState } from "../lib/quests";

export default function ProgressPage() {
  const router = useRouter();
  const [playerProgress, setPlayerProgress] = useState(DEFAULT_PLAYER_PROGRESS);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [questState, setQuestState] = useState(null);

  useEffect(() => {
    setQuestState(getQuestState());
    
    const handleQuestUpdate = (e) => setQuestState(e.detail);
    window.addEventListener('pixelpulse-quests-updated', handleQuestUpdate);
    return () => window.removeEventListener('pixelpulse-quests-updated', handleQuestUpdate);
  }, []);

  useEffect(() => {
    if (!window.localStorage.getItem("userId")) {
      router.replace("/login");
    }
  }, [router]);

  // Load player progress
  useEffect(() => {
    setPlayerProgress(getStoredPlayerProgress()); // Set from local storage on client mount

    let active = true;
    let unsubscribe = () => {};
    let pollingId = null;

    const syncProgress = (event) => {
      const nextProgress = event?.detail ?? getStoredPlayerProgress();
      if (active) setPlayerProgress(Array.isArray(nextProgress) ? nextProgress : DEFAULT_PLAYER_PROGRESS);
    };

    const handleStorage = () => syncProgress({ detail: getStoredPlayerProgress() });

    window.addEventListener("pixelpulse-progress-updated", syncProgress);
    window.addEventListener("storage", handleStorage);

    const hydrateProgress = async () => {
      const nextProgress = await loadPlayerProgressFromDatabase();
      if (active) setPlayerProgress(nextProgress);
    };

    hydrateProgress();

    const userId = window.localStorage.getItem("userId");
    if (userId) {
      unsubscribe = subscribeToUserProgress(userId, (nextProgress) => {
        if (active) setPlayerProgress(nextProgress);
      });

      pollingId = window.setInterval(() => {
        hydrateProgress();
      }, 4000);
    }

    return () => {
      active = false;
      unsubscribe();
      if (pollingId) window.clearInterval(pollingId);
      window.removeEventListener("pixelpulse-progress-updated", syncProgress);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // Load global leaderboard
  useEffect(() => {
    let active = true;
    const fetchGlobalLeaderboard = async () => {
      try {
        setLoadingLeaderboard(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
        const res = await fetch(`${apiUrl}/leaderboard-global`);
        if (res.ok) {
          const data = await res.json();
          if (active) setLeaderboard(data.leaderboard || []);
        }
      } catch (err) {
        console.error("Failed to fetch global leaderboard", err);
      } finally {
        if (active) setLoadingLeaderboard(false);
      }
    };

    fetchGlobalLeaderboard();
    const interval = setInterval(fetchGlobalLeaderboard, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const handleLogout = () => {
    window.localStorage.removeItem("token");
    window.localStorage.removeItem("userId");
    window.localStorage.removeItem("profile");
    router.push("/login");
  };

  const averageProgress = Math.round(playerProgress.reduce((sum, game) => sum + Number(game.progress || 0), 0) / Math.max(playerProgress.length, 1));
  const completedQuests = questState?.activeQuests?.filter(q => q.claimed || q.current >= q.target).length || 0;
  const totalQuests = questState?.activeQuests?.length || 3;
  const xp = playerProgress.reduce((sum, game) => sum + (Number(game.score) || 0), 0);
  const level = Math.max(1, Math.round(averageProgress / 5));

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
          <h1>Player progression</h1>
        </div>

        <div className="dashboard-actions">
          <BackButton label="← Back" />
          <Link href="/dashboard" className="ghost-button">Dashboard</Link>
          <Link href="/games" className="ghost-button">Games</Link>
          <button type="button" className="ghost-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="label">Current level</span>
          <strong>{level}</strong>
        </div>
        <div className="stat-card">
          <span className="label">XP earned</span>
          <strong>{xp.toLocaleString()}</strong>
        </div>
        <div className="stat-card">
          <span className="label">Stages cleared</span>
          <strong>{completedQuests}/{totalQuests}</strong>
        </div>
        <div className="stat-card">
          <span className="label">Completion</span>
          <strong>{averageProgress}%</strong>
        </div>
      </div>

      <div className="dashboard-content">
        <section className="panel-card">
          <h2>Stage progression</h2>
          <div className="game-list">
            {playerProgress.map((game) => {
              const status = game.playtime > 0 ? "Played" : "Not played yet";
              return (
                <Link href={game.href || "/dashboard"} key={game.title} className="game-list-item" style={{ display: 'flex', gap: 16 }}>
                  {game.image && (
                    <div style={{ width: 64, height: 64, borderRadius: 12, overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border)' }}>
                      <img src={game.image} alt={game.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <strong style={{ margin: 0, fontSize: '1.1rem' }}>{game.title}</strong>
                    <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>{status}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <span className="progress-badge" style={{ minWidth: 60, textAlign: "center" }}>
                      {formatPlaytime(game.playtime)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <aside className="panel-card">
          <h2>Global Leaderboard</h2>
          {loadingLeaderboard ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--muted)' }}>Loading top players...</div>
          ) : (
            <div className="game-list">
              {leaderboard.map((player) => {
                const getRankStyle = (rank) => {
                  switch(rank) {
                    case 1: return { icon: "👑", color: "#fbbf24", bg: "rgba(251,191,36,0.15)", shadow: "0 0 15px rgba(251,191,36,0.4)", text: "#fbbf24" };
                    case 2: return { icon: "🥈", color: "#cbd5e1", bg: "rgba(203,213,225,0.15)", shadow: "0 0 10px rgba(203,213,225,0.3)", text: "#cbd5e1" };
                    case 3: return { icon: "🥉", color: "#d97706", bg: "rgba(217,119,6,0.15)", shadow: "0 0 8px rgba(217,119,6,0.3)", text: "#d97706" };
                    case 4: 
                    case 5: return { icon: "🔥", color: "#ef4444", bg: "rgba(239,68,68,0.1)", shadow: "none", text: "#ef4444" };
                    default: return { icon: "⭐", color: "var(--muted)", bg: "rgba(255,255,255,0.05)", shadow: "none", text: "var(--muted)" };
                  }
                };
                const style = getRankStyle(player.rank);

                return (
                  <div key={player.name} className="game-list-item" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 42, height: 42, borderRadius: '50%',
                      background: style.bg, color: style.color,
                      boxShadow: style.shadow, fontSize: 18,
                      flexShrink: 0, fontWeight: 800,
                      border: `1px solid ${style.color}40`
                    }}>
                      {style.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: 16, color: player.rank <= 3 ? '#fff' : 'inherit' }}>
                        <span style={{ color: style.text, marginRight: 6 }}>#{player.rank}</span> 
                        {player.name}
                      </strong>
                      <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>{player.xp.toLocaleString()} XP</div>
                    </div>
                    <span className="progress-badge" style={{ 
                      background: player.rank === 1 ? 'linear-gradient(90deg, #fbbf24, #f59e0b)' : 
                                  player.rank === 2 ? 'linear-gradient(90deg, #cbd5e1, #94a3b8)' : 
                                  player.rank === 3 ? 'linear-gradient(90deg, #d97706, #b45309)' : '',
                      color: player.rank <= 3 ? '#000' : 'var(--cyan)'
                    }}>
                      {player.progress}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
