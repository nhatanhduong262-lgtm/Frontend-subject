import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import ThemeToggle from "../components/ThemeToggle";
import BackButton from "../components/BackButton";
import { DEFAULT_PLAYER_PROGRESS, getStoredPlayerProgress, loadPlayerProgressFromDatabase, subscribeToUserProgress } from "../lib/playerProgress";
import { getQuestState, claimQuestReward, getRankFromPoints } from "../lib/quests";

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
  const completedStages = featuredGames.filter((game) => Number(game.progress || 0) >= 80).length;
  const xp = featuredGames.reduce((sum, game) => sum + Number(game.progress || 0) * 120, 0);
  const level = Math.max(1, Math.round(averageProgress / 5));
  
  const currentRank = getRankFromPoints(questState?.totalPoints || 0);

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
            <strong>{completedStages}/{featuredGames.length}</strong>
          </div>
          <div className="stat-card" style={{ background: "linear-gradient(180deg, rgba(var(--card-tint-4, 236, 72, 153), 0.15), transparent)", borderColor: "rgba(var(--card-tint-4, 236, 72, 153), 0.25)" }}>
            <span className="label">Rank</span>
            <strong style={{ background: currentRank.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {currentRank.name}
            </strong>
          </div>
        </div>

        <div className="dashboard-content" style={{ position: "relative", zIndex: 1 }}>
          <section className="panel-card" style={{ boxShadow: "0 0 26px rgba(99,102,241,0.08)" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={labelStyle}>Daily Quests</div>
                <h2 style={{ marginTop: 0 }}>Nhiệm vụ ngày</h2>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>Quest Points</span>
                <strong style={{ display: 'block', fontSize: 24, color: '#f59e0b' }}>{questState?.totalPoints || 0}</strong>
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
                    <small style={{ color: 'var(--muted)', display: 'block', marginTop: 8 }}>Tiến độ: {q.current} / {q.target}</small>
                  </div>
                  <div>
                    {q.claimed ? (
                      <span style={{ color: '#10b981', fontWeight: 700, padding: '8px 16px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 8 }}>Đã nhận</span>
                    ) : q.current >= q.target ? (
                      <button className="primary-button" style={{ background: '#f59e0b', color: '#000' }} onClick={() => claimQuestReward(q.id)}>
                        Nhận {q.reward} QP
                      </button>
                    ) : (
                      <span style={{ color: '#f59e0b', fontWeight: 600 }}>Thưởng: {q.reward} QP</span>
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
      </main>
    </AuthGuard>
  );
}
