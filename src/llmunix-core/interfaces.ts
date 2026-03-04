/**
 * LLMunix Core — Interfaces for domain adaptation.
 *
 * These interfaces allow domain-specific code (e.g., robotics) to plug into
 * the generic cognitive architecture without the core depending on any domain.
 */

import type { HierarchyLevel, ActionEntry } from './types';

// =============================================================================
// Inference Function
// =============================================================================

/** Generic inference function signature used across the architecture */
export type InferenceFunction = (
  systemPrompt: string,
  userMessage: string,
  images?: string[]
) => Promise<string>;

// =============================================================================
// Dream Domain Adapter
// =============================================================================

/** Domain-specific adapter for the DreamEngine's LLM prompts and action compression */
export interface DreamDomainAdapter {
  /** Compress/summarize actions for LLM consumption (e.g., opcode RLE for robotics) */
  compressActions(actions: ActionEntry[]): string;

  /** System prompt for failure analysis */
  failureAnalysisSystemPrompt: string;
  /** System prompt for strategy creation */
  strategyAbstractionSystemPrompt: string;
  /** System prompt for strategy merge/update */
  strategyMergeSystemPrompt: string;
  /** System prompt for dream journal summary */
  dreamSummarySystemPrompt: string;

  /** Build user prompt for failure analysis */
  buildFailurePrompt(summary: string): string;
  /** Build user prompt for strategy abstraction */
  buildAbstractionPrompt(summary: string, level: HierarchyLevel): string;
  /** Build user prompt for strategy merge */
  buildMergePrompt(existing: string, evidence: string): string;
}

// =============================================================================
// Memory Section
// =============================================================================

/** A registerable section for the CoreMemoryManager */
export interface MemorySection {
  /** Unique section name (e.g., "hardware", "identity") */
  name: string;
  /** Markdown heading to use in full context (e.g., "## Hardware") */
  heading: string;
  /** Function that loads the section content */
  load: () => string;
  /** Sort priority (lower = earlier in context). Default: 100 */
  priority: number;
}

// =============================================================================
// Level Directory Config
// =============================================================================

/** Maps hierarchy levels to directory names for strategy storage */
export type LevelDirectoryConfig = Partial<Record<HierarchyLevel, string>>;
