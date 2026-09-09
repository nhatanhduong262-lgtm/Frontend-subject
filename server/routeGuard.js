function requireAdminAccess(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access is required.' });
  }
  return next();
}

function requireUserAccess(paramName = 'id') {
  return (req, res, next) => {
    const requester = req.user;
    const targetId = String(req.params[paramName] || '');

    if (!requester) {
      return res.status(401).json({ message: 'Authentication is required.' });
    }

    if (requester.role === 'admin' || String(requester.userId) === targetId) {
      return next();
    }

    return res.status(403).json({ message: 'You can only access your own resource.' });
  };
}

module.exports = {
  requireAdminAccess,
  requireUserAccess,
};
