# Going to production

Read this before deploying. Step 1 requires editing a file, and skipping it
will lock the super admin and owner out of the system.

---

## 1. Run the security migration

Two files, in order, both in the Supabase SQL Editor.

### 1a. Set the admin passwords

Open `supabase/migrations/002a_set_admin_passwords.sql`. Replace the two
marked values with real passwords (8+ characters):

```sql
"superAdminPasswordHash" = crypt('PutAdminPasswordHere', gen_salt('bf', 10)),
"ownerPasswordHash"      = crypt('PutOwnerPasswordHere', gen_salt('bf', 10)),
```

Paste the file into the SQL Editor and run it. The last statement reports back:

```
super_admin_set | owner_set
----------------+-----------
 t              | t
```

Both must be `t` before continuing.

### 1b. Run the main migration

Paste `supabase/migrations/002_secure_auth_and_memos.sql` in and run it.
Nothing in this file needs editing. If 1a was skipped it stops immediately
with `Run 002a_set_admin_passwords.sql first` rather than half-applying.

Existing staff (Sue, Yati) keep the passwords they already use — their stored
passwords are hashed in place, not reset.

**Verify afterwards.** In the SQL Editor these should all come back empty or
denied:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'staff' AND column_name = 'password';   -- expect 0 rows
```

And with the anon key (for example from the browser console on the deployed
site), both of these should now fail rather than return data:

```js
await supabase.from('villa_memos').select('*')   // expect: permission denied
await supabase.from('settings').select('*')      // expect: permission denied
```

## 2. Deploy the application

The app code in this branch expects the migration above to have run. Deploying
the code without the migration will break login, because the client no longer
compares passwords itself.

Order matters: **migration first, then the app.**

## 3. Set the remaining passwords

Sign in as super admin and go to **Database Settings → Change Account
Password** to rotate the super admin or owner password at any time. Changing a
password signs that account out on every device.

Staff passwords are set from **Staff & Access Matrix** — use *Reset* next to a
staff member. Passwords are never displayed anywhere; they can only be set.

---

## What this migration does and does not cover

**Now protected**

- Passwords are bcrypt-hashed and never leave the database. The browser never
  receives a password or a hash for any account.
- Villa memos (wifi passwords, Netflix logins, gate codes, lockbox codes) are
  unreadable with the anon key. They are served by a function that checks the
  caller's session: super admin and owner see all; staff see only villas
  assigned to them in the access matrix.
- Memos are no longer cached in browser localStorage, so door codes do not
  persist on a shared phone or tablet.
- Memos are no longer broadcast over realtime.
- The admin configuration table is unreadable with the anon key.
- Signing out revokes the session server-side, not just locally.

**Still open — accepted trade-off of not moving to Supabase Auth**

`bookings`, `properties`, `staff`, `notifications` and `activity_logs` are
still readable and writable by anyone holding the anon key, which is public by
design and present in the deployed bundle. In practice that means guest names,
phone numbers and email addresses, and the booking calendar, are exposed to
anyone who finds the deployed URL and looks at the network traffic.

Closing that gap means moving to Supabase Auth so RLS policies can be written
against the signed-in user rather than `USING (true)`. That is the recommended
next step if this system ever holds data you would not want a guest to see.

**Not addressed**

- No rate limiting on login attempts. The database will happily check
  passwords as fast as they arrive. Supabase Auth would bring this for free;
  otherwise it needs an edge function in front of `authenticate_user`.
- Sessions last 30 days and are not rotated on use.

---

## Operational notes

- **Log retention** is currently triggered from the browser, at most once per
  session. Moving `purge_old_logs` to a `pg_cron` schedule would be more
  reliable:
  ```sql
  SELECT cron.schedule('purge-old-logs', '0 3 * * *', 'SELECT public.purge_old_logs()');
  ```
- **Property images** are stored as base64 data URLs in `properties.imageUrl`.
  Each upload adds roughly 50–150 KB to every full property read. If the villa
  photo library grows, move these to Supabase Storage and store URLs instead.
- **`tsconfig.json` does not enable `strict`.** Type checking is therefore
  much weaker than it looks, and discriminated-union narrowing does not work.
  Turning on `strict` (or at least `strictNullChecks`) would catch a class of
  null-related runtime errors before they ship.
