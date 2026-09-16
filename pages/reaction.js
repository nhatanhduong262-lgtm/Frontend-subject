import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import BackButton from "../components/BackButton";
import Leaderboard from "../components/Leaderboard";
import { mergeProgressRecord } from "../lib/playerProgress";
import { recordGameActivity } from "../lib/quests";
import { useGameEffects } from "../context/GameEffectsContext";
import { usePlaytime } from "../hooks/usePlaytime";

export default function ReactionPage() {
  usePlaytime({ title: "Pulse Reflex", genre: "Speed", href: "/reaction" });
  const router = useRouter();
  const { isMuted, toggleMute, playAlertSound, playErrorSound, playScoreSound, fireConfetti, saveScoreToCloud } = useGameEffects();
  const [status, setStatus] = useState("idle"); // idle | waiting | ready | over
  const [message, setMessage] = useState("Tap start and wait for green.");
  const [reactionTime, setReactionTime] = useState(0);
  const [bestTime, setBestTime] = useState(0);
  const [averageTime, setAverageTime] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [score, setScore] = useState(0);
  const [timeWindow, setTimeWindow] = useState(1000);

  const timeoutRef = useRef(null);
  const windowTimerRef = useRef(null);
  const startedAtRef = useRef(0);

  useEffect(() => {
    if (!window.localStorage.getItem("userId")) {
      router.replace("/login");
      return undefined;
    }

    const uid = window.localStorage.getItem("userId") || "guest";
    const savedBest = Number(window.localStorage.getItem(`reaction-best-${uid}`) || 0);
    setBestTime(savedBest);
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      if (windowTimerRef.current) window.clearTimeout(windowTimerRef.current);
    };
  }, [router]);

  const clearTimer = () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    if (windowTimerRef.current) window.clearTimeout(windowTimerRef.current);
    timeoutRef.current = null;
    windowTimerRef.current = null;
  };

  const startGame = () => {
    setRounds(0);
    setScore(0);
    setReactionTime(0);
    setAverageTime(0);
    setTimeWindow(1000);
    startRound(1000);
  };

  const startRound = (windowMs, prevReaction = null) => {
    clearTimer();
    setStatus("waiting");
    if (prevReaction) {
      setMessage(`Reaction: ${prevReaction}ms! Next window: ${Math.round(windowMs)}ms. Wait for green...`);
    } else {
      setMessage("Wait for green...");
    }

    const delay = 1200 + Math.random() * 2200;

    timeoutRef.current = window.setTimeout(() => {
      setStatus("ready");
      setMessage(`NOW! You have ${Math.round(windowMs)}ms!`);
      playAlertSound();
      startedAtRef.current = Date.now();

      windowTimerRef.current = window.setTimeout(() => {
        setStatus("over");
        setMessage(`Too slow! Window was ${Math.round(windowMs)}ms.`);
        playErrorSound();
      }, windowMs);
    }, delay);
  };

  useEffect(() => {
    if (status === "over" && score > 0) {
      const finalScore = score * 50 + Math.max(0, 500 - averageTime);
      saveScoreToCloud("Pulse Reflex", finalScore);
      recordGameActivity("Pulse Reflex", finalScore);
      mergeProgressRecord(
        { title: "Pulse Reflex", genre: "Speed", href: "/reaction" },
        finalScore,
        "direct",
        1000,
      );
    }
  }, [status, score, averageTime, saveScoreToCloud]);

  const handlePress = () => {
    if (status === "waiting") {
      clearTimer();
      playErrorSound();
      setStatus("over");
      setMessage("False start! You clicked too early.");
      return;
    }

    if (status === "ready") {
      clearTimer();
      const elapsed = Date.now() - startedAtRef.current;
      const safeTime = Math.max(elapsed, 0);
      
      playScoreSound();
      if (bestTime === 0 || safeTime < bestTime) {
        fireConfetti();
        const uid = window.localStorage.getItem("userId") || "guest";
        window.localStorage.setItem(`reaction-best-${uid}`, String(safeTime));
        setBestTime(safeTime);
      }
      
      const nextWindow = Math.max(150, timeWindow * 0.92);
      setTimeWindow(nextWindow);
      
      const nextScore = score + 1;
      const nextRounds = rounds + 1;
      const nextAverage = Math.round(((averageTime * rounds) + safeTime) / nextRounds);

      setReactionTime(safeTime);
      setAverageTime(nextAverage);
      setRounds(nextRounds);
      setScore(nextScore);
      
      startRound(nextWindow, safeTime);
      return;
    }

    if (status === "idle" || status === "over") {
      if (status === "over" || rounds === 0) {
        startGame();
      } else {
        startRound(timeWindow);
      }
    }
  };

  return (
    <main className="dashboard-shell" style={{ minHeight: "100vh" }}>
      <header className="dashboard-header" style={{ marginBottom: 26 }}>
        <div>
          <div className="brand-mark">
            <span className="brand-dot" />
            PixelPulse
          </div>
          <h1>Pulse Reflex</h1>
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
          <span className="label">Best</span>
          <strong>{bestTime ? `${bestTime} ms` : "—"}</strong>
        </div>
        <div className="stat-card">
          <span className="label">Average</span>
          <strong>{averageTime ? `${averageTime} ms` : "—"}</strong>
        </div>
        <div className="stat-card">
          <span className="label">Score</span>
          <strong>{score}</strong>
        </div>
        <div className="stat-card">
          <span className="label">State</span>
          <strong>{status === "ready" ? "Go" : status === "waiting" ? "Hold" : status === "over" ? "Game Over" : "Ready"}</strong>
        </div>
      </div>

      <section className="panel-card" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0 }}>Click or tap the arena when it turns green.</h2>
            <p style={{ margin: "8px 0 0", color: "var(--muted)" }}>{message}</p>
          </div>

          <button type="button" className="primary-button" onClick={status === "idle" || status === "over" ? handlePress : handlePress}>
            {status === "idle" ? "Start run" : status === "over" ? "Try again" : status === "waiting" ? "Too soon" : "Click now"}
          </button>
        </div>

        <button
          type="button"
          onClick={handlePress}
          onTouchStart={(e) => { e.preventDefault(); handlePress(); }}
          style={{
            width: "100%",
            minHeight: 400,
            borderRadius: 24,
            border: "1px solid rgba(255,255,255,0.12)",
            background:
              status === "ready"
                ? "linear-gradient(135deg, rgba(38, 204, 123, 0.9), rgba(20, 174, 126, 0.92))"
                : status === "over"
                  ? "linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(185, 28, 28, 0.2))"
                  : status === "waiting"
                    ? "linear-gradient(135deg, rgba(255, 201, 77, 0.2), rgba(255, 102, 196, 0.16))"
                    : "linear-gradient(135deg, rgba(17, 28, 52, 0.98), rgba(25, 40, 71, 0.96))",
            color: "#fff",
            fontSize: "clamp(3rem, 6vw, 4rem)",
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            boxShadow: "0 22px 42px rgba(62, 94, 255, 0.24)",
            cursor: "pointer",
          }}
        >
          {status === "ready" ? "CLICK!" : status === "over" ? "GAME OVER" : status === "waiting" ? "WAIT" : "READY"}
        </button>

        <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between", gap: 12, color: "var(--muted)", flexWrap: "wrap" }}>
          <span>Last result: {reactionTime ? `${reactionTime} ms` : "—"}</span>
          <span>Rounds: {rounds}</span>
        </div>
      </section>
      
      <Leaderboard gameName="Pulse Reflex" />
    </main>
  );
}
