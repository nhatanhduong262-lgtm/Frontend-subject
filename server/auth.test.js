const test = require('node:test');
const assert = require('node:assert/strict');

const { hashPassword, verifyPassword, signToken, verifyToken } = require('./auth');

test('password hashing and verification work together', () => {
  const password = 'StrongPass!123';
  const hashed = hashPassword(password);

  assert.notEqual(hashed, password);
  assert.equal(verifyPassword(password, hashed), true);
  assert.equal(verifyPassword('wrong-password', hashed), false);
});

test('jwt tokens preserve user identity and role', () => {
  const payload = { userId: 42, email: 'admin@example.com', role: 'admin' };
  const token = signToken(payload);
  const decoded = verifyToken(token);

  assert.equal(decoded.userId, 42);
  assert.equal(decoded.email, 'admin@example.com');
  assert.equal(decoded.role, 'admin');
});
