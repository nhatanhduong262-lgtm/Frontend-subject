import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import BackButton from "../components/BackButton";
import Leaderboard from "../components/Leaderboard";
import { mergeProgressRecord } from "../lib/playerProgress";
import { recordGameActivity } from "../lib/quests";
import { useGameEffects } from "../context/GameEffectsContext";
import { usePlaytime } from "../hooks/usePlaytime";

const CANVAS_W = 480;
const CANVAS_H = 360;
const PLAYER_W = 28;
const PLAYER_H = 28;
const GRAVITY = 0.45;
const JUMP_FORCE = -9.5;
const GROUND_Y = CANVAS_H - 48;
const CEILING_Y = 48;
const PIPE_WIDTH = 52;
const PIPE_GAP = 140;
const PIPE_SPEED_INIT = 3.5;

export default function GravityFlipPage() {
  usePlaytime({ title: "Gravity Flip", genre: "Arcade", href: "/gravityflip" });
  const router = useRouter();
  const { isMuted, toggleMute, playCardFlipSound, playGameOverSound, fireConfetti, saveScoreToCloud } = useGameEffects();

  const canvasRef = useRef(null);
  const stateRef = useRef({
    status: "idle", // idle | playing | over
    player: { x: 80, y: CANVAS_H / 2, vy: 0, flipped: false },
    pipes: [],
    score: 0,
    frame: 0,
    pipeSpeed: PIPE_SPEED_INIT,
    particles: [],
  });
  const animRef = useRef(null);
  const [displayScore, setDisplayScore] = useState(0);
  const [status, setStatus] = useState("idle");
  const [bestScore, setBestScore] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    if (!window.localStorage.getItem("userId")) router.replace("/login");
    const uid = window.localStorage.getItem("userId") || "guest";
    const saved = Number(window.localStorage.getItem(`gravityflip-best-${uid}`) || 0);
    setBestScore(saved);
  }, [router]);

  const spawnPipe = () => {
    const minTop = 60;
    const maxTop = CANVAS_H - PIPE_GAP - 60;
    const topH = Math.floor(Math.random() * (maxTop - minTop) + minTop);
    return { x: CANVAS_W + 20, topH, scored: false };
  };

  const resetState = () => {
    stateRef.current = {
      status: "playing",
      player: { x: 80, y: CANVAS_H / 2, vy: -3, flipped: false },
      pipes: [spawnPipe()],
      score: 0,
      frame: 0,
      pipeSpeed: PIPE_SPEED_INIT,
      particles: [],
    };
    setDisplayScore(0);
    setFlipped(false);
  };

  const flip = useCallback(() => {
    const s = stateRef.current;
    if (s.status !== "playing") return;
    s.player.flipped = !s.player.flipped;
    s.player.vy = s.player.flipped ? 9 : JUMP_FORCE;
    setFlipped(s.player.flipped);
    playCardFlipSound();

    // spark particles
    for (let i = 0; i < 8; i++) {
      s.particles.push({
        x: s.player.x + PLAYER_W / 2,
        y: s.player.y + PLAYER_H / 2,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        life: 20,
        color: s.player.flipped ? "#3dd9ff" : "#8b5cf6",
      });
    }
  }, [playCardFlipSound]);

  const startGame = useCallback(() => {
    resetState();
    setStatus("playing");
    stateRef.current.status = "playing";
  }, []);

  // Main game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const draw = () => {
      const s = stateRef.current;

      // Background
      ctx.fillStyle = "#050816";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Grid lines
      ctx.strokeStyle = "rgba(255,255,255,0.03)";
      ctx.lineWidth = 1;
      for (let x = 0; x < CANVAS_W; x += 32) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke();
      }
      for (let y = 0; y < CANVAS_H; y += 32) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke();
      }

      // Ground & ceiling
      const groundGrad = ctx.createLinearGradient(0, GROUND_Y, 0, CANVAS_H);
      groundGrad.addColorStop(0, "rgba(139,92,246,0.6)");
      groundGrad.addColorStop(1, "rgba(61,217,255,0.3)");
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);

      const ceilGrad = ctx.createLinearGradient(0, 0, 0, CEILING_Y);
      ceilGrad.addColorStop(0, "rgba(61,217,255,0.3)");
      ceilGrad.addColorStop(1, "rgba(139,92,246,0.6)");
      ctx.fillStyle = ceilGrad;
      ctx.fillRect(0, 0, CANVAS_W, CEILING_Y);

      // Pipes
      s.pipes.forEach(pipe => {
        // Top pipe
        const topGrad = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_WIDTH, 0);
        topGrad.addColorStop(0, "#1e3a5f");
        topGrad.addColorStop(0.5, "#3dd9ff");
        topGrad.addColorStop(1, "#1e3a5f");
        ctx.fillStyle = topGrad;
        ctx.fillRect(pipe.x, CEILING_Y, PIPE_WIDTH, pipe.topH - CEILING_Y);
        ctx.fillStyle = "rgba(61,217,255,0.8)";
        ctx.fillRect(pipe.x - 4, pipe.topH - 14, PIPE_WIDTH + 8, 14);

        // Bottom pipe
        const botY = pipe.topH + PIPE_GAP;
        const botGrad = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_WIDTH, 0);
        botGrad.addColorStop(0, "#3b1f6e");
        botGrad.addColorStop(0.5, "#8b5cf6");
        botGrad.addColorStop(1, "#3b1f6e");
        ctx.fillStyle = botGrad;
        ctx.fillRect(pipe.x, botY, PIPE_WIDTH, GROUND_Y - botY);
        ctx.fillStyle = "rgba(139,92,246,0.8)";
        ctx.fillRect(pipe.x - 4, botY, PIPE_WIDTH + 8, 14);
      });

      // Particles
      s.particles.forEach(p => {
        ctx.globalAlpha = p.life / 20;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Player
      if (s.status !== "idle") {
        const px = s.player.x;
        const py = s.player.y;
        const pFlipped = s.player.flipped;

        ctx.save();
        ctx.translate(px + PLAYER_W / 2, py + PLAYER_H / 2);
        if (pFlipped) ctx.scale(1, -1);

        // Body gradient
        const playerGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, PLAYER_W / 2);
        playerGrad.addColorStop(0, pFlipped ? "#3dd9ff" : "#a78bfa");
        playerGrad.addColorStop(1, pFlipped ? "#0891b2" : "#7c3aed");
        ctx.fillStyle = playerGrad;
        ctx.beginPath();
        ctx.roundRect(-PLAYER_W / 2, -PLAYER_H / 2, PLAYER_W, PLAYER_H, 8);
        ctx.fill();

        // Glow
        ctx.shadowColor = pFlipped ? "#3dd9ff" : "#8b5cf6";
        ctx.shadowBlur = 16;
        ctx.strokeStyle = pFlipped ? "#3dd9ff" : "#a78bfa";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Eye
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(5, -4, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(6, -4, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Thruster
        if (s.status === "playing") {
          ctx.fillStyle = pFlipped ? "rgba(61,217,255,0.7)" : "rgba(139,92,246,0.7)";
          ctx.beginPath();
          ctx.moveTo(-PLAYER_W / 2, PLAYER_H / 2 - 4);
          ctx.lineTo(-PLAYER_W / 2 - (6 + Math.random() * 6), PLAYER_H / 2 + 8 + Math.random() * 6);
          ctx.lineTo(-PLAYER_W / 2 + 8, PLAYER_H / 2 - 4);
          ctx.fill();
        }

        ctx.restore();
      }

      // Score HUD
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(10, 10, 120, 32);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 16px monospace";
      ctx.fillText(`Score: ${s.score}`, 20, 31);

      // Idle screen
      if (s.status === "idle") {
        ctx.fillStyle = "rgba(5,8,22,0.7)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 32px monospace";
        ctx.textAlign = "center";
        ctx.fillText("GRAVITY FLIP", CANVAS_W / 2, CANVAS_H / 2 - 40);
        ctx.font = "16px monospace";
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.fillText("Click / Space to flip gravity", CANVAS_W / 2, CANVAS_H / 2);
        ctx.fillStyle = "#8b5cf6";
        ctx.font = "bold 18px monospace";
        ctx.fillText("[ Press SPACE or TAP to Start ]", CANVAS_W / 2, CANVAS_H / 2 + 40);
        ctx.textAlign = "left";
      }

      // Game Over overlay
      if (s.status === "over") {
        ctx.fillStyle = "rgba(5,8,22,0.85)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = "#ef4444";
        ctx.font = "bold 34px monospace";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", CANVAS_W / 2, CANVAS_H / 2 - 50);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 22px monospace";
        ctx.fillText(`Score: ${s.score}`, CANVAS_W / 2, CANVAS_H / 2 - 10);
        ctx.fillStyle = "#f59e0b";
        ctx.font = "16px monospace";
        ctx.fillText("Press SPACE / TAP to retry", CANVAS_W / 2, CANVAS_H / 2 + 30);
        ctx.textAlign = "left";
      }
    };

    const update = () => {
      const s = stateRef.current;
      if (s.status !== "playing") return;

      const p = s.player;
      const grav = p.flipped ? -GRAVITY : GRAVITY;
      p.vy += grav;
      p.vy = Math.max(-12, Math.min(12, p.vy));
      p.y += p.vy;
      s.frame++;

      // Particles
      s.particles.forEach(pt => { pt.x += pt.vx; pt.y += pt.vy; pt.life--; });
      s.particles = s.particles.filter(pt => pt.life > 0);

      // Increase speed
      s.pipeSpeed = PIPE_SPEED_INIT + s.score * 0.15;

      // Pipes
      s.pipes.forEach(pipe => { pipe.x -= s.pipeSpeed; });
      if (s.frame % Math.max(60, 100 - s.score * 2) === 0) s.pipes.push(spawnPipe());
      s.pipes = s.pipes.filter(pipe => pipe.x > -PIPE_WIDTH - 20);

      // Scoring
      s.pipes.forEach(pipe => {
        if (!pipe.scored && pipe.x + PIPE_WIDTH < p.x) {
          pipe.scored = true;
          s.score++;
          setDisplayScore(s.score);
          playCardFlipSound();
        }
      });

      // Collision
      const hitFloor = !p.flipped && p.y + PLAYER_H >= GROUND_Y;
      const hitCeil = p.flipped && p.y <= CEILING_Y;
      const hitPipe = s.pipes.some(pipe => {
        const rx = p.x < pipe.x + PIPE_WIDTH && p.x + PLAYER_W > pipe.x;
        const topHit = p.y < pipe.topH + CEILING_Y;
        const botHit = p.y + PLAYER_H > pipe.topH + PIPE_GAP;
        return rx && (topHit || botHit);
      });

      if (hitFloor || hitCeil || hitPipe) {
        s.status = "over";
        setStatus("over");
        playGameOverSound();

        const uid = window.localStorage.getItem("userId") || "guest";
        if (s.score > bestScore) {
          setBestScore(s.score);
          window.localStorage.setItem(`gravityflip-best-${uid}`, String(s.score));
          fireConfetti();
        }
        saveScoreToCloud("Gravity Flip", s.score * 50);
        recordGameActivity("Gravity Flip", s.score * 50);
        mergeProgressRecord({ title: "Gravity Flip", genre: "Arcade", href: "/gravityflip" }, s.score * 50, "direct", 1000);
      }
    };

    const loop = () => {
      update();
      draw();
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [bestScore, playCardFlipSound, playGameOverSound, fireConfetti, saveScoreToCloud]);

  // Input
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        const s = stateRef.current;
        if (s.status === "idle" || s.status === "over") {
          startGame();
          setStatus("playing");
        } else {
          flip();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flip, startGame]);

  const handleCanvasTap = () => {
    const s = stateRef.current;
    if (s.status === "idle" || s.status === "over") {
      startGame();
      setStatus("playing");
    } else {
      flip();
    }
  };

  return (
    <main className="dashboard-shell" style={{ minHeight: "100vh" }}>
      <style>{`
        @keyframes glow-pulse { 0%,100%{box-shadow:0 0 20px rgba(139,92,246,0.5)} 50%{box-shadow:0 0 40px rgba(61,217,255,0.7)} }
      `}</style>

      <header className="dashboard-header" style={{ marginBottom: 24 }}>
        <div>
          <div className="brand-mark">
            <span className="brand-dot" style={{ background: "linear-gradient(135deg,#8b5cf6,#3dd9ff)" }} />
            PixelPulse
          </div>
          <h1 style={{ background: "linear-gradient(90deg,#8b5cf6,#3dd9ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            🚀 Gravity Flip
          </h1>
        </div>
        <div className="dashboard-actions">
          <button type="button" className="ghost-button" onClick={toggleMute} style={{ fontSize: 20, padding: "8px 12px" }}>
            {isMuted ? "🔇" : "🔊"}
          </button>
          <BackButton label="← Back" />
          <Link href="/games" className="ghost-button">Games</Link>
          <Link href="/dashboard" className="ghost-button">Dashboard</Link>
        </div>
      </header>

      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card" style={{ background: "linear-gradient(180deg,rgba(139,92,246,0.15),transparent)", borderColor: "rgba(139,92,246,0.3)" }}>
          <span className="label">Score</span>
          <strong style={{ color: "#a78bfa" }}>{displayScore}</strong>
        </div>
        <div className="stat-card" style={{ background: "linear-gradient(180deg,rgba(245,158,11,0.15),transparent)", borderColor: "rgba(245,158,11,0.3)" }}>
          <span className="label">Best</span>
          <strong style={{ color: "#f59e0b" }}>{bestScore}</strong>
        </div>
        <div className="stat-card" style={{ background: "linear-gradient(180deg,rgba(61,217,255,0.15),transparent)", borderColor: "rgba(61,217,255,0.3)" }}>
          <span className="label">Gravity</span>
          <strong style={{ color: flipped ? "#3dd9ff" : "#8b5cf6" }}>{flipped ? "⬆️ UP" : "⬇️ DOWN"}</strong>
        </div>
        <div className="stat-card">
          <span className="label">State</span>
          <strong>{status === "playing" ? "Flying!" : status === "over" ? "💥 Crashed" : "Ready"}</strong>
        </div>
      </div>

      <div style={{ display: "flex", gap: 22, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* Canvas */}
        <div style={{ flex: "0 0 auto" }}>
          <div style={{
            borderRadius: 20, overflow: "hidden",
            border: "2px solid rgba(139,92,246,0.4)",
            boxShadow: "0 0 40px rgba(139,92,246,0.3), 0 20px 60px rgba(0,0,0,0.5)",
            animation: "glow-pulse 3s ease-in-out infinite",
            cursor: "pointer",
            userSelect: "none",
          }} onClick={handleCanvasTap}>
            <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} style={{ display: "block", maxWidth: "100%" }} />
          </div>
          <div style={{ marginTop: 14, textAlign: "center", color: "var(--muted)", fontSize: 13, fontWeight: 600 }}>
            🖱️ Click or <kbd style={{ background: "rgba(255,255,255,0.1)", padding: "2px 8px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.2)" }}>SPACE</kbd> to flip gravity
          </div>
        </div>

        {/* Instructions */}
        <div style={{ flex: 1, minWidth: 240, display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="panel-card" style={{ padding: 22 }}>
            <h2 style={{ margin: "0 0 14px", fontSize: 18, background: "linear-gradient(90deg,#8b5cf6,#3dd9ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>How to Play</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { icon: "🖱️", text: "Click or press SPACE to flip gravity" },
                { icon: "🚀", text: "Your ship changes direction between UP and DOWN" },
                { icon: "🚧", text: "Dodge the neon pipes — top and bottom" },
                { icon: "⚡", text: "Pipes get faster as your score rises" },
                { icon: "💎", text: "Pass through gaps to score points" },
              ].map((tip, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{tip.icon}</span>
                  <span style={{ color: "var(--muted)", fontSize: 14 }}>{tip.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel-card" style={{ padding: 18, background: "linear-gradient(135deg,rgba(139,92,246,0.1),rgba(61,217,255,0.05))", borderColor: "rgba(139,92,246,0.3)" }}>
            <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Tip</div>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 14, lineHeight: 1.6 }}>
              The gap narrows at higher speeds. Flip gravity <strong style={{ color: "var(--text)" }}>just before</strong> hitting a surface for maximum control!
            </p>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <Leaderboard gameName="Gravity Flip" />
      </div>
    </main>
  );
}
