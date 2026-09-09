const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeGamePayload, buildGameCatalogSummary } = require('./gameCatalog');

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
