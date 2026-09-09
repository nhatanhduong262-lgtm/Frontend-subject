const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeProgress, buildGameSummary, buildLeaderboard, buildProgressStats } = require('./gameData');

test('normalizeProgress clamps invalid values inside the allowed range', () => {
  assert.equal(normalizeProgress(-10), 0);
  assert.equal(normalizeProgress(140), 100);
  assert.equal(normalizeProgress(72), 72);
});

test('buildGameSummary calculates totals and average progress correctly', () => {
  const summary = buildGameSummary([
    { status: 'Live', progress: 80 },
    { status: 'Live', progress: 60 },
    { status: 'Coming Soon', progress: 25 },
  ]);

  assert.equal(summary.totalGames, 3);
  assert.equal(summary.liveGames, 2);
  assert.equal(summary.averageProgress, 55);
});

test('buildLeaderboard ranks players by progress and xp', () => {
  const leaderboard = buildLeaderboard([
    { name: 'Ava', progress: 70, xp: 1500 },
    { name: 'Kai', progress: 90, xp: 2200 },
    { name: 'Leo', progress: 90, xp: 1800 },
  ]);

  assert.equal(leaderboard[0].name, 'Kai');
  assert.equal(leaderboard[1].name, 'Leo');
  assert.equal(leaderboard[2].name, 'Ava');
});

test('buildProgressStats calculates total and average stage completion', () => {
  const stats = buildProgressStats([
    { progress: 100 },
    { progress: 45 },
    { progress: 80 },
    { progress: 100 },
  ]);

  assert.equal(stats.totalStages, 4);
  assert.equal(stats.completedStages, 2);
  assert.equal(stats.averageProgress, 81);
});
