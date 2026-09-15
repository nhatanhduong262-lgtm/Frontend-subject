import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import BackButton from "../components/BackButton";
import Leaderboard from "../components/Leaderboard";
import { mergeProgressRecord } from "../lib/playerProgress";
import { recordGameActivity } from "../lib/quests";
import { useGameEffects } from "../context/GameEffectsContext";
import { usePlaytime } from "../hooks/usePlaytime";

const W = 800;
const H = 600;
const PADDLE_W = 120;
const PADDLE_H = 16;
const PADDLE_Y = H - 40;
const BALL_R = 10;
const BRICK_ROWS = 5;
const BRICK_COLS = 10;
const BRICK_W = 70;
const BRICK_H = 24;
const BRICK_PAD = 6;
const BRICK_OFFSET_X = (W - (BRICK_COLS * (BRICK_W + BRICK_PAD) - BRICK_PAD)) / 2;
const BRICK_OFFSET_Y = 60;
const BALL_SPEED_INIT = 7;

const ROW_COLORS = [
  { fill: "#ef4444", glow: "rgba(239,68,68,0.8)", hp: 3 },
  { fill: "#f59e0b", glow: "rgba(245,158,11,0.8)", hp: 2 },
  { fill: "#10b981", glow: "rgba(16,185,129,0.8)", hp: 2 },
  { fill: "#3dd9ff", glow: "rgba(61,217,255,0.8)", hp: 1 },
  { fill: "#8b5cf6", glow: "rgba(139,92,246,0.8)", hp: 1 },
];

function makeBricks() {
  const bricks = [];
  for (let r = 0; r < BRICK_ROWS; r++) {
    for (let c = 0; c < BRICK_COLS; c++) {
      const cfg = ROW_COLORS[r];
      bricks.push({
        x: BRICK_OFFSET_X + c * (BRICK_W + BRICK_PAD),
        y: BRICK_OFFSET_Y + r * (BRICK_H + BRICK_PAD),
        w: BRICK_W, h: BRICK_H,
        hp: cfg.hp, maxHp: cfg.hp,
        fill: cfg.fill, glow: cfg.glow,
        alive: true,
      });
    }
  }
  return bricks;
}

export default function BrickBlasterPage() {
  usePlaytime({ title: "Brick Blaster", genre: "Arcade", href: "/brickblaster" });
  const router = useRouter();
  const { isMuted, toggleMute, playCardFlipSound, playMatchSuccessSound, playGameOverSound, fireConfetti, saveScoreToCloud } = useGameEffects();

  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const animRef = useRef(null);
  const mouseXRef = useRef(W / 2);

  const [uiStatus, setUiStatus] = useState("idle");   // idle | playing | over | win
  const [displayScore, setDisplayScore] = useState(0);
  const [displayLives, setDisplayLives] = useState(3);
  const [bestScore, setBestScore] = useState(0);
  const [displayLevel, setDisplayLevel] = useState(1);

  useEffect(() => {
    if (!window.localStorage.getItem("userId")) router.replace("/login");
    const uid = window.localStorage.getItem("userId") || "guest";
    setBestScore(Number(window.localStorage.getItem(`brickblaster-best-${uid}`) || 0));
  }, [router]);

  const initState = useCallback((level = 1) => {
    const speed = BALL_SPEED_INIT + (level - 1) * 0.4;
    const angle = -Math.PI / 4 - Math.random() * Math.PI / 4; // ~45° upward
    stateRef.current = {
      status: "playing",
      paddle: { x: W / 2 - PADDLE_W / 2, w: Math.max(50, PADDLE_W - (level - 1) * 5) },
      ball: { x: W / 2, y: PADDLE_Y - BALL_R - 2, vx: speed * Math.cos(angle), vy: speed * Math.sin(angle) },
      bricks: makeBricks(),
      score: stateRef.current?.score || 0,
      lives: stateRef.current?.lives ?? 3,
      level,
      particles: [],
      combo: 0,
      launched: false,
    };
    setDisplayLevel(level);
  }, []);

  const startGame = useCallback(() => {
    stateRef.current = null;
    initState(1);
    stateRef.current.score = 0;
    stateRef.current.lives = 3;
    setDisplayScore(0);
    setDisplayLives(3);
    setUiStatus("playing");
  }, [initState]);

  // Mouse / touch control
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = W / rect.width;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      mouseXRef.current = (clientX - rect.left) * scaleX;
    };
    const onTap = () => {
      const s = stateRef.current;
      if (!s) return;
      if (s.status === "playing" && !s.launched) s.launched = true;
    };
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("touchmove", onMove, { passive: true });
    canvas.addEventListener("click", onTap);
    canvas.addEventListener("touchstart", onTap, { passive: true });
    return () => {
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("touchmove", onMove);
      canvas.removeEventListener("click", onTap);
      canvas.removeEventListener("touchstart", onTap);
    };
  }, []);

  // Key control
  useEffect(() => {
    let leftDown = false, rightDown = false;
    const onKeyDown = (e) => {
      if (e.key === "ArrowLeft"  || e.key === "a") leftDown = true;
      if (e.key === "ArrowRight" || e.key === "d") rightDown = true;
      if (e.key === " ") {
        e.preventDefault();
        const s = stateRef.current;
        if (!s) return;
        if (s.status === "idle" || s.status === "over" || s.status === "win") startGame();
        else if (!s.launched) s.launched = true;
      }
    };
    const onKeyUp = (e) => {
      if (e.key === "ArrowLeft"  || e.key === "a") leftDown = false;
      if (e.key === "ArrowRight" || e.key === "d") rightDown = false;
    };
    const keyInterval = setInterval(() => {
      if (!stateRef.current) return;
      const speed = 7;
      if (leftDown)  mouseXRef.current = Math.max(0, mouseXRef.current - speed);
      if (rightDown) mouseXRef.current = Math.min(W, mouseXRef.current + speed);
    }, 16);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      clearInterval(keyInterval);
    };
  }, [startGame]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const drawBg = () => {
      ctx.fillStyle = "#050816";
      ctx.fillRect(0, 0, W, H);
      // Grid
      ctx.strokeStyle = "rgba(255,255,255,0.025)";
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 32) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
      for (let y = 0; y < H; y += 32) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
    };

    const drawBricks = (bricks) => {
      bricks.forEach(b => {
        if (!b.alive) return;
        const alpha = 0.5 + 0.5 * (b.hp / b.maxHp);
        ctx.save();
        ctx.shadowColor = b.glow;
        ctx.shadowBlur = 10;
        const g = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
        g.addColorStop(0, b.fill + "ff");
        g.addColorStop(1, b.fill + "88");
        ctx.fillStyle = g;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.roundRect(b.x, b.y, b.w, b.h, 5);
        ctx.fill();
        ctx.globalAlpha = 1;
        // Shine
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.fillRect(b.x + 4, b.y + 3, b.w - 8, 3);
        ctx.restore();
        // HP pips
        if (b.maxHp > 1) {
          for (let i = 0; i < b.hp; i++) {
            ctx.fillStyle = "rgba(255,255,255,0.7)";
            ctx.beginPath();
            ctx.arc(b.x + b.w / 2 - (b.hp - 1) * 5 + i * 10, b.y + b.h / 2, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });
    };

    const drawPaddle = (paddle) => {
      ctx.save();
      ctx.shadowColor = "rgba(61,217,255,0.8)";
      ctx.shadowBlur = 18;
      const g = ctx.createLinearGradient(paddle.x, PADDLE_Y, paddle.x + paddle.w, PADDLE_Y);
      g.addColorStop(0, "#8b5cf6");
      g.addColorStop(0.5, "#3dd9ff");
      g.addColorStop(1, "#8b5cf6");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(paddle.x, PADDLE_Y, paddle.w, PADDLE_H, PADDLE_H / 2);
      ctx.fill();
      ctx.restore();
    };

    const drawBall = (ball) => {
      ctx.save();
      ctx.shadowColor = "rgba(251,191,36,0.9)";
      ctx.shadowBlur = 20;
      const g = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 1, ball.x, ball.y, BALL_R);
      g.addColorStop(0, "#fff");
      g.addColorStop(0.5, "#fbbf24");
      g.addColorStop(1, "#f59e0b");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const drawParticles = (particles) => {
      particles.forEach(p => {
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    };

    const drawHUD = (s) => {
      // Lives
      for (let i = 0; i < s.lives; i++) {
        ctx.fillStyle = "#ef4444";
        ctx.shadowColor = "#ef4444";
        ctx.shadowBlur = 8;
        ctx.font = "14px sans-serif";
        ctx.fillText("❤", 10 + i * 20, 24);
      }
      ctx.shadowBlur = 0;
      // Level
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(W / 2 - 40, 6, 80, 22);
      ctx.fillStyle = "#3dd9ff";
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`LVL ${s.level}`, W / 2, 21);
      ctx.textAlign = "left";
      // Score
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(W - 110, 6, 104, 22);
      ctx.fillStyle = "#f59e0b";
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "right";
      ctx.fillText(`${s.score} pts`, W - 10, 21);
      ctx.textAlign = "left";
    };

    const drawOverlay = (s) => {
      ctx.fillStyle = "rgba(5,8,22,0.88)";
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = "center";
      if (s.status === "over") {
        ctx.fillStyle = "#ef4444";
        ctx.font = "bold 38px monospace";
        ctx.fillText("GAME OVER", W / 2, H / 2 - 56);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 22px monospace";
        ctx.fillText(`Score: ${s.score}`, W / 2, H / 2 - 16);
        ctx.fillStyle = "#f59e0b";
        ctx.font = "15px monospace";
        ctx.fillText("SPACE / Click to retry", W / 2, H / 2 + 26);
      } else if (s.status === "win") {
        ctx.fillStyle = "#f59e0b";
        ctx.font = "bold 34px monospace";
        ctx.fillText("LEVEL CLEAR! 🎉", W / 2, H / 2 - 50);
        ctx.fillStyle = "#10b981";
        ctx.font = "bold 20px monospace";
        ctx.fillText(`+Bonus ${s.level * 50}`, W / 2, H / 2 - 12);
        ctx.fillStyle = "#fff";
        ctx.font = "15px monospace";
        ctx.fillText("SPACE / Click for next level", W / 2, H / 2 + 26);
      } else if (s.status === "idle") {
        ctx.fillStyle = "#3dd9ff";
        ctx.font = "bold 32px monospace";
        ctx.fillText("BRICK BLASTER", W / 2, H / 2 - 44);
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.font = "14px monospace";
        ctx.fillText("Move mouse / Arrow keys to aim paddle", W / 2, H / 2);
        ctx.fillStyle = "#8b5cf6";
        ctx.font = "bold 16px monospace";
        ctx.fillText("[ SPACE or Click to Start ]", W / 2, H / 2 + 36);
      }
      ctx.textAlign = "left";
    };

    const update = () => {
      const s = stateRef.current;
      if (!s || s.status !== "playing") return;

      // Paddle follow mouse
      const targetX = mouseXRef.current - s.paddle.w / 2;
      s.paddle.x += (targetX - s.paddle.x) * 0.25;
      s.paddle.x = Math.max(0, Math.min(W - s.paddle.w, s.paddle.x));

      // Ball pre-launch
      if (!s.launched) {
        s.ball.x = s.paddle.x + s.paddle.w / 2;
        s.ball.y = PADDLE_Y - BALL_R - 2;
        return;
      }

      // Ball movement
      s.ball.x += s.ball.vx;
      s.ball.y += s.ball.vy;

      // Wall bounces
      if (s.ball.x - BALL_R <= 0) { s.ball.vx = Math.abs(s.ball.vx); playCardFlipSound(); }
      if (s.ball.x + BALL_R >= W) { s.ball.vx = -Math.abs(s.ball.vx); playCardFlipSound(); }
      if (s.ball.y - BALL_R <= 0) { s.ball.vy = Math.abs(s.ball.vy); playCardFlipSound(); }

      // Paddle bounce
      const px = s.paddle.x, pw = s.paddle.w;
      if (
        s.ball.y + BALL_R >= PADDLE_Y &&
        s.ball.y - BALL_R <= PADDLE_Y + PADDLE_H &&
        s.ball.x >= px - BALL_R &&
        s.ball.x <= px + pw + BALL_R
      ) {
        const rel = (s.ball.x - (px + pw / 2)) / (pw / 2); // -1 to 1
        const angle = rel * (Math.PI / 3); // ±60°
        const speed = Math.hypot(s.ball.vx, s.ball.vy);
        s.ball.vx = speed * Math.sin(angle);
        s.ball.vy = -Math.abs(speed * Math.cos(angle));
        s.ball.y = PADDLE_Y - BALL_R - 1;
        s.combo = 0;
        playCardFlipSound();
      }

      // Brick collision
      s.bricks.forEach(b => {
        if (!b.alive) return;
        if (
          s.ball.x + BALL_R > b.x && s.ball.x - BALL_R < b.x + b.w &&
          s.ball.y + BALL_R > b.y && s.ball.y - BALL_R < b.y + b.h
        ) {
          b.hp--;
          s.combo++;
          const pts = (b.maxHp * 10) * (1 + Math.floor(s.combo / 3) * 0.5);
          s.score += Math.round(pts);
          setDisplayScore(s.score);
          playMatchSuccessSound();

          if (b.hp <= 0) {
            b.alive = false;
            // Explosion particles
            for (let i = 0; i < 12; i++) {
              const ang = (Math.PI * 2 * i) / 12 + Math.random() * 0.5;
              const spd = 2 + Math.random() * 3;
              s.particles.push({
                x: b.x + b.w / 2, y: b.y + b.h / 2,
                vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
                r: 2 + Math.random() * 2,
                color: b.fill,
                life: 30 + Math.random() * 20, maxLife: 50,
              });
            }
          }

          // Bounce off brick
          const overlapX = Math.min(s.ball.x + BALL_R - b.x, b.x + b.w - (s.ball.x - BALL_R));
          const overlapY = Math.min(s.ball.y + BALL_R - b.y, b.y + b.h - (s.ball.y - BALL_R));
          if (overlapX < overlapY) s.ball.vx *= -1;
          else s.ball.vy *= -1;
        }
      });

      // Particles
      s.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life--; });
      s.particles = s.particles.filter(p => p.life > 0);

      // Ball lost
      if (s.ball.y - BALL_R > H + 20) {
        s.lives--;
        setDisplayLives(s.lives);
        if (s.lives <= 0) {
          s.status = "over";
          setUiStatus("over");
          playGameOverSound();
          const uid = window.localStorage.getItem("userId") || "guest";
          if (s.score > bestScore) {
            setBestScore(s.score);
            window.localStorage.setItem(`brickblaster-best-${uid}`, String(s.score));
            fireConfetti();
          }
          saveScoreToCloud("Brick Blaster", s.score);
          recordGameActivity("Brick Blaster", s.score);
          mergeProgressRecord({ title: "Brick Blaster", genre: "Arcade", href: "/brickblaster" }, s.score, "direct", 3000);
        } else {
          // Respawn ball
          s.ball.x = s.paddle.x + s.paddle.w / 2;
          s.ball.y = PADDLE_Y - BALL_R - 2;
          const spd = BALL_SPEED_INIT + (s.level - 1) * 0.4;
          const ang = -Math.PI / 4 - Math.random() * Math.PI / 4;
          s.ball.vx = spd * Math.cos(ang);
          s.ball.vy = spd * Math.sin(ang);
          s.launched = false;
        }
      }

      // Level cleared
      const allGone = s.bricks.every(b => !b.alive);
      if (allGone) {
        s.score += s.level * 50;
        setDisplayScore(s.score);
        s.status = "win";
        setUiStatus("win");
        fireConfetti();
        playMatchSuccessSound();
        const uid = window.localStorage.getItem("userId") || "guest";
        if (s.score > bestScore) {
          setBestScore(s.score);
          window.localStorage.setItem(`brickblaster-best-${uid}`, String(s.score));
        }
        saveScoreToCloud("Brick Blaster", s.score);
        recordGameActivity("Brick Blaster", s.score);
        mergeProgressRecord({ title: "Brick Blaster", genre: "Arcade", href: "/brickblaster" }, s.score, "direct", 3000);
      }
    };

    const render = () => {
      const s = stateRef.current;
      drawBg();
      if (!s || s.status === "idle") { drawOverlay({ status: "idle" }); return; }
      drawBricks(s.bricks);
      drawParticles(s.particles);
      drawPaddle(s.paddle);
      drawBall(s.ball);
      drawHUD(s);
      if (s.status === "over" || s.status === "win") drawOverlay(s);
      // Pre-launch hint
      if (s.status === "playing" && !s.launched) {
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.font = "13px monospace";
        ctx.textAlign = "center";
        ctx.fillText("Click / SPACE to launch", W / 2, PADDLE_Y - 20);
        ctx.textAlign = "left";
      }
    };

    const loop = () => { update(); render(); animRef.current = requestAnimationFrame(loop); };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [bestScore, playCardFlipSound, playMatchSuccessSound, playGameOverSound, fireConfetti, saveScoreToCloud, initState]);

  // Canvas click for game state transitions
  const handleCanvasClick = () => {
    const s = stateRef.current;
    if (!s || s.status === "idle" || s.status === "over") { startGame(); setUiStatus("playing"); return; }
    if (s.status === "win") {
      const nextLevel = s.level + 1;
      const prevScore = s.score;
      const prevLives = s.lives;
      initState(nextLevel);
      stateRef.current.score = prevScore;
      stateRef.current.lives = prevLives;
      setDisplayScore(prevScore);
      setDisplayLives(prevLives);
      setUiStatus("playing");
    }
  };

  return (
    <main className="dashboard-shell" style={{ minHeight: "100vh" }}>
      <style>{`
        @keyframes brick-glow { 0%,100%{box-shadow:0 0 20px rgba(61,217,255,0.4)} 50%{box-shadow:0 0 40px rgba(139,92,246,0.6)} }
      `}</style>

      <header className="dashboard-header" style={{ marginBottom: 22 }}>
        <div>
          <div className="brand-mark">
            <span className="brand-dot" style={{ background: "linear-gradient(135deg,#3dd9ff,#8b5cf6)" }} />
            PixelPulse
          </div>
          <h1 style={{ background: "linear-gradient(90deg,#3dd9ff,#8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            🧱 Brick Blaster
          </h1>
        </div>
        <div className="dashboard-actions">
          <button type="button" className="ghost-button" onClick={toggleMute} style={{ fontSize: 20, padding: "8px 12px" }}>{isMuted ? "🔇" : "🔊"}</button>
          <BackButton label="← Back" />
          <Link href="/games" className="ghost-button">Games</Link>
          <Link href="/dashboard" className="ghost-button">Dashboard</Link>
        </div>
      </header>

      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card" style={{ background: "linear-gradient(180deg,rgba(61,217,255,0.15),transparent)", borderColor: "rgba(61,217,255,0.3)" }}>
          <span className="label">Score</span>
          <strong style={{ color: "#3dd9ff" }}>{displayScore}</strong>
        </div>
        <div className="stat-card" style={{ background: "linear-gradient(180deg,rgba(245,158,11,0.15),transparent)", borderColor: "rgba(245,158,11,0.3)" }}>
          <span className="label">Best</span>
          <strong style={{ color: "#f59e0b" }}>{bestScore}</strong>
        </div>
        <div className="stat-card">
          <span className="label">Level</span>
          <strong style={{ color: "#8b5cf6" }}>{displayLevel}</strong>
        </div>
        <div className="stat-card" style={{ background: "linear-gradient(180deg,rgba(239,68,68,0.1),transparent)", borderColor: "rgba(239,68,68,0.25)" }}>
          <span className="label">Lives</span>
          <strong style={{ color: "#ef4444" }}>{"❤️".repeat(displayLives) || "💀"}</strong>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
        <div style={{ width: "fit-content" }}>
          <div style={{
            borderRadius: 20, overflow: "hidden",
            border: "2px solid rgba(61,217,255,0.35)",
            boxShadow: "0 0 40px rgba(61,217,255,0.2), 0 20px 60px rgba(0,0,0,0.5)",
            animation: "brick-glow 3s ease-in-out infinite",
            cursor: "none",
          }} onClick={handleCanvasClick}>
            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              style={{ display: "block", maxWidth: "100%", cursor: "none" }}
            />
          </div>
          <div style={{ marginTop: 12, textAlign: "center", color: "var(--muted)", fontSize: 13, fontWeight: 600 }}>
            🖱️ Mouse / <kbd style={{ background: "rgba(255,255,255,0.1)", padding: "2px 7px", borderRadius: 5, border: "1px solid rgba(255,255,255,0.2)" }}>◀ ▶</kbd> keys to move paddle •
            <kbd style={{ background: "rgba(255,255,255,0.1)", padding: "2px 7px", borderRadius: 5, border: "1px solid rgba(255,255,255,0.2)", marginLeft: 6 }}>SPACE</kbd> to launch
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <Leaderboard gameName="Brick Blaster" />
      </div>
    </main>
  );
}
