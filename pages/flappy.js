import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import BackButton from "../components/BackButton";

const GAME_WIDTH = 420;
const GAME_HEIGHT = 560;
const FLOOR_HEIGHT = 76;
const GRAVITY = 0.42;
const FLAP_STRENGTH = -7.2;
const PIPE_WIDTH = 68;
const PIPE_GAP = 170;
const PIPE_SPEED = 2.2;

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function createPipe() {
  const gapTop = randomBetween(100, GAME_HEIGHT - FLOOR_HEIGHT - PIPE_GAP - 110);
  return {
    x: GAME_WIDTH + 30,
    width: PIPE_WIDTH,
    gapTop,
    gapHeight: PIPE_GAP,
    passed: false,
  };
}

export default function FlappyPage() {
  const router = useRouter();
  const [gameState, setGameState] = useState("ready");
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [birdY, setBirdY] = useState(GAME_HEIGHT / 2 - 40);
  const [pipes, setPipes] = useState([]);

  const birdRef = useRef({ x: 100, y: GAME_HEIGHT / 2 - 40, velocity: 0 });
  const pipesRef = useRef([]);
  const scoreRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!window.localStorage.getItem("userId")) {
      router.replace("/login");
      return undefined;
    }

    const savedBest = Number(window.localStorage.getItem("flappy-best") || 0);
    setBestScore(savedBest);
    return undefined;
  }, [router]);

  const endGame = useCallback(() => {
    setGameState("over");
    const updatedBest = Math.max(bestScore, scoreRef.current);
    setBestScore(updatedBest);
    window.localStorage.setItem("flappy-best", String(updatedBest));
  }, [bestScore]);

  const resetGame = useCallback(() => {
    birdRef.current = { x: 100, y: GAME_HEIGHT / 2 - 40, velocity: 0 };
    pipesRef.current = [];
    scoreRef.current = 0;
    setBirdY(birdRef.current.y);
    setPipes([]);
    setScore(0);
    setGameState("ready");
  }, []);

  const flap = useCallback(() => {
    if (gameState === "over") {
      resetGame();
      setGameState("playing");
    }

    if (gameState === "ready") {
      setGameState("playing");
    }

    birdRef.current.velocity = FLAP_STRENGTH;
  }, [gameState, resetGame]);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.code === "Space" || event.code === "ArrowUp") {
        event.preventDefault();
        flap();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [flap]);

  useEffect(() => {
    if (gameState !== "playing") return undefined;

    const tick = () => {
      const bird = birdRef.current;
      const nextPipes = pipesRef.current.map((pipe) => ({ ...pipe, x: pipe.x - PIPE_SPEED }));

      bird.velocity += GRAVITY;
      bird.y += bird.velocity;

      if (nextPipes.length === 0 || nextPipes[nextPipes.length - 1].x < GAME_WIDTH - 180) {
        nextPipes.push(createPipe());
      }

      for (const pipe of nextPipes) {
        if (!pipe.passed && pipe.x + pipe.width < bird.x) {
          pipe.passed = true;
          scoreRef.current += 1;
          setScore(scoreRef.current);
        }
      }

      const hitFloor = bird.y + 18 >= GAME_HEIGHT - FLOOR_HEIGHT;
      const hitCeiling = bird.y - 18 <= 0;
      const hitPipe = nextPipes.some((pipe) => {
        const birdLeft = bird.x - 16;
        const birdRight = bird.x + 16;
        const birdTop = bird.y - 16;
        const birdBottom = bird.y + 16;
        const pipeLeft = pipe.x;
        const pipeRight = pipe.x + pipe.width;
        const overlapsX = birdRight > pipeLeft && birdLeft < pipeRight;
        const hitsTopGap = birdTop < pipe.gapTop && overlapsX;
        const hitsBottomGap = birdBottom > pipe.gapTop + pipe.gapHeight && overlapsX;
        return hitsTopGap || hitsBottomGap;
      });

      if (hitFloor || hitCeiling || hitPipe) {
        endGame();
        return;
      }

      pipesRef.current = nextPipes.filter((pipe) => pipe.x + pipe.width > -10);
      setPipes(pipesRef.current);
      setBirdY(bird.y);
      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, [endGame, gameState]);

  return (
    <main className="dashboard-shell" style={{ minHeight: "100vh" }}>
      <header className="dashboard-header" style={{ marginBottom: 26 }}>
        <div>
          <div className="brand-mark">
            <span className="brand-dot" />
            PixelPulse
          </div>
          <h1>Sky Hopper</h1>
        </div>

        <div className="dashboard-actions">
          <BackButton label="← Back" fallback="/games" />
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
          <span className="label">Score</span>
          <strong>{score}</strong>
        </div>
        <div className="stat-card">
          <span className="label">Best</span>
          <strong>{bestScore}</strong>
        </div>
        <div className="stat-card">
          <span className="label">State</span>
          <strong>{gameState === "playing" ? "Live" : gameState === "over" ? "Game over" : "Ready"}</strong>
        </div>
        <div className="stat-card">
          <span className="label">Controls</span>
          <strong>Space</strong>
        </div>
      </div>

      <section className="panel-card" style={{ display: "grid", placeItems: "center" }}>
        <div
          role="button"
          tabIndex={0}
          onClick={flap}
          onKeyDown={(event) => {
            if (event.key === " " || event.key === "Enter") {
              flap();
            }
          }}
          style={{
            position: "relative",
            width: GAME_WIDTH,
            maxWidth: "100%",
            height: GAME_HEIGHT,
            overflow: "hidden",
            borderRadius: 24,
            background: "linear-gradient(180deg, #121a36 0%, #1d2f6f 35%, #14213d 100%)",
            border: "1px solid rgba(255,255,255,0.15)",
            boxShadow: "0 24px 70px rgba(76, 93, 208, 0.35)",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
              opacity: 0.35,
            }}
          />

          {pipes.map((pipe, index) => (
            <div key={`${pipe.x}-${index}`}>
              <div
                style={{
                  position: "absolute",
                  left: pipe.x,
                  top: 0,
                  width: pipe.width,
                  height: pipe.gapTop,
                  background: "linear-gradient(180deg, #7ef7d3 0%, #1ae1a2 100%)",
                  border: "3px solid rgba(18, 57, 44, 0.7)",
                  borderLeftWidth: 4,
                  borderRightWidth: 4,
                  borderTopWidth: 0,
                  borderBottomWidth: 0,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: pipe.x,
                  top: pipe.gapTop + pipe.gapHeight,
                  width: pipe.width,
                  height: GAME_HEIGHT - FLOOR_HEIGHT - (pipe.gapTop + pipe.gapHeight),
                  background: "linear-gradient(180deg, #7ef7d3 0%, #1ae1a2 100%)",
                  border: "3px solid rgba(18, 57, 44, 0.7)",
                  borderLeftWidth: 4,
                  borderRightWidth: 4,
                  borderBottomWidth: 0,
                  borderTopWidth: 0,
                }}
              />
            </div>
          ))}

          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: FLOOR_HEIGHT,
              height: 12,
              background: "linear-gradient(90deg, rgba(255,255,255,0.28), rgba(255,255,255,0.12), rgba(255,255,255,0.28))",
            }}
          />

          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: FLOOR_HEIGHT,
              background: "linear-gradient(180deg, rgba(12, 17, 30, 0.1), rgba(11, 15, 30, 0.85))",
              borderTop: "1px solid rgba(255,255,255,0.08)",
            }}
          />

          <div
            style={{
              position: "absolute",
              left: 100,
              top: birdY,
              width: 32,
              height: 32,
              borderRadius: "50% 50% 48% 48%",
              background: "linear-gradient(135deg, #ffd166 0%, #ff7b54 100%)",
              boxShadow: "0 0 20px rgba(255, 123, 84, 0.6)",
              transform: "rotate(10deg)",
            }}
          />

          {gameState !== "playing" && (
            <div
              style={{
                position: "absolute",
                inset: "auto 20px 20px 20px",
                display: "grid",
                placeItems: "center",
                gap: 8,
                padding: 18,
                borderRadius: 18,
                background: "rgba(11, 17, 32, 0.72)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#edf4ff",
                textAlign: "center",
              }}
            >
              <strong style={{ fontSize: 28, letterSpacing: "-0.05em" }}>
                {gameState === "over" ? "Game over" : "Ready to fly?"}
              </strong>
              <button type="button" className="primary-button" onClick={flap}>
                {gameState === "over" ? "Play again" : "Start game"}
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
