import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import BackButton from "../components/BackButton";
import Leaderboard from "../components/Leaderboard";
import { createInitialPongState, stepPongState } from "../server/pongLogic";
import { useGameEffects } from "../context/GameEffectsContext";
import { mergeProgressRecord } from "../lib/playerProgress";
import { recordGameActivity } from "../lib/quests";
import { usePlaytime } from "../hooks/usePlaytime";

const PADDLE_HEIGHT = 120;
const BOARD_WIDTH = 800;
const BOARD_HEIGHT = 600;

export default function PongPage() {
  usePlaytime({ title: "Pong Arena", genre: "Arcade", href: "/pong" });
  const router = useRouter();
  const { isMuted, toggleMute, playPaddleHitSound, playWallHitSound, playScoreSound, playGameOverSound, saveScoreToCloud } = useGameEffects();
  const [state, setState] = useState(createInitialPongState());
  const [controls, setControls] = useState({ leftUp: false, leftDown: false, rightUp: false, rightDown: false });
  const [gameMode, setGameMode] = useState("menu"); // "menu", "1p", "2p"
  const gameLoopRef = useRef(null);

  useEffect(() => {
    if (!window.localStorage.getItem("userId")) {
      router.replace("/login");
      return undefined;
    }

    const handleKeyDown = (event) => {
      const key = event.key.toLowerCase();
      if (["w", "s", "arrowup", "arrowdown"].includes(key)) {
        event.preventDefault();
      }
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
    if (gameMode === "menu") return;

    gameLoopRef.current = window.setInterval(() => {
      setState((current) => {
        if (current.winner) return current;
        
        let activeControls = { ...controls };
        if (gameMode === "1p") {
          const paddleCenter = current.rightY + PADDLE_HEIGHT / 2;
          if (current.ballX > 200 && current.vx > 0) {
            // AI reacts when ball is moving towards it and crosses the 200px mark
            if (current.ballY < paddleCenter - 15) {
              activeControls.rightUp = true;
              activeControls.rightDown = false;
            } else if (current.ballY > paddleCenter + 15) {
              activeControls.rightDown = true;
              activeControls.rightUp = false;
            } else {
              activeControls.rightUp = false;
              activeControls.rightDown = false;
            }
          } else if (current.vx < 0) {
            // Slowly return to center
            if (paddleCenter < 230) {
               activeControls.rightDown = true;
               activeControls.rightUp = false;
            } else if (paddleCenter > 250) {
               activeControls.rightUp = true;
               activeControls.rightDown = false;
            } else {
               activeControls.rightUp = false;
               activeControls.rightDown = false;
            }
          } else {
            activeControls.rightUp = false;
            activeControls.rightDown = false;
          }
        }
        
        const nextState = stepPongState(current, activeControls);
        
        if (nextState.leftScore > current.leftScore || nextState.rightScore > current.rightScore) {
          playScoreSound();
        } else if (Math.abs(nextState.vx) > Math.abs(current.vx)) {
          playPaddleHitSound();
        } else if (nextState.vy !== current.vy) {
          playWallHitSound();
        }
        
        if (nextState.winner && !current.winner) {
          playGameOverSound();
          if (gameMode === "1p") {
            const points = nextState.winner === "left" 
              ? 700 + (7 - nextState.rightScore) * 100 
              : nextState.leftScore * 50;
            saveScoreToCloud("Pong Arena", points);
            recordGameActivity("Pong Arena", points);
            mergeProgressRecord(
              { title: "Pong Arena", genre: "Arcade", href: "/pong" },
              points,
              "direct",
              1400,
            );
          }
        }
        
        return nextState;
      });
    }, 16);

    return () => {
      if (gameLoopRef.current) {
        window.clearInterval(gameLoopRef.current);
      }
    };
  }, [controls, gameMode, playScoreSound, playPaddleHitSound, playWallHitSound, playGameOverSound, saveScoreToCloud]);

  const resetGame = (mode) => {
    if (mode) setGameMode(mode);
    setState(createInitialPongState());
  };

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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" style={{ marginBottom: 20 }}>
        <div className="stat-card p-3 sm:p-5">
          <span className="label">Player 1</span>
          <strong>{state.leftScore}</strong>
        </div>
        <div className="stat-card p-3 sm:p-5">
          <span className="label">{gameMode === "1p" ? "AI (Bot)" : "Player 2"}</span>
          <strong>{state.rightScore}</strong>
        </div>
        <div className="stat-card p-3 sm:p-5">
          <span className="label">Status</span>
          <strong>{state.winner ? `${state.winner === "left" ? "Player 1" : gameMode === "1p" ? "AI" : "Player 2"} wins` : gameMode === "menu" ? "Menu" : "Live"}</strong>
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

          <div style={{ display: "flex", gap: 12 }}>
            <button type="button" className="primary-button" onClick={() => resetGame("1p")}>1P vs AI</button>
            <button type="button" className="ghost-button" style={{ border: '1px solid var(--border-color)' }} onClick={() => resetGame("2p")}>2 Players</button>
            {gameMode !== "menu" && (
              <button type="button" className="ghost-button" onClick={() => resetGame()}>Reset round</button>
            )}
          </div>
        </div>

        <div
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "800 / 600",
            maxWidth: 800,
            margin: "0 auto",
            borderRadius: 18,
            background: "linear-gradient(180deg, rgba(12,18,34,0.95), rgba(16,26,42,0.92))",
            border: "1px solid rgba(255,255,255,0.12)",
            overflow: "hidden",
          }}
        >
          {gameMode === "menu" ? (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", padding: 20, textAlign: "center" }}>
              <h2 style={{ fontSize: "clamp(1.5rem, 4vw, 2rem)", marginBottom: 24, color: "#fff" }}>Select Game Mode</h2>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
                <button type="button" className="primary-button" style={{ fontSize: "1.1rem", padding: "12px 24px" }} onClick={() => resetGame("1p")}>Play vs AI</button>
                <button type="button" className="ghost-button" style={{ fontSize: "1.1rem", padding: "12px 24px", border: '1px solid var(--border-color)' }} onClick={() => resetGame("2p")}>2 Players (Local)</button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ position: "absolute", left: "50%", top: 0, width: 2, height: "100%", background: "rgba(255,255,255,0.18)" }} />

              <div
                style={{
                  position: "absolute",
                  left: "2.5%",
                  top: `${(state.leftY / 600) * 100}%`,
                  width: "2%",
                  height: "20%",
                  borderRadius: 12,
                  background: "linear-gradient(180deg, #7ef7d3, #3dd9ff)",
                  boxShadow: "0 0 18px rgba(61, 217, 255, 0.6)",
                }}
              />

              <div
                style={{
                  position: "absolute",
                  right: "2.5%",
                  top: `${(state.rightY / 600) * 100}%`,
                  width: "2%",
                  height: "20%",
                  borderRadius: 12,
                  background: gameMode === "1p" ? "linear-gradient(180deg, #ff4d4d, #c62828)" : "linear-gradient(180deg, #ff8ecf, #ff7a59)",
                  boxShadow: gameMode === "1p" ? "0 0 18px rgba(255, 77, 77, 0.6)" : "0 0 18px rgba(255, 122, 89, 0.6)",
                }}
              />

              <div
                style={{
                  position: "absolute",
                  left: `${(state.ballX / 800) * 100}%`,
                  top: `${(state.ballY / 600) * 100}%`,
                  width: "2.25%",
                  height: "3%",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #f9f871, #ff9f43)",
                  boxShadow: "0 0 18px rgba(249, 248, 113, 0.8)",
                }}
              />
            </>
          )}
        </div>

        {/* Mobile Controls */}
        {gameMode !== "menu" && (
          <div className="md:hidden flex justify-between mt-6 px-2">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-[var(--muted)] text-center uppercase tracking-wider mb-1">Player 1</span>
              <div className="flex gap-3">
                <button className="bg-[rgba(255,255,255,0.08)] border border-[var(--border)] active:bg-[rgba(61,217,255,0.2)] text-2xl rounded-xl p-4 shadow-lg w-16 h-16 flex items-center justify-center select-none touch-manipulation" onTouchStart={() => setControls(c => ({...c, leftUp: true}))} onTouchEnd={() => setControls(c => ({...c, leftUp: false}))}>↑</button>
                <button className="bg-[rgba(255,255,255,0.08)] border border-[var(--border)] active:bg-[rgba(61,217,255,0.2)] text-2xl rounded-xl p-4 shadow-lg w-16 h-16 flex items-center justify-center select-none touch-manipulation" onTouchStart={() => setControls(c => ({...c, leftDown: true}))} onTouchEnd={() => setControls(c => ({...c, leftDown: false}))}>↓</button>
              </div>
            </div>
            
            {gameMode === "2p" && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-[var(--muted)] text-center uppercase tracking-wider mb-1">Player 2</span>
                <div className="flex gap-3">
                  <button className="bg-[rgba(255,255,255,0.08)] border border-[var(--border)] active:bg-[rgba(255,122,89,0.2)] text-2xl rounded-xl p-4 shadow-lg w-16 h-16 flex items-center justify-center select-none touch-manipulation" onTouchStart={() => setControls(c => ({...c, rightUp: true}))} onTouchEnd={() => setControls(c => ({...c, rightUp: false}))}>↑</button>
                  <button className="bg-[rgba(255,255,255,0.08)] border border-[var(--border)] active:bg-[rgba(255,122,89,0.2)] text-2xl rounded-xl p-4 shadow-lg w-16 h-16 flex items-center justify-center select-none touch-manipulation" onTouchStart={() => setControls(c => ({...c, rightDown: true}))} onTouchEnd={() => setControls(c => ({...c, rightDown: false}))}>↓</button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
      
      <Leaderboard gameName="Pong Arena" />
    </main>
  );
}
