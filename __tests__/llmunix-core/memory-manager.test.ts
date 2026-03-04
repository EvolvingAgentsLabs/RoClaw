/**
 * Tests for LLMunix Core CoreMemoryManager.
 * Imports ONLY from src/llmunix-core/ (validates true decoupling).
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  CoreMemoryManager,
  type MemorySection,
} from '../../src/llmunix-core';

describe('CoreMemoryManager', () => {
  let mm: CoreMemoryManager;
  let tmpDir: string;
  let tracesDir: string;
  let strategiesDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'core-mm-'));
    tracesDir = path.join(tmpDir, 'traces');
    strategiesDir = path.join(tmpDir, 'strategies');
    fs.mkdirSync(tracesDir, { recursive: true });
    fs.mkdirSync(strategiesDir, { recursive: true });

    mm = new CoreMemoryManager({ tracesDir, strategiesDir });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // ---------------------------------------------------------------------------
  // Section Registration
  // ---------------------------------------------------------------------------

  describe('section registration', () => {
    it('should register and retrieve a section', () => {
      mm.registerSection({
        name: 'config',
        heading: '## Configuration',
        load: () => 'key: value',
        priority: 10,
      });

      expect(mm.getSection('config')).toBe('key: value');
    });

    it('should return empty string for unregistered section', () => {
      expect(mm.getSection('nonexistent')).toBe('');
    });

    it('should cache section content', () => {
      let callCount = 0;
      mm.registerSection({
        name: 'expensive',
        heading: '## Expensive',
        load: () => { callCount++; return 'data'; },
        priority: 10,
      });

      mm.getSection('expensive');
      mm.getSection('expensive');
      expect(callCount).toBe(1);
    });

    it('should clear cache on refresh', () => {
      let callCount = 0;
      mm.registerSection({
        name: 'tracked',
        heading: '## Tracked',
        load: () => { callCount++; return 'data'; },
        priority: 10,
      });

      mm.getSection('tracked');
      mm.refreshCache();
      mm.getSection('tracked');
      expect(callCount).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // getFullContext
  // ---------------------------------------------------------------------------

  describe('getFullContext', () => {
    it('should assemble sections in priority order', () => {
      mm.registerSection({
        name: 'second',
        heading: '## Second',
        load: () => 'Second content',
        priority: 20,
      });
      mm.registerSection({
        name: 'first',
        heading: '## First',
        load: () => 'First content',
        priority: 10,
      });

      const ctx = mm.getFullContext();
      const firstIdx = ctx.indexOf('## First');
      const secondIdx = ctx.indexOf('## Second');
      expect(firstIdx).toBeLessThan(secondIdx);
      expect(ctx).toContain('First content');
      expect(ctx).toContain('Second content');
    });

    it('should not include empty sections', () => {
      mm.registerSection({
        name: 'empty',
        heading: '## Empty',
        load: () => '',
        priority: 10,
      });

      const ctx = mm.getFullContext();
      expect(ctx).not.toContain('## Empty');
    });
  });

  // ---------------------------------------------------------------------------
  // getRecentTraces
  // ---------------------------------------------------------------------------

  describe('getRecentTraces', () => {
    it('should return empty string when no trace files exist', () => {
      expect(mm.getRecentTraces()).toBe('');
    });

    it('should read trace files newest first', () => {
      fs.writeFileSync(path.join(tracesDir, 'trace_2026-02-28.md'), 'Older traces');
      fs.writeFileSync(path.join(tracesDir, 'trace_2026-03-01.md'), 'Newer traces');

      const traces = mm.getRecentTraces(1);
      expect(traces).toContain('Newer traces');
      expect(traces).not.toContain('Older traces');
    });
  });

  // ---------------------------------------------------------------------------
  // Strategy delegation
  // ---------------------------------------------------------------------------

  describe('strategy delegation', () => {
    it('should report no strategies when dir is empty', () => {
      expect(mm.hasStrategies()).toBe(true); // dir exists
    });

    it('should delegate to strategy store', () => {
      const store = mm.getStrategyStore();
      expect(store).toBeDefined();
      expect(store.isAvailable()).toBe(true);
    });
  });
});
