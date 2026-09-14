import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import BackButton from "../components/BackButton";
import Leaderboard from "../components/Leaderboard";
import { mergeProgressRecord } from "../lib/playerProgress";
import { recordGameActivity } from "../lib/quests";
import { useGameEffects } from "../context/GameEffectsContext";
import { usePlaytime } from "../hooks/usePlaytime";

const GRID_SIZE = 16; // 4x4 numbers 1-16

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function NumberCrushPage() {
  usePlaytime({ title: "Number Crush", genre: "Puzzle", href: "/numbercrush" });
  const router = useRouter();
  const { isMuted, toggleMute, playScoreSound, playGameOverSound, playErrorSound, fireConfetti, saveScoreToCloud } = useGameEffects();

  const [status, setStatus] = useState("idle"); // idle | playing | over
  const [numbers, setNumbers] = useState([]);
  const [nextTarget, setNextTarget] = useState(1);
  const [startTime, setStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [bestTime, setBestTime] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [flashId, setFlashId] = useState(null); // wrong flash
  const timerRef = useRef(null);

  useEffect(() => {
    if (!window.localStorage.getItem("userId")) {
      router.replace("/login");
    }
    const saved = Number(window.localStorage.getItem("numbercrush-best") || 0);
    setBestTime(saved);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [router]);

  const startGame = useCallback(() => {
    const nums = shuffle(Array.from({ length: GRID_SIZE }, (_, i) => i + 1));
    setNumbers(nums);
    setNextTarget(1);
    setMistakes(0);
    setElapsed(0);
    setFlashId(null);
    setStatus("playing");
    const t = Date.now();
    setStartTime(t);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - t) / 10) * 10);
    }, 100);
  }, []);

  const handleClick = useCallback((num) => {
    if (status !== "playing") return;
    if (num === nextTarget) {
      playScoreSound();
      if (nextTarget === GRID_SIZE) {
        // Win!
        clearInterval(timerRef.current);
        const finalTime = Date.now() - startTime;
        setElapsed(finalTime);
        setStatus("over");
        playGameOverSound();
        fireConfetti();
        const score = Math.max(0, 30000 - finalTime - mistakes * 500);
        saveScoreToCloud("Number Crush", score);
        recordGameActivity("Number Crush", score);
        mergeProgressRecord({ title: "Number Crush", genre: "Puzzle", href: "/numbercrush" }, score, "direct", 30000);
        if (bestTime === 0 || finalTime < bestTime) {
          setBestTime(finalTime);
          window.localStorage.setItem("numbercrush-best", String(finalTime));
        }
      }
      setNextTarget(t => t + 1);
    } else {
      // Wrong click
      playErrorSound();
      setMistakes(m => m + 1);
      setFlashId(num);
      setTimeout(() => setFlashId(null), 400);
    }
  }, [status, nextTarget, startTime, bestTime, playScoreSound, playGameOverSound, playErrorSound, fireConfetti, saveScoreToCloud, mistakes]);

  const formatTime = (ms) => {
    const s = Math.floor(ms / 1000);
    const dec = Math.floor((ms % 1000) / 10);
    return `${s}.${String(dec).padStart(2, "0")}s`;
  };

  return (
    <main className="dashboard-shell" style={{ minHeight: "100vh" }}>
      <header className="dashboard-header" style={{ marginBottom: 26 }}>
        <div>
          <div className="brand-mark">
            <span className="brand-dot" style={{ background: "#8b5cf6" }} />
            PixelPulse
          </div>
          <h1>🧠 Number Crush</h1>
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
          <span className="label">Next</span>
          <strong style={{ color: "#a78bfa", fontSize: 28 }}>{status === "playing" ? nextTarget : "—"}</strong>
        </div>
        <div className="stat-card">
          <span className="label">Time</span>
          <strong style={{ color: "#34d399" }}>{status !== "idle" ? formatTime(elapsed) : "—"}</strong>
        </div>
        <div className="stat-card">
          <span className="label">Mistakes</span>
          <strong style={{ color: mistakes > 0 ? "#ef4444" : "inherit" }}>{mistakes}</strong>
        </div>
        <div className="stat-card">
          <span className="label">Best</span>
          <strong style={{ color: "#f59e0b" }}>{bestTime ? formatTime(bestTime) : "—"}</strong>
        </div>
      </div>

      <section className="panel-card" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0 }}>
              {status === "idle" ? "Tap 1 → 16 in order, as fast as you can!" : status === "over" ? `Done in ${formatTime(elapsed)}!` : `Find number ${nextTarget}`}
            </h2>
            <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
              {status === "idle" ? "Numbers are shuffled randomly each round." : status === "over" ? `Mistakes: ${mistakes} • Score saved!` : "Tap the numbers in correct order 1 → 16"}
            </p>
          </div>
          {(status === "idle" || status === "over") && (
            <button type="button" className="primary-button" onClick={startGame}>
              {status === "over" ? "Play Again" : "Start Game"}
            </button>
          )}
        </div>

        {/* Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          maxWidth: 480,
          margin: "0 auto",
        }}>
          {numbers.map((num) => {
            const isCleared = status === "playing" ? num < nextTarget : status === "over" ? true : false;
            const isWrong = flashId === num;
            return (
              <button
                key={num}
                type="button"
                onClick={() => handleClick(num)}
                disabled={isCleared || status !== "playing"}
                style={{
                  height: 88,
                  borderRadius: 14,
                  border: isWrong ? "2px solid #ef4444" : "1px solid rgba(255,255,255,0.1)",
                  background: isCleared
                    ? "rgba(52, 211, 153, 0.12)"
                    : isWrong
                    ? "rgba(239,68,68,0.2)"
                    : "rgba(255,255,255,0.04)",
                  color: isCleared ? "#34d399" : "#fff",
                  fontSize: 26,
                  fontWeight: 800,
                  cursor: isCleared ? "default" : "pointer",
                  opacity: isCleared ? 0.4 : 1,
                  transition: "all 0.15s ease",
                  transform: isWrong ? "scale(0.95)" : "scale(1)",
                  boxShadow: isWrong ? "0 0 16px rgba(239,68,68,0.5)" : "none",
                }}
              >
                {isCleared ? "✓" : num}
              </button>
            );
          })}
        </div>

        {status === "idle" && (
          <div style={{ textAlign: "center", marginTop: 32, color: "rgba(255,255,255,0.3)", fontSize: 48 }}>🧠</div>
        )}
      </section>

      <Leaderboard gameName="Number Crush" />
    </main>
  );
}
