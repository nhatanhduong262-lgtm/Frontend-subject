const test = require('node:test');
const assert = require('node:assert/strict');

const { requireAdminAccess, requireUserAccess } = require('./routeGuard');

test('admin access is allowed for admin role', () => {
  const req = { user: { role: 'admin' } };
  const res = { statusCode: 200, json: () => ({}) };
  const next = () => { res.statusCode = 200; };

  requireAdminAccess(req, res, next);
  assert.equal(res.statusCode, 200);
});

test('user access is denied for non-owner and non-admin requests', () => {
  const req = { user: { userId: 2, role: 'user' }, params: { id: '5' } };
  let statusCode = 200;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      return payload;
    },
  };

  requireUserAccess('id')(req, res, () => {});
  assert.equal(statusCode, 403);
});
