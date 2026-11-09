/**
 * SafeFreight OS — Headless WebDriver Visual Inspection Script for Fleet Admin Console (/admin)
 * Uses Geckodriver REST API (W3C WebDriver) and Firefox in headless mode.
 * Captures 1280x900 desktop visual inspection screenshot.
 */

import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import { createSignedJwtPayload } from '../src/lib/auth';

const PORT = 3000;
const GECKO_PORT = 4444;
const BASE_URL = `http://localhost:${PORT}`;
const OUTPUT_PATH = path.resolve('.agents/teamwork/worker_phase4/admin_desktop_view.png');

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isPortOpen(port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/status`, { method: 'GET' }).catch(() => null);
    return res !== null;
  } catch {
    return false;
  }
}

async function isNextServerOpen(port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`, { method: 'GET' }).catch(() => null);
    return res !== null && res.ok;
  } catch {
    return false;
  }
}

async function startGeckoDriver(): Promise<ChildProcess | null> {
  const alreadyRunning = await isPortOpen(GECKO_PORT);
  if (alreadyRunning) {
    console.log(`[WebDriver] Geckodriver already running on port ${GECKO_PORT}`);
    return null;
  }

  const geckoPath = fs.existsSync('/snap/bin/geckodriver')
    ? '/snap/bin/geckodriver'
    : 'geckodriver';

  console.log(`[WebDriver] Spawning geckodriver from ${geckoPath} on port ${GECKO_PORT}...`);
  const proc = spawn(geckoPath, ['--port', String(GECKO_PORT)], {
    stdio: 'ignore',
    detached: true,
  });

  for (let i = 0; i < 25; i++) {
    await sleep(200);
    if (await isPortOpen(GECKO_PORT)) {
      console.log(`[WebDriver] Geckodriver ready on port ${GECKO_PORT}`);
      return proc;
    }
  }
  throw new Error(`Geckodriver failed to start on port ${GECKO_PORT}`);
}

async function startNextServer(): Promise<ChildProcess | null> {
  const alreadyRunning = await isNextServerOpen(PORT);
  if (alreadyRunning) {
    console.log(`[Next.js] Server already running on port ${PORT}`);
    return null;
  }

  // Build if not present
  console.log(`[Next.js] Starting server on port ${PORT}...`);
  const nextBin = path.resolve('node_modules/.bin/next');
  const proc = spawn(nextBin, ['start', '-p', String(PORT)], {
    stdio: 'inherit',
    env: { ...process.env, PORT: String(PORT) },
  });

  for (let i = 0; i < 40; i++) {
    await sleep(300);
    if (await isNextServerOpen(PORT)) {
      console.log(`[Next.js] Server ready on http://localhost:${PORT}`);
      return proc;
    }
  }
  throw new Error(`Next.js server failed to respond on port ${PORT}`);
}

async function captureScreen(
  sessionId: string,
  url: string,
  cookieToken: string,
  viewport: { width: number; height: number },
  outputPath: string
) {
  console.log(`[Capture] Resizing viewport to ${viewport.width}x${viewport.height}...`);
  await fetch(`http://127.0.0.1:${GECKO_PORT}/session/${sessionId}/window/rect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(viewport),
  });

  // Navigate to login first to set cookie on domain
  console.log(`[Capture] Navigating to ${BASE_URL}/login to set auth cookie...`);
  await fetch(`http://127.0.0.1:${GECKO_PORT}/session/${sessionId}/url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: `${BASE_URL}/login` }),
  });
  await sleep(1000);

  // Set safefreight-token cookie
  console.log(`[Capture] Setting safefreight-token cookie...`);
  await fetch(`http://127.0.0.1:${GECKO_PORT}/session/${sessionId}/cookie`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cookie: {
        name: 'safefreight-token',
        value: cookieToken,
        path: '/',
        httpOnly: false,
        secure: false,
      },
    }),
  });

  // Navigate to /admin
  console.log(`[Capture] Navigating to ${url}...`);
  await fetch(`http://127.0.0.1:${GECKO_PORT}/session/${sessionId}/url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  // Wait for client React hydration
  await sleep(3000);

  // Take screenshot
  console.log(`[Capture] Taking screenshot...`);
  const ssRes = await fetch(`http://127.0.0.1:${GECKO_PORT}/session/${sessionId}/screenshot`);
  const ssData = (await ssRes.json()) as { value: string };

  if (!ssData?.value) {
    throw new Error('Failed to capture screenshot data from geckodriver');
  }

  const buffer = Buffer.from(ssData.value, 'base64');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buffer);
  console.log(`[Capture] Saved screenshot to ${outputPath} (${buffer.length} bytes)`);
}

async function main() {
  let geckoProc: ChildProcess | null = null;
  let nextProc: ChildProcess | null = null;

  try {
    geckoProc = await startGeckoDriver();
    nextProc = await startNextServer();

    console.log(`[WebDriver] Creating W3C session in headless Firefox...`);
    const sessionRes = await fetch(`http://127.0.0.1:${GECKO_PORT}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        capabilities: {
          alwaysMatch: {
            'moz:firefoxOptions': {
              args: ['-headless'],
            },
          },
        },
      }),
    });

    const sessionData = (await sessionRes.json()) as { value?: { sessionId: string } };
    const sessionId = sessionData?.value?.sessionId;
    if (!sessionId) {
      throw new Error(`Failed to obtain sessionId: ${JSON.stringify(sessionData)}`);
    }
    console.log(`[WebDriver] Session established: ${sessionId}`);

    // Generate valid fleet admin session token for Fleet Operator Admin
    const adminToken = createSignedJwtPayload({
      sub: '10000000-0000-4000-8000-000000000001',
      email: 'admin@carrier-alpha.in',
      tenant_id: '00000000-0000-4000-8000-000000000001',
      role: 'fleet_admin',
    });

    // Capture Desktop View: 1280 x 900
    await captureScreen(
      sessionId,
      `${BASE_URL}/admin`,
      adminToken,
      { width: 1280, height: 900 },
      OUTPUT_PATH
    );

    // Close session
    console.log(`[WebDriver] Deleting session ${sessionId}...`);
    await fetch(`http://127.0.0.1:${GECKO_PORT}/session/${sessionId}`, {
      method: 'DELETE',
    });

    console.log('[WebDriver] Fleet Admin visual inspection screenshot completed successfully!');
  } finally {
    if (nextProc) {
      console.log('[Cleanup] Stopping Next.js server...');
      nextProc.kill('SIGTERM');
    }
    if (geckoProc) {
      console.log('[Cleanup] Stopping geckodriver...');
      geckoProc.kill('SIGTERM');
    }
  }
}

main().catch((err) => {
  console.error('[Error] Screenshot script failed:', err);
  process.exit(1);
});
