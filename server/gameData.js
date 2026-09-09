function normalizeProgress(value) {
  if (Number.isNaN(Number(value))) return 0;
  const numericValue = Number(value);
  if (numericValue < 0) return 0;
  if (numericValue > 100) return 100;
  return numericValue;
}

function buildGameSummary(games = []) {
  const totalGames = games.length;
  const liveGames = games.filter((game) => game.status === 'Live').length;
  const averageProgress = totalGames === 0
    ? 0
    : Math.round(games.reduce((sum, game) => sum + normalizeProgress(game.progress || 0), 0) / totalGames);

  return {
    totalGames,
    liveGames,
    averageProgress,
  };
}

function buildLeaderboard(players = []) {
  return [...players]
    .map((player) => ({
      ...player,
      normalizedProgress: normalizeProgress(player.progress || 0),
      xp: Number(player.xp || 0),
    }))
    .sort((a, b) => {
      if (b.normalizedProgress !== a.normalizedProgress) {
        return b.normalizedProgress - a.normalizedProgress;
      }
      return b.xp - a.xp;
    })
    .map((player, index) => ({
      ...player,
      rank: index + 1,
    }));
}

function buildProgressStats(playerProgress = []) {
  const totalStages = playerProgress.length;
  const completedStages = playerProgress.filter((stage) => normalizeProgress(stage.progress || 0) >= 100).length;
  const averageProgress = totalStages === 0
    ? 0
    : Math.round(playerProgress.reduce((sum, stage) => sum + normalizeProgress(stage.progress || 0), 0) / totalStages);

  return {
    totalStages,
    completedStages,
    averageProgress,
  };
}

module.exports = {
  normalizeProgress,
  buildGameSummary,
  buildLeaderboard,
  buildProgressStats,
};
