/* eslint-disable @typescript-eslint/no-require-imports */
const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const app = express();
const port = process.env.PORT || 5000;
const dataDirectory = path.join(__dirname, 'data');
const databasePath = path.join(dataDirectory, 'app.db');

fs.mkdirSync(dataDirectory, { recursive: true });

const database = new Database(databasePath);
database.pragma('journal_mode = WAL');
database.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT DEFAULT ''
  )
`);

app.use(cors());
app.use(express.json());

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
  res.json({ status: 'ok', database: 'sqlite' });
});

app.get('/users', (req, res) => {
  const users = database.prepare('SELECT id, email, name, phone FROM users ORDER BY id DESC').all();
  res.json({ users: users.map(publicUser) });
});

app.post('/register', (req, res) => {
  const { email, password, name, phone = '' } = req.body;
  if (!email || !password || !name) return res.status(400).send('Name, email, and password are required.');

  try {
    const result = database.prepare(
      'INSERT INTO users (email, password_hash, name, phone) VALUES (?, ?, ?, ?)'
    ).run(email.trim(), hashPassword(password), name.trim(), phone.trim());
    const user = database.prepare('SELECT id, email, name, phone FROM users WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: 'User registered', user: publicUser(user) });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).send('An account with this email already exists.');
    res.status(500).send('Unable to register user.');
  }
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = database.prepare('SELECT * FROM users WHERE email = ?').get(email?.trim());
  if (!user || !verifyPassword(password || '', user.password_hash)) return res.status(401).send('Email or password is incorrect.');
  res.json({ message: 'Login successful', user: publicUser(user) });
});

app.put('/profile/:id', (req, res) => {
  const { name, email, phone = '' } = req.body;
  if (!name || !email) return res.status(400).send('Name and email are required.');

  try {
    const result = database.prepare('UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?').run(name.trim(), email.trim(), phone.trim(), req.params.id);
    if (!result.changes) return res.status(404).send('User not found.');
    const user = database.prepare('SELECT id, email, name, phone FROM users WHERE id = ?').get(req.params.id);
    res.json({ user: publicUser(user) });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).send('An account with this email already exists.');
    res.status(500).send('Unable to update profile.');
  }
});

app.put('/change-password/:id', (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = database.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).send('User not found.');
  if (!verifyPassword(oldPassword || '', user.password_hash)) return res.status(401).send('The current password is incorrect.');
  if (!newPassword) return res.status(400).send('A new password is required.');

  database.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(newPassword), req.params.id);
  res.send('Password changed successfully.');
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

process.on('SIGINT', () => {
  database.close();
  process.exit(0);
});
