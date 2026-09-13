import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import ThemeToggle from "../components/ThemeToggle";
import BackButton from "../components/BackButton";
import { DEFAULT_PLAYER_PROGRESS, getStoredPlayerProgress, loadPlayerProgressFromDatabase, subscribeToUserProgress } from "../lib/playerProgress";

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
  const rank = averageProgress >= 80 ? "Diamond" : averageProgress >= 65 ? "Gold" : averageProgress >= 45 ? "Silver" : "Rookie";

  const shellStyle = {
    minHeight: "100vh",
    background: "radial-gradient(circle at top left, rgba(124,58,237,0.22), transparent 28%), radial-gradient(circle at bottom right, rgba(6,182,212,0.20), transparent 24%), linear-gradient(135deg, #090d1d 0%, #10172e 45%, #111827 100%)",
    color: "#edf4ff",
    padding: "28px 20px 40px",
    position: "relative",
    overflow: "hidden",
  };

  const labelStyle = {
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    fontSize: 12,
    color: "#7dd3fc",
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
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 12, padding: "6px 12px", borderRadius: 999, background: "rgba(125,211,252,0.10)", border: "1px solid rgba(125,211,252,0.28)", color: "#7dd3fc", fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700 }}>
              Player portal
            </div>
            <h1 style={{ marginTop: 12, color: "#f8fbff", textShadow: "0 0 18px rgba(125,211,252,0.22)" }}>Welcome back, {profile.name || "Player"}</h1>
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
          <div className="stat-card" style={{ background: "linear-gradient(180deg, rgba(124,58,237,0.20), rgba(15,23,42,0.72))", borderColor: "rgba(167,139,250,0.25)", boxShadow: "0 0 20px rgba(124,58,237,0.15)" }}>
            <span className="label">Player level</span>
            <strong>{level}</strong>
          </div>
          <div className="stat-card" style={{ background: "linear-gradient(180deg, rgba(59,130,246,0.20), rgba(15,23,42,0.72))", borderColor: "rgba(96,165,250,0.25)", boxShadow: "0 0 20px rgba(59,130,246,0.15)" }}>
            <span className="label">XP</span>
            <strong>{xp.toLocaleString()}</strong>
          </div>
          <div className="stat-card" style={{ background: "linear-gradient(180deg, rgba(45,212,191,0.15), rgba(15,23,42,0.72))", borderColor: "rgba(45,212,191,0.25)", boxShadow: "0 0 20px rgba(45,212,191,0.12)" }}>
            <span className="label">Stage clear</span>
            <strong>{completedStages}/{featuredGames.length}</strong>
          </div>
          <div className="stat-card" style={{ background: "linear-gradient(180deg, rgba(236,72,153,0.14), rgba(15,23,42,0.72))", borderColor: "rgba(244,114,182,0.25)", boxShadow: "0 0 20px rgba(236,72,153,0.12)" }}>
            <span className="label">Rank</span>
            <strong>{rank}</strong>
          </div>
        </div>

        <div className="dashboard-content" style={{ position: "relative", zIndex: 1 }}>
          <section className="panel-card" style={{ background: "linear-gradient(180deg, rgba(17, 24, 39, 0.94), rgba(15, 23, 42, 0.78))", border: "1px solid rgba(125,211,252,0.18)", boxShadow: "0 0 26px rgba(99,102,241,0.08)" }}>
            <div style={labelStyle}>Featured arena</div>
            <h2 style={{ marginTop: 0, color: "#e2e8f0" }}>Featured arena</h2>
            <div className="featured-quest">
              <div>
                <span className="portal-kicker">Current challenge</span>
                <h3>{featuredGames[0]?.title || "Nightfall Circuit"}</h3>
                <p>Push through the neon circuit and secure the final boss route.</p>
              </div>
              <div className="progress-line">
                <span style={{ width: `${featuredGames[0]?.progress || 0}%` }} />
              </div>
              <div className="game-meta">
                <span>{featuredGames[0]?.genre || "Arcade"}</span>
                <span>{featuredGames[0]?.progress || 0}% complete</span>
              </div>
            </div>

            <div className="mini-feature-grid">
              {featuredGames.map((game) => (
                <Link key={game.title} href={game.href} className="mini-feature-card">
                  <span className="mini-feature-label">{game.genre}</span>
                  <strong>{game.title}</strong>
                  <div className="mini-progress-line">
                    <span style={{ width: `${game.progress}%` }} />
                  </div>
                  <small>{game.progress}% complete</small>
                </Link>
              ))}
            </div>
          </section>

          <aside className="panel-card" style={{ background: "linear-gradient(180deg, rgba(79, 70, 229, 0.14), rgba(15, 23, 42, 0.74))", borderColor: "rgba(167,139,250,0.26)", boxShadow: "0 0 24px rgba(99,102,241,0.10)" }}>
            <div style={labelStyle}>Navigation</div>
            <h2 style={{ marginTop: 0, color: "#e2e8f0" }}>Quick access</h2>
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
