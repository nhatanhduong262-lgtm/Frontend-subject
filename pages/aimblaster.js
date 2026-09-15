import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import BackButton from "../components/BackButton";
import Leaderboard from "../components/Leaderboard";
import { mergeProgressRecord } from "../lib/playerProgress";
import { recordGameActivity } from "../lib/quests";
import { useGameEffects } from "../context/GameEffectsContext";
import { usePlaytime } from "../hooks/usePlaytime";

const GAME_DURATION = 20; // seconds
const TARGET_SIZE = 64;

function randomTarget(containerW, containerH) {
  return {
    id: Math.random(),
    x: TARGET_SIZE / 2 + Math.random() * (containerW - TARGET_SIZE),
    y: TARGET_SIZE / 2 + Math.random() * (containerH - TARGET_SIZE),
  };
}

export default function AimBlasterPage() {
  usePlaytime({ title: "Aim Blaster", genre: "Action", href: "/aimblaster" });
  const router = useRouter();
  const { isMuted, toggleMute, playScoreSound, playGameOverSound, playErrorSound, fireConfetti, saveScoreToCloud } = useGameEffects();
  const [status, setStatus] = useState("idle"); // idle | playing | over
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [target, setTarget] = useState(null);
  const [bestScore, setBestScore] = useState(0);
  const arenaRef = useRef(null);
  const timerRef = useRef(null);
  const scoreRef = useRef(0);

  useEffect(() => {
    if (!window.localStorage.getItem("userId")) {
      router.replace("/login");
    }
    const uid = window.localStorage.getItem("userId") || "guest";
    const saved = Number(window.localStorage.getItem(`aimblaster-best-${uid}`) || 0);
    setBestScore(saved);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [router]);

  const spawnTarget = useCallback(() => {
    if (!arenaRef.current) return;
    const { width, height } = arenaRef.current.getBoundingClientRect();
    setTarget(randomTarget(width, height));
  }, []);

  const startGame = useCallback(() => {
    scoreRef.current = 0;
    setScore(0);
    setMisses(0);
    setTimeLeft(GAME_DURATION);
    setStatus("playing");
    spawnTarget();

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setStatus("over");
          setTarget(null);
          playGameOverSound();
          const finalScore = scoreRef.current;
          if (finalScore > 0) {
            saveScoreToCloud("Aim Blaster", finalScore * 100);
            recordGameActivity("Aim Blaster", finalScore * 100);
            mergeProgressRecord({ title: "Aim Blaster", genre: "Action", href: "/aimblaster" }, finalScore * 100, "direct", 3000);
            if (finalScore > bestScore) {
              setBestScore(finalScore);
              const uid = window.localStorage.getItem("userId") || "guest";
              window.localStorage.setItem(`aimblaster-best-${uid}`, String(finalScore));
              fireConfetti();
            }
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [spawnTarget, playGameOverSound, saveScoreToCloud, fireConfetti, bestScore]);

  const handleHit = useCallback(() => {
    if (status !== "playing") return;
    playScoreSound();
    scoreRef.current += 1;
    setScore(s => s + 1);
    spawnTarget();
  }, [status, playScoreSound, spawnTarget]);

  const handleMiss = useCallback((e) => {
    if (status !== "playing") return;
    // Only count misses if clicking arena, not target
    if (e.target === arenaRef.current) {
      playErrorSound();
      setMisses(m => m + 1);
    }
  }, [status, playErrorSound]);

  const accuracy = score + misses > 0 ? Math.round((score / (score + misses)) * 100) : 0;

  return (
    <main className="dashboard-shell" style={{ minHeight: "100vh" }}>
      <header className="dashboard-header" style={{ marginBottom: 26 }}>
        <div>
          <div className="brand-mark">
            <span className="brand-dot" style={{ background: "#ef4444" }} />
            PixelPulse
          </div>
          <h1>🎯 Aim Blaster</h1>
        </div>
        <div className="dashboard-actions">
          <button type="button" className="ghost-button" onClick={toggleMute} style={{ fontSize: 20, padding: "8px 12px" }}>
            {isMuted ? "🔇" : "🔊"}
          </button>
          <BackButton label="← Back" />
          <Link href="/games" className="ghost-button">Games</Link>
          <Link href="/dashboard" className="ghost-button">Dashboard</Link>
          <button type="button" className="ghost-button" onClick={() => { window.localStorage.removeItem("token"); window.localStorage.removeItem("userId"); window.localStorage.removeItem("profile"); router.push("/login"); }}>Logout</button>
        </div>
      </header>

      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <span className="label">Score</span>
          <strong style={{ color: "#34d399" }}>{score}</strong>
        </div>
        <div className="stat-card">
          <span className="label">Best</span>
          <strong style={{ color: "#f59e0b" }}>{bestScore}</strong>
        </div>
        <div className="stat-card">
          <span className="label">Time</span>
          <strong style={{ color: timeLeft <= 5 ? "#ef4444" : "inherit" }}>{timeLeft}s</strong>
        </div>
        <div className="stat-card">
          <span className="label">Accuracy</span>
          <strong>{accuracy}%</strong>
        </div>
      </div>

      <section className="panel-card" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0 }}>
              {status === "idle" ? "Click targets as fast as you can!" : status === "over" ? `Game Over! Score: ${score}` : "Hit the targets!"}
            </h2>
            <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
              {status === "idle" ? "You have 20 seconds. Don't miss!" : status === "over" ? `Accuracy: ${accuracy}% • Misses: ${misses}` : `Misses: ${misses}`}
            </p>
          </div>
          {(status === "idle" || status === "over") && (
            <button type="button" className="primary-button" onClick={startGame}>
              {status === "over" ? "Play Again" : "Start Game"}
            </button>
          )}
        </div>

        {/* Arena */}
        <div
          ref={arenaRef}
          onClick={handleMiss}
          style={{
            position: "relative",
            width: "100%",
            height: 600,
            borderRadius: 24,
            background: "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,41,59,0.95))",
            border: "1px solid rgba(255,255,255,0.08)",
            overflow: "hidden",
            cursor: status === "playing" ? "crosshair" : "default",
            userSelect: "none",
          }}
        >
          {status === "idle" && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, color: "rgba(255,255,255,0.4)" }}>
              <span style={{ fontSize: 80 }}>🎯</span>
              <span style={{ fontSize: 24, fontWeight: 600 }}>Press Start to play</span>
            </div>
          )}
          {status === "over" && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <span style={{ fontSize: 72 }}>🏁</span>
              <span style={{ fontSize: 48, fontWeight: 800, color: "#34d399" }}>{score} hits</span>
              <span style={{ color: "var(--muted)", fontSize: 20 }}>Accuracy: {accuracy}%</span>
            </div>
          )}
          {status === "playing" && target && (
            <button
              onClick={handleHit}
              style={{
                position: "absolute",
                left: target.x - TARGET_SIZE / 2,
                top: target.y - TARGET_SIZE / 2,
                width: TARGET_SIZE,
                height: TARGET_SIZE,
                borderRadius: "50%",
                background: "radial-gradient(circle, #ef4444 30%, #dc2626 70%)",
                border: "4px solid #fca5a5",
                cursor: "crosshair",
                boxShadow: "0 0 20px rgba(239,68,68,0.8)",
                animation: "pulse-target 0.3s ease-out",
                transition: "none",
              }}
            />
          )}
          {/* Timer bar */}
          {status === "playing" && (
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 6, background: "rgba(255,255,255,0.1)" }}>
              <div style={{ height: "100%", background: timeLeft <= 5 ? "#ef4444" : "#34d399", width: `${(timeLeft / GAME_DURATION) * 100}%`, transition: "width 1s linear, background 0.3s" }} />
            </div>
          )}
        </div>
      </section>

      <style>{`
        @keyframes pulse-target {
          from { transform: scale(1.4); opacity: 0.6; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <Leaderboard gameName="Aim Blaster" />
    </main>
  );
}
