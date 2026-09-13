import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import BackButton from "../components/BackButton";
import { createInitialPongState, stepPongState } from "../server/pongLogic";

const PADDLE_HEIGHT = 100;
const BOARD_WIDTH = 800;
const BOARD_HEIGHT = 480;

export default function PongPage() {
  const router = useRouter();
  const [state, setState] = useState(createInitialPongState());
  const [controls, setControls] = useState({ leftUp: false, leftDown: false, rightUp: false, rightDown: false });
  const gameLoopRef = useRef(null);

  useEffect(() => {
    if (!window.localStorage.getItem("userId")) {
      router.replace("/login");
      return undefined;
    }

    const handleKeyDown = (event) => {
      const key = event.key.toLowerCase();
      if (key === "w") setControls((current) => ({ ...current, leftUp: true }));
      if (key === "s") setControls((current) => ({ ...current, leftDown: true }));
      if (key === "arrowup") setControls((current) => ({ ...current, rightUp: true }));
      if (key === "arrowdown") setControls((current) => ({ ...current, rightDown: true }));
    };

    const handleKeyUp = (event) => {
      const key = event.key.toLowerCase();
      if (key === "w") setControls((current) => ({ ...current, leftUp: false }));
      if (key === "s") setControls((current) => ({ ...current, leftDown: false }));
      if (key === "arrowup") setControls((current) => ({ ...current, rightUp: false }));
      if (key === "arrowdown") setControls((current) => ({ ...current, rightDown: false }));
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [router]);

  useEffect(() => {
    gameLoopRef.current = window.setInterval(() => {
      setState((current) => stepPongState(current, controls));
    }, 16);

    return () => {
      if (gameLoopRef.current) {
        window.clearInterval(gameLoopRef.current);
      }
    };
  }, [controls]);

  const resetGame = () => setState(createInitialPongState());

  return (
    <main className="dashboard-shell" style={{ minHeight: "100vh" }}>
      <header className="dashboard-header" style={{ marginBottom: 26 }}>
        <div>
          <div className="brand-mark">
            <span className="brand-dot" />
            PixelPulse
          </div>
          <h1>Pong Arena</h1>
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
          <span className="label">Player 1</span>
          <strong>{state.leftScore}</strong>
        </div>
        <div className="stat-card">
          <span className="label">Player 2</span>
          <strong>{state.rightScore}</strong>
        </div>
        <div className="stat-card">
          <span className="label">Status</span>
          <strong>{state.winner ? `${state.winner === "left" ? "Player 1" : "Player 2"} wins` : "Live"}</strong>
        </div>
        <div className="stat-card">
          <span className="label">Controls</span>
          <strong>W / S vs ↑ / ↓</strong>
        </div>
      </div>

      <section className="panel-card" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, gap: 12, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0 }}>Arcade rivalry</h2>
            <p style={{ margin: "8px 0 0", color: "var(--muted)" }}>First to 7 points wins the match.</p>
          </div>

          <button type="button" className="primary-button" onClick={resetGame}>Reset round</button>
        </div>

        <div
          style={{
            position: "relative",
            width: "min(100%, 800px)",
            height: 480,
            margin: "0 auto",
            borderRadius: 18,
            background: "linear-gradient(180deg, rgba(12,18,34,0.95), rgba(16,26,42,0.92))",
            border: "1px solid rgba(255,255,255,0.12)",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", left: "50%", top: 0, width: 2, height: "100%", background: "rgba(255,255,255,0.18)" }} />

          <div
            style={{
              position: "absolute",
              left: 20,
              top: state.leftY,
              width: 16,
              height: PADDLE_HEIGHT,
              borderRadius: 12,
              background: "linear-gradient(180deg, #7ef7d3, #3dd9ff)",
              boxShadow: "0 0 18px rgba(61, 217, 255, 0.6)",
            }}
          />

          <div
            style={{
              position: "absolute",
              right: 20,
              top: state.rightY,
              width: 16,
              height: PADDLE_HEIGHT,
              borderRadius: 12,
              background: "linear-gradient(180deg, #ff8ecf, #ff7a59)",
              boxShadow: "0 0 18px rgba(255, 122, 89, 0.6)",
            }}
          />

          <div
            style={{
              position: "absolute",
              left: state.ballX,
              top: state.ballY,
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #f9f871, #ff9f43)",
              boxShadow: "0 0 18px rgba(249, 248, 113, 0.8)",
            }}
          />
        </div>
      </section>
    </main>
  );
}
