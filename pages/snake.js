import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import BackButton from "../components/BackButton";
import { mergeProgressRecord } from "../lib/playerProgress";

const GRID_SIZE = 18;
const TICK_MS = 120;

function createInitialSnake() {
  return [
    { x: 8, y: 8 },
    { x: 7, y: 8 },
    { x: 6, y: 8 },
  ];
}

function randomFood(snake) {
  const occupied = new Set(snake.map(({ x, y }) => `${x},${y}`));
  const available = [];

  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const key = `${x},${y}`;
      if (!occupied.has(key)) {
        available.push({ x, y });
      }
    }
  }

  if (available.length === 0) {
    return { x: 0, y: 0 };
  }

  return available[Math.floor(Math.random() * available.length)];
}

export default function SnakePage() {
  const router = useRouter();
  const [snake, setSnake] = useState(createInitialSnake());
  const [food, setFood] = useState({ x: 12, y: 8 });
  const [direction, setDirection] = useState({ x: 1, y: 0 });
  const [queuedDirection, setQueuedDirection] = useState({ x: 1, y: 0 });
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [status, setStatus] = useState("ready");

  const tickRef = useRef(null);

  useEffect(() => {
    if (!window.localStorage.getItem("userId")) {
      router.replace("/login");
      return undefined;
    }

    const savedBest = Number(window.localStorage.getItem("snake-best") || 0);
    setBestScore(savedBest);
    setFood(randomFood(createInitialSnake()));
    return undefined;
  }, [router]);

  const resetGame = () => {
    const freshSnake = createInitialSnake();
    setSnake(freshSnake);
    setFood(randomFood(freshSnake));
    setDirection({ x: 1, y: 0 });
    setQueuedDirection({ x: 1, y: 0 });
    setScore(0);
    setStatus("ready");
  };

  useEffect(() => {
    if (status !== "playing") return undefined;

    tickRef.current = window.setInterval(() => {
      setSnake((currentSnake) => {
        const nextDirection = queuedDirection;
        const head = currentSnake[0];
        const nextHead = {
          x: head.x + nextDirection.x,
          y: head.y + nextDirection.y,
        };

        const hitsWall =
          nextHead.x < 0 ||
          nextHead.y < 0 ||
          nextHead.x >= GRID_SIZE ||
          nextHead.y >= GRID_SIZE;

        const hitsSelf = currentSnake.some((segment, index) => {
          if (index === 0) return false;
          return segment.x === nextHead.x && segment.y === nextHead.y;
        });

        if (hitsWall || hitsSelf) {
          setStatus("game-over");
          return currentSnake;
        }

        const nextSnake = [nextHead, ...currentSnake];
        const ateFood = nextHead.x === food.x && nextHead.y === food.y;

        if (!ateFood) {
          nextSnake.pop();
        } else {
          const updatedScore = score + 1;
          setScore(updatedScore);
          const updatedBest = Math.max(bestScore, updatedScore);
          setBestScore(updatedBest);
          window.localStorage.setItem("snake-best", String(updatedBest));
          mergeProgressRecord(
            { title: "Pong Arena", genre: "Arcade", href: "/pong" },
            updatedBest,
            "direct",
            20,
          );
          setFood(randomFood(nextSnake));
        }

        setDirection(nextDirection);
        return nextSnake;
      });
    }, TICK_MS);

    return () => {
      if (tickRef.current) {
        window.clearInterval(tickRef.current);
      }
    };
  }, [bestScore, food, queuedDirection, score, status]);

  useEffect(() => {
    const handler = (event) => {
      const keyMap = {
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
        w: { x: 0, y: -1 },
        s: { x: 0, y: 1 },
        a: { x: -1, y: 0 },
        d: { x: 1, y: 0 },
      };

      const next = keyMap[event.key];
      if (!next) return;

      event.preventDefault();

      if (status === "ready") {
        setStatus("playing");
      }

      setQueuedDirection((current) => {
        const isOpposite = current.x + next.x === 0 && current.y + next.y === 0;
        if (isOpposite) return current;
        return next;
      });
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [status]);

  return (
    <main className="dashboard-shell" style={{ minHeight: "100vh" }}>
      <header className="dashboard-header" style={{ marginBottom: 26 }}>
        <div>
          <div className="brand-mark">
            <span className="brand-dot" />
            PixelPulse
          </div>
          <h1>Neon Snake</h1>
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
          <span className="label">Score</span>
          <strong>{score}</strong>
        </div>
        <div className="stat-card">
          <span className="label">Best</span>
          <strong>{bestScore}</strong>
        </div>
        <div className="stat-card">
          <span className="label">State</span>
          <strong>{status === "game-over" ? "Crashed" : status === "playing" ? "Live" : "Ready"}</strong>
        </div>
        <div className="stat-card">
          <span className="label">Move</span>
          <strong>{direction.x === 1 ? "Right" : direction.x === -1 ? "Left" : direction.y === -1 ? "Up" : "Down"}</strong>
        </div>
      </div>

      <section className="panel-card" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0 }}>Guide the serpent to the glowing core.</h2>
            <p style={{ margin: "8px 0 0", color: "var(--muted)" }}>Use arrow keys or WASD to move.</p>
          </div>

          <button type="button" className="primary-button" onClick={resetGame}>
            {status === "game-over" ? "Restart" : "Reset"}
          </button>
        </div>

        <div
          style={{
            position: "relative",
            width: "min(100%, 460px)",
            aspectRatio: "1",
            margin: "0 auto",
            borderRadius: 20,
            overflow: "hidden",
            background: "linear-gradient(180deg, rgba(10,15,30,0.98), rgba(17,25,45,0.96))",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => {
            const x = index % GRID_SIZE;
            const y = Math.floor(index / GRID_SIZE);
            const isHead = snake[0] && snake[0].x === x && snake[0].y === y;
            const isBody = snake.some((segment, segmentIndex) => segmentIndex > 0 && segment.x === x && segment.y === y);
            const isFood = food.x === x && food.y === y;

            return (
              <div
                key={`${x}-${y}`}
                style={{
                  position: "absolute",
                  left: `${(x / GRID_SIZE) * 100}%`,
                  top: `${(y / GRID_SIZE) * 100}%`,
                  width: `${100 / GRID_SIZE}%`,
                  height: `${100 / GRID_SIZE}%`,
                  background: isHead
                    ? "linear-gradient(135deg, #7ef7d3, #3dd9ff)"
                    : isBody
                      ? "linear-gradient(135deg, #8b5cf6, #6d5efc)"
                      : isFood
                        ? "linear-gradient(135deg, #ff66c4, #ff9f43)"
                        : "rgba(255,255,255,0.02)",
                  borderRadius: isFood ? "50%" : 6,
                  boxShadow: isFood ? "0 0 14px rgba(255, 102, 196, 0.8)" : "none",
                }}
              />
            );
          })}
        </div>
      </section>
    </main>
  );
}
