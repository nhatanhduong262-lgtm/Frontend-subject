/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('node:crypto');

const app = express();
const port = process.env.PORT || 5000;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set before starting the server.');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    name: 'User API',
    status: 'ok',
    database: 'supabase',
    health: '/health',
  });
});

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedPassword) {
  const [salt, storedHash] = storedPassword.split(':');
  if (!salt || !storedHash) return false;
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
}

function publicUser(user) {
  return { id: user.id, email: user.email, name: user.name, phone: user.phone || '' };
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', database: 'supabase' });
});

app.get('/users', async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, phone')
    .order('id', { ascending: false });
  if (error) return res.status(500).send('Unable to load users.');
  res.json({ users: data.map(publicUser) });
});

app.get('/devices', async (req, res) => {
  const { data, error } = await supabase
    .from('devices')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).send('Unable to load devices.');
  res.json({ devices: data });
});

app.post('/devices', async (req, res) => {
  const { name, type, manufacturer = '', model = '', serial_number = '', location = '', image_url = '', status = 'Online', specifications = {}, notes = '' } = req.body;
  if (!name || !type || !location) return res.status(400).send('Name, type, and location are required.');
  const { data, error } = await supabase.from('devices').insert({
    name: name.trim(), type, manufacturer: manufacturer.trim(), model: model.trim(), serial_number: serial_number.trim(),
    location: location.trim(), image_url: image_url.trim(), status, specifications, notes: notes.trim(),
  }).select('*').single();
  if (error) return res.status(500).send('Unable to create device.');
  res.status(201).json({ device: data });
});

app.patch('/devices/:id/status', async (req, res) => {
  const status = req.body.status === 'Offline' ? 'Offline' : 'Online';
  const { data, error } = await supabase.from('devices').update({ status, last_seen: new Date().toISOString() }).eq('id', req.params.id).select('*').single();
  if (error) return res.status(500).send('Unable to update device status.');
  res.json({ device: data });
});

app.delete('/devices/:id', async (req, res) => {
  const { error } = await supabase.from('devices').delete().eq('id', req.params.id);
  if (error) return res.status(500).send('Unable to remove device.');
  res.sendStatus(204);
});

app.post('/register', async (req, res) => {
  const { email, password, name, phone = '' } = req.body;
  if (!email || !password || !name) return res.status(400).send('Name, email, and password are required.');

  const { data, error } = await supabase
    .from('users')
    .insert({ email: email.trim().toLowerCase(), password_hash: hashPassword(password), name: name.trim(), phone: phone.trim() })
    .select('id, email, name, phone')
    .single();
  if (error) {
    if (error.code === '23505') return res.status(409).send('An account with this email already exists.');
    return res.status(500).send('Unable to register user.');
  }
  res.status(201).json({ message: 'User registered', user: publicUser(data) });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .ilike('email', email?.trim() || '')
    .maybeSingle();
  if (error) return res.status(500).send('Unable to sign in.');
  if (!user || !verifyPassword(password || '', user.password_hash)) return res.status(401).send('Email or password is incorrect.');
  res.json({ message: 'Login successful', user: publicUser(user) });
});

app.put('/profile/:id', async (req, res) => {
  const { name, email, phone = '' } = req.body;
  if (!name || !email) return res.status(400).send('Name and email are required.');

  const { data, error } = await supabase
    .from('users')
    .update({ name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim() })
    .eq('id', req.params.id)
    .select('id, email, name, phone')
    .maybeSingle();
  if (error) {
    if (error.code === '23505') return res.status(409).send('An account with this email already exists.');
    return res.status(500).send('Unable to update profile.');
  }
  if (!data) return res.status(404).send('User not found.');
  res.json({ user: publicUser(data) });
});

app.put('/change-password/:id', async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const { data: user, error } = await supabase.from('users').select('*').eq('id', req.params.id).maybeSingle();
  if (error) return res.status(500).send('Unable to change password.');
  if (!user) return res.status(404).send('User not found.');
  if (!verifyPassword(oldPassword || '', user.password_hash)) return res.status(401).send('The current password is incorrect.');
  if (!newPassword) return res.status(400).send('A new password is required.');

  const { error: updateError } = await supabase.from('users').update({ password_hash: hashPassword(newPassword) }).eq('id', req.params.id);
  if (updateError) return res.status(500).send('Unable to change password.');
  res.send('Password changed successfully.');
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

