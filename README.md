# PixelPulse — Full-Stack Arcade Dashboard Project

This project is a graduation-level web application built with Next.js, Express, and Supabase. The goal is to create a role-based game platform where players can log in, see their progress, access games, and track achievements, while admins can manage users and game-related data.

The app combines:
- a modern frontend experience for users and admins
- an API layer for authentication, profile updates, and game progress
- secure server-side checks with JWT tokens
- database storage and progress persistence through Supabase
- deployment-ready configuration for GitHub and Vercel

---

## 1. Project purpose

The project demonstrates a real-world web architecture with separate concerns:

- Frontend: UI and page navigation
- Backend: API logic, authorization, database access
- Database: planned data storage through Supabase tables
- Security: password hashing, JWT validation, role checks
- Game flow: progress tracking for arcade-style games

This is not just a static website. It is a working application with login, user session tracking, game activity, and admin management logic.

---

## 2. What the system does

### Player side
- user registration
- login and logout
- dashboard with player stats
- progress tracking across games
- profile and password management
- access to playable game pages

### Admin side
- list users and protected data
- manage role-based access
- review platform-level summaries

### Shared features
- JWT-based session management
- route protection
- Supabase-backed data access
- upload validation for file handling

---

## 3. Tech stack

- Next.js 16
- React 19
- Express.js
- Supabase PostgreSQL
- JWT token system
- LocalStorage for session-based browser state
- file upload validation

---

## 4. Main folder structure

```bash
my-nextjs-project/
├── app/
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── BackButton.js
│   └── ThemeToggle.js
├── lib/
│   └── playerProgress.js
├── pages/
│   ├── admin.js
│   ├── change-password.js
│   ├── dashboard.js
│   ├── games.js
│   ├── login.js
│   ├── profile.js
│   ├── progress.js
│   ├── register.js
│   ├── api/
│   └── ... game pages
├── public/
├── server/
│   ├── auth.js
│   ├── auth.test.js
│   ├── gameCatalog.js
│   ├── index.js
│   ├── pongLogic.js
│   ├── routeGuard.js
│   ├── uploadRules.js
│   └── uploads/
├── supabase/
│   └── schema.sql
├── .env.example
├── .gitignore
├── next.config.ts
├── package.json
├── README.md
└── tsconfig.json
```

---

## 5. Frontend architecture

The frontend is built using Next.js pages routing in the `pages/` directory.

### Key frontend pages

#### `pages/login.js`
This page handles:
- email + password login
- role selection (player/admin)
- sending the request to the backend API
- saving the JWT token and user profile in localStorage
- redirecting the user to the correct route

#### `pages/register.js`
Handles account creation. It sends user details to `/api/register` and creates a new account in the database.

#### `pages/dashboard.js`
This is the main player dashboard. It:
- checks if the user is authenticated
- redirects non-users to login
- load player progress from database or local fallback
- shows stats like level, rank, progress, and XP
- syncs progress updates periodically

#### `pages/admin.js`
This page is for admin users and shows management-related features, protected by admin-only authorization.

#### `pages/games.js`
Shows the player game library and links to each game page.

#### Game pages
Examples include:
- `pages/flappy.js`
- `pages/memory.js`
- `pages/reaction.js`
- `pages/pong.js`
- `pages/snake.js`

These pages are playable mini-games and are connected to progress tracking. When a player finishes or scores, the game updates their progress.

### Frontend data flow

The frontend typically follows this pattern:
1. User performs action
2. Frontend sends request to API
3. Backend validates user and data
4. Backend returns JSON result
5. Frontend saves data in browser storage or updates UI state

---

## 6. Backend architecture

The backend is mainly in `server/index.js`.

This file creates an Express app and exposes the main API endpoints.

### Main responsibilities
- register users
- log in users
- verify JWT tokens
- protect routes based on role
- check user permissions
- store and fetch progress
- update profile settings
- change password
- handle file uploads

The backend uses Supabase as the database layer and connects with a service-role key for secure server-side access.

---

## 7. Authentication and security

### `server/auth.js`
This file contains the core auth functions:

- `hashPassword(password)`
  - creates a salted hash before storing user credentials
- `verifyPassword(password, storedPassword)`
  - checks whether the supplied password matches the stored hash
- `signToken(payload)`
  - creates a JWT for logged-in users
- `verifyToken(token)`
  - validates a JWT and returns payload data if valid

This is the core of the authentication process.

### `server/routeGuard.js`
This file provides permission checks:

- `requireAdminAccess(req, res, next)`
  - only admin role can continue
- `requireUserAccess(paramName)`
  - allows the current user to access their own data or admin to access any user

These guards protect routes and API endpoints.

---

## 8. What the API does

The backend API is implemented in `server/index.js` and exposed through Next.js route handlers in `pages/api/[...path].js`.

### Request flow

`pages/api/[...path].js` acts like a proxy/bridge:
- the frontend calls `/api/...`
- the route handler normalizes the URL
- it passes the request to the Express app in `server/index.js`
- Express processes the request and returns JSON

This allows the project to use the same API logic while working properly inside the Next.js pages environment.

### Main API endpoints

#### `POST /register`
Creates a new user account.

Request body:
```json
{
  "name": "John",
  "email": "john@example.com",
  "password": "secret123",
  "phone": "123456789"
}
```

What it does:
- validates required fields
- hashes the password
- inserts the record into Supabase
- prevents duplicate email accounts

#### `POST /login`
Validates login credentials.

What it does:
- looks up the user by email
- verifies hashed password
- generates a JWT token
- returns the token and public user info

#### `GET /users`
Admin-only endpoint.

What it does:
- returns all users from the database
- protects access with admin role check

#### `GET /users/:id/progress`
Returns progress for a single user.

What it does:
- checks ownership or admin permission
- reads `progress_data` from the `users` table
- returns the list of progress items

#### `PUT /users/:id/progress`
Saves progress for a user.

What it does:
- normalizes progress list
- writes the progress array to Supabase
- preserves fallback if the database column is missing

#### `PUT /profile/:id`
Updates the user’s profile.

What it does:
- updates name, email, and phone
- ensures email uniqueness
- restricts access to self or admin

#### `PUT /change-password/:id`
Changes the user password.

What it does:
- verifies old password
- hashes new password
- stores updated password in the database

#### `POST /upload`
Handles file upload.

Rules:
- allowed types: JPG, PNG, WEBP, PDF
- max size: 2MB
- validation before saving

#### `GET /health`
Simple health endpoint for testing whether the server is running.

---

## 9. Progress system

The game progress logic is centered in `lib/playerProgress.js`.

### Why it exists
Every game page updates a user’s progress. Instead of storing everything only in local browser memory, the app tries to sync it with the database while still keeping a local fallback.

### Main functions

#### `DEFAULT_PLAYER_PROGRESS`
This defines the default list of game entries when no saved progress exists.

#### `normalizeProgressList(value)`
Ensures the progress array has the expected shape:
- title
- genre
- progress
- href

#### `getStoredPlayerProgress()`
Reads saved progress from `localStorage`.

#### `persistPlayerProgress(nextProgress)`
Saves the normalized progress into browser storage and dispatches a custom update event.

#### `mergeProgressRecord(gameMeta, scoreValue, mode, target)`
Adds or updates progress for a specific game.

#### `savePlayerProgressToDatabase(nextProgress)`
Sends the current progress array to the backend API and falls back to local storage if the remote request fails.

#### `loadPlayerProgressFromDatabase()`
Fetches progress from the server for the logged-in user.

#### `subscribeToUserProgress(userId, onProgress)`
Uses Supabase realtime to listen for changes when progress is updated.

This is the bridge between browser UI and database-backed progress data.

---

## 10. How the frontend and backend connect

The connection works through these layers:

1. Browser page requests data or submits form input
2. Next.js route or page triggers API call
3. API goes through `pages/api/[...path].js`
4. Express app in `server/index.js` validates request
5. Database query is executed via Supabase
6. Result is returned as JSON
7. Frontend updates the page state and local storage

This is the standard full-stack pattern used in the app.

---

## 11. Role-based access model

The project uses a role system with users and admins.

### Rules
- normal users can access their own data and dashboard
- admin users can access admin pages and user lists
- protected routes redirect unauthorized users to the login screen

This is enforced in:
- frontend route checks in pages like `dashboard.js`
- backend route guards in `server/routeGuard.js`
- JWT payload data with `role`

---

## 12. Local setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file using `.env.example` or own values:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
JWT_SECRET=replace-with-a-long-random-secret
PORT=5000
```

3. Run the database schema in Supabase:

```bash
supabase/schema.sql
```

4. Start the backend server:

```bash
npm run server
```

5. Start the frontend:

```bash
npm run dev
```

6. Open the app:

```bash
http://localhost:3000
```

---

## 13. Deployment flow

This project is deployment-ready for GitHub and Vercel.

### GitHub
- push the repo to GitHub
- keep secrets out of source control
- do not commit `.env` files

### Vercel
The project can be deployed with the Vercel CLI:

```bash
npx vercel login
npx vercel --prod --confirm
```

Then add the required environment variables inside the Vercel dashboard.

---

## 14. Security notes

- never expose service keys in frontend code
- never commit `.env` files
- use strong JWT secrets in production
- validate file uploads before saving them
- keep auth checks on both frontend and backend

---

## 15. Summary

This project is a complete full-stack web app demonstrating:
- user authentication
- role-based authorization
- UI-driven dashboard usage
- Supabase integration
- API-driven backend logic
- game progress tracking
- deployment-ready structure

It is a good example of how a modern web app is split into frontend, backend, API, database, and deployment layers.

---

## 16. Suggested project explanation for partners

"This app is a game dashboard platform where players can sign in, track game progress, and access a game library, while admins can monitor the system and manage users. The frontend is built using Next.js, the backend uses Express with a Supabase database, and the app communicates through secure API endpoints protected by JWT tokens. Progress is synced between the browser and database, with local storage serving as a backup when needed." 

---

## 17. License

This project is for academic and learning purposes.
