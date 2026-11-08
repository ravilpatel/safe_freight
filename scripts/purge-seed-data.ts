import dotenv from 'dotenv';
import path from 'path';
import ws from 'ws';
import { createClient } from '@supabase/supabase-js';
import { logger } from '../src/lib/logger';

// Node.js environment WebSocket polyfill for Supabase
if (typeof globalThis.WebSocket === 'undefined') {
  (globalThis as unknown as { WebSocket: unknown }).WebSocket = ws;
}

// Load .env.local first, fallback to .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  logger.fatal('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});


// Order respects foreign key dependencies: child tables first
const TABLES_TO_PURGE = [
  'pings',
  'security_alerts',
  'safety_incidents',
  'documents',
  'trips',
  'loads',
  'users',
];

async function purgeLegacySeedData() {
  logger.info('Starting legacy seed data purge on Supabase cloud instance', {
    supabase_url: supabaseUrl,
    tables: TABLES_TO_PURGE,
  });

  const purgeResults: Record<string, { deleted: boolean; remaining: number; error?: string }> = {};

  for (const table of TABLES_TO_PURGE) {
    try {
      // First check initial count
      const { count: initialCount, error: countErr } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (countErr) {
        // Table might not exist or schema issue
        logger.warn(`Could not query count for table ${table}`, { error: countErr.message });
        purgeResults[table] = { deleted: false, remaining: -1, error: countErr.message };
        continue;
      }

      logger.info(`Table ${table} current row count: ${initialCount}`);

      if (initialCount && initialCount > 0) {
        // Perform deletion of all rows using not('id', 'is', null)
        const { error: deleteErr } = await supabase
          .from(table)
          .delete()
          .not('id', 'is', null);

        if (deleteErr) {
          // Fallback to gte('created_at', '1970-01-01')
          const { error: fallbackErr } = await supabase
            .from(table)
            .delete()
            .gte('created_at', '1970-01-01');

          if (fallbackErr) {
            throw new Error(`Failed to delete from ${table}: ${deleteErr.message} / ${fallbackErr.message}`);
          }
        }
      }

      // Verify zero rows remaining
      const { count: finalCount, error: verifyErr } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (verifyErr) {
        throw new Error(`Failed to verify row count for ${table}: ${verifyErr.message}`);
      }

      purgeResults[table] = {
        deleted: true,
        remaining: finalCount ?? 0,
      };

      logger.info(`Table ${table} successfully purged`, {
        initial_count: initialCount,
        remaining_count: finalCount,
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.error(`Error purging table ${table}`, { error: errMsg });
      purgeResults[table] = { deleted: false, remaining: -1, error: errMsg };
    }
  }

  // Summary audit
  let allZero = true;
  for (const [table, res] of Object.entries(purgeResults)) {
    if (res.remaining !== 0) {
      allZero = false;
      logger.error(`Verification failure: Table ${table} has ${res.remaining} rows remaining!`);
    }
  }

  if (!allZero) {
    logger.fatal('Seed data purge incomplete: one or more tables contain non-zero rows.', {
      results: purgeResults,
    });
    process.exit(1);
  }

  logger.info('Live Supabase cloud seed purge verified successfully: All business tables have 0 rows.', {
    results: purgeResults,
  });
}

purgeLegacySeedData().catch((err) => {
  logger.fatal('Fatal error during seed purge script execution', {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
