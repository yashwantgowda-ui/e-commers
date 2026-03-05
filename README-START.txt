========================================
  HOW TO START THE E-COMMERCE SITE
  (Do this after every shutdown/restart)
========================================
OPTION 1 - EASIEST (recommended)
1. Open the folder:  d:\e-comm
2. Open terminal in this folder
3. Run:
   .\start.cmd
4. Wait for backend + frontend to start.
5. Open:
   http://localhost:5173
6. For permanent startup after Windows restart:
   double-click ENABLE-AUTO-START.bat (one-time setup)
NOTE:
- If you prefer npm scripts, this also works in Windows PowerShell:
  npm.cmd start
  
OPTION 2 - Manual (two terminals)
--------------------------------
Terminal 1 - Backend:
   cd d:\e-comm\backend
   npm.cmd start

Terminal 2 - Frontend (after backend is running):
   cd d:\e-comm\vite-project
   npm.cmd run dev -- --host 0.0.0.0 --port 5173

Then open: http://localhost:5173
Mobile/Tablet (same Wi-Fi): http://<YOUR-PC-IP>:5173

PERMANENT STARTUP (ONE TIME)
----------------------------
- Run: ENABLE-AUTO-START.bat
- This adds E-comm launcher to your Windows Startup.
- To disable later, run: DISABLE-AUTO-START.bat

========================================
REQUIREMENTS
- Node.js installed
- MongoDB Atlas OR local MongoDB running (set `backend/.env` to match)
- Backend must start before or with frontend; frontend needs backend on port 5001
========================================

For GitHub + Render deployment steps, see: README.md
