const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeGamePayload, buildGameCatalogSummary, updateGameInList, removeGameFromList } = require('./gameCatalog');

test('normalizeGamePayload fills defaults and sanitizes values', () => {
  const game = normalizeGamePayload({
    title: '  Neon Rush  ',
    genre: '  Racing  ',
    status: 'live',
    stage: ' Stage 4 ',
    progress: '82',
    description: '  Fast arcade action  ',
  }, 101);

  assert.equal(game.id, 101);
  assert.equal(game.title, 'Neon Rush');
  assert.equal(game.genre, 'Racing');
  assert.equal(game.status, 'Live');
  assert.equal(game.stage, 'Stage 4');
  assert.equal(game.progress, 82);
  assert.equal(game.description, 'Fast arcade action');
});

test('buildGameCatalogSummary counts live and new games correctly', () => {
  const summary = buildGameCatalogSummary([
    { status: 'Live', progress: 82 },
    { status: 'New', progress: 24 },
    { status: 'Coming Soon', progress: 0 },
    { status: 'Live', progress: 45 },
  ]);

  assert.equal(summary.totalGames, 4);
  assert.equal(summary.liveGames, 2);
  assert.equal(summary.newGames, 1);
  assert.equal(summary.averageProgress, 38);
});

test('updateGameInList replaces the selected game with normalized form data', () => {
  const original = [
    { id: 1, title: 'Nightfall Circuit', status: 'Live', players: 1240, progress: 78, genre: 'Racing', stage: 'Stage 1', description: 'Old description' },
    { id: 2, title: 'Echo Rift', status: 'Live', players: 980, progress: 62, genre: 'Action RPG', stage: 'Stage 2', description: 'Keep this' },
  ];

  const next = updateGameInList(original, 1, {
    title: '  Nightfall Circuit  ',
    genre: 'Racing',
    status: 'new',
    stage: ' Stage 5 ',
    progress: 91,
    description: '  Updated description  ',
    players: 1500,
  });

  assert.equal(next[0].title, 'Nightfall Circuit');
  assert.equal(next[0].status, 'New');
  assert.equal(next[0].stage, 'Stage 5');
  assert.equal(next[0].progress, 91);
  assert.equal(next[0].description, 'Updated description');
  assert.equal(next[1].title, 'Echo Rift');
});

test('removeGameFromList removes the selected game while keeping the rest intact', () => {
  const original = [
    { id: 1, title: 'Nightfall Circuit', status: 'Live', players: 1240, progress: 78 },
    { id: 2, title: 'Echo Rift', status: 'Live', players: 980, progress: 62 },
    { id: 3, title: 'Crystal Drift', status: 'New', players: 430, progress: 24 },
  ];

  const next = removeGameFromList(original, 2);

  assert.equal(next.length, 2);
  assert.equal(next[0].id, 1);
  assert.equal(next[1].id, 3);
});
