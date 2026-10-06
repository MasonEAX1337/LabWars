# Lab Wars: competition brief and design rationale

Neural Foundry: Lab Wars adapts an existing single-player AI-company game into a browser party strategy game for the **Handshake AI Skills Studio × OpenAI Multiplayer Game Challenge**. This document records the competition requirements, the deliberate design choices made to meet them, and the evidence still needed before submission.

This is a design and readiness document, not a claim that the entry is already complete or will receive a particular judging score.

## Competition and authoritative sources

Sources checked on **October 6, 2026**:

- [Handshake public mission: Create a Multiplayer Game with OpenAI](https://joinhandshake.com/learn/create-a-multiplayer-game-8d7d59b5/)
- [Contest official rules PDF](https://go.joinhandshake.com/rs/390-ZTF-353/images/%5BAI_Skills_Studio_Challenge%5D_Contest_Official_Rules.pdf?version=0)

The public mission asks participants to plan, build, test, and publish a reusable multiplayer browser game using ChatGPT Work. It calls for a public URL, room-code joining, synchronized screens, no player login or installation, and play from phones or laptops.

The official rules specify submission through the Handshake mission with a **title, cover image, description, and project URL**. The deadline is **October 30, 2026 at 11:59 PM Pacific**. The public landing page advertises October 31; use the earlier official deadline. Entrants must meet the official age, location, and Handshake-account eligibility conditions. The top three winners receive $1,000 each.

The detailed signed-in mission has not been independently checked here. Review it for any additional instructions before submitting. **2–8 players, six rounds, and a roughly 15–20 minute session are our chosen product constraints**, not player-count or duration requirements verified from the public mission page.

## Why the original iOS concept changed

Neural Foundry's original campaign develops an AI company over four eras and 12 milestones. Long training timers, field trials, away assignments, and persistent growth suit an individual returning to an iOS app over many days.

A party website needs a different rhythm: friends join together, understand the choices quickly, compete in the same session, see results together, and reach a clear ending. Lab Wars therefore compresses the lab-building idea into six simultaneous rounds while preserving its strongest identity: choose data, model size, training effort, reliability work, and a release strategy to turn a problem into a useful AI product.

Models and upgrades persist **within a match**. A rematch starts fresh. The long campaign and offline production are intentionally absent because waiting hours would obstruct a shared session.

## Requirement-to-design mapping

| Public mission expectation | Deliberate Lab Wars choice | Evidence and current limit |
| --- | --- | --- |
| A multiplayer game | 2–8 independent rival labs share one authoritative match. A limited accelerator auction connects their decisions. | Engine and API tests cover multiple players, concurrent submissions, and the eight-player cap. A local browser test uses separate desktop and phone sessions. Hosted six-round desktop/phone play and an eight-player concurrent room also passed on October 6, 2026. |
| Join by room code | One player creates a room. Others enter its six-character code and a lab name. Invite links can carry the code. | Lobby, membership checks, room capacity, and duplicate-name handling are implemented. |
| No player login | Guest identities are created behind the scenes. Players provide no email or password. | Production uses Supabase anonymous sign-ins. This still creates a technical identity; it is not an account-registration screen. Anonymous sign-ins are enabled and guest joining was verified online. |
| No app installation | A React website runs in the browser instead of requiring the iOS app. | Vercel serves the frontend and API. No native download is part of joining. |
| Keep screens synchronized | Server-controlled phases, deadlines, resources, and scores drive every client. Supabase revision notifications trigger snapshot refreshes, with polling recovery. | Atomic revision checks prevent concurrent requests from awarding results twice. Rival bids and pending builds are omitted from client snapshots. The hosted eight-player check received 13 Realtime updates. |
| Play on phones or laptops | Responsive builder, compact cards, touch controls, and a shared room flow across screen sizes. | Desktop and 390-pixel phone browser tests cover a full local match, refresh, and rematch. Actual-device usability still needs human testing. |
| Reusable and replayable | Six rounds end in a winner or shared win. The host can reset the room for a rematch. New rooms can be created independently. | Full-match and rematch tests pass. Hosted rematch behavior passed. Long-term availability still needs monitoring. |
| Public playable URL | Frontend and API are hosted at [neural-foundry-lab-wars.vercel.app](https://neural-foundry-lab-wars.vercel.app). Durable state belongs in a separate Supabase project. | Database access, guest auth, production settings, and desktop/phone play have now been verified online. Ongoing availability still needs monitoring. |
| Plan, approve, test, and iterate with ChatGPT Work | The owner chose Lab Wars, reviewed rules and scoring, approved the stack, and authorized implementation. Testing exposed a repeated-recipe scoring loophole that was revised. | The resulting source and test suite are public in [MasonEAX1337/LabWars](https://github.com/MasonEAX1337/LabWars). Preserve representative process screenshots for the submission if requested. |

## Judging criteria and our intended response

The official rubric gives each category **25%**. The following mapping is our interpretation of how the product addresses that rubric, not an assessment by Handshake.

| Criterion | Design response | What must still be demonstrated |
| --- | --- | --- |
| Execution | Authoritative rules, atomic room updates, private submissions, timeout recovery, reconnect behavior, and rematches. | Hosted guest play, synchronization, concurrent scoring, and rematch checks passed. Longer observation and real-player sessions remain. |
| Creativity | Rival AI labs combine company-building economics with changing deployment briefs and a scarce-compute auction. | Players should experience meaningful competition rather than several people solving isolated allocation puzzles. |
| Usefulness / Value | Friends play a strategy game while discovering why data quality, efficiency, evaluation, and deployment context matter. | First-time players should understand the tradeoffs without an AI background and want another match. Educational intent does not prove learning or enjoyment. |
| Polish & Thoughtfulness | Exact outcome previews, visible targets, failure explanations, readable reports, rotating auction tie priority, mobile controls, and recoverable missing submissions. | Human testing of clarity, pace, touch interaction, and disconnected-player behavior. |

## How the mechanics support that design

A round follows **bid → build → reveal → upgrade**, with the final reveal ending the game. Players choose a brief, model size, improvement levels, and commercial or open-research release. Meeting every required target gives 3 Impact; achieving the stretch goal gives 1 more. Failed builds spend their resources but earn no release rewards. Highest Impact after round six wins, with completed briefs and stretches breaking ties before a shared victory.

Commercial releases provide more credits. Open research accelerates upgrades. Model size, data, training, evaluation and fixes, and distillation affect different ratings or costs. The accelerator auction has fewer slots than players, charges only winners, and grants a round-specific Accuracy bonus. Auction ties rotate publicly so one player does not always have first priority.

Targets change across all 18 briefs. Later briefs demand different capability and deployment combinations. The original Balanced language recipe could earn 24 Impact without bidding or upgrading; it now earns only 7 when repeated unchanged. Regression tests show no fixed recipe can sweep the match and each brief has an attainable stretch under legal techniques. Final-round stretch points require accelerator access.

That closes a specific loophole. It does **not** prove strategic balance. An adaptive route can still earn 23 while passing every auction, so the final auction may carry too much weight. Playtesting should examine whether earlier auctions, research timing, and brief selection meaningfully separate strategies.

## Educational honesty

The game does not train real AI models or call an LLM to grade players. Ratings, clients, rewards, and timelines are fictional and deterministic. Results explain the tradeoffs immediately after an experiment. “Evaluation & fixes” includes correcting defects discovered by testing; evaluation alone does not magically improve a model.

Keeping computation simulated makes results predictable and avoids model-inference delays and costs during a shared match. The real lesson is that useful AI must satisfy its application constraints, not simply maximize a generic benchmark.

## Submission readiness gates

- Confirm the signed-in mission instructions and entrant eligibility.
- [x] Configure the separate LabWars Supabase project, anonymous auth, and production Vercel environment variables.
- [x] Verify public access without a Vercel account.
- [ ] Verify automatic GitHub deployment separately. Its team-scoped link operation still returns 403.
- [x] Complete hosted matches in independent desktop/phone browser sessions, including refresh, upgrade purchase/use, rematch, and an eight-player API check.
- [ ] Check physical devices and hosted timeout recovery with real players. Timeout behavior already passes engine tests.
- [x] Verify hosted Realtime notifications and refresh recovery. Private projections are covered by engine/API tests.
- [ ] Simulate loss of the Realtime connection to verify the polling fallback online.
- Playtest with people unfamiliar with AI. Measure time to first successful build, total match duration, confusion, and willingness to rematch.
- Investigate whether the final auction dominates outcomes and tune only with evidence.
- Prepare a cover image and concise description. Submit the playable URL through the Handshake mission before the official deadline.

Deployment status and technical setup belong in [README.md](README.md). Update this readiness checklist when hosted verification and human playtesting are complete.
