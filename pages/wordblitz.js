import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import BackButton from "../components/BackButton";
import Leaderboard from "../components/Leaderboard";
import { mergeProgressRecord } from "../lib/playerProgress";
import { recordGameActivity } from "../lib/quests";
import { useGameEffects } from "../context/GameEffectsContext";
import { usePlaytime } from "../hooks/usePlaytime";

// ── Word pools ─────────────────────────────────────────────────────────────────
const WORD_POOLS = {
  easy: ["cat","dog","sun","run","hot","big","map","cup","far","win","joy","fix","new","old","red","sky","sea","ice","art","bit"],
  medium: ["storm","glass","flame","pixel","quest","clash","swift","blend","crisp","frost","spark","brave","grace","night","dream","power","speed","flash","bloom","crane"],
  hard: ["quantum","phantom","eclipse","gravity","crystal","serpent","thunder","vortex","horizon","cascade","tempest","mirage","overture","shatter","stardust","warpzone","chromatic"],
};

const TIME_LIMIT = 60; // seconds
const WORDS_PER_ROUND = 3; // words shown at a time

function pickWords(count, difficulty) {
  const pool = WORD_POOLS[difficulty];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export default function WordBlitzPage() {
  usePlaytime({ title: "Word Blitz", genre: "Speed", href: "/wordblitz" });
  const router = useRouter();
  const { isMuted, toggleMute, playMatchSuccessSound, playMismatchSound, playGameOverSound, fireConfetti, saveScoreToCloud } = useGameEffects();

  const [status, setStatus] = useState("idle"); // idle | playing | over
  const [difficulty, setDifficulty] = useState("medium");
  const [words, setWords] = useState([]);
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [totalTyped, setTotalTyped] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [flash, setFlash] = useState(null); // "correct" | "wrong"
  const [lastPoints, setLastPoints] = useState(null);
  const [shakeInput, setShakeInput] = useState(false);

  const inputRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!window.localStorage.getItem("userId")) router.replace("/login");
    const uid = window.localStorage.getItem("userId") || "guest";
    setBestScore(Number(window.localStorage.getItem(`wordblitz-best-${uid}`) || 0));
  }, [router]);

  const generateWords = useCallback((diff = difficulty) => {
    setWords(pickWords(WORDS_PER_ROUND, diff));
  }, [difficulty]);

  const startGame = useCallback(() => {
    setStatus("playing");
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setTimeLeft(TIME_LIMIT);
    setTotalTyped(0);
    setWrongCount(0);
    setInput("");
    setFlash(null);
    setLastPoints(null);
    generateWords(difficulty);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [difficulty, generateWords]);

  // Timer
  useEffect(() => {
    if (status !== "playing") { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setStatus("over");
          playGameOverSound();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [status, playGameOverSound]);

  // Game over — save score
  useEffect(() => {
    if (status !== "over") return;
    const uid = window.localStorage.getItem("userId") || "guest";
    if (score > bestScore) {
      setBestScore(score);
      window.localStorage.setItem(`wordblitz-best-${uid}`, String(score));
      fireConfetti();
    }
    saveScoreToCloud("Word Blitz", score);
    recordGameActivity("Word Blitz", score);
    mergeProgressRecord({ title: "Word Blitz", genre: "Speed", href: "/wordblitz" }, score, "direct", 2000);
  }, [status]);

  const diffPoints = { easy: 10, medium: 20, hard: 35 };

  const handleInput = (e) => {
    const val = e.target.value;
    // Check for exact word match (no trailing space needed if complete)
    const matched = words.findIndex(w => w === val.trim().toLowerCase());

    if (matched !== -1) {
      // Correct!
      const pts = diffPoints[difficulty] * (1 + combo * 0.3);
      const roundedPts = Math.round(pts);
      setScore(s => s + roundedPts);
      setCombo(c => { const nc = c + 1; setMaxCombo(m => Math.max(m, nc)); return nc; });
      setTotalTyped(t => t + 1);
      setInput("");
      setFlash("correct");
      setLastPoints(`+${roundedPts}`);
      playMatchSuccessSound();
      setTimeout(() => { setFlash(null); setLastPoints(null); }, 600);

      // Replace matched word
      const next = pickWords(1, difficulty)[0];
      setWords(prev => {
        const updated = [...prev];
        updated[matched] = next;
        return updated;
      });
    } else {
      setInput(val);
      // Check if partial is wrong prefix
      const partialMatch = words.some(w => w.startsWith(val.toLowerCase()));
      if (val.length > 0 && !partialMatch) {
        setShakeInput(true);
        setTimeout(() => setShakeInput(false), 300);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      // Wrong submission
      if (input.trim() && !words.includes(input.trim().toLowerCase())) {
        setCombo(0);
        setWrongCount(w => w + 1);
        setInput("");
        setFlash("wrong");
        playMismatchSound();
        setShakeInput(true);
        setTimeout(() => { setFlash(null); setShakeInput(false); }, 500);
      }
    }
  };

  const accuracy = totalTyped + wrongCount > 0 ? Math.round((totalTyped / (totalTyped + wrongCount)) * 100) : 100;
  const timerPct = (timeLeft / TIME_LIMIT) * 100;
  const timerColor = timeLeft > 20 ? "#10b981" : timeLeft > 10 ? "#f59e0b" : "#ef4444";

  const diffConfig = {
    easy:   { label: "Easy",   color: "#10b981", icon: "🌱" },
    medium: { label: "Medium", color: "#3dd9ff", icon: "⚡" },
    hard:   { label: "Hard",   color: "#ef4444", icon: "🔥" },
  };

  return (
    <main className="dashboard-shell" style={{ minHeight: "100vh" }}>
      <style>{`
        @keyframes pop-in {
          0%   { transform: scale(0.7); opacity: 0; }
          70%  { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
        @keyframes float-up {
          0%   { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-40px) scale(1.4); }
        }
        .word-chip { animation: pop-in 0.25s cubic-bezier(0.34,1.56,0.64,1) both; }
        .shake     { animation: shake 0.3s ease; }
        .float-up  { animation: float-up 0.6s ease forwards; }
      `}</style>

      <header className="dashboard-header" style={{ marginBottom: 22 }}>
        <div>
          <div className="brand-mark">
            <span className="brand-dot" style={{ background: "linear-gradient(135deg,#3dd9ff,#10b981)" }} />
            PixelPulse
          </div>
          <h1 style={{ background: "linear-gradient(90deg,#3dd9ff,#10b981)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            ⚡ Word Blitz
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

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card" style={{ background: "linear-gradient(180deg,rgba(61,217,255,0.15),transparent)", borderColor: "rgba(61,217,255,0.3)" }}>
          <span className="label">Score</span>
          <strong style={{ color: "#3dd9ff" }}>{score}</strong>
        </div>
        <div className="stat-card" style={{ background: "linear-gradient(180deg,rgba(245,158,11,0.15),transparent)", borderColor: "rgba(245,158,11,0.3)" }}>
          <span className="label">Best</span>
          <strong style={{ color: "#f59e0b" }}>{bestScore}</strong>
        </div>
        <div className="stat-card" style={{ background: combo > 0 ? "linear-gradient(180deg,rgba(139,92,246,0.2),transparent)" : undefined, borderColor: combo > 0 ? "rgba(139,92,246,0.4)" : undefined }}>
          <span className="label">Combo 🔥</span>
          <strong style={{ color: combo >= 5 ? "#f59e0b" : combo >= 3 ? "#a78bfa" : "var(--text)" }}>{combo}x</strong>
        </div>
        <div className="stat-card">
          <span className="label">Accuracy</span>
          <strong style={{ color: accuracy >= 80 ? "#10b981" : accuracy >= 60 ? "#f59e0b" : "#ef4444" }}>{accuracy}%</strong>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>

        {/* Main Game Area */}
        <section className="panel-card" style={{ padding: "28px 30px" }}>

          {/* IDLE */}
          {status === "idle" && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 72, marginBottom: 16 }}>⚡</div>
              <h2 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 900, background: "linear-gradient(90deg,#3dd9ff,#10b981)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Word Blitz</h2>
              <p style={{ color: "var(--muted)", marginBottom: 28, fontSize: 16 }}>Type the words as fast as you can before time runs out!</p>

              {/* Difficulty selector */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Select Difficulty</div>
                <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                  {Object.entries(diffConfig).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setDifficulty(key)}
                      style={{
                        padding: "10px 22px", borderRadius: 12, fontSize: 14, fontWeight: 700,
                        border: `2px solid ${difficulty === key ? cfg.color : "rgba(255,255,255,0.1)"}`,
                        background: difficulty === key ? `${cfg.color}20` : "rgba(255,255,255,0.03)",
                        color: difficulty === key ? cfg.color : "var(--muted)",
                        cursor: "pointer", transition: "all 0.2s",
                        boxShadow: difficulty === key ? `0 0 16px ${cfg.color}40` : "none",
                      }}
                    >{cfg.icon} {cfg.label}</button>
                  ))}
                </div>
                <div style={{ marginTop: 10, fontSize: 13, color: "var(--muted)" }}>
                  {difficulty === "easy" && "Short simple words • +10 pts each"}
                  {difficulty === "medium" && "5–6 letter words • +20 pts each"}
                  {difficulty === "hard" && "Long complex words • +35 pts each"}
                </div>
              </div>

              <button
                onClick={startGame}
                style={{
                  background: "linear-gradient(135deg,#3dd9ff,#10b981)", color: "#000",
                  border: "none", borderRadius: 14, padding: "14px 40px",
                  fontSize: 18, fontWeight: 900, cursor: "pointer",
                  boxShadow: "0 8px 30px rgba(61,217,255,0.4)",
                  transition: "transform 0.2s",
                }}
                onMouseOver={e => e.currentTarget.style.transform = "scale(1.05)"}
                onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
              >🚀 Start Game</button>
            </div>
          )}

          {/* PLAYING */}
          {status === "playing" && (
            <div>
              {/* Timer */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Time Left</span>
                  <span style={{ fontWeight: 900, fontSize: 22, color: timerColor, fontFamily: "monospace", transition: "color 0.5s" }}>
                    {timeLeft}s
                  </span>
                </div>
                <div style={{ height: 10, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                  <div style={{ width: `${timerPct}%`, height: "100%", background: `linear-gradient(90deg, ${timerColor}, ${timerColor}88)`, borderRadius: 999, transition: "width 1s linear, background 0.5s", boxShadow: `0 0 10px ${timerColor}80` }} />
                </div>
              </div>

              {/* Combo badge */}
              {combo >= 2 && (
                <div style={{ textAlign: "center", marginBottom: 12 }}>
                  <span style={{ padding: "4px 16px", borderRadius: 20, background: combo >= 5 ? "rgba(245,158,11,0.2)" : "rgba(139,92,246,0.15)", border: `1px solid ${combo >= 5 ? "#f59e0b" : "#8b5cf6"}`, fontSize: 13, fontWeight: 800, color: combo >= 5 ? "#f59e0b" : "#a78bfa" }}>
                    {combo >= 8 ? "🔥 BLAZING " : combo >= 5 ? "⚡ ON FIRE " : "✨ COMBO "}×{combo}
                  </span>
                </div>
              )}

              {/* Word chips */}
              <div style={{ display: "flex", gap: 14, justifyContent: "center", marginBottom: 28, flexWrap: "wrap" }}>
                {words.map((word, i) => {
                  const typed = input.toLowerCase();
                  const isMatch = word.startsWith(typed) && typed.length > 0;
                  const isExact = word === typed;
                  return (
                    <div
                      key={`${word}-${i}`}
                      className="word-chip"
                      style={{
                        padding: "14px 24px", borderRadius: 16, fontSize: 22, fontWeight: 900,
                        fontFamily: "monospace", letterSpacing: "0.1em",
                        background: isExact ? "rgba(16,185,129,0.2)" : isMatch ? "rgba(61,217,255,0.1)" : flash === "correct" ? "rgba(16,185,129,0.05)" : "rgba(255,255,255,0.05)",
                        border: isExact ? "2px solid #10b981" : isMatch ? "2px solid rgba(61,217,255,0.5)" : "2px solid rgba(255,255,255,0.1)",
                        color: isMatch ? "#3dd9ff" : "var(--text)",
                        boxShadow: isMatch ? "0 0 20px rgba(61,217,255,0.3)" : "none",
                        transition: "all 0.15s",
                        animationDelay: `${i * 0.05}s`,
                      }}
                    >
                      {/* Highlight typed prefix */}
                      <span>
                        <span style={{ color: isMatch ? "#fff" : "inherit" }}>{word.slice(0, typed.length)}</span>
                        <span style={{ color: isMatch ? "rgba(61,217,255,0.6)" : "rgba(255,255,255,0.4)" }}>{word.slice(typed.length)}</span>
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Floating +pts */}
              {lastPoints && (
                <div style={{ textAlign: "center", marginBottom: 8, position: "relative", height: 36 }}>
                  <span className="float-up" style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", fontSize: 22, fontWeight: 900, color: "#10b981" }}>
                    {lastPoints}
                  </span>
                </div>
              )}

              {/* Input */}
              <div style={{ position: "relative" }}>
                <input
                  ref={inputRef}
                  className={shakeInput ? "shake" : ""}
                  type="text"
                  value={input}
                  onChange={handleInput}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a word…"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  style={{
                    width: "100%", boxSizing: "border-box",
                    padding: "18px 24px", borderRadius: 16,
                    background: flash === "correct" ? "rgba(16,185,129,0.1)" : flash === "wrong" ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.05)",
                    border: `2px solid ${flash === "correct" ? "#10b981" : flash === "wrong" ? "#ef4444" : "rgba(61,217,255,0.3)"}`,
                    color: "var(--text)", fontSize: 20, fontWeight: 700, fontFamily: "monospace",
                    outline: "none", textAlign: "center", letterSpacing: "0.08em",
                    transition: "background 0.2s, border-color 0.2s",
                    boxShadow: flash === "correct" ? "0 0 20px rgba(16,185,129,0.4)" : flash === "wrong" ? "0 0 20px rgba(239,68,68,0.4)" : "0 0 0 3px rgba(61,217,255,0.08)",
                  }}
                />
                {flash === "correct" && <div style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", fontSize: 22 }}>✅</div>}
                {flash === "wrong"   && <div style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", fontSize: 22 }}>❌</div>}
              </div>

              <div style={{ marginTop: 10, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                Just type — words auto-submit when matched • Press Enter to skip (−combo)
              </div>
            </div>
          )}

          {/* GAME OVER */}
          {status === "over" && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>🏁</div>
              <h2 style={{ margin: "0 0 4px", fontSize: 28, fontWeight: 900 }}>Time&apos;s Up!</h2>
              <p style={{ color: "var(--muted)", marginBottom: 24, fontSize: 16 }}>Here&apos;s how you did:</p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 28, textAlign: "left" }}>
                {[
                  { label: "Final Score", value: score, color: "#3dd9ff" },
                  { label: "Best Score", value: bestScore, color: "#f59e0b" },
                  { label: "Words Typed", value: totalTyped, color: "#10b981" },
                  { label: "Max Combo", value: `${maxCombo}x`, color: "#a78bfa" },
                  { label: "Accuracy", value: `${accuracy}%`, color: accuracy >= 80 ? "#10b981" : "#f59e0b" },
                  { label: "Difficulty", value: diffConfig[difficulty].label, color: diffConfig[difficulty].color },
                ].map(item => (
                  <div key={item.label} style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: item.color }}>{item.value}</div>
                  </div>
                ))}
              </div>

              {score === bestScore && score > 0 && (
                <div style={{ marginBottom: 20, padding: "10px 20px", borderRadius: 12, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b", fontWeight: 700, fontSize: 15 }}>
                  🏆 New Personal Best!
                </div>
              )}

              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <button
                  onClick={startGame}
                  style={{
                    background: "linear-gradient(135deg,#3dd9ff,#10b981)", color: "#000",
                    border: "none", borderRadius: 12, padding: "12px 28px",
                    fontSize: 15, fontWeight: 900, cursor: "pointer",
                    boxShadow: "0 6px 20px rgba(61,217,255,0.35)",
                  }}
                >🔄 Play Again</button>
                <button
                  onClick={() => setStatus("idle")}
                  style={{
                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 12, padding: "12px 28px", fontSize: 15, fontWeight: 700,
                    cursor: "pointer", color: "var(--text)",
                  }}
                >Change Difficulty</button>
              </div>
            </div>
          )}
        </section>

        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* How to play */}
          <div className="panel-card" style={{ padding: 20 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 800, background: "linear-gradient(90deg,#3dd9ff,#10b981)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              How to Play
            </h3>
            {[
              { icon: "👀", text: "3 words appear on screen" },
              { icon: "⌨️", text: "Type any word you see" },
              { icon: "✅", text: "Words auto-match as you type" },
              { icon: "🔥", text: "Build combos for bonus points" },
              { icon: "⏱️", text: "60 seconds — type as many as you can!" },
              { icon: "⬆️", text: "Higher difficulty = more points" },
            ].map((tip, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, fontSize: 13, color: "var(--muted)" }}>
                <span style={{ fontSize: 17 }}>{tip.icon}</span>
                {tip.text}
              </div>
            ))}
          </div>

          {/* Scoring */}
          <div className="panel-card" style={{ padding: 20 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 800 }}>Scoring</h3>
            {Object.entries(diffConfig).map(([key, cfg]) => (
              <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, padding: "8px 12px", borderRadius: 10, background: difficulty === key ? `${cfg.color}10` : "rgba(255,255,255,0.03)", border: `1px solid ${difficulty === key ? cfg.color + "40" : "rgba(255,255,255,0.06)"}` }}>
                <span style={{ fontWeight: 700, color: cfg.color, fontSize: 14 }}>{cfg.icon} {cfg.label}</span>
                <span style={{ color: "var(--muted)", fontSize: 13 }}>+{diffPoints[key]} pts/word</span>
              </div>
            ))}
            <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: 10, background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", fontSize: 13, color: "var(--muted)" }}>
              🔥 Combo ×N → pts × (1 + N×0.3)
            </div>
          </div>

          {/* Live stats while playing */}
          {status === "playing" && (
            <div className="panel-card" style={{ padding: 16, background: "linear-gradient(135deg,rgba(61,217,255,0.05),rgba(16,185,129,0.05))", borderColor: "rgba(61,217,255,0.2)" }}>
              <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Live Stats</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { label: "Words Correct", val: totalTyped, color: "#10b981" },
                  { label: "Mistakes", val: wrongCount, color: "#ef4444" },
                  { label: "Current Combo", val: `${combo}×`, color: "#a78bfa" },
                ].map(s => (
                  <div key={s.label} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, color: "var(--muted)" }}>{s.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: s.color }}>{s.val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <Leaderboard gameName="Word Blitz" />
      </div>
    </main>
  );
}
