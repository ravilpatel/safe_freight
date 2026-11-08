# SafeFreight OS — E2E Test Infrastructure & Methodology Specification (TEST_INFRA.md)

## 1. Test Philosophy & Core Invariants

SafeFreight OS v4.0.0 is an enterprise multi-tenant digital freight network operating across India's Western Freight Corridor (NH 48) with life-critical AIS-140 Golden Hour emergency response. The testing infrastructure is designed around the following architectural principles:

1. **Opaque-Box (Black-Box) Testing**:
   - Tests evaluate system behavior, mathematical contracts, API specifications, and database invariants purely from external specifications (PRD v4.0.0 and PROJECT.md).
   - No reliance on hidden private implementation details or fragile internal state. If internal refactoring occurs, tests remain valid and authoritative.

2. **Authoritative Output Derivation**:
   - Every test assertion derives its expected output directly from the verified mathematical specifications in PRD v4.0.0 §7 and the enterprise schema in PRD v4.0.0 §4/§10.
   - Zero facade tests, zero trivial tautologies (`expect(true).toBe(true)`), and zero hardcoded fake fixtures.

3. **Multi-Tenant Data Isolation Invariant**:
   - Every transaction, query, and API call must enforce strict tenant boundaries (`tenant_id NOT NULL`).
   - Accounts in Organization A must have 0% visibility into Organization B's data across all business tables.
   - Commercial drivers join organizations via invitation tokens with exactly 0 new organizations created.

4. **Deterministic & Reproducible**:
   - Test suites are idempotent, isolated, and order-independent.
   - Pure mathematical calculations (Dead Mileage, 3-Way Route Optimizer, Dynamic Pricing, Acceptance Probability, Khata Settlement, AIS-140 Crash Triage) are strictly deterministic.

---

## 2. 4-Tier Testing Methodology

```
┌─────────────────────────────────────────────────────────────┐
│  Tier 4: Real-World Scenarios & Corridor Workloads          │
│  (NH 48 Mumbai-Ahmedabad Journeys, Golden Hour False/True)  │
├─────────────────────────────────────────────────────────────┤
│  Tier 3: Cross-Feature Combinations & Pairwise Matrix       │
│  (Auth ↔ Load, Pricing ↔ Route, Telematics ↔ SOS, Khata)    │
├─────────────────────────────────────────────────────────────┤
│  Tier 2: Boundary Value Analysis & Corner Cases             │
│  (Extreme loads, 0/negatives, 99% cap, G-force thresholds)  │
├─────────────────────────────────────────────────────────────┤
│  Tier 1: Feature Coverage (Category-Partition Method)       │
│  (>=5 tests/feat: Happy path, equivalence class partitions) │
└─────────────────────────────────────────────────────────────┘
```

### 2.1 Tier 1: Feature Coverage (Category-Partition Method)
- Systematic partitioning of input domains into valid equivalence classes.
- Validates the primary behavior (happy paths) of every core feature.
- Minimum requirement: **$\ge 5$ deterministic test cases per feature**.

### 2.2 Tier 2: Boundary Value Analysis (BVA) & Corner Cases
- Tests boundary limits, minimums, maximums, zeros, negative clamping, off-by-one conditions, and floating-point transitions.
- Evaluates:
  - Dead Mileage: negative empty km clamped to 0, zero mileage divisor protection ($0.5\text{ km/L}$).
  - Route Optimizer: zero/negative distances falling back to 480 km default, intrastate vs interstate tax transitions.
  - Dynamic Pricing: weight clamped to minimum $50\text{ kg}$, nearest 100 rounding boundaries (₹12,430 vs ₹12,450).
  - Acceptance Probability: piecewise ratio thresholds ($0.00, 0.08, 0.18$) and the strict $99\%$ ceiling.
  - Trip Khata: cash advances exceeding gross freight (balance due clamped to 0), zero gross freight profit margin.
  - AIS-140 G-Force: road noise $< 2.5G$, single-axis cabin drop filter ($a_z \ge 3G, |a_x|, |a_y| < 1G$), multi-axial collision $\ge 4.0G$.
  - Multi-Tenancy: invalid invite tokens, cross-tenant update exploits.
  - API Contracts: empty pagination sets, duplicate idempotency key reuse.
- Minimum requirement: **$\ge 5$ boundary/corner test cases per feature**.

### 2.3 Tier 3: Cross-Feature Combinations (Pairwise Combinatorial Testing)
- Evaluates multi-module interactions across independent subsystems:
  - **Auth & Load Lifecycle**: Fleet Admin signup $\to$ Driver invitation $\to$ Shipper load posting $\to$ Load assignment with audit trail.
  - **Pricing, Routing & Dispatch**: Dynamic pricing generation $\to$ 3-way route calculation $\to$ dead mileage calculation $\to$ driver acceptance probability.
  - **Telematics & Golden Hour Pipeline**: GPS ping ingestion $\to$ deviation alerts $\to$ high-G collision detection $\to$ 30s cancellation vs 112 ERSS dispatch.
  - **Trip Khata Settlement & Pod**: Milestone transitions $\to$ en-route cash advance disbursals $\to$ POD delivery confirmation $\to$ ledger balance reconciliation.

### 2.4 Tier 4: Real-World Application Scenarios (Corridor Workloads)
- Full-fidelity simulation of operational logistics journeys across India's National Highway 48 (Western Freight Spine):
  - **Corridor Waypoints**: Mumbai JNPT Port (18.9496, 72.9515) $\to$ Vapi GIDC (20.3712, 72.9044) $\to$ Surat Ring Road (21.1702, 72.8311) $\to$ Bharuch/Ankleshwar (21.6264, 73.0152) $\to$ Vadodara Ranoli (22.3072, 73.1812) $\to$ Ahmedabad Changodar (22.9298, 72.4518).
  - **Multi-Persona Collaboration**: Commercial Driver Ramesh Patel, Fleet Owner Sardar Balwinder Singh (Western India Fleet Logistics), and Shipper Adani Logistics.
  - **Golden Hour Emergency Sequence**: False alarm pothole/cabin drop rejection, structural impact triggering spoken countdown, driver 96dp safety abort vs emergency rescue dispatch.
  - **Multi-Party Financial Ledger Dispute**: Disputed cash advances, detention charges, e-Bilti (LR) verification, and audit log replay.

---

## 3. Feature Inventory & Coverage Matrix

| Feature ID | Feature Name | Tier 1 (Coverage) | Tier 2 (Boundaries) | Tier 3 (Interactions) | Tier 4 (Real-World) |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **FEAT-01** | Dead Mileage Savings Engine | $\ge 5$ tests | $\ge 5$ tests | Included | Included |
| **FEAT-02** | 3-Way Route Optimizer Engine | $\ge 5$ tests | $\ge 5$ tests | Included | Included |
| **FEAT-03** | Shipper Pricing & Acceptance Probability | $\ge 5$ tests | $\ge 5$ tests | Included | Included |
| **FEAT-04** | Trip Khata Settlement Engine | $\ge 5$ tests | $\ge 5$ tests | Included | Included |
| **FEAT-05** | AIS-140 Crash Classification & SOS | $\ge 5$ tests | $\ge 5$ tests | Included | Included |
| **FEAT-06** | Multi-Tenant Architecture & Auth | $\ge 5$ tests | $\ge 5$ tests | Included | Included |
| **FEAT-07** | Enterprise REST API & Idempotency | $\ge 5$ tests | $\ge 5$ tests | Included | Included |
| **FEAT-08** | Statutory Compliance & Digital e-Bilti | $\ge 5$ tests | $\ge 5$ tests | Included | Included |

---

## 4. Test Suite File Structure

```
tests/e2e/
├── harness/
│   ├── contracts.ts               # Authoritative mathematical specifications & schemas
│   ├── fixtures.ts                # Deterministic test fixtures & corridor waypoints
│   └── mock-context.ts            # Multi-tenant session & database context simulator
├── tier1-features/
│   ├── dead-mileage.test.ts       # Tier 1: FEAT-01 (>=5 tests)
│   ├── route-optimizer.test.ts    # Tier 1: FEAT-02 (>=5 tests)
│   ├── shipper-pricing.test.ts    # Tier 1: FEAT-03 (>=5 tests)
│   ├── trip-khata.test.ts         # Tier 1: FEAT-04 (>=5 tests)
│   ├── ais140-telematics.test.ts  # Tier 1: FEAT-05 (>=5 tests)
│   ├── multi-tenant-auth.test.ts  # Tier 1: FEAT-06 (>=5 tests)
│   ├── api-contracts.test.ts      # Tier 1: FEAT-07 (>=5 tests)
│   └── statutory-ebilti.test.ts   # Tier 1: FEAT-08 (>=5 tests)
├── tier2-boundaries/
│   ├── dead-mileage-bva.test.ts   # Tier 2: FEAT-01 (>=5 tests)
│   ├── route-optimizer-bva.test.ts# Tier 2: FEAT-02 (>=5 tests)
│   ├── shipper-pricing-bva.test.ts# Tier 2: FEAT-03 (>=5 tests)
│   ├── trip-khata-bva.test.ts     # Tier 2: FEAT-04 (>=5 tests)
│   ├── ais140-bva.test.ts         # Tier 2: FEAT-05 (>=5 tests)
│   ├── multi-tenant-bva.test.ts   # Tier 2: FEAT-06 (>=5 tests)
│   ├── api-contracts-bva.test.ts  # Tier 2: FEAT-07 (>=5 tests)
│   └── statutory-ebilti-bva.test.ts# Tier 2: FEAT-08 (>=5 tests)
├── tier3-interactions/
│   ├── auth-load-lifecycle.test.ts
│   ├── pricing-route-dispatch.test.ts
│   ├── telematics-golden-hour.test.ts
│   └── khata-trip-settlement.test.ts
└── tier4-real-world/
    ├── nh48-corridor-journey.test.ts
    ├── golden-hour-emergency.test.ts
    └── multi-tenant-audit-dispute.test.ts
```

---

## 5. Test Execution Instructions

### Environment Setup
Subshells require exporting local binaries to `PATH`:
```bash
export PATH="/home/ravil_indiesemic/.local/bin:/home/ravil_indiesemic/ncs/toolchains/911f4c5c26/usr/local/bin:$PATH"
```

### Running Test Suites
```bash
# Run all E2E test suites
npx vitest run tests/e2e/

# Run specific tiers
npx vitest run tests/e2e/tier1-features/
npx vitest run tests/e2e/tier2-boundaries/
npx vitest run tests/e2e/tier3-interactions/
npx vitest run tests/e2e/tier4-real-world/

# Run with test coverage
npm run test:ci
```
