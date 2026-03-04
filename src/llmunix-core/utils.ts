/**
 * LLMunix Core — Shared utility functions.
 *
 * JSON extraction and parsing helpers used across planner, dream engine,
 * and semantic map. Handles LLM output quirks like <think> tags and
 * markdown code fences.
 */

/**
 * Extract the first valid JSON object or array from LLM output.
 * Strips <think>...</think> blocks and markdown code fences.
 */
export function extractJSON(text: string): string {
  // Strip <think>...</think> blocks (reasoning models)
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

  // Strip markdown code fences
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/gm, '').replace(/\n?```\s*$/gm, '').trim();

  // Find first { ... } or [ ... ] block
  const jsonStart = cleaned.indexOf('{');
  const arrayStart = cleaned.indexOf('[');
  const start = jsonStart >= 0 && (arrayStart < 0 || jsonStart < arrayStart)
    ? jsonStart : arrayStart;

  if (start < 0) return cleaned;

  const openChar = cleaned[start];
  const closeChar = openChar === '{' ? '}' : ']';
  let depth = 0;

  for (let i = start; i < cleaned.length; i++) {
    if (cleaned[i] === openChar) depth++;
    if (cleaned[i] === closeChar) depth--;
    if (depth === 0) return cleaned.slice(start, i + 1);
  }

  return cleaned.slice(start);
}

/**
 * Safely parse JSON from LLM output. Returns null on failure.
 */
export function parseJSONSafe<T>(text: string): T | null {
  try {
    return JSON.parse(extractJSON(text)) as T;
  } catch {
    return null;
  }
}
