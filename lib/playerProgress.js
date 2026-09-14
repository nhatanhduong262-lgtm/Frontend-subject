import { createClient } from '@supabase/supabase-js';

// Returns a user-scoped key so different accounts never share data
export function getProgressKey() {
  if (typeof window === 'undefined') return 'pixelpulse-player-progress:guest';
  const uid = window.localStorage.getItem('userId') || 'guest';
  return `pixelpulse-player-progress:${uid}`;
}

// Keep the old exported constant for any external references (returns guest key at module load time)
export const PLAYER_PROGRESS_KEY = 'pixelpulse-player-progress';

export const DEFAULT_PLAYER_PROGRESS = [
  { title: 'Sky Hopper', genre: 'Arcade', progress: 0, href: '/flappy', image: '/images/sky_hopper_1789299722470.png' },
  { title: 'Neon Match', genre: 'Puzzle', progress: 0, href: '/memory', image: '/images/neon_match_1789299759422.png' },
  { title: 'Pulse Reflex', genre: 'Speed', progress: 0, href: '/reaction', image: '/images/pulse_reflex_1789299783039.png' },
  { title: 'Pong Arena', genre: 'Arcade', progress: 0, href: '/pong', image: '/images/pong_arena_1789299746830.png' },
  { title: 'Neon Snake', genre: 'Arcade', progress: 0, href: '/snake', image: '/images/neon_snake_1789299734826.png' },
  { title: 'Lucky Dice', genre: 'Chance', progress: 0, href: '/dice', image: '/images/lucky_dice_1789299795505.png' },
  { title: 'Aim Blaster', genre: 'Action', progress: 0, href: '/aimblaster', image: '/images/aim_blaster.png' },
  { title: 'Number Crush', genre: 'Puzzle', progress: 0, href: '/numbercrush', image: '/images/number_crush.png' },
  { title: 'Color Storm', genre: 'Memory', progress: 0, href: '/colorstorm', image: '/images/color_storm.png' },
  { title: 'Brick Blaster', genre: 'Arcade', progress: 0, href: '/brickblaster', image: '/images/brick_blaster.png' },
  { title: 'Word Blitz', genre: 'Speed', progress: 0, href: '/wordblitz', image: '/images/word_blitz.png' },
];

export function clampProgress(value) {
  if (!Number.isFinite(Number(value))) return 0;
  return Math.min(100, Math.max(0, Number(value)));
}

export function normalizeProgressList(value) {
  if (!Array.isArray(value) || value.length === 0) {
    return DEFAULT_PLAYER_PROGRESS.map((game) => ({ ...game, playtime: 0 }));
  }

  const items = value.map((entry) => ({
    title: String(entry?.title || 'Untitled game'),
    genre: String(entry?.genre || 'Arcade'),
    progress: clampProgress(entry?.progress || 0),
    score: Number(entry?.score || 0),
    playtime: Number(entry?.playtime || 0),
    href: entry?.href || '/games',
  }));

  const fallbacks = DEFAULT_PLAYER_PROGRESS.map((game) => ({ ...game, playtime: 0 }));

  return fallbacks.map((fallback) => {
    const match = items.find((item) => item.title === fallback.title || item.href === fallback.href);
    return match ? { ...fallback, ...match, progress: clampProgress(match.progress) } : fallback;
  });
}

export function addPlaytimeRecord(gameMeta, seconds) {
  const current = getStoredPlayerProgress();
  const nextEntry = {
    title: gameMeta.title,
    genre: gameMeta.genre,
    href: gameMeta.href,
  };

  const nextProgress = current.map((entry) => {
    if (entry.title === nextEntry.title || entry.href === nextEntry.href) {
      return { ...entry, playtime: (Number(entry.playtime) || 0) + seconds };
    }
    return entry;
  });

  if (!nextProgress.some((entry) => entry.title === nextEntry.title || entry.href === nextEntry.href)) {
    nextProgress.push({ ...nextEntry, playtime: seconds, progress: 0, score: 0 });
  }

  return savePlayerProgressToDatabase(nextProgress);
}

export function getStoredPlayerProgress() {
  if (typeof window === 'undefined') return DEFAULT_PLAYER_PROGRESS.map((game) => ({ ...game }));

  try {
    const value = JSON.parse(window.localStorage.getItem(getProgressKey()) || 'null');
    return normalizeProgressList(value);
  } catch (error) {
    console.warn('Unable to parse saved player progress', error);
    return DEFAULT_PLAYER_PROGRESS.map((game) => ({ ...game }));
  }
}

export function persistPlayerProgress(nextProgress) {
  if (typeof window === 'undefined') return;

  const normalized = normalizeProgressList(nextProgress);
  window.localStorage.setItem(getProgressKey(), JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent('pixelpulse-progress-updated', { detail: normalized }));
  return normalized;
}

export function getProgressFromScore(value, mode = 'direct', target = 100) {
  if (mode === 'inverse') {
    return clampProgress((1 - Math.min(1, Math.max(0, Number(value || 0) / Number(target || 1)))) * 100);
  }

  return clampProgress((Math.min(Number(value || 0), Number(target || 1)) / Number(target || 1)) * 100);
}

export function mergeProgressRecord(gameMeta, scoreValue, mode = 'direct', target = 100) {
  const current = getStoredPlayerProgress();
  const nextEntry = {
    title: gameMeta.title,
    genre: gameMeta.genre,
    href: gameMeta.href,
    progress: getProgressFromScore(scoreValue, mode, target),
    score: Number(scoreValue) || 0,
  };

  const nextProgress = current.map((entry) => {
    if (entry.title === nextEntry.title || entry.href === nextEntry.href) {
      return { ...entry, ...nextEntry };
    }
    return entry;
  });

  if (!nextProgress.some((entry) => entry.title === nextEntry.title || entry.href === nextEntry.href)) {
    nextProgress.push(nextEntry);
  }

  return savePlayerProgressToDatabase(nextProgress);
}

export async function savePlayerProgressToDatabase(nextProgress) {
  if (typeof window === 'undefined') return nextProgress;

  const userId = window.localStorage.getItem('userId');
  const token = window.localStorage.getItem('token');
  const normalized = normalizeProgressList(nextProgress);

  if (!userId || !token) {
    return persistPlayerProgress(normalized);
  }

  try {
    const response = await fetch(`/api/users/${userId}/progress`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ progress: normalized }),
    });

    if (!response.ok) {
      throw new Error('Unable to sync progress to database.');
    }

    const json = await response.json();
    const syncedProgress = normalizeProgressList(json?.progress || normalized);
    return persistPlayerProgress(syncedProgress);
  } catch (error) {
    console.warn('Database sync failed. Falling back to local storage.', error);
    return persistPlayerProgress(normalized);
  }
}

export async function loadPlayerProgressFromDatabase() {
  if (typeof window === 'undefined') return DEFAULT_PLAYER_PROGRESS.map((game) => ({ ...game }));

  const userId = window.localStorage.getItem('userId');
  const token = window.localStorage.getItem('token');

  if (!userId || !token) {
    return getStoredPlayerProgress();
  }

  try {
    const response = await fetch(`/api/users/${userId}/progress`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      return getStoredPlayerProgress();
    }

    const json = await response.json();
    const nextProgress = normalizeProgressList(json?.progress || []);
    persistPlayerProgress(nextProgress);
    return nextProgress;
  } catch (error) {
    console.warn('Unable to fetch remote progress.', error);
    return getStoredPlayerProgress();
  }
}

export function subscribeToUserProgress(userId, onProgress) {
  if (typeof window === 'undefined' || !userId) {
    return () => {};
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

  if (!url || !key || url.includes('replace-with-your-project') || key.includes('replace-with-your-project')) {
    return () => {};
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const channel = supabase
    .channel(`progress:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
        filter: `id=eq.${userId}`,
      },
      (payload) => {
        const nextProgress = normalizeProgressList(payload?.new?.progress_data || []);
        persistPlayerProgress(nextProgress);
        onProgress?.(nextProgress);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function resetPlayerProgress() {
  if (typeof window !== 'undefined') {
    const uid = window.localStorage.getItem('userId') || 'guest';
    const keysToClear = [
      "numbercrush-best",
      "snake-best",
      "reaction-best",
      "colorstorm-best",
      "memory-best",
      "aimblaster-best",
      `brickblaster-best-${uid}`,
      `wordblitz-best-${uid}`,
      `pixelpulse-quests:${uid}`,
      getProgressKey(),
    ];
    keysToClear.forEach(key => window.localStorage.removeItem(key));
  }
  return savePlayerProgressToDatabase([]);
}

// Called on login to wipe any stale guest/previous-user data from localStorage
export function clearProgressCacheForUser() {
  if (typeof window === 'undefined') return;
  // Remove old shared (non-user-scoped) keys so they don't bleed into new sessions
  window.localStorage.removeItem('pixelpulse-player-progress');
  window.localStorage.removeItem('pixelpulse-quests');
}
