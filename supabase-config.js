/* =====================================================================
   SUPABASE CONFIG — paste your project credentials here.

   ONE-TIME SETUP (about 10 minutes):
   1. Go to https://supabase.com and sign in (or create a free account).
   2. Click "New project", pick a name (e.g. "maranatha"), a strong
      database password, and a region close to Tanzania. Wait ~2 min
      for the project to be created.
   3. Open your project → Settings (gear icon) → API.
      Copy the "Project URL" and the "anon public" key.
   4. Paste them into the two strings below.
   5. In your project: SQL Editor → New query → paste the whole file
      "supabase-setup.sql" → Run.
   6. Authentication → Sign In / Up: make sure "Email" is enabled
      (it is by default).
   7. Authentication → URL Configuration:
        - Site URL:  https://ypmulima-11.github.io/Maranatha
        - Redirect URLs: add https://ypmulima-11.github.io/Maranatha/members.html
      (this makes the password-reset email return to the portal)
   8. Deploy (git commit + push). The portal switches on automatically.
   9. Sign up your first account on the portal, then in the SQL Editor
      run:  update public.profiles set role = 'admin' where email = 'you@example.com';
      That account becomes the site admin.

   The anon key is safe to ship in the website — all real protection
   is enforced by Supabase Row Level Security on the server.
   ===================================================================== */

const SUPABASE_CONFIG = {
  url: 'https://YOUR-PROJECT-REF.supabase.co',
  anonKey: 'YOUR-ANON-PUBLIC-KEY'
};

const SUPABASE_READY =
  !SUPABASE_CONFIG.url.includes('YOUR-PROJECT-REF') &&
  !SUPABASE_CONFIG.anonKey.includes('YOUR-ANON');
