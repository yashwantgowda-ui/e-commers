# E-Comm (PhoneHub)

This repo contains:
- `backend/` - Express + MongoDB API (local dev port `5001`)
- `vite-project/` - Vite + React frontend (local dev port `5173`)

## Local start (Windows)
- Run: `.\start.cmd`
- Open: `http://localhost:5173`
- Mobile/Tablet (same Wi-Fi): `http://<YOUR-PC-IP>:5173`

### Env files (local only)
- Backend: copy `backend/.env.example` -> `backend/.env`
- Frontend: copy `vite-project/.env.example` -> `vite-project/.env`

## What to upload to GitHub (clean)
GitHub web upload fails if you select big folders like `node_modules/`.

Use the prepared clean folder (already created):
- Open: `d:\e-comm\github-ready\`
- Upload **everything inside** `github-ready\` to GitHub (under 100 files)

After upload, your GitHub repo root should look like:
- `backend/`
- `vite-project/`
- `.gitignore`
- `README.md`

Do NOT upload:
- `**/node_modules/`, `**/dist/`, `**/.vite/`
- `**/.env` (secrets), `*.log`, `.run-dev.lock`
- `car-register/`, `ecom/` (old extra folders)

## Deploy on Render (from GitHub)
Create **two** services on Render: Backend (Web Service) + Frontend (Static Site).

### 1) Backend (Web Service)
- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`
- Render sets `PORT` automatically (do not hardcode it on Render)
- Env Vars (set these in Render):
  - `NODE_ENV=production`
  - `MONGO_URI=<MongoDB Atlas connection string>`
  - `ADMIN_MONGO_URI=<MongoDB Atlas connection string>`
  - `JWT_SECRET=<random secret>`
  - Optional: `CORS_ORIGIN=https://<your-frontend>.onrender.com`

After deploy, copy your backend URL:
- Example: `https://your-backend.onrender.com`

### 2) Frontend (Static Site)
- Root Directory: `vite-project`
- Build Command (Render): `npm install && npm run build`
  - If you run this locally in **Windows PowerShell**, use: `npm install; npm run build`
- Publish Directory: `dist`
- Env Vars:
  - `VITE_API_URL=https://your-backend.onrender.com` (or `.../api`)

SPA routing (refreshing `/login`, `/register`, etc.) needs a rewrite to `index.html`.
In Render Static Site settings add a rewrite:
- Source: `/*`
- Destination: `/index.html`
- Status: `200`

## Troubleshooting
- Render error: `Cannot find module './routes/userRoutes'`
  - Your GitHub repo is missing `backend/routes/` OR you deployed the wrong folder.
  - Fix: re-upload from `d:\e-comm\github-ready\` so GitHub root has `backend/` + `vite-project/`, then set Render **Root Directory** to `backend` for the backend service.

## Push using Git (optional)
1. Install Git for Windows (so `git` works in PowerShell).
2. Create a new GitHub repo under `yashwantgowda-ui`.
3. In `d:\e-comm`, run:

```powershell
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yashwantgowda-ui/<REPO_NAME>.git
git push -u origin main
```
