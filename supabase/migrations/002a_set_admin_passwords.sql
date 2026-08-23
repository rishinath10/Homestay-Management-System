-- ============================================================================
-- 002a — SET THE ADMIN AND OWNER PASSWORDS
-- ============================================================================
-- Run this FIRST, before 002_secure_auth_and_memos.sql.
--
-- Replace the two passwords below, paste into the Supabase SQL Editor, Run.
-- Nothing else in this file needs changing.
--
-- You can re-run this any time to rotate either password. After the app is
-- deployed you can also change them from Database Settings in the UI.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS "superAdminPasswordHash" TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS "ownerPasswordHash" TEXT;

INSERT INTO public.settings (id) VALUES ('auth_config')
ON CONFLICT (id) DO NOTHING;

UPDATE public.settings
SET
  -- ↓↓↓ REPLACE THESE TWO VALUES ↓↓↓
  "superAdminPasswordHash" = crypt('Sairam_608919', gen_salt('bf', 10)),
  "ownerPasswordHash"      = crypt('Seriduta_123', gen_salt('bf', 10)),
  -- ↑↑↑ REPLACE THESE TWO VALUES ↑↑↑

  "superAdminEmail" = COALESCE("superAdminEmail", 'rishinathsai@gmail.com'),
  "ownerEmail"      = COALESCE("ownerEmail", 'pdholidayvillas@gmail.com'),
  "ownerName"       = COALESCE("ownerName", 'Jeff')
WHERE id = 'auth_config';

-- Confirms both hashes were written. Expect: super_admin_set | owner_set = t | t
SELECT
  "superAdminPasswordHash" IS NOT NULL AS super_admin_set,
  "ownerPasswordHash"      IS NOT NULL AS owner_set
FROM public.settings
WHERE id = 'auth_config';
