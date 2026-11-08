import fs from 'fs';
import path from 'path';
import { logger } from '../src/lib/logger';

interface SecretScanViolation {
  file: string;
  line: number;
  match: string;
  rule: string;
}

const SRC_DIR = path.resolve(process.cwd(), 'src');

// Allowed server-only administrative client
const ALLOWED_FILES = new Set([
  path.normalize(path.resolve(process.cwd(), 'src/lib/supabase/admin.ts')),
]);

const SECRET_PATTERNS = [
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY_USAGE',
    regex: /\bSUPABASE_SERVICE_ROLE_KEY\b/,
    description: 'Reference to privileged service-role key outside server-only admin module',
  },
  {
    name: 'HARDCODED_SERVICE_ROLE_JWT',
    regex: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
    description: 'Hardcoded Supabase JWT token detected in source code',
  },
];

const CLIENT_COMPONENT_RULES = [
  {
    name: 'CLIENT_COMPONENT_ADMIN_IMPORT',
    regex: /(?:from\s+['"][^'"]*\/supabase\/admin(?:['"]|\.ts['"]))|(?:import\s*\(\s*['"][^'"]*\/supabase\/admin)/,
    description: 'Client component must not import server-only admin Supabase module',
  },
  {
    name: 'CLIENT_COMPONENT_ADMIN_CLIENT_CALL',
    regex: /\bcreateAdminClient\b/,
    description: 'Client component must not reference or call createAdminClient',
  },
];

function scanDirectory(dir: string, violations: SecretScanViolation[]) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      scanDirectory(fullPath, violations);
    } else if (entry.isFile() && /\.(ts|tsx|js|jsx|json)$/.test(entry.name)) {
      const normalizedPath = path.normalize(fullPath);

      // Check if file is in allowed whitelist
      if (ALLOWED_FILES.has(normalizedPath)) {
        continue;
      }

      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');

      const isClientComponent = content.includes("'use client'") || content.includes('"use client"');

      lines.forEach((line, idx) => {
        // Skip comment lines
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('/*')) return;

        for (const pattern of SECRET_PATTERNS) {
          if (pattern.regex.test(line)) {
            violations.push({
              file: path.relative(process.cwd(), fullPath),
              line: idx + 1,
              match: line.trim(),
              rule: pattern.name + (isClientComponent ? ' (CLIENT_COMPONENT_LEAK)' : ''),
            });
          }
        }

        if (isClientComponent) {
          for (const rule of CLIENT_COMPONENT_RULES) {
            if (rule.regex.test(line)) {
              violations.push({
                file: path.relative(process.cwd(), fullPath),
                line: idx + 1,
                match: line.trim(),
                rule: `${rule.name} (CLIENT_COMPONENT_LEAK)`,
              });
            }
          }
        }
      });
    }
  }
}

export function runSecretScan(): boolean {
  logger.info('Starting static secret scan across source files', {
    targetDir: 'src',
    whitelisted: Array.from(ALLOWED_FILES).map((f) => path.relative(process.cwd(), f)),
  });

  const violations: SecretScanViolation[] = [];

  if (fs.existsSync(SRC_DIR)) {
    scanDirectory(SRC_DIR, violations);
  } else {
    logger.warn('Source directory src does not exist yet');
    return true;
  }

  if (violations.length > 0) {
    logger.fatal('Static secret scan failed: Secret leaks detected in client or unauthorized source files!', {
      violationCount: violations.length,
      violations,
    });
    return false;
  }

  logger.info('Static secret scan passed: No service-role key or token leaks found in client bundles/source.', {
    status: 'CLEAN',
    filesScannedDir: 'src',
  });
  return true;
}

if (require.main === module || process.argv[1]?.includes('scan-secrets')) {
  const success = runSecretScan();
  process.exit(success ? 0 : 1);
}
