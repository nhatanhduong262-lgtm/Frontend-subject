import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import BackButton from "../components/BackButton";
import Leaderboard from "../components/Leaderboard";
import { mergeProgressRecord } from "../lib/playerProgress";
import { recordGameActivity } from "../lib/quests";
import { useGameEffects } from "../context/GameEffectsContext";
import { usePlaytime } from "../hooks/usePlaytime";

const COLORS = [
  { id: "red",    label: "🔴", bg: "#ef4444", shadow: "rgba(239,68,68,0.7)" },
  { id: "blue",   label: "🔵", bg: "#3b82f6", shadow: "rgba(59,130,246,0.7)" },
  { id: "green",  label: "🟢", bg: "#22c55e", shadow: "rgba(34,197,94,0.7)" },
  { id: "yellow", label: "🟡", bg: "#eab308", shadow: "rgba(234,179,8,0.7)" },
];

const SHOW_DURATION = 600; // ms each color shows
const PAUSE_DURATION = 200; // gap between colors

export default function ColorStormPage() {
  usePlaytime({ title: "Color Storm", genre: "Memory", href: "/colorstorm" });
  const router = useRouter();
  const { isMuted, toggleMute, playCardFlipSound, playMatchSuccessSound, playMismatchSound, playGameOverSound, fireConfetti, saveScoreToCloud } = useGameEffects();

  const [status, setStatus] = useState("idle"); // idle | showing | input | over
  const [sequence, setSequence] = useState([]);
  const [playerInput, setPlayerInput] = useState([]);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [activeColor, setActiveColor] = useState(null);
  const [message, setMessage] = useState("Watch the sequence, then repeat it!");
  const [wrongFlash, setWrongFlash] = useState(false);
  const timeoutsRef = useRef([]);

  useEffect(() => {
    if (!window.localStorage.getItem("userId")) router.replace("/login");
    const uid = window.localStorage.getItem("userId") || "guest";
    const saved = Number(window.localStorage.getItem(`colorstorm-best-${uid}`) || 0);
    setBestScore(saved);
    return () => { timeoutsRef.current.forEach(clearTimeout); };
  }, [router]);

  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  const addTimeout = (fn, delay) => {
    const id = setTimeout(fn, delay);
    timeoutsRef.current.push(id);
    return id;
  };

  const showSequence = useCallback((seq) => {
    setStatus("showing");
    setActiveColor(null);
    setMessage("Watch carefully...");

    let delay = 500;
    seq.forEach((colorId) => {
      addTimeout(() => {
        setActiveColor(colorId);
        playCardFlipSound();
      }, delay);
      delay += SHOW_DURATION;
      addTimeout(() => setActiveColor(null), delay - PAUSE_DURATION);
    });

    addTimeout(() => {
      setStatus("input");
      setMessage("Your turn! Repeat the sequence.");
      setActiveColor(null);
    }, delay + 100);
  }, [playCardFlipSound]);

  const startGame = useCallback(() => {
    clearAllTimeouts();
    const firstColor = COLORS[Math.floor(Math.random() * COLORS.length)].id;
    const newSeq = [firstColor];
    setSequence(newSeq);
    setPlayerInput([]);
    setLevel(1);
    setScore(0);
    setWrongFlash(false);
    showSequence(newSeq);
  }, [showSequence]);

  const handleColorClick = useCallback((colorId) => {
    if (status !== "input") return;

    const newInput = [...playerInput, colorId];
    const idx = newInput.length - 1;

    if (colorId !== sequence[idx]) {
      // Wrong!
      playMismatchSound();
      setWrongFlash(true);
      addTimeout(() => setWrongFlash(false), 500);
      setStatus("over");
      setMessage(`Wrong! You reached level ${level}.`);
      playGameOverSound();
      
      const finalScore = score;
      saveScoreToCloud("Color Storm", finalScore * 100);
      recordGameActivity("Color Storm", finalScore * 100);
      mergeProgressRecord({ title: "Color Storm", genre: "Memory", href: "/colorstorm" }, finalScore * 100, "direct", 2000);
      
      if (finalScore > bestScore) {
        setBestScore(finalScore);
        const uid = window.localStorage.getItem("userId") || "guest";
        window.localStorage.setItem(`colorstorm-best-${uid}`, String(finalScore));
        fireConfetti();
      }
      return;
    }

    // Correct so far
    playMatchSuccessSound();
    setPlayerInput(newInput);

    if (newInput.length === sequence.length) {
      // Completed this level!
      const nextScore = score + sequence.length;
      const nextLevel = level + 1;
      setScore(nextScore);
      setLevel(nextLevel);
      setPlayerInput([]);
      setMessage(`Level ${level} complete! +${sequence.length} pts`);

      // Add a new random color to sequence
      const nextColor = COLORS[Math.floor(Math.random() * COLORS.length)].id;
      const nextSeq = [...sequence, nextColor];
      setSequence(nextSeq);

      addTimeout(() => showSequence(nextSeq), 800);
    }
  }, [status, playerInput, sequence, level, score, bestScore, playMismatchSound, playMatchSuccessSound, playGameOverSound, fireConfetti, saveScoreToCloud, showSequence]);

  return (
    <main className="dashboard-shell" style={{ minHeight: "100vh" }}>
      <header className="dashboard-header" style={{ marginBottom: 26 }}>
        <div>
          <div className="brand-mark">
            <span className="brand-dot" style={{ background: "#eab308" }} />
            PixelPulse
          </div>
          <h1>🌈 Color Storm</h1>
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
          <span className="label">Level</span>
          <strong style={{ color: "#a78bfa" }}>{level}</strong>
        </div>
        <div className="stat-card">
          <span className="label">Score</span>
          <strong style={{ color: "#34d399" }}>{score}</strong>
        </div>
        <div className="stat-card">
          <span className="label">Best</span>
          <strong style={{ color: "#f59e0b" }}>{bestScore}</strong>
        </div>
        <div className="stat-card">
          <span className="label">State</span>
          <strong>{status === "showing" ? "Watch" : status === "input" ? "Your Turn" : status === "over" ? "Game Over" : "Ready"}</strong>
        </div>
      </div>

      <section className="panel-card" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0 }}>
              {status === "over" ? `Game Over! Score: ${score}` : "Remember the colors!"}
            </h2>
            <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>{message}</p>
          </div>
          {(status === "idle" || status === "over") && (
            <button type="button" className="primary-button" onClick={startGame}>
              {status === "over" ? "Play Again" : "Start Game"}
            </button>
          )}
        </div>

        {/* Color buttons */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
          maxWidth: 600,
          margin: "0 auto",
        }}>
          {COLORS.map((color) => {
            const isActive = activeColor === color.id;
            return (
              <button
                key={color.id}
                type="button"
                onClick={() => handleColorClick(color.id)}
                disabled={status !== "input"}
                style={{
                  height: 200,
                  borderRadius: 24,
                  border: "2px solid transparent",
                  background: isActive
                    ? color.bg
                    : wrongFlash
                    ? "rgba(239,68,68,0.15)"
                    : `${color.bg}22`,
                  boxShadow: isActive ? `0 0 60px ${color.shadow}` : "none",
                  fontSize: 72,
                  cursor: status === "input" ? "pointer" : "default",
                  transition: "all 0.15s ease",
                  transform: isActive ? "scale(1.08)" : "scale(1)",
                }}
              >
                {color.label}
              </button>
            );
          })}
        </div>

        {/* Progress dots */}
        {status === "input" && (
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 24 }}>
            {sequence.map((_, i) => (
              <div key={i} style={{
                width: 12, height: 12, borderRadius: "50%",
                background: i < playerInput.length ? "#34d399" : "rgba(255,255,255,0.15)",
                transition: "background 0.2s",
              }} />
            ))}
          </div>
        )}

        {status === "idle" && (
          <div style={{ textAlign: "center", marginTop: 32, color: "rgba(255,255,255,0.3)", fontSize: 48 }}>🌈</div>
        )}
      </section>

      <Leaderboard gameName="Color Storm" />
    </main>
  );
}
