# YONRO / LOCKIN

LOCKIN is a personal productivity workspace for people building toward their goals. YONRO is the repository name. Phases 1–2 implement authentication, personal tasks, a focus timer, daily progress, custom habits, long-term goals and milestones, overall streaks, activity heatmaps, expanded analytics, and user preferences. Social features are intentionally reserved for later phases.

## Stack

- **Client:** React 19, Vite 6, JavaScript, Tailwind CSS 4, local shadcn/ui-style Radix components, React Router, Zustand, Axios, Recharts, Lucide icons.
- **API:** Node.js 20.19+, Express 5, JavaScript, PostgreSQL 17, Prisma 6.19, JWT, bcrypt, Zod, Luxon.
- **Verification:** ESLint, Node's test runner, Supertest, Playwright with locally installed Chrome.

Prisma 6 and Vite 6 are explicitly selected for the available Node 20 runtime and a JavaScript-first architecture. There is no Next.js or TypeScript application code. Commit `package-lock.json` so installs are reproducible. Root overrides keep the Prisma tooling dependencies `deepmerge-ts` and `effect` on patched releases; the Prisma generation and migration commands are verified with these overrides.

## Quick start

Prerequisites: Node.js >=20.19, npm, and Docker Desktop (running), or your own PostgreSQL instance.

From the repository root:

```sh
npm ci
docker compose up -d
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Replace `JWT_SECRET` in `server/.env` with a random secret of at least 32 characters. Generate one with:

```sh
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

The Compose database URL is:

```text
postgresql://yonro:local_development_only@localhost:5433/yonro?schema=public
```

These credentials are for local development only. For an existing PostgreSQL server, create a database and a dedicated role, replace `DATABASE_URL`, and skip Docker. Do not commit `.env` files. A persistent Docker volume keeps local data across restarts; `docker compose down` stops the database without deleting that volume.

```sh
npm run db:generate
npm run db:deploy
npm run dev
```

Open **http://localhost:5173** and create an account. The API runs on **http://127.0.0.1:4000**. There are no seeded credentials or fabricated dashboard statistics. Signup initializes the browser's timezone and a 04:00 day boundary.

Run separately if preferred:

```sh
npm run dev -w server
npm run dev -w client
```

Use `localhost` consistently in the browser: `CLIENT_ORIGIN` defaults to `http://localhost:5173`. If you change the web origin, update that setting too. Vite proxies `/api` to Express, and authentication uses an HttpOnly cookie. `VITE_API_URL` defaults to `/api`; prefer same-origin hosting in production.

## Project layout

```text
client/
  src/
    components/           Sidebar, TopBar, task editor/list/cards, timer, stats,
                          progress, chart, error/loading/empty states
      ui/                 Local reusable Button and Radix Dialog
    pages/                Auth, Dashboard, Tasks, Focus, Analytics, Settings
    stores/               Auth, productivity data, persisted focus timer
    lib/                  Axios instance, formatting and error helpers
    App.jsx               Routing
    index.css             Responsive dark theme + Tailwind
  e2e/                    Real-browser core workflow test
server/
  src/
    controllers/          Request/response adapters
    services/             Business logic and Prisma access
    routes/               Endpoint composition
    middleware/           Authentication, validation, central errors
    validators/           Zod request schemas
    utils/                Productivity-day, summary and streak logic
    lib/                  Validated environment and Prisma client
    app.js                Express composition, CORS/CSRF safeguards
    index.js              Startup and graceful shutdown
  prisma/
    schema.prisma
    migrations/           Committed initial SQL migration
  tests/                  Date/metric tests and PostgreSQL API integration
compose.yaml              Local PostgreSQL with persistent storage
```

Prisma is accessed through services; controllers and routes do not query the database. Middleware resolves the authenticated user with their settings before protected controllers run.

## Database models

| Model          | Fields and relationships                                                                                                                                                                                             |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `User`         | UUID `id`, `firstName`, `lastName`, unique normalized `username` and `email`, `passwordHash`, nullable `profileImage` and `bio`, `createdAt`, `updatedAt`; owns settings, tasks, focus sessions, and login sessions. |
| `UserSettings` | Primary key/FK `userId`, `dayStartTime`, IANA `timezone`, `profileVisibility`, `showActivity`, `showFocusTime`, `showStreak`. Default privacy is private with all sharing toggles off.                               |
| `Task`         | UUID `id`, FK `userId`, `title`, optional `description`, `category`, enum `priority`, enum `status`, optional `estimatedMinutes`, `productivityDate`, nullable `completedAt`, `createdAt`, `updatedAt`.              |
| `FocusSession` | UUID `id` (client-generated for idempotent saves), FK `userId`, `startedAt`, `endedAt`, `durationSeconds`, `productivityDate`, `createdAt`. Only completed sessions are stored.                                      |
| `AuthSession`  | UUID `id`, FK `userId`, `expiresAt`; backs JWT revocation on logout.                                                                                                                                                 |

Statuses: `TODO`, `IN_PROGRESS`, `COMPLETED`, `SKIPPED`. Priorities: `LOW`, `MEDIUM`, `HIGH`. Task/focus indexes cover `(userId, productivityDate)`. Foreign keys cascade on user deletion. Dates are `YYYY-MM-DD` local calendar labels; timestamps are stored as database timestamps representing UTC instants through Prisma.

## Productivity-day and metric rules

`getProductivityDay(userSettings, timestamp)` is the shared backend source of truth. With a 04:00 boundary, a day starts at local 04:00 and ends just before the next local 04:00. It uses IANA timezone rules and calendar arithmetic, so DST days can be 23 or 25 hours. A repeated DST boundary uses the first occurrence; a nonexistent boundary moves forward by the DST gap (02:30 becomes 03:30).

- **Planned tasks:** all tasks assigned to that productivity date, including skipped tasks.
- **Completed tasks:** assigned tasks currently marked `COMPLETED`.
- **Completion:** rounded `completed / planned × 100`; an empty day is 0%.
- **Overall streak:** consecutive productivity dates with at least one completed planned task, successful habit entry, or finished focus session. If today has none yet, the streak may end yesterday. Missing days break it. Uncompleting/deleting tasks updates the metric.
- **Week:** Monday–Sunday based on the current productivity-date label. Weekly completion is weighted across all planned tasks, not an average of daily percentages. Focus time includes completed sessions only.
- **Editing plans:** adding, deleting, rescheduling, skipping, and uncompleting update the live denominator. Phase 1 does not freeze a beginning-of-day planning snapshot.
- **Settings changes:** existing records retain their assigned dates. Settings govern new task assignments, new focus saves, and which date is considered today. Historical records are not silently rewritten.
- **Focus sessions:** attributed to the productivity day of the session's start, using settings at save time. Pauses do not count as focused seconds. The timer stores wall-clock timestamps and accumulated active time in browser storage and survives renders, route changes, and refreshes. Reset discards the current session after confirmation. Logout asks before discarding an active or unsaved session.

The dashboard refreshes at the productivity-day boundary, periodically, and when the tab becomes visible. The Tasks page supports a date selector, filters, and category/title search.

## API

JSON request/response bodies. Auth returns `{ user }` and sets an HttpOnly JWT cookie rather than exposing tokens to browser storage. Protected routes require this cookie.

| Method | Route                        | Purpose                                                                          |
| ------ | ---------------------------- | -------------------------------------------------------------------------------- |
| GET    | `/api/health`                | API health                                                                       |
| POST   | `/api/auth/signup`           | Create user/settings and login session                                           |
| POST   | `/api/auth/login`            | Authenticate and set cookie                                                      |
| POST   | `/api/auth/logout`           | Revoke session and clear cookie                                                  |
| GET    | `/api/auth/me`               | Current user with settings; no password hash                                     |
| GET    | `/api/tasks?date=YYYY-MM-DD` | List own tasks; defaults to today                                                |
| POST   | `/api/tasks`                 | Create task                                                                      |
| PATCH  | `/api/tasks/:id`             | Edit task, category, priority, status, duration, date                            |
| DELETE | `/api/tasks/:id`             | Delete own task                                                                  |
| POST   | `/api/tasks/:id/complete`    | Mark completed and set completion timestamp                                      |
| POST   | `/api/tasks/:id/uncomplete`  | Return to TODO and clear completion timestamp                                    |
| GET    | `/api/productivity/today`    | Date, planned/completed tasks, percentage, streak, focus seconds, day boundaries |
| GET    | `/api/productivity/week`     | Week dates, totals, daily completion/focus breakdown                             |
| GET    | `/api/analytics/week`        | Same weekly summary for Analytics                                                |
| GET    | `/api/focus/sessions`        | Latest 50 own completed sessions                                                 |
| POST   | `/api/focus/sessions`        | Save completed session; retry-safe by UUID                                       |
| GET    | `/api/settings`              | Current preferences                                                              |
| PATCH  | `/api/settings`              | Validate/update preferences                                                      |

Signup requires `firstName`, `lastName`, `username`, `email`, `password`; `timezone` is optional. Username/email normalize to lowercase. Passwords require at least 8 characters and at most bcrypt's 72 UTF-8 bytes; bcrypt uses cost 12. JWTs expire after 7 days and are checked against active database sessions. Logout revokes that JWT even if a cookie was copied.

Task creation requires `title`; other fields use sensible defaults. Focus creation requires `id`, ISO UTC `startedAt`/`endedAt`, and integer `durationSeconds` (1–21,600). The API rejects durations longer than the supplied elapsed wall time and future timestamps (with 5 seconds of clock-skew tolerance), but it does not attempt anti-cheat verification.

Errors have `{ error: { message, details? } }`. Validation uses 400; unauthenticated requests 401; forbidden origins 403; missing/other-user resources 404; duplicate signup/session identifiers 409; oversized bodies 413; auth rate limits 429; unexpected failures 500 with a safe public message and server-side logging. Password hashes are never returned. All task updates/deletes scope by both ID and owner.

## Checks

```sh
npm run lint
npm run build
npm test
npm run format:check
```

`npm test` runs date/metric/validator tests without a database; the PostgreSQL integration suite is intentionally skipped unless explicitly enabled.

To run it, create a dedicated test database (never production), migrate it, then test:

```sh
docker compose exec -T postgres psql -U yonro -d postgres -c 'CREATE DATABASE yonro_test;'
DATABASE_URL='postgresql://yonro:local_development_only@localhost:5433/yonro_test?schema=public' npm run db:deploy
RUN_INTEGRATION=1 DATABASE_URL='postgresql://yonro:local_development_only@localhost:5433/yonro_test?schema=public' npm test
```

The suite refuses a database URL without the `yonro_test` name. It tests auth, revocation, ownership, validation, CSRF origin checks, tasks, streaks, focus retries, analytics, and settings. Test users are removed afterward.

With the app running and Google Chrome installed:

```sh
npm run test:e2e
```

The browser suite creates and removes a disposable account in the local app database. It verifies signup/login/logout, task creation/edit/completion/uncompletion/deletion, filters, focus presets/pause/resume/reset/refresh persistence/completion, analytics, saved settings, 390px mobile layout, and returning to login after session expiry. It backdates a persisted timer to exercise completion after refresh without waiting a real minute. It writes dashboard/mobile screenshots to `outputs/` and retains failure traces in `test-results/`.

## Migrations and production setup

For schema development:

```sh
npm run db:migrate -w server -- --name describe_your_change
npm run db:generate
```

For an existing migration in another environment:

```sh
npm run db:deploy
```

Never use schema reset against real user data. Review and commit migrations. Useful local command: `npm run db:studio -w server`.

Production builds:

```sh
npm ci
npm run db:generate
npm run db:deploy
npm run build
npm start
```

Serve `client/dist` with a web server that falls back to `index.html` for React routes and reverse-proxies `/api` to the API on port 4000. Set `NODE_ENV=production`, a real `DATABASE_URL`, a strong `JWT_SECRET`, and the exact HTTPS `CLIENT_ORIGIN`. Cookies are Secure in production. Express binds to loopback by default for a same-machine reverse proxy; adapt the bind address and trusted-proxy configuration deliberately for container/platform deployments. The development Compose password must not be reused in production. No production host is configured or deployed.

## Scope and remaining limits

All requested Phase 1 flows are implemented. Privacy controls are persisted preferences for future social features; they do not publish profiles in Phase 1. Focus recovery is browser-local, not synchronized across devices, and can be lost if browser storage is cleared. Historical metrics change if the underlying task plan is edited. The backend accepts self-reported focus times with structural/time validation; anti-cheat is out of scope.

Before a public launch, choose hosting and secret management, configure HTTPS/reverse proxy and backups, establish operational monitoring, and decide whether to add account recovery/email verification. These deployment/product decisions are not required for the local Phase 1 flow. No communities, channels, real-time chat, feed, leaderboards, XP, achievements, challenges, public journals, or build logs have been added.

Framework setup references: [Tailwind + Vite](https://tailwindcss.com/docs/installation/using-vite), [shadcn + Vite](https://ui.shadcn.com/docs/installation/vite), [Prisma v6 documentation](https://www.prisma.io/docs/orm/v6).

## Phase 2: habits, goals and activity

The existing React → API service → Express route → controller → service → Prisma architecture is extended in place. New authenticated browser routes are `/habits`, `/habits/:id`, `/goals`, and `/goals/:id`. Dashboard and Analytics keep their original task/focus sections and add habits, goals, overall streaks, and the same reusable activity heatmap.

### Models and additive migration

- `Habit`: user-owned name, description, type, target value/direction, unit, active flag and timestamps. Types are `BOOLEAN`, `NUMBER`, `DURATION`, `PERCENTAGE`, `COUNTER`. Target direction is `AT_LEAST` or `AT_MOST` (inclusive).
- `HabitEntry`: parent habit, productivity date, numeric value, stored completion decision and timestamps. `(habitId, productivityDate)` is unique; history is relational, not JSON.
- `Goal`: user-owned title, description, optional target date, `ACTIVE` / `COMPLETED` / `ARCHIVED` status and timestamps.
- `GoalMilestone`: parent goal, title, description, unique per-goal order, completion flag/date and timestamps.

`20261002010000_phase2_habits_goals` adds these tables, enums, foreign keys and indexes plus an index for task activity. It does not reset the database or drop existing tables. Deploy it with the existing `npm run db:deploy`. Deleting a habit or goal through its confirmed UI/API removes only its own children. Archiving preserves history.

### Phase 2 endpoints

All routes below require the existing authenticated cookie. Identity comes from middleware; client-supplied ownership fields are rejected.

| Method               | Route                                       | Purpose                                                                   |
| -------------------- | ------------------------------------------- | ------------------------------------------------------------------------- |
| GET / POST           | `/api/habits`                               | List own habits (`scope=active`, `archived`, `all`) / create              |
| GET / PATCH / DELETE | `/api/habits/:id`                           | Read / edit / delete own habit                                            |
| POST                 | `/api/habits/:id/entries`                   | Upsert a date's value; default date comes from user settings              |
| GET                  | `/api/habits/:id/entries?days=30`           | Selected history; 7, 30, 90 or 365 days                                   |
| DELETE               | `/api/habits/:id/entries/:productivityDate` | Clear a recorded entry                                                    |
| GET                  | `/api/habits/:id/analytics?days=30`         | Habit, history, chart, statistics and all-time streaks                    |
| GET / POST           | `/api/goals`                                | List own goals (`status=ALL`, `ACTIVE`, `COMPLETED`, `ARCHIVED`) / create |
| GET / PATCH / DELETE | `/api/goals/:id`                            | Read / edit / delete own goal                                             |
| POST                 | `/api/goals/:id/milestones`                 | Append a milestone                                                        |
| PUT                  | `/api/goals/:id/milestones/order`           | Reorder using every milestone UUID exactly once                           |
| PATCH / DELETE       | `/api/milestones/:id`                       | Edit, complete/reopen, or delete a milestone                              |
| POST                 | `/api/milestones/:id/complete`              | Complete a milestone idempotently                                         |
| GET                  | `/api/analytics/overview`                   | Daily/weekly/monthly productivity, focus, habit trends/streaks and goals  |
| GET                  | `/api/analytics/heatmap?days=365`           | Real database activity for up to 365 productivity days                    |

Boolean values are 0 or 1 with target 1 and unit `completed`; duration values/targets are integer minutes; percentage values/targets are 0–100 with positive targets and unit `%`; counters are nonnegative integers; numbers may be fractional. Numeric targets are positive. Habit entry dates can be backfilled within the last 365 productivity days, including today. Future dates are rejected.

Completion decisions are saved with each entry. Editing a target/direction preserves historical success; re-saving an entry evaluates the current target. The current progress bar compares its value with the current target. Tracking type and unit cannot change after history exists; create a new habit instead. Archived habits remain in historical analytics but cannot receive new entries until restored.

Habit statistics omit missing days from average/min/max and calculate target completion as successful / tracked days. Charts leave missing dates untracked. Current and best streaks use all-time successful date labels even when a shorter chart range is selected. Overall activity counts completed tasks + successful habits + completed focus sessions; the Focus heatmap uses minutes. Goals do not count as daily meaningful activity. Goal progress is rounded completed milestones / total milestones; an empty goal is 0%. Goal status is an explicit preference, separate from milestone progress. A goal supports at most 100 milestones.

Activity is grouped in PostgreSQL through Prisma, with fixed query counts rather than per-day/per-habit queries. Reordering and entry writes use parent-row locks and transactions. Shared client read caching deduplicates concurrent consumers, invalidates affected data after mutations, and rejects late responses from old accounts or old requests. Filters use the same fetched heatmap data. Visibility and productivity-day changes refresh cached resources.

### Phase 2 verification

Use the same check commands above. The full PostgreSQL test run has 44 passing tests, including Phase 1 regression, typed habit validation, date/DST boundaries, ownership for every new API, concurrent upserts/appends/reordering, snapshot history, derived progress, real heatmap aggregates, and client cache deduplication/invalidation/account isolation.

The two Playwright workflows cover Phase 1 and all five Phase 2 habit types, edit validation, archive/restore, history ranges and editing, milestones/progress/reorder, persisted data after reload, populated dashboard, heatmap keyboard/filter behavior, tablet/mobile width, and explicit loading/error/retry states. Screenshots use disposable test data that is removed afterward. No mock statistics or seed accounts are installed in the application.
