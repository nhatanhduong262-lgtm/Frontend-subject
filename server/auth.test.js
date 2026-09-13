const test = require('node:test');
const assert = require('node:assert/strict');

const { hashPassword, verifyPassword, signToken, verifyToken } = require('./auth');
const app = require('./index');

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

test('server can be imported without Supabase env vars for deployment-safe builds', () => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  const modulePath = require.resolve('./index');
  delete require.cache[modulePath];

  const app = require('./index');
  assert.ok(app);
});

test('express registers a single change-password route', () => {
  const routePaths = [];
  const stack = app.router?.stack || [];

  for (const layer of stack) {
    if (layer.route && layer.route.path) {
      routePaths.push(layer.route.path);
    }
  }

  const changePasswordRoutes = routePaths.filter((route) => route === '/change-password/:id');
  assert.equal(changePasswordRoutes.length, 1);
});
