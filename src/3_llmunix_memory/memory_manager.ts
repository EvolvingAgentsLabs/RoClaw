/**
 * RoClaw Memory Manager — Reads LLMunix memory files for Cortex access
 *
 * Provides programmatic access to the markdown-based memory system
 * (hardware profile, identity, skills, traces) so the Cortex LLM can
 * distill physical constraints for the Cerebellum.
 *
 * v2: Adds strategy-aware methods and hierarchical skill reading.
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../shared/logger';
import { HierarchyLevel } from './trace_types';
import { StrategyStore } from './strategy_store';

const DEFAULT_SYSTEM_DIR = path.join(__dirname, 'system');
const DEFAULT_SKILLS_DIR = path.join(__dirname, 'skills');
const DEFAULT_TRACES_DIR = path.join(__dirname, 'traces');
const DEFAULT_STRATEGIES_DIR = path.join(__dirname, 'strategies');

export interface MemoryManagerConfig {
  systemDir?: string;
  skillsDir?: string;
  tracesDir?: string;
  strategiesDir?: string;
}

/**
 * Read a file and return its contents, or empty string if missing.
 */
function safeRead(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}

export class MemoryManager {
  private cache = new Map<string, string>();
  private systemDir: string;
  private skillsDir: string;
  private tracesDir: string;
  private strategiesDir: string;
  private strategyStore: StrategyStore | null = null;

  constructor(config: MemoryManagerConfig = {}) {
    this.systemDir = config.systemDir ?? DEFAULT_SYSTEM_DIR;
    this.skillsDir = config.skillsDir ?? DEFAULT_SKILLS_DIR;
    this.tracesDir = config.tracesDir ?? DEFAULT_TRACES_DIR;
    this.strategiesDir = config.strategiesDir ?? DEFAULT_STRATEGIES_DIR;
  }

  /**
   * Get the hardware profile (chassis, motors, sensors, limits).
   */
  getHardwareProfile(): string {
    return this.cached('hardware', () =>
      safeRead(path.join(this.systemDir, 'hardware.md')),
    );
  }

  /**
   * Get the robot identity document.
   */
  getIdentity(): string {
    return this.cached('identity', () =>
      safeRead(path.join(this.systemDir, 'identity.md')),
    );
  }

  /**
   * Get all skill files concatenated (empty if none exist yet).
   * v2: Also reads strategy subdirectories if they exist.
   */
  getSkills(): string {
    return this.cached('skills', () => {
      const parts: string[] = [];

      // Read flat skills (legacy)
      try {
        const files = fs.readdirSync(this.skillsDir)
          .filter(f => f.endsWith('.md'))
          .sort();
        const flat = files
          .map(f => safeRead(path.join(this.skillsDir, f)))
          .filter(Boolean)
          .join('\n---\n');
        if (flat) parts.push(flat);
      } catch {
        // No skills dir
      }

      // Read hierarchical strategies if available
      const store = this.ensureStrategyStore();
      if (store.isAvailable()) {
        for (const level of [
          HierarchyLevel.GOAL,
          HierarchyLevel.STRATEGY,
          HierarchyLevel.TACTICAL,
          HierarchyLevel.REACTIVE,
        ]) {
          const summary = store.getSummaryForLevel(level);
          if (summary) {
            const levelName = HierarchyLevel[level];
            parts.push(`### Level ${level} — ${levelName} Strategies\n${summary}`);
          }
        }
      }

      return parts.join('\n\n');
    });
  }

  /**
   * Get the N most recent trace files (newest first).
   */
  getRecentTraces(n = 3): string {
    return this.cached(`traces:${n}`, () => {
      try {
        const files = fs.readdirSync(this.tracesDir)
          .filter(f => f.endsWith('.md'))
          .sort()
          .reverse()
          .slice(0, n);
        return files
          .map(f => safeRead(path.join(this.tracesDir, f)))
          .filter(Boolean)
          .join('\n---\n');
      } catch {
        return '';
      }
    });
  }

  /**
   * Get the full memory context (all sections combined).
   * v2: Includes strategy summaries and negative constraints when available.
   */
  getFullContext(): string {
    const sections: string[] = [];

    const hardware = this.getHardwareProfile();
    if (hardware) sections.push(`## Hardware\n${hardware}`);

    const identity = this.getIdentity();
    if (identity) sections.push(`## Identity\n${identity}`);

    const skills = this.getSkills();
    if (skills) sections.push(`## Skills\n${skills}`);

    // Add negative constraints section if any exist
    const store = this.ensureStrategyStore();
    if (store.isAvailable()) {
      const constraints = store.getNegativeConstraints();
      if (constraints.length > 0) {
        const constraintLines = constraints.map(c =>
          `- **${c.severity.toUpperCase()}**: ${c.description} (context: ${c.context})`
        );
        sections.push(`## Learned Constraints (Don'ts)\n${constraintLines.join('\n')}`);
      }
    }

    const traces = this.getRecentTraces();
    if (traces) sections.push(`## Recent Traces\n${traces}`);

    return sections.join('\n\n');
  }

  // ---------------------------------------------------------------------------
  // v2: Strategy-aware methods
  // ---------------------------------------------------------------------------

  /**
   * Get strategies for a given hierarchy level.
   */
  getStrategiesForLevel(level: HierarchyLevel) {
    return this.ensureStrategyStore().getStrategiesForLevel(level);
  }

  /**
   * Find strategies relevant to a goal at a given level.
   */
  findRelevantStrategies(goal: string, level: HierarchyLevel) {
    return this.ensureStrategyStore().findStrategies(goal, level);
  }

  /**
   * Get negative constraints, optionally filtered by context.
   */
  getNegativeConstraints(context?: string) {
    return this.ensureStrategyStore().getNegativeConstraints(context);
  }

  /**
   * Get the underlying StrategyStore instance.
   */
  getStrategyStore(): StrategyStore {
    return this.ensureStrategyStore();
  }

  /**
   * Check if hierarchical strategies are available.
   */
  hasStrategies(): boolean {
    return this.ensureStrategyStore().isAvailable();
  }

  /**
   * Clear the cache (e.g., after files change on disk).
   */
  refreshCache(): void {
    this.cache.clear();
    if (this.strategyStore) {
      this.strategyStore.rebuildIndex();
    }
    logger.debug('Memory', 'Cache cleared');
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private cached(key: string, loader: () => string): string {
    const existing = this.cache.get(key);
    if (existing !== undefined) return existing;

    const value = loader();
    this.cache.set(key, value);
    return value;
  }

  private ensureStrategyStore(): StrategyStore {
    if (!this.strategyStore) {
      this.strategyStore = new StrategyStore(this.strategiesDir);
    }
    return this.strategyStore;
  }
}
