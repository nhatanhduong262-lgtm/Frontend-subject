import Link from "next/link";
import ThemeToggle from "../components/ThemeToggle";

const highlights = [
  { label: "Live quests", value: "24/7" },
  { label: "Active players", value: "12.4K" },
  { label: "Avg. progress", value: "82%" },
];

const features = [
  "Dynamic game dashboards",
  "Stage-based progression tracking",
  "Player and admin role management",
  "Customizable light and dark modes",
];

const portalHighlights = [
  { title: "Arcade arena", subtitle: "5 playable mini-games", accent: "#3dd9ff" },
  { title: "Progress hub", subtitle: "XP, stages, and leadership", accent: "#8b5cf6" },
  { title: "Admin control", subtitle: "Launch and manage content", accent: "#7ef7d3" },
];

export default function Home() {
  return (
    <main className="landing-page">
      <div className="landing-overlay" />

      <header className="landing-header">
        <div className="brand-mark">
          <span className="brand-dot" />
          PixelPulse
        </div>

        <nav className="landing-nav">
          <ThemeToggle />
          <Link href="/login">Login</Link>
          <Link href="/register">Register</Link>
        </nav>
      </header>

      <section className="hero-panel">
        <div className="hero-copy">
          <span className="eyebrow">Next-gen gaming portal</span>
          <h1>Play harder. Level faster. Build your legacy.</h1>
          <p>
            PixelPulse Arena brings players, admin tools, and progression systems into one modern gaming ecosystem.
          </p>

          <div className="hero-actions">
            <Link href="/register" className="primary-button">Create account</Link>
            <Link href="/login" className="secondary-button">Sign in</Link>
          </div>

          <div className="stat-row">
            {highlights.map((item) => (
              <div key={item.label} className="mini-stat">
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="hero-visual">
          <div className="game-card featured">
            <div className="game-card-top">
              <span>Featured quest</span>
              <span className="pill">Live</span>
            </div>
            <h3>Nightfall Circuit</h3>
            <div className="progress-line">
              <span style={{ width: "78%" }} />
            </div>
            <div className="game-meta">
              <span>Stage 7</span>
              <span>78% complete</span>
            </div>
          </div>

          <div className="floating-card card-1">
            <span className="label">Rank</span>
            <strong>Diamond</strong>
          </div>

          <div className="floating-card card-2">
            <span className="label">XP</span>
            <strong>24,890</strong>
          </div>
        </div>
      </section>

      <section className="feature-panel">
        {features.map((feature) => (
          <div key={feature} className="feature-item">
            <span className="feature-icon">✦</span>
            <span>{feature}</span>
          </div>
        ))}
      </section>

      <section className="portal-grid">
        {portalHighlights.map((item) => (
          <div key={item.title} className="portal-card" style={{ borderTop: `3px solid ${item.accent}` }}>
            <span className="portal-kicker">System</span>
            <h3>{item.title}</h3>
            <p>{item.subtitle}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
