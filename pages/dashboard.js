import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import ThemeToggle from "../components/ThemeToggle";
import BackButton from "../components/BackButton";

const featuredGames = [
  { title: "Sky Hopper", genre: "Arcade", progress: 78, href: "/flappy" },
  { title: "Neon Match", genre: "Puzzle", progress: 64, href: "/memory" },
  { title: "Pulse Reflex", genre: "Speed", progress: 69, href: "/reaction" },
  { title: "Pong Arena", genre: "Arcade", progress: 83, href: "/pong" },
];

const quickLinks = [
  { label: "Game library", href: "/games" },
  { label: "Progress", href: "/progress" },
  { label: "Admin", href: "/admin" },
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

  useEffect(() => {
    const token = window.localStorage.getItem("token");
    const savedProfile = JSON.parse(window.localStorage.getItem("profile") || "null");

    if (!token || !savedProfile) {
      router.replace("/login");
      return;
    }

    setProfile(savedProfile);
  }, [router]);

  const handleLogout = () => {
    window.localStorage.removeItem("token");
    window.localStorage.removeItem("userId");
    window.localStorage.removeItem("profile");
    router.push("/login");
  };

  if (!profile) return null;

  return (
    <AuthGuard>
      <main className="dashboard-shell" style={{ minHeight: "100vh" }}>
        <header className="dashboard-header">
          <div>
            <div className="brand-mark">
              <span className="brand-dot" />
              PixelPulse
            </div>
            <h1>Welcome back, {profile.name || "Player"}</h1>
          </div>

          <div className="dashboard-actions">
            <BackButton label="← Back" fallback="/dashboard" />
            <ThemeToggle />
            <Link href="/games" className="ghost-button">Games</Link>
            <Link href="/progress" className="ghost-button">Progress</Link>
            <Link href="/admin" className="ghost-button">Admin</Link>
            <button type="button" className="ghost-button" onClick={handleLogout}>Logout</button>
          </div>
        </header>

        <div className="stats-grid">
          <div className="stat-card">
            <span className="label">Player level</span>
            <strong>24</strong>
          </div>
          <div className="stat-card">
            <span className="label">XP</span>
            <strong>24.8K</strong>
          </div>
          <div className="stat-card">
            <span className="label">Stage clear</span>
            <strong>3/4</strong>
          </div>
          <div className="stat-card">
            <span className="label">Rank</span>
            <strong>Diamond</strong>
          </div>
        </div>

        <div className="dashboard-content">
          <section className="panel-card">
            <h2>Featured arena</h2>
            <div className="featured-quest">
              <div>
                <span className="portal-kicker">Current challenge</span>
                <h3>Nightfall Circuit</h3>
                <p>Push through the neon circuit and secure the final boss route.</p>
              </div>
              <div className="progress-line">
                <span style={{ width: "78%" }} />
              </div>
              <div className="game-meta">
                <span>Stage 7</span>
                <span>78% complete</span>
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

          <aside className="panel-card">
            <h2>Quick access</h2>
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
