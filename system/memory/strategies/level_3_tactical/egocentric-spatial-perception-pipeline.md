---
id: strat_3_egocentric-spatial-perception-pipeline
version: 1
hierarchy_level: 3
title: Egocentric Spatial Perception Pipeline (Spartun3D-Style Situated Scene Graph)
trigger_goals: ["egocentric", "spatial grounding", "distance estimation", "direction_from_agent", "passby_objects", "situated scene graph", "VLM perception", "Spartun3D"]
preconditions: ["SceneGraphPolicy is the active perception policy", "VLM supports structured JSON output with optional fields", "OVERHEAD_SCENE_PROMPT is the active prompt template", "scene_response_parser.ts handles optional field validation"]
confidence: 0.65
success_count: 1
failure_count: 0
source_traces: ["tr_strategic_analysis_20260427", "docs/strategic-analysis-2026-04-27.md"]
deprecated: false
---

# Egocentric Spatial Perception Pipeline (Spartun3D-Style Situated Scene Graph)

## Context

Research evidence (Spartun3D, Zhang et al. ICLR 2025) demonstrates that situated scene graphs with egocentric spatial relations -- direction, distance, and passby objects relative to the agent's viewpoint -- dramatically improve 3D spatial understanding in VLMs. Navigation accuracy improves from 0% (without alignment) to 20.3% (with spatial alignment module) in zero-shot settings. This strategy codifies the pattern for adding egocentric spatial fields to the VLM perception pipeline and parsing them safely.

## Steps

1. **Define egocentric type system in vision_projector.ts:**
   - Create `EgocentricDirection` union type with 8-way compass: `'front' | 'front_left' | 'left' | 'behind_left' | 'behind' | 'behind_right' | 'right' | 'front_right'`
   - Extend `GeminiObject` interface with three optional fields:
     - `estimated_distance_cm?: number` -- VLM-estimated metric distance from robot to object
     - `direction_from_agent?: EgocentricDirection` -- egocentric direction relative to robot heading
     - `passby_objects?: string[]` -- labels of objects between robot and this object
   - Document each field with JSDoc referencing the Spartun3D paper motivation

2. **Update VLM prompt (OVERHEAD_SCENE_PROMPT) to request egocentric fields:**
   - Add a section explaining the egocentric fields after the base detection instructions
   - Provide explicit enumeration of valid `direction_from_agent` values
   - Give distance estimation heuristics ("objects touching the robot are ~5cm, objects at opposite edges of the arena are ~150cm")
   - Include a concrete JSON example showing all three egocentric fields populated
   - Keep egocentric fields as part of non-robot objects only (robot itself gets `heading_estimate`)

3. **Implement safe parser in scene_response_parser.ts:**
   - Create a `VALID_DIRECTIONS` constant `ReadonlySet<string>` containing all 8 compass directions
   - For `estimated_distance_cm`: validate `typeof === 'number'`, `Number.isFinite()`, and `>= 0`
   - For `direction_from_agent`: validate `typeof === 'string'`, lowercase, membership in VALID_DIRECTIONS set, then cast to `EgocentricDirection`
   - For `passby_objects`: validate `Array.isArray()`, filter to non-empty trimmed strings, only assign if result is non-empty
   - Each field is independently optional -- if any single field fails validation, skip that field only, do not reject the entire object

4. **Ensure parser never-throw contract:**
   - The `parseGeminiSceneResponse()` function must return `GeminiObject[]` on any input
   - Return empty array `[]` on complete parse failure
   - Skip individual objects that fail required field validation (label, box_2d)
   - Silently drop invalid optional fields without affecting the rest of the object

5. **Add test coverage for each egocentric field:**
   - Test: valid `estimated_distance_cm` is preserved
   - Test: negative distance is rejected
   - Test: NaN/Infinity distance is rejected
   - Test: valid `direction_from_agent` with each compass direction is preserved
   - Test: invalid direction string is rejected (object still returned without the field)
   - Test: `passby_objects` with valid strings is preserved
   - Test: `passby_objects` with empty/whitespace strings are filtered out
   - Test: `passby_objects` with non-string elements are filtered out
   - Test: object with all three egocentric fields populated simultaneously

6. **Wire egocentric data downstream (future):**
   - SceneGraph can use `estimated_distance_cm` to cross-validate projector-computed distances
   - ReactiveController can use `direction_from_agent` as fallback when bounding box precision is low
   - `passby_objects` can inform path planning by identifying which obstacles block direct approach

## Negative Constraints

- Do not make egocentric fields required -- VLMs may not always produce them, and the pipeline must degrade gracefully
- Do not accept `estimated_distance_cm` values exceeding the arena diagonal without clamping or discarding (prevents hallucinated distances from corrupting the SceneGraph)
- Do not trust `passby_objects` labels without cross-referencing against current SceneGraph node labels in downstream consumers (VLMs may hallucinate obstacle labels)
- Do not add egocentric fields to the parser without corresponding test assertions (mirrors Constraint 20/38 -- optional schema fields need test coverage)

## Notes

- Paper evidence: Spartun3D (P3) shows 2-3% improvement across all spatial reasoning metrics when explicit spatial alignment between 3D objects and text is added. The situated scene graph with direction/distance/passby is the key intermediate representation.
- Martorell (P2) confirms that Cartesian/JSON representations consistently outperform textual descriptions. The egocentric fields transform qualitative spatial descriptions into structured data the VLM and downstream systems can reason about.
- The `EgocentricDirection` type uses snake_case ('front_left') to match JSON field naming conventions and avoid case sensitivity issues during VLM parsing.
- The `VALID_DIRECTIONS` set provides O(1) validation lookup, which matters at VLM inference rates (2 Hz perception loop).
- This strategy is complementary to `strat_3_structured-scene-format-flash-lite` (which addresses Flash-Lite's inability to use numerical data in prose) and `strat_2_model-selection-by-reasoning-type` (which addresses model capability thresholds).
