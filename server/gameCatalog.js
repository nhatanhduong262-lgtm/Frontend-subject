function clampProgress(value) {
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return 0;
  return Math.min(100, Math.max(0, numericValue));
}

function normalizeGamePayload(game = {}, fallbackId = Date.now()) {
  const title = String(game.title || '').trim();
  const genre = String(game.genre || 'Action').trim() || 'Action';
  const status = String(game.status || 'Live').trim();
  const stage = String(game.stage || 'Stage 1').trim() || 'Stage 1';
  const description = String(game.description || '').trim();

  return {
    id: Number(game.id ?? fallbackId),
    title: title || 'Untitled Game',
    genre: genre,
    stage,
    progress: clampProgress(game.progress ?? 0),
    status: status === 'new' ? 'New' : status === 'coming soon' ? 'Coming Soon' : status === 'live' ? 'Live' : status || 'Live',
    description,
    players: Number(game.players ?? 0),
    createdAt: game.createdAt || new Date().toISOString(),
  };
}

function buildGameCatalogSummary(games = []) {
  const totalGames = games.length;
  const liveGames = games.filter((game) => String(game.status).toLowerCase() === 'live').length;
  const newGames = games.filter((game) => String(game.status).toLowerCase() === 'new').length;
  const averageProgress = totalGames === 0
    ? 0
    : Math.round(games.reduce((sum, game) => sum + clampProgress(game.progress || 0), 0) / totalGames);

  return {
    totalGames,
    liveGames,
    newGames,
    averageProgress,
  };
}

module.exports = {
  clampProgress,
  normalizeGamePayload,
  buildGameCatalogSummary,
};
