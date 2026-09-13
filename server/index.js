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
      return res.status(500).send('Unable to register user.');
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
    const { name, email, phone = '' } = req.body;
    if (!name || !email) return res.status(400).send('Name and email are required.');

    const { data, error } = await supabaseClient
      .from('users')
      .update({ name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim() })
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

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

module.exports = app;

