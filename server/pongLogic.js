function createInitialPongState() {
  return {
    leftY: 190,
    rightY: 190,
    ballX: 400,
    ballY: 240,
    vx: 5,
    vy: 3,
    leftScore: 0,
    rightScore: 0,
    winner: null,
  };
}

function stepPongState(state, controls = {}) {
  const leftMove = controls.leftDown ? 8 : controls.leftUp ? -8 : 0;
  const rightMove = controls.rightDown ? 8 : controls.rightUp ? -8 : 0;

  const nextLeftY = Math.min(430, Math.max(0, state.leftY + leftMove));
  const nextRightY = Math.min(430, Math.max(0, state.rightY + rightMove));

  let nextBallX = state.ballX + state.vx;
  let nextBallY = state.ballY + state.vy;
  let nextVx = state.vx;
  let nextVy = state.vy;
  let leftScore = state.leftScore;
  let rightScore = state.rightScore;

  if (nextBallY <= 0 || nextBallY >= 480) {
    nextVy *= -1;
    nextBallY = Math.min(480, Math.max(0, nextBallY));
  }

  if (nextBallX <= 25 && nextBallY >= nextLeftY && nextBallY <= nextLeftY + 100) {
    nextVx = Math.abs(nextVx) + 0.5;
    nextBallX = 25;
  }

  if (nextBallX >= 775 && nextBallY >= nextRightY && nextBallY <= nextRightY + 100) {
    nextVx = -Math.abs(nextVx) - 0.5;
    nextBallX = 775;
  }

  if (nextBallX < 0) {
    rightScore += 1;
    nextBallX = 400;
    nextBallY = 240;
    nextVx = 5;
    nextVy = 3;
  }

  if (nextBallX > 800) {
    leftScore += 1;
    nextBallX = 400;
    nextBallY = 240;
    nextVx = -5;
    nextVy = 3;
  }

  return {
    ...state,
    leftY: nextLeftY,
    rightY: nextRightY,
    ballX: nextBallX,
    ballY: nextBallY,
    vx: nextVx,
    vy: nextVy,
    leftScore,
    rightScore,
    winner: leftScore >= 7 || rightScore >= 7 ? (leftScore > rightScore ? 'left' : 'right') : null,
  };
}

module.exports = {
  createInitialPongState,
  stepPongState,
};
