---
id: strat_3_safe-vlm-optional-field-parsing
version: 1
hierarchy_level: 3
title: Safe VLM Optional Field Parsing (Never-Throw JSON Validation for Egocentric Fields)
trigger_goals: ["VLM parsing", "JSON validation", "optional fields", "scene_response_parser", "safe parsing", "egocentric fields", "never throw"]
preconditions: ["VLM returns JSON with both required and optional fields", "Parser must return typed objects or empty array (never throw)", "Optional fields must degrade gracefully when VLM omits or corrupts them"]
confidence: 0.70
success_count: 1
failure_count: 0
source_traces: ["tr_strategic_analysis_20260427", "src/2_qwen_cerebellum/scene_response_parser.ts"]
deprecated: false
---

# Safe VLM Optional Field Parsing (Never-Throw JSON Validation for Egocentric Fields)

## Context

VLMs produce semi-structured JSON output that frequently deviates from the requested schema: markdown code fences around JSON, explanation text before/after the blob, missing optional fields, wrong types for optional values, and occasionally completely invalid output. The parser must handle all of these gracefully without throwing exceptions, because a thrown exception in the perception loop means a dropped frame and potentially a safety-critical missed obstacle detection.

This strategy codifies the pattern used in `scene_response_parser.ts` for adding optional egocentric spatial fields (estimated_distance_cm, direction_from_agent, passby_objects) alongside required fields (label, box_2d) with independent validation per field.

## Steps

1. **Establish the never-throw contract:**
   - The parser function signature returns `TypedObject[]` (never throws)
   - On complete parse failure: return empty array `[]`
   - On partial parse failure: return only the successfully validated objects
   - Callers treat empty result as "perception unavailable this frame"
   - This contract is more important than any individual field validation

2. **Handle VLM output wrapping:**
   - Strip markdown code fences: `\`\`\`json ... \`\`\`` or `\`\`\` ... \`\`\``
   - If initial JSON.parse fails, use regex to extract the JSON object from surrounding text: `/\{[\s\S]*"objects"\s*:\s*\[[\s\S]*\]\s*\}/`
   - If extraction also fails, return `[]` (log at debug level, not warn)
   - This two-stage extraction handles Gemini's tendency to emit explanation around JSON

3. **Validate required fields first, then optional fields independently:**
   - Required: `label` (non-empty string) and `box_2d` (4-element numeric array with all values finite)
   - If required fields fail, skip the entire object (do not add to results)
   - Optional fields are validated independently -- if one fails, the object is still added with the valid fields
   - This ensures that a VLM hallucinating a bad `direction_from_agent` does not cause loss of the valid `label` and `box_2d`

4. **Validate numeric optional fields (e.g., estimated_distance_cm):**
   ```typescript
   if (typeof o.field === 'number' && Number.isFinite(o.field) && o.field >= 0) {
     result.field = o.field;
   }
   ```
   - Check `typeof === 'number'` (rejects strings, null, undefined)
   - Check `Number.isFinite()` (rejects NaN, Infinity, -Infinity)
   - Check domain constraint (e.g., `>= 0` for distances)
   - If any check fails, silently omit the field (do not log at warn level -- VLM omission is normal)

5. **Validate enum-like string fields (e.g., direction_from_agent):**
   ```typescript
   const VALID_VALUES: ReadonlySet<string> = new Set([...]);
   if (typeof o.field === 'string') {
     const normalized = o.field.toLowerCase();
     if (VALID_VALUES.has(normalized)) {
       result.field = normalized as EnumType;
     }
   }
   ```
   - Normalize case before validation (VLMs may produce "Front_Left" or "FRONT_LEFT")
   - Use a pre-constructed `ReadonlySet` for O(1) membership check
   - Cast to the union type only after validation
   - If invalid, silently omit (VLM may have used a synonym like "ahead" instead of "front")

6. **Validate array-of-string fields (e.g., passby_objects):**
   ```typescript
   if (Array.isArray(o.field)) {
     const valid = o.field
       .filter((v: unknown): v is string => typeof v === 'string' && v.trim().length > 0)
       .map((v: string) => v.trim());
     if (valid.length > 0) {
       result.field = valid;
     }
   }
   ```
   - Check `Array.isArray()` first
   - Filter to non-empty trimmed strings using a type guard
   - Only assign if the filtered array is non-empty (avoids storing `[]`)
   - This handles VLMs returning `[null, "", "wall", 42]` gracefully

7. **Write comprehensive test coverage for each optional field:**
   - Test the happy path for each field (valid value is preserved)
   - Test boundary rejection for each field (invalid type, out-of-range value)
   - Test field independence (invalid field A does not prevent valid field B from being parsed)
   - Test combined scenario (all optional fields present and valid simultaneously)

## Negative Constraints

- Do NOT throw exceptions from the parser under any circumstance -- the perception loop depends on this contract
- Do NOT log missing optional fields at warn level -- VLM omission is expected and normal; use debug level only for complete parse failures
- Do NOT use `JSON.parse()` without try/catch -- VLM output is untrusted input
- Do NOT validate optional fields before required fields -- if required fields fail, skip the object entirely without wasting time on optional validation
- Do NOT add optional fields to the parser without corresponding test coverage (Constraint 38)
- Do NOT assume VLM output is consistent across frames -- the same VLM may include distance in one frame and omit it in the next

## Notes

- This pattern was developed for the egocentric spatial fields (Spartun3D-style) but applies to any VLM JSON schema extension
- The two-stage JSON extraction (direct parse, then regex extraction) handles 95%+ of Gemini's formatting variations
- Performance consideration: `VALID_DIRECTIONS` as a `ReadonlySet` gives O(1) lookup, which matters at 2 Hz perception frequency
- The independent-field-validation pattern ensures that the parser's error surface is proportional to the number of fields, not exponential (no combinatorial explosion of validation states)
- This strategy is closely related to Constraint 20 (test coverage for prompt methods) and the new Constraint 38 (test coverage for optional schema fields)
