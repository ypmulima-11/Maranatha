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

   SIGN IN WITH GOOGLE (optional, ~5 extra minutes):
   A. In Google Cloud Console (console.cloud.google.com): create a project,
      enable the "Google+ API" or "Google Auth" (OAuth consent screen) with
      user type "External", add your Google account as a test user.
   B.  Create OAuth client ID → type "Web application":
        Authorized redirect URI:
        https://ojgutyougbyfbdoobtue.supabase.co/auth/v1/callback
      Copy the Client ID and Client Secret.
   C. In Supabase → Authentication → Providers → Google → Enable, paste the
      Client ID + Client Secret, Save. Also add your Google account (and any
      other emails) to "Additional redirect URLs" if prompted.
   D. In Google Cloud → OAuth consent screen → Publishing status: make the app
      "In production" (or keep trusted test users). The "Continue with Google"
      button on the Members page then works.
   NS. Google sign-ups are created as Members and start with status "pending",
       just like email sign-ups, until an admin approves them.

   The anon key is safe to ship in the website — all real protection
   is enforced by Supabase Row Level Security on the server.
   ===================================================================== */

const SUPABASE_CONFIG = {
  url: 'https://ojgutyougbyfbdoobtue.supabase.co',
  anonKey: 'sb_publishable_eNGRMIp7q-Z6hh-bAskO5g_I0rkG7oZ'
};

const SUPABASE_READY =
  !SUPABASE_CONFIG.url.includes('YOUR-PROJECT-REF') &&
  !SUPABASE_CONFIG.anonKey.includes('YOUR-ANON');
