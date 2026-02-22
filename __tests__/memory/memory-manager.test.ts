import { MemoryManager } from '../../src/3_llmunix_memory/memory_manager';

describe('MemoryManager', () => {
  let mm: MemoryManager;

  beforeEach(() => {
    mm = new MemoryManager();
  });

  // ===========================================================================
  // getHardwareProfile
  // ===========================================================================

  describe('getHardwareProfile', () => {
    test('reads hardware.md from system directory', () => {
      const hw = mm.getHardwareProfile();
      expect(hw).toContain('RoClaw V1');
      expect(hw).toContain('28BYJ-48');
      expect(hw).toContain('4.71 cm/s');
    });

    test('returns cached value on second call', () => {
      const first = mm.getHardwareProfile();
      const second = mm.getHardwareProfile();
      expect(first).toBe(second);
    });
  });

  // ===========================================================================
  // getIdentity
  // ===========================================================================

  describe('getIdentity', () => {
    test('reads identity.md from system directory', () => {
      const id = mm.getIdentity();
      expect(id).toContain('RoClaw');
      expect(id).toContain('Cortex');
      expect(id).toContain('Cerebellum');
    });
  });

  // ===========================================================================
  // getSkills
  // ===========================================================================

  describe('getSkills', () => {
    test('returns empty string when no skill files exist', () => {
      const skills = mm.getSkills();
      expect(skills).toBe('');
    });
  });

  // ===========================================================================
  // getRecentTraces
  // ===========================================================================

  describe('getRecentTraces', () => {
    test('returns empty string when no trace files exist', () => {
      const traces = mm.getRecentTraces();
      expect(traces).toBe('');
    });
  });

  // ===========================================================================
  // getFullContext
  // ===========================================================================

  describe('getFullContext', () => {
    test('combines hardware and identity sections', () => {
      const ctx = mm.getFullContext();
      expect(ctx).toContain('## Hardware');
      expect(ctx).toContain('## Identity');
      expect(ctx).toContain('RoClaw V1');
      expect(ctx).toContain('Cortex');
    });

    test('does not include empty sections', () => {
      const ctx = mm.getFullContext();
      // Skills and traces dirs have no .md files, so these sections should be absent
      expect(ctx).not.toContain('## Skills');
      expect(ctx).not.toContain('## Recent Traces');
    });
  });

  // ===========================================================================
  // refreshCache
  // ===========================================================================

  describe('refreshCache', () => {
    test('clears cached values', () => {
      // Populate cache
      const first = mm.getHardwareProfile();
      expect(first).toBeTruthy();

      // Clear cache — next call re-reads from disk
      mm.refreshCache();

      const second = mm.getHardwareProfile();
      expect(second).toEqual(first);
    });
  });
});
