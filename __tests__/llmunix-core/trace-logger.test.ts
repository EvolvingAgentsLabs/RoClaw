/**
 * Tests for LLMunix Core HierarchicalTraceLogger with appendAction.
 * Imports ONLY from src/llmunix-core/ (validates true decoupling).
 * No Buffer, no formatHex — pure generic trace logging.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  HierarchicalTraceLogger,
  HierarchyLevel,
  TraceOutcome,
} from '../../src/llmunix-core';

const TEST_TRACES_DIR = path.join(__dirname, '__test_core_traces__');

function cleanup(): void {
  if (fs.existsSync(TEST_TRACES_DIR)) {
    fs.rmSync(TEST_TRACES_DIR, { recursive: true, force: true });
  }
}

describe('Core HierarchicalTraceLogger', () => {
  let logger: HierarchicalTraceLogger;

  beforeEach(() => {
    cleanup();
    logger = new HierarchicalTraceLogger(TEST_TRACES_DIR);
  });

  afterAll(cleanup);

  // ---------------------------------------------------------------------------
  // startTrace
  // ---------------------------------------------------------------------------

  it('should create a trace and return a valid ID', () => {
    const id = logger.startTrace(HierarchyLevel.GOAL, 'Solve puzzle');
    expect(id).toMatch(/^tr_/);
    expect(logger.getActiveTraceCount()).toBe(1);
  });

  it('should create traces at all hierarchy levels', () => {
    const id1 = logger.startTrace(HierarchyLevel.GOAL, 'Main goal');
    const id2 = logger.startTrace(HierarchyLevel.STRATEGY, 'Strategic step', {
      parentTraceId: id1,
    });
    const id3 = logger.startTrace(HierarchyLevel.TACTICAL, 'Tactical step', {
      parentTraceId: id2,
    });
    const id4 = logger.startTrace(HierarchyLevel.REACTIVE, 'Reactive action', {
      parentTraceId: id3,
    });

    expect(logger.getActiveTraceCount()).toBe(4);

    const goal = logger.getActiveTrace(id1)!;
    expect(goal.hierarchyLevel).toBe(HierarchyLevel.GOAL);
    expect(goal.parentTraceId).toBeNull();

    const strat = logger.getActiveTrace(id2)!;
    expect(strat.hierarchyLevel).toBe(HierarchyLevel.STRATEGY);
    expect(strat.parentTraceId).toBe(id1);

    const tact = logger.getActiveTrace(id3)!;
    expect(tact.parentTraceId).toBe(id2);

    const react = logger.getActiveTrace(id4)!;
    expect(react.parentTraceId).toBe(id3);
  });

  it('should accept optional fields in startTrace', () => {
    const id = logger.startTrace(HierarchyLevel.TACTICAL, 'Process data', {
      locationNode: 'node-A',
      sceneDescription: 'Data processing context',
      activeStrategyId: 'strat_3_pipeline',
    });

    const trace = logger.getActiveTrace(id)!;
    expect(trace.locationNode).toBe('node-A');
    expect(trace.sceneDescription).toBe('Data processing context');
    expect(trace.activeStrategyId).toBe('strat_3_pipeline');
  });

  // ---------------------------------------------------------------------------
  // appendAction (generic — no Buffer, no formatHex)
  // ---------------------------------------------------------------------------

  it('should append action entries to an active trace', () => {
    const id = logger.startTrace(HierarchyLevel.REACTIVE, 'Handle event');

    logger.appendAction(id, 'Event detected, responding', '{"type":"respond","target":"event-1"}');
    logger.appendAction(id, 'Follow-up action', '{"type":"acknowledge"}');

    const trace = logger.getActiveTrace(id)!;
    expect(trace.actionEntries).toHaveLength(2);
    expect(trace.actionEntries[0].reasoning).toBe('Event detected, responding');
    expect(trace.actionEntries[0].actionPayload).toBe('{"type":"respond","target":"event-1"}');
    expect(trace.actionEntries[1].reasoning).toBe('Follow-up action');
  });

  it('should handle appendAction for unknown trace gracefully', () => {
    // Should not throw
    logger.appendAction('tr_nonexistent', 'test', 'payload');
  });

  // ---------------------------------------------------------------------------
  // endTrace
  // ---------------------------------------------------------------------------

  it('should end a trace and write to disk', () => {
    const id = logger.startTrace(HierarchyLevel.GOAL, 'Complete task');
    logger.appendAction(id, 'Working on task', 'action-data');
    logger.endTrace(id, TraceOutcome.SUCCESS, 'Task completed', 0.9);

    expect(logger.getActiveTraceCount()).toBe(0);

    const files = fs.readdirSync(TEST_TRACES_DIR).filter(f => f.startsWith('trace_'));
    expect(files.length).toBeGreaterThan(0);

    const content = fs.readFileSync(path.join(TEST_TRACES_DIR, files[0]), 'utf-8');
    expect(content).toContain('**Trace ID:**');
    expect(content).toContain('**Level:** 1');
    expect(content).toContain('**Goal:** Complete task');
    expect(content).toContain('**Outcome:** SUCCESS');
    expect(content).toContain('**Reason:** Task completed');
    expect(content).toContain('**Confidence:** 0.9');
    expect(content).toContain('**Reasoning:** Working on task');
    expect(content).toContain('`action-data`');
  });

  it('should write with parent trace ID', () => {
    const parentId = logger.startTrace(HierarchyLevel.GOAL, 'Main goal');
    logger.endTrace(parentId, TraceOutcome.SUCCESS);

    const childId = logger.startTrace(HierarchyLevel.STRATEGY, 'Sub goal', {
      parentTraceId: parentId,
    });
    logger.endTrace(childId, TraceOutcome.PARTIAL, 'Blocked');

    const files = fs.readdirSync(TEST_TRACES_DIR).filter(f => f.startsWith('trace_'));
    const content = fs.readFileSync(path.join(TEST_TRACES_DIR, files[0]), 'utf-8');
    expect(content).toContain(`**Parent:** ${parentId}`);
    expect(content).toContain('**Outcome:** PARTIAL');
  });

  it('should handle endTrace for unknown ID gracefully', () => {
    logger.endTrace('tr_ghost', TraceOutcome.ABORTED);
  });

  it('should record duration on endTrace', () => {
    const id = logger.startTrace(HierarchyLevel.REACTIVE, 'Quick action');

    const start = Date.now();
    while (Date.now() - start < 5) { /* spin */ }

    logger.endTrace(id, TraceOutcome.SUCCESS);

    const files = fs.readdirSync(TEST_TRACES_DIR).filter(f => f.startsWith('trace_'));
    const content = fs.readFileSync(path.join(TEST_TRACES_DIR, files[0]), 'utf-8');
    expect(content).toContain('**Duration:**');
  });

  // ---------------------------------------------------------------------------
  // Multiple concurrent traces
  // ---------------------------------------------------------------------------

  it('should handle multiple concurrent active traces', () => {
    const id1 = logger.startTrace(HierarchyLevel.GOAL, 'Task A');
    const id2 = logger.startTrace(HierarchyLevel.GOAL, 'Task B');

    logger.appendAction(id1, 'Working on A', 'action-A');
    logger.appendAction(id2, 'Working on B', 'action-B');

    const traceA = logger.getActiveTrace(id1)!;
    const traceB = logger.getActiveTrace(id2)!;

    expect(traceA.actionEntries).toHaveLength(1);
    expect(traceB.actionEntries).toHaveLength(1);
    expect(traceA.actionEntries[0].reasoning).toBe('Working on A');
    expect(traceB.actionEntries[0].reasoning).toBe('Working on B');

    logger.endTrace(id1, TraceOutcome.SUCCESS);
    logger.endTrace(id2, TraceOutcome.FAILURE, 'Blocked');

    expect(logger.getActiveTraceCount()).toBe(0);
  });
});
