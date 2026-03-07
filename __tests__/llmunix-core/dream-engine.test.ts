/**
 * Tests for LLMunix Core DreamEngine.
 * Imports ONLY from src/llmunix-core/ (validates true decoupling).
 * Uses mock DreamDomainAdapter + mock InferenceFunction.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  DreamEngine,
  StrategyStore,
  HierarchicalTraceLogger,
  HierarchyLevel,
  TraceOutcome,
  TraceSource,
  TRACE_FIDELITY_WEIGHTS,
  type DreamDomainAdapter,
  type InferenceFunction,
  type ActionEntry,
  type Strategy,
} from '../../src/llmunix-core';

const TEST_DIR = path.join(__dirname, '__test_core_dream__');
const TRACES_DIR = path.join(TEST_DIR, 'traces');
const STRATEGIES_DIR = path.join(TEST_DIR, 'strategies');

function cleanup(): void {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

function createDirs(): void {
  fs.mkdirSync(TRACES_DIR, { recursive: true });
  for (const dir of ['level_1_goals', 'level_2_strategy', 'level_3_tactical', 'level_4_reactive', '_seeds']) {
    fs.mkdirSync(path.join(STRATEGIES_DIR, dir), { recursive: true });
  }
  fs.writeFileSync(path.join(STRATEGIES_DIR, '_negative_constraints.md'), '# Negative Constraints\n');
  fs.writeFileSync(path.join(STRATEGIES_DIR, '_dream_journal.md'), '# Dream Journal\n');
}

// =============================================================================
// Mock Adapter
// =============================================================================

const mockAdapter: DreamDomainAdapter = {
  compressActions(actions: ActionEntry[]): string {
    if (actions.length === 0) return '(no actions)';
    return `${actions.length} actions: ${actions.map(a => a.actionPayload).join(', ')}`;
  },

  failureAnalysisSystemPrompt: 'Analyze this failure.',
  strategyAbstractionSystemPrompt: 'Abstract this into a strategy.',
  strategyMergeSystemPrompt: 'Merge this with existing.',
  dreamSummarySystemPrompt: 'Summarize the dream session.',

  buildFailurePrompt(summary: string): string {
    return `Failed trace:\n${summary}`;
  },
  buildAbstractionPrompt(summary: string, level: HierarchyLevel): string {
    return `Success at level ${level}:\n${summary}`;
  },
  buildMergePrompt(existing: string, evidence: string): string {
    return `Existing:\n${existing}\n\nNew:\n${evidence}`;
  },
};

// =============================================================================
// Mock Inference
// =============================================================================

function createMockInference(): InferenceFunction {
  return async (systemPrompt: string, userMessage: string): Promise<string> => {
    if (systemPrompt.includes('failure') || systemPrompt.includes('Analyze')) {
      return JSON.stringify({
        description: 'Avoid repeating the failed approach',
        context: 'general',
        severity: 'medium',
      });
    }
    if (systemPrompt.includes('Abstract') || systemPrompt.includes('abstract')) {
      return JSON.stringify({
        title: 'Learned Pattern',
        trigger_goals: ['test', 'learn'],
        preconditions: ['input available'],
        steps: ['Analyze input', 'Apply pattern', 'Verify result'],
        negative_constraints: ['Do not skip verification'],
      });
    }
    if (systemPrompt.includes('Merge') || systemPrompt.includes('merge')) {
      return JSON.stringify({
        title: 'Updated Pattern',
        trigger_goals: ['test', 'learn', 'improve'],
        preconditions: ['input available'],
        steps: ['Analyze input', 'Apply improved pattern', 'Verify result'],
        negative_constraints: ['Do not skip verification'],
      });
    }
    // Dream summary
    return 'Learned 1 new pattern and identified 1 failure constraint.';
  };
}

describe('Core DreamEngine', () => {
  beforeEach(() => {
    cleanup();
    createDirs();
  });

  afterAll(cleanup);

  // ---------------------------------------------------------------------------
  // parseTraceFiles
  // ---------------------------------------------------------------------------

  describe('parseTraceFiles', () => {
    it('should return empty when no traces exist', () => {
      const store = new StrategyStore(STRATEGIES_DIR);
      const engine = new DreamEngine({
        adapter: mockAdapter,
        infer: createMockInference(),
        store,
        tracesDir: TRACES_DIR,
      });

      const traces = engine.parseTraceFiles();
      expect(traces).toHaveLength(0);
    });

    it('should parse core-format traces', () => {
      // Write a trace file in core format
      const logger = new HierarchicalTraceLogger(TRACES_DIR);
      const id = logger.startTrace(HierarchyLevel.REACTIVE, 'Test action');
      logger.appendAction(id, 'Analyzing data', 'process-data');
      logger.endTrace(id, TraceOutcome.SUCCESS, 'Completed', 0.8);

      const store = new StrategyStore(STRATEGIES_DIR);
      const engine = new DreamEngine({
        adapter: mockAdapter,
        infer: createMockInference(),
        store,
        tracesDir: TRACES_DIR,
      });

      const traces = engine.parseTraceFiles();
      expect(traces).toHaveLength(1);
      expect(traces[0].goal).toBe('Test action');
      expect(traces[0].outcome).toBe(TraceOutcome.SUCCESS);
      expect(traces[0].actions).toHaveLength(1);
      expect(traces[0].actions[0].reasoning).toBe('Analyzing data');
      expect(traces[0].actions[0].actionPayload).toBe('process-data');
    });
  });

  // ---------------------------------------------------------------------------
  // groupIntoSequences
  // ---------------------------------------------------------------------------

  describe('groupIntoSequences', () => {
    it('should group traces by parent', () => {
      const store = new StrategyStore(STRATEGIES_DIR);
      const engine = new DreamEngine({
        adapter: mockAdapter,
        infer: createMockInference(),
        store,
        tracesDir: TRACES_DIR,
      });

      const now = new Date().toISOString();
      const sequences = engine.groupIntoSequences([
        { timestamp: now, traceId: 'tr_1', level: HierarchyLevel.STRATEGY, parentTraceId: 'tr_0', goal: 'Sub-step A', source: TraceSource.UNKNOWN_SOURCE, outcome: TraceOutcome.SUCCESS, outcomeReason: null, durationMs: 100, confidence: 0.8, strategyId: null, actions: [] },
        { timestamp: now, traceId: 'tr_2', level: HierarchyLevel.STRATEGY, parentTraceId: 'tr_0', goal: 'Sub-step B', source: TraceSource.UNKNOWN_SOURCE, outcome: TraceOutcome.SUCCESS, outcomeReason: null, durationMs: 200, confidence: 0.9, strategyId: null, actions: [] },
      ]);

      expect(sequences).toHaveLength(1);
      expect(sequences[0].traces).toHaveLength(2);
    });

    it('should group ungrouped traces by goal + time', () => {
      const store = new StrategyStore(STRATEGIES_DIR);
      const engine = new DreamEngine({
        adapter: mockAdapter,
        infer: createMockInference(),
        store,
        tracesDir: TRACES_DIR,
      });

      const now = Date.now();
      const sequences = engine.groupIntoSequences([
        { timestamp: new Date(now).toISOString(), traceId: 'tr_1', level: HierarchyLevel.REACTIVE, parentTraceId: null, goal: 'Task A', source: TraceSource.UNKNOWN_SOURCE, outcome: TraceOutcome.SUCCESS, outcomeReason: null, durationMs: 100, confidence: 0.8, strategyId: null, actions: [] },
        { timestamp: new Date(now + 60000).toISOString(), traceId: 'tr_2', level: HierarchyLevel.REACTIVE, parentTraceId: null, goal: 'Task B', source: TraceSource.UNKNOWN_SOURCE, outcome: TraceOutcome.FAILURE, outcomeReason: null, durationMs: 200, confidence: 0.3, strategyId: null, actions: [] },
      ]);

      // Different goals → different sequences
      expect(sequences).toHaveLength(2);
    });
  });

  // ---------------------------------------------------------------------------
  // scoreSequences
  // ---------------------------------------------------------------------------

  describe('scoreSequences', () => {
    it('should score sequences by confidence, outcome, and recency', () => {
      const store = new StrategyStore(STRATEGIES_DIR);
      const engine = new DreamEngine({
        adapter: mockAdapter,
        infer: createMockInference(),
        store,
        tracesDir: TRACES_DIR,
      });

      const now = new Date().toISOString();
      const scored = engine.scoreSequences([
        {
          traces: [{ timestamp: now, traceId: 'tr_1', level: HierarchyLevel.REACTIVE, parentTraceId: null, goal: 'Good', source: TraceSource.UNKNOWN_SOURCE, outcome: TraceOutcome.SUCCESS, outcomeReason: null, durationMs: 1000, confidence: 0.9, strategyId: null, actions: [] }],
          goal: 'Good', outcome: TraceOutcome.SUCCESS, score: 0, level: HierarchyLevel.REACTIVE, source: TraceSource.UNKNOWN_SOURCE, fidelityWeight: TRACE_FIDELITY_WEIGHTS[TraceSource.UNKNOWN_SOURCE],
        },
        {
          traces: [{ timestamp: now, traceId: 'tr_2', level: HierarchyLevel.REACTIVE, parentTraceId: null, goal: 'Bad', source: TraceSource.UNKNOWN_SOURCE, outcome: TraceOutcome.FAILURE, outcomeReason: null, durationMs: 5000, confidence: 0.2, strategyId: null, actions: [] }],
          goal: 'Bad', outcome: TraceOutcome.FAILURE, score: 0, level: HierarchyLevel.REACTIVE, source: TraceSource.UNKNOWN_SOURCE, fidelityWeight: TRACE_FIDELITY_WEIGHTS[TraceSource.UNKNOWN_SOURCE],
        },
      ]);

      expect(scored[0].goal).toBe('Good');
      expect(scored[0].score).toBeGreaterThan(scored[1].score);
    });
  });

  // ---------------------------------------------------------------------------
  // Full dream cycle
  // ---------------------------------------------------------------------------

  describe('dream cycle', () => {
    it('should run a full dream with mock inference', async () => {
      // Generate synthetic traces
      const logger = new HierarchicalTraceLogger(TRACES_DIR);

      for (let i = 0; i < 3; i++) {
        const id = logger.startTrace(HierarchyLevel.REACTIVE, 'Test task');
        logger.appendAction(id, 'Performing action', `action-${i}`);
        logger.endTrace(id, TraceOutcome.SUCCESS, 'Done', 0.8);
      }

      // Add a failure trace
      const failId = logger.startTrace(HierarchyLevel.REACTIVE, 'Failing task');
      logger.appendAction(failId, 'This went wrong', 'bad-action');
      logger.endTrace(failId, TraceOutcome.FAILURE, 'Error occurred', 0.2);

      const store = new StrategyStore(STRATEGIES_DIR);
      const engine = new DreamEngine({
        adapter: mockAdapter,
        infer: createMockInference(),
        store,
        tracesDir: TRACES_DIR,
      });

      const result = await engine.dream();

      expect(result.tracesProcessed).toBe(4);
      expect(result.strategiesCreated.length).toBeGreaterThanOrEqual(1);
      expect(result.constraintsLearned.length).toBeGreaterThanOrEqual(1);
      expect(result.journalEntry.summary).toBeTruthy();

      // Verify strategies were saved to disk
      const strategies = store.getStrategiesForLevel(HierarchyLevel.REACTIVE);
      expect(strategies.length).toBeGreaterThanOrEqual(1);

      // Verify journal entry was written
      const lastTs = store.getLastDreamTimestamp();
      expect(lastTs).toBeTruthy();
    });

    it('should return empty result when no traces', async () => {
      const store = new StrategyStore(STRATEGIES_DIR);
      const engine = new DreamEngine({
        adapter: mockAdapter,
        infer: createMockInference(),
        store,
        tracesDir: TRACES_DIR,
      });

      const result = await engine.dream();
      expect(result.tracesProcessed).toBe(0);
      expect(result.strategiesCreated).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // summarizeSequence uses adapter
  // ---------------------------------------------------------------------------

  describe('summarizeSequence', () => {
    it('should use adapter.compressActions for summarization', () => {
      const store = new StrategyStore(STRATEGIES_DIR);
      const engine = new DreamEngine({
        adapter: mockAdapter,
        infer: createMockInference(),
        store,
        tracesDir: TRACES_DIR,
      });

      const summary = engine.summarizeSequence({
        traces: [{
          timestamp: new Date().toISOString(),
          traceId: 'tr_1',
          level: HierarchyLevel.REACTIVE,
          parentTraceId: null,
          goal: 'Test',
          source: TraceSource.REAL_WORLD,
          outcome: TraceOutcome.SUCCESS,
          outcomeReason: null,
          durationMs: 100,
          confidence: 0.9,
          strategyId: null,
          actions: [
            { timestamp: new Date().toISOString(), reasoning: 'R1', actionPayload: 'A1' },
            { timestamp: new Date().toISOString(), reasoning: 'R2', actionPayload: 'A2' },
          ],
        }],
        goal: 'Test',
        outcome: TraceOutcome.SUCCESS,
        score: 0.8,
        level: HierarchyLevel.REACTIVE,
        source: TraceSource.REAL_WORLD,
        fidelityWeight: TRACE_FIDELITY_WEIGHTS[TraceSource.REAL_WORLD],
      });

      expect(summary).toContain('Goal: Test');
      expect(summary).toContain('2 actions: A1, A2'); // from mockAdapter.compressActions
      expect(summary).toContain('Source: REAL_WORLD (fidelity: 1)');
    });
  });

  // ---------------------------------------------------------------------------
  // Fidelity-weighted scoring & consolidation
  // ---------------------------------------------------------------------------

  describe('fidelity weighting', () => {
    it('should score REAL_WORLD traces higher than DREAM_TEXT traces', () => {
      const store = new StrategyStore(STRATEGIES_DIR);
      const engine = new DreamEngine({
        adapter: mockAdapter,
        infer: createMockInference(),
        store,
        tracesDir: TRACES_DIR,
      });

      const now = new Date().toISOString();
      const scored = engine.scoreSequences([
        {
          traces: [{ timestamp: now, traceId: 'tr_rw', level: HierarchyLevel.REACTIVE, parentTraceId: null, goal: 'Real task', source: TraceSource.REAL_WORLD, outcome: TraceOutcome.SUCCESS, outcomeReason: null, durationMs: 1000, confidence: 0.8, strategyId: null, actions: [] }],
          goal: 'Real task', outcome: TraceOutcome.SUCCESS, score: 0, level: HierarchyLevel.REACTIVE,
          source: TraceSource.REAL_WORLD, fidelityWeight: TRACE_FIDELITY_WEIGHTS[TraceSource.REAL_WORLD],
        },
        {
          traces: [{ timestamp: now, traceId: 'tr_dt', level: HierarchyLevel.REACTIVE, parentTraceId: null, goal: 'Dream task', source: TraceSource.DREAM_TEXT, outcome: TraceOutcome.SUCCESS, outcomeReason: null, durationMs: 1000, confidence: 0.8, strategyId: null, actions: [] }],
          goal: 'Dream task', outcome: TraceOutcome.SUCCESS, score: 0, level: HierarchyLevel.REACTIVE,
          source: TraceSource.DREAM_TEXT, fidelityWeight: TRACE_FIDELITY_WEIGHTS[TraceSource.DREAM_TEXT],
        },
      ]);

      // REAL_WORLD (1.0) should score higher than DREAM_TEXT (0.3) with same confidence/outcome/duration
      expect(scored[0].goal).toBe('Real task');
      expect(scored[0].score).toBeGreaterThan(scored[1].score);
      // The ratio should approximately reflect the fidelity weight ratio
      expect(scored[0].score / scored[1].score).toBeCloseTo(1.0 / 0.3, 1);
    });

    it('should assign fidelityWeight from TRACE_FIDELITY_WEIGHTS when grouping', () => {
      const store = new StrategyStore(STRATEGIES_DIR);
      const engine = new DreamEngine({
        adapter: mockAdapter,
        infer: createMockInference(),
        store,
        tracesDir: TRACES_DIR,
      });

      const now = new Date().toISOString();
      const sequences = engine.groupIntoSequences([
        { timestamp: now, traceId: 'tr_1', level: HierarchyLevel.REACTIVE, parentTraceId: null, goal: 'Dream goal', source: TraceSource.DREAM_TEXT, outcome: TraceOutcome.SUCCESS, outcomeReason: null, durationMs: 100, confidence: 0.8, strategyId: null, actions: [] },
      ]);

      expect(sequences).toHaveLength(1);
      expect(sequences[0].source).toBe(TraceSource.DREAM_TEXT);
      expect(sequences[0].fidelityWeight).toBe(0.3);
    });

    it('should use highest-fidelity source as dominant source for mixed-source groups', () => {
      const store = new StrategyStore(STRATEGIES_DIR);
      const engine = new DreamEngine({
        adapter: mockAdapter,
        infer: createMockInference(),
        store,
        tracesDir: TRACES_DIR,
      });

      const now = new Date().toISOString();
      const sequences = engine.groupIntoSequences([
        { timestamp: now, traceId: 'tr_1', level: HierarchyLevel.STRATEGY, parentTraceId: 'parent_1', goal: 'Step A', source: TraceSource.DREAM_TEXT, outcome: TraceOutcome.SUCCESS, outcomeReason: null, durationMs: 100, confidence: 0.8, strategyId: null, actions: [] },
        { timestamp: now, traceId: 'tr_2', level: HierarchyLevel.STRATEGY, parentTraceId: 'parent_1', goal: 'Step B', source: TraceSource.SIM_3D, outcome: TraceOutcome.SUCCESS, outcomeReason: null, durationMs: 200, confidence: 0.9, strategyId: null, actions: [] },
      ]);

      expect(sequences).toHaveLength(1);
      // SIM_3D has higher fidelity than DREAM_TEXT, so it should be dominant
      expect(sequences[0].source).toBe(TraceSource.SIM_3D);
      expect(sequences[0].fidelityWeight).toBe(TRACE_FIDELITY_WEIGHTS[TraceSource.SIM_3D]);
    });

    it('should produce lower initial strategy confidence for dream-sourced traces', async () => {
      const traceLogger = new HierarchicalTraceLogger(TRACES_DIR);

      // Create a parent trace to group under (ensures correct SUCCESS outcome)
      const parentId = traceLogger.startTrace(HierarchyLevel.GOAL, 'Dream parent', {
        source: TraceSource.DREAM_TEXT,
      });

      // Generate dream-sourced child trace
      const id = traceLogger.startTrace(HierarchyLevel.REACTIVE, 'Dream task', {
        parentTraceId: parentId,
        source: TraceSource.DREAM_TEXT,
      });
      traceLogger.appendAction(id, 'Dreamed action', 'dream-action-1');
      traceLogger.endTrace(id, TraceOutcome.SUCCESS, 'Dream completed', 0.8);

      // End parent
      traceLogger.endTrace(parentId, TraceOutcome.SUCCESS, 'All done', 0.8);

      const store = new StrategyStore(STRATEGIES_DIR);
      const engine = new DreamEngine({
        adapter: mockAdapter,
        infer: createMockInference(),
        store,
        tracesDir: TRACES_DIR,
      });

      const result = await engine.dream();

      // Strategies from dream traces should have initial confidence = 0.5 * 0.3 = 0.15
      expect(result.strategiesCreated.length).toBeGreaterThanOrEqual(1);
      const dreamStrategy = result.strategiesCreated[0];
      expect(dreamStrategy.confidence).toBe(0.5 * TRACE_FIDELITY_WEIGHTS[TraceSource.DREAM_TEXT]);
    });

    it('should parse source from trace files correctly', () => {
      // Write a trace with a source tag
      const traceLogger = new HierarchicalTraceLogger(TRACES_DIR);
      const id = traceLogger.startTrace(HierarchyLevel.REACTIVE, 'SIM_3D task', {
        source: TraceSource.SIM_3D,
      });
      traceLogger.appendAction(id, 'Simulated action', 'sim-action');
      traceLogger.endTrace(id, TraceOutcome.SUCCESS, 'Done', 0.9);

      const store = new StrategyStore(STRATEGIES_DIR);
      const engine = new DreamEngine({
        adapter: mockAdapter,
        infer: createMockInference(),
        store,
        tracesDir: TRACES_DIR,
      });

      const traces = engine.parseTraceFiles();
      expect(traces.length).toBeGreaterThanOrEqual(1);
      const simTrace = traces.find(t => t.goal === 'SIM_3D task');
      expect(simTrace).toBeDefined();
      expect(simTrace!.source).toBe(TraceSource.SIM_3D);
    });

    it('should default to UNKNOWN_SOURCE for legacy traces without source tag', () => {
      // Write a trace file manually without **Source:** line
      const date = new Date().toISOString().split('T')[0];
      const tracePath = path.join(TRACES_DIR, `trace_${date}.md`);
      const legacyContent = `# Execution Traces: ${date}

### Time: ${new Date().toISOString()}
**Trace ID:** tr_legacy_1
**Level:** 4
**Goal:** Legacy action
**Outcome:** SUCCESS
**Reason:** Done
**Duration:** 500ms
**Confidence:** 0.7
**VLM Reasoning:** Old-style reasoning
**Compiled Bytecode:** \`AA 01 02 03 06 FF\`
---
`;

      if (!fs.existsSync(tracePath)) {
        fs.writeFileSync(tracePath, legacyContent);
      } else {
        fs.appendFileSync(tracePath, legacyContent);
      }

      const store = new StrategyStore(STRATEGIES_DIR);
      const engine = new DreamEngine({
        adapter: mockAdapter,
        infer: createMockInference(),
        store,
        tracesDir: TRACES_DIR,
      });

      const traces = engine.parseTraceFiles();
      const legacy = traces.find(t => t.goal === 'Legacy action');
      expect(legacy).toBeDefined();
      expect(legacy!.source).toBe(TraceSource.UNKNOWN_SOURCE);
    });

    it('should include source and fidelity in summarizeSequence output', () => {
      const store = new StrategyStore(STRATEGIES_DIR);
      const engine = new DreamEngine({
        adapter: mockAdapter,
        infer: createMockInference(),
        store,
        tracesDir: TRACES_DIR,
      });

      const summary = engine.summarizeSequence({
        traces: [{
          timestamp: new Date().toISOString(),
          traceId: 'tr_sim',
          level: HierarchyLevel.REACTIVE,
          parentTraceId: null,
          goal: 'Sim task',
          source: TraceSource.SIM_3D,
          outcome: TraceOutcome.SUCCESS,
          outcomeReason: null,
          durationMs: 100,
          confidence: 0.9,
          strategyId: null,
          actions: [],
        }],
        goal: 'Sim task',
        outcome: TraceOutcome.SUCCESS,
        score: 0.5,
        level: HierarchyLevel.REACTIVE,
        source: TraceSource.SIM_3D,
        fidelityWeight: TRACE_FIDELITY_WEIGHTS[TraceSource.SIM_3D],
      });

      expect(summary).toContain('Source: SIM_3D (fidelity: 0.8)');
    });

    it('should verify TRACE_FIDELITY_WEIGHTS cover all TraceSource values', () => {
      for (const source of Object.values(TraceSource)) {
        expect(TRACE_FIDELITY_WEIGHTS[source]).toBeDefined();
        expect(TRACE_FIDELITY_WEIGHTS[source]).toBeGreaterThan(0);
        expect(TRACE_FIDELITY_WEIGHTS[source]).toBeLessThanOrEqual(1);
      }
    });

    it('should maintain correct fidelity weight ordering', () => {
      expect(TRACE_FIDELITY_WEIGHTS[TraceSource.REAL_WORLD]).toBeGreaterThan(TRACE_FIDELITY_WEIGHTS[TraceSource.SIM_3D]);
      expect(TRACE_FIDELITY_WEIGHTS[TraceSource.SIM_3D]).toBeGreaterThan(TRACE_FIDELITY_WEIGHTS[TraceSource.SIM_2D]);
      expect(TRACE_FIDELITY_WEIGHTS[TraceSource.SIM_2D]).toBeGreaterThan(TRACE_FIDELITY_WEIGHTS[TraceSource.DREAM_TEXT]);
    });
  });
});
