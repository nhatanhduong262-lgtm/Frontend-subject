import { createClient } from '@supabase/supabase-js';

export const PLAYER_PROGRESS_KEY = 'pixelpulse-player-progress';

export const DEFAULT_PLAYER_PROGRESS = [
  { title: 'Sky Hopper', genre: 'Arcade', progress: 0, href: '/flappy' },
  { title: 'Neon Match', genre: 'Puzzle', progress: 0, href: '/memory' },
  { title: 'Pulse Reflex', genre: 'Speed', progress: 0, href: '/reaction' },
  { title: 'Pong Arena', genre: 'Arcade', progress: 0, href: '/pong' },
];

export function clampProgress(value) {
  if (!Number.isFinite(Number(value))) return 0;
  return Math.min(100, Math.max(0, Number(value)));
}

export function normalizeProgressList(value) {
  if (!Array.isArray(value) || value.length === 0) {
    return DEFAULT_PLAYER_PROGRESS.map((game) => ({ ...game }));
  }

  const items = value.map((entry) => ({
    title: String(entry?.title || 'Untitled game'),
    genre: String(entry?.genre || 'Arcade'),
    progress: clampProgress(entry?.progress || 0),
    href: entry?.href || '/games',
  }));

  const fallbacks = DEFAULT_PLAYER_PROGRESS.map((game) => ({ ...game }));

  return fallbacks.map((fallback) => {
    const match = items.find((item) => item.title === fallback.title || item.href === fallback.href);
    return match ? { ...fallback, ...match, progress: clampProgress(match.progress) } : fallback;
  });
}

export function getStoredPlayerProgress() {
  if (typeof window === 'undefined') return DEFAULT_PLAYER_PROGRESS.map((game) => ({ ...game }));

  try {
    const value = JSON.parse(window.localStorage.getItem(PLAYER_PROGRESS_KEY) || 'null');
    return normalizeProgressList(value);
  } catch (error) {
    console.warn('Unable to parse saved player progress', error);
    return DEFAULT_PLAYER_PROGRESS.map((game) => ({ ...game }));
  }
}

export function persistPlayerProgress(nextProgress) {
  if (typeof window === 'undefined') return;

  const normalized = normalizeProgressList(nextProgress);
  window.localStorage.setItem(PLAYER_PROGRESS_KEY, JSON.stringify(normalized));
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
