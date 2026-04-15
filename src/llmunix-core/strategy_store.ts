/**
 * LLMunix Core — Strategy Store
 *
 * Reads, writes, and manages strategy markdown files on the filesystem.
 * Strategies are organized by hierarchy level in subdirectories.
 * Generic defaults: level_1_goals, level_2_strategy, level_3_tactical, level_4_reactive.
 * Domain-specific subclasses can override level directory names.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  HierarchyLevel,
  type Strategy,
  type NegativeConstraint,
  type DreamJournalEntry,
} from './types';
import type { LevelDirectoryConfig } from './interfaces';

// =============================================================================
// Default level directories (generic — no domain assumptions)
// =============================================================================

const GENERIC_LEVEL_DIRS: Record<number, string> = {
  [HierarchyLevel.GOAL]: 'level_1_goals',
  [HierarchyLevel.STRATEGY]: 'level_2_strategy',
  [HierarchyLevel.TACTICAL]: 'level_3_tactical',
  [HierarchyLevel.REACTIVE]: 'level_4_reactive',
};

// =============================================================================
// Config
// =============================================================================

export interface StrategyStoreConfig {
  strategiesDir: string;
  levelDirs?: LevelDirectoryConfig;
}

// =============================================================================
// StrategyStore
// =============================================================================

export class StrategyStore {
  protected strategiesDir: string;
  protected levelDirs: Record<number, string>;

  constructor(config?: string | StrategyStoreConfig) {
    if (typeof config === 'string' || config === undefined) {
      this.strategiesDir = config ?? path.join(process.cwd(), 'strategies');
      this.levelDirs = { ...GENERIC_LEVEL_DIRS };
    } else {
      this.strategiesDir = config.strategiesDir;
      const overrides = config.levelDirs ?? {};
      const merged = { ...GENERIC_LEVEL_DIRS };
      for (const [k, v] of Object.entries(overrides)) {
        if (v !== undefined) merged[Number(k)] = v;
      }
      this.levelDirs = merged;
    }
  }

  isAvailable(): boolean {
    return fs.existsSync(this.strategiesDir);
  }

  // ---------------------------------------------------------------------------
  // Read
  // ---------------------------------------------------------------------------

  getStrategiesForLevel(level: HierarchyLevel): Strategy[] {
    const results: Strategy[] = [];

    // Read from level directory
    const dirName = this.levelDirs[level] ?? `level_${level}`;
    const dirPath = path.join(this.strategiesDir, dirName);
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.md'));
      for (const f of files) {
        const content = fs.readFileSync(path.join(dirPath, f), 'utf-8');
        results.push(strategyFromMarkdown(content, level));
      }
    }

    // Read from _seeds directory
    const seedsDir = path.join(this.strategiesDir, '_seeds');
    if (fs.existsSync(seedsDir)) {
      const seedFiles = fs.readdirSync(seedsDir).filter(f => f.endsWith('.md'));
      for (const f of seedFiles) {
        const content = fs.readFileSync(path.join(seedsDir, f), 'utf-8');
        const levelMatch = content.match(/^level:\s*(\d+)/m);
        const seedLevel = levelMatch ? parseInt(levelMatch[1], 10) : null;
        if (seedLevel === level) {
          results.push(strategyFromMarkdown(content, level));
        }
      }
    }

    return results.filter(s => !s.deprecated);
  }

  findStrategies(goal: string, level: HierarchyLevel): Strategy[] {
    const all = this.getStrategiesForLevel(level);
    const goalLower = goal.toLowerCase();
    return all.filter(s =>
      s.triggerGoals.some(tg => goalLower.includes(tg.toLowerCase()))
    );
  }

  findStrategyById(id: string): Strategy | null {
    for (const level of [HierarchyLevel.GOAL, HierarchyLevel.STRATEGY, HierarchyLevel.TACTICAL, HierarchyLevel.REACTIVE]) {
      const strategies = this.getStrategiesForLevel(level);
      const found = strategies.find(s => s.id === id);
      if (found) return found;
    }
    return null;
  }

  getNegativeConstraints(context?: string): NegativeConstraint[] {
    const constraintsFile = path.join(this.strategiesDir, '_negative_constraints.md');
    if (!fs.existsSync(constraintsFile)) return [];
    const content = fs.readFileSync(constraintsFile, 'utf-8');
    return parseNegativeConstraints(content, context);
  }

  getLastDreamTimestamp(): string | null {
    const journalFile = path.join(this.strategiesDir, '_dream_journal.md');
    if (!fs.existsSync(journalFile)) return null;
    const content = fs.readFileSync(journalFile, 'utf-8');
    const match = content.match(/\*\*Timestamp:\*\*\s*(\S+)/g);
    if (!match) return null;
    const last = match[match.length - 1];
    return last.replace('**Timestamp:** ', '');
  }

  getSummaryForLevel(level: HierarchyLevel): string {
    const strategies = this.getStrategiesForLevel(level);
    if (strategies.length === 0) return '';
    return strategies
      .map(s => `- ${s.title} (confidence: ${s.confidence})`)
      .join('\n');
  }

  rebuildIndex(): void {
    // No-op — local filesystem needs no index
  }

  // ---------------------------------------------------------------------------
  // Write
  // ---------------------------------------------------------------------------

  saveStrategy(strategy: Strategy): void {
    const dirName = this.levelDirs[strategy.hierarchyLevel] ?? `level_${strategy.hierarchyLevel}`;
    const dirPath = path.join(this.strategiesDir, dirName);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    const filePath = path.join(dirPath, `${strategy.id}.md`);
    fs.writeFileSync(filePath, strategyToMarkdown(strategy));
  }

  saveNegativeConstraint(constraint: NegativeConstraint): void {
    const filePath = path.join(this.strategiesDir, '_negative_constraints.md');
    const entry = `\n### ${constraint.description}\n**Context:** ${constraint.context}\n**Severity:** ${constraint.severity}\n**Learned from:** ${constraint.learnedFrom.join(', ')}\n\n`;
    fs.appendFileSync(filePath, entry);
  }

  reinforceStrategy(id: string): void {
    const strategy = this.findStrategyById(id);
    if (!strategy) return;
    strategy.successCount++;
    strategy.confidence = Math.min(1.0, strategy.confidence + 0.05);
    this.saveStrategy(strategy);
  }

  decayUnusedStrategies(_daysSinceLastUse: number): number {
    let count = 0;
    for (const level of [HierarchyLevel.GOAL, HierarchyLevel.STRATEGY, HierarchyLevel.TACTICAL, HierarchyLevel.REACTIVE]) {
      const strategies = this.getStrategiesForLevel(level);
      for (const strategy of strategies) {
        if (strategy.sourceTraceIds.length > 0) {
          strategy.confidence = Math.max(0.01, strategy.confidence * 0.95);
          this.saveStrategy(strategy);
          count++;
        }
      }
    }
    return count;
  }

  appendDreamJournal(entry: DreamJournalEntry): void {
    const filePath = path.join(this.strategiesDir, '_dream_journal.md');
    const content = `\n### Dream Session\n**Timestamp:** ${entry.timestamp}\n**Traces Processed:** ${entry.tracesProcessed}\n**Strategies Created:** ${entry.strategiesCreated}\n**Strategies Updated:** ${entry.strategiesUpdated}\n**Constraints Learned:** ${entry.constraintsLearned}\n**Traces Pruned:** ${entry.tracesPruned}\n**Summary:** ${entry.summary}\n\n`;
    fs.appendFileSync(filePath, content);
  }
}

// =============================================================================
// Markdown serialization
// =============================================================================

export function strategyFromMarkdown(content: string, level: HierarchyLevel): Strategy {
  const lines = content.split('\n');

  // Parse YAML frontmatter if present
  let frontmatter: Record<string, unknown> = {};
  if (lines[0]?.trim() === '---') {
    const endIdx = lines.indexOf('---', 1);
    if (endIdx > 0) {
      const yamlLines = lines.slice(1, endIdx);
      for (const line of yamlLines) {
        const match = line.match(/^(\w[\w_]*)\s*:\s*(.+)$/);
        if (match) {
          const key = match[1];
          let val: unknown = match[2].trim();
          // Parse JSON arrays
          if (typeof val === 'string' && val.startsWith('[')) {
            try { val = JSON.parse(val); } catch { /* keep as string */ }
          }
          // Parse numbers
          if (typeof val === 'string' && /^\d+(\.\d+)?$/.test(val)) {
            val = parseFloat(val);
          }
          // Parse booleans
          if (val === 'true') val = true;
          if (val === 'false') val = false;
          // Parse quoted strings
          if (typeof val === 'string' && /^".*"$/.test(val)) {
            val = val.slice(1, -1);
          }
          frontmatter[key] = val;
        }
      }
    }
  }

  // Title from frontmatter or markdown heading
  const title = (frontmatter.title as string)
    ?? (lines.find(l => l.startsWith('# '))?.slice(2) ?? 'Untitled').trim();

  // Parse ## Steps section
  const steps: string[] = [];
  let inSteps = false;
  for (const line of lines) {
    if (/^##\s+Steps/i.test(line)) { inSteps = true; continue; }
    if (inSteps && line.startsWith('## ')) break;
    if (inSteps) {
      const stepMatch = line.match(/^\d+\.\s+(.+)/);
      if (stepMatch) steps.push(stepMatch[1].trim());
    }
  }

  // Parse ## Negative Constraints section
  const negativeConstraints: string[] = [];
  let inNeg = false;
  for (const line of lines) {
    if (/^##\s+Negative.Constraints/i.test(line)) { inNeg = true; continue; }
    if (inNeg && line.startsWith('## ')) break;
    if (inNeg) {
      const ncMatch = line.match(/^-\s+(.+)/);
      if (ncMatch) negativeConstraints.push(ncMatch[1].trim());
    }
  }

  // Parse ## Spatial Rules section
  const spatialRules: string[] = [];
  let inSpatial = false;
  for (const line of lines) {
    if (/^##\s+Spatial.Rules/i.test(line)) { inSpatial = true; continue; }
    if (inSpatial && line.startsWith('## ')) break;
    if (inSpatial) {
      const srMatch = line.match(/^-\s+(.+)/);
      if (srMatch) spatialRules.push(srMatch[1].trim());
    }
  }

  const triggerGoals = Array.isArray(frontmatter.trigger_goals)
    ? (frontmatter.trigger_goals as string[])
    : [title];

  const preconditions = Array.isArray(frontmatter.preconditions)
    ? (frontmatter.preconditions as string[])
    : [];

  const sourceTraces = Array.isArray(frontmatter.source_traces)
    ? (frontmatter.source_traces as string[])
    : [];

  return {
    id: (frontmatter.id as string) ?? `strat_${level}_${title.toLowerCase().replace(/\s+/g, '-').slice(0, 30)}`,
    version: (frontmatter.version as number) ?? 1,
    hierarchyLevel: level,
    title,
    preconditions,
    triggerGoals,
    steps,
    negativeConstraints,
    ...(spatialRules.length > 0 ? { spatialRules } : {}),
    confidence: (frontmatter.confidence as number) ?? 0.5,
    successCount: (frontmatter.success_count as number) ?? 0,
    failureCount: (frontmatter.failure_count as number) ?? 0,
    sourceTraceIds: sourceTraces,
    deprecated: (frontmatter.deprecated as boolean) ?? false,
  };
}

export function strategyToMarkdown(strategy: Strategy): string {
  const triggerGoals = JSON.stringify(strategy.triggerGoals);
  const preconditions = JSON.stringify(strategy.preconditions);
  const sourceTraces = JSON.stringify(strategy.sourceTraceIds);

  const lines = [
    '---',
    `id: ${strategy.id}`,
    `version: ${strategy.version}`,
    `level: ${strategy.hierarchyLevel}`,
    `title: ${strategy.title}`,
    `trigger_goals: ${triggerGoals}`,
    `preconditions: ${preconditions}`,
    `confidence: ${strategy.confidence}`,
    `success_count: ${strategy.successCount}`,
    `failure_count: ${strategy.failureCount}`,
    `source_traces: ${sourceTraces}`,
    `deprecated: ${strategy.deprecated}`,
    '---',
    '',
    `# ${strategy.title}`,
    '',
  ];

  if (strategy.steps.length > 0) {
    lines.push('## Steps', '');
    strategy.steps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
    lines.push('');
  }

  if (strategy.negativeConstraints.length > 0) {
    lines.push('## Negative Constraints', '');
    strategy.negativeConstraints.forEach(c => lines.push(`- ${c}`));
    lines.push('');
  }

  if (strategy.spatialRules?.length) {
    lines.push('## Spatial Rules', '');
    strategy.spatialRules.forEach(r => lines.push(`- ${r}`));
    lines.push('');
  }

  return lines.join('\n');
}

export function parseNegativeConstraints(content: string, context?: string): NegativeConstraint[] {
  const constraints: NegativeConstraint[] = [];
  const lines = content.split('\n');

  // Helper: check if a stored context matches the query context.
  // A constraint matches if: no filter, stored context contains the query,
  // OR stored context is "general" (applies everywhere).
  const contextMatches = (storedCtx: string, query?: string): boolean => {
    if (!query) return true;
    if (storedCtx.includes(query)) return true;
    if (storedCtx === 'general' || storedCtx === '') return true;
    return false;
  };

  // Format 1: `- **severity**: description (context: ...)`
  for (const line of lines) {
    const match = line.match(/^-\s+\*\*(\w+)\*\*:\s+(.+?)(?:\s+\(context:\s+(.+?)\))?$/);
    if (match) {
      const severity = match[1].toLowerCase() as 'low' | 'medium' | 'high';
      const desc = match[2];
      const ctx = match[3] ?? '';
      if (contextMatches(ctx, context)) {
        constraints.push({ description: desc, context: ctx, learnedFrom: [], severity });
      }
    }
  }

  // Format 2: `### Description` + `**Context:**` + `**Severity:**` + `**Learned from:**`
  for (let i = 0; i < lines.length; i++) {
    const headingMatch = lines[i].match(/^###\s+(.+)/);
    if (!headingMatch) continue;
    const desc = headingMatch[1].trim();
    let ctx = '';
    let severity: 'low' | 'medium' | 'high' = 'medium';
    const learned: string[] = [];
    for (let j = i + 1; j < lines.length && !lines[j].startsWith('###'); j++) {
      const ctxMatch = lines[j].match(/^\*\*Context:\*\*\s*(.+)/);
      if (ctxMatch) ctx = ctxMatch[1].trim();
      const sevMatch = lines[j].match(/^\*\*Severity:\*\*\s*(\w+)/);
      if (sevMatch) severity = sevMatch[1].toLowerCase() as 'low' | 'medium' | 'high';
      const learnMatch = lines[j].match(/^\*\*Learned from:\*\*\s+(.+)/);
      if (learnMatch) learned.push(...learnMatch[1].split(',').map(s => s.trim()).filter(s => s));
    }
    if (contextMatches(ctx, context)) {
      constraints.push({ description: desc, context: ctx, learnedFrom: learned, severity });
    }
  }

  return constraints;
}
