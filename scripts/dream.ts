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
import { createDreamInference } from '../src/3_llmunix_memory/dream_inference';
import { StrategyStore } from '../src/3_llmunix_memory/strategy_store';
import {
  HierarchyLevel,
  TraceOutcome,
  type Strategy,
  type NegativeConstraint,
  type DreamJournalEntry,
} from '../src/3_llmunix_memory/trace_types';
import type { InferenceFunction } from '../src/2_qwen_cerebellum/inference';

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
const SEQUENCE_TIME_WINDOW_MS = 30_000; // 30 seconds

// =============================================================================
// Types
// =============================================================================

interface ParsedTrace {
  timestamp: string;
  traceId: string | null;
  level: HierarchyLevel | null;
  parentTraceId: string | null;
  goal: string;
  outcome: TraceOutcome;
  outcomeReason: string | null;
  durationMs: number | null;
  confidence: number | null;
  strategyId: string | null;
  bytecodes: Array<{ vlmOutput: string; bytecodeHex: string }>;
}

interface TraceSequence {
  traces: ParsedTrace[];
  goal: string;
  outcome: TraceOutcome;
  score: number;
  level: HierarchyLevel;
}

// =============================================================================
// LLM Prompts
// =============================================================================

const FAILURE_ANALYSIS_SYSTEM = `You are analyzing a failed robot trace sequence. The robot attempted a goal and failed.

Extract a concise negative constraint — something the robot should AVOID doing in similar situations.

Output ONLY valid JSON (no markdown, no explanation):
{
  "description": "Do not attempt tight turns in narrow corridors",
  "context": "narrow corridor navigation",
  "severity": "high"
}`;

const STRATEGY_ABSTRACTION_SYSTEM = `You are abstracting successful robot traces into a reusable strategy.

Given a set of successful trace summaries at a specific hierarchy level, create a general-purpose strategy that captures the common pattern.

Output ONLY valid JSON (no markdown, no explanation):
{
  "title": "Wall Following",
  "trigger_goals": ["follow wall", "navigate corridor", "find door"],
  "preconditions": ["camera active", "near wall"],
  "steps": ["Detect wall on one side", "Maintain parallel distance using differential speed", "Turn at wall corners"],
  "negative_constraints": ["Do not hug wall too closely"]
}`;

const STRATEGY_MERGE_SYSTEM = `You receive an existing robot strategy and new evidence from recent traces. Produce an updated version that incorporates the new evidence.

Keep the same ID and structure. Update steps, confidence hints, and trigger_goals as needed.

Output ONLY valid JSON (no markdown, no explanation):
{
  "title": "Updated Strategy Title",
  "trigger_goals": ["updated", "goals"],
  "preconditions": ["updated preconditions"],
  "steps": ["Updated step 1", "Updated step 2"],
  "negative_constraints": ["Updated constraint"]
}`;

const DREAM_SUMMARY_SYSTEM = `Write a 2-3 sentence dream journal entry summarizing what the robot learned during this consolidation session.

Be specific about what strategies were created or updated and what failures were analyzed.

Output ONLY the summary text (no JSON, no markdown headers).`;

// =============================================================================
// Trace Parsing
// =============================================================================

function parseTraceFiles(afterTimestamp?: string): ParsedTrace[] {
  if (!fs.existsSync(TRACES_DIR)) {
    console.log('No traces directory found.');
    return [];
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - TRACE_WINDOW_DAYS);

  const files = fs.readdirSync(TRACES_DIR)
    .filter(f => f.startsWith('trace_') && f.endsWith('.md'))
    .sort();

  if (files.length === 0) {
    console.log('No trace files found.');
    return [];
  }

  console.log(`Found ${files.length} trace file(s)`);
  const entries: ParsedTrace[] = [];

  for (const file of files) {
    // Filter by date from filename
    const dateMatch = file.match(/trace_(\d{4}-\d{2}-\d{2})\.md/);
    if (dateMatch) {
      const fileDate = new Date(dateMatch[1]);
      if (fileDate < cutoffDate) continue;
    }

    const content = fs.readFileSync(path.join(TRACES_DIR, file), 'utf-8');
    const blocks = content.split('---').filter(b => b.trim());

    for (const block of blocks) {
      const timestampMatch = block.match(/### Time:\s*(.+)/);
      const goalMatch = block.match(/\*\*Goal:\*\*\s*(.+)/);
      if (!timestampMatch || !goalMatch) continue;

      const timestamp = timestampMatch[1].trim();

      // Skip if before last dream
      if (afterTimestamp && timestamp <= afterTimestamp) continue;

      // Parse v2 fields (optional)
      const traceIdMatch = block.match(/\*\*Trace ID:\*\*\s*(.+)/);
      const levelMatch = block.match(/\*\*Level:\*\*\s*(\d+)/);
      const parentMatch = block.match(/\*\*Parent:\*\*\s*(.+)/);
      const outcomeMatch = block.match(/\*\*Outcome:\*\*\s*(.+)/);
      const reasonMatch = block.match(/\*\*Reason:\*\*\s*(.+)/);
      const durationMatch = block.match(/\*\*Duration:\*\*\s*(\d+)/);
      const confidenceMatch = block.match(/\*\*Confidence:\*\*\s*([\d.]+)/);
      const strategyMatch = block.match(/\*\*Strategy:\*\*\s*(.+)/);

      // Parse bytecodes (v1 + v2 format)
      const bytecodes: Array<{ vlmOutput: string; bytecodeHex: string }> = [];
      const vlmMatches = block.matchAll(/\*\*VLM Reasoning:\*\*\s*(.+)/g);
      const bcMatches = block.matchAll(/\*\*Compiled Bytecode:\*\*\s*`(.+?)`/g);

      const vlmArr = [...vlmMatches].map(m => m[1].trim());
      const bcArr = [...bcMatches].map(m => m[1].trim());

      for (let i = 0; i < Math.max(vlmArr.length, bcArr.length); i++) {
        bytecodes.push({
          vlmOutput: vlmArr[i] || '',
          bytecodeHex: bcArr[i] || '',
        });
      }

      const outcomeStr = outcomeMatch ? outcomeMatch[1].trim() : 'UNKNOWN';
      const outcome = (Object.values(TraceOutcome) as string[]).includes(outcomeStr)
        ? outcomeStr as TraceOutcome
        : TraceOutcome.UNKNOWN;

      entries.push({
        timestamp,
        traceId: traceIdMatch ? traceIdMatch[1].trim() : null,
        level: levelMatch ? parseInt(levelMatch[1], 10) as HierarchyLevel : null,
        parentTraceId: parentMatch ? parentMatch[1].trim() : null,
        goal: goalMatch[1].trim(),
        outcome,
        outcomeReason: reasonMatch ? reasonMatch[1].trim() : null,
        durationMs: durationMatch ? parseInt(durationMatch[1], 10) : null,
        confidence: confidenceMatch ? parseFloat(confidenceMatch[1]) : null,
        strategyId: strategyMatch ? strategyMatch[1].trim() : null,
        bytecodes,
      });
    }
  }

  console.log(`Parsed ${entries.length} trace entries`);
  return entries;
}

// =============================================================================
// Sequence Grouping
// =============================================================================

function groupIntoSequences(traces: ParsedTrace[]): TraceSequence[] {
  const sequences: TraceSequence[] = [];

  // Group by parentTraceId if available (v2 hierarchical traces)
  const parentGroups = new Map<string, ParsedTrace[]>();
  const ungrouped: ParsedTrace[] = [];

  for (const trace of traces) {
    if (trace.parentTraceId) {
      const group = parentGroups.get(trace.parentTraceId) ?? [];
      group.push(trace);
      parentGroups.set(trace.parentTraceId, group);
    } else {
      ungrouped.push(trace);
    }
  }

  // Convert parent groups to sequences
  for (const [, group] of parentGroups) {
    const sorted = group.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const hasFailure = sorted.some(t => t.outcome === TraceOutcome.FAILURE);
    sequences.push({
      traces: sorted,
      goal: sorted[0].goal,
      outcome: hasFailure ? TraceOutcome.FAILURE : TraceOutcome.SUCCESS,
      score: 0,
      level: sorted[0].level ?? HierarchyLevel.REACTIVE,
    });
  }

  // Group ungrouped by goal + time proximity
  const sortedUngrouped = ungrouped.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  let currentGroup: ParsedTrace[] = [];
  let currentGoal = '';

  for (const trace of sortedUngrouped) {
    const isNewGroup = currentGroup.length === 0
      || trace.goal !== currentGoal
      || (new Date(trace.timestamp).getTime() - new Date(currentGroup[currentGroup.length - 1].timestamp).getTime()) > SEQUENCE_TIME_WINDOW_MS;

    if (isNewGroup && currentGroup.length > 0) {
      const hasFailure = currentGroup.some(t => t.outcome === TraceOutcome.FAILURE);
      sequences.push({
        traces: currentGroup,
        goal: currentGoal,
        outcome: hasFailure ? TraceOutcome.FAILURE : (
          currentGroup.some(t => t.outcome === TraceOutcome.SUCCESS) ? TraceOutcome.SUCCESS : TraceOutcome.UNKNOWN
        ),
        score: 0,
        level: currentGroup[0].level ?? HierarchyLevel.REACTIVE,
      });
      currentGroup = [];
    }

    currentGroup.push(trace);
    currentGoal = trace.goal;
  }

  // Flush last group
  if (currentGroup.length > 0) {
    const hasFailure = currentGroup.some(t => t.outcome === TraceOutcome.FAILURE);
    sequences.push({
      traces: currentGroup,
      goal: currentGoal,
      outcome: hasFailure ? TraceOutcome.FAILURE : TraceOutcome.UNKNOWN,
      score: 0,
      level: currentGroup[0].level ?? HierarchyLevel.REACTIVE,
    });
  }

  return sequences;
}

// =============================================================================
// Scoring
// =============================================================================

function scoreSequences(sequences: TraceSequence[]): TraceSequence[] {
  const now = Date.now();

  for (const seq of sequences) {
    const avgConfidence = seq.traces
      .filter(t => t.confidence !== null)
      .reduce((sum, t) => sum + (t.confidence ?? 0), 0) /
      Math.max(1, seq.traces.filter(t => t.confidence !== null).length) || 0.5;

    const outcomeWeight = seq.outcome === TraceOutcome.SUCCESS ? 1.0
      : seq.outcome === TraceOutcome.FAILURE ? 0.8 // Failures are also valuable
      : seq.outcome === TraceOutcome.PARTIAL ? 0.6
      : 0.3;

    const age = now - new Date(seq.traces[0].timestamp).getTime();
    const recencyBonus = Math.max(0.1, 1.0 - (age / (TRACE_WINDOW_DAYS * 86400_000)));

    const totalDuration = seq.traces.reduce((sum, t) => sum + (t.durationMs ?? 1000), 0);
    const durationPenalty = Math.max(1, totalDuration / 10_000); // Normalize by 10s

    seq.score = (avgConfidence * outcomeWeight * recencyBonus) / durationPenalty;
  }

  return sequences.sort((a, b) => b.score - a.score);
}

// =============================================================================
// RLE compression for long bytecode sequences
// =============================================================================

function compressBytecodes(bytecodes: Array<{ vlmOutput: string; bytecodeHex: string }>): string {
  if (bytecodes.length === 0) return '(no bytecodes)';
  if (bytecodes.length <= 5) {
    return bytecodes.map(bc => `${bc.bytecodeHex}: ${bc.vlmOutput.slice(0, 50)}`).join('\n');
  }

  // RLE compress: group consecutive identical opcodes
  const compressed: string[] = [];
  let prevOpcode = '';
  let count = 0;

  for (const bc of bytecodes) {
    const opcode = bc.bytecodeHex.split(' ')[1] || '??'; // Byte index 1 = opcode
    if (opcode === prevOpcode) {
      count++;
    } else {
      if (count > 0) {
        compressed.push(`${prevOpcode} x${count}`);
      }
      prevOpcode = opcode;
      count = 1;
    }
  }
  if (count > 0) {
    compressed.push(`${prevOpcode} x${count}`);
  }

  return `${bytecodes.length} commands: ${compressed.join(' → ')}`;
}

function summarizeSequence(seq: TraceSequence): string {
  const lines = [
    `Goal: ${seq.goal}`,
    `Outcome: ${seq.outcome}`,
    `Level: ${seq.level}`,
    `Traces: ${seq.traces.length}`,
  ];

  const allBytecodes = seq.traces.flatMap(t => t.bytecodes);
  lines.push(`Commands: ${compressBytecodes(allBytecodes)}`);

  if (seq.traces[0].outcomeReason) {
    lines.push(`Reason: ${seq.traces[0].outcomeReason}`);
  }

  return lines.join('\n');
}

// =============================================================================
// JSON Parsing
// =============================================================================

function extractJSON(text: string): string {
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/gm, '').replace(/\n?```\s*$/gm, '').trim();
  const start = cleaned.indexOf('{');
  if (start < 0) return cleaned;
  let depth = 0;
  for (let i = start; i < cleaned.length; i++) {
    if (cleaned[i] === '{') depth++;
    if (cleaned[i] === '}') depth--;
    if (depth === 0) return cleaned.slice(start, i + 1);
  }
  return cleaned.slice(start);
}

function parseJSONSafe<T>(text: string): T | null {
  try {
    return JSON.parse(extractJSON(text)) as T;
  } catch {
    return null;
  }
}

// =============================================================================
// Phase 1 — Slow Wave Sleep (Replay & Pruning)
// =============================================================================

async function slowWaveSleep(
  sequences: TraceSequence[],
  infer: InferenceFunction,
): Promise<{ failureConstraints: NegativeConstraint[]; prunedCount: number }> {
  console.log('\n=== Phase 1: Slow Wave Sleep (Replay & Pruning) ===\n');

  const failureConstraints: NegativeConstraint[] = [];
  let prunedCount = 0;

  // Process failure sequences
  const failures = sequences.filter(s => s.outcome === TraceOutcome.FAILURE);
  console.log(`Analyzing ${failures.length} failure sequence(s)...`);

  for (const seq of failures.slice(0, TRACE_BATCH_SIZE)) {
    const summary = summarizeSequence(seq);
    const prompt = `Failed robot trace:\n\n${summary}\n\nWhat should the robot avoid doing in similar situations?`;

    try {
      const response = await infer(FAILURE_ANALYSIS_SYSTEM, prompt);
      const parsed = parseJSONSafe<{ description: string; context: string; severity: string }>(response);

      if (parsed) {
        const constraint: NegativeConstraint = {
          description: parsed.description,
          context: parsed.context || 'general',
          severity: (parsed.severity || 'medium') as 'low' | 'medium' | 'high',
          learnedFrom: seq.traces.filter(t => t.traceId).map(t => t.traceId!),
        };
        failureConstraints.push(constraint);
        console.log(`  Learned: "${constraint.description}" (${constraint.severity})`);
      }
    } catch (err) {
      console.error(`  Failed to analyze sequence: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Prune low-score sequences (below 0.1 threshold)
  for (const seq of sequences) {
    if (seq.score < 0.1 && seq.outcome !== TraceOutcome.FAILURE) {
      prunedCount++;
    }
  }

  console.log(`Pruned ${prunedCount} low-value sequence(s)`);
  return { failureConstraints, prunedCount };
}

// =============================================================================
// Phase 2 — REM Sleep (Strategy Abstraction)
// =============================================================================

async function remSleep(
  sequences: TraceSequence[],
  infer: InferenceFunction,
  store: StrategyStore,
): Promise<{ created: Strategy[]; updated: Strategy[] }> {
  console.log('\n=== Phase 2: REM Sleep (Strategy Abstraction) ===\n');

  const created: Strategy[] = [];
  const updated: Strategy[] = [];

  // Group successful sequences by hierarchy level
  const successByLevel = new Map<HierarchyLevel, TraceSequence[]>();
  for (const seq of sequences) {
    if (seq.outcome !== TraceOutcome.SUCCESS && seq.outcome !== TraceOutcome.UNKNOWN) continue;
    if (seq.score < 0.1) continue;

    const group = successByLevel.get(seq.level) ?? [];
    group.push(seq);
    successByLevel.set(seq.level, group);
  }

  for (const [level, seqs] of successByLevel) {
    console.log(`Processing ${seqs.length} sequence(s) at Level ${level}...`);

    for (const seq of seqs.slice(0, TRACE_BATCH_SIZE)) {
      const summary = summarizeSequence(seq);

      // Check for existing matching strategy
      const existing = store.findStrategies(seq.goal, level);
      const bestMatch = existing.length > 0 ? existing[0] : null;

      if (bestMatch) {
        // Merge with existing strategy
        const prompt = [
          `Existing strategy:`,
          `  Title: ${bestMatch.title}`,
          `  Steps: ${bestMatch.steps.join(' → ')}`,
          `  Trigger goals: ${bestMatch.triggerGoals.join(', ')}`,
          '',
          `New trace evidence:`,
          summary,
          '',
          'Update the strategy to incorporate this new evidence.',
        ].join('\n');

        try {
          const response = await infer(STRATEGY_MERGE_SYSTEM, prompt);
          const parsed = parseJSONSafe<{
            title: string;
            trigger_goals: string[];
            preconditions: string[];
            steps: string[];
            negative_constraints: string[];
          }>(response);

          if (parsed) {
            const mergedStrategy: Strategy = {
              ...bestMatch,
              version: bestMatch.version + 1,
              title: parsed.title || bestMatch.title,
              triggerGoals: parsed.trigger_goals || bestMatch.triggerGoals,
              preconditions: parsed.preconditions || bestMatch.preconditions,
              steps: parsed.steps || bestMatch.steps,
              negativeConstraints: parsed.negative_constraints || bestMatch.negativeConstraints,
              successCount: bestMatch.successCount + 1,
              confidence: Math.min(1.0, bestMatch.confidence + 0.05),
              sourceTraceIds: [
                ...bestMatch.sourceTraceIds,
                ...seq.traces.filter(t => t.traceId).map(t => t.traceId!),
              ].slice(-20), // Keep last 20
            };
            updated.push(mergedStrategy);
            console.log(`  Updated: "${mergedStrategy.title}" (v${mergedStrategy.version})`);
          }
        } catch (err) {
          console.error(`  Failed to merge strategy: ${err instanceof Error ? err.message : String(err)}`);
        }
      } else {
        // Create new strategy
        const prompt = `Successful robot trace at Level ${level}:\n\n${summary}\n\nAbstract this into a reusable strategy.`;

        try {
          const response = await infer(STRATEGY_ABSTRACTION_SYSTEM, prompt);
          const parsed = parseJSONSafe<{
            title: string;
            trigger_goals: string[];
            preconditions: string[];
            steps: string[];
            negative_constraints: string[];
          }>(response);

          if (parsed && parsed.title && parsed.steps) {
            const slug = parsed.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
            const newStrategy: Strategy = {
              id: `strat_${level}_${slug}`,
              version: 1,
              hierarchyLevel: level,
              title: parsed.title,
              preconditions: parsed.preconditions || [],
              triggerGoals: parsed.trigger_goals || [],
              steps: parsed.steps,
              negativeConstraints: parsed.negative_constraints || [],
              confidence: 0.5, // New strategies start at moderate confidence
              successCount: 1,
              failureCount: 0,
              sourceTraceIds: seq.traces.filter(t => t.traceId).map(t => t.traceId!),
              deprecated: false,
            };
            created.push(newStrategy);
            console.log(`  Created: "${newStrategy.title}" (${newStrategy.id})`);
          }
        } catch (err) {
          console.error(`  Failed to create strategy: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
  }

  // Check for high-failure strategies to deprecate
  for (const level of [HierarchyLevel.GOAL, HierarchyLevel.STRATEGY, HierarchyLevel.TACTICAL, HierarchyLevel.REACTIVE]) {
    const strategies = store.getStrategiesForLevel(level);
    for (const strat of strategies) {
      if (strat.failureCount > 3 && strat.failureCount > strat.successCount * 2) {
        strat.deprecated = true;
        store.saveStrategy(strat);
        console.log(`  Deprecated: "${strat.title}" (${strat.failureCount} failures)`);
      }
    }
  }

  return { created, updated };
}

// =============================================================================
// Phase 3 — Consolidation
// =============================================================================

async function consolidate(
  infer: InferenceFunction,
  store: StrategyStore,
  failureConstraints: NegativeConstraint[],
  created: Strategy[],
  updated: Strategy[],
  totalTraces: number,
  prunedCount: number,
): Promise<void> {
  console.log('\n=== Phase 3: Consolidation ===\n');

  // Write new strategies
  for (const strategy of created) {
    store.saveStrategy(strategy);
    console.log(`  Wrote: ${strategy.id}`);
  }

  // Update existing strategies
  for (const strategy of updated) {
    store.saveStrategy(strategy);
    console.log(`  Updated: ${strategy.id}`);
  }

  // Write negative constraints
  for (const constraint of failureConstraints) {
    store.saveNegativeConstraint(constraint);
  }
  if (failureConstraints.length > 0) {
    console.log(`  Wrote ${failureConstraints.length} negative constraint(s)`);
  }

  // Generate dream journal entry
  const journalPrompt = [
    `Dream session results:`,
    `- Traces processed: ${totalTraces}`,
    `- New strategies: ${created.map(s => s.title).join(', ') || 'none'}`,
    `- Updated strategies: ${updated.map(s => s.title).join(', ') || 'none'}`,
    `- Failure constraints: ${failureConstraints.map(c => c.description).join(', ') || 'none'}`,
    `- Traces pruned: ${prunedCount}`,
  ].join('\n');

  let summary = `Processed ${totalTraces} traces. Created ${created.length} strategies, updated ${updated.length}. Learned ${failureConstraints.length} constraints.`;
  try {
    summary = await infer(DREAM_SUMMARY_SYSTEM, journalPrompt);
  } catch {
    // Keep default summary
  }

  const journalEntry: DreamJournalEntry = {
    timestamp: new Date().toISOString(),
    tracesProcessed: totalTraces,
    strategiesCreated: created.length,
    strategiesUpdated: updated.length,
    constraintsLearned: failureConstraints.length,
    tracesPruned: prunedCount,
    summary: summary.trim(),
  };

  store.appendDreamJournal(journalEntry);
  console.log(`\nDream journal: ${journalEntry.summary}`);

  // Delete old trace files
  const deletedCount = pruneOldTraces();
  if (deletedCount > 0) {
    console.log(`Deleted ${deletedCount} trace file(s) older than ${TRACE_RETENTION_DAYS} days`);
  }
}

function pruneOldTraces(): number {
  if (!fs.existsSync(TRACES_DIR)) return 0;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - TRACE_RETENTION_DAYS);
  let deleted = 0;

  const files = fs.readdirSync(TRACES_DIR)
    .filter(f => f.startsWith('trace_') && f.endsWith('.md'));

  for (const file of files) {
    const dateMatch = file.match(/trace_(\d{4}-\d{2}-\d{2})\.md/);
    if (dateMatch) {
      const fileDate = new Date(dateMatch[1]);
      if (fileDate < cutoff) {
        fs.unlinkSync(path.join(TRACES_DIR, file));
        deleted++;
      }
    }
  }

  return deleted;
}

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

  // 1. Parse traces
  const lastDream = store.getLastDreamTimestamp();
  if (lastDream) {
    console.log(`Last dream session: ${lastDream}`);
  }

  const traces = parseTraceFiles(lastDream ?? undefined);
  if (traces.length === 0) {
    console.log('\nNo new traces to dream about.');
    installSeeds();
    console.log('Go explore first, then dream again!');
    return;
  }

  // 2. Group into sequences
  const sequences = groupIntoSequences(traces);
  console.log(`Grouped into ${sequences.length} sequence(s)`);

  // 3. Score sequences
  const scored = scoreSequences(sequences);
  console.log(`Top sequences: ${scored.slice(0, 5).map(s => `${s.goal} (${s.score.toFixed(2)})`).join(', ')}`);

  // 4. Phase 1 — Slow Wave Sleep
  const { failureConstraints, prunedCount } = await slowWaveSleep(scored, infer);

  // 5. Phase 2 — REM Sleep
  const { created, updated } = await remSleep(scored, infer, store);

  // 6. Phase 3 — Consolidation
  await consolidate(infer, store, failureConstraints, created, updated, traces.length, prunedCount);

  console.log('\n=== Dream complete! ===');
}

main().catch(err => {
  console.error('Dream engine error:', err);
  process.exit(1);
});
