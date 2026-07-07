CREATE TABLE IF NOT EXISTS public.telegram_users (
  id bigserial PRIMARY KEY,
  employee_id text NOT NULL,
  telegram_user_id bigint NOT NULL,
  chat_id bigint NOT NULL,
  username text,
  first_name text,
  last_name text,
  language_code text,
  is_active boolean NOT NULL DEFAULT true,
  last_seen timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS telegram_users_telegram_user_id_key ON public.telegram_users(telegram_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS telegram_users_chat_id_key ON public.telegram_users(chat_id);

ALTER TABLE public.telegram_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY telegram_users_service_role ON public.telegram_users
  FOR ALL USING (auth.role() = 'service_role');
