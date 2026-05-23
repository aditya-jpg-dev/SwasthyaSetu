# SwasthyaSetu

Telehealth platform built with Next.js 16 and Supabase.

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` from `.env.example` and fill values.

3. Run development server:

```bash
npm run dev
```

## Required Environment Variables

Set these variables in local and in Railway service variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GROQ_API_KEY`

Important:
- `NEXT_PUBLIC_*` variables are embedded during build, so they must exist in Railway before deploy starts.

## Railway Deploy

This repo is configured for Railway Node deploy:

- `npm run build` first validates required env vars, then runs `next build`
- `npm start` runs `next start -H 0.0.0.0 -p ${PORT:-3000}`

Deploy steps:

1. Push this repo/branch to GitHub.
2. In Railway, create service from GitHub repo.
3. Add all required environment variables.
4. Ensure Railway Start Command is `npm start` (or leave default if it already uses it).
5. Trigger deploy.

Railway will provide `PORT` automatically.
