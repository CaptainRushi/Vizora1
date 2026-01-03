# OAuth Login Not Working - Troubleshooting Guide

## Current Issue
After clicking "Continue with Google", you're redirected back but the session shows as `false`.

## Root Cause
The Supabase OAuth is not properly configured. Here's what you need to check:

---

## ✅ Step 1: Check Supabase Environment Variables

1. Open your `.env` file (in the root of your project)
2. Make sure you have these variables set:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### How to Get These Values:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

---

## ✅ Step 2: Configure OAuth Providers in Supabase

### For Google OAuth:
1. Go to **Supabase Dashboard** → **Authentication** → **Providers**
2. Find **Google** and click to enable it
3. You'll need to create a Google OAuth App:
   - Go to https://console.cloud.google.com/
   - Create a new project (or select existing)
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Authorized redirect URIs: Add your Supabase callback URL
     ```
     https://your-project.supabase.co/auth/v1/callback
     ```
   - Copy the **Client ID** and **Client Secret**
4. Back in Supabase, paste:
   - **Client ID** from Google
   - **Client Secret** from Google
5. Click **Save**

### For GitHub OAuth:
1. Go to **Supabase Dashboard** → **Authentication** → **Providers**
2. Find **GitHub** and click to enable it
3. Create a GitHub OAuth App:
   - Go to https://github.com/settings/developers
   - Click **New OAuth App**
   - Application name: `Vizora` (or your app name)
   - Homepage URL: `http://localhost:5173`
   - Authorization callback URL:
     ```
     https://your-project.supabase.co/auth/v1/callback
     ```
   - Click **Register application**
   - Copy the **Client ID**
   - Generate a **Client Secret** and copy it
4. Back in Supabase, paste:
   - **Client ID** from GitHub
   - **Client Secret** from GitHub
5. Click **Save**

---

## ✅ Step 3: Configure Redirect URLs

1. Go to **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. Add these URLs to **Redirect URLs**:
   ```
   http://localhost:5173
   http://localhost:5173/
   http://localhost:5173/auth/signin
   ```
3. Set **Site URL** to:
   ```
   http://localhost:5173
   ```
4. Click **Save**

---

## ✅ Step 4: Restart Your Dev Server

After making changes to `.env`:
```bash
# Stop the dev server (Ctrl+C)
# Then restart it
npm run dev
```

---

## ✅ Step 5: Test Again

1. **Clear browser cache and cookies** for localhost
2. Go to `http://localhost:5173`
3. Click **Login**
4. Click **Continue with Google** (or GitHub)
5. Approve the OAuth request
6. You should be redirected back and logged in

---

## 🔍 Debugging

### Check Console Logs
After clicking "Continue with Google", you should see:
```
[OAuth] Initiating sign in with google
[OAuth] Redirect initiated: {...}
```

After returning from Google:
```
[AuthContext] Initial session check: {session: true}
[AuthContext] User logged in: your-email@gmail.com
```

### If Session is Still False
1. Check browser console for errors
2. Check Network tab for failed requests
3. Verify Supabase credentials are correct
4. Verify OAuth providers are enabled in Supabase
5. Verify redirect URLs match exactly

---

## 🚨 Common Issues

### Issue: "Invalid redirect URL"
**Fix:** Add `http://localhost:5173` to Supabase redirect URLs

### Issue: "OAuth provider not configured"
**Fix:** Enable and configure Google/GitHub in Supabase Dashboard

### Issue: "Session is null after redirect"
**Fix:** Check that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set correctly

### Issue: "Redirect loop"
**Fix:** This should now be fixed with the latest code changes

---

## 📝 Quick Checklist

- [ ] `.env` file has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [ ] Supabase project exists and is active
- [ ] Google OAuth is enabled in Supabase with Client ID/Secret
- [ ] GitHub OAuth is enabled in Supabase with Client ID/Secret
- [ ] Redirect URLs include `http://localhost:5173`
- [ ] Dev server was restarted after `.env` changes
- [ ] Browser cache was cleared

---


---

## 🚨 THE FIX: "Database error saving new user"

If you see this error, your Supabase database is rejecting the new user. **This is almost always because the "Auth User -> Profile" trigger is broken.**

### 1. Copy and Run this SQL in Supabase
Go to **Supabase Dashboard** → **SQL Editor** → **New Query**, paste this, and click **Run**:

```sql
-- 1. Ensure profiles exists
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  role_title TEXT,
  onboarded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create the Trigger Function
-- This function runs every time a new user is created in Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Bind the Trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

---

## 🔍 Why This Happens
When you sign up via Google, Supabase tries to create a row in `auth.users`. 
If you have a trigger that says "Every time a user is created, also create a profile", but that trigger fails (e.g., because the `profiles` table doesn't exist or is missing a column), then **the entire signup fails** with a `Database error`. 

Running the SQL above will reset the trigger to a "safe" state that only uses the `id`.

---

## Need Help?

If you're still having issues, share:
1. Console logs from browser
2. Network tab showing the OAuth redirect
3. Supabase project URL (without sensitive keys)
