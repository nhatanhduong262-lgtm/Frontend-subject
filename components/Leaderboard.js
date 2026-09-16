import { useEffect, useState } from 'react';
import { useGameEffects } from '../context/GameEffectsContext';

export default function Leaderboard({ gameName }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const { lastScoreSavedAt } = useGameEffects();

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      // Determine the API base URL from the current window location
      // Since API is served on the same host but port 5000 in dev
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiUrl}/leaderboard/${encodeURIComponent(gameName)}`);
      
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);
      }
    } catch (err) {
      console.error("Failed to fetch leaderboard", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (gameName) {
      fetchLeaderboard();
      
      // Auto refresh leaderboard every 30 seconds to make it feel "live"
      const interval = setInterval(fetchLeaderboard, 30000);
      return () => clearInterval(interval);
    }
  }, [gameName, lastScoreSavedAt]);

  return (
    <div className="panel-card" style={{ marginTop: 24 }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        🏆 Top Server
      </h2>
      
      {loading ? (
        <div style={{ color: 'var(--muted)', padding: '16px 0', textAlign: 'center' }}>
          Loading live scores...
        </div>
      ) : leaderboard.length === 0 ? (
        <div style={{ color: 'var(--muted)', padding: '16px 0', textAlign: 'center' }}>
          No records yet. Be the first to score!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {leaderboard.map((entry, index) => (
            <div 
              key={`${entry.playerName}-${index}`} 
              style={{
                display: 'flex', 
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: index === 0 ? 'rgba(255, 209, 102, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                border: index === 0 ? '1px solid rgba(255, 209, 102, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: index === 0 ? '#ffd166' : index === 1 ? '#e0e0e0' : index === 2 ? '#cd7f32' : 'var(--border-color)',
                  color: index < 3 ? '#000' : 'var(--text-main)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 'bold', fontSize: 14
                }}>
                  {index + 1}
                </div>
                <strong style={{ fontSize: 15, color: index === 0 ? '#ffd166' : 'var(--text-main)' }}>
                  {entry.playerName}
                </strong>
              </div>
              <strong style={{ fontSize: 18, color: 'var(--accent-teal)' }}>
                {entry.score}
              </strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
