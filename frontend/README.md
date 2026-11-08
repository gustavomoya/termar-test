# Termar Servicios

Offline-first web application for a Termar Servicios technician to complete
worksheets on an Android tablet. Work is saved on the device first (IndexedDB)
and sent to the office when there is a connection, without losing data if the
signal drops.

- **Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4,
  Zustand, `idb` and Serwist (`@serwist/turbopack`).
- **Supporting backend:** `../backend-03-termar` (Node.js with no dependencies).
- **Requirements and decisions documentation:** `../REQUIREMENTS.md`,
  `../ASSUMPTIONS.md`.

---

## Requirements

- **Node.js 20.9 or newer** (Next.js 16 requirement) and `npm`.
- An up-to-date Chromium browser (Chrome/Edge) on the tablet or in the browser's
  device emulator.
- Port **3000** free for the frontend and **4000** for the backend (or set
  different ones with `PORT` / `NEXT_PUBLIC_API_BASE`).

---

## Getting started

### 1. Start the backend

In one terminal:

```bash
cd backend-03-termar
node server.js
```

The server runs at `http://localhost:4000` and loads the initial state from
`seed.json`. Data lives **in memory**: restarting the process returns to the
sample state.

### 2. Configure and start the frontend

In another terminal:

```bash
cd frontend
cp .env.local.example .env.local   # adjust the values if needed
npm install
npm run dev
```

Open `http://localhost:3000`. For the demo, use the browser's responsive mode
at a tablet width (for example, 900–1100 px).

> `NEXT_PUBLIC_*` variables are inlined at startup. If you change `.env.local`,
> restart `npm run dev`.

### 3. Production build (optional)

```bash
npm run build
npm start
```

---

## Environment variables

Copy `.env.local.example` to `.env.local`. The `.env.local` file is ignored by
Git; the example file is versioned.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_API_BASE` | No | `http://localhost:4000` | Backend base URL. No trailing slash. |
| `NEXT_PUBLIC_DEMO_CONFLICT` | No | `false` | `true` seeds a local worksheet for `job-88223` to demonstrate conflict resolution. It only writes to IndexedDB. |
| `NEXT_PUBLIC_DEMO_NETWORK` | No | `false` | `true` shows the **Simulate no signal** switch in the headers. It simulates loss of signal without changing the real network. |

In a real deployment, leave both `NEXT_PUBLIC_DEMO_*` variables unset or set to
`false`.

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Development server at `http://localhost:3000`. |
| `npm run build` | Builds the application for production. |
| `npm start` | Serves the production build. |
| `npm run lint` | Runs ESLint. |
| `npx tsc --noEmit` | Type check without emitting files. |

---

## Backend connection

The HTTP client (`lib/api/client.ts`) uses `NEXT_PUBLIC_API_BASE` and applies an
8 s timeout. It distinguishes between:

- `NetworkError`: no connection, unreachable server or timeout.
- `ApiError`: HTTP 4xx/5xx response.

Endpoints consumed:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/day` | Day data (technician, date, depot). |
| `GET` | `/api/jobs` | List of the day's jobs. |
| `GET` | `/api/jobs/:id` | Job details. |
| `GET` | `/api/jobs/:id/worksheet` | Worksheet stored on the server. |
| `POST` | `/api/jobs/:id/worksheet` | Send the completed worksheet. |
| `POST` | `/api/jobs/:id/status` | Update the job status. |
| `GET` | `/api/checklist-templates` | Checklist templates. |
| `GET` | `/api/checklist-templates/:plantType` | Template by plant type. |
| `GET` | `/api/van-stock` | Van stock. |
| `POST` | `/api/sync-queue` | Sync registration. |

The backend handles `OPTIONS` requests and allows access from the development
frontend.

---

## Local storage

Business data lives in IndexedDB (database `termar-field`, via `idb`). The UI
never accesses IndexedDB or `fetch` directly: it goes through `lib/stores` →
`lib/services` → `lib/api` / `lib/db`.

- Work is saved locally before attempting to send it.
- The outbox retries with increasing backoff.
- `localStorage` is only used for the simulated-signal flag
  (`termar:simulated-offline`).

To reset the demo from scratch: restart the backend and delete the
`termar-field` database from DevTools → Application → IndexedDB.

---

## Progressive Web App (PWA)

The app ships a service worker built with Serwist (`@serwist/turbopack`) and a
web app manifest, so it can be installed and opened offline after the first
online load.

- **Manifest:** `app/manifest.ts` is served at `/manifest.webmanifest` with the
  app name, theme colors and 192/512/maskable icons.
- **Service worker:** `app/sw.ts` precaches the app shell (`/`, `/sync`) and the
  static assets. Routes visited online are cached at runtime; routes that were
  never visited fall back to `/~offline`.
- **Registration:** `SerwistProvider` in `app/layout.tsx` registers
  `/serwist/sw.js`, served by the route handler in `app/serwist/[path]`.
- **Development:** the dev server uses a network-only service worker, so there
  is no caching during `npm run dev`. To test installation and offline startup,
  use a production build:

```bash
npm run build
npm start
```

Open `http://localhost:3000` once with the backend running so the day data and
the app shell are cached. After that you can stop the backend, reload the page
and navigate between **Today** and **Sync** without a connection.

> Browsers require HTTPS or `localhost` to register a service worker. On a
> tablet, serve the build over HTTPS or expose `localhost` through port
> forwarding.

---

## Demo: offline flow

> The in-session flow works with `npm run dev` and the **Simulate no signal**
> switch. To demonstrate a real reload/startup without network, use the
> production build described in
> [Progressive Web App](#progressive-web-app-pwa).

1. With the backend running, open `http://localhost:3000` and wait for the day
   to load. The data is now cached on the tablet.
2. Open a job, start the timer, complete checks, parts, a photo and the
   signature. Everything autosaves.
3. Turn on **Simulate no signal** in the header (requires
   `NEXT_PUBLIC_DEMO_NETWORK=true`). The indicator switches to offline.
4. Press **Finish job**. The worksheet stays pending on the tablet and the
   pending counter on the **Today** screen increases.
5. Open **Sync**: you will see the waiting items, their size and attempts.
   **Try sending now** is disabled without signal.
6. Turn off **Simulate no signal**. The queue is sent automatically and the
   items move to **At the office**.
7. Reload with signal to confirm the state persists.
8. With the production build, stop the backend and reload again: the app shell
   still opens, **Today** and **Sync** remain reachable, and unvisited routes
   show the `/~offline` fallback.

---

## Demo: conflict between technicians

With `NEXT_PUBLIC_DEMO_CONFLICT=true`, loading the day creates a local worksheet
for `job-88223`, which the backend already marks as `conflict`.

1. Open **Sync**. **One job was done twice** appears with both versions.
2. Compare your worksheet with the other technician's (time, checks, failures,
   parts, photos and signature).
3. Choose an option:
   - **Keep mine**: your worksheet is kept and sent.
   - **Keep Berta's**: the other technician's worksheet is kept.
   - **Send both**: your worksheet is sent and the available metadata from the
     other one is kept; the office receives a note about the resolution. The
     backend only accepts one worksheet per job, so it does not claim both
     arrive.
4. The discarded worksheet is archived in the local `archive` store. There is no
   screen to recover it yet.

---

## Accessibility and tablet use

- Touch targets of at least 48 px and a fixed bottom action bar.
- Status is never conveyed by color alone: there is always text or an icon.
- Visible focus, heading hierarchy and ARIA labels.
- Respects the device's text scaling and `prefers-reduced-motion`.
- Browser warning and save when leaving a worksheet with changes.

---

## Project structure

```text
frontend/
├─ app/
│  ├─ manifest.ts        # Web app manifest (/manifest.webmanifest)
│  ├─ sw.ts              # Serwist service worker
│  ├─ serwist/[path]/    # Service worker route handler
│  └─ ~offline/          # Offline fallback page
├─ components/           # UI by screen (today, worksheet, sync, shared)
├─ lib/
│  ├─ api/               # HTTP client and endpoints
│  ├─ db/                # IndexedDB, schema and migrations
│  ├─ services/          # Business rules and orchestration
│  ├─ stores/            # UI state (Zustand)
│  ├─ sync/              # Outbox and retries
│  ├─ demo/              # Demo-only data and flags
│  └─ network/           # Connection state and simulation
├─ public/icons/         # PWA icons (192, 512, maskable, apple-touch)
└─ .env.local.example    # Example environment variables
```
