import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import BackButton from "../components/BackButton";
import { mergeProgressRecord } from "../lib/playerProgress";

const SYMBOLS = ["⚡", "🎯", "🪐", "🚀", "🌙", "💎"];

function shuffleCards() {
  const deck = [...SYMBOLS, ...SYMBOLS]
    .map((symbol, index) => ({ id: `${symbol}-${index}`, symbol, matched: false }))
    .sort(() => Math.random() - 0.5);

  return deck;
}

export default function MemoryPage() {
  const router = useRouter();
  const [cards, setCards] = useState([]);
  const [flippedIndexes, setFlippedIndexes] = useState([]);
  const [matchedSymbols, setMatchedSymbols] = useState([]);
  const [moves, setMoves] = useState(0);
  const [bestMoves, setBestMoves] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [isWon, setIsWon] = useState(false);

  const resetGame = () => {
    setCards(shuffleCards());
    setFlippedIndexes([]);
    setMatchedSymbols([]);
    setMoves(0);
    setIsLocked(false);
    setIsWon(false);
  };

  useEffect(() => {
    if (!window.localStorage.getItem("userId")) {
      router.replace("/login");
      return undefined;
    }

    const savedBest = Number(window.localStorage.getItem("memory-best") || 0);
    setBestMoves(savedBest || 0);
    resetGame();
    return undefined;
  }, [router]);

  useEffect(() => {
    if (flippedIndexes.length !== 2) return undefined;

    const [firstIndex, secondIndex] = flippedIndexes;
    const firstCard = cards[firstIndex];
    const secondCard = cards[secondIndex];

    if (!firstCard || !secondCard) return undefined;

    setIsLocked(true);
    setMoves((current) => current + 1);

    if (firstCard.symbol === secondCard.symbol) {
      const nextMatched = [...matchedSymbols, firstCard.symbol];
      setMatchedSymbols(nextMatched);
      setCards((current) =>
        current.map((card, index) => {
          if (index === firstIndex || index === secondIndex) {
            return { ...card, matched: true };
          }
          return card;
        }),
      );

      const timer = window.setTimeout(() => {
        setFlippedIndexes([]);
        setIsLocked(false);
      }, 500);

      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => {
      setFlippedIndexes([]);
      setIsLocked(false);
    }, 700);

    return () => window.clearTimeout(timer);
  }, [cards, flippedIndexes, matchedSymbols]);

  useEffect(() => {
    if (matchedSymbols.length === SYMBOLS.length && cards.length > 0) {
      setIsWon(true);

      const nextBest = bestMoves === 0 || moves < bestMoves ? moves : bestMoves;
      setBestMoves(nextBest);
      window.localStorage.setItem("memory-best", String(nextBest));
      mergeProgressRecord(
        { title: "Neon Match", genre: "Puzzle", href: "/memory" },
        nextBest,
        "inverse",
        18,
      );
    }
  }, [bestMoves, cards.length, matchedSymbols.length, moves]);

  const handleCardClick = (index) => {
    if (isLocked || flippedIndexes.includes(index)) return;

    const selectedCard = cards[index];
    if (!selectedCard || selectedCard.matched) return;

    const nextFlipped = [...flippedIndexes, index];
    setFlippedIndexes(nextFlipped);
  };

  return (
    <main className="dashboard-shell" style={{ minHeight: "100vh" }}>
      <header className="dashboard-header" style={{ marginBottom: 26 }}>
        <div>
          <div className="brand-mark">
            <span className="brand-dot" />
            PixelPulse
          </div>
          <h1>Neon Match</h1>
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
          <span className="label">Moves</span>
          <strong>{moves}</strong>
        </div>
        <div className="stat-card">
          <span className="label">Best</span>
          <strong>{bestMoves || "—"}</strong>
        </div>
        <div className="stat-card">
          <span className="label">State</span>
          <strong>{isWon ? "Cleared" : "Live"}</strong>
        </div>
        <div className="stat-card">
          <span className="label">Pairs</span>
          <strong>{matchedSymbols.length}/{SYMBOLS.length}</strong>
        </div>
      </div>

      <section className="panel-card" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0 }}>Match every rune pair</h2>
            <p style={{ margin: "8px 0 0", color: "var(--muted)" }}>
              Find every matching symbol in the fewest moves possible.
            </p>
          </div>

          <button type="button" className="primary-button" onClick={resetGame}>
            New round
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(68px, 1fr))",
            gap: 14,
            maxWidth: 560,
            margin: "0 auto",
          }}
        >
          {cards.map((card, index) => {
            const isFaceUp = flippedIndexes.includes(index) || card.matched;

            return (
              <button
                key={card.id}
                type="button"
                onClick={() => handleCardClick(index)}
                style={{
                  aspectRatio: "1",
                  borderRadius: 18,
                  border: isFaceUp ? "1px solid rgba(122, 214, 255, 0.8)" : "1px solid rgba(255,255,255,0.13)",
                  background: isFaceUp
                    ? "linear-gradient(135deg, rgba(61, 217, 255, 0.2), rgba(139, 92, 246, 0.32))"
                    : "linear-gradient(135deg, rgba(15, 24, 42, 0.96), rgba(25, 38, 74, 0.9))",
                  color: isFaceUp ? "#f8fbff" : "rgba(255,255,255,0.6)",
                  fontSize: "clamp(1.5rem, 4vw, 2.1rem)",
                  fontWeight: 700,
                  boxShadow: isFaceUp ? "0 18px 32px rgba(61, 217, 255, 0.18)" : "inset 0 0 0 1px rgba(255,255,255,0.04)",
                  cursor: isLocked && !card.matched ? "default" : "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                {isFaceUp ? card.symbol : "?"}
              </button>
            );
          })}
        </div>

        {isWon && (
          <div
            style={{
              marginTop: 22,
              padding: "16px 18px",
              borderRadius: 16,
              background: "linear-gradient(135deg, rgba(32, 197, 128, 0.13), rgba(61, 217, 255, 0.12))",
              border: "1px solid rgba(126, 247, 211, 0.4)",
              color: "var(--text)",
              textAlign: "center",
              fontWeight: 700,
            }}
          >
            You cleared the board in {moves} moves.
          </div>
        )}
      </section>
    </main>
  );
}
