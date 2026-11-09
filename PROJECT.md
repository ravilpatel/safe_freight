# SafeFreight OS — Enterprise Commercial Implementation Project (v4.0.0)

## Architecture Overview
SafeFreight OS is an enterprise-grade logistics and safety operating system for commercial freight transport across India's highways (focusing on the NH 48 Western Freight Spine corridor from JNPT/Mumbai to Ahmedabad/Changodar).

### Core Architectural Pillars
1. **Frontend**: Next.js 14.2.18 (App Router), React 18, TypeScript, Tailwind CSS, Lucide icons.
   - User Experience First: Stitch Design System (Cobalt `#0075de`, Deep Navy `#0f172a`, Efficiency Teal `#10b981`, SOS Red `#dc2626`, Canvas `#f6f5f4`).
   - Ergonomics: High-contrast night HUD, $\ge 56$dp touch targets, $\ge 96$dp emergency buttons, multi-language localization (Hindi, Gujarati, Marathi, Telugu, English).
2. **Backend & Multi-Tenancy**: Supabase PostgreSQL cloud database with strict Row-Level Security (RLS) bound to `(auth.jwt() ->> 'tenant_id')::uuid`. Zero-seed invariant on new signups. All mutations recorded to append-only `audit_log`.
3. **Core Algorithmic Engines**:
   - Dead Mileage Avoidance (`src/lib/algorithms/deadMileage.ts`)
   - 3-Way Corridor Route Optimizer (`src/lib/algorithms/routeOptimizer.ts`)
   - Dynamic Shipper Pricing (`src/lib/algorithms/shipperPricing.ts`)
   - Acceptance Probability Bidding (`src/lib/algorithms/acceptanceProbability.ts`)
   - Digital Trip Khata & Bhatta Ledger (`src/lib/algorithms/tripKhata.ts`)
   - AIS-140 G-force Vector Crash Classifier (`src/lib/algorithms/ais140Crash.ts`)
   - Statutory Compliance Engine (`src/lib/algorithms/statutory.ts`)
4. **Governance & QA**:
   - CTO Agent review gate at the completion of each phase.
   - Automated test suite (235 tests baseline preserved with zero regressions, expanding with comprehensive phase-specific suites).
   - Headless Firefox/Geckodriver automated screenshot inspection harness for visual UX validation.
   - Independent Forensic Auditor integrity verification on every iteration.

---

## Feature Inventory (Phases 3 to 9)

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | 24/7 Always-On GPS Live HUD | Real-time highway navigation HUD displaying vehicle reg, live GPS coordinates, continuous speedometer, pulsing AIS-140 beacon, and embedded Leaflet map. | M1: Driver Console | PRD v3 FR-DR-01, PRD v4 Phase 3 |
| 2 | 1-Tap 6-Stage Milestone Tracker | 6-stage button bar ($\ge 56$dp): गोदाम पहुँचे, लोडिंग पूरी, हाइवे पर, ढाबा ब्रेक, पार्टी पहुँचे, माल खाली हुआ. Zero typing. | M1: Driver Console | PRD v3 FR-DR-02, NEW_REQ FR-B1 |
| 3 | Driver Trip Khata & Cash Expense Diary | Real-time cash advance ledger with cash received, remaining balance in hand, and 4 quick buttons (Diesel, Dhaba, Puncture, Toll). | M1: Driver Console | PRD v3 FR-DR-03, NEW_REQ FR-B2 |
| 4 | 1-Tap Highway Emergency & Contact Links | 4 large contact buttons: मालिक को कॉल, व्हाट्सएप चैट, पार्टी / गोदाम, RTO / बिल्टी QR. | M1: Driver Console | PRD v3 FR-DR-04, NEW_REQ FR-B3 |
| 5 | Statutory e-Bilti & RTO Inspection View | 1-tap full-screen digital clearance pass with high-contrast QR code for 3-second RTO scan, compliance badges, and download. | M1: Driver Console | PRD v3 FR-DR-05, NEW_REQ FR-B4 |
| 6 | 3-Way Route Selector with Checkpoints | Fastest Highway, Toll-Optimized, Eco-Fuel corridors with toll costs, fuel consumption, and NH 48 checkpoints. | M1: Driver Console | PRD v3 FR-DR-06, PRD v4 Sec 7 |
| 7 | Multilingual Turn-by-Turn Voice Guidance | Web SpeechSynthesis engine vocalizing route directions and load summaries in driver's chosen regional language. | M1: Driver Console | PRD v3 FR-DR-06, FR-AU-02 |
| 8 | Return Backhaul Load Acceptance | Corridor backhaul load board ranked by net profit score with 1-tap accept via `/api/v1/loads/accept`. | M1: Driver Console | PRD v3 FR-DR-07, PRD v4 Phase 3 |
| 9 | Web Audio UI Feedback Synthesizer | Client-side synthesized click tones, warning buzzers, and chimes via Web Audio API. | M1: Driver Console | PRD v3 FR-AU-01 |
| 10 | Spoken Countdown Vocabulary Engine | Localized numbers 30 down to 0 in Hindi, Gujarati, Marathi, Telugu, English. | M1: Driver Console | PRD v3 FR-AU-03 |
| 11 | Driver Usability & Highway Typography | High contrast, titles $\ge 28$px, buttons $\ge 22$px, body $\ge 20$px, touch targets $\ge 56$dp, emergency $\ge 96$dp. | M1: Driver Console | PRD v3 Sec 8.1, PRD v4 Phase 3 |
| 12 | 5-Language Native Highway Localization | English, Hindi, Gujarati, Marathi, Telugu localization without silent fallback. | M1: Driver Console | PRD v3 Sec 9.1, PRD v4 Sec 12 |
| 13 | Plain Highway Phrasing Dictionary | No bureaucratic jargon (खाली फेरा, पार्ट लोड, फुल ट्रक, माल खाली पर्ची, डीजल पर्ची). | M1: Driver Console | PRD v3 Sec 9.2, NEW_REQ FR-B5 |
| 14 | Driver Invitation Onboarding & Auth | Join existing fleet org via token; set password; JWT with role `driver`. | M1: Driver Console | PRD v4 Phase 1/3 |
| 15 | Driver Route Guard & Tenant Scoping | Guard `/driver`, reject unauthorized roles, scope all queries to assigned trips. | M1: Driver Console | PRD v4 Sec 4/5 |
| 16 | Operations Control Header & Fleet Identity | Command header with fleet name, active corridor credentials, and sync beacon. | M2: Admin Console | PRD v3 FR-FO-01 |
| 17 | Real-Time Fleet KPI Cards | Active assets, deadhead reduction %, fuel saved (₹), active alerts count. | M2: Admin Console | PRD v3 FR-FO-02 |
| 18 | Freight Requests & Return Load Matching | Searchable open shipper loads along NH 48 with driver assignment and dispatch. | M2: Admin Console | PRD v3 FR-FO-03 |
| 19 | Driver & Vehicle Allocation Roster | Phone, vehicle plate, payload specs, live status badges (*On Trip*, *Idle*, *Alert*). | M2: Admin Console | PRD v3 FR-FO-04 |
| 20 | 1-Click Driver Calling & WhatsApp Links | Direct `tel:` and `wa.me` links with pre-filled GPS coords and speed. | M2: Admin Console | PRD v3 FR-FO-04, NEW_REQ FR-A4 |
| 21 | Driver Provisioning via Invitation Mechanism | Admin modal generating single-use driver invitation token and invite link. | M2: Admin Console | PRD v4 Phase 4, NEW_REQ FR-A4 |
| 22 | Driver Credential & Password Management | Secure admin modal to manage driver credentials and trigger password resets. | M2: Admin Console | PRD v3 FR-FO-04 |
| 23 | Trip Dispatch Center & Advance Planner | Central table listing active, planned, completed corridor trips with progress. | M2: Admin Console | PRD v3 FR-FO-05 |
| 24 | 1-Click WhatsApp Trip Dispatch Slip | Modal generating vernacular dispatch slip with 1-click send to WhatsApp. | M2: Admin Console | PRD v3 FR-FO-05, NEW_REQ FR-A1 |
| 25 | Advance Corridor Trip Scheduling Modal | Schedule dispatches up to 30 days ahead with route profiling. | M2: Admin Console | PRD v3 FR-FO-05 |
| 26 | Digital Trip Khata & Bhatta Ledger | Mathematical consistency: Balance Due = Gross Freight - Total Advances. | M2: Admin Console | PRD v3 FR-FO-06, NEW_REQ FR-A2 |
| 27 | Truck-wise Gross P&L "Gaadi-wise Kamai" | P&L per vehicle: monthly trips, gross revenue, operating costs, net margin. | M2: Admin Console | NEW_REQ FR-A5 |
| 28 | Interactive Deadhead Reduction Simulator | Interactive corridor slider calculating fuel, wear-tear, toll, CO2 savings. | M2: Admin Console | PRD v3 FR-FO-07, PRD v4 Sec 7 |
| 29 | Statutory Document Repository Tab | AITP National Permit, Fitness, PUC, Insurance, RC with validity badges. | M2: Admin Console | PRD v3 FR-FO-08, NEW_REQ FR-A3 |
| 30 | Security & Route Deviation Alerts Monitor | Real-time alerts for detours $>5$ km or unauthorized halts $>45$ min. | M2: Admin Console | PRD v3 FR-FO-09, FR-SF-06 |
| 31 | Golden Hour Safety Incident Console | Emergency monitor with impact G-force, T0, T1, and T2 resolution logging. | M2: Admin Console | PRD v3 FR-FO-10, FR-SF-05 |
| 32 | Interactive Corridor Leaflet Fleet Map | Live NH 48 map with truck markers, heading, and corridor route lines. | M2: Admin Console | PRD v3 FR-FO-11 |
| 33 | Notion-Calm Management UI Design | Paper-soft canvas (`#f6f5f4`), pure white cards, hairline borders, Inter typography. | M2: Admin Console | PRD v3 Sec 8.2 |
| 34 | Fleet Admin Route Guard & Tenant Scoping | Guard `/admin`, restrict access to `fleet_admin`, scope by `tenant_id`. | M2: Admin Console | PRD v4 Sec 4/5 |
| 35 | Public Rate-Limited Freight Cost Estimator | Unauthenticated instant calculator with 0 DB writes; 60 req/min rate limit. | M3: Shipper Portal | PRD v3 FR-SH-01, PRD v4 Phase 5 |
| 36 | National Logistics Gateway Portal (`/`) | Public landing gateway with live telematics banner, 4 Pillars Bento Grid. | M3: Shipper Portal | PRD v3 FR-GW-01 to FR-GW-05 |
| 37 | Isometric Highway 3D Architecture Visualizer | Interactive 3D visual component for Golden Hour, AIS-140, Rollover, Empty Miles. | M3: Shipper Portal | PRD v3 FR-GW-02 |
| 38 | Authenticated AI Freight Booking Assistant | 6-step conversational freight booking wizard with cargo category and truck type. | M3: Shipper Portal | PRD v3 FR-SH-02 |
| 39 | InDrive-Style Acceptance Probability Slider | Dynamic slider adjusting bid bonus (₹0 to ₹10,000+), updating probability (48-99%). | M3: Shipper Portal | PRD v3 FR-SH-03, PRD v4 Sec 7 |
| 40 | Statutory & Commercial Consignment Toggles | Consignor/Consignee GSTIN, e-Way bill toggle, Hamali charges, transit insurance. | M3: Shipper Portal | PRD v3 FR-SH-04 |
| 41 | Advance Freight Pickup Calendar Scheduling | Schedule freight pickups up to 30 days ahead along NH 48. | M3: Shipper Portal | PRD v3 FR-SH-05 |
| 42 | Active & Past Shipments Tracker Table | Real-time shipment status tracker: Open, Accepted, In Transit, Delivered. | M3: Shipper Portal | PRD v3 FR-SH-06, PRD v4 Phase 5 |
| 43 | 1-Click GST Tax Invoice Generator & Print | Downloadable/printable official GST Tax Invoice compliant with SAC Code 9965. | M3: Shipper Portal | PRD v3 FR-SH-06, PRD v3 Sec 7 |
| 44 | Shipper Load Cancellation & Refund | Idempotent load cancellation before transit begins. | M3: Shipper Portal | PRD v3 FR-SH-06, PRD v4 Sec 8 |
| 45 | Shipper Route Guard & Tenant Scoping | Guard `/shipper`, restrict access to `shipper` role, scope by `tenant_id`. | M3: Shipper Portal | PRD v4 Sec 4/5 |
| 46 | Continuous Background Sensor Telemetry | Streams linear acceleration and rotational rates via `DeviceMotionEvent`. | M4: Safety & Telematics | PRD v3 FR-SF-01 |
| 47 | AIS-140 G-Force Vector Impact Classifier | Algorithmic filter: TotalG $\ge 4.0$G multi-axial triggers T0; filters potholes/drops. | M4: Safety & Telematics | PRD v3 Sec 5.5, PRD v4 Sec 7 |
| 48 | In-App Crash Simulation Test Suite | UI test buttons injecting Pothole ($2.2$G), Phone Drop ($3.2$G), Collision ($4.5$G). | M4: Safety & Telematics | PRD v3 FR-SF-01 |
| 49 | 30-Second Audible Emergency Countdown | Synthesized siren sweep (700-1100 Hz) and spoken countdown 30..0 in native speech. | M4: Safety & Telematics | PRD v3 FR-SF-02, FR-DR-08 |
| 50 | Centered 96dp False Alarm Cancel Button | High-contrast touch target "मैं सुरक्षित हूँ — अलार्म रद्द करें (I AM SAFE)". | M4: Safety & Telematics | PRD v3 FR-SF-03, FR-DR-08 |
| 51 | Automated 112 ERSS Distress Protocol | At 0s, submits distress payload to `/api/v1/safety/sos`, logs T0 and T1. | M4: Safety & Telematics | PRD v3 FR-SF-04, PRD v4 Phase 6 |
| 52 | Family Emergency Contact SMS Dispatch | Automatically dispatches SMS to emergency contact with GPS coordinates and link. | M4: Safety & Telematics | PRD v3 FR-SF-04 |
| 53 | Golden Hour T0/T1/T2 Timeline State Machine | Tracks T0 (Impact), T1 (SOS ACK), T2 (Responders Arrived) and rescue duration. | M4: Safety & Telematics | PRD v3 FR-SF-05, FR-FO-10 |
| 54 | Real-Time Route Security Violation Engine | Evaluates GPS pings against assigned corridor; alerts on detour $>5$ km or stop $>45$ min. | M4: Safety & Telematics | PRD v3 FR-SF-06, FR-FO-09 |
| 55 | Gyroscopic Rollover Pre-Warning System | Evaluates chassis tilt angle; warns driver if tilt $>30^\circ$. | M4: Safety & Telematics | PRD v3 FR-SF-07 |
| 56 | Highway Offline Connectivity Detection | Reactive UI connectivity dot: Green (Online) vs Orange (Offline / Queued). | M4: Safety & Telematics | PRD v3 FR-OF-01, FR-OF-02 |
| 57 | Client-Side Telemetry Queue Buffer | Buffers GPS coordinates and pings locally up to 500 pings in highway blackspots. | M4: Safety & Telematics | PRD v3 FR-OF-01, PRD v4 Sec 6 |
| 58 | Automatic Reconnection Flush Synchronization | Flushes queued telemetry to `POST /api/v1/pings` upon network restoration. | M4: Safety & Telematics | PRD v3 FR-OF-03 |
| 59 | Offline Emergency Countdown Durability | 30s countdown and distress generation operate in memory; survives offline. | M4: Safety & Telematics | PRD v4 Phase 6, PRD v3 Sec 12 |
| 60 | Server-Side Tenant-Unique e-Bilti (LR) Generator | Digital LR compliant with Carriage by Road Act 2007 with tenant-unique LR number. | M5: Statutory Compliance | PRD v4 Phase 7, NEW_REQ FR-A3 |
| 61 | High-Contrast Highway e-Bilti Scannable QR Code | High-contrast QR code with LR number, e-Way bill, and verification URL for RTO. | M5: Statutory Compliance | PRD v3 FR-DR-05, PRD v4 Phase 7 |
| 62 | CGST Rule 54(3) Consignment Note Enforcement | Enforces mandatory consignment note fields for Goods Transport Agencies (GTA). | M5: Statutory Compliance | PRD v3 Sec 7, PRD v4 Phase 7 |
| 63 | 12-Digit Inter-State e-Way Bill Validation | Validates 12-digit numeric e-Way bill format and tracks distance-based validity. | M5: Statutory Compliance | PRD v3 FR-SH-04, PRD v3 Sec 7 |
| 64 | Section 194C TDS Exemption Engine | 0% TDS for $\le 10$ goods carriages declaration; 1%/2% otherwise; 20% if no PAN. | M5: Statutory Compliance | PRD v4 Phase 7 / Statutory |
| 65 | MoRTH VAHAN Vehicle Compliance Verification | Validates commercial vehicle registration, National Permit, Fitness, PUC, Insurance. | M5: Statutory Compliance | PRD v3 FR-FO-08, PRD v3 Sec 7 |
| 66 | MoRTH SARATHI Commercial DL Verification | Validates commercial DL number, transport endorsement, and expiration date. | M5: Statutory Compliance | PRD v3 FR-FO-04, PRD v3 Sec 7 |
| 67 | Statutory Document Expiry Engine & Badges | Automated scheduler computing validity badge status (*Valid*, *Expiring Soon*, *Expired*). | M5: Statutory Compliance | PRD v3 FR-FO-08, PRD v4 Phase 7 |
| 68 | NETC FASTag Plazas & Toll Calculation Engine | Plaza-by-plaza toll charges across NH 48 corridor integrated into Trip Khata. | M5: Statutory Compliance | PRD v3 Sec 5.2, PRD v3 Sec 7 |
| 69 | Centralized Structured JSON Logging & Tracing | Pino/Winston structured logging with correlation IDs and sensitive credential scrub. | M6: Enterprise Hardening | PRD v4 Sec 3, PRD v4 Phase 8 |
| 70 | Public Endpoint IP Rate Limiting | Rate limiting on public unauthenticated endpoints (60 req/min per IP). | M6: Enterprise Hardening | PRD v4 Sec 3, PRD v4 Phase 8 |
| 71 | Append-Only Audit Dispute Trail | `audit_log` recording all mutations across loads, trips, khata, and safety. | M6: Enterprise Hardening | PRD v4 Sec 3, PRD v4 Phase 8 |
| 72 | Static Secret Leak Scanner CI Gate | Automated CI script verifying `SUPABASE_SERVICE_ROLE_KEY` is never in client bundles. | M6: Enterprise Hardening | PRD v4 Sec 3, PRD v4 Phase 8 |
| 73 | High-Volume Telemetry Ingestion Pipeline | Batched ping ingestion handling target 10,000 pings/min without DB exhaustion. | M6: Enterprise Hardening | PRD v4 Sec 9, PRD v4 Phase 8 |
| 74 | Backup & Disaster Recovery Verification Drill | Automated backup/restore verification script validating RTO $\le 1$h, RPO $\le 15$m. | M6: Enterprise Hardening | PRD v4 Sec 3, PRD v4 Phase 8 |
| 75 | Cross-Tenant Security Penetration Test Suite | Automated adversarial security test suite attempting cross-tenant reads/writes. | M6: Enterprise Hardening | PRD v4 Sec 5, PRD v4 Phase 8 |
| 76 | Master Cross-Tenant Isolation CI Regression Gate | Master regression test gate verifying zero cross-tenant leakage across all tables. | M7: QA & Launch | PRD v4 Phase 9, PRD v4 Sec 11 |

---

## Milestones Decomposition

| # | Milestone Name | Scope | Dependencies | Status |
|---|----------------|-------|--------------|--------|
| M1 | Commercial Driver Console (`/driver`) | Features 1–15: Live GPS HUD, 6-stage milestone tracker, Khata expense diary, emergency calling, e-Bilti QR, 3-way route selector, multilingual voice, backhaul accept, auth flow | Baseline (Phases 0-2) | DONE (305 tests passing, 10/10 stress probes passed, CTO approved) |
| M2 | Fleet Admin Console (`/admin`) | Features 16–34: Ops header, KPI cards, freight matching, roster, WhatsApp dispatch slip, advance planner, Khata ledger, Gaadi-wise P&L, deadhead simulator, Golden Hour console | M1 | DONE (520 tests passing, 0 regressions, Forensic Auditor CLEAN, CTO approved) |
| M3 | Shipper Freight Portal (`/shipper` & `/`) | Features 35–45: Public rate-limited estimator, national gateway `/`, isometric 3D visualizer, AI booking assistant, probability bidding slider, statutory toggles, shipment tracker | M1, M2 | DONE (597 tests passing, CTO approved) |
| M4 | Safety & Telematics (AIS-140 & Golden Hour) | Features 46–59: Background telemetry, AIS-140 classifier, in-app crash simulator, 30s audible siren/countdown, 96dp cancel button, 112 ERSS dispatch, Golden Hour T0/T1/T2, offline buffer | M1 | DONE (627 tests passing, CTO approved) |
| M5 | Statutory & Regulatory Compliance | Features 60–68: Tenant-unique e-Bilti LR, CGST Rule 54(3), 12-digit e-Way bill, Section 194C TDS, VAHAN/SARATHI verification, FASTag toll engine | M1, M2, M3 | DONE (678 tests passing, CTO approved) |
| M6 | Enterprise Hardening & Observability | Features 69–75: Structured JSON logging, public IP rate limiting, append-only audit dispute trail, secret leak scanner, high-volume telemetry ingestion, DR drill | M1–M5 | DONE (716 tests passing, CTO approved) |
| M7 | QA, UAT & Production Launch (Final Milestone) | Feature 76: E2E Test Suite 100% passing (Tiers 1–4) + Tier 5 Adversarial Coverage Hardening + Enterprise Role UAT (Commercial Driver, Fleet Admin, Shipper Logistics) + Deployment certification | M1–M6, TEST_READY | IN PROGRESS |

---

## Code Layout

```
src/
├── app/
│   ├── layout.tsx                # Root layout with theme & font providers
│   ├── page.tsx                  # Public national gateway (Feature 36, 37)
│   ├── login/page.tsx            # Multi-tenant auth & driver invitation claim
│   ├── driver/page.tsx           # Commercial Driver Console (M1)
│   ├── admin/page.tsx            # Fleet Admin Console (M2)
│   ├── shipper/page.tsx          # Shipper Booking Portal (M3)
│   └── api/
│       ├── health/route.ts
│       └── v1/
│           ├── auth/
│           ├── fleet/            # /drivers, /dead-mileage, /alerts, /documents
│           ├── loads/            # /loads, /loads/accept
│           ├── trips/            # /trips, /trips/[id]
│           ├── khata/            # /khata, /khata/settle
│           ├── quotes/           # Dynamic pricing estimator
│           ├── pings/            # High-volume telemetry ingestion
│           └── safety/           # /sos, /cancel, /incidents
├── components/
│   ├── ui/                       # Reusable primitives (Button, Card, Badge, Slider, Modal, Table)
│   ├── driver/                   # Driver HUD, MilestoneBar, KhataDiary, RouteSelector, QRModal
│   ├── admin/                    # KpiGrid, DispatchBoard, RosterTable, WhatsAppModal, KhataLedger
│   ├── shipper/                  # CostEstimator, BookingChatbot, BiddingSlider, ShipmentTracker
│   ├── safety/                   # CrashCountdownModal, GoldenHourMonitor, TelemetryStatus
│   └── common/                   # Navigation, Footer, ConnectivityDot, LanguageSwitcher
├── lib/
│   ├── algorithms/               # Pure algorithmic TS modules (deadMileage, routeOptimizer, etc.)
│   ├── supabase/                 # Supabase client & server-side helpers
│   ├── auth.ts                   # JWT creation, claims verification, role checks
│   ├── data-service.ts           # EnterpriseDataService with tenant isolation & audit logging
│   ├── rate-limit.ts             # Token-bucket public endpoint rate limiter
│   └── logger.ts                 # Structured JSON logger with correlation IDs
└── middleware.ts                 # Edge route guard with HMAC-SHA256 JWT validation

tests/
├── unit/                         # Unit tests (algorithms, routes, health)
├── e2e/
│   ├── tier1-features/           # Feature coverage tests (>= 5 per feature)
│   ├── tier2-boundaries/         # Boundary & corner cases
│   ├── tier3-interactions/       # Cross-feature pairwise tests
│   ├── tier4-real-world/         # Realistic end-to-end corridor scenarios
│   └── tier5-adversarial/        # Adversarial hardening tests
└── visual/                       # Headless browser screenshot verification tests
```

---

## Interface Contracts

### 1. Driver Console ↔ Trips API
- `PATCH /api/v1/trips`
  - Headers: `Authorization: Bearer <JWT>`, `Idempotency-Key: <UUID>`
  - Body: `{ trip_id: string, milestone_status: 'loading' | 'in_transit' | 'unloading' | 'pod_uploaded' | 'completed' }`
  - Response: `{ success: true, trip: TripObject }`

### 2. Driver Console ↔ Backhaul Acceptance
- `POST /api/v1/loads/accept`
  - Headers: `Authorization: Bearer <JWT>`, `Idempotency-Key: <UUID>`
  - Body: `{ load_id: string }`
  - Response: `{ success: true, trip_id: string, message: "Load accepted successfully" }`
  - Errors: 409 Conflict if already accepted; 403 if unauthorized.

### 3. Safety Distress Dispatch ↔ 112 ERSS
- `POST /api/v1/safety/sos`
  - Headers: `Authorization: Bearer <JWT>`
  - Body: `{ trip_id: string, g_force: number, lat: number, lng: number, t0_timestamp: string, incident_type: 'crash' | 'sos' | 'rollover' }`
  - Response: `{ incident_id: string, status: 'active', t1_timestamp: string }`

### 4. False Alarm Cancellation
- `POST /api/v1/safety/cancel`
  - Headers: `Authorization: Bearer <JWT>`
  - Body: `{ incident_id?: string, trip_id: string, reason: string }`
  - Response: `{ status: 'cancelled', message: "Alarm cancelled by driver" }`

### 5. Multi-Tenant Row-Level Security Invariant
Every table must enforce:
`tenant_id UUID NOT NULL REFERENCES organizations(id)`
RLS policy:
`USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)`
`WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)`

---

## Chief Technology Officer (CTO) Review Governance
- Before advancing from any milestone $M_n$ to $M_{n+1}$, a formal Phase Review Gate must be executed:
  1. Automated build & tests must pass with 0 regressions.
  2. UI developer & UX developer visual screenshot verification via headless Firefox.
  3. Reviewers conduct code quality and UX inspection.
  4. Challengers execute boundary stress-testing.
  5. Forensic Auditor executes integrity check (BINARY VETO).
  6. CTO Agent performs critical review and issues written approval or requests remediation.
