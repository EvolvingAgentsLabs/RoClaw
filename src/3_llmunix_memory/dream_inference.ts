/**
 * Dream Inference Adapter — Wraps CerebellumInference with dream-specific config
 *
 * The dream engine uses longer timeouts, higher token limits, and optionally
 * a different (cheaper) model since it runs offline.
 */

import { CerebellumInference, type InferenceFunction } from '../2_qwen_cerebellum/inference';

export interface DreamInferenceConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  apiBaseUrl?: string;
}

/**
 * Create an InferenceFunction configured for dream engine use:
 * - maxTokens: 2048 (vs 64 for motor control)
 * - temperature: 0.3 (vs 0.1 for deterministic bytecodes)
 * - timeoutMs: 30000 (offline, no rush)
 * - supportsVision: false (text-only trace analysis)
 *
 * Model and API settings are configurable via environment variables:
 * - DREAM_MODEL: model override (default: same as QWEN_MODEL)
 * - DREAM_MAX_TOKENS: token limit override (default: 2048)
 * - DREAM_TEMPERATURE: temperature override (default: 0.3)
 */
export function createDreamInference(config: DreamInferenceConfig): InferenceFunction {
  const model = config.model
    ?? process.env.DREAM_MODEL
    ?? process.env.QWEN_MODEL
    ?? 'qwen/qwen-2.5-vl-72b-instruct';

  const maxTokens = config.maxTokens
    ?? (process.env.DREAM_MAX_TOKENS ? parseInt(process.env.DREAM_MAX_TOKENS, 10) : 2048);

  const temperature = config.temperature
    ?? (process.env.DREAM_TEMPERATURE ? parseFloat(process.env.DREAM_TEMPERATURE) : 0.3);

  const apiBaseUrl = config.apiBaseUrl
    ?? process.env.LOCAL_INFERENCE_URL
    ?? 'https://openrouter.ai/api/v1';

  const adapter = new CerebellumInference({
    apiKey: config.apiKey,
    model,
    maxTokens,
    temperature,
    timeoutMs: config.timeoutMs ?? 30000,
    supportsVision: false, // Dream engine is text-only
    apiBaseUrl,
  });

  return adapter.createInferenceFunction();
}
