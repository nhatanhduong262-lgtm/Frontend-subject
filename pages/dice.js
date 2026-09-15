import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import BackButton from "../components/BackButton";
import Leaderboard from "../components/Leaderboard";
import { useGameEffects } from "../context/GameEffectsContext";
import { recordGameActivity } from "../lib/quests";
import { usePlaytime } from "../hooks/usePlaytime";

function rollDie() {
  return Math.floor(Math.random() * 6) + 1;
}

export default function DicePage() {
  usePlaytime({ title: "Lucky Dice", genre: "Chance", href: "/dice" });
  const router = useRouter();
  const { isMuted, toggleMute, playDiceRollSound, playScoreSound, playGameOverSound, saveScoreToCloud } = useGameEffects();
  const [playerRoll, setPlayerRoll] = useState(1);
  const [botRoll, setBotRoll] = useState(1);
  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [round, setRound] = useState(1);
  const [message, setMessage] = useState("Roll the dice to challenge the arena.");

  useEffect(() => {
    if (!window.localStorage.getItem("userId")) {
      router.replace("/login");
      return undefined;
    }
    return undefined;
  }, [router]);

  const rollDice = () => {
    playDiceRollSound();
    
    // Simulate a tiny delay so the dice roll sound plays before result sound
    setTimeout(() => {
      const player = rollDie();
      const bot = rollDie();
      const nextRound = round + 1;

      setPlayerRoll(player);
      setBotRoll(bot);

      if (player > bot) {
        const nextScore = playerScore + 1;
        setPlayerScore(nextScore);
        setMessage(`Round ${round}: You win! ${player} to ${bot}.`);
        setTimeout(() => {
          playScoreSound();
          saveScoreToCloud("Lucky Dice", nextScore);
          recordGameActivity("Lucky Dice", nextScore);
        }, 400); // play win sound after roll sound finishes
      } else if (player < bot) {
        setBotScore((current) => current + 1);
        setMessage(`Round ${round}: CPU wins! ${bot} to ${player}.`);
        setTimeout(playGameOverSound, 400);
      } else {
        setMessage(`Round ${round}: Draw! Both rolled ${player}.`);
      }

      setRound(nextRound);
    }, 100);
  };

  return (
    <main className="dashboard-shell" style={{ minHeight: "100vh" }}>
      <header className="dashboard-header" style={{ marginBottom: 26 }}>
        <div>
          <div className="brand-mark">
            <span className="brand-dot" />
            PixelPulse
          </div>
          <h1>Lucky Dice</h1>
        </div>

        <div className="dashboard-actions">
          <button type="button" className="ghost-button" onClick={toggleMute} style={{ fontSize: 20, padding: "8px 12px" }}>
            {isMuted ? '🔇' : '🔊'}
          </button>
          <BackButton label="← Back" />
          <Link href="/games" className="ghost-button">Games</Link>
          <Link href="/dashboard" className="ghost-button">Dashboard</Link>
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

      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <span className="label">You</span>
          <strong>{playerScore}</strong>
        </div>
        <div className="stat-card">
          <span className="label">CPU</span>
          <strong>{botScore}</strong>
        </div>
        <div className="stat-card">
          <span className="label">Round</span>
          <strong>{round}</strong>
        </div>
        <div className="stat-card">
          <span className="label">Luck</span>
          <strong>{playerRoll === botRoll ? "Draw" : playerRoll > botRoll ? "Hot" : "Cold"}</strong>
        </div>
      </div>

      <section className="panel-card" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0 }}>Beat the arena host.</h2>
            <p style={{ margin: "8px 0 0", color: "var(--muted)" }}>{message}</p>
          </div>

          <button type="button" className="primary-button" onClick={rollDice}>
            Roll dice
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(200px, 1fr))", gap: 32, maxWidth: 800, margin: "0 auto" }}>
          <div style={{ borderRadius: 24, background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", padding: 40, textAlign: "center" }}>
            <div style={{ color: "var(--muted)", marginBottom: 20, fontWeight: 700, fontSize: 24 }}>Player</div>
            <div style={{ fontSize: "8rem", lineHeight: 1 }}>{playerRoll}</div>
          </div>

          <div style={{ borderRadius: 24, background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", padding: 40, textAlign: "center" }}>
            <div style={{ color: "var(--muted)", marginBottom: 20, fontWeight: 700, fontSize: 24 }}>CPU</div>
            <div style={{ fontSize: "8rem", lineHeight: 1 }}>{botRoll}</div>
          </div>
        </div>
      </section>
      
      <Leaderboard gameName="Lucky Dice" />
    </main>
  );
}
