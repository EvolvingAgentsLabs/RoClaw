/**
 * Shared type definitions for the Hierarchical Cognitive Architecture.
 *
 * Defines the 4-tier hierarchy, trace entries, strategies, and
 * negative constraints used across the planner, dream engine,
 * and memory systems.
 */

// =============================================================================
// Hierarchy Levels
// =============================================================================

export enum HierarchyLevel {
  /** High-level goal decomposition ("Fetch me a drink") */
  GOAL = 1,
  /** Multi-room strategic plan ("Traverse hallway → kitchen") */
  STRATEGY = 2,
  /** Intra-room tactical plan ("Route around couch") */
  TACTICAL = 3,
  /** Sub-second reactive motor control (bytecodes) */
  REACTIVE = 4,
}

// =============================================================================
// Trace Outcomes
// =============================================================================

export enum TraceOutcome {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  PARTIAL = 'PARTIAL',
  ABORTED = 'ABORTED',
  UNKNOWN = 'UNKNOWN',
}

// =============================================================================
// Hierarchical Trace Entry
// =============================================================================

export interface HierarchicalTraceEntry {
  /** Unique ID for this trace (e.g., "tr_<timestamp>_<random>") */
  traceId: string;
  /** Which tier of the hierarchy this trace belongs to */
  hierarchyLevel: HierarchyLevel;
  /** Parent trace ID for linking sub-goals to their parent */
  parentTraceId: string | null;
  /** ISO timestamp when the trace started */
  timestamp: string;
  /** The goal or sub-goal being pursued */
  goal: string;
  /** Current topological node label, if known */
  locationNode: string | null;
  /** Brief scene description at trace start */
  sceneDescription: string | null;
  /** Strategy ID being executed, if any */
  activeStrategyId: string | null;
  /** Outcome of this trace */
  outcome: TraceOutcome;
  /** Human-readable reason for the outcome */
  outcomeReason: string | null;
  /** Duration in milliseconds */
  durationMs: number | null;
  /** Confidence score (0-1) */
  confidence: number | null;
  /** Collected bytecode entries [{vlmOutput, bytecodeHex}] */
  bytecodeEntries: BytecodeEntry[];
}

export interface BytecodeEntry {
  timestamp: string;
  vlmOutput: string;
  bytecodeHex: string;
}

// =============================================================================
// Strategy
// =============================================================================

export interface Strategy {
  /** Unique ID (e.g., "strat_3_doorway-approach") */
  id: string;
  /** Version counter, incremented on dream engine updates */
  version: number;
  /** Which hierarchy level this strategy applies to */
  hierarchyLevel: HierarchyLevel;
  /** Human-readable title */
  title: string;
  /** Conditions that must hold for this strategy to apply */
  preconditions: string[];
  /** Goal keywords that trigger this strategy */
  triggerGoals: string[];
  /** Ordered steps to execute */
  steps: string[];
  /** Things NOT to do (learned from failures) */
  negativeConstraints: string[];
  /** Confidence score (0-1), updated by dream engine */
  confidence: number;
  /** Number of successful uses */
  successCount: number;
  /** Number of failed uses */
  failureCount: number;
  /** Trace IDs that contributed to this strategy */
  sourceTraceIds: string[];
  /** Whether this strategy has been superseded */
  deprecated: boolean;
}

// =============================================================================
// Negative Constraint
// =============================================================================

export interface NegativeConstraint {
  /** What NOT to do */
  description: string;
  /** When this constraint applies (e.g., "near doorways") */
  context: string;
  /** Trace IDs where this was learned */
  learnedFrom: string[];
  /** How critical: "low" | "medium" | "high" */
  severity: 'low' | 'medium' | 'high';
}

// =============================================================================
// Dream Journal
// =============================================================================

export interface DreamJournalEntry {
  /** ISO timestamp of the dream session */
  timestamp: string;
  /** Number of traces processed */
  tracesProcessed: number;
  /** Number of new strategies created */
  strategiesCreated: number;
  /** Number of existing strategies updated */
  strategiesUpdated: number;
  /** Number of negative constraints learned */
  constraintsLearned: number;
  /** Number of traces pruned/deleted */
  tracesPruned: number;
  /** Brief summary of what was learned */
  summary: string;
}
