-- ============================================================================
-- 002a — SET THE ADMIN AND OWNER PASSWORDS
-- ============================================================================
--
--  ####################################################################
--  #  DO NOT TYPE A REAL PASSWORD INTO THIS FILE AND SAVE IT.         #
--  #                                                                  #
--  #  This file lives in Git. Anything saved here is committed to     #
--  #  the repository and readable by anyone with access to it.        #
--  #                                                                  #
--  #  Correct order:                                                  #
--  #    1. COPY the SQL below                                         #
--  #    2. PASTE it into the Supabase SQL Editor                      #
--  #    3. Replace the placeholders THERE, in the browser             #
--  #    4. Run it there                                               #
--  #                                                                  #
--  #  The password is then stored only in the database, as a hash.    #
--  #  This file keeps its placeholders and stays safe to commit.      #
--  ####################################################################
--
-- Run this before 002_secure_auth_and_memos.sql.
-- Re-run it any time to rotate either password. Once the app is deployed you
-- can also change both from Database Settings in the UI, which avoids SQL
-- entirely and is the better long-term route.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS "superAdminPasswordHash" TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS "ownerPasswordHash" TEXT;

INSERT INTO public.settings (id) VALUES ('auth_config')
ON CONFLICT (id) DO NOTHING;

UPDATE public.settings
SET
  -- Replace these two placeholders in the Supabase SQL Editor, not here.
  "superAdminPasswordHash" = crypt('REPLACE_IN_SUPABASE_EDITOR', gen_salt('bf', 10)),
  "ownerPasswordHash"      = crypt('REPLACE_IN_SUPABASE_EDITOR', gen_salt('bf', 10)),

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
