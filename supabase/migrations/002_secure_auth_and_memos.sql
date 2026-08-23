-- ============================================================================
-- PD HOLIDAY VILLAS — SERVER-SIDE AUTHENTICATION & VILLA MEMO ACCESS CONTROL
-- ============================================================================
--
-- WHAT THIS CHANGES
--   Before: the browser downloaded every staff row (passwords included) and
--           compared the password in JavaScript. Anyone holding the anon key
--           could read every password, gate code and lockbox code.
--   After:  passwords are bcrypt-hashed and never leave the database. Login
--           happens inside a SECURITY DEFINER function. Villa memos are no
--           longer directly readable — they are served by a function that
--           checks the caller's session and property assignments first.
--
-- HOW TO RUN
--   1. Edit the two passwords in STEP 0 below.
--   2. Paste this whole file into the Supabase SQL Editor and run it.
--   3. Deploy the matching application code.
--
-- Running this without editing STEP 0 will lock the super admin and owner out,
-- by design — it will not silently keep a weak default password.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- STEP 0 — PRECONDITION CHECK
-- Run 002a_set_admin_passwords.sql before this file. This block confirms it
-- happened; without it the super admin and owner would have no way to sign in
-- once the plaintext columns are dropped further down.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'settings'
      AND column_name = 'superAdminPasswordHash'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.settings
    WHERE id = 'auth_config'
      AND "superAdminPasswordHash" IS NOT NULL
      AND "ownerPasswordHash" IS NOT NULL
  ) THEN
    RAISE EXCEPTION
      'Run 002a_set_admin_passwords.sql first — the admin and owner password hashes are not set yet.';
  END IF;
END $$;

-- ============================================================================
-- STEP 1 — HASH EXISTING STAFF PASSWORDS
-- Existing staff keep the password they already use; only the storage changes.
-- ============================================================================

ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS password_hash TEXT;

UPDATE public.staff
SET password_hash = crypt(password, gen_salt('bf', 10))
WHERE password IS NOT NULL
  AND password <> ''
  AND password_hash IS NULL;

-- ============================================================================
-- STEP 2 — SESSION TABLE
-- Login issues an opaque random token. The client stores it and presents it
-- when calling the functions below; it never sees anyone's password.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.app_sessions (
  token       TEXT PRIMARY KEY,
  user_email  TEXT NOT NULL,
  user_name   TEXT NOT NULL,
  role        TEXT NOT NULL,
  staff_id    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_app_sessions_expires ON public.app_sessions (expires_at);

-- The session table is never touched directly by the browser.
ALTER TABLE public.app_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "no direct access to app_sessions" ON public.app_sessions;
REVOKE ALL ON public.app_sessions FROM anon, authenticated;

-- ============================================================================
-- STEP 3 — INTERNAL SESSION RESOLVER
-- Not callable from the browser; used by the functions further down.
-- ============================================================================

CREATE OR REPLACE FUNCTION public._resolve_session(p_token TEXT)
RETURNS TABLE (user_email TEXT, user_name TEXT, role TEXT, staff_id TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT s.user_email, s.user_name, s.role, s.staff_id
  FROM public.app_sessions s
  WHERE s.token = p_token
    AND s.expires_at > NOW();
$$;

REVOKE ALL ON FUNCTION public._resolve_session(TEXT) FROM PUBLIC, anon, authenticated;

-- ============================================================================
-- STEP 4 — LOGIN
-- Returns a session token plus the display context the app needs. Returns the
-- same generic failure for an unknown email and a wrong password so the
-- response cannot be used to enumerate valid accounts.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.authenticate_user(p_email TEXT, p_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_email      TEXT := LOWER(TRIM(COALESCE(p_email, '')));
  v_cfg        RECORD;
  v_staff      RECORD;
  v_token      TEXT;
  v_role       TEXT;
  v_name       TEXT;
  v_staff_id   TEXT := NULL;
  v_props      JSONB := '[]'::JSONB;
  v_ttl        INTERVAL := INTERVAL '30 days';
BEGIN
  IF v_email = '' OR COALESCE(p_password, '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid email or password.');
  END IF;

  SELECT * INTO v_cfg FROM public.settings WHERE id = 'auth_config';

  -- Super admin
  IF v_cfg."superAdminEmail" IS NOT NULL
     AND LOWER(v_cfg."superAdminEmail") = v_email
     AND v_cfg."superAdminPasswordHash" IS NOT NULL
     AND v_cfg."superAdminPasswordHash" = crypt(p_password, v_cfg."superAdminPasswordHash")
  THEN
    v_role := 'super_admin';
    v_name := 'Super Admin';

  -- Owner
  ELSIF v_cfg."ownerEmail" IS NOT NULL
     AND LOWER(v_cfg."ownerEmail") = v_email
     AND v_cfg."ownerPasswordHash" IS NOT NULL
     AND v_cfg."ownerPasswordHash" = crypt(p_password, v_cfg."ownerPasswordHash")
  THEN
    v_role := 'owner';
    v_name := COALESCE(v_cfg."ownerName", 'Owner');

  ELSE
    -- Staff
    SELECT * INTO v_staff
    FROM public.staff
    WHERE LOWER(email) = v_email
      AND password_hash IS NOT NULL
      AND COALESCE(status, 'active') <> 'disabled'
    LIMIT 1;

    IF v_staff.id IS NULL OR v_staff.password_hash <> crypt(p_password, v_staff.password_hash) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Invalid email or password.');
    END IF;

    v_role     := 'staff';
    v_name     := v_staff.name;
    v_staff_id := v_staff.id;
    v_props    := COALESCE(v_staff."assignedPropertyIds", '[]'::JSONB);
  END IF;

  -- Clear this account's expired sessions so the table does not grow forever.
  DELETE FROM public.app_sessions WHERE expires_at <= NOW();

  v_token := encode(gen_random_bytes(32), 'hex');

  INSERT INTO public.app_sessions (token, user_email, user_name, role, staff_id, expires_at)
  VALUES (v_token, v_email, v_name, v_role, v_staff_id, NOW() + v_ttl);

  RETURN jsonb_build_object(
    'ok', true,
    'token', v_token,
    'email', v_email,
    'name', v_name,
    'role', v_role,
    'staffId', v_staff_id,
    'assignedPropertyIds', v_props
  );
END $$;

REVOKE ALL ON FUNCTION public.authenticate_user(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.authenticate_user(TEXT, TEXT) TO anon, authenticated;

-- ============================================================================
-- STEP 5 — LOGOUT
-- ============================================================================

CREATE OR REPLACE FUNCTION public.logout_session(p_token TEXT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  DELETE FROM public.app_sessions WHERE token = p_token;
$$;

REVOKE ALL ON FUNCTION public.logout_session(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.logout_session(TEXT) TO anon, authenticated;

-- ============================================================================
-- STEP 6 — VILLA MEMOS: READ
-- Super admin and owner see every memo. Staff see only memos for the villas
-- assigned to them in the access matrix.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_villa_memos(p_token TEXT)
RETURNS SETOF public.villa_memos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_session RECORD;
  v_props   JSONB;
BEGIN
  SELECT * INTO v_session FROM public._resolve_session(p_token);
  IF v_session.user_email IS NULL THEN
    RAISE EXCEPTION 'Not authorised' USING ERRCODE = '42501';
  END IF;

  IF v_session.role IN ('super_admin', 'owner') THEN
    RETURN QUERY SELECT * FROM public.villa_memos;
    RETURN;
  END IF;

  SELECT COALESCE("assignedPropertyIds", '[]'::JSONB) INTO v_props
  FROM public.staff WHERE id = v_session.staff_id;

  RETURN QUERY
    SELECT m.* FROM public.villa_memos m
    WHERE m."propertyId" IN (SELECT jsonb_array_elements_text(COALESCE(v_props, '[]'::JSONB)));
END $$;

REVOKE ALL ON FUNCTION public.get_villa_memos(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_villa_memos(TEXT) TO anon, authenticated;

-- ============================================================================
-- STEP 7 — VILLA MEMOS: WRITE (super admin only)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.save_villa_memo(p_token TEXT, p_memo JSONB)
RETURNS public.villa_memos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_session RECORD;
  v_row     public.villa_memos;
BEGIN
  SELECT * INTO v_session FROM public._resolve_session(p_token);
  IF v_session.user_email IS NULL OR v_session.role <> 'super_admin' THEN
    RAISE EXCEPTION 'Not authorised' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.villa_memos (
    id, "propertyId", "propertyName", title, "wifiName", "wifiPassword",
    "netflixAccount", "netflixPassword", "gateCode", "lockboxCode", notes,
    "updatedAt", "updatedBy"
  )
  VALUES (
    COALESCE(p_memo->>'id', 'memo-' || encode(gen_random_bytes(8), 'hex')),
    p_memo->>'propertyId',
    p_memo->>'propertyName',
    p_memo->>'title',
    p_memo->>'wifiName',
    p_memo->>'wifiPassword',
    p_memo->>'netflixAccount',
    p_memo->>'netflixPassword',
    p_memo->>'gateCode',
    p_memo->>'lockboxCode',
    p_memo->>'notes',
    NOW(),
    v_session.user_name
  )
  ON CONFLICT (id) DO UPDATE SET
    "propertyId"      = EXCLUDED."propertyId",
    "propertyName"    = EXCLUDED."propertyName",
    title             = EXCLUDED.title,
    "wifiName"        = EXCLUDED."wifiName",
    "wifiPassword"    = EXCLUDED."wifiPassword",
    "netflixAccount"  = EXCLUDED."netflixAccount",
    "netflixPassword" = EXCLUDED."netflixPassword",
    "gateCode"        = EXCLUDED."gateCode",
    "lockboxCode"     = EXCLUDED."lockboxCode",
    notes             = EXCLUDED.notes,
    "updatedAt"       = NOW(),
    "updatedBy"       = EXCLUDED."updatedBy"
  RETURNING * INTO v_row;

  RETURN v_row;
END $$;

REVOKE ALL ON FUNCTION public.save_villa_memo(TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_villa_memo(TEXT, JSONB) TO anon, authenticated;


CREATE OR REPLACE FUNCTION public.delete_villa_memo(p_token TEXT, p_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_session RECORD;
BEGIN
  SELECT * INTO v_session FROM public._resolve_session(p_token);
  IF v_session.user_email IS NULL OR v_session.role <> 'super_admin' THEN
    RAISE EXCEPTION 'Not authorised' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.villa_memos WHERE id = p_id;
END $$;

REVOKE ALL ON FUNCTION public.delete_villa_memo(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_villa_memo(TEXT, TEXT) TO anon, authenticated;

-- ============================================================================
-- STEP 8 — PASSWORD MANAGEMENT (super admin only)
-- p_target is a staff id, or the literal 'super_admin' / 'owner'.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_account_password(
  p_token TEXT, p_target TEXT, p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_session RECORD;
  v_hash    TEXT;
BEGIN
  SELECT * INTO v_session FROM public._resolve_session(p_token);
  IF v_session.user_email IS NULL OR v_session.role <> 'super_admin' THEN
    RAISE EXCEPTION 'Not authorised' USING ERRCODE = '42501';
  END IF;

  IF LENGTH(COALESCE(p_new_password, '')) < 8 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Password must be at least 8 characters.');
  END IF;

  v_hash := crypt(p_new_password, gen_salt('bf', 10));

  IF p_target = 'super_admin' THEN
    UPDATE public.settings SET "superAdminPasswordHash" = v_hash WHERE id = 'auth_config';
  ELSIF p_target = 'owner' THEN
    UPDATE public.settings SET "ownerPasswordHash" = v_hash WHERE id = 'auth_config';
  ELSE
    UPDATE public.staff SET password_hash = v_hash WHERE id = p_target;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Staff member not found.');
    END IF;
  END IF;

  -- Force a fresh login everywhere after a password change.
  IF p_target IN ('super_admin', 'owner') THEN
    DELETE FROM public.app_sessions WHERE role = p_target;
  ELSE
    DELETE FROM public.app_sessions WHERE staff_id = p_target;
  END IF;

  RETURN jsonb_build_object('ok', true);
END $$;

REVOKE ALL ON FUNCTION public.set_account_password(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_account_password(TEXT, TEXT, TEXT) TO anon, authenticated;

-- ============================================================================
-- STEP 9 — ADMIN CONFIG READ/WRITE (never exposes password hashes)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_auth_config(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_session RECORD;
  v_cfg     RECORD;
BEGIN
  SELECT * INTO v_session FROM public._resolve_session(p_token);
  IF v_session.user_email IS NULL OR v_session.role NOT IN ('super_admin', 'owner') THEN
    RAISE EXCEPTION 'Not authorised' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_cfg FROM public.settings WHERE id = 'auth_config';

  RETURN jsonb_build_object(
    'superAdminEmail', v_cfg."superAdminEmail",
    'ownerEmail',      v_cfg."ownerEmail",
    'ownerName',       v_cfg."ownerName"
  );
END $$;

REVOKE ALL ON FUNCTION public.get_auth_config(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_auth_config(TEXT) TO anon, authenticated;


CREATE OR REPLACE FUNCTION public.update_auth_config(
  p_token TEXT, p_super_admin_email TEXT, p_owner_email TEXT, p_owner_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_session RECORD;
BEGIN
  SELECT * INTO v_session FROM public._resolve_session(p_token);
  IF v_session.user_email IS NULL OR v_session.role <> 'super_admin' THEN
    RAISE EXCEPTION 'Not authorised' USING ERRCODE = '42501';
  END IF;

  UPDATE public.settings
  SET "superAdminEmail" = LOWER(TRIM(p_super_admin_email)),
      "ownerEmail"      = LOWER(TRIM(p_owner_email)),
      "ownerName"       = TRIM(p_owner_name)
  WHERE id = 'auth_config';

  RETURN jsonb_build_object('ok', true);
END $$;

REVOKE ALL ON FUNCTION public.update_auth_config(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_auth_config(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- ============================================================================
-- STEP 10 — CREATE STAFF WITH A PASSWORD (super admin only)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_staff_member(
  p_token TEXT, p_name TEXT, p_email TEXT, p_phone TEXT,
  p_password TEXT, p_avatar_url TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_session RECORD;
  v_id      TEXT;
BEGIN
  SELECT * INTO v_session FROM public._resolve_session(p_token);
  IF v_session.user_email IS NULL OR v_session.role <> 'super_admin' THEN
    RAISE EXCEPTION 'Not authorised' USING ERRCODE = '42501';
  END IF;

  IF LENGTH(COALESCE(p_password, '')) < 8 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Password must be at least 8 characters.');
  END IF;

  IF EXISTS (SELECT 1 FROM public.staff WHERE LOWER(email) = LOWER(TRIM(p_email))) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'A staff member with this email already exists.');
  END IF;

  v_id := 'staff-' || encode(gen_random_bytes(6), 'hex');

  INSERT INTO public.staff (id, name, email, phone, role, "assignedPropertyIds",
                            "avatarUrl", status, password_hash, "createdAt")
  VALUES (v_id, TRIM(p_name), LOWER(TRIM(p_email)), TRIM(p_phone), 'staff', '[]'::JSONB,
          NULLIF(TRIM(COALESCE(p_avatar_url, '')), ''), 'active',
          crypt(p_password, gen_salt('bf', 10)), NOW());

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END $$;

REVOKE ALL ON FUNCTION public.create_staff_member(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_staff_member(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- ============================================================================
-- STEP 11 — LOCK DOWN THE SECRET-BEARING TABLES
-- villa_memos and settings become unreachable with the anon key. Every read
-- and write now goes through the checked functions above.
-- ============================================================================

DROP POLICY IF EXISTS "Allow all access to villa_memos" ON public.villa_memos;
DROP POLICY IF EXISTS "Allow all for villa_memos"       ON public.villa_memos;
ALTER TABLE public.villa_memos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.villa_memos FROM anon, authenticated;

DROP POLICY IF EXISTS "Allow all access to settings" ON public.settings;
DROP POLICY IF EXISTS "Allow all for settings"       ON public.settings;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.settings FROM anon, authenticated;

-- villa_memos carries gate and lockbox codes; it must not be broadcast to
-- every connected client over realtime either.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'villa_memos'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.villa_memos;
  END IF;
END $$;

-- ============================================================================
-- STEP 12 — DROP THE PLAINTEXT PASSWORD COLUMNS
-- ============================================================================

ALTER TABLE public.staff    DROP COLUMN IF EXISTS password;
ALTER TABLE public.settings DROP COLUMN IF EXISTS "superAdminPassword";
ALTER TABLE public.settings DROP COLUMN IF EXISTS "ownerPassword";

-- Re-publish staff without the dropped column so realtime payloads stay valid.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'staff'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.staff;
  END IF;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.staff;
END $$;

-- ============================================================================
-- VERIFICATION — these should all return zero rows / no leaks
-- ============================================================================
--   SELECT * FROM public.villa_memos;   -- expect: permission denied for anon
--   SELECT * FROM public.settings;      -- expect: permission denied for anon
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name = 'staff' AND column_name = 'password';  -- expect: 0 rows
-- ============================================================================
