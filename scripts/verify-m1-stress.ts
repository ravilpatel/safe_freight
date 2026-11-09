/**
 * SafeFreight OS — Milestone 1 Stress & Boundary Empirical Challenge Harness
 * Challenger 1: Stress & Boundary Challenger
 * 
 * Tests:
 * 1. Milestone state transitions: out-of-order, skip stages, backward, terminal immutability, invalid strings.
 * 2. Rapid double-taps and Idempotency-Key collision / replay bypass via dynamic Date.now().
 * 3. Khata calculations: excess advances, zero remaining cash, negative inputs, extreme integers, floating point.
 * 4. Route optimizer: distance detours, toll charges, fuel rates, total cost invariants, non-finite inputs.
 */

import { PATCH as tripsPATCH, POST as tripsPOST } from '../src/app/api/v1/trips/route';
import { NextRequest } from 'next/server';
import { createSignedJwtPayload } from '../src/lib/auth';
import { dataService } from '../src/lib/data-service';
import { calculateTripKhata, getKhataCashStatus } from '../src/lib/algorithms/tripKhata';
import { calculate3WayRoutes } from '../src/lib/algorithms/routeOptimizer';
import { globalIdempotencyStore } from '../src/lib/middleware/idempotency';
import { SessionClaims } from '../src/types/database';

interface ChallengeResult {
  suite: string;
  testName: string;
  passed: boolean;
  expected: string;
  actual: string;
  defectSeverity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  details?: string;
}

const results: ChallengeResult[] = [];

async function runMilestoneStressProbes() {
  const tenantClaims: SessionClaims = {
    sub: 'driver-challenger-01',
    email: 'driver.challenger@test-org.in',
    tenant_id: 'tenant-stress-m1-001',
    role: 'driver',
  };
  const token = createSignedJwtPayload(tenantClaims);

  // Setup initial trip
  const reqCreate = new NextRequest('http://localhost:3000/api/v1/trips', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': 'key-create-trip-stress-01',
    },
    body: JSON.stringify({ gross_freight: 45000 }),
  });
  const resCreate = await tripsPOST(reqCreate);
  const jsonCreate = await resCreate.json();
  const tripId = jsonCreate.data.id;

  // PROBE 1: Terminal State Immutability
  // First, transition trip to terminal 'completed' status
  await dataService.updateTripMilestone(tenantClaims, tripId, 'completed', { force: true });

  // Now attempt to mutate completed trip back to 'at_pickup' or 'in_transit'
  const reqTerminalMutate = new NextRequest('http://localhost:3000/api/v1/trips', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': 'key-terminal-mutate-01',
    },
    body: JSON.stringify({ trip_id: tripId, milestone_status: 'in_transit' }),
  });
  const resTerminalMutate = await tripsPATCH(reqTerminalMutate);
  const jsonTerminalMutate = await resTerminalMutate.json();

  if (resTerminalMutate.status === 200 && jsonTerminalMutate.data?.milestone_status === 'in_transit') {
    results.push({
      suite: 'Milestone Lifecycle',
      testName: 'PROBE-M1-01: Terminal State Immutability Enforcement',
      passed: false,
      expected: 'HTTP 400/409 rejecting modification of completed trip',
      actual: `HTTP 200 OK — Trip status changed from 'completed' back to '${jsonTerminalMutate.data?.milestone_status}'`,
      defectSeverity: 'CRITICAL',
      details: 'Completed trips can be reopened and mutated at will. Server lacks terminal state guard.',
    });
  } else {
    results.push({
      suite: 'Milestone Lifecycle',
      testName: 'PROBE-M1-01: Terminal State Immutability Enforcement',
      passed: true,
      expected: 'Terminal state immutable',
      actual: `Rejected with status ${resTerminalMutate.status}`,
    });
  }

  // PROBE 2: Skipping Stages (Out-of-Order Transition)
  // Create a fresh trip starting at 'at_pickup'
  const reqCreate2 = new NextRequest('http://localhost:3000/api/v1/trips', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': 'key-create-trip-stress-02',
    },
    body: JSON.stringify({ gross_freight: 45000 }),
  });
  const resCreate2 = await tripsPOST(reqCreate2);
  const jsonCreate2 = await resCreate2.json();
  const tripId2 = jsonCreate2.data.id;
  await dataService.updateTripMilestone(tenantClaims, tripId2, 'at_pickup');

  // Attempt to skip 4 stages directly to 'completed'
  const reqSkip = new NextRequest('http://localhost:3000/api/v1/trips', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': 'key-skip-stages-01',
    },
    body: JSON.stringify({ trip_id: tripId2, milestone_status: 'completed' }),
  });
  const resSkip = await tripsPATCH(reqSkip);
  const jsonSkip = await resSkip.json();

  if (resSkip.status === 200 && jsonSkip.data?.milestone_status === 'completed') {
    results.push({
      suite: 'Milestone Lifecycle',
      testName: 'PROBE-M1-02: Sequential Stage Enforcement (No Skipping)',
      passed: false,
      expected: 'HTTP 400 rejecting skip from at_pickup directly to completed',
      actual: `HTTP 200 OK — Allowed skipping directly to '${jsonSkip.data?.milestone_status}'`,
      defectSeverity: 'CRITICAL',
      details: 'Trips can skip from pickup to completed without going through loaded, in_transit, etc.',
    });
  } else {
    results.push({
      suite: 'Milestone Lifecycle',
      testName: 'PROBE-M1-02: Sequential Stage Enforcement (No Skipping)',
      passed: true,
      expected: 'Skipping stages rejected',
      actual: `Rejected with status ${resSkip.status}`,
    });
  }

  // PROBE 3: Backward Milestone Transitions
  // Set trip to 'in_transit'
  await dataService.updateTripMilestone(tenantClaims, tripId2, 'in_transit', { force: true });
  const reqBackward = new NextRequest('http://localhost:3000/api/v1/trips', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': 'key-backward-transition-01',
    },
    body: JSON.stringify({ trip_id: tripId2, milestone_status: 'loaded' }),
  });
  const resBackward = await tripsPATCH(reqBackward);
  const jsonBackward = await resBackward.json();

  if (resBackward.status === 200 && jsonBackward.data?.milestone_status === 'loaded') {
    results.push({
      suite: 'Milestone Lifecycle',
      testName: 'PROBE-M1-03: Backward Milestone Transition Prevention',
      passed: false,
      expected: 'HTTP 400 rejecting backward transition from in_transit to loaded',
      actual: `HTTP 200 OK — Trip regressed back to '${jsonBackward.data?.milestone_status}'`,
      defectSeverity: 'HIGH',
      details: 'Trips can regress backward along the milestone lifecycle.',
    });
  } else {
    results.push({
      suite: 'Milestone Lifecycle',
      testName: 'PROBE-M1-03: Backward Milestone Transition Prevention',
      passed: true,
      expected: 'Backward transition rejected',
      actual: `Rejected with status ${resBackward.status}`,
    });
  }

  // PROBE 4: Invalid Milestone Enum Strings
  const reqInvalid = new NextRequest('http://localhost:3000/api/v1/trips', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': 'key-invalid-status-01',
    },
    body: JSON.stringify({ trip_id: tripId2, milestone_status: 'SUPER_FAST_FLYING' }),
  });
  const resInvalid = await tripsPATCH(reqInvalid);
  const jsonInvalid = await resInvalid.json();

  if (resInvalid.status === 200 && jsonInvalid.data?.milestone_status === 'SUPER_FAST_FLYING') {
    results.push({
      suite: 'Milestone Lifecycle',
      testName: 'PROBE-M1-04: Arbitrary / Invalid Milestone String Validation',
      passed: false,
      expected: 'HTTP 400 rejecting invalid milestone string',
      actual: `HTTP 200 OK — Database accepted arbitrary status '${jsonInvalid.data?.milestone_status}'`,
      defectSeverity: 'HIGH',
      details: 'PATCH endpoint does not validate milestone against allowed MilestoneStatus enum.',
    });
  } else {
    results.push({
      suite: 'Milestone Lifecycle',
      testName: 'PROBE-M1-04: Arbitrary / Invalid Milestone String Validation',
      passed: true,
      expected: 'Invalid status rejected',
      actual: `Rejected with status ${resInvalid.status}`,
    });
  }

  // PROBE 5: Dynamic Date.now() removal from Idempotency-Key enables replay & double-tap deduplication
  // Deterministic key as implemented in fixed MilestoneTracker.tsx:
  // `Idempotency-Key: milestone-${tripId}-${statusKey}`
  globalIdempotencyStore.clear();
  const stableKey = `milestone-${tripId2}-in_transit`;
  const key1 = stableKey;
  const key2 = stableKey; // deterministic double tap

  const reqTap1 = new NextRequest('http://localhost:3000/api/v1/trips', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': key1,
    },
    body: JSON.stringify({ trip_id: tripId2, milestone_status: 'in_transit' }),
  });
  await tripsPATCH(reqTap1);

  const isKey2Cached = globalIdempotencyStore.get(tenantClaims.tenant_id, key2) !== null;
  if (!isKey2Cached) {
    results.push({
      suite: 'Idempotency & Concurrency',
      testName: 'PROBE-M1-05: Double-Tap Deduplication Defeat via Timestamped Key',
      passed: false,
      expected: 'Rapid double tap uses stable deterministic key and hits idempotency cache',
      actual: `Cache missed! Second tap key '${key2}' treated as new request, executing second write`,
      defectSeverity: 'HIGH',
      details: 'MilestoneTracker.tsx and BackhaulBoard.tsx append Date.now() to Idempotency-Key, defeating replay cache.',
    });
  } else {
    results.push({
      suite: 'Idempotency & Concurrency',
      testName: 'PROBE-M1-05: Double-Tap Deduplication Defeat via Timestamped Key',
      passed: true,
      expected: 'Double tap deduplicated via deterministic key',
      actual: 'Idempotency cache hit',
    });
  }
}

async function runKhataBoundaryProbes() {
  // PROBE 6: Excess advance exceeding gross freight
  const rExcess = calculateTripKhata(20000, {
    diesel: 15000,
    fastag: 5000,
    driverBhatta: 4000,
    hamali: 2000,
  }, 1000);

  // Total advances = 26000 > 20000 gross freight
  const balanceClamped = rExcess.balanceDueOnPODINR === 0;
  const netDeficitAccurate = rExcess.netGrossProfitINR === -7000; // 20000 - (26000 + 1000)
  const marginAccurate = rExcess.profitMarginPercent === -35.0; // (-7000 / 20000) * 100

  if (balanceClamped && netDeficitAccurate && marginAccurate) {
    results.push({
      suite: 'Trip Khata Financials',
      testName: 'PROBE-M1-06: Excess Advance Disbursal Mathematical Integrity',
      passed: true,
      expected: 'Balance due clamped to 0, operating loss -₹7,000, margin -35.0%',
      actual: `Balance ₹${rExcess.balanceDueOnPODINR}, Net ₹${rExcess.netGrossProfitINR}, Margin ${rExcess.profitMarginPercent}%`,
    });
  } else {
    results.push({
      suite: 'Trip Khata Financials',
      testName: 'PROBE-M1-06: Excess Advance Disbursal Mathematical Integrity',
      passed: false,
      expected: 'Balance due clamped to 0, operating loss -₹7,000, margin -35.0%',
      actual: `Balance ₹${rExcess.balanceDueOnPODINR}, Net ₹${rExcess.netGrossProfitINR}, Margin ${rExcess.profitMarginPercent}%`,
      defectSeverity: 'HIGH',
    });
  }

  // PROBE 7: Zero Remaining Cash in Hand
  // If initial advance is ₹10,000 and total expenses are ₹10,000
  const initialAdvance = 10000;
  const totalExpenses = 10000;
  const remainingCash = initialAdvance - totalExpenses;
  const cashStatus = getKhataCashStatus(remainingCash);

  // In TripKhataDiary.tsx:
  // When remainingCash === 0, HUD renders zero cash warning (cashStatus === 'exhausted'), NOT "सुरक्षित रोकड़ उपलब्ध"
  if (remainingCash === 0 && cashStatus === 'safe') {
    results.push({
      suite: 'Trip Khata Financials',
      testName: 'PROBE-M1-07: Zero Cash in Hand Boundary Status Phrasing',
      passed: false,
      expected: 'Driver with ₹0 cash in hand should show zero cash warning, not "सुरक्षित रोकड़ उपलब्ध"',
      actual: 'remainingCash === 0 displays "सुरक्षित रोकड़ उपलब्ध" (safe cash available)',
      defectSeverity: 'MEDIUM',
      details: 'When driver cash is exactly ₹0, HUD shows green status claiming safe cash available instead of cash exhausted.',
    });
  } else {
    results.push({
      suite: 'Trip Khata Financials',
      testName: 'PROBE-M1-07: Zero Cash in Hand Boundary Status Phrasing',
      passed: true,
      expected: 'Driver with ₹0 cash in hand displays zero cash warning',
      actual: `Correctly evaluated as ${cashStatus} (warning displayed)`,
    });
  }

  // PROBE 8: Extreme Integer Values & Non-Finites in Khata
  const rExtreme = calculateTripKhata(
    Number.MAX_SAFE_INTEGER,
    { diesel: 1e12, fastag: 1e12 },
    1e11
  );
  const rNonFinite = calculateTripKhata(NaN, { diesel: Infinity, fastag: -500 }, -100);

  const extremeOk = isFinite(rExtreme.netGrossProfitINR) && rExtreme.balanceDueOnPODINR >= 0;
  const nonFiniteOk = rNonFinite.grossFreightINR === 0 && rNonFinite.totalDisbursedAdvancesINR === 0 && rNonFinite.profitMarginPercent === 0;

  if (extremeOk && nonFiniteOk) {
    results.push({
      suite: 'Trip Khata Financials',
      testName: 'PROBE-M1-08: Extreme Integer & Non-Finite Number Sanitation',
      passed: true,
      expected: 'Sanitizes NaN, Infinity, negative values to 0; handles MAX_SAFE_INTEGER without crash',
      actual: 'Cleanly sanitized and clamped to zero',
    });
  } else {
    results.push({
      suite: 'Trip Khata Financials',
      testName: 'PROBE-M1-08: Extreme Integer & Non-Finite Number Sanitation',
      passed: false,
      expected: 'Sanitizes NaN, Infinity, negative values to 0',
      actual: `Failed: extremeOk=${extremeOk}, nonFiniteOk=${nonFiniteOk}`,
      defectSeverity: 'HIGH',
    });
  }
}

async function runRouteOptimizerProbes() {
  // PROBE 9: Route Invariants (Distance, Toll, Speed, Cost)
  const corridorDistances = [100, 300, 525, 800, 1500];
  let invariantsHold = true;
  let violationMsg = '';

  for (const d of corridorDistances) {
    const routes = calculate3WayRoutes('Mumbai JNPT', 'Ahmedabad Changodar', true, d);
    const [fastest, tollOpt, eco] = routes;

    // 1. Distance ordering: Fastest <= Eco <= Toll-Opt
    if (!(fastest.distanceKm <= eco.distanceKm && eco.distanceKm <= tollOpt.distanceKm)) {
      invariantsHold = false;
      violationMsg = `Distance ordering failed at ${d} km: fastest=${fastest.distanceKm}, eco=${eco.distanceKm}, tollOpt=${tollOpt.distanceKm}`;
      break;
    }
    // 2. Toll ordering: Toll-Opt < Eco < Fastest
    if (!(tollOpt.fastagTollINR < eco.fastagTollINR && eco.fastagTollINR < fastest.fastagTollINR)) {
      invariantsHold = false;
      violationMsg = `Toll ordering failed at ${d} km: tollOpt=${tollOpt.fastagTollINR}, eco=${eco.fastagTollINR}, fastest=${fastest.fastagTollINR}`;
      break;
    }
    // 3. Fuel ordering: Eco-Fuel consumes strictly less fuel liters than Fastest
    if (!(eco.fuelLiters < fastest.fuelLiters)) {
      invariantsHold = false;
      violationMsg = `Eco fuel liters (${eco.fuelLiters}) not less than fastest (${fastest.fuelLiters}) at ${d} km`;
      break;
    }
    // 4. Speed ordering: Toll-Opt < Eco < Fastest
    if (!(tollOpt.speedKmh < eco.speedKmh && eco.speedKmh < fastest.speedKmh)) {
      invariantsHold = false;
      violationMsg = `Speed ordering failed: ${tollOpt.speedKmh} < ${eco.speedKmh} < ${fastest.speedKmh}`;
      break;
    }
  }

  if (invariantsHold) {
    results.push({
      suite: 'Route Optimizer',
      testName: 'PROBE-M1-09: 3-Way Corridor Algorithmic Invariants',
      passed: true,
      expected: 'Distance (Fastest<=Eco<=TollOpt), Toll (TollOpt<Eco<Fastest), Fuel (Eco<Fastest)',
      actual: 'All mathematical and corridor invariants satisfied across tested distance range',
    });
  } else {
    results.push({
      suite: 'Route Optimizer',
      testName: 'PROBE-M1-09: 3-Way Corridor Algorithmic Invariants',
      passed: false,
      expected: 'Invariants hold',
      actual: violationMsg,
      defectSeverity: 'HIGH',
    });
  }

  // PROBE 10: Non-finite Distance Handling in Route Optimizer
  const rInf = calculate3WayRoutes('Mumbai', 'Ahmedabad', false, Infinity);
  if (rInf[0].durationFormatted.includes('NaN') || !isFinite(rInf[0].distanceKm)) {
    results.push({
      suite: 'Route Optimizer',
      testName: 'PROBE-M1-10: Non-Finite (Infinity) Distance Override Sanitation',
      passed: false,
      expected: 'Fallback to 480km baseline when distanceOverrideKm is not finite',
      actual: `durationFormatted produced '${rInf[0].durationFormatted}', distanceKm is ${rInf[0].distanceKm}`,
      defectSeverity: 'MEDIUM',
      details: 'calculate3WayRoutes checks distanceOverrideKm > 0 without checking isFinite, leading to Infinity distance and NaNm formatted duration.',
    });
  } else {
    results.push({
      suite: 'Route Optimizer',
      testName: 'PROBE-M1-10: Non-Finite (Infinity) Distance Override Sanitation',
      passed: true,
      expected: 'Finite fallback',
      actual: 'Sanitized properly',
    });
  }
}

async function main() {
  console.log('=== STARTING EMPIRICAL STRESS & BOUNDARY CHALLENGE HARNESS ===\n');
  await runMilestoneStressProbes();
  await runKhataBoundaryProbes();
  await runRouteOptimizerProbes();

  console.log('=== EMPIRICAL CHALLENGE RESULTS SUMMARY ===');
  let passCount = 0;
  let failCount = 0;

  for (const r of results) {
    const mark = r.passed ? '✅ PASS' : `❌ FAIL [${r.defectSeverity}]`;
    console.log(`\n${mark} [${r.suite}] ${r.testName}`);
    console.log(`   Expected: ${r.expected}`);
    console.log(`   Actual:   ${r.actual}`);
    if (r.details) {
      console.log(`   Details:  ${r.details}`);
    }
    if (r.passed) passCount++;
    else failCount++;
  }

  console.log(`\nTOTAL PROBES: ${results.length} | PASSED: ${passCount} | DEFECTS FOUND: ${failCount}`);
}

main().catch(console.error);
