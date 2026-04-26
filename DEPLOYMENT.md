# IQ Matters Deployment Guide

## Recommended Setup

Deploy this project as two services:

- `iq-matters-frontend`: a static hosting service for the Vite app
- `iq-matters-backend`: a Node.js hosting service connected to MySQL

This split is recommended because the frontend and backend both use routes like `/login`, `/matches`, and `/leaderboard`. Keeping them on separate domains avoids route collisions without refactoring the API.

## Railway Replacement Recommendation

Best low-cost setup for this app:

- Frontend: Vercel Hobby or Render Static Site
- Backend: Koyeb Web Service or Render Web Service
- Database: TiDB Cloud Starter, because the backend uses MySQL-compatible `mysql2`

For the smoothest free-ish setup, prefer Koyeb over Render for the backend because Koyeb Free scales down after 1 hour without traffic, while Render Free spins down after 15 minutes. Both still have cold starts on free instances. For a consistently fast public site, use a tiny paid always-on backend instance.

Recommended production values:

```env
NODE_ENV=production
TRUST_PROXY=true
UPLOAD_STORAGE=database
CORS_ORIGIN=https://your-frontend-domain.com
PUBLIC_BASE_URL=https://your-backend-domain.com
```

If your MySQL provider gives a connection string, set:

```env
DATABASE_URL=mysql://user:password@host:3306/iq_matters
DB_SSL=true
```

If it gives separate fields, set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` instead.

### Why Uploads Use Database In Production

Free backend hosts usually have ephemeral local files. If a user uploads a team logo and the backend restarts, that local file can disappear. In production, this app now defaults to `UPLOAD_STORAGE=database`, so uploaded logos and media are served from MySQL/TiDB instead of the local `uploads` folder.

## Architecture

- Frontend build output: `iq-matters-frontend/dist`
- Backend entry point: `iq-matters-backend/server.js`
- Database: MySQL
- Uploaded files: filesystem in local dev, MySQL in production by default

## Important Deployment Notes

1. Free hosts often clear the backend filesystem.
Production now defaults `UPLOAD_STORAGE` to `database`, so uploaded logos/images survive restarts as long as MySQL is persistent. Keep uploads small; the app currently limits each file to 10 MB.

2. The frontend must know the backend URL.
Set `VITE_API_BASE_URL` to your deployed backend URL.

3. The backend should only allow your frontend origin.
Set `CORS_ORIGIN` to your frontend domain, or a comma-separated list of allowed domains.

4. The backend should know its public URL.
Set `PUBLIC_BASE_URL` so uploaded file URLs are generated with the correct production domain.

## Frontend Deployment

Project directory:

`iq-matters-frontend`

Environment variables:

```env
VITE_API_BASE_URL=https://your-backend-domain.com
```

Build command:

```bash
npm install
npm run build
```

Publish directory:

```text
dist
```

SPA support:

- Netlify rewrite file is included at `public/_redirects`
- Vercel rewrite file is included at `vercel.json`

## Backend Deployment

Project directory:

`iq-matters-backend`

Environment variables:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=mysql://user:password@host:3306/iq_matters
DB_HOST=your-mysql-host
DB_PORT=3306
DB_USER=your-mysql-user
DB_PASSWORD=your-mysql-password
DB_NAME=iq_matters
DB_SSL=true
DB_SSL_CA=
DB_SSL_REJECT_UNAUTHORIZED=true
JWT_SECRET=use-a-long-random-secret
JWT_EXPIRES_IN=7d
ADMIN_BOOTSTRAP_EMAIL=your-admin-email@example.com
PANDASCORE_BASE_URL=https://api.pandascore.co
PANDASCORE_API_KEY=
CORS_ORIGIN=https://your-frontend-domain.com
PUBLIC_BASE_URL=https://your-backend-domain.com
TRUST_PROXY=true
UPLOAD_ROOT=uploads
UPLOAD_STORAGE=database
```

Start command:

```bash
npm install
npm start
```

Health check:

```text
GET /health
```

The backend bootstraps required database tables automatically on startup, so your MySQL database only needs to exist and be reachable.

## Suggested Launch Order

1. Create the MySQL database.
2. Deploy the backend with the production environment variables.
3. Confirm the backend health endpoint responds.
4. Deploy the frontend with `VITE_API_BASE_URL` pointing to the backend.
5. Open the site and test login, registration, tournaments, matches, leaderboard, and admin media uploads.

## Local Pre-Deployment Checks

Frontend:

```bash
cd iq-matters-frontend
npm run build
```

Backend:

```bash
cd iq-matters-backend
npm test
```

## Production Checklist

- Frontend domain is set in `CORS_ORIGIN`
- Backend domain is set in `VITE_API_BASE_URL`
- Backend has a strong `JWT_SECRET`
- MySQL database is reachable from the backend host
- `UPLOAD_STORAGE=database` is set on free/ephemeral backend hosts
- Admin bootstrap email is set correctly
- SPA rewrites are enabled on the frontend host
