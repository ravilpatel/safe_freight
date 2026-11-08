# SafeFreight OS — Enterprise Product Requirements Document

## v4.0.0 — Multi-Tenant Ground-Up Rebuild & Phased AI-Agent Implementation Plan

*Supersedes v3.0.0. Prepared following the v3.0 prototype's Supabase data-isolation defect (new accounts inheriting pre-seeded demo data). This version restructures the product as an enterprise-grade, multi-tenant SaaS and splits delivery into agent-sized phases with explicit guardrails. — November 9, 2026*

---

## 0. Purpose of This Document & How to Brief Your AI Agent

This PRD is written to be fed to a coding agent (Antigravity or similar) **one phase at a time**, not as a single giant prompt. Each phase in Section 5 is a self-contained brief: goal, in-scope work, explicitly out-of-scope work, deliverables, guardrails, and a Definition of Done. Do not let the agent start Phase N+1 until Phase N's acceptance criteria are verifiably met — have it show you the test output, the migration diff, or a screen recording, not just a claim that it's done.

**Global rules — paste these with every phase, every time, regardless of how repetitive it feels:**

1. Never insert, seed, or fabricate business data (loads, trips, documents, drivers, vehicles) automatically on user signup, login, or first app load. The *only* data a new account should contain is the one profile row for the person who just signed up, and a new, empty organization record.
2. Every business table carries a `tenant_id` (organization id) column, it is `NOT NULL`, and every Row-Level Security policy filters on it. No table may use a policy that evaluates to `true` for all authenticated users.
3. Demo/sample data, if it exists at all, lives in one clearly named script (`scripts/seed-demo.ts` or similar) that is never invoked by application code, never runs on deploy, and is only ever run manually against a local or staging database.
4. Any schema or RLS policy change must be a reviewed migration file, not a change applied by hand through the Supabase dashboard. If the agent proposes a dashboard change, stop it and ask for a migration file instead.
5. If the agent is ever unsure whether something counts as "seeding," the answer is: don't do it. Flag it for human review instead of guessing.

---

## 1. Incident Review — Why New Accounts Inherited Demo Data

You described this as the agent simply "not understanding instructions," but re-explaining the symptom rarely fixes it because the cause is architectural, not a misunderstanding of prose. In a Supabase + AI-agent-built app, this almost always traces to one (often more than one, compounding) of the following:

| # | Likely Cause | How It Manifests |
| :-- | :-- | :-- |
| 1 | A Postgres trigger on `auth.users` (`AFTER INSERT`) that calls a function which inserts starter rows into business tables (loads, trips, vehicles) instead of just creating an empty profile row. | Every new signup silently gets the same handful of "sample" loads or trips, because the trigger was written to make the demo look populated. |
| 2 | A `seed.sql` or seed script that is re-applied on every deploy or every `db reset`, inserting rows with no `tenant_id` or a hardcoded default one. | All accounts, old and new, end up reading rows that belong to no one in particular, or to a shared "default" org. |
| 3 | Missing or overly permissive RLS policies — e.g. `USING (true)`, or no RLS enabled at all on a table (Supabase tables are world-readable to any authenticated role by default until you turn RLS on). | Every signed-in user can read every row in the table, so the *first* account's data (or a demo account's data) appears to belong to everyone. |
| 4 | A `tenant_id` / `organization_id` column that defaults to a fixed UUID instead of being generated per signup. | New organizations are never actually created; everyone is silently attached to org #1. |
| 5 | Frontend fallback/mock data rendered when a query legitimately returns zero rows, which looks identical to "seeded" data from the user's perspective. | Looks like a backend seeding bug but is actually a client-side placeholder that was never removed. |

**The fix is architectural, covered in Sections 3–4, and enforced per-phase in Section 5.** Multi-tenancy with mandatory `tenant_id` + RLS is not an optimization for this project — it is the actual bug fix. An agent operating without that constraint explicit in its instructions will keep reintroducing some version of this bug no matter how many times you tell it in English to stop.

---

## 2. Build Strategy — Multi-Agent vs. Single-Agent

**Recommendation: single-agent, strictly sequential for Phases 0–2 (foundation: schema, auth, multi-tenancy, RLS, API contracts). Multi-agent mode may be enabled from Phase 3 onward, and only for isolated frontend surfaces.**

Reasoning: the account-seeding defect you hit is a *shared-state* bug — a trigger, a policy, a default value touched by something that wasn't tracking tenant boundaries carefully. Multi-agent parallelism is precisely the condition that makes shared-state bugs worse, because two agents touching migrations, RLS policies, or auth triggers concurrently is how you get silently merged, contradictory, or half-applied database state. For the data layer, you want one clear owner (one agent session, reviewed by you) from first migration to frozen schema.

Once the schema, RLS policies, and API contracts are frozen and documented (end of Phase 2), the three consumer-facing surfaces — Driver Console, Fleet Admin Console, Shipper Portal — are largely independent: they read and write through the same versioned API, don't share component code, and don't touch migrations. That's a legitimate place to parallelize, if your tooling supports it.

**Hard rule regardless of mode:** no agent may modify a Supabase migration, RLS policy, or `auth.users` trigger without it being a reviewed, named migration file that you read before it's applied. One person (you) or one designated agent session owns the database layer end-to-end. If using multi-agent mode later, the database layer is never one of the parallelized tracks.

| Phase | Mode | Why |
| :-- | :-- | :-- |
| 0 — Foundation & environments | Single-agent | Repo, CI/CD, and environment setup must be consistent; nothing to parallelize yet. |
| 1 — Auth & multi-tenancy | Single-agent, human-reviewed | This is exactly the layer that caused the original bug. No parallelism. |
| 2 — Core data layer & API contracts | Single-agent, human-reviewed | Schema and RLS must be frozen by one hand before anyone builds against it. |
| 3–5 — Driver / Admin / Shipper UI | Multi-agent permitted | Independent surfaces consuming a frozen, versioned API. |
| 6 — Safety & telematics | Single-agent | Safety-critical logic (crash detection, SOS) should not be split across agents mid-implementation. |
| 7 — Statutory & compliance | Single-agent | Legal/regulatory correctness needs one consistent author. |
| 8 — Enterprise hardening | Single-agent, security-reviewed | Observability, rate limiting, secrets — touches the whole stack. |
| 9 — QA, UAT, launch | Single-agent orchestrating; multi-agent for parallel test-writing is fine | Test suites for independent modules can be written in parallel. |

---

## 3. Enterprise Architecture Principles

These are the additions that take this from "a working prototype" to "an enterprise-grade application," and they are not optional extras — each one is referenced by name in the phase briefs in Section 5.

- **True multi-tenancy, not just roles.** `role` (driver/fleet\_admin/shipper) answers *what a user can do*. `tenant_id` (organization) answers *whose data they can see*. v3.0 only had the first. Every table, every query, every RLS policy needs the second.
- **Audit logging.** A single append-only `audit_log` table recording who changed what, when, and the before/after state, for every mutating action on loads, trips, Khata ledger entries, and safety incidents. Required for statutory disputes (freight payment disagreements) and for diagnosing exactly this class of bug in the future.
- **Observability.** Structured JSON logging, centralized error tracking, request tracing with a correlation id per request, and uptime/latency dashboards. "It works on my machine" is not an acceptable debugging method for a fleet-safety product.
- **Environment separation.** Three real environments — local, staging, production — each its own Supabase project, never sharing a database. Migrations are written once, applied to staging first, verified, then promoted to production through CI. The original bug class becomes far less likely once "I tested this in prod by creating a throwaway account" is structurally impossible.
- **Secrets management.** The Supabase service-role key (which bypasses RLS entirely) must never ship to the client. Privileged operations (admin dispatch overrides, document verification) go through server-side API routes or Edge Functions, never direct client-side service-role calls.
- **Data privacy & statutory compliance.** India's Digital Personal Data Protection Act, 2023 applies: explicit consent capture at signup, data minimization (don't collect what you don't use), a documented right-to-erasure path, and data localization awareness for where Supabase hosts the project.
- **Backup & disaster recovery.** Automated daily backups with point-in-time recovery, and documented targets: Recovery Time Objective and Recovery Point Objective (see Section 9).
- **API versioning & idempotency.** All endpoints under `/api/v1/`. Any endpoint that moves money or dispatches a truck (load acceptance, Khata advances, SOS) accepts an idempotency key so a flaky highway connection retry can't double-charge or double-dispatch.
- **Rate limiting.** Public, unauthenticated endpoints (the cost estimator, login) are rate-limited per IP to prevent abuse and scraping.
- **CI/CD gate.** Every merge runs lint, typecheck, the automated test suite, and a migration dry-run against a disposable database before it's eligible to deploy. No migration reaches production without this gate passing.

---

## 4. Multi-Tenant Data Architecture & RLS Pattern

This is the concrete fix for Section 1. Every phase brief in Section 5 refers back to this pattern.

**New top-level table: `organizations`** — `id (uuid, pk)`, `name`, `type` (`fleet_operator` | `shipper`), `created_at`. One row is created the moment a Fleet Admin or Shipper completes signup, empty, with no business data attached. Commercial drivers join an existing organization by invitation; they never create one.

**Every business table gets `tenant_id uuid references organizations(id) not null`**: `loads`, `trips`, `documents`, `safety_incidents`, `security_alerts`, `pings`, `audit_log`. No exceptions, no nullable tenant columns, no global rows.

**RLS policy template (apply this shape to every business table):**

```sql
alter table public.loads enable row level security;

create policy "tenant_isolation_select" on public.loads
  for select using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

create policy "tenant_isolation_write" on public.loads
  for insert with check (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
```

The `tenant_id` claim is set into the JWT via a custom access token hook at login, read from the user's `organization_id`, never trusted from client input.

**`auth.users` trigger — correct scope (pseudocode):**

```
on auth.users insert:
  if signup_role in ('fleet_admin', 'shipper'):
    create one row in organizations (empty)
    create one row in profiles, linked to the new organization
  if signup_role == 'driver':
    require an invitation token; link profiles.organization_id to the inviting org
  do nothing else. insert zero rows anywhere else.
```

**Forbidden patterns — reject any migration or trigger that does one of these:**

- Inserts into `loads`, `trips`, `documents`, or any business table from inside an `auth.users` trigger.
- Uses `using (true)` or omits a `using` clause entirely on a business table.
- Defaults `tenant_id` to a fixed or hardcoded UUID instead of the signing-up organization's own id.
- Reads or writes business tables from the client using the Supabase service-role key.
- A `seed.sql` that runs as part of deploy, application boot, or `db push` (it may only run via an explicit, separately-documented manual command, against local or staging only).

---

## 5. Phased Implementation Roadmap

Each phase below is written to be pasted to your coding agent as its own, standalone brief. Do not start the next phase until the current one's Definition of Done is independently verified — tests passing, a migration you've read, or a working demo, not just the agent's say-so.

### Phase 0 — Foundation, Environments & CI/CD

**Goal:** A deployable skeleton with nothing business-specific in it yet, but every environment and gate in place. **Build:** Monorepo structure; three Supabase projects (local/staging/production) with migrations tracked in version control; CI pipeline running lint + typecheck + test + migration dry-run on every PR; secrets stored in environment-specific vaults, never committed; a health-check endpoint; error tracking and structured logging wired up from day one. **Explicitly out of scope:** Any table beyond `organizations` and `profiles`. No auth flows yet beyond "can a user be created." No UI beyond a blank authenticated shell. **Guardrails:** No seed data of any kind, demo or otherwise, is created in this phase. **Definition of Done:** CI pipeline is green on an empty repo; `supabase db push` works identically against staging and a fresh local database; a new row in `organizations`/`profiles` can be created and read back, isolated per environment. **Multi-agent mode:** Off.

### Phase 1 — Authentication & Multi-Tenancy

**Goal:** Signup, login, and session handling for all three roles, with the tenant-isolation pattern from Section 4 fully in place and tested. **Build:** Signup flows for Fleet Admin and Shipper, each creating one empty `organizations` row plus one `profiles` row and nothing else; invitation-based signup for Drivers, joining an existing org and creating no new one; a JWT custom-claims hook injecting `tenant_id`; RLS enabled on every table that exists so far; role-based route guards for `/driver`, `/admin`, `/shipper`. **Explicitly out of scope:** Loads, trips, documents, Khata, safety — none of these tables exist yet. **Guardrails:** Write an automated test that creates two fresh accounts in two different organizations and asserts account A can never read account B's `profiles` row via the API, even with a crafted request. This test stays in CI permanently — it is the regression test for the exact bug you hit in v3.0. **Definition of Done:** The cross-tenant isolation test above passes in CI; a brand-new signup has access to precisely zero rows outside its own organization; RLS is verified enabled, not just policy-present, on every table via an automated check. **Multi-agent mode:** Off. Human-reviewed migration required.

### Phase 2 — Core Data Layer & Versioned API Contracts

**Goal:** The full schema from Section 10 (carried forward from v3.0, now with `tenant_id` and audit columns everywhere) and a frozen, documented `/api/v1/` contract that later phases build against without further schema churn. **Build:** All tables from the original ER diagram — `loads`, `trips`, `documents`, `pings`, `safety_incidents`, `security_alerts` — recreated with `tenant_id`, audit columns (`created_by`, `updated_by`, `created_at`, `updated_at`), and RLS per Section 4; the `audit_log` table and a write-interceptor logging every mutation to it; the full REST surface from Section 8 implemented and documented so frontend agents in later phases never need to guess a field name. **Explicitly out of scope:** Any UI beyond what's needed to exercise the API in tests. **Guardrails:** Every new table ships with its RLS policies and its cross-tenant isolation test in the same PR — never add a table without both. **Definition of Done:** The API contract is versioned and published where frontend agents can read it; every table has passing RLS isolation tests; `audit_log` correctly records a sample mutation end-to-end. **Multi-agent mode:** Off. This is the schema freeze point.

### Phase 3 — Commercial Driver Console (`/driver`)

**Goal:** The driver HUD described in Module B of the original PRD, built against the frozen Phase 2 API. **Build:** 24/7 GPS HUD, 1-tap 6-stage milestone tracker, Trip Khata expense diary, 1-tap emergency/owner calling, statutory e-Bilti QR view, 3-way route selector with voice guidance, return-backhaul load acceptance — all per the original functional requirements (Section 6 of this document). All driver typography, 56dp/96dp touch-target and plain-language constraints from the original Section 8.1 still apply, unchanged. **Explicitly out of scope:** Crash/SOS detection logic itself (Phase 6) — the SOS button in this phase may call a stub endpoint. **Guardrails:** Every screen reads/writes exclusively through `/api/v1/` — no direct Supabase client calls from driver-facing code, so RLS and audit logging stay centralized. **Definition of Done:** A driver in organization A can never see or act on loads, trips, or documents belonging to organization B, verified by an automated test using two seeded (test-only, non-demo) accounts. **Multi-agent mode:** Permitted, isolated to this surface only.

### Phase 4 — Fleet Admin Console (`/admin`)

**Goal:** The command-center console described in Module C of the original PRD: KPI cards, freight/load matching, driver and vehicle roster, WhatsApp dispatch slip generator, Trip Khata ledger, deadhead-reduction simulator, statutory document repository, route-deviation alerts, Golden Hour incident console. **Build:** Per original Section 6, Module C, against the frozen API. **Guardrails:** The "Register New Driver" and password-reset flows must go through the invitation mechanism from Phase 1, not direct row inserts — this is the other place a bypass of tenant scoping is easy to introduce by accident. **Definition of Done:** An admin in organization A cannot see, dispatch, or message a driver belonging to organization B. **Multi-agent mode:** Permitted, isolated to this surface only.

### Phase 5 — Shipper Freight Booking Portal (`/shipper`)

**Goal:** The portal described in Module D of the original PRD: public cost estimator, AI booking assistant, bidding/acceptance-probability slider, GST/e-Way statutory toggles, active/past shipment tracker. **Build:** Per original Section 6, Module D, against the frozen API. The public cost estimator (FR-SH-01) is the one surface in the whole product that intentionally has no auth and no tenant scope — it must be rate-limited per Section 3, and must never write to the database, only compute and display an estimate. **Definition of Done:** Posted loads are visible only to the posting organization and to drivers/admins they are explicitly matched or offered to — never to other shippers. **Multi-agent mode:** Permitted, isolated to this surface only.

### Phase 6 — Safety & Telematics (AIS-140, Golden Hour)

**Goal:** The crash-detection and SOS pipeline from the original Module F: `DeviceMotionEvent` telemetry, the G-force vector classifier (Section 7), the 30-second audible countdown, the 96dp cancel button, automated 112 ERSS dispatch, and Golden Hour (T0/T1/T2) timeline tracking. **Build:** Per original Section 6, Module F, plus Module G's offline-first ping queue so the countdown and distress payload survive a highway connectivity dropout. **Guardrails:** This logic is safety-critical — the crash-impact threshold, the countdown, and the ERSS dispatch must have deterministic, independently reviewed unit tests for every G-force boundary case in Section 7, not just happy-path tests. Keep this phase single-agent; do not let it be split mid-implementation. **Definition of Done:** All boundary-case tests (pothole, cabin drop, genuine collision) pass; a simulated 4.5G impact reliably produces a T0/T1 record and, if uncancelled, a dispatched distress payload, even with network interrupted during the countdown. **Multi-agent mode:** Off.

### Phase 7 — Statutory & Regulatory Compliance

**Goal:** The e-Bilti/LR generation, GST Rule 54(3) e-Way Bill handling, and document repository with validity badges from the original Module E / Section 7. **Build:** Per original Section 7 (Statutory Compliance Framework) and FR-FO-08 / FR-DR-05. **Guardrails:** Any statutory numbering (LR number, e-Way Bill) must be generated server-side and be unique per organization, never guessable or sequential across tenants — sequential numbers leaking across organizations is its own kind of data-isolation leak. **Definition of Done:** A generated e-Bilti QR code resolves only the issuing organization's own trip data when scanned. **Multi-agent mode:** Off.

### Phase 8 — Enterprise Hardening

**Goal:** Everything in Section 3 that doesn't have a natural home in an earlier phase: observability, rate limiting, secrets audit, backup/DR drill, load testing against the NFR targets in Section 9, and a basic penetration test of the auth and RLS boundary specifically. **Build:** Centralized logging/tracing dashboards; rate limits on public endpoints; a documented, tested backup-restore procedure; a load test simulating the 10,000 pings/minute target; a focused security review that specifically tries to read cross-tenant data through every endpoint. **Definition of Done:** The penetration test finds no cross-tenant data leak; backup restore has been performed at least once, successfully, in staging; NFR targets in Section 9 are met under load test. **Multi-agent mode:** Off, security-reviewed.

### Phase 9 — QA, UAT & Production Launch

**Goal:** Final acceptance against the checklist in Section 11, user acceptance testing with real drivers/fleet owners/shippers (personas in Section 12), and a staged production rollout. **Build:** Full regression suite run; UAT with the personas in Section 12 of this document; staged rollout (one fleet operator organization first, monitored, before wider launch). **Definition of Done:** All items in Section 11's acceptance checklist pass; UAT sign-off from at least one real fleet owner and one real driver; zero cross-tenant data incidents in the staged rollout window. **Multi-agent mode:** Single agent orchestrating; parallel test-writing across independent modules is fine.

---

## 6. Functional Requirements Map (Original Modules → Phases)

The detailed functional requirements from the original PRD (FR-GW, FR-DR, FR-FO, FR-SH, FR-AU, FR-SF, FR-OF codes) remain valid feature-for-feature and are not rewritten here — they are reassigned to the phases above, each with the multi-tenancy and enterprise constraints from Sections 3–4 layered on top.

| Original Module | Built In | Enterprise Addition |
| --- | --- | --- |
| A — Public Gateway | Phase 5 (public estimator only) | Rate-limited, read-only, no auth, writes nothing |
| B — Driver Console | Phase 3 | All reads/writes through versioned API, tenant-scoped |
| C — Fleet Admin Console | Phase 4 | Driver provisioning via invitation, not direct insert |
| D — Shipper Portal | Phase 5 | Load visibility strictly scoped to posting org |
| E — Auth & Personas | Phase 1 | Organizations table, JWT tenant claim, isolation tests in CI |
| F — Telematics & Golden Hour | Phase 6 | Deterministic boundary-case unit tests, single-agent build |
| G — Offline-First Engine | Phase 6 | Queued pings carry tenant context, never a shared buffer |
| H — Voice/Audio Engine | Phase 3 | No change — client-side only, no data concerns |

---

## 7. Core Algorithmic Engines (Carried Forward Unchanged)

The business logic formulas from v3.0 are sound and carry forward as-is; they are implemented in Phase 2 (`lib/algorithms.ts`, covered by unit tests) and consumed by Phases 3–5. Summarized here; full derivations stay in the implementation's test fixtures rather than duplicated across documents.

**Dead Mileage Savings:** EmptyKmAvoided = max(0, TotalTripDistance − LoadedDistance). FuelSaved(L) = EmptyKmAvoided ÷ 3.8 km/L. FuelCostSaved(₹) = FuelSaved × ₹92/L. WearTearSaved(₹) = EmptyKmAvoided × ₹4.50/km. TollSaved(₹) = EmptyKmAvoided × ₹2.20/km. CO₂Saved(kg) = FuelSaved × 2.68.

**3-Way Route Optimizer:** Fastest Highway (62 km/h, ₹1.85/km toll, 3.6 km/L) vs. Toll-Optimized (+9% distance, 48 km/h, ₹0.65/km toll, 3.7 km/L) vs. Eco-Fuel Corridor (+3% distance, 54 km/h, ₹1.25/km toll, 4.3 km/L). Interstate entry adds a flat ₹450 state tax; intrastate is exempt.

**Shipper Pricing:** LTL — BaseFare ₹2,500 + DistanceKm×₹14 + weight/volume fares. FTL — BaseFare ₹7,500 + DistanceKm×₹42 + weight/volume fares. Add 5% GST, round to nearest hundred for MinPricing; RecommendedPrice = MinPricing × 1.08.

**Acceptance Probability:** BonusRatio = UserBidAddition ÷ MinPricing. 48% flat at zero or negative ratio; scales through tiers to a 99% cap as BonusRatio rises past 0.18, mapped to dispatch-speed bands from instant (<10 min) to 2–4 hours. Exact tier breakpoints and the piecewise formula are unchanged from v3.0 Section 5.3 and should be copied verbatim into the Phase 2 implementation and its test suite.

**Trip Khata Settlement:** BalanceDueOnPOD = max(0, GrossFreight − TotalDisbursedAdvances). NetGrossProfit = GrossFreight − (TotalDisbursedAdvances + MaintenanceReserve). This arithmetic is the one most likely to be disputed by a real driver or fleet owner, so it needs a golden-master test suite with real-number examples, verified by a human against a paper calculation before Phase 2 is marked done.

**AIS-140 Crash Classification:** TotalG = √(ax²+ay²+az²) ÷ 9.81. Below 2.5G: ignored as road noise. High az spike alone, negligible ax/ay: filtered as a single-axis anomaly (dropped phone, cabin bump). TotalG ≥ 4.0G across multiple axes simultaneously: triggers the T0 impact sequence. These three boundary cases are the required unit tests for Phase 6.

---

## 8. Enterprise API Specification

All endpoints are versioned under `/api/v1/` and every list endpoint supports `limit`/`cursor` pagination. Every endpoint is implicitly tenant-scoped off the caller's JWT — no endpoint accepts a `tenant_id` or `organization_id` as a request parameter; if an endpoint signature from the original PRD implied one, drop it and derive scope from the session instead. Mutating endpoints that move money or dispatch a vehicle (`/loads/accept`, `/fleet/trips` PATCH, `/safety/sos`) accept an `Idempotency-Key` header; a repeated key with the same body returns the original result rather than repeating the side effect. Public, unauthenticated endpoints (`/loads` quote-only variant) are rate-limited per IP.

| Endpoint | Method | Scope / Notes |
| --- | --- | --- |
| /api/v1/auth/signup | POST | Creates org (admin/shipper) or joins via invite (driver). Zero business rows. |
| /api/v1/loads | GET / POST | Tenant-scoped; public quote-only variant is read-only, no DB write |
| /api/v1/loads/accept | POST | Idempotency-Key required |
| /api/v1/fleet/drivers | GET / POST | POST issues an invitation, never inserts a user row directly |
| /api/v1/fleet/trips | GET / POST / PATCH | PATCH requires Idempotency-Key; writes to audit\_log |
| /api/v1/fleet/documents | GET / POST / DELETE | Tenant-scoped |
| /api/v1/fleet/dead-mileage | GET | Aggregates scoped to caller's organization only |
| /api/v1/fleet/alerts | GET / PATCH | Tenant-scoped |
| /api/v1/pings | POST | High-volume; batched; tenant context carried from JWT, never the client payload |
| /api/v1/safety/sos | POST | Idempotency-Key required; writes audit\_log and safety\_incidents |
| /api/v1/safety/cancel | POST | Tenant-scoped |
| /api/v1/safety/incidents | GET / PATCH | Tenant-scoped; logs T2 arrival |

---

## 9. Non-Functional Requirements & Enterprise SLAs

The original v3.0 performance benchmarks (match-engine latency, HUD responsiveness, battery drain, offline durability, typography accessibility) still apply unchanged — see original Section 13. The following are new, enterprise-specific targets.

| Metric | Target |
| --- | --- |
| Uptime SLA | 99.95% monthly, excluding scheduled maintenance windows |
| Recovery Time Objective (RTO) | 1 hour for a full regional outage |
| Recovery Point Objective (RPO) | 15 minutes of data loss maximum |
| Cross-tenant isolation | Zero tolerance — automated test in CI on every PR, permanently |
| Audit log retention | 7 years, for freight-payment and statutory dispute resolution |
| Horizontal scale target | 100+ fleet organizations, 10,000+ concurrent drivers, with no architectural change |
| Security review cadence | Penetration test before launch, then at least annually |
| Secrets exposure | Zero service-role keys or privileged credentials in any client bundle, verified by automated static scan in CI |

---

## 10. Data Model Reference (Enterprise Schema)

Every table below carries `tenant_id`, `created_by`, `updated_by`, `created_at`, `updated_at` in addition to the columns listed; these are omitted here for brevity but are mandatory on every table, per Section 4.

| Table | Core Columns | Relationship |
| --- | --- | --- |
| organizations | id, name, type | Root of every tenant boundary |
| profiles | id, role, phone, name, vehicle fields, language | Belongs to one organization |
| loads | shipper fields, pickup/drop, pricing, status, matched\_driver\_id | Posted by a shipper org; matched to a driver in a fleet org |
| trips | driver\_id, route fields, Khata fields, milestone\_status | Belongs to the fleet organization that owns the driver |
| documents | vehicle\_number, doc\_type, expiry\_date, status | Belongs to the fleet organization |
| pings | trip\_id, lat, lng, speed, g\_force | High-volume, scoped via trip → driver → organization |
| safety\_incidents | driver\_id, t0/t1/t2 timestamps, status | Belongs to the fleet organization |
| security\_alerts | trip\_id, alert\_type, resolved | Belongs to the fleet organization |
| audit\_log | actor\_id, action, table\_name, row\_id, before, after | Append-only; one row per mutation, across all tables above |

---

## 11. Acceptance Checklist

The original v3.0 checklist (automated QA suite, build integrity, driver usability, multi-language completeness, voice/audio, Khata settlement accuracy, WhatsApp dispatch, e-Bilti QR, offline queuing, Golden Hour sequence — original Section 14) still applies at the relevant phase. Add these, non-negotiable, before Phase 9 sign-off:

- **Cross-tenant isolation:** two fresh test accounts in two different organizations; account A's token can read, write, or enumerate zero rows belonging to account B, across every table and every endpoint, verified by an automated suite that runs in CI on every PR, forever — not just once before launch.
- **No seeding on signup:** a brand-new signup, immediately after email/phone verification, has exactly one `profiles` row and one `organizations` row, and zero rows anywhere else, confirmed by an automated check.
- **RLS enabled, not just policies present:** an automated check confirms `rowsecurity = true` on every business table, not merely that policy files exist in the migrations folder.
- **Service-role key never shipped:** an automated static scan of every client bundle confirms the Supabase service-role key is absent.
- **Audit trail complete:** a sample mutation on each of `loads`, `trips`, `documents`, `safety_incidents` produces a corresponding `audit_log` row with correct before/after state.

---

## 12. Appendix: Personas, Corridor Waypoints & Localization

**Personas** (unchanged from original Section 3): Ramesh Patel, Commercial Driver (Tata Signa 4825.T, NH 48 Mumbai–Surat–Ahmedabad corridor) — low tech literacy, needs 1-tap large buttons, operates `/driver`. Sardar Balwinder Singh, Fleet Owner (Western India Fleet Logistics, 22 vehicles, Vapi & Surat hubs) — WhatsApp-first, operates `/admin`. Adani Logistics Forwarders / Ultratech Cement, Shipper — enterprise SaaS literate, operates `/shipper`. Each persona now additionally represents a distinct **organization** in the multi-tenant model: Ramesh's profile belongs to Balwinder's organization; Adani's is its own, separate organization; the two must never see each other's internal data, only the loads/trips they are explicitly matched on.

**NH 48 Western Freight Spine waypoints** (unchanged from original Section 15.1): Mumbai JNPT Port (18.9496, 72.9515) → Vapi GIDC (20.3712, 72.9044) → Surat Ring Road (21.1702, 72.8311) → Bharuch/Ankleshwar (21.6264, 73.0152) → Vadodara Ranoli (22.3072, 73.1812) → Ahmedabad Changodar (22.9298, 72.4518).

**Languages** (unchanged from original Section 9): English, हिन्दी (Hindi), ગુજરાતી (Gujarati), मराठी (Marathi), తెలుగు (Telugu), selected on first visit, zero silent English fallback, persisted per profile (not `localStorage` alone — store the language preference on the `profiles` row server-side as well, so it survives a device change).

**Routes:** `/` (public gateway, Phase 5), `/driver` (Phase 3), `/admin` (Phase 4), `/shipper` (Phase 5), `/login` (Phase 1).

---

*End of SafeFreight OS Enterprise PRD v4.0.0. Hand your agent one phase at a time, starting with Phase 0, and do not let it skip the cross-tenant isolation test in Phase 1 — that single test is what the v3.0 rebuild was missing.*
