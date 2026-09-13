import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import BackButton from "../components/BackButton";
import { mergeProgressRecord } from "../lib/playerProgress";

export default function ReactionPage() {
  const router = useRouter();
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("Tap start and wait for green.");
  const [reactionTime, setReactionTime] = useState(0);
  const [bestTime, setBestTime] = useState(0);
  const [averageTime, setAverageTime] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [score, setScore] = useState(0);

  const timeoutRef = useRef(null);
  const startedAtRef = useRef(0);

  useEffect(() => {
    if (!window.localStorage.getItem("userId")) {
      router.replace("/login");
      return undefined;
    }

    const savedBest = Number(window.localStorage.getItem("reaction-best") || 0);
    setBestTime(savedBest);
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [router]);

  const clearTimer = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const startRound = () => {
    clearTimer();
    setStatus("waiting");
    setMessage("Wait for green...");
    setReactionTime(0);

    const delay = 1200 + Math.random() * 2200;
    startedAtRef.current = Date.now();

    timeoutRef.current = window.setTimeout(() => {
      setStatus("ready");
      setMessage("NOW! Click instantly.");
      startedAtRef.current = Date.now();
    }, delay);
  };

  const handlePress = () => {
    if (status === "waiting") {
      clearTimer();
      setStatus("idle");
      setMessage("Too soon. Start again.");
      return;
    }

    if (status === "ready") {
      const elapsed = Date.now() - startedAtRef.current;
      const safeTime = Math.max(elapsed, 0);
      const nextBest = bestTime === 0 ? safeTime : Math.min(bestTime, safeTime);
      const nextScore = score + 1;
      const nextRounds = rounds + 1;
      const nextAverage = Math.round(
        ((averageTime * rounds) + safeTime) / nextRounds,
      );

      setReactionTime(safeTime);
      setBestTime(nextBest);
      setAverageTime(nextAverage);
      setRounds(nextRounds);
      setScore(nextScore);
      setStatus("idle");
      setMessage(`Reaction: ${safeTime} ms`);
      window.localStorage.setItem("reaction-best", String(nextBest));
      mergeProgressRecord(
        { title: "Pulse Reflex", genre: "Speed", href: "/reaction" },
        nextBest,
        "inverse",
        700,
      );
      return;
    }

    if (status === "idle") {
      startRound();
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
          <strong>{status === "ready" ? "Go" : status === "waiting" ? "Hold" : "Ready"}</strong>
        </div>
      </div>

      <section className="panel-card" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0 }}>Click the arena when it turns green.</h2>
            <p style={{ margin: "8px 0 0", color: "var(--muted)" }}>{message}</p>
          </div>

          <button type="button" className="primary-button" onClick={status === "idle" ? startRound : handlePress}>
            {status === "idle" ? "Start run" : status === "waiting" ? "Too soon" : "Click now"}
          </button>
        </div>

        <button
          type="button"
          onClick={handlePress}
          style={{
            width: "100%",
            minHeight: 220,
            borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.12)",
            background:
              status === "ready"
                ? "linear-gradient(135deg, rgba(38, 204, 123, 0.9), rgba(20, 174, 126, 0.92))"
                : status === "waiting"
                  ? "linear-gradient(135deg, rgba(255, 201, 77, 0.2), rgba(255, 102, 196, 0.16))"
                  : "linear-gradient(135deg, rgba(17, 28, 52, 0.98), rgba(25, 40, 71, 0.96))",
            color: "#fff",
            fontSize: "clamp(1.3rem, 2vw, 1.8rem)",
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            boxShadow: "0 22px 42px rgba(62, 94, 255, 0.24)",
            cursor: "pointer",
          }}
        >
          {status === "ready" ? "CLICK!" : status === "waiting" ? "WAIT" : "READY"}
        </button>

        <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between", gap: 12, color: "var(--muted)", flexWrap: "wrap" }}>
          <span>Last result: {reactionTime ? `${reactionTime} ms` : "—"}</span>
          <span>Rounds: {rounds}</span>
        </div>
      </section>
    </main>
  );
}
