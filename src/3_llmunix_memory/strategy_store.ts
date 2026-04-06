/**
 * RoClaw Strategy Store — Local filesystem reader for strategy markdown files.
 *
 * Reads strategy markdown files from the local filesystem. Strategies are
 * organized by hierarchy level in subdirectories. Dream consolidation
 * (which generates new strategies) is handled by skillos agents.
 */

import * as fs from 'fs';
import * as path from 'path';
import { HierarchyLevel, type Strategy, type NegativeConstraint } from '../llmunix-core/types';

const DEFAULT_LEVEL_DIRS: Record<number, string> = {
  [HierarchyLevel.GOAL]: 'level_1_goals',
  [HierarchyLevel.STRATEGY]: 'level_2_routes',
  [HierarchyLevel.TACTICAL]: 'level_3_tactical',
  [HierarchyLevel.REACTIVE]: 'level_4_motor',
};

export class StrategyStore {
  private strategiesDir: string;

  constructor(strategiesDir?: string) {
    this.strategiesDir = strategiesDir ?? path.join(__dirname, 'strategies');
  }

  isAvailable(): boolean {
    return fs.existsSync(this.strategiesDir);
  }

  getStrategiesForLevel(level: HierarchyLevel): Strategy[] {
    const dirName = DEFAULT_LEVEL_DIRS[level] ?? `level_${level}`;
    const dirPath = path.join(this.strategiesDir, dirName);
    if (!fs.existsSync(dirPath)) return [];
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.md'));
    return files.map(f => {
      const content = fs.readFileSync(path.join(dirPath, f), 'utf-8');
      return strategyFromMarkdown(content, level);
    });
  }

  findStrategies(goal: string, level: HierarchyLevel): Strategy[] {
    const all = this.getStrategiesForLevel(level);
    const goalLower = goal.toLowerCase();
    return all.filter(s =>
      s.triggerGoals.some(tg => goalLower.includes(tg.toLowerCase()))
    );
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

  rebuildIndex(): void {
    // No-op — local filesystem needs no index
  }
}

// =============================================================================
// Parsing utilities
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
          frontmatter[key] = val;
        }
      }
    }
  }

  // Title from frontmatter or markdown heading
  const title = (frontmatter.title as string)
    ?? (lines.find(l => l.startsWith('# '))?.slice(2) ?? 'Untitled').trim();

  // Parse ## Steps section for ordered steps
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
  const lines = [
    `# ${strategy.title}`,
    '',
    `**Level:** ${strategy.hierarchyLevel}`,
    `**Confidence:** ${strategy.confidence}`,
    '',
  ];
  if (strategy.steps.length > 0) {
    lines.push('## Steps');
    strategy.steps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
    lines.push('');
  }
  return lines.join('\n');
}

export function parseNegativeConstraints(content: string, context?: string): NegativeConstraint[] {
  const constraints: NegativeConstraint[] = [];
  const lines = content.split('\n');

  // Format 1: `- **severity**: description (context: ...)`
  for (const line of lines) {
    const match = line.match(/^-\s+\*\*(\w+)\*\*:\s+(.+?)(?:\s+\(context:\s+(.+?)\))?$/);
    if (match) {
      const severity = match[1].toLowerCase() as 'low' | 'medium' | 'high';
      const desc = match[2];
      const ctx = match[3] ?? '';
      if (!context || ctx.includes(context)) {
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
      const learnMatch = lines[j].match(/^\*\*Learned from:\*\*\s*(.+)/);
      if (learnMatch) learned.push(...learnMatch[1].split(',').map(s => s.trim()));
    }
    if (!context || ctx.includes(context)) {
      constraints.push({ description: desc, context: ctx, learnedFrom: learned, severity });
    }
  }

  return constraints;
}
