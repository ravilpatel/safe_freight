# E2E Test Infra: SafeFreight OS (v4.0.0)

## Test Philosophy
- **Opaque-box, requirement-driven**: Derived directly from `ORIGINAL_REQUEST.md` and `SafeFreight OS Enterprise PRD v4.0.0`, completely decoupled from implementation internals.
- **Methodology**: Systematic 4-tier design:
  - **Tier 1 — Feature Coverage**: $\ge 5$ test cases per feature covering representative inputs in isolation.
  - **Tier 2 — Boundary & Corner Cases**: $\ge 5$ test cases per feature at domain limits (empty inputs, zero, max-size, overflow, boundary vectors).
  - **Tier 3 — Cross-Feature Combinations**: Pairwise coverage testing interactions sharing state, data flow, or control flow.
  - **Tier 4 — Real-World Application Scenarios**: Multi-feature end-to-end user journeys (e.g. Ramesh commercial driver journey, Balwinder fleet owner operations, Adani logistics shipper booking).
  - **Tier 5 — Adversarial Coverage Hardening**: White-box stress-testing, fuzzing, and penetration testing for cross-tenant isolation and edge cases.

## Test Architecture
- **Runner**: Vitest v2.1.4 (invoked via `PATH="/home/ravil_indiesemic/.local/bin:$PATH" npm test`).
- **Pass/Fail Semantics**: 100% tests must pass with exit code 0. Zero regressions tolerated on baseline 235 tests.
- **Visual Inspection Runner**: Headless Firefox / Geckodriver automated W3C WebDriver script (`scripts/screenshot-consoles.ts`).
- **Directory Layout**:
  - `tests/unit/`: Pure algorithmic unit tests (algorithms, static routes).
  - `tests/e2e/tier1-features/`: Tier 1 feature coverage suites.
  - `tests/e2e/tier2-boundaries/`: Tier 2 boundary and corner case suites.
  - `tests/e2e/tier3-interactions/`: Tier 3 pairwise integration suites.
  - `tests/e2e/tier4-real-world/`: Tier 4 real-world user scenario walkthroughs.
  - `tests/e2e/tier5-adversarial/`: Tier 5 white-box adversarial stress tests.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Target Persona |
|---|----------|--------------------|----------------|
| 1 | Ramesh Night Highway Run | F1, F2, F3, F4, F5, F6, F7, F8, F56, F57 | Commercial Truck Driver on NH 48 |
| 2 | Balwinder Fleet Operations & Khata Settlement | F16, F17, F18, F19, F23, F24, F26, F27, F28, F31 | Fleet Owner (15 Trucks) in Surat |
| 3 | Adani Wilmar Urgent FMCG Dispatch | F35, F38, F39, F40, F42, F43, F60, F63 | Enterprise Shipper in JNPT |
| 4 | Highway Collision & Golden Hour Rescue | F46, F47, F49, F50, F51, F52, F53 | Emergency Response & Fleet Safety |
| 5 | Cross-Tenant Attack & Penetration Attempt | F15, F34, F45, F71, F75, F76 | Malicious Actor Penetration Test |

## Coverage Thresholds
- **Baseline passing tests**: 235 tests (mandatory invariant).
- **Expanded phase tests**: Target $\ge 350$ total automated tests across all 7 phases.
- **Cross-tenant data leak tolerance**: Exactly 0.
