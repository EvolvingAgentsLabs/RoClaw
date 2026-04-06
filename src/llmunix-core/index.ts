/**
 * LLMunix Core — Barrel export
 *
 * Generic hierarchical cognitive architecture with zero domain dependencies.
 * Traces are written as local .md files; dream consolidation is handled
 * by skillos agents reading trace files directly.
 */

// Types
export {
  HierarchyLevel,
  TraceOutcome,
  TraceSource,
  TRACE_FIDELITY_WEIGHTS,
  type ActionEntry,
  type HierarchicalTraceEntry,
  type Strategy,
  type NegativeConstraint,
  type DreamJournalEntry,
} from './types';

// Interfaces
export {
  type InferenceFunction,
  type DreamDomainAdapter,
  type MemorySection,
  type LevelDirectoryConfig,
} from './interfaces';

// Utils
export { extractJSON, parseJSONSafe } from './utils';

// Memory Manager (local — manages context assembly from .md files)
export {
  CoreMemoryManager,
  type CoreMemoryManagerConfig,
} from './memory_manager';
