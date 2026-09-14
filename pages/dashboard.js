import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import ThemeToggle from "../components/ThemeToggle";
import BackButton from "../components/BackButton";
import { DEFAULT_PLAYER_PROGRESS, getStoredPlayerProgress, loadPlayerProgressFromDatabase, subscribeToUserProgress } from "../lib/playerProgress";
import { getQuestState, claimQuestReward, getRankFromPoints, RANKS } from "../lib/quests";

const defaultPlayerProgress = DEFAULT_PLAYER_PROGRESS;

const quickLinks = [
  { label: "Game library", href: "/games" },
  { label: "Progress", href: "/progress" },
  { label: "Profile", href: "/profile" },
];

function AuthGuard({ children }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = window.localStorage.getItem("token");
    const profile = JSON.parse(window.localStorage.getItem("profile") || "null");

    if (!token || !profile) {
      router.replace("/login");
      return;
    }

    setReady(true);
  }, [router]);

  if (!ready) return null;
  return children;
}

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [playerProgress, setPlayerProgress] = useState(() => getStoredPlayerProgress());
  const [questState, setQuestState] = useState(null);
  const [isRankModalOpen, setIsRankModalOpen] = useState(false);

  useEffect(() => {
    setQuestState(getQuestState());
    
    const handleQuestUpdate = (e) => setQuestState(e.detail);
    window.addEventListener('pixelpulse-quests-updated', handleQuestUpdate);
    return () => window.removeEventListener('pixelpulse-quests-updated', handleQuestUpdate);
  }, []);

  useEffect(() => {
    const token = window.localStorage.getItem("token");
    const savedProfile = JSON.parse(window.localStorage.getItem("profile") || "null");

    if (!token || !savedProfile) {
      router.replace("/login");
      return;
    }

    if (savedProfile.role === "admin") {
      router.replace("/admin");
      return;
    }

    setProfile(savedProfile);
  }, [router]);

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    let pollingId = null;

    const syncProgress = (event) => {
      const nextProgress = event?.detail ?? getStoredPlayerProgress();
      if (active) setPlayerProgress(Array.isArray(nextProgress) ? nextProgress : defaultPlayerProgress);
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

  const handleLogout = () => {
    window.localStorage.removeItem("token");
    window.localStorage.removeItem("userId");
    window.localStorage.removeItem("profile");
    router.push("/login");
  };

  if (!profile) return null;

  const featuredGames = playerProgress.slice(0, 4);
  const averageProgress = Math.round(featuredGames.reduce((sum, game) => sum + Number(game.progress || 0), 0) / Math.max(featuredGames.length, 1));
  const completedStages = questState?.activeQuests?.filter(q => q.claimed || q.current >= q.target).length || 0;
  const totalQuests = questState?.activeQuests?.length || 3;
  const xp = playerProgress.reduce((sum, game) => sum + (Number(game.score) || 0), 0);
  const level = Math.max(1, Math.round(averageProgress / 5));
  
  const currentPoints = questState?.totalPoints || 0;
  const currentRank = getRankFromPoints(currentPoints);
  
  const sortedRanks = [...RANKS].sort((a, b) => a.minPoints - b.minPoints);
  const nextRank = sortedRanks.find(r => r.minPoints > currentPoints);
  
  let expPercentage = 100;
  let expText = "Max Rank";
  
  if (nextRank) {
    const currentRankMin = currentRank.minPoints;
    const nextRankMin = nextRank.minPoints;
    expPercentage = ((currentPoints - currentRankMin) / (nextRankMin - currentRankMin)) * 100;
    expText = `${currentPoints} / ${nextRankMin} QP`;
  }

  const hexToRgbStr = (hex) => {
    const hexStr = hex || '#7dd3fc';
    const r = parseInt(hexStr.slice(1, 3), 16) || 125;
    const g = parseInt(hexStr.slice(3, 5), 16) || 211;
    const b = parseInt(hexStr.slice(5, 7), 16) || 252;
    return `${r}, ${g}, ${b}`;
  };

  const shellStyle = {
    minHeight: "100vh",
    padding: "28px 20px 40px",
    position: "relative",
    overflow: "hidden",
  };

  const labelStyle = {
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    fontSize: 12,
    color: "var(--cyan)",
    marginBottom: 12,
    fontWeight: 700,
  };

  return (
    <AuthGuard>
      <main className="dashboard-shell" style={shellStyle}>
        <header className="dashboard-header" style={{ marginBottom: 28, position: "relative", zIndex: 1 }}>
          <div>
            <div className="brand-mark" style={{ display: "flex", alignItems: "center", gap: 10, textShadow: "0 0 14px rgba(125,211,252,0.45)" }}>
              <span className="brand-dot" style={{ boxShadow: "0 0 18px rgba(168,85,247,0.8)" }} />
              <span>PixelPulse</span>
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 12, padding: "6px 12px", borderRadius: 999, background: "rgba(var(--cyan-rgb, 125, 211, 252), 0.10)", border: "1px solid rgba(var(--cyan-rgb, 125, 211, 252), 0.28)", color: "var(--cyan)", fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700 }}>
              Player portal
            </div>
            <h1 style={{ marginTop: 12, textShadow: "0 0 18px rgba(125,211,252,0.22)" }}>Welcome back, {profile.name || "Player"}</h1>
          </div>

          <div className="dashboard-actions">
            <BackButton label="← Back" />
            <ThemeToggle />
            <Link href="/games" className="ghost-button">Games</Link>
            <Link href="/progress" className="ghost-button">Progress</Link>
            <Link href="/profile" className="ghost-button">Profile</Link>
            <button type="button" className="ghost-button" onClick={handleLogout}>Logout</button>
          </div>
        </header>

        <div className="stats-grid" style={{ position: "relative", zIndex: 1 }}>
          <div className="stat-card" style={{ background: "linear-gradient(180deg, rgba(var(--card-tint-1, 124, 58, 237), 0.15), transparent)", borderColor: "rgba(var(--card-tint-1, 124, 58, 237), 0.25)" }}>
            <span className="label">Player level</span>
            <strong>{level}</strong>
          </div>
          <div className="stat-card" style={{ background: "linear-gradient(180deg, rgba(var(--card-tint-2, 59, 130, 246), 0.15), transparent)", borderColor: "rgba(var(--card-tint-2, 59, 130, 246), 0.25)" }}>
            <span className="label">XP</span>
            <strong>{xp.toLocaleString()}</strong>
          </div>
          <div className="stat-card" style={{ background: "linear-gradient(180deg, rgba(var(--card-tint-3, 45, 212, 191), 0.15), transparent)", borderColor: "rgba(var(--card-tint-3, 45, 212, 191), 0.25)" }}>
            <span className="label">Stage clear</span>
            <strong>{completedStages}/{totalQuests}</strong>
          </div>
          <div 
            className="stat-card" 
            onClick={() => setIsRankModalOpen(true)}
            style={{ 
              background: `linear-gradient(180deg, ${currentRank.color}25, transparent)`, 
              borderColor: `${currentRank.color}40`, 
              cursor: "pointer", 
              transition: "transform 0.2s, box-shadow 0.2s" 
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <span className="label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              Rank 
              <span style={{ fontSize: 9, color: currentRank.color, border: `1px solid ${currentRank.color}`, padding: '2px 6px', borderRadius: 10 }}>INFO</span>
            </span>
            <strong style={{ backgroundImage: currentRank.gradient, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', WebkitTextFillColor: 'transparent', display: 'inline-block' }}>
              {currentRank.name}
            </strong>
          </div>
        </div>

        <div className="dashboard-content" style={{ position: "relative", zIndex: 1 }}>
          <section className="panel-card" style={{ boxShadow: "0 0 26px rgba(99,102,241,0.08)" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={labelStyle}>Daily Quests</div>
                <h2 style={{ marginTop: 0, marginBottom: 8 }}>Today's Quests</h2>
              </div>
              <div style={{ minWidth: 260, flex: "1 1 260px", maxWidth: 400, textAlign: 'right' }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                  <span style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 600 }}>Rank: {currentRank.name}</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <strong style={{ fontSize: 24, backgroundImage: currentRank.gradient || '#f59e0b', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', WebkitTextFillColor: 'transparent' }}>
                      {currentPoints}
                    </strong>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>QP</span>
                  </div>
                </div>
                
                <div style={{ background: 'rgba(0,0,0,0.3)', height: 10, borderRadius: 5, overflow: 'hidden', boxShadow: "inset 0 1px 3px rgba(0,0,0,0.5)", marginBottom: 8 }}>
                  <div style={{ width: `${Math.min(100, Math.max(0, expPercentage))}%`, background: currentRank.gradient || '#f59e0b', height: '100%', borderRadius: 5, transition: 'width 0.5s ease-out' }} />
                </div>
                
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>
                  <span>{expText}</span>
                  <span>{nextRank ? `Next: ${nextRank.name}` : "Max Rank"}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              {questState?.activeQuests?.map(q => (
                <div key={q.id} className="stat-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
                  <div style={{ flex: 1, marginRight: 20 }}>
                    <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>{q.title}</h3>
                    <div className="mini-progress-line" style={{ background: 'rgba(255,255,255,0.1)' }}>
                      <span style={{ width: `${Math.min(100, (q.current / q.target) * 100)}%`, background: q.claimed ? '#10b981' : '#3b82f6' }} />
                    </div>
                    <small style={{ color: 'var(--muted)', display: 'block', marginTop: 8 }}>Progress: {q.current} / {q.target}</small>
                  </div>
                  <div>
                    {q.claimed ? (
                      <span style={{ color: '#10b981', fontWeight: 700, padding: '8px 16px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 8 }}>Claimed</span>
                    ) : q.current >= q.target ? (
                      <button className="primary-button" style={{ background: '#f59e0b', color: '#000' }} onClick={() => claimQuestReward(q.id)}>
                        Claim {q.reward} QP
                      </button>
                    ) : (
                      <span style={{ color: '#f59e0b', fontWeight: 600 }}>Reward: {q.reward} QP</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <h3 style={{ marginTop: 40, marginBottom: 16 }}>Recommended Games</h3>
            <div className="mini-feature-grid">
              {featuredGames.map((game) => (
                <Link key={game.title} href={game.href} className="mini-feature-card" style={game.image ? { position: 'relative', overflow: 'hidden' } : {}}>
                  {game.image && (
                    <img 
                      src={game.image} 
                      alt="" 
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        opacity: 0.35,
                        zIndex: 0
                      }} 
                    />
                  )}
                  <span className="mini-feature-label" style={{ position: 'relative', zIndex: 1, textShadow: game.image ? '0 1px 3px rgba(0,0,0,0.6)' : 'none', color: game.image ? '#f8fafc' : 'inherit' }}>{game.genre}</span>
                  <strong style={{ position: 'relative', zIndex: 1, textShadow: game.image ? '0 2px 4px rgba(0,0,0,0.8)' : 'none', color: game.image ? '#fff' : 'inherit' }}>{game.title}</strong>
                  <div className="mini-progress-line" style={{ position: 'relative', zIndex: 1 }}>
                    <span style={{ width: `${game.progress}%` }} />
                  </div>
                  <small style={{ position: 'relative', zIndex: 1, textShadow: game.image ? '0 1px 3px rgba(0,0,0,0.6)' : 'none', color: game.image ? '#e2e8f0' : 'inherit' }}>{game.progress}% complete</small>
                </Link>
              ))}
            </div>
          </section>

          <aside className="panel-card" style={{ boxShadow: "0 0 24px rgba(99,102,241,0.10)" }}>
            <div style={labelStyle}>Navigation</div>
            <h2 style={{ marginTop: 0 }}>Quick access</h2>
            <div className="quick-access-list">
              {quickLinks.map((link) => (
                <Link key={link.label} href={link.href} className="quick-link-item">
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="activity-card">
              <span className="portal-kicker">Account</span>
              <div className="account-line">
                <strong>{profile.email}</strong>
                <span>{profile.role || "player"}</span>
              </div>
            </div>
          </aside>
        </div>
        
        {isRankModalOpen && (
          <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={() => setIsRankModalOpen(false)} />
            <div className="panel-card" style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 460, background: "var(--panel-strong)", border: `1px solid ${currentRank.color}`, boxShadow: `0 0 30px ${currentRank.color}40` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2 style={{ margin: 0 }}>Hệ thống Hạng (Rank)</h2>
                <button onClick={() => setIsRankModalOpen(false)} style={{ background: "transparent", border: "none", color: "var(--muted)", fontSize: 28, cursor: "pointer", lineHeight: 1 }}>×</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: "60vh", overflowY: "auto", paddingRight: 8 }}>
                {[...RANKS].sort((a,b) => b.minPoints - a.minPoints).map(r => (
                  <div key={r.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: r.name === currentRank.name ? `1px solid ${r.color}` : "1px solid var(--border)" }}>
                    <strong style={{ backgroundImage: r.gradient, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', WebkitTextFillColor: 'transparent', fontSize: 18, display: 'inline-block' }}>{r.name}</strong>
                    <span style={{ color: "var(--muted)", fontSize: 14 }}>{r.minPoints} QP</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>
    </AuthGuard>
  );
}
