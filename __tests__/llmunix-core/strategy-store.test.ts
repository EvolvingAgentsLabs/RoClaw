/**
 * Tests for LLMunix Core StrategyStore.
 * Imports ONLY from src/llmunix-core/ (validates true decoupling).
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  StrategyStore,
  HierarchyLevel,
  type Strategy,
  type NegativeConstraint,
} from '../../src/llmunix-core';

const TEST_STRATEGIES_DIR = path.join(__dirname, '__test_core_strategies__');

function cleanup(): void {
  if (fs.existsSync(TEST_STRATEGIES_DIR)) {
    fs.rmSync(TEST_STRATEGIES_DIR, { recursive: true, force: true });
  }
}

function createDirStructure(): void {
  // Core uses generic dir names by default
  for (const dir of ['level_1_goals', 'level_2_strategy', 'level_3_tactical', 'level_4_reactive', '_seeds']) {
    fs.mkdirSync(path.join(TEST_STRATEGIES_DIR, dir), { recursive: true });
  }
  fs.writeFileSync(path.join(TEST_STRATEGIES_DIR, '_negative_constraints.md'), '# Negative Constraints\n');
  fs.writeFileSync(path.join(TEST_STRATEGIES_DIR, '_dream_journal.md'), '# Dream Journal\n');
}

function makeStore(): StrategyStore {
  return new StrategyStore(TEST_STRATEGIES_DIR);
}

function writeSeedStrategy(): void {
  const content = `---
id: seed_4_pattern-match
version: 1
level: 4
title: Pattern Matching
trigger_goals: ["match", "pattern", "detect"]
preconditions: ["input available"]
confidence: 0.3
success_count: 0
failure_count: 0
source_traces: []
deprecated: false
---

# Pattern Matching

## Steps

1. Analyze input data
2. Compare against known patterns
3. Report match result

## Negative Constraints

- Do not match without sufficient confidence
`;
  fs.writeFileSync(
    path.join(TEST_STRATEGIES_DIR, '_seeds', 'seed_4_pattern-match.md'),
    content,
  );
}

describe('Core StrategyStore', () => {
  beforeEach(() => {
    cleanup();
    createDirStructure();
  });

  afterAll(cleanup);

  it('should report available when directory exists', () => {
    expect(makeStore().isAvailable()).toBe(true);
  });

  it('should report unavailable when directory missing', () => {
    cleanup();
    expect(makeStore().isAvailable()).toBe(false);
  });

  it('should return empty array when no strategies exist', () => {
    expect(makeStore().getStrategiesForLevel(HierarchyLevel.GOAL)).toEqual([]);
  });

  it('should use generic default level dirs', () => {
    const strategy: Strategy = {
      id: 'strat_2_test',
      version: 1,
      hierarchyLevel: HierarchyLevel.STRATEGY,
      title: 'Test',
      preconditions: [],
      triggerGoals: ['test'],
      steps: ['Do test'],
      negativeConstraints: [],
      confidence: 0.5,
      successCount: 0,
      failureCount: 0,
      sourceTraceIds: [],
      deprecated: false,
    };

    const store = makeStore();
    store.saveStrategy(strategy);

    // Should be saved in level_2_strategy/ (generic default)
    const filePath = path.join(TEST_STRATEGIES_DIR, 'level_2_strategy', 'strat_2_test.md');
    expect(fs.existsSync(filePath)).toBe(true);

    const loaded = store.getStrategiesForLevel(HierarchyLevel.STRATEGY);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('strat_2_test');
  });

  it('should support configurable level dirs', () => {
    const store = new StrategyStore({
      strategiesDir: TEST_STRATEGIES_DIR,
      levelDirs: {
        [HierarchyLevel.STRATEGY]: 'level_2_custom',
      },
    });

    // Create the custom dir
    fs.mkdirSync(path.join(TEST_STRATEGIES_DIR, 'level_2_custom'), { recursive: true });

    const strategy: Strategy = {
      id: 'strat_2_custom',
      version: 1,
      hierarchyLevel: HierarchyLevel.STRATEGY,
      title: 'Custom Dir Strategy',
      preconditions: [],
      triggerGoals: ['custom'],
      steps: ['Custom step'],
      negativeConstraints: [],
      confidence: 0.6,
      successCount: 0,
      failureCount: 0,
      sourceTraceIds: [],
      deprecated: false,
    };

    store.saveStrategy(strategy);

    const filePath = path.join(TEST_STRATEGIES_DIR, 'level_2_custom', 'strat_2_custom.md');
    expect(fs.existsSync(filePath)).toBe(true);

    const loaded = store.getStrategiesForLevel(HierarchyLevel.STRATEGY);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('strat_2_custom');
  });

  it('should read seed strategies', () => {
    writeSeedStrategy();
    const store = makeStore();
    const strategies = store.getStrategiesForLevel(HierarchyLevel.REACTIVE);
    expect(strategies).toHaveLength(1);
    expect(strategies[0].id).toBe('seed_4_pattern-match');
    expect(strategies[0].steps).toHaveLength(3);
    expect(strategies[0].negativeConstraints).toHaveLength(1);
  });

  it('should filter out deprecated strategies', () => {
    const content = `---
id: old_strat
version: 1
level: 4
title: Old Strategy
trigger_goals: ["test"]
confidence: 0.1
deprecated: true
---

# Old Strategy

## Steps

1. Do something old
`;
    fs.writeFileSync(path.join(TEST_STRATEGIES_DIR, 'level_4_reactive', 'old_strat.md'), content);

    expect(makeStore().getStrategiesForLevel(HierarchyLevel.REACTIVE)).toHaveLength(0);
  });

  it('should find strategies by keyword match with composite scoring', () => {
    writeSeedStrategy();
    const store = makeStore();
    const found = store.findStrategies('detect the pattern in data', HierarchyLevel.REACTIVE);
    expect(found).toHaveLength(1);
    expect(found[0].id).toBe('seed_4_pattern-match');
  });

  it('should return empty for non-matching goal', () => {
    writeSeedStrategy();
    expect(makeStore().findStrategies('dance in a circle', HierarchyLevel.REACTIVE)).toHaveLength(0);
  });

  it('should save and reload a strategy', () => {
    const store = makeStore();
    const strategy: Strategy = {
      id: 'strat_3_test',
      version: 1,
      hierarchyLevel: HierarchyLevel.TACTICAL,
      title: 'Test Strategy',
      preconditions: ['path clear'],
      triggerGoals: ['navigate', 'move'],
      steps: ['Check path', 'Move forward', 'Verify arrival'],
      negativeConstraints: ['Do not bump walls'],
      confidence: 0.7,
      successCount: 3,
      failureCount: 1,
      sourceTraceIds: ['tr_abc', 'tr_def'],
      deprecated: false,
    };

    store.saveStrategy(strategy);

    const reloaded = store.getStrategiesForLevel(HierarchyLevel.TACTICAL);
    expect(reloaded).toHaveLength(1);
    expect(reloaded[0].id).toBe('strat_3_test');
    expect(reloaded[0].title).toBe('Test Strategy');
    expect(reloaded[0].steps).toHaveLength(3);
    expect(reloaded[0].confidence).toBe(0.7);
  });

  it('should save and read negative constraints', () => {
    const store = makeStore();
    const constraint: NegativeConstraint = {
      description: 'Do not process without validation',
      context: 'data pipeline',
      learnedFrom: ['tr_123'],
      severity: 'high',
    };

    store.saveNegativeConstraint(constraint);

    const loaded = store.getNegativeConstraints();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].description).toBe('Do not process without validation');
    expect(loaded[0].severity).toBe('high');
  });

  it('should filter constraints by context', () => {
    const store = makeStore();
    store.saveNegativeConstraint({
      description: 'Avoid timeout',
      context: 'network',
      learnedFrom: [],
      severity: 'medium',
    });
    store.saveNegativeConstraint({
      description: 'General caution',
      context: 'general',
      learnedFrom: [],
      severity: 'low',
    });

    const network = store.getNegativeConstraints('network');
    expect(network).toHaveLength(2); // network + general
  });

  it('should reinforce strategy', () => {
    writeSeedStrategy();
    const store = makeStore();
    store.reinforceStrategy('seed_4_pattern-match');

    const strategies = store.getStrategiesForLevel(HierarchyLevel.REACTIVE);
    const reinforced = strategies.find(s => s.id === 'seed_4_pattern-match');
    expect(reinforced).toBeDefined();
    expect(reinforced!.successCount).toBe(1);
    expect(reinforced!.confidence).toBeGreaterThan(0.3);
  });

  it('should decay unused strategies', () => {
    const store = makeStore();
    const strategy: Strategy = {
      id: 'strat_4_decay',
      version: 1,
      hierarchyLevel: HierarchyLevel.REACTIVE,
      title: 'Decay Test',
      preconditions: [],
      triggerGoals: ['decay'],
      steps: ['Step'],
      negativeConstraints: [],
      confidence: 0.8,
      successCount: 2,
      failureCount: 0,
      sourceTraceIds: ['tr_evidence'],
      deprecated: false,
    };

    store.saveStrategy(strategy);
    const decayed = store.decayUnusedStrategies(30);
    expect(decayed).toBeGreaterThanOrEqual(1);

    const updated = store.findStrategyById('strat_4_decay');
    expect(updated!.confidence).toBeLessThan(0.8);
  });

  it('should append and read dream journal', () => {
    const store = makeStore();
    store.appendDreamJournal({
      timestamp: '2026-03-01T10:00:00.000Z',
      tracesProcessed: 15,
      strategiesCreated: 2,
      strategiesUpdated: 1,
      constraintsLearned: 3,
      tracesPruned: 10,
      summary: 'Learned patterns.',
    });

    expect(store.getLastDreamTimestamp()).toBe('2026-03-01T10:00:00.000Z');
  });

  it('should find strategy by ID across levels', () => {
    writeSeedStrategy();
    const found = makeStore().findStrategyById('seed_4_pattern-match');
    expect(found).not.toBeNull();
    expect(found!.title).toBe('Pattern Matching');
  });

  it('should return summary for populated levels', () => {
    writeSeedStrategy();
    const summary = makeStore().getSummaryForLevel(HierarchyLevel.REACTIVE);
    expect(summary).toContain('Pattern Matching');
    expect(summary).toContain('confidence');
  });
});
