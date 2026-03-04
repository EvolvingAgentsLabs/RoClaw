/**
 * Tests for LLMunix Core types — enum values and type shapes.
 * Imports ONLY from src/llmunix-core/ (validates true decoupling).
 */

import {
  HierarchyLevel,
  TraceOutcome,
  type ActionEntry,
  type HierarchicalTraceEntry,
  type Strategy,
  type NegativeConstraint,
  type DreamJournalEntry,
} from '../../src/llmunix-core';

describe('LLMunix Core Types', () => {
  describe('HierarchyLevel', () => {
    it('should have 4 levels with correct numeric values', () => {
      expect(HierarchyLevel.GOAL).toBe(1);
      expect(HierarchyLevel.STRATEGY).toBe(2);
      expect(HierarchyLevel.TACTICAL).toBe(3);
      expect(HierarchyLevel.REACTIVE).toBe(4);
    });

    it('should allow reverse mapping from number to name', () => {
      expect(HierarchyLevel[1]).toBe('GOAL');
      expect(HierarchyLevel[2]).toBe('STRATEGY');
      expect(HierarchyLevel[3]).toBe('TACTICAL');
      expect(HierarchyLevel[4]).toBe('REACTIVE');
    });
  });

  describe('TraceOutcome', () => {
    it('should have all 5 outcome values', () => {
      expect(TraceOutcome.SUCCESS).toBe('SUCCESS');
      expect(TraceOutcome.FAILURE).toBe('FAILURE');
      expect(TraceOutcome.PARTIAL).toBe('PARTIAL');
      expect(TraceOutcome.ABORTED).toBe('ABORTED');
      expect(TraceOutcome.UNKNOWN).toBe('UNKNOWN');
    });
  });

  describe('ActionEntry', () => {
    it('should accept a valid shape', () => {
      const entry: ActionEntry = {
        timestamp: '2026-03-01T12:00:00.000Z',
        reasoning: 'Clear path ahead',
        actionPayload: '{"type":"move","speed":0.5}',
      };
      expect(entry.reasoning).toBe('Clear path ahead');
      expect(entry.actionPayload).toContain('move');
    });
  });

  describe('HierarchicalTraceEntry', () => {
    it('should accept a valid shape with actionEntries', () => {
      const entry: HierarchicalTraceEntry = {
        traceId: 'tr_test_1234',
        hierarchyLevel: HierarchyLevel.GOAL,
        parentTraceId: null,
        timestamp: '2026-03-01T12:00:00.000Z',
        goal: 'Complete task',
        locationNode: null,
        sceneDescription: null,
        activeStrategyId: null,
        outcome: TraceOutcome.UNKNOWN,
        outcomeReason: null,
        durationMs: null,
        confidence: null,
        actionEntries: [],
      };
      expect(entry.traceId).toBe('tr_test_1234');
      expect(entry.actionEntries).toHaveLength(0);
    });
  });

  describe('Strategy', () => {
    it('should accept a valid shape', () => {
      const strategy: Strategy = {
        id: 'strat_1_test',
        version: 1,
        hierarchyLevel: HierarchyLevel.GOAL,
        title: 'Test Strategy',
        preconditions: ['condition A'],
        triggerGoals: ['goal A'],
        steps: ['step 1'],
        negativeConstraints: [],
        confidence: 0.5,
        successCount: 0,
        failureCount: 0,
        sourceTraceIds: [],
        deprecated: false,
      };
      expect(strategy.id).toBe('strat_1_test');
    });
  });

  describe('NegativeConstraint', () => {
    it('should accept valid severity values', () => {
      const low: NegativeConstraint = { description: 'A', context: 'B', learnedFrom: [], severity: 'low' };
      const med: NegativeConstraint = { description: 'A', context: 'B', learnedFrom: [], severity: 'medium' };
      const high: NegativeConstraint = { description: 'A', context: 'B', learnedFrom: [], severity: 'high' };
      expect(low.severity).toBe('low');
      expect(med.severity).toBe('medium');
      expect(high.severity).toBe('high');
    });
  });

  describe('DreamJournalEntry', () => {
    it('should accept a valid shape', () => {
      const entry: DreamJournalEntry = {
        timestamp: '2026-03-01T12:00:00.000Z',
        tracesProcessed: 10,
        strategiesCreated: 2,
        strategiesUpdated: 1,
        constraintsLearned: 3,
        tracesPruned: 5,
        summary: 'Test summary',
      };
      expect(entry.tracesProcessed).toBe(10);
    });
  });
});
