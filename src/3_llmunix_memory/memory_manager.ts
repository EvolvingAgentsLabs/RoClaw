/**
 * RoClaw Memory Manager — Reads LLMunix memory files for Cortex access
 *
 * Provides programmatic access to the markdown-based memory system
 * (hardware profile, identity, skills, traces) so the Cortex LLM can
 * distill physical constraints for the Cerebellum.
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../shared/logger';

const SYSTEM_DIR = path.join(__dirname, 'system');
const SKILLS_DIR = path.join(__dirname, 'skills');
const TRACES_DIR = path.join(__dirname, 'traces');

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

  /**
   * Get the hardware profile (chassis, motors, sensors, limits).
   */
  getHardwareProfile(): string {
    return this.cached('hardware', () =>
      safeRead(path.join(SYSTEM_DIR, 'hardware.md')),
    );
  }

  /**
   * Get the robot identity document.
   */
  getIdentity(): string {
    return this.cached('identity', () =>
      safeRead(path.join(SYSTEM_DIR, 'identity.md')),
    );
  }

  /**
   * Get all skill files concatenated (empty if none exist yet).
   */
  getSkills(): string {
    return this.cached('skills', () => {
      try {
        const files = fs.readdirSync(SKILLS_DIR)
          .filter(f => f.endsWith('.md'))
          .sort();
        return files
          .map(f => safeRead(path.join(SKILLS_DIR, f)))
          .filter(Boolean)
          .join('\n---\n');
      } catch {
        return '';
      }
    });
  }

  /**
   * Get the N most recent trace files (newest first).
   */
  getRecentTraces(n = 3): string {
    return this.cached(`traces:${n}`, () => {
      try {
        const files = fs.readdirSync(TRACES_DIR)
          .filter(f => f.endsWith('.md'))
          .sort()
          .reverse()
          .slice(0, n);
        return files
          .map(f => safeRead(path.join(TRACES_DIR, f)))
          .filter(Boolean)
          .join('\n---\n');
      } catch {
        return '';
      }
    });
  }

  /**
   * Get the full memory context (all sections combined).
   */
  getFullContext(): string {
    const sections: string[] = [];

    const hardware = this.getHardwareProfile();
    if (hardware) sections.push(`## Hardware\n${hardware}`);

    const identity = this.getIdentity();
    if (identity) sections.push(`## Identity\n${identity}`);

    const skills = this.getSkills();
    if (skills) sections.push(`## Skills\n${skills}`);

    const traces = this.getRecentTraces();
    if (traces) sections.push(`## Recent Traces\n${traces}`);

    return sections.join('\n\n');
  }

  /**
   * Clear the cache (e.g., after files change on disk).
   */
  refreshCache(): void {
    this.cache.clear();
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
}
