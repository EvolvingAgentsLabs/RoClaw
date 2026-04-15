/**
 * LLMunix Core — Generic Hierarchical Trace Logger
 *
 * Records hierarchical execution traces to markdown files.
 * Domain-agnostic: uses generic field names (Reasoning, Action).
 * Domain-specific subclasses (e.g., RoClaw) can override writeTrace
 * to customize field names and formatting.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  HierarchyLevel,
  TraceOutcome,
  TraceSource,
  type HierarchicalTraceEntry,
} from './types';

// =============================================================================
// Types
// =============================================================================

export interface StartTraceOptions {
  parentTraceId?: string;
  locationNode?: string;
  sceneDescription?: string;
  activeStrategyId?: string;
  source?: TraceSource;
}

// =============================================================================
// Trace Logger
// =============================================================================

function generateTraceId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `tr_${ts}_${rand}`;
}

export class HierarchicalTraceLogger {
  protected tracesDir: string;
  protected activeTraces = new Map<string, HierarchicalTraceEntry>();

  constructor(tracesDir?: string) {
    this.tracesDir = tracesDir ?? path.join(process.cwd(), 'traces');
  }

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
      source: opts?.source ?? TraceSource.REAL_WORLD,
      outcome: TraceOutcome.UNKNOWN,
      outcomeReason: null,
      durationMs: null,
      confidence: null,
      actionEntries: [],
    };
    this.activeTraces.set(traceId, entry);
    return traceId;
  }

  appendAction(traceId: string, reasoning: string, actionPayload: string): void {
    const entry = this.activeTraces.get(traceId);
    if (!entry) return;
    entry.actionEntries.push({
      timestamp: new Date().toISOString(),
      reasoning,
      actionPayload,
    });
  }

  endTrace(
    traceId: string,
    outcome: TraceOutcome,
    reason?: string,
    confidence?: number,
  ): void {
    const entry = this.activeTraces.get(traceId);
    if (!entry) return;
    entry.outcome = outcome;
    entry.outcomeReason = reason ?? null;
    entry.confidence = confidence ?? null;
    const startTime = new Date(entry.timestamp).getTime();
    entry.durationMs = Date.now() - startTime;
    this.activeTraces.delete(traceId);
    this.writeTrace(entry);
  }

  getActiveTrace(traceId: string): HierarchicalTraceEntry | undefined {
    return this.activeTraces.get(traceId);
  }

  getActiveTraceCount(): number {
    return this.activeTraces.size;
  }

  // ---------------------------------------------------------------------------
  // Write trace to markdown file — override in subclasses for domain formatting
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
