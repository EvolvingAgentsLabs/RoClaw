/**
 * RoClaw Dreaming Engine v1 — Pattern extraction from execution traces
 *
 * Reads trace files, extracts recurring opcode patterns, and promotes
 * them to skill files in src/3_llmunix_memory/skills/.
 *
 * Usage: npm run dream
 */

import * as fs from 'fs';
import * as path from 'path';

// =============================================================================
// Configuration
// =============================================================================

const TRACES_DIR = path.join(__dirname, '..', 'src', '3_llmunix_memory', 'traces');
const SKILLS_DIR = path.join(__dirname, '..', 'src', '3_llmunix_memory', 'skills');
const WINDOW_SIZE = 3;        // Sliding window size for pattern detection
const MIN_OCCURRENCES = 3;    // Minimum times a pattern must appear to become a skill

// =============================================================================
// Types
// =============================================================================

interface TraceEntry {
  timestamp: string;
  goal: string;
  bytecode: string;
}

interface OpcodePattern {
  opcodes: string[];
  count: number;
  goals: Set<string>;
}

// =============================================================================
// Opcode Names (mirror of bytecode_compiler.ts ISA)
// =============================================================================

const OPCODE_NAMES: Record<string, string> = {
  '01': 'MOVE_FORWARD',
  '02': 'MOVE_BACKWARD',
  '03': 'TURN_LEFT',
  '04': 'TURN_RIGHT',
  '05': 'ROTATE_CW',
  '06': 'ROTATE_CCW',
  '07': 'STOP',
  '08': 'GET_STATUS',
  '09': 'SET_SPEED',
  '0A': 'MOVE_STEPS',
  '0B': 'MOVE_STEPS_R',
  '10': 'LED_SET',
  'FE': 'RESET',
};

function opcodeToName(hex: string): string {
  return OPCODE_NAMES[hex.toUpperCase()] ?? `UNKNOWN(0x${hex})`;
}

// =============================================================================
// Parse Traces
// =============================================================================

function parseTraceFiles(): TraceEntry[] {
  if (!fs.existsSync(TRACES_DIR)) {
    console.log('No traces directory found. Run the robot first to generate traces.');
    return [];
  }

  const files = fs.readdirSync(TRACES_DIR)
    .filter(f => f.startsWith('trace_') && f.endsWith('.md'))
    .sort();

  if (files.length === 0) {
    console.log('No trace files found.');
    return [];
  }

  console.log(`Found ${files.length} trace file(s)`);

  const entries: TraceEntry[] = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(TRACES_DIR, file), 'utf-8');

    // Parse each trace entry block
    const blocks = content.split('---').filter(b => b.trim());
    for (const block of blocks) {
      const timestampMatch = block.match(/### Time:\s*(.+)/);
      const goalMatch = block.match(/\*\*Goal:\*\*\s*(.+)/);
      const bytecodeMatch = block.match(/\*\*Compiled Bytecode:\*\*\s*`(.+?)`/);

      if (timestampMatch && goalMatch && bytecodeMatch) {
        entries.push({
          timestamp: timestampMatch[1].trim(),
          goal: goalMatch[1].trim(),
          bytecode: bytecodeMatch[1].trim(),
        });
      }
    }
  }

  console.log(`Parsed ${entries.length} trace entries`);
  return entries;
}

// =============================================================================
// Extract Opcode Sequences
// =============================================================================

function extractOpcodeSequences(entries: TraceEntry[]): Map<string, string[]> {
  // Group entries by goal, extract opcode byte (byte index 1 in "AA XX ...")
  const goalSequences = new Map<string, string[]>();

  for (const entry of entries) {
    const parts = entry.bytecode.split(' ');
    if (parts.length >= 6 && parts[0] === 'AA' && parts[5] === 'FF') {
      const opcode = parts[1];
      const existing = goalSequences.get(entry.goal) ?? [];
      existing.push(opcode);
      goalSequences.set(entry.goal, existing);
    }
  }

  return goalSequences;
}

// =============================================================================
// Find Patterns (3-command sliding window)
// =============================================================================

function findPatterns(goalSequences: Map<string, string[]>): OpcodePattern[] {
  const patternCounts = new Map<string, OpcodePattern>();

  for (const [goal, opcodes] of goalSequences) {
    if (opcodes.length < WINDOW_SIZE) continue;

    for (let i = 0; i <= opcodes.length - WINDOW_SIZE; i++) {
      const window = opcodes.slice(i, i + WINDOW_SIZE);
      const key = window.join('-');

      const existing = patternCounts.get(key);
      if (existing) {
        existing.count++;
        existing.goals.add(goal);
      } else {
        patternCounts.set(key, {
          opcodes: window,
          count: 1,
          goals: new Set([goal]),
        });
      }
    }
  }

  // Filter to patterns meeting threshold
  return Array.from(patternCounts.values())
    .filter(p => p.count >= MIN_OCCURRENCES)
    .sort((a, b) => b.count - a.count);
}

// =============================================================================
// Generate Skill Files
// =============================================================================

function generateSkillName(opcodes: string[]): string {
  const names = opcodes.map(opcodeToName);
  return names.join('-then-').toLowerCase().replace(/[^a-z0-9-]/g, '');
}

function generateSkillFile(pattern: OpcodePattern): string {
  const names = pattern.opcodes.map(opcodeToName);
  const title = names.join(' → ');
  const goals = Array.from(pattern.goals).slice(0, 5);

  return `# Skill: ${title}

## When to use
When the goal involves: ${goals.join(', ')}

## Procedure
${names.map((name, i) => `${i + 1}. Execute ${name}`).join('\n')}

## Pattern confidence
Observed ${pattern.count} times across ${pattern.goals.size} goal(s).

## Learned from
Dreaming Engine v1, ${new Date().toISOString().split('T')[0]}
Extracted from execution traces via ${WINDOW_SIZE}-command sliding window analysis.
`;
}

function writeSkills(patterns: OpcodePattern[]): number {
  if (!fs.existsSync(SKILLS_DIR)) {
    fs.mkdirSync(SKILLS_DIR, { recursive: true });
  }

  let written = 0;
  for (const pattern of patterns) {
    const name = generateSkillName(pattern.opcodes);
    const filePath = path.join(SKILLS_DIR, `${name}.md`);

    // Don't overwrite existing skills
    if (fs.existsSync(filePath)) {
      console.log(`  Skill already exists: ${name}.md (skipping)`);
      continue;
    }

    const content = generateSkillFile(pattern);
    fs.writeFileSync(filePath, content);
    console.log(`  Created skill: ${name}.md (${pattern.count} occurrences)`);
    written++;
  }

  return written;
}

// =============================================================================
// Main
// =============================================================================

function main(): void {
  console.log('=== RoClaw Dreaming Engine v1 ===\n');

  // 1. Parse traces
  const entries = parseTraceFiles();
  if (entries.length === 0) {
    console.log('\nNothing to dream about. Go explore first!');
    return;
  }

  // 2. Extract opcode sequences per goal
  const goalSequences = extractOpcodeSequences(entries);
  console.log(`\nExtracted sequences for ${goalSequences.size} unique goal(s)`);

  // 3. Find recurring patterns
  const patterns = findPatterns(goalSequences);
  console.log(`Found ${patterns.length} recurring pattern(s) (>= ${MIN_OCCURRENCES} occurrences)\n`);

  if (patterns.length === 0) {
    console.log('No patterns met the threshold. More traces needed.');
    return;
  }

  // 4. Report patterns
  for (const p of patterns) {
    const names = p.opcodes.map(opcodeToName);
    console.log(`  ${names.join(' → ')} — ${p.count}x across ${p.goals.size} goal(s)`);
  }

  // 5. Generate skill files
  console.log('\nPromoting patterns to skills...');
  const written = writeSkills(patterns);
  console.log(`\nDone! ${written} new skill(s) created in ${SKILLS_DIR}`);
}

main();
