# YONRO / LOCKIN

LOCKIN is a personal productivity workspace for people building toward their goals. YONRO is the repository name. Phases 1–3 implement authentication, personal tasks, a focus timer, daily progress, custom habits, long-term goals and milestones, overall streaks, activity heatmaps, expanded analytics, user preferences, backend-earned XP, levels, achievements, and privacy-controlled rankings. The interface uses a modern charcoal bento theme with crisp borders, strong typography and restrained cyan accents. Communities and communication features are reserved for later phases.

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

Before a public launch, choose hosting and secret management, configure HTTPS/reverse proxy and backups, establish operational monitoring, and decide whether to add account recovery/email verification. These deployment/product decisions are not required for the local Phase 1 flow. Communities, channels, real-time chat, social feeds, challenges, public journals and build logs remain outside the current scope. Phase 3 adds XP, achievements and rankings as described below.

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

## Phase 3: XP, achievements and rankings

The existing architecture is extended in place. `/gamification` contains Overview, Achievements, XP History and Leaderboards; `/leaderboards` opens rankings directly. The dashboard includes compact level progress. All figures come from authenticated APIs. The visual theme uses charcoal bento cards, fine borders, clear typography, restrained cyan progress indicators and brief, dismissible reward notices.

### Database and APIs

The additive migration `20261002020000_phase3_gamification` adds `XPTransaction`, `Achievement`, `UserAchievement`, `GamificationProfile` and `FocusRun`, plus `XPSource`, `FocusSession.verifiedSeconds` and a default-false `UserSettings.showOnLeaderboards`. Existing data is preserved. Fourteen achievement definitions are inserted by the migration; no users or fabricated activity are seeded. Level and total XP are derived from the ledger. Streak profiles cache the existing shared activity calculation and expire at the correct productivity-day boundary.

Authenticated endpoints:

| Method | Endpoint                                            | Purpose                                                                |
| ------ | --------------------------------------------------- | ---------------------------------------------------------------------- |
| GET    | `/api/gamification/me`                              | Personal XP, level, streaks, achievements and qualified activity       |
| GET    | `/api/gamification/xp-history?limit=20&cursor=UUID` | Owner-scoped keyset history, at most 50 receipts                       |
| GET    | `/api/gamification/achievements`                    | Catalog and permanent personal unlocks                                 |
| GET    | `/api/leaderboards/weekly`, `/monthly`, `/all-time` | XP rankings                                                            |
| GET    | `/api/leaderboards/tasks`, `/focus`, `/streaks`     | Distinct productivity rankings                                         |
| POST   | `/api/focus/runs`                                   | Start an owned server-timed run with immutable target                  |
| PATCH  | `/api/focus/runs/:id`                               | Pause, resume or cancel                                                |
| DELETE | `/api/focus/runs/active`                            | Reset owned active timers, including recovery after local storage loss |

Leaderboard paths share the `/api/leaderboards` prefix. `limit` is 1–50 (default 20); task/focus rankings support `period=weekly|monthly|all-time`. Existing focus session saving and settings endpoints are extended.

### Reward rules

| Action                                              |                       Base XP | Daily base XP cap |
| --------------------------------------------------- | ----------------------------: | ----------------: |
| First completion of a planned task                  |                            10 |                50 |
| Successful habit target, once per habit/date        |                            10 |                50 |
| First completion of a goal milestone                |                            25 |                50 |
| Completed, server-timed focus of at least 5 minutes | floor(verified seconds / 150) |                80 |

Priority does not increase XP. Creating or editing items, visiting pages, refreshing and pause/resume do not earn XP. Habit history backfills keep historical analytics but earn no retroactive XP. Task/milestone events earn only on the current configured productivity day. Rewards remain permanent after reopening or deleting the source. Zero-value receipts reserve capped source identities so they cannot be farmed on a later day.

Streak rewards are once per account: 7 days +50, 14 +100, 30 +250, 60 +500, 100 +1000. The displayed overall streak uses existing task/habit/focus history. Bonus eligibility requires recorded XP-earning task, habit or verified focus activity on each day; backfills cannot manufacture streak bonuses. Milestones and achievement bonuses are outside the base action caps and are awarded once.

Level L begins at `50 × (L−1) × L` total XP: levels 1/2/3/4 start at 0/100/300/600. Each level requires an additional `100 × L` XP to advance. Formula, level names, caps and reward definitions are centralized on the server. UI components display returned progress without calculating XP rules.

Fourteen permanent achievements cover first qualifying task/focus/habit/milestone, a fully finished nonempty goal, 7/14/30/60/100-day earned streaks, 10/100 verified focus hours and 100/500 distinct XP-earning tasks. First habit/goal achievements require completed work to avoid creation-based farming. Streak badges use the separate streak bonus, avoiding double awards. There is no future-project placeholder.

### Focus verification and privacy

A single active server run per user records start/resume timestamps and accumulated active time. Pauses do not count. Completion derives verified duration from the immutable target and server clock, with a one-second scheduling tolerance. Client timestamps cannot create verified time. Legacy or unverified saves remain in personal analytics but earn no XP and are excluded from focus rankings. Server timing measures elapsed active time; it cannot prove human attention.

Public ranking participation requires both a public profile and explicit opt-in. Task, focus and streak boards also require the respective sharing flag. Auxiliary values on XP boards are omitted when their sharing flag is disabled. Email and private profile data are excluded. Opting out leaves personal analytics intact.

Each weekly/monthly ranking uses a single common UTC interval derived from the viewer's timezone and productivity-day settings; response metadata identifies that window. XP uses receipt creation timestamps; verified focus uses session start timestamps. Task completion uses the currently completed / planned task cohort created in the window, with a centralized minimum of 10 planned tasks. Current streak ranks the current shared streak, with expiry, rather than inventing a period streak. Equal scores share rank; usernames give stable display order. SQL returns only the requested top entries plus the viewer's own rank.

### Integrity and verification

User-row locks precede parent locks; the productive action, receipt, achievement unlock and streak cache commit in the same transaction. Unique source and unlock constraints enforce idempotency. Reward identities always come from middleware and owned database objects. No frontend XP, level or ranking values are accepted. No database reset is required.

The latest full PostgreSQL run passes **62 tests** with zero failures/skips. **Three browser workflows** pass across authentication/tasks/focus, Phase 2 habits/goals/analytics and Phase 3 rewards/rankings/privacy, including desktop, tablet and mobile. Tests use disposable accounts and clean up only their own records. See `outputs/PHASE-3-HANDOFF.md` for the engineering handoff and screenshots.

## Public hosting: Vercel + Render + Neon

The production API defaults to `0.0.0.0` and trusts one upstream proxy hop, matching Render's edge. The browser continues to call same-origin `/api` endpoints: Vercel proxies them to Render. This preserves the existing HttpOnly, Secure, SameSite=Lax session cookie and exact-origin CSRF checks without relying on third-party cookies. API responses are never cached. The production client allows 90 seconds for a sleeping free backend to wake up; local requests keep their existing timeout.

1. Create a dedicated **free Neon PostgreSQL project** for the public app. Use its direct TLS connection URL, with `connection_limit=5` added to the query string for this long-running backend. Keep the connection string in Render's environment settings; never commit it. The cloud database starts empty and receives the existing additive migrations; local user data is not uploaded.
2. In Render, create a Blueprint from this repository and `render.yaml`. It explicitly selects a free Node web service in Singapore. Set `DATABASE_URL` to the Neon connection URL and `CLIENT_ORIGIN` to the exact frontend origin. Render generates a separate production JWT secret. Build installs locked dependencies and generates Prisma Client; startup applies migrations before serving traffic.
3. Build the frontend with `npm run build`. Run `node scripts/prepare-vercel.mjs https://YOUR-ACTUAL-API.onrender.com` using the service's real HTTPS URL. This produces a public-assets-only package in `work/vercel-site` and a root `vercel.json` for future repository deployments. The backend URL is public configuration, not a credential.
4. Deploy `work/vercel-site` to Vercel. Set Render's `CLIENT_ORIGIN` to the resulting Vercel origin, without a trailing slash, then redeploy/restart Render. When claiming the Vercel deployment or moving to a stable project/custom domain, update `CLIENT_ORIGIN` to that new origin too.
5. Verify both direct and proxied `/api/health`, SPA routes such as `/login` and `/gamification`, signup, login after refresh, task/habit persistence, focus, reward reads and logout revocation. A frontend deployment alone is not a working full app until the backend/database connection is verified.

Free Render web services sleep after inactivity and can take time to wake up. Render's free Postgres database expires after 30 days, which is why the deployment uses a separate Neon database. Free tiers have usage/storage limits and are suitable for an initial public hobby app; no paid resources are required by this configuration.

References: [Render free hosting](https://render.com/docs/free), [Render public web-service binding](https://render.com/docs/web-services), [Vercel external rewrites](https://vercel.com/docs/routing/rewrites), [Neon free PostgreSQL](https://neon.com/docs/introduction/plans).
