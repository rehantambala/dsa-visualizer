# DSA Visualizer

A visually engaging DSA Visualizer built with React to make core data structures easier to understand through interactive animations, clear visual feedback, and a beginner-friendly learning experience.

## Overview

DSA Visualizer is a learning-focused project designed to help users explore how fundamental data structures work in a more intuitive and interactive way. Instead of relying only on theory, this project turns core operations into visual experiences so learners can better understand what is happening step by step.

The current version opens on a landing page with nine interactive modules: arrays, stacks, queues, linked lists, sorting, graphs, binary trees, pathfinding, and a live analytics dashboard - presented through a polished pixel-inspired interface with a strong teaching-oriented UX.

## Features

- Interactive visualizations for core data structures and classic algorithms
- Real algorithm engines under every module - Binary Tree is a genuine BST (real left/right children), Pathfinding runs real Dijkstra/A*/Greedy/BFS on an editable grid with walls - not hardcoded output
- Every completed run is logged to MongoDB and shows up live on the Analytics dashboard
- Smooth UI interactions and operation feedback
- Beginner-friendly layout and learning flow
- Pixel-inspired visual design system
- Modular architecture for future DSA expansion
- Separate frontend and backend setup

## Modules Completed

- Array Visualizer
- Stack Visualizer
- Queue Visualizer
- Linked List Visualizer (with live multi-tab sync + DB-backed save/restore)
- Sorting Visualizer (Bubble, Selection, Insertion, Merge, Quick)
- Graph Visualizer (build your own graph, real BFS/DFS)
- Binary Tree Visualizer (real BST - insert/delete/search/traversals)
- Pathfinding Visualizer (Dijkstra, A*, Greedy, BFS on an editable walled grid)
- Analytics Dashboard (live stats from every run above)

## Tech Stack

### Frontend
- React
- Vite
- JavaScript
- CSS

### Backend
- Node.js
- Express

## Project Structure

```bash
dsa-visualizer/
├── backend/
│   ├── src/
│   │   └── server.js
│   ├── package.json
│   └── package-lock.json
│
├── docs/
│   └── roadmap.md
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── array/
│   │   │   ├── linkedlist/
│   │   │   ├── queue/
│   │   │   ├── shared/
│   │   │   ├── stack/
│   │   │   ├── data/
│   │   │   └── utils/
│   │   ├── data/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── package-lock.json
│
└── README.md

## Live Demo

[View Live Project](https://dsa-visualizer-qw6f3w9j6-rehantambalas-projects.vercel.app/)
## Screenshots

![Array Visualizer](./screenshots/Array.png)
![Stack Visualizer](./screenshots/Stack.png)

## Deployment Notes (Milestone 11)

- **Frontend (Vercel):** Deploy `frontend/`. `frontend/vercel.json` rewrites `/api/*`
  to the Render backend at Vercel's edge, so the browser only ever talks to the
  Vercel domain for REST calls - this keeps the login cookie same-site (it's set
  with `SameSite=Lax`, which browsers strip from genuinely cross-site
  fetch/XHR requests). **Do not set `VITE_API_BASE_URL` in production** - leaving
  it unset is what makes REST calls go through that proxy instead of hitting the
  Render URL directly, which would silently break session persistence after login.
  Set `VITE_SOCKET_URL` to the Render backend URL instead - the Linked List
  visualizer's Socket.io connection can't go through the rewrite proxy and needs
  the real backend origin directly (it doesn't rely on the auth cookie, so this is
  safe). See `frontend/src/services/api.js` for the full explanation.
- **Backend (Render):** Use `render.yaml` from repo root. The backend exposes `/api/algorithms`, `/api/analytics`, `/api/simulations`, `/api/execute`, and `/api/auth`.
- **Required backend env vars (set these in Render, not committed anywhere):**
  - `MONGO_URI` — your MongoDB Atlas connection string. (Note: the code and `render.yaml` both read `MONGO_URI`, not `MONGODB_URI` — using the wrong name will fail silently on boot.)
  - `FRONTEND_ORIGIN` — the deployed frontend URL (e.g. your Vercel domain), used for CORS and Socket.io. Defaults to `http://localhost:5173` for local dev.
  - `JWT_SECRET` — required; the server refuses to start without it.
  - `GOOGLE_CLIENT_ID` — optional; enables Google Sign-In when set (must match the frontend's `VITE_GOOGLE_CLIENT_ID`).
  - `PORT` — defaults to `4000`.

## Local Setup

```bash
# backend
cd backend
cp .env.example .env   # fill in MONGO_URI
npm install
npm run dev             # http://localhost:4000

# frontend (separate terminal)
cd frontend
npm install
npm run dev              # http://localhost:5173
```

The frontend reads `VITE_API_BASE_URL` for every API and Socket.io call (defaults to
`http://localhost:4000` if unset) — set it to your deployed backend URL in production,
or requests will try to reach `localhost` in every visitor's browser.

## Testing

```bash
cd frontend && npm test   # 53 tests: tree/pathfinding/sorting/graph engines
cd backend && npm test    # 16 tests: auth logic, session-id fix (User model mocked)
```

The backend suite mocks the `User`/`SimulationState` models rather than hitting a
real database, so `npm test` never needs Mongo. To actually exercise the real
register → login → save → read-back flow against a live database, run the
integration test separately with real credentials (use a scratch/dev database,
not production):

```bash
cd backend
RUN_INTEGRATION=true MONGO_URI="your-real-connection-string" JWT_SECRET=any-string \
  npx jest liveDb.integration --runInBand
```

CI (`.github/workflows/ci.yml`) runs the frontend and backend unit test suites plus
both builds on every push/PR — it never runs the live-DB integration test, since
that needs real credentials CI doesn't have.

