# Neural Foundry: Lab Wars

A browser strategy game for 2–8 players joining by room code. Each player runs an AI lab through six simultaneous rounds: bid, build, reveal, and upgrade. Guest sessions require no email, password, or installation.

## Run locally

Use Node.js 24+.

```sh
npm ci
npm run dev
```

Open `http://localhost:5173`. For another device on the same LAN, use the development machine's LAN IP and port 5173. The server binds to all interfaces. Each browser tab gets a local guest identity. Refreshing preserves it; closing the tab may lose it.

Without Supabase environment variables, a **single-process development server** persists rooms in ignored `.local-data/`. It polls for updates every 2.5 seconds. This is a development backend, not distributed production storage. Vercel and production mode refuse to fall back to it.

Practice creates two automated opponents. Bots use the same rules and authoritative engine as human players.

## Deploy to Vercel + Supabase

The initial frontend and API deployment is hosted at https://neural-foundry-lab-wars.vercel.app. **Online multiplayer is not enabled yet** because the separate Supabase project has not been provisioned. The connected Supabase project cost-check endpoint remains unavailable. No existing OpenHour/Rushline data was modified.

1. Create a **separate standard Postgres Supabase project** in the selected FreeTime organization. Confirm its plan/cost in the provider before creating it.
2. Apply the SQL file in `supabase/migrations/` once. It creates only `labwars_*` tables and service-only transactional functions. A local embedded Postgres test verifies its grants, RLS, membership visibility, and compare-and-swap behavior.
3. Enable **Anonymous Sign-Ins** under Supabase Auth. Review signup rate limits and abuse protection before public promotion. This creates technical guest identities without a player login screen.
4. Obtain the project's URL, publishable key, and **server-only secret key**. Set these Vercel environment variables:

   | Variable | Exposure |
   | --- | --- |
   | `SUPABASE_URL` | Public project URL |
   | `SUPABASE_PUBLISHABLE_KEY` | Public browser key, restricted by RLS |
   | `SUPABASE_SECRET_KEY` | Server only; never use a `VITE_` prefix |

5. Import this repository into Vercel as a Vite project. `vercel.json` specifies the frontend build and SPA routing. `api/game.ts` supplies GET and POST Web Handlers. The function uses Supabase for durable state.
6. Verify public deployment protection permits people without a Vercel account to play. Open two separate browsers, create/join a room, complete a round, refresh, and confirm both see the same result.
7. Verify Supabase Realtime receives updates to `labwars_room_signals`. The application also polls snapshots to recover missed notifications and advance expired phases. No secret bids or model plans are published as realtime payloads.

Keep database and function regions close together. Configure periodic deletion of rooms older than 48 hours and cleanup of old anonymous users; the schema contains a room-cleanup query. Room expiry is enforced by the API even before deletion.

Do not run this migration against an unrelated application project. Store real keys in provider settings or ignored `.env`, never in source control.

## Architecture

- `shared/game.ts`: deterministic game engine, ratings, bids, release rewards, upgrades, phase transitions, public projections, and bot decisions.
- `server/handler.ts`: validated guest identities, room access, server-controlled transitions, and sanitized errors.
- `server/store.ts`: local persistence for development or Supabase persistence for production.
- `api/game.ts`: Vercel server entry.
- `src/client.ts`: guest session setup, API requests, Supabase realtime notifications, and reconnect fetching.
- `src/components/`: entry, rules, lobby, auction, builder, reports, leaderboard, and upgrades.
- `supabase/migrations/`: private authoritative state plus member-only revision signals.

Production state lives in Postgres. Each write compares the room revision and atomically updates state, membership, and notification revision. Concurrent requests retry from the latest state. Browsers cannot update resources, scores, or official state directly. Service-only RPCs use security-invoker rights; no SECURITY DEFINER function is exposed.

Phase deadlines use server timestamps. Each snapshot or action checks the deadline. Missing bids pass, missing builds score zero, and missing upgrade decisions advance without a purchase. If everyone is offline, the next phase starts when someone returns, rather than simulating unattended rounds. Hosts can be replaced after 75 seconds without a heartbeat. Participants stay in the roster after leaving so they can reconnect.

## Rules

- Start with 12 credits, 0 research, and 0 Impact.
- Receive 5 credits at the start of rounds 2–6.
- Each round offers three briefs with changing targets and stretch goals; any number of labs may attempt the same brief. Later deployment targets reward distillation, and final-round stretches require accelerator access.
- Compute auction: bid 0–3 credits. Half the player count, rounded up, can win. Only positive bids qualify; tied bids follow a published rotating order. Winners pay and receive +1 Accuracy for that round.
- Compact models cost 1 with ratings 2/3/1. Balanced cost 2 with 3/2/1. Large cost 3 with 4/0/1. Ratings are Accuracy/Efficiency/Reliability.
- Data levels cost 2 each and give +1 Accuracy and +1 Reliability. Training levels cost 1 and give +1 Accuracy. Evaluation & fixes cost 1 and give +1 Reliability. Each allocation ranges from 0–2.
- Fulfill all mandatory targets for 3 Impact, plus 1 for a stretch target. Failed briefs receive no release rewards. Auction costs count toward spending stretch targets.
- Successful commercial releases earn 6 credits and 1 research. Successful research releases earn 2 credits and 3 research.
- At reveal, buy at most one 3-research upgrade or save. Data pipeline discounts the first data level by 1 credit. Test bench makes the first evaluation level free. Distillation unlocks +2 Efficiency for 1 credit. The buyer uses it next round; other labs unlock it the following round.
- Highest Impact after round six wins. Tie breaks: completed briefs, stretch targets, shared victory. Maximum score 24.
- Rematch returns everyone to the lobby with fresh resources.

Fictional ratings and economics illustrate real AI tradeoffs. This game does not actually train models. Evaluation & fixes includes correcting defects; testing alone does not increase model quality.

## Validation

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Tests cover worked examples, secret submissions, duplicate/replayed actions, overspending, invalid allocations, timer recovery, upgrade timing, delayed research sharing, host takeover, player limits, six-round completion, rematches, concurrent updates, persistence, forged sessions, and database access policies.

## Gameplay balance

Round targets and stretch goals vary across all six rounds. The original repeated Balanced language recipe no longer achieves 24 Impact. Even with every upgrade, a lab passing every auction cannot hit a final-round stretch. Accelerator access can now change points, rather than only costs.

Automated balance tests check all 18 briefs have achievable stretches and search all fixed build recipes. This rules out the known loophole, but does not establish competitive balance or fun. Human playtesting is still needed, especially for research timing, rotating auction priority, and shared maximum-score ties.

## Unverified production behavior

The live Supabase Auth/Realtime integration and Vercel function deployment have not been exercised because provisioning is blocked. Local tests validate the engine and database schema, not cloud-service availability. The hosted frontend is reachable, but room creation and joining are unavailable until backend configuration is complete.
