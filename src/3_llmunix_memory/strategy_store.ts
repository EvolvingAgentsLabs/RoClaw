/**
 * RoClaw Strategy Store — Extends core with RoClaw-specific level directories
 *
 * RoClaw uses domain-specific directory names:
 *   level_2_routes/  (instead of level_2_strategy)
 *   level_4_motor/   (instead of level_4_reactive)
 */

import * as path from 'path';
import {
  StrategyStore as CoreStrategyStore,
  type StrategyStoreConfig,
} from '../llmunix-core/strategy_store';
import { HierarchyLevel } from '../llmunix-core/types';

// Re-export core's parsing utilities for backward compat
export {
  strategyFromMarkdown,
  strategyToMarkdown,
  parseNegativeConstraints,
} from '../llmunix-core/strategy_store';

const ROCLAW_LEVEL_DIRS = {
  [HierarchyLevel.STRATEGY]: 'level_2_routes',
  [HierarchyLevel.REACTIVE]: 'level_4_motor',
};

export class StrategyStore extends CoreStrategyStore {
  constructor(strategiesDir?: string) {
    const dir = strategiesDir ?? path.join(__dirname, 'strategies');
    super({
      strategiesDir: dir,
      levelDirs: ROCLAW_LEVEL_DIRS,
    });
  }
}
