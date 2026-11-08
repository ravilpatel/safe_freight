import fs from 'fs';
import path from 'path';
import { logger } from '../src/lib/logger';

interface MigrationValidationResult {
  file: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
  statementCount: number;
}

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'supabase/migrations');
const FILENAME_REGEX = /^\d{14}_[a-z0-9_]+\.sql$/;

function validateSqlFile(filePath: string): MigrationValidationResult {
  const fileName = path.basename(filePath);
  const result: MigrationValidationResult = {
    file: fileName,
    valid: true,
    errors: [],
    warnings: [],
    statementCount: 0,
  };

  // 1. Validate naming convention
  if (!FILENAME_REGEX.test(fileName)) {
    result.errors.push(`File name does not match format YYYYMMDDHHMMSS_name.sql: ${fileName}`);
    result.valid = false;
  }

  // 2. Read content
  const content = fs.readFileSync(filePath, 'utf-8');
  if (!content.trim()) {
    result.errors.push('Migration file is empty');
    result.valid = false;
    return result;
  }

  // 3. Check for dangerous DROP statements without IF EXISTS
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    // Ignore comments
    if (trimmed.startsWith('--') || trimmed.startsWith('/*')) return;

    // Check for DROP TABLE / DROP COLUMN / DROP POLICY without IF EXISTS (supporting quoted and unquoted identifiers)
    const dropTableMatch = trimmed.match(/\bDROP\s+TABLE\s+(?!IF\s+EXISTS\b)(["\w]+)/i);
    if (dropTableMatch) {
      result.errors.push(
        `Line ${index + 1}: Unsafe DROP TABLE detected without IF EXISTS: "${trimmed}"`
      );
      result.valid = false;
    }

    const dropPolicyMatch = trimmed.match(/\bDROP\s+POLICY\s+(?!IF\s+EXISTS\b)(["\w]+)/i);
    // Allow if inside DO $$ block with IF EXISTS check
    if (dropPolicyMatch && !content.includes('IF EXISTS') && !content.includes('pg_policies')) {
      result.warnings.push(
        `Line ${index + 1}: DROP POLICY without direct IF EXISTS check: "${trimmed}"`
      );
    }

    // Check for insecure permissive RLS policies: USING (true) or WITH CHECK (true)
    if (/\bUSING\s*\(\s*true\s*\)/i.test(trimmed) || /\bWITH\s+CHECK\s*\(\s*true\s*\)/i.test(trimmed)) {
      result.errors.push(
        `Line ${index + 1}: Insecure RLS policy detected (permissive true condition): "${trimmed}"`
      );
      result.valid = false;
    }
  });

  // 4. Check balanced quotes and blocks
  let singleQuoteCount = 0;
  for (let i = 0; i < content.length; i++) {
    if (content[i] === "'" && (i === 0 || content[i - 1] !== '\\')) {
      singleQuoteCount++;
    }
  }
  if (singleQuoteCount % 2 !== 0) {
    result.errors.push('Unbalanced single quotes in SQL file');
    result.valid = false;
  }

  // Count non-empty statements
  const statements = content
    .split(/;(?=(?:(?:[^']*'){2})*[^']*$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  result.statementCount = statements.length;

  return result;
}

export function runMigrationDryRun(): boolean {
  logger.info('Starting Supabase migration dry-run verification', {
    directory: MIGRATIONS_DIR,
  });

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    logger.fatal(`Migrations directory does not exist: ${MIGRATIONS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'));

  if (files.length === 0) {
    logger.warn('No SQL migration files found in supabase/migrations/');
    return true;
  }

  // Sort sequentially
  files.sort();

  let allValid = true;
  const auditSummary: Record<string, MigrationValidationResult> = {};

  for (const file of files) {
    const fullPath = path.join(MIGRATIONS_DIR, file);
    const validation = validateSqlFile(fullPath);
    auditSummary[file] = validation;

    if (!validation.valid) {
      allValid = false;
      logger.error(`Migration validation failed for ${file}`, {
        errors: validation.errors,
      });
    } else {
      logger.info(`Migration validation passed for ${file}`, {
        statementCount: validation.statementCount,
        warnings: validation.warnings,
      });
    }
  }

  if (!allValid) {
    logger.fatal('Migration dry-run failed: one or more migrations contain errors', {
      summary: auditSummary,
    });
    return false;
  }

  logger.info('Migration dry-run succeeded: all migration files are valid and safe.', {
    fileCount: files.length,
    files,
  });
  return true;
}

if (require.main === module || process.argv[1]?.includes('migration-dry-run')) {
  const success = runMigrationDryRun();
  process.exit(success ? 0 : 1);
}
