/**
 * RoClaw Dreaming Engine v2 — LLM-Powered Memory Consolidation
 *
 * Three biological sleep phases modeled on SHY + Active Systems Consolidation:
 *
 * Phase 1 — Slow Wave Sleep (Replay & Pruning):
 *   Read traces, group into sequences, score, extract failure constraints.
 *
 * Phase 2 — REM Sleep (Strategy Abstraction):
 *   Summarize successful traces, create/merge strategies via LLM.
 *
 * Phase 3 — Consolidation:
 *   Write strategies to disk, append journal, prune old traces.
 *
 * Usage: npm run dream
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { DreamEngine } from '../src/llmunix-core/dream_engine';
import { StrategyStore } from '../src/3_llmunix_memory/strategy_store';
import { createDreamInference } from '../src/3_llmunix_memory/dream_inference';
import { roClawDreamAdapter } from '../src/3_llmunix_memory/roclaw_dream_adapter';

dotenv.config();

// =============================================================================
// Configuration
// =============================================================================

const TRACES_DIR = path.join(__dirname, '..', 'src', '3_llmunix_memory', 'traces');
const STRATEGIES_DIR = path.join(__dirname, '..', 'src', '3_llmunix_memory', 'strategies');
const SEEDS_DIR = path.join(STRATEGIES_DIR, '_seeds');

const TRACE_BATCH_SIZE = parseInt(process.env.DREAM_BATCH_SIZE || '10', 10);
const TRACE_WINDOW_DAYS = parseInt(process.env.DREAM_WINDOW_DAYS || '7', 10);
const TRACE_RETENTION_DAYS = parseInt(process.env.DREAM_RETENTION_DAYS || '7', 10);

// =============================================================================
// Seed Installation
// =============================================================================

function installSeeds(): boolean {
  if (!fs.existsSync(SEEDS_DIR)) return false;

  const seeds = fs.readdirSync(SEEDS_DIR).filter(f => f.endsWith('.md'));
  if (seeds.length === 0) return false;

  console.log(`Found ${seeds.length} seed strateg${seeds.length === 1 ? 'y' : 'ies'} in ${SEEDS_DIR}`);
  return true;
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  console.log('=== RoClaw Dreaming Engine v2 ===\n');

  const store = new StrategyStore(STRATEGIES_DIR);

  // Check for API key
  const apiKey = process.env.OPENROUTER_API_KEY || '';
  if (!apiKey && !process.env.LOCAL_INFERENCE_URL) {
    console.log('No API key or local inference URL configured.');
    console.log('Set OPENROUTER_API_KEY or LOCAL_INFERENCE_URL in .env');
    console.log('\nInstalling seed strategies only...');

    // Ensure directory structure exists
    for (const dir of ['level_1_goals', 'level_2_routes', 'level_3_tactical', 'level_4_motor', '_seeds']) {
      const fullPath = path.join(STRATEGIES_DIR, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    }
    // Create files if missing
    for (const file of ['_negative_constraints.md', '_dream_journal.md']) {
      const fullPath = path.join(STRATEGIES_DIR, file);
      if (!fs.existsSync(fullPath)) {
        fs.writeFileSync(fullPath, `# ${file.replace(/[_-]/g, ' ').replace('.md', '')}\n`);
      }
    }

    installSeeds();
    console.log('\nDone! Seed strategies are ready. Run the robot to generate traces, then dream again.');
    return;
  }

  const infer = createDreamInference({ apiKey });

  // Create dream engine with RoClaw adapter
  const engine = new DreamEngine({
    adapter: roClawDreamAdapter,
    infer,
    store,
    tracesDir: TRACES_DIR,
    config: {
      traceBatchSize: TRACE_BATCH_SIZE,
      traceWindowDays: TRACE_WINDOW_DAYS,
      traceRetentionDays: TRACE_RETENTION_DAYS,
    },
  });

  // Check for new traces
  const lastDream = store.getLastDreamTimestamp();
  const traces = engine.parseTraceFiles(lastDream ?? undefined);
  if (traces.length === 0) {
    console.log('\nNo new traces to dream about.');
    installSeeds();
    console.log('Go explore first, then dream again!');
    return;
  }

  // Run the full dream cycle
  await engine.dream();
}

main().catch(err => {
  console.error('Dream engine error:', err);
  process.exit(1);
});
