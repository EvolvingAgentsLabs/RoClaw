/**
 * LLMunix Core — Dream Engine
 *
 * Generic dream consolidation engine. Reads trace files, groups them into
 * sequences, scores by fidelity weight, and uses LLM inference (via adapter)
 * to extract strategies and negative constraints.
 *
 * Domain-agnostic: all domain-specific behavior is delegated to the
 * DreamDomainAdapter interface.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  HierarchyLevel,
  TraceOutcome,
  TraceSource,
  TRACE_FIDELITY_WEIGHTS,
  type ActionEntry,
  type Strategy,
  type NegativeConstraint,
  type DreamJournalEntry,
} from './types';
import type { DreamDomainAdapter, InferenceFunction } from './interfaces';
import { StrategyStore, strategyToMarkdown } from './strategy_store';

// =============================================================================
// Types
// =============================================================================

export interface ParsedTrace {
  timestamp: string;
  traceId: string;
  level: HierarchyLevel;
  parentTraceId: string | null;
  goal: string;
  source: TraceSource;
  outcome: TraceOutcome;
  outcomeReason: string | null;
  durationMs: number;
  confidence: number;
  strategyId: string | null;
  actions: ActionEntry[];
}

export interface TraceSequence {
  traces: ParsedTrace[];
  goal: string;
  outcome: TraceOutcome;
  score: number;
  level: HierarchyLevel;
  source: TraceSource;
  fidelityWeight: number;
}

export interface DreamResult {
  tracesProcessed: number;
  strategiesCreated: Strategy[];
  strategiesUpdated: Strategy[];
  constraintsLearned: NegativeConstraint[];
  journalEntry: DreamJournalEntry;
}

export interface DreamEngineConfig {
  adapter: DreamDomainAdapter;
  infer: InferenceFunction;
  store: StrategyStore;
  tracesDir: string;
}

// =============================================================================
// Source parsing helpers
// =============================================================================

const SOURCE_MAP: Record<string, TraceSource> = {
  REAL_WORLD: TraceSource.REAL_WORLD,
  SIM_3D: TraceSource.SIM_3D,
  SIM_2D: TraceSource.SIM_2D,
  DREAM_TEXT: TraceSource.DREAM_TEXT,
  UNKNOWN_SOURCE: TraceSource.UNKNOWN_SOURCE,
};

const OUTCOME_MAP: Record<string, TraceOutcome> = {
  SUCCESS: TraceOutcome.SUCCESS,
  FAILURE: TraceOutcome.FAILURE,
  PARTIAL: TraceOutcome.PARTIAL,
  ABORTED: TraceOutcome.ABORTED,
  UNKNOWN: TraceOutcome.UNKNOWN,
};

// =============================================================================
// DreamEngine
// =============================================================================

export class DreamEngine {
  private adapter: DreamDomainAdapter;
  private infer: InferenceFunction;
  private store: StrategyStore;
  private tracesDir: string;

  constructor(config: DreamEngineConfig) {
    this.adapter = config.adapter;
    this.infer = config.infer;
    this.store = config.store;
    this.tracesDir = config.tracesDir;
  }

  // ---------------------------------------------------------------------------
  // Parse trace files from disk
  // ---------------------------------------------------------------------------

  parseTraceFiles(): ParsedTrace[] {
    if (!fs.existsSync(this.tracesDir)) return [];

    const traces: ParsedTrace[] = [];
    const files = fs.readdirSync(this.tracesDir).filter(
      f => f.startsWith('trace_') && f.endsWith('.md'),
    );

    for (const file of files) {
      const content = fs.readFileSync(path.join(this.tracesDir, file), 'utf-8');
      // Split on `---` line separator between trace blocks
      const blocks = content.split(/\n---\n/);
      for (const block of blocks) {
        if (!block.includes('### Time:')) continue;
        const trace = this.parseTraceBlock(block);
        if (trace) traces.push(trace);
      }
    }

    return traces;
  }

  private parseTraceBlock(block: string): ParsedTrace | null {
    const lines = block.split('\n');

    const timestamp = this.extractField(lines, /^### Time:\s*(.+)/);
    const traceId = this.extractField(lines, /^\*\*Trace ID:\*\*\s*(.+)/);
    const levelStr = this.extractField(lines, /^\*\*Level:\*\*\s*(\d+)/);
    const parentTraceId = this.extractField(lines, /^\*\*Parent:\*\*\s*(.+)/);
    const goal = this.extractField(lines, /^\*\*Goal:\*\*\s*(.+)/);
    const sourceStr = this.extractField(lines, /^\*\*Source:\*\*\s*(.+)/);
    const outcomeStr = this.extractField(lines, /^\*\*Outcome:\*\*\s*(.+)/);
    const reason = this.extractField(lines, /^\*\*Reason:\*\*\s*(.+)/);
    const durationStr = this.extractField(lines, /^\*\*Duration:\*\*\s*(\d+)ms/);
    const confStr = this.extractField(lines, /^\*\*Confidence:\*\*\s*([\d.]+)/);
    const strategyId = this.extractField(lines, /^\*\*Strategy:\*\*\s*(.+)/);

    if (!traceId || !goal || !outcomeStr) return null;

    // Parse actions — support both generic and RoClaw formats
    const actions: ActionEntry[] = [];
    for (let i = 0; i < lines.length; i++) {
      const reasoningMatch = lines[i].match(
        /^\*\*(?:VLM )?Reasoning:\*\*\s*(.+)/,
      );
      if (reasoningMatch) {
        const nextLine = lines[i + 1] ?? '';
        const payloadMatch = nextLine.match(
          /^\*\*(?:Compiled Bytecode|Action):\*\*\s*`(.+)`/,
        );
        actions.push({
          timestamp: timestamp ?? '',
          reasoning: reasoningMatch[1].trim(),
          actionPayload: payloadMatch ? payloadMatch[1].trim() : '',
        });
      }
    }

    const source = sourceStr
      ? (SOURCE_MAP[sourceStr.trim()] ?? TraceSource.UNKNOWN_SOURCE)
      : TraceSource.UNKNOWN_SOURCE;

    const outcome = OUTCOME_MAP[outcomeStr.trim()] ?? TraceOutcome.UNKNOWN;

    return {
      timestamp: timestamp ?? '',
      traceId: traceId.trim(),
      level: levelStr
        ? (parseInt(levelStr, 10) as HierarchyLevel)
        : HierarchyLevel.REACTIVE,
      parentTraceId: parentTraceId?.trim() ?? null,
      goal: goal.trim(),
      source,
      outcome,
      outcomeReason: reason?.trim() ?? null,
      durationMs: durationStr ? parseInt(durationStr, 10) : 0,
      confidence: confStr ? parseFloat(confStr) : 0.5,
      strategyId: strategyId?.trim() ?? null,
      actions,
    };
  }

  private extractField(lines: string[], regex: RegExp): string | null {
    for (const line of lines) {
      const m = line.match(regex);
      if (m) return m[1];
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Group traces into sequences
  // ---------------------------------------------------------------------------

  groupIntoSequences(traces: ParsedTrace[]): TraceSequence[] {
    const parentGroups = new Map<string, ParsedTrace[]>();
    const ungrouped: ParsedTrace[] = [];

    for (const trace of traces) {
      if (trace.parentTraceId) {
        const key = trace.parentTraceId;
        if (!parentGroups.has(key)) parentGroups.set(key, []);
        parentGroups.get(key)!.push(trace);
      } else {
        ungrouped.push(trace);
      }
    }

    // Group ungrouped by goal keyword
    const goalGroups = new Map<string, ParsedTrace[]>();
    for (const trace of ungrouped) {
      const key = `goal:${trace.goal}`;
      if (!goalGroups.has(key)) goalGroups.set(key, []);
      goalGroups.get(key)!.push(trace);
    }

    const allGroups = [...parentGroups.values(), ...goalGroups.values()];

    return allGroups.map(group => {
      // Find dominant source (highest fidelity)
      let dominantSource = TraceSource.UNKNOWN_SOURCE;
      let highestFidelity = 0;
      for (const t of group) {
        const fw = TRACE_FIDELITY_WEIGHTS[t.source] ?? 0.6;
        if (fw > highestFidelity) {
          highestFidelity = fw;
          dominantSource = t.source;
        }
      }

      // Determine aggregate outcome
      const hasSuccess = group.some(t => t.outcome === TraceOutcome.SUCCESS);
      const hasFailure = group.some(t => t.outcome === TraceOutcome.FAILURE);
      const outcome = hasSuccess
        ? TraceOutcome.SUCCESS
        : hasFailure
          ? TraceOutcome.FAILURE
          : TraceOutcome.UNKNOWN;

      return {
        traces: group,
        goal: group[0].goal,
        outcome,
        score: 0,
        level: group[0].level,
        source: dominantSource,
        fidelityWeight: TRACE_FIDELITY_WEIGHTS[dominantSource],
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Score sequences
  // ---------------------------------------------------------------------------

  scoreSequences(sequences: TraceSequence[]): TraceSequence[] {
    const now = Date.now();

    for (const seq of sequences) {
      const avgConfidence =
        seq.traces.reduce((sum, t) => sum + t.confidence, 0) /
        seq.traces.length;

      const outcomeWeight =
        seq.outcome === TraceOutcome.SUCCESS
          ? 1.0
          : seq.outcome === TraceOutcome.FAILURE
            ? 0.3
            : 0.5;

      const avgRecency =
        seq.traces.reduce((sum, t) => {
          const age = now - new Date(t.timestamp).getTime();
          return sum + Math.max(0.1, 1.0 - age / (30 * 24 * 60 * 60 * 1000));
        }, 0) / seq.traces.length;

      seq.score = avgConfidence * outcomeWeight * seq.fidelityWeight * avgRecency;
    }

    sequences.sort((a, b) => b.score - a.score);
    return sequences;
  }

  // ---------------------------------------------------------------------------
  // Summarize a sequence (uses adapter for action compression)
  // ---------------------------------------------------------------------------

  summarizeSequence(sequence: TraceSequence): string {
    const allActions = sequence.traces.flatMap(t => t.actions);
    const compressed = this.adapter.compressActions(allActions);

    return [
      `Goal: ${sequence.goal}`,
      `Outcome: ${sequence.outcome}`,
      `Level: ${sequence.level}`,
      `Source: ${sequence.source} (fidelity: ${sequence.fidelityWeight})`,
      `Traces: ${sequence.traces.length}`,
      '',
      `Actions: ${compressed}`,
    ].join('\n');
  }

  // ---------------------------------------------------------------------------
  // Full dream cycle
  // ---------------------------------------------------------------------------

  async dream(): Promise<DreamResult> {
    const traces = this.parseTraceFiles();
    if (traces.length === 0) {
      return {
        tracesProcessed: 0,
        strategiesCreated: [],
        strategiesUpdated: [],
        constraintsLearned: [],
        journalEntry: {
          timestamp: new Date().toISOString(),
          tracesProcessed: 0,
          strategiesCreated: 0,
          strategiesUpdated: 0,
          constraintsLearned: 0,
          tracesPruned: 0,
          summary: '',
        },
      };
    }

    const sequences = this.groupIntoSequences(traces);
    const scored = this.scoreSequences(sequences);

    const strategiesCreated: Strategy[] = [];
    const strategiesUpdated: Strategy[] = [];
    const constraintsLearned: NegativeConstraint[] = [];

    for (const seq of scored) {
      const summary = this.summarizeSequence(seq);

      if (seq.outcome === TraceOutcome.FAILURE) {
        await this.processFailure(seq, summary, constraintsLearned);
      } else if (seq.outcome === TraceOutcome.SUCCESS) {
        await this.processSuccess(
          seq,
          summary,
          strategiesCreated,
          strategiesUpdated,
        );
      }
    }

    // Generate dream journal
    const journalSummary = await this.infer(
      this.adapter.dreamSummarySystemPrompt,
      `Consolidation session:\n- Traces processed: ${traces.length}\n- Failures analyzed: ${constraintsLearned.length}\n- Strategies created: ${strategiesCreated.length}\n- Strategies updated: ${strategiesUpdated.length}\n- New constraints: ${constraintsLearned.length}`,
    );

    const journalEntry: DreamJournalEntry = {
      timestamp: new Date().toISOString(),
      tracesProcessed: traces.length,
      strategiesCreated: strategiesCreated.length,
      strategiesUpdated: strategiesUpdated.length,
      constraintsLearned: constraintsLearned.length,
      tracesPruned: 0,
      summary: journalSummary,
    };

    this.store.appendDreamJournal(journalEntry);

    return {
      tracesProcessed: traces.length,
      strategiesCreated,
      strategiesUpdated,
      constraintsLearned,
      journalEntry,
    };
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private async processFailure(
    seq: TraceSequence,
    summary: string,
    constraintsLearned: NegativeConstraint[],
  ): Promise<void> {
    const response = await this.infer(
      this.adapter.failureAnalysisSystemPrompt,
      this.adapter.buildFailurePrompt(summary),
    );
    try {
      const parsed = JSON.parse(response);
      const constraint: NegativeConstraint = {
        description: parsed.description ?? 'Unknown',
        context: parsed.context ?? 'general',
        learnedFrom: seq.traces.map(t => t.traceId),
        severity: parsed.severity ?? 'medium',
      };
      this.store.saveNegativeConstraint(constraint);
      constraintsLearned.push(constraint);
    } catch {
      /* parse error, skip */
    }
  }

  private async processSuccess(
    seq: TraceSequence,
    summary: string,
    strategiesCreated: Strategy[],
    strategiesUpdated: Strategy[],
  ): Promise<void> {
    const response = await this.infer(
      this.adapter.strategyAbstractionSystemPrompt,
      this.adapter.buildAbstractionPrompt(summary, seq.level),
    );
    try {
      const parsed = JSON.parse(response);
      const strategy: Strategy = {
        id: `strat_${seq.level}_${(parsed.title ?? 'unknown')
          .toLowerCase()
          .replace(/\s+/g, '-')
          .slice(0, 30)}`,
        version: 1,
        hierarchyLevel: seq.level,
        title: parsed.title ?? 'Untitled',
        preconditions: parsed.preconditions ?? [],
        triggerGoals: parsed.trigger_goals ?? [],
        steps: parsed.steps ?? [],
        negativeConstraints: parsed.negative_constraints ?? [],
        confidence: 0.5 * seq.fidelityWeight,
        successCount: seq.traces.length,
        failureCount: 0,
        sourceTraceIds: seq.traces.map(t => t.traceId),
        deprecated: false,
      };

      // Check for existing overlap
      const existing = this.store.findStrategies(strategy.title, seq.level);
      if (existing.length > 0) {
        const mergeResponse = await this.infer(
          this.adapter.strategyMergeSystemPrompt,
          this.adapter.buildMergePrompt(
            strategyToMarkdown(existing[0]),
            summary,
          ),
        );
        try {
          const merged = JSON.parse(mergeResponse);
          existing[0].steps = merged.steps ?? existing[0].steps;
          existing[0].triggerGoals =
            merged.trigger_goals ?? existing[0].triggerGoals;
          existing[0].negativeConstraints =
            merged.negative_constraints ?? existing[0].negativeConstraints;
          existing[0].version++;
          this.store.saveStrategy(existing[0]);
          strategiesUpdated.push(existing[0]);
        } catch {
          /* merge parse error */
        }
      } else {
        this.store.saveStrategy(strategy);
        strategiesCreated.push(strategy);
      }
    } catch {
      /* parse error, skip */
    }
  }
}
