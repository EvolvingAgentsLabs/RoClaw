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

// Trace Logger (generic — domain subclasses override writeTrace)
export {
  HierarchicalTraceLogger,
  type StartTraceOptions,
} from './trace_logger';

// Strategy Store (generic defaults — domain subclasses override level dirs)
export {
  StrategyStore,
  type StrategyStoreConfig,
  strategyFromMarkdown,
  strategyToMarkdown,
  parseNegativeConstraints,
} from './strategy_store';

// Dream Engine (generic — uses DreamDomainAdapter for domain-specific behavior)
export {
  DreamEngine,
  type ParsedTrace,
  type TraceSequence,
  type DreamResult,
  type DreamEngineConfig,
} from './dream_engine';
