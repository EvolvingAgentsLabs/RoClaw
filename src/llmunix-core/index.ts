/**
 * LLMunix Core — Barrel export
 *
 * Generic hierarchical cognitive architecture with zero domain dependencies.
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

// Strategy Store
export {
  StrategyStore,
  type StrategyStoreConfig,
  strategyFromMarkdown,
  strategyToMarkdown,
  parseNegativeConstraints,
} from './strategy_store';

// Trace Logger
export {
  HierarchicalTraceLogger,
  type StartTraceOptions,
} from './trace_logger';

// Memory Manager
export {
  CoreMemoryManager,
  type CoreMemoryManagerConfig,
} from './memory_manager';

// Dream Engine
export {
  DreamEngine,
  type ParsedTrace,
  type TraceSequence,
  type DreamConfig,
  type DreamResult,
} from './dream_engine';
