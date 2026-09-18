import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

export function useRealtimeGames() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial fetch
    const fetchGames = async () => {
      try {
        const res = await fetch(`/api/games?t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.games) setGames(data.games);
        }
      } catch (err) {
        console.error("Failed to fetch games", err);
      } finally {
        setLoading(false);
      }
    };
    fetchGames();

    // Realtime subscription setup
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
    
    if (!url || !key) {
      console.warn("Supabase credentials missing for realtime games sync.");
      return;
    }

    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const channel = supabase.channel('public:games')
      .on(
        'broadcast',
        { event: 'game_updated' },
        (payload) => {
          if (payload && payload.payload && payload.payload.game) {
            const updatedGame = payload.payload.game;
            setGames(prevGames => {
              const existingIndex = prevGames.findIndex(g => Number(g.id) === Number(updatedGame.id));
              if (existingIndex >= 0) {
                const newGames = [...prevGames];
                newGames[existingIndex] = { ...prevGames[existingIndex], ...updatedGame };
                return newGames;
              } else {
                return [updatedGame, ...prevGames];
              }
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { games, setGames, loading };
}
