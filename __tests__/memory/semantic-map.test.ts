import * as fs from 'fs';
import * as path from 'path';
import { PoseMap, type SemanticMapEntry, type Pose } from '../../src/3_llmunix_memory/semantic_map';

const MAP_FILE = path.join(__dirname, '../../src/3_llmunix_memory/traces/semantic_map.json');

describe('PoseMap', () => {
  let map: PoseMap;

  beforeEach(() => {
    // Remove existing map file to start fresh
    try { fs.unlinkSync(MAP_FILE); } catch { /* ignore */ }
    map = new PoseMap();
  });

  afterEach(() => {
    try { fs.unlinkSync(MAP_FILE); } catch { /* ignore */ }
  });

  // ===========================================================================
  // record
  // ===========================================================================

  describe('record', () => {
    test('records an observation', () => {
      map.record('kitchen', { x: 100, y: 50, heading: 90 });
      const all = map.getAll();
      expect(all).toHaveLength(1);
      expect(all[0].label).toBe('kitchen');
      expect(all[0].pose.x).toBe(100);
      expect(all[0].pose.y).toBe(50);
    });

    test('normalizes labels to lowercase', () => {
      map.record('Kitchen', { x: 0, y: 0, heading: 0 });
      expect(map.getAll()[0].label).toBe('kitchen');
    });

    test('deduplicates nearby observations with same label', () => {
      map.record('sofa', { x: 100, y: 100, heading: 0 });
      map.record('sofa', { x: 110, y: 105, heading: 10 }); // within 30cm default merge radius
      expect(map.getAll()).toHaveLength(1);
    });

    test('keeps distinct entries for far-apart observations', () => {
      map.record('door', { x: 0, y: 0, heading: 0 });
      map.record('door', { x: 500, y: 500, heading: 0 }); // far apart
      expect(map.getAll()).toHaveLength(2);
    });

    test('stores confidence score', () => {
      map.record('hallway', { x: 0, y: 0, heading: 0 }, 0.85);
      expect(map.getAll()[0].confidence).toBe(0.85);
    });
  });

  // ===========================================================================
  // query
  // ===========================================================================

  describe('query', () => {
    beforeEach(() => {
      map.record('kitchen counter', { x: 100, y: 50, heading: 0 });
      map.record('living room sofa', { x: 200, y: 100, heading: 90 });
      map.record('front door', { x: 0, y: 0, heading: 180 });
    });

    test('finds entries matching keywords', () => {
      const results = map.query('kitchen');
      expect(results).toHaveLength(1);
      expect(results[0].label).toBe('kitchen counter');
    });

    test('returns empty for no matches', () => {
      const results = map.query('bathroom');
      expect(results).toHaveLength(0);
    });

    test('ignores short words (<=2 chars)', () => {
      const results = map.query('at');
      expect(results).toHaveLength(0);
    });
  });

  // ===========================================================================
  // findNearest
  // ===========================================================================

  describe('findNearest', () => {
    beforeEach(() => {
      map.record('kitchen', { x: 500, y: 100, heading: 0 });
      map.record('kitchen table', { x: 100, y: 100, heading: 0 });
    });

    test('returns closest match by distance', () => {
      const result = map.findNearest('kitchen', { x: 90, y: 90, heading: 0 });
      expect(result).not.toBeNull();
      expect(result!.label).toBe('kitchen table');
    });

    test('returns most recent when no fromPose given', () => {
      const result = map.findNearest('kitchen');
      expect(result).not.toBeNull();
    });

    test('returns null for no matches', () => {
      const result = map.findNearest('garage');
      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // getSummary
  // ===========================================================================

  describe('getSummary', () => {
    test('returns "No locations mapped yet." when empty', () => {
      expect(map.getSummary()).toBe('No locations mapped yet.');
    });

    test('returns formatted summary with entries', () => {
      map.record('kitchen', { x: 100, y: 50, heading: 90 });
      const summary = map.getSummary();
      expect(summary).toContain('Known locations:');
      expect(summary).toContain('kitchen');
      expect(summary).toContain('100.0');
    });
  });

  // ===========================================================================
  // Persistence
  // ===========================================================================

  describe('persistence', () => {
    test('saves and loads from disk', () => {
      map.record('kitchen', { x: 100, y: 50, heading: 90 });

      // Create a new instance — should load from disk
      const map2 = new PoseMap();
      const entries = map2.getAll();
      expect(entries).toHaveLength(1);
      expect(entries[0].label).toBe('kitchen');
    });
  });

  // ===========================================================================
  // clear
  // ===========================================================================

  describe('clear', () => {
    test('removes all entries', () => {
      map.record('kitchen', { x: 100, y: 50, heading: 90 });
      map.record('sofa', { x: 200, y: 100, heading: 0 });
      map.clear();
      expect(map.getAll()).toHaveLength(0);
    });
  });
});
