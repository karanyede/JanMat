# SUPABASE SETUP INSTRUCTIONS

## Step 1: Create a Supabase Project
1. Go to https://supabase.com
2. Sign up/Login to your account
3. Click "New Project"
4. Fill in:
   - Name: JanMat
   - Database Password: (choose a strong password)
   - Region: (choose closest to your location)
5. Wait for the project to be created (~2 minutes)

## Step 2: Get Your Credentials
1. Go to Project Settings → API
2. Copy the following values:
   - Project URL (starts with https://...)
   - Project API Keys → anon/public key

## Step 3: Update .env File
Replace the placeholder values in .env with your actual credentials:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 4: Run Database Setup
1. Go to Supabase Dashboard → SQL Editor
2. Run the schema.sql file from /supabase/schema.sql
3. Run the polls_sample_data.sql for test data

## Step 5: Restart Development Server
After updating .env, restart your dev server:
```bash
npm run dev
```

The polls should now work properly!