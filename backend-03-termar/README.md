# Termar — field worksheet API (helper backend)

## Run it

```bash
node server.js
# or
npm start
```

It listens on `http://localhost:4000` (override with `PORT`). All data lives in
memory and **resets every time you restart** — edit `seed.json` if you want to
change the starting state.

> This server is deliberately simple: it always responds instantly and never
> pretends to be offline. Simulating "no signal", the outbound queue and conflict
> handling is the interesting part of this exercise, and it belongs in your
> frontend — where you can turn it on and off at will.

## Endpoints

| Method | Path                                  | What it does                                              |
| ------ | ------------------------------------- | --------------------------------------------------------- |
| `GET`  | `/api/day`                            | The technician and the day this seed represents.          |
| `GET`  | `/api/jobs`                           | The day's jobs, in scheduled order.                       |
| `GET`  | `/api/jobs/:id`                       | One job.                                                  |
| `GET`  | `/api/jobs/:id/worksheet`             | The saved worksheet for a job (`404` if none yet).        |
| `PUT`  | `/api/jobs/:id/worksheet`             | Save (create or replace) a worksheet. Send the JSON body. |
| `POST` | `/api/jobs/:id/status`                | Update sync status, e.g. `{ "status": "synced" }`.        |
| `GET`  | `/api/checklist-templates`            | All checklist templates.                                  |
| `GET`  | `/api/checklist-templates/:plantType` | One template (`gas_boiler` or `chiller`).                 |
| `GET`  | `/api/van-stock`                      | What's on the van.                                        |
| `GET`  | `/api/sync-queue`                     | A snapshot of the outbound queue.                         |

CORS is wide open, so a frontend on any dev port can call it.

## Quick check

```bash
curl http://localhost:4000/api/jobs
curl -X PUT http://localhost:4000/api/jobs/job-88231/worksheet \
  -H 'Content-Type: application/json' \
  -d '{"startedAt":"2026-06-30T16:05:00","checks":[{"id":"ch-01","result":"pass"}]}'
```

## About the data

The seed is one technician's day — Ángel Sarasa, van 14, 30 June 2026. A few
things that look like mistakes but are not:

- **A job's `status` is its _sync_ status, not its _work_ status.** A job can be
  fully completed by the technician and still be `queued`. They are two different
  ideas and the UI has to keep them apart.
- **`job-88223` is in `conflict`.** Ángel completed it offline, and while he was
  underground the dispatcher reassigned it to Berta Aína, who also completed it.
  Both worksheets exist; `conflictWith` records the other one.
- **All timestamps are local, with no timezone.** That is not an oversight:
  offline, the tablet's own clock is the only clock there is, and time on site is
  what the client gets billed.
- **Photo sizes in the sync queue are realistic** — around 2 MB each. A dozen
  photos on a hard job is ~25 MB sitting in local storage waiting for signal, and
  routes can last two days.
- **`attempts` in the queue counts sync attempts**, not job retries.

## Files

- `server.js` — the HTTP server and routes.
- `data.js` — the in-memory data layer; functions that return and mutate the data.
- `seed.json` — the starting data (a copy of the exercise seed).
