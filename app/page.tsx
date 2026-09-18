import Link from "next/link";
import ThemeToggle from "../components/ThemeToggle";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

const features = [
  "Dynamic game dashboards",
  "Stage-based progression tracking",
  "Player and admin role management",
  "Customizable light and dark modes",
];

export default async function Home() {
  const { count: liveGamesCount } = await supabase
    .from('games')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Live');
  
  const { data: games } = await supabase.from('games').select('players, progress');
  
  let totalPlayers = 0;
  let totalProgress = 0;
  let gamesWithProgress = 0;
  
  if (games) {
    games.forEach(g => {
      totalPlayers += (g.players || 0);
      if (typeof g.progress === 'number') {
        totalProgress += g.progress;
        gamesWithProgress++;
      }
    });
  }
  
  const avgProgress = gamesWithProgress > 0 ? Math.round(totalProgress / gamesWithProgress) : 0;
  const formattedPlayers = totalPlayers >= 1000 ? (totalPlayers / 1000).toFixed(1).replace(/\.0$/, '') + 'K' : totalPlayers.toString();

  const highlights = [
    { label: "Live quests", value: (liveGamesCount || 0).toString() },
    { label: "Active players", value: formattedPlayers },
    { label: "Avg. progress", value: `${avgProgress}%` },
  ];

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
          <h1>Play harder. Level faster.</h1>
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

    </main>
  );
}
