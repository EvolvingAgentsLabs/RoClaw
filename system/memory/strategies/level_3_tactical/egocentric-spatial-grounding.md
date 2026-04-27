---
id: strat_3_egocentric-spatial-grounding
version: 1
hierarchy_level: 3
title: Egocentric Spatial Grounding -- Spartun3D-Style VLM Fields
trigger_goals: ["Spartun3D", "egocentric", "spatial grounding", "direction_from_agent", "estimated_distance_cm", "passby_objects", "scene graph enrichment", "situated scene graph"]
preconditions: ["VLM capable of estimating distance and direction (Gemini 3.1 Flash Lite or better)", "Scene response parser exists with extensible field handling", "SceneGraphPolicy is active (egocentric fields feed the scene graph, not direct motor control)", "VisionProjector accepts optional spatial metadata per detected object"]
confidence: 0.65
success_count: 1
failure_count: 0
source_traces: ["src/2_qwen_cerebellum/scene_response_parser.ts", "src/2_qwen_cerebellum/vision_projector.ts", "src/2_qwen_cerebellum/bytecode_compiler.ts_prompt"]
deprecated: false
---

# Egocentric Spatial Grounding -- Spartun3D-Style VLM Fields

## Overview
Enrich the VLM perception output with three egocentric spatial fields per detected object, inspired by Spartun3D's situated scene graph (ICLR 2025). These fields complement the projector's geometric computation from bounding boxes and enable cross-validation, fallback, and richer scene understanding for the ReactiveController.

## Steps
1. **Add egocentric fields to VLM prompt.** For every non-robot object, request three additional fields:
   - `estimated_distance_cm` (number): VLM-estimated distance from robot to object
   - `direction_from_agent` (8-way compass string): one of "front", "front_left", "left", "behind_left", "behind", "behind_right", "right", "front_right"
   - `passby_objects` (string array): labels of other objects that lie roughly between the robot and this object
2. **Add field types to VisionProjector interface.** Extend the detected object type with optional egocentric fields. Use `EgocentricDirection` type for the 8-way compass enum.
3. **Update scene response parser.** Parse the three optional fields from VLM JSON output. Validate direction values against the 8-way compass enum. Validate distance as a positive number. Parse passby_objects as a string array with individual string validation. All three fields are OPTIONAL -- parser must not fail if VLM omits them.
4. **Provide examples in the prompt.** Include a concrete example showing all three fields populated (e.g., `"estimated_distance_cm": 45, "direction_from_agent": "front_left", "passby_objects": ["blue wall"]`). VLMs respond better to in-context examples than to abstract schema descriptions.
5. **Feed fields into SceneGraph nodes.** When updating scene graph nodes from parsed VLM output, store egocentric fields as metadata. These can be used for cross-validation against projector-computed distances and for fallback when bounding-box projection is unreliable (e.g., 1st-person camera with unknown depth).
6. **Add JSON/Cartesian serialization.** Implement `serializeSceneGraph('json')` that outputs compact `{x_cm, y_cm, heading_deg}` per node. This format is optimal for LLM spatial reasoning per Martorell et al.

## Negative Constraints
- Do not make egocentric fields mandatory in the parser -- VLMs may omit them, and the pipeline must degrade gracefully to bounding-box-only perception
- Do not trust VLM distance estimates blindly for motor control -- use them for scene graph enrichment and cross-validation, not as primary distance input for collision avoidance
- Do not use free-form direction strings -- validate against the exact 8-way compass enum to prevent parsing ambiguity
- Do not include passby_objects if the VLM returns non-string values -- silently drop malformed entries rather than failing the entire parse

## Notes
- Research basis: Spartun3D (ICLR 2025, 2410.03878) demonstrates that situated scene graphs with egocentric direction, distance, and passby-object annotations dramatically improve 3D spatial understanding. Navigation accuracy improved from 0% (without spatial alignment) to 20.3% (with alignment module) in zero-shot settings.
- The 8-way compass (front, front_left, left, behind_left, behind, behind_right, right, front_right) was chosen to balance precision with VLM reliability. Finer-grained directions (16-way or degree-based) increase VLM error rates.
- Passby objects encode occlusion topology: knowing that "blue wall" lies between the robot and the target object enables the ReactiveController to plan around obstacles even before the projector computes exact collision geometry.
- Cross-validation pattern: if VLM says object is "front_left" at 45cm but projector computes it at 120cm behind, flag the discrepancy for scene graph confidence downweight.
- Implemented in RoClaw 2026-04-27: scene_response_parser.ts validates all three fields, vision_projector.ts types include EgocentricDirection, bytecode_compiler.ts prompt includes example with all fields.
