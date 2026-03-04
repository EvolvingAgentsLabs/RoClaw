/**
 * RoClaw Memory Manager — Extends core with hardware, identity, and skills sections
 *
 * Provides programmatic access to the markdown-based memory system
 * (hardware profile, identity, skills, traces) so the Cortex LLM can
 * distill physical constraints for the Cerebellum.
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../shared/logger';
import { HierarchyLevel } from '../llmunix-core/types';
import { CoreMemoryManager, type CoreMemoryManagerConfig } from '../llmunix-core/memory_manager';
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

function safeRead(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}

export class MemoryManager extends CoreMemoryManager {
  private systemDir: string;
  private skillsDir: string;

  constructor(config: MemoryManagerConfig = {}) {
    const tracesDir = config.tracesDir ?? DEFAULT_TRACES_DIR;
    const strategiesDir = config.strategiesDir ?? DEFAULT_STRATEGIES_DIR;

    super({
      tracesDir,
      strategiesDir,
      strategyStoreConfig: {
        strategiesDir,
        levelDirs: {
          [HierarchyLevel.STRATEGY]: 'level_2_routes',
          [HierarchyLevel.REACTIVE]: 'level_4_motor',
        },
      },
    });

    this.systemDir = config.systemDir ?? DEFAULT_SYSTEM_DIR;
    this.skillsDir = config.skillsDir ?? DEFAULT_SKILLS_DIR;

    // Register RoClaw-specific sections
    this.registerSection({
      name: 'hardware',
      heading: '## Hardware',
      load: () => safeRead(path.join(this.systemDir, 'hardware.md')),
      priority: 10,
    });

    this.registerSection({
      name: 'identity',
      heading: '## Identity',
      load: () => safeRead(path.join(this.systemDir, 'identity.md')),
      priority: 20,
    });

    this.registerSection({
      name: 'skills',
      heading: '## Skills',
      load: () => this.loadSkills(),
      priority: 30,
    });
  }

  /**
   * Get the hardware profile (convenience wrapper).
   */
  getHardwareProfile(): string {
    return this.getSection('hardware');
  }

  /**
   * Get the robot identity document (convenience wrapper).
   */
  getIdentity(): string {
    return this.getSection('identity');
  }

  /**
   * Get all skill files concatenated (convenience wrapper).
   */
  getSkills(): string {
    return this.getSection('skills');
  }

  /**
   * Clear the cache (e.g., after files change on disk).
   */
  refreshCache(): void {
    super.refreshCache();
    logger.debug('Memory', 'Cache cleared');
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private loadSkills(): string {
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
    const store = this.getStrategyStore();
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
  }
}
