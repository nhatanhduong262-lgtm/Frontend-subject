ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_role_check'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'));
  END IF;
END $$;

UPDATE public.users
SET role = 'user'
WHERE role IS NULL;

CREATE INDEX IF NOT EXISTS users_email_lower_idx
  ON public.users (lower(email));
