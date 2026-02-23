/**
 * RoClaw Semantic Map — Topological memory linking poses to observations
 *
 * As the robot moves, the vision loop records what it sees at each pose.
 * This builds a semantic/topological map: "At pose [X, Y], I saw a kitchen."
 *
 * When the Cortex issues a "go_to" command, the semantic map is queried
 * for the nearest known observation matching the target, providing
 * coordinates instead of blind exploration.
 *
 * Storage: JSON file in the traces/ directory, persists across sessions.
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../shared/logger';

// =============================================================================
// Types
// =============================================================================

export interface Pose {
  x: number;
  y: number;
  heading: number;
}

export interface SemanticMapEntry {
  /** Label describing what was observed (e.g., "kitchen", "sofa", "hallway") */
  label: string;
  /** Robot pose when the observation was made */
  pose: Pose;
  /** ISO timestamp */
  timestamp: string;
  /** Confidence score from VLM (0-1), if available */
  confidence?: number;
}

// =============================================================================
// SemanticMap
// =============================================================================

const MAP_FILE = path.join(__dirname, 'traces', 'semantic_map.json');

export class SemanticMap {
  private entries: SemanticMapEntry[] = [];

  constructor() {
    this.load();
  }

  /**
   * Record an observation at a given pose.
   * Deduplicates: if the same label exists within `mergeRadiusCm`,
   * it updates the existing entry instead of creating a duplicate.
   */
  record(label: string, pose: Pose, confidence?: number, mergeRadiusCm = 30): void {
    const normalized = label.toLowerCase().trim();

    // Check for nearby duplicate
    const existing = this.entries.find(e =>
      e.label === normalized && this.distance(e.pose, pose) < mergeRadiusCm
    );

    if (existing) {
      // Update with newer pose/timestamp if higher confidence
      if (confidence === undefined || (existing.confidence ?? 0) <= confidence) {
        existing.pose = { ...pose };
        existing.timestamp = new Date().toISOString();
        existing.confidence = confidence;
      }
    } else {
      this.entries.push({
        label: normalized,
        pose: { ...pose },
        timestamp: new Date().toISOString(),
        confidence,
      });
    }

    this.save();
    logger.debug('SemanticMap', `Recorded "${normalized}" at (${pose.x.toFixed(1)}, ${pose.y.toFixed(1)})`);
  }

  /**
   * Query the map for entries matching a location description.
   * Returns all entries whose label contains any of the query keywords.
   */
  query(description: string): SemanticMapEntry[] {
    const keywords = description.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    if (keywords.length === 0) return [];

    return this.entries.filter(e =>
      keywords.some(kw => e.label.includes(kw))
    );
  }

  /**
   * Find the single closest matching entry for a location description.
   * Returns null if no matches found.
   */
  findNearest(description: string, fromPose?: Pose): SemanticMapEntry | null {
    const matches = this.query(description);
    if (matches.length === 0) return null;

    if (!fromPose) {
      // Return most recent match
      return matches.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0];
    }

    // Return closest match by Euclidean distance
    return matches.sort((a, b) =>
      this.distance(a.pose, fromPose) - this.distance(b.pose, fromPose)
    )[0];
  }

  /**
   * Get all entries in the map.
   */
  getAll(): SemanticMapEntry[] {
    return [...this.entries];
  }

  /**
   * Get a human-readable summary for injection into VLM context.
   */
  getSummary(): string {
    if (this.entries.length === 0) return 'No locations mapped yet.';

    const lines = this.entries.map(e =>
      `- "${e.label}" at pose (${e.pose.x.toFixed(1)}, ${e.pose.y.toFixed(1)}), heading ${e.pose.heading.toFixed(0)}°`
    );
    return `Known locations:\n${lines.join('\n')}`;
  }

  /**
   * Clear all entries.
   */
  clear(): void {
    this.entries = [];
    this.save();
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private distance(a: Pose, b: Pose): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private load(): void {
    try {
      if (fs.existsSync(MAP_FILE)) {
        const raw = fs.readFileSync(MAP_FILE, 'utf-8');
        this.entries = JSON.parse(raw);
      }
    } catch {
      logger.warn('SemanticMap', 'Failed to load semantic map, starting fresh');
      this.entries = [];
    }
  }

  private save(): void {
    try {
      const dir = path.dirname(MAP_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(MAP_FILE, JSON.stringify(this.entries, null, 2));
    } catch (err) {
      logger.error('SemanticMap', 'Failed to save semantic map', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
