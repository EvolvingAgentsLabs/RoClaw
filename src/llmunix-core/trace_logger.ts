/**
 * LLMunix Core — Hierarchical Trace Logger
 *
 * Records execution traces to markdown files. Generic: uses ActionEntry
 * instead of BytecodeEntry. No Buffer type, no formatHex dependency.
 *
 * Domain adapters can extend this to add domain-specific append methods.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  HierarchyLevel,
  TraceOutcome,
  TraceSource,
  type HierarchicalTraceEntry,
  type ActionEntry,
} from './types';

// =============================================================================
// Helpers
// =============================================================================

function generateTraceId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `tr_${ts}_${rand}`;
}

// =============================================================================
// Start Trace Options
// =============================================================================

export interface StartTraceOptions {
  parentTraceId?: string;
  locationNode?: string;
  sceneDescription?: string;
  activeStrategyId?: string;
  /** Where this trace originates (real robot, 3D sim, dream, etc.) */
  source?: TraceSource;
}

// =============================================================================
// HierarchicalTraceLogger
// =============================================================================

export class HierarchicalTraceLogger {
  private activeTraces = new Map<string, HierarchicalTraceEntry>();
  protected tracesDir: string;

  constructor(tracesDir: string) {
    this.tracesDir = tracesDir;
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
      source: opts?.source ?? TraceSource.UNKNOWN_SOURCE,
      outcome: TraceOutcome.UNKNOWN,
      outcomeReason: null,
      durationMs: null,
      confidence: null,
      actionEntries: [],
    };

    this.activeTraces.set(traceId, entry);
    return traceId;
  }

  /**
   * Append a generic action entry to an active trace.
   */
  appendAction(traceId: string, reasoning: string, actionPayload: string): void {
    const entry = this.activeTraces.get(traceId);
    if (!entry) {
      console.warn(`[TraceLogger] appendAction: unknown trace ${traceId}`);
      return;
    }

    entry.actionEntries.push({
      timestamp: new Date().toISOString(),
      reasoning: reasoning.trim(),
      actionPayload,
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
      console.warn(`[TraceLogger] endTrace: unknown trace ${traceId}`);
      return;
    }

    entry.outcome = outcome;
    entry.outcomeReason = reason ?? null;
    entry.confidence = confidence ?? null;
    entry.durationMs = Date.now() - new Date(entry.timestamp).getTime();

    this.writeTrace(entry);
    this.activeTraces.delete(traceId);
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
  // Protected — Disk I/O (overridable by subclasses)
  // ---------------------------------------------------------------------------

  protected writeTrace(entry: HierarchicalTraceEntry): void {
    const date = entry.timestamp.split('T')[0];
    const tracePath = path.join(this.tracesDir, `trace_${date}.md`);

    if (!fs.existsSync(this.tracesDir)) {
      fs.mkdirSync(this.tracesDir, { recursive: true });
    }

    if (!fs.existsSync(tracePath)) {
      fs.writeFileSync(tracePath, `# Execution Traces: ${date}\n\n`);
    }

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
    if (entry.source && entry.source !== TraceSource.UNKNOWN_SOURCE) {
      lines.push(`**Source:** ${entry.source}`);
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

    for (const action of entry.actionEntries) {
      lines.push(`**Reasoning:** ${action.reasoning}`);
      lines.push(`**Action:** \`${action.actionPayload}\``);
    }

    lines.push('---');
    lines.push('');

    fs.appendFileSync(tracePath, lines.join('\n'));
  }
}
