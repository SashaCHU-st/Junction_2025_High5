# Junction 2025 — HealthyBuddy

This repository contains the HealthyBuddy app built for the Junction 2025 project. The HealthyBuddy app includes a TypeScript/Node backend and a TypeScript React/React-Native-style frontend (see `healthybuddy` folder).

**Quick links**
- **Project folder:** `healthybuddy`
- **HealthyBuddy QUICKSTART:** `healthybuddy/QUICKSTART.md`

**What this repo contains**
- `healthybuddy/backend` — Node + TypeScript backend (API routes, services)
- `healthybuddy/frontend` — React / React-Native-style frontend (TypeScript)
![2025-11-16091922-ezgif com-video-to-gif-converter](https://github.com/user-attachments/assets/67ba1699-c0d9-46a8-9682-5b59ef662317)

## Overview

HealthyBuddy is a small companion app that provides activity suggestions, voice chat, weather alerts and friend-event matching. It comprises a backend that exposes APIs and services, and a frontend app that consumes those APIs.

## Repository Structure

- `healthybuddy/`
  - `backend/` — server code, `package.json`, `tsconfig.json`, and `src/`
  - `frontend/` — client app, `package.json`, `App.tsx`, components and screens
  - `QUICKSTART.md` — quick start guide specific to HealthyBuddy

## Requirements

- Node.js (v16+ recommended)
- npm (or yarn)
- (Optional) Expo CLI if you run the frontend as an Expo app

## Setup & Run (PowerShell examples)

Open two terminals — one for backend, one for frontend.

Backend

```powershell
cd healthybuddy/backend
npm install
# create or copy environment variables into .env (see QUICKSTART.md)
npm run dev
```

Frontend

```powershell
cd healthybuddy/frontend
npm install
# create or copy environment variables into .env (if used)
npm run start
```

Notes:
- If the frontend is an Expo app, `npm run start` will open Expo Dev Tools.
- If the backend uses ports, ensure no conflicts (default ports are defined in code or `.env`).

## Environment variables

This repo keeps environment variables local to each subproject — check the following locations and create a `.env` where needed:

- `healthybuddy/backend` — create `.env` with any API keys, service endpoints, and ports the backend requires
- `healthybuddy/frontend/.env` — frontend-specific keys (API base URL, feature toggles)

If you need concrete variable names, open the service files in `healthybuddy/backend/src/services` or `healthybuddy/frontend` to see what variables are read.

## Development Tips

- Use the backend logs to confirm API health before starting the frontend.
- If using Windows PowerShell, ensure you run the commands from the repository root or the subfolder shown above.
- For simultaneous runs, use terminal tabs or separate terminal windows.

## Tests & Linting

Check each subproject for scripts in their `package.json` (e.g., `test`, `lint`) and run them within their directory:

```powershell
cd healthybuddy/backend; npm run test
cd healthybuddy/frontend; npm run test
```

## Further documentation

- See `healthybuddy/QUICKSTART.md` for a compact, app-specific quick start.
- See files inside `healthybuddy/backend/src` and `healthybuddy/frontend` for code-level details and examples.

## Contributing

If you'd like to contribute, open an issue or create a branch and submit a pull request. Keep changes focused to the specific subproject.

## Contact

If you need help running the app locally, attach logs and the steps you ran and open an issue in the repository.

---

Generated README for project root. For a faster, app-specific start see `healthybuddy/QUICKSTART.md`.
