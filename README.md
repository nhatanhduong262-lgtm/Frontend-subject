# Graduation Project - Secure Next.js Dashboard

This project is designed as a graduation thesis project demonstrating a real full-stack web system built with Next.js, Supabase, JWT authentication, role-based authorization, file uploads, and deployment-ready architecture.

## Project overview

The application includes:
- user registration and login
- JWT-based authentication
- role-based authorization for user/admin access
- protected frontend routes
- profile and password management
- device management
- basic file upload with validation
- real database integration using Supabase

## Tech stack
- Next.js 16
- React 19
- Express.js backend
- Supabase PostgreSQL
- JWT-based auth
- Multer for file uploads
- LocalStorage for browser session data

## Project structure

```bash
my-nextjs-project/
├── app/
├── pages/
├── public/
├── server/
├── supabase/
├── .env.example
├── .gitignore
├── next.config.ts
├── package.json
├── README.md
└── tsconfig.json
```

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file from `.env.example`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=replace-with-a-long-random-secret
PORT=5000
```

3. Run the SQL in `supabase/schema.sql` inside your Supabase SQL editor.

4. Start the backend server:

```bash
npm run server
```

5. Start the frontend in another terminal:

```bash
npm run dev
```

6. Open:

```bash
http://localhost:3000
```

## Authentication flow

### Registration
- User sends email, password, and name
- Server hashes the password
- Server stores the hash in Supabase
- Server returns a success message

### Login
- User provides email and password
- Server checks the stored hash
- Server issues a JWT token
- Frontend stores token in `localStorage`
- Future requests include `Authorization: Bearer <token>`

### Authorization
- Admin role can access `/users`
- User can access their own profile and password update endpoint
- Protected routes should redirect users without a valid token

## File upload rules

Allowed file types:
- JPG
- PNG
- WEBP
- PDF

Maximum file size:
- 2MB

## Security notes

- Never commit `.env` files
- Never store private keys in frontend code
- Keep `JWT_SECRET` in server environment variables only
- Never expose Supabase service role keys to the browser

## Deployment recommendations

### Vercel + Supabase
- Deploy the frontend to Vercel
- Use Supabase as the real database and storage provider
- Set all environment variables in Vercel project settings
- Add your custom domain if needed

### VPS
- Deploy the app with Nginx + PM2
- Set up SSL with Let’s Encrypt
- Use environment variables for secrets
- Keep Node.js and Nginx running as services

## Testing guidance

You can add tests for:
- JWT signing and verification
- password hashing and verification
- upload validation rules
- access control logic

Example command:

```bash
node --test server/auth.test.js
node --test server/uploadRules.test.js
```

## Thesis report ideas

Your report can be organized around:
- system requirements
- architecture design
- database design
- security implementation
- API design
- authentication and authorization
- upload and validation
- deployment process
- evaluation and lessons learned

## License

This project is for academic and learning purposes.
