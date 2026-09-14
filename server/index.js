/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');
const { hashPassword, verifyPassword, signToken, verifyToken } = require('./auth');
const { validateUploadedFile } = require('./uploadRules');
const { requireAdminAccess, requireUserAccess } = require('./routeGuard');

const app = express();
const port = process.env.PORT || 5000;
const uploadDir = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(process.cwd(), 'server', 'uploads');
let supabase = null;

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set before using database features.');
  }

  if (!supabase) {
    supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  return supabase;
}

fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadDir));

app.get('/', (req, res) => {
  res.json({
    name: 'User API',
    status: 'ok',
    database: 'supabase',
    health: '/health',
  });
});

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone || '',
    role: user.role || 'user',
    avatar_url: user.avatar_url || '',
  };
}

function normalizeProgressList(value) {
  if (!Array.isArray(value)) return [];

  return value
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => ({
      title: String(entry.title || 'Untitled game'),
      genre: String(entry.genre || 'Arcade'),
      progress: Number.isFinite(Number(entry.progress)) ? Math.min(100, Math.max(0, Number(entry.progress))) : 0,
      score: Number(entry.score) || 0,
      playtime: Number(entry.playtime) || 0,
      href: entry.href || '/games',
      updatedAt: entry.updatedAt || new Date().toISOString(),
    }));
}

function isMissingProgressColumnError(error) {
  return Boolean(
    error && (
      error.code === '42703' ||
      /column.*progress_data.*does not exist/i.test(error.message || '') ||
      /column.*progress_data.*not exist/i.test(error.message || '')
    )
  );
}

function requireAuth(requiredRoles = []) {
  return (req, res, next) => {
    const rawToken = req.headers.authorization || '';
    const token = rawToken.startsWith('Bearer ') ? rawToken.slice(7) : null;
    const decoded = token ? verifyToken(token) : null;

    if (!decoded) {
      return res.status(401).json({ message: 'Authentication token is missing or invalid.' });
    }

    if (requiredRoles.length > 0 && !requiredRoles.includes(decoded.role)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action.' });
    }

    req.user = decoded;
    next();
  };
}

function requireSelfOrAdmin(paramName = 'id') {
  return (req, res, next) => {
    const requester = req.user;
    const targetId = String(req.params[paramName]);

    if (!requester || (!Number.isInteger(Number(requester.userId)) && !Number.isInteger(Number(targetId)))) {
      return res.status(401).json({ message: 'Authentication is required.' });
    }

    if (String(requester.userId) === targetId || requester.role === 'admin') {
      return next();
    }

    return res.status(403).json({ message: 'You can only access your own resource.' });
  };
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', database: 'supabase' });
});

app.get('/users', requireAuth(['admin']), async (req, res) => {
  try {
    const supabaseClient = getSupabaseClient();
    const { data, error } = await supabaseClient
      .from('users')
      .select('*')
      .order('id', { ascending: false });

    if (error) return res.status(500).send('Unable to load users.');
    res.json({ users: (data || []).map(publicUser) });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Database configuration is missing.' });
  }
});

app.get('/admin/summary', requireAuth(['admin']), async (req, res) => {
  try {
    const supabaseClient = getSupabaseClient();
    const { count: usersCount } = await supabaseClient
      .from('users')
      .select('*', { count: 'exact', head: true });

    res.json({
      summary: {
        users: usersCount || 0,
        role: 'admin',
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Database configuration is missing.' });
  }
});

app.post('/register', async (req, res) => {
  try {
    const supabaseClient = getSupabaseClient();
    const { email, password, name, phone = '' } = req.body;
    if (!email || !password || !name) return res.status(400).send('Name, email, and password are required.');

    const normalizedEmail = email.trim().toLowerCase();
    const basePayload = {
      email: normalizedEmail,
      password_hash: hashPassword(password),
      name: name.trim(),
      phone: phone.trim(),
    };

    const insertPayload = { ...basePayload, role: 'user' };
    let data;
    let error;

    ({ data, error } = await supabaseClient.from('users').insert(insertPayload).select('*').single());

    if (error && (error.code === '42703' || /column.*role.*does not exist/i.test(error.message || ''))) {
      ({ data, error } = await supabaseClient.from('users').insert(basePayload).select('*').single());
    }

    if (error) {
      if (error.code === '23505') return res.status(409).send('An account with this email already exists.');
      const cause = error.cause ? error.cause.message : '';
      return res.status(500).send(`Lỗi hệ thống: ${error.message}. ${cause}`);
    }

    res.status(201).json({ message: 'User registered', user: publicUser(data) });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Database configuration is missing.' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const supabaseClient = getSupabaseClient();
    const { email, password } = req.body;
    const { data: user, error } = await supabaseClient
      .from('users')
      .select('*')
      .ilike('email', email?.trim() || '')
      .maybeSingle();
    if (error) return res.status(500).send('Unable to sign in.');
    if (!user || !verifyPassword(password || '', user.password_hash)) return res.status(401).send('Email or password is incorrect.');

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role || 'user',
    });

    res.json({
      message: 'Login successful',
      token,
      user: publicUser(user),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Database configuration is missing.' });
  }
});

app.get('/users/:id/progress', requireAuth(), requireUserAccess('id'), async (req, res) => {
  try {
    const supabaseClient = getSupabaseClient();
    const { data, error } = await supabaseClient
      .from('users')
      .select('progress_data')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) {
      if (isMissingProgressColumnError(error)) {
        return res.json({ progress: [] });
      }
      return res.status(500).json({ message: 'Unable to load player progress.' });
    }
    if (!data) return res.status(404).json({ message: 'User not found.' });

    res.json({ progress: normalizeProgressList(data.progress_data || []) });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Database configuration is missing.' });
  }
});

app.put('/users/:id/progress', requireAuth(), requireUserAccess('id'), async (req, res) => {
  try {
    const supabaseClient = getSupabaseClient();
    const nextProgress = normalizeProgressList(req.body && Array.isArray(req.body.progress) ? req.body.progress : []);

    const { data, error } = await supabaseClient
      .from('users')
      .update({ progress_data: nextProgress })
      .eq('id', req.params.id)
      .select('progress_data')
      .maybeSingle();

    if (error) {
      if (isMissingProgressColumnError(error)) {
        return res.json({ progress: nextProgress });
      }
      return res.status(500).json({ message: 'Unable to save player progress.' });
    }
    if (!data) return res.status(404).json({ message: 'User not found.' });

    res.json({ progress: normalizeProgressList(data.progress_data || []) });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Database configuration is missing.' });
  }
});

app.put('/profile/:id', requireAuth(), requireUserAccess('id'), async (req, res) => {
  try {
    const supabaseClient = getSupabaseClient();
    const { name, email, phone = '', avatar_url = '' } = req.body;
    if (!name || !email) return res.status(400).send('Name and email are required.');

    const { data, error } = await supabaseClient
      .from('users')
      .update({ name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim(), avatar_url: avatar_url.trim() })
      .eq('id', req.params.id)
      .select('*')
      .maybeSingle();
    if (error) {
      if (error.code === '23505') return res.status(409).send('An account with this email already exists.');
      return res.status(500).send('Unable to update profile.');
    }
    if (!data) return res.status(404).send('User not found.');
    res.json({ user: publicUser(data) });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Database configuration is missing.' });
  }
});

app.put('/change-password/:id', requireAuth(), requireUserAccess('id'), async (req, res) => {
  try {
    const supabaseClient = getSupabaseClient();
    const { oldPassword, newPassword } = req.body;
    const { data: user, error } = await supabaseClient.from('users').select('*').eq('id', req.params.id).maybeSingle();
    if (error) return res.status(500).send('Unable to change password.');
    if (!user) return res.status(404).send('User not found.');
    if (!verifyPassword(oldPassword || '', user.password_hash)) return res.status(401).send('The current password is incorrect.');
    if (!newPassword) return res.status(400).send('A new password is required.');

    const { error: updateError } = await supabaseClient.from('users').update({ password_hash: hashPassword(newPassword) }).eq('id', req.params.id);
    if (updateError) return res.status(500).send('Unable to change password.');
    res.send('Password changed successfully.');
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Database configuration is missing.' });
  }
});

app.post('/upload', requireAuth(), upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    validateUploadedFile(file);

    const safeName = `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
    const fullPath = path.join(uploadDir, safeName);

    await fs.promises.writeFile(fullPath, file.buffer);

    return res.status(201).json({
      message: 'File uploaded successfully.',
      file: {
        name: safeName,
        mimeType: file.mimetype,
        size: file.size,
        url: `/uploads/${safeName}`,
      },
    });
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Upload failed.' });
  }
});

app.get('/leaderboard-global', async (req, res) => {
  try {
    const supabaseClient = getSupabaseClient();
    const { data, error } = await supabaseClient
      .from('users')
      .select('name, progress_data');

    if (error) return res.status(500).json({ message: 'Unable to load global leaderboard.' });
    
    const leaderboard = data.map(user => {
      const progressList = normalizeProgressList(user.progress_data || []);
      const xp = progressList.reduce((sum, game) => sum + (Number(game.score) || 0), 0);
      const avg = Math.round(progressList.reduce((sum, game) => sum + Number(game.progress || 0), 0) / Math.max(progressList.length, 1));
      return { name: user.name || 'Unknown', xp, progress: avg };
    })
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 10)
    .map((u, index) => ({ ...u, rank: index + 1 }));

    res.json({ leaderboard });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Database error.' });
  }
});

app.get('/leaderboard/:game_name', async (req, res) => {
  try {
    const supabaseClient = getSupabaseClient();
    const gameName = req.params.game_name;
    const { data, error } = await supabaseClient
      .from('game_logs')
      .select('score, played_at, users(name)')
      .eq('game_name', gameName)
      .order('score', { ascending: false })
      .limit(5);

    if (error) return res.status(500).json({ message: 'Unable to load leaderboard.' });
    
    // Map response to a flatter structure
    const leaderboard = (data || []).map(entry => ({
      score: entry.score,
      playedAt: entry.played_at,
      playerName: entry.users?.name || 'Unknown'
    }));

    res.json({ leaderboard });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Database error.' });
  }
});

app.post('/game_logs', requireAuth(), async (req, res) => {
  try {
    const supabaseClient = getSupabaseClient();
    const { game_name, score } = req.body;
    const userId = req.user.userId;

    if (!game_name || typeof score !== 'number') {
      return res.status(400).json({ message: 'game_name and score are required.' });
    }

    const { error } = await supabaseClient
      .from('game_logs')
      .insert({ user_id: userId, game_name, score });

    if (error) return res.status(500).json({ message: 'Unable to save game log.' });

    res.status(201).json({ message: 'Game score saved successfully.' });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Database error.' });
  }
});

// ─── Friend System ────────────────────────────────────────────────────────────

// GET /users/:id/public — look up any user by ID (public info only)
app.get('/users/:id/public', async (req, res) => {
  try {
    const supabaseClient = getSupabaseClient();
    const userId = Number(req.params.id);
    if (!userId || !Number.isFinite(userId)) {
      return res.status(400).json({ message: 'Invalid user ID.' });
    }

    const { data, error } = await supabaseClient
      .from('users')
      .select('id, name, avatar_url')
      .eq('id', userId)
      .single();

    if (error || !data) return res.status(404).json({ message: 'User not found.' });

    res.json({ id: data.id, name: data.name, avatar_url: data.avatar_url || '' });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Database error.' });
  }
});

// POST /friends/request — send a friend request
app.post('/friends/request', requireAuth(), async (req, res) => {
  try {
    const supabaseClient = getSupabaseClient();
    const userId = req.user.userId;
    const { friendId } = req.body;

    if (!friendId || Number(friendId) === userId) {
      return res.status(400).json({ message: 'Invalid friend ID.' });
    }

    // Check if user exists
    const { data: target, error: lookupErr } = await supabaseClient
      .from('users')
      .select('id, name, avatar_url')
      .eq('id', Number(friendId))
      .single();
    if (lookupErr || !target) return res.status(404).json({ message: 'User not found.' });

    // Check for existing relationship in either direction
    const { data: existing } = await supabaseClient
      .from('friendships')
      .select('id, status, user_id, friend_id')
      .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`);

    if (existing && existing.length > 0) {
      const rel = existing[0];
      if (rel.status === 'accepted') return res.status(409).json({ message: 'Already friends.' });
      return res.status(409).json({ message: 'Friend request already sent.' });
    }

    const { error } = await supabaseClient
      .from('friendships')
      .insert({ user_id: userId, friend_id: Number(friendId), status: 'pending' });

    if (error) return res.status(500).json({ message: 'Unable to send friend request.' });

    res.status(201).json({ message: `Friend request sent to ${target.name}.` });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Database error.' });
  }
});

// GET /friends — list current friends and incoming pending requests
app.get('/friends', requireAuth(), async (req, res) => {
  try {
    const supabaseClient = getSupabaseClient();
    const userId = req.user.userId;

    // Get all friendship rows involving this user
    const { data, error } = await supabaseClient
      .from('friendships')
      .select('id, user_id, friend_id, status, created_at')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

    if (error) return res.status(500).json({ message: 'Unable to fetch friends.' });

    // Gather all relevant user IDs
    const otherIds = [...new Set((data || []).map(row =>
      row.user_id === userId ? row.friend_id : row.user_id
    ))];

    let usersMap = {};
    if (otherIds.length > 0) {
      const { data: usersData } = await supabaseClient
        .from('users')
        .select('id, name, avatar_url')
        .in('id', otherIds);
      (usersData || []).forEach(u => { usersMap[u.id] = u; });
    }

    const friends = [];
    const pendingIncoming = [];
    const pendingOutgoing = [];

    for (const row of (data || [])) {
      const otherId = row.user_id === userId ? row.friend_id : row.user_id;
      const otherUser = usersMap[otherId] || { id: otherId, name: 'Unknown' };

      if (row.status === 'accepted') {
        friends.push({ friendshipId: row.id, user: otherUser });
      } else if (row.status === 'pending') {
        if (row.friend_id === userId) {
          pendingIncoming.push({ friendshipId: row.id, user: otherUser });
        } else {
          pendingOutgoing.push({ friendshipId: row.id, user: otherUser });
        }
      }
    }

    res.json({ friends, pendingIncoming, pendingOutgoing });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Database error.' });
  }
});

// POST /friends/accept — accept a pending friend request
app.post('/friends/accept', requireAuth(), async (req, res) => {
  try {
    const supabaseClient = getSupabaseClient();
    const userId = req.user.userId;
    const { friendshipId } = req.body;

    if (!friendshipId) return res.status(400).json({ message: 'friendshipId is required.' });

    // Ensure the current user is the recipient (friend_id)
    const { data: row, error: lookupErr } = await supabaseClient
      .from('friendships')
      .select('id, user_id, friend_id, status')
      .eq('id', Number(friendshipId))
      .single();

    if (lookupErr || !row) return res.status(404).json({ message: 'Friend request not found.' });
    if (row.friend_id !== userId) return res.status(403).json({ message: 'Not authorized.' });
    if (row.status === 'accepted') return res.status(409).json({ message: 'Already accepted.' });

    const { error } = await supabaseClient
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', Number(friendshipId));

    if (error) return res.status(500).json({ message: 'Unable to accept friend request.' });

    res.json({ message: 'Friend request accepted.' });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Database error.' });
  }
});

// POST /friends/remove — remove a friend or cancel a request
app.post('/friends/remove', requireAuth(), async (req, res) => {
  try {
    const supabaseClient = getSupabaseClient();
    const userId = req.user.userId;
    const { friendshipId } = req.body;

    if (!friendshipId) return res.status(400).json({ message: 'friendshipId is required.' });

    const { data: row, error: lookupErr } = await supabaseClient
      .from('friendships')
      .select('id, user_id, friend_id')
      .eq('id', Number(friendshipId))
      .single();

    if (lookupErr || !row) return res.status(404).json({ message: 'Friendship not found.' });
    if (row.user_id !== userId && row.friend_id !== userId) {
      return res.status(403).json({ message: 'Not authorized.' });
    }

    const { error } = await supabaseClient
      .from('friendships')
      .delete()
      .eq('id', Number(friendshipId));

    if (error) return res.status(500).json({ message: 'Unable to remove friend.' });

    res.json({ message: 'Friend removed.' });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Database error.' });
  }
});

// --- MESSAGING ENDPOINTS ---

app.get('/messages/unread-count', requireAuth(), async (req, res) => {
  try {
    const supabaseClient = getSupabaseClient();
    const userId = req.user.userId;

    const { data, error, count } = await supabaseClient
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .is('read_at', null);

    if (error) {
      if (error.code === '42P01') return res.json({ count: 0 }); // Table doesn't exist
      return res.status(500).json({ message: 'Unable to fetch unread count.' });
    }

    res.json({ count: count || 0 });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Database error.' });
  }
});

app.post('/messages/read/:friendId', requireAuth(), async (req, res) => {
  try {
    const supabaseClient = getSupabaseClient();
    const userId = req.user.userId;
    const friendId = Number(req.params.friendId);

    const { error } = await supabaseClient
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('receiver_id', userId)
      .eq('sender_id', friendId)
      .is('read_at', null);

    if (error && error.code !== '42P01') {
      console.error(error);
    }
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false });
  }
});

app.get('/messages/:friendId', requireAuth(), async (req, res) => {
  try {
    const supabaseClient = getSupabaseClient();
    const userId = req.user.userId;
    const friendId = Number(req.params.friendId);

    if (!friendId) return res.status(400).json({ message: 'friendId is required.' });

    // Validate friendship exists
    const { data: friendship, error: friendErr } = await supabaseClient
      .from('friendships')
      .select('status')
      .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`)
      .eq('status', 'accepted')
      .maybeSingle();

    if (friendErr || !friendship) return res.status(403).json({ message: 'Must be friends to message.' });

    const { data: messages, error } = await supabaseClient
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) {
      if (error.code === '42P01') {
        // Table doesn't exist yet
        return res.json({ messages: [] });
      }
      return res.status(500).json({ message: 'Unable to load messages.' });
    }

    res.json({ messages: messages || [] });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Database error.' });
  }
});

app.post('/messages', requireAuth(), async (req, res) => {
  try {
    const supabaseClient = getSupabaseClient();
    const userId = req.user.userId;
    const { receiverId, content } = req.body;

    if (!receiverId || !content || !content.trim()) {
      return res.status(400).json({ message: 'receiverId and content are required.' });
    }

    const { data: friendship, error: friendErr } = await supabaseClient
      .from('friendships')
      .select('status')
      .or(`and(user_id.eq.${userId},friend_id.eq.${Number(receiverId)}),and(user_id.eq.${Number(receiverId)},friend_id.eq.${userId})`)
      .eq('status', 'accepted')
      .maybeSingle();

    if (friendErr || !friendship) return res.status(403).json({ message: 'Must be friends to message.' });

    const { data: message, error } = await supabaseClient
      .from('messages')
      .insert([{ sender_id: userId, receiver_id: Number(receiverId), content: content.trim() }])
      .select()
      .single();

    if (error) return res.status(500).json({ message: 'Unable to send message.' });

    res.json({ message });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Database error.' });
  }
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

module.exports = app;

