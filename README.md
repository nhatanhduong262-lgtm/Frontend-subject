<<<<<<< HEAD
# Frontend-subject
Studying for programing frontend
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).


## Run the project

1. Create a Supabase project and open its SQL Editor.
2. Run [`supabase/schema.sql`](supabase/schema.sql).
3. Create a `.env` file in the project root:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Keep `SUPABASE_SERVICE_ROLE_KEY` on the server and never expose it as a `NEXT_PUBLIC_` variable.

Install dependencies and start the API:

```bash
npm install
npm run server
```

In a second terminal:

```bash
npm run dev
```

Open http://localhost:3000. The API now reads and writes users in Supabase.
