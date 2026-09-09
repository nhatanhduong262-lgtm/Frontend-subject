const test = require('node:test');
const assert = require('node:assert/strict');
const { createInitialPongState, stepPongState } = require('./pongLogic');

test('createInitialPongState creates a centered ball and neutral score', () => {
  const state = createInitialPongState();

  assert.equal(state.leftScore, 0);
  assert.equal(state.rightScore, 0);
  assert.equal(state.ballX, 400);
  assert.equal(state.ballY, 240);
  assert.ok(state.vx !== 0);
  assert.ok(state.vy !== 0);
});

test('stepPongState moves paddles and bounces when hitting a wall', () => {
  const state = createInitialPongState();
  const moved = stepPongState({ ...state, leftY: 160, ballX: 60, ballY: 180, vx: -5, vy: 2 }, { leftDown: true, rightUp: true });

  assert.ok(moved.leftY > 160);
  assert.ok(moved.rightY < 240);
  assert.equal(moved.ballY, 182);
  assert.equal(moved.vy, 2);
});
