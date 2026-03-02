/**
 * RoClaw Trace Logger — Records physical experiences to markdown
 *
 * Writes execution traces to the traces/ directory so the LLMunix
 * Dreaming Engine can review and promote patterns to skills.
 *
 * v2: Adds HierarchicalTraceLogger with hierarchy-aware trace entries.
 * The original appendTrace() is preserved as a backward-compat wrapper.
 */

import * as fs from 'fs';
import * as path from 'path';
import { formatHex } from '../2_qwen_cerebellum/bytecode_compiler';
import { logger } from '../shared/logger';
import {
  HierarchyLevel,
  TraceOutcome,
  type HierarchicalTraceEntry,
  type BytecodeEntry,
} from './trace_types';

const TRACES_DIR = path.join(__dirname, 'traces');

// =============================================================================
// Legacy v1 API (backward-compatible)
// =============================================================================

/**
 * Append a trace entry to today's trace file (v1 format).
 */
export function appendTrace(goal: string, vlmOutput: string, bytecode: Buffer): void {
  const date = new Date().toISOString().split('T')[0];
  const tracePath = path.join(TRACES_DIR, `trace_${date}.md`);

  const entry = `
### Time: ${new Date().toISOString()}
**Goal:** ${goal}
**VLM Reasoning:** ${vlmOutput.trim()}
**Compiled Bytecode:** \`${formatHex(bytecode)}\`
---
`;

  if (!fs.existsSync(TRACES_DIR)) {
    fs.mkdirSync(TRACES_DIR, { recursive: true });
  }

  if (!fs.existsSync(tracePath)) {
    fs.writeFileSync(tracePath, `# Execution Traces: ${date}\n\n`);
  }

  fs.appendFileSync(tracePath, entry);
}

// =============================================================================
// v2: Hierarchical Trace Logger
// =============================================================================

function generateTraceId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `tr_${ts}_${rand}`;
}

export interface StartTraceOptions {
  parentTraceId?: string;
  locationNode?: string;
  sceneDescription?: string;
  activeStrategyId?: string;
}

export class HierarchicalTraceLogger {
  private activeTraces = new Map<string, HierarchicalTraceEntry>();
  private tracesDir: string;

  constructor(tracesDir?: string) {
    this.tracesDir = tracesDir ?? TRACES_DIR;
  }

  /**
   * Start a new hierarchical trace. Returns the trace ID.
   */
  startTrace(
    level: HierarchyLevel,
    goal: string,
    opts?: StartTraceOptions,
  ): string {
    const traceId = generateTraceId();

    const entry: HierarchicalTraceEntry = {
      traceId,
      hierarchyLevel: level,
      parentTraceId: opts?.parentTraceId ?? null,
      timestamp: new Date().toISOString(),
      goal,
      locationNode: opts?.locationNode ?? null,
      sceneDescription: opts?.sceneDescription ?? null,
      activeStrategyId: opts?.activeStrategyId ?? null,
      outcome: TraceOutcome.UNKNOWN,
      outcomeReason: null,
      durationMs: null,
      confidence: null,
      bytecodeEntries: [],
    };

    this.activeTraces.set(traceId, entry);
    logger.debug('TraceLogger', `Started trace ${traceId} (L${level}): ${goal}`);
    return traceId;
  }

  /**
   * Append a bytecode entry to an active trace.
   */
  appendBytecode(traceId: string, vlmOutput: string, bytecode: Buffer): void {
    const entry = this.activeTraces.get(traceId);
    if (!entry) {
      logger.warn('TraceLogger', `appendBytecode: unknown trace ${traceId}, falling back to legacy`);
      appendTrace('(unknown trace)', vlmOutput, bytecode);
      return;
    }

    entry.bytecodeEntries.push({
      timestamp: new Date().toISOString(),
      vlmOutput: vlmOutput.trim(),
      bytecodeHex: formatHex(bytecode),
    });
  }

  /**
   * End a trace with an outcome. Writes it to disk and removes from active map.
   */
  endTrace(
    traceId: string,
    outcome: TraceOutcome,
    reason?: string,
    confidence?: number,
  ): void {
    const entry = this.activeTraces.get(traceId);
    if (!entry) {
      logger.warn('TraceLogger', `endTrace: unknown trace ${traceId}`);
      return;
    }

    entry.outcome = outcome;
    entry.outcomeReason = reason ?? null;
    entry.confidence = confidence ?? null;
    entry.durationMs = Date.now() - new Date(entry.timestamp).getTime();

    this.writeTrace(entry);
    this.activeTraces.delete(traceId);
    logger.debug('TraceLogger', `Ended trace ${traceId}: ${outcome} (${entry.durationMs}ms)`);
  }

  /**
   * Legacy wrapper: append a single bytecode as a self-contained reactive trace.
   */
  appendTraceLegacy(goal: string, vlmOutput: string, bytecode: Buffer): void {
    appendTrace(goal, vlmOutput, bytecode);
  }

  /**
   * Get an active trace entry (for inspection/testing).
   */
  getActiveTrace(traceId: string): HierarchicalTraceEntry | undefined {
    return this.activeTraces.get(traceId);
  }

  /**
   * Get count of active (unclosed) traces.
   */
  getActiveTraceCount(): number {
    return this.activeTraces.size;
  }

  // ---------------------------------------------------------------------------
  // Private — Disk I/O
  // ---------------------------------------------------------------------------

  private writeTrace(entry: HierarchicalTraceEntry): void {
    const date = entry.timestamp.split('T')[0];
    const tracePath = path.join(this.tracesDir, `trace_${date}.md`);

    if (!fs.existsSync(this.tracesDir)) {
      fs.mkdirSync(this.tracesDir, { recursive: true });
    }

    if (!fs.existsSync(tracePath)) {
      fs.writeFileSync(tracePath, `# Execution Traces: ${date}\n\n`);
    }

    // v2 format — includes optional fields that old parsers skip
    const lines: string[] = [
      '',
      `### Time: ${entry.timestamp}`,
      `**Trace ID:** ${entry.traceId}`,
      `**Level:** ${entry.hierarchyLevel}`,
    ];

    if (entry.parentTraceId) {
      lines.push(`**Parent:** ${entry.parentTraceId}`);
    }

    lines.push(`**Goal:** ${entry.goal}`);

    if (entry.locationNode) {
      lines.push(`**Location:** ${entry.locationNode}`);
    }
    if (entry.sceneDescription) {
      lines.push(`**Scene:** ${entry.sceneDescription}`);
    }
    if (entry.activeStrategyId) {
      lines.push(`**Strategy:** ${entry.activeStrategyId}`);
    }

    lines.push(`**Outcome:** ${entry.outcome}`);

    if (entry.outcomeReason) {
      lines.push(`**Reason:** ${entry.outcomeReason}`);
    }
    if (entry.durationMs !== null) {
      lines.push(`**Duration:** ${entry.durationMs}ms`);
    }
    if (entry.confidence !== null) {
      lines.push(`**Confidence:** ${entry.confidence}`);
    }

    // Write bytecode entries
    for (const bc of entry.bytecodeEntries) {
      lines.push(`**VLM Reasoning:** ${bc.vlmOutput}`);
      lines.push(`**Compiled Bytecode:** \`${bc.bytecodeHex}\``);
    }

    lines.push('---');
    lines.push('');

    fs.appendFileSync(tracePath, lines.join('\n'));
  }
}

// =============================================================================
// Singleton for shared use
// =============================================================================

export const traceLogger = new HierarchicalTraceLogger();
