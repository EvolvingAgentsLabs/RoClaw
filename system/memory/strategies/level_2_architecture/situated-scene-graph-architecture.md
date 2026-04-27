---
id: strat_2_situated-scene-graph-architecture
version: 1
hierarchy_level: 2
title: Situated Scene Graph Architecture (VLM as Perceiver, Deterministic Controller as Policy)
trigger_goals: ["VLM perception", "scene graph", "reactive controller", "perception policy", "motor separation", "Spartun3D", "NavGPT-2", "spatial reasoning architecture"]
preconditions: ["VLM capable of structured JSON output (bounding boxes, labels)", "Overhead or 1st-person camera providing frames to VLM", "SceneGraph data structure exists for 3D spatial memory", "ReactiveController exists for deterministic motor decisions", "ReflexGuard exists for pre-send collision veto"]
confidence: 0.75
success_count: 1
failure_count: 0
source_traces: ["tr_strategic_analysis_20260427", "docs/strategic-analysis-2026-04-27.md"]
deprecated: false
---

# Situated Scene Graph Architecture (VLM as Perceiver, Deterministic Controller as Policy)

## Context

Four independent research papers (Spartun3D ICLR 2025, NavGPT-2 Adelaide 2024, Martorell UBA/CONICET 2025, Tehenan et al. 2025) converge on the same architectural insight: separating VLM perception from motor policy produces better spatial reasoning and navigation performance than end-to-end VLM motor control. This strategy formalizes the architecture validated by RoClaw's SceneGraph pipeline.

### Research Evidence Summary

| Paper | Key Finding | Architecture Implication |
|-------|-------------|--------------------------|
| Spartun3D (P3) | Situated scene graphs with egocentric direction/distance/passby dramatically improve 3D spatial understanding | SceneGraph is the correct intermediate representation |
| NavGPT-2 (P4) | Frozen VLM + separate policy network closes gap with VLN specialists | Decouple perception from policy; don't train VLM on motor actions |
| Martorell (P2) | Cartesian/JSON representations consistently outperform textual descriptions | SceneGraph outputs structured coordinates, not prose |
| Tehenan (P1) | Spatial relations compose linearly in LLM activations | Structured spatial output enables algebraic composition downstream |

## Steps

1. **VLM acts as pure spatial perceiver:**
   - VLM receives camera frames (overhead or 1st-person)
   - VLM outputs ONLY: `{objects: [{label, box_2d, heading_estimate?, estimated_distance_cm?, direction_from_agent?, passby_objects?}]}`
   - VLM does NOT output motor commands, tool calls, or action decisions
   - This makes VLM distillation tractable: perception (object detection + spatial relations) is easier to distill than end-to-end motor reasoning

2. **SceneGraph as the intermediate representation:**
   - VisionProjector converts VLM bounding boxes to arena-frame coordinates
   - SceneGraph maintains persistent 3D spatial memory across frames
   - Object identity tracked via nearest-same-label within matchRadiusCm
   - Robot pose updated from both VLM heading_estimate and telemetry data (telemetry takes priority when available)

3. **ReactiveController as deterministic policy:**
   - Receives SceneGraph + resolved goal (target node)
   - Computes bearing and distance from robot to target using arena math
   - Applies deterministic rules: bearing > threshold -> rotate, clear path -> forward, arrived -> stop
   - No LLM involved in motor decisions -- eliminates Flash-Lite numerical reasoning failures
   - Produces 6-byte bytecode frames identical to VLMMotorPolicy output (downstream unchanged)

4. **ReflexGuard as pre-send safety gate:**
   - Queries SceneGraph for predicted forward collision
   - Active mode: replaces MOVE_FORWARD with STOP when collision predicted
   - Shadow mode: logs veto but transmits original frame (for validation without disrupting behavior)
   - Eliminates the Flash-Lite "133 MOVE_BACKWARD" failure mode entirely

5. **Egocentric spatial grounding (Spartun3D extension):**
   - VLM prompt requests egocentric fields for every non-robot object
   - `estimated_distance_cm`: metric distance estimate from robot to object
   - `direction_from_agent`: 8-way compass relative to robot heading
   - `passby_objects`: obstacle labels between robot and target
   - These fields enable path-aware navigation and collision-aware planning

6. **Pipeline validation:**
   - Integration test: perceive -> project -> decide -> guard -> send (scene-graph-pipeline.test.ts)
   - Anti-oscillation test: jittery VLM bearings do not flip controller rotation direction
   - Convergence test: pipeline converges from arbitrary start to target arrival
   - Policy switch test: can swap between VLMMotorPolicy and SceneGraphPolicy at runtime

## Negative Constraints

- Do NOT train the VLM to output motor commands -- motor policy belongs in deterministic TypeScript code, not in stochastic LLM inference
- Do NOT remove VLMMotorPolicy immediately -- keep as `--legacy-motor` fallback during transition, validate SceneGraphPolicy parity first
- Do NOT assume distance estimation works for sub-8B models -- Martorell (P2) shows models below 8B perform near chance on spatial tasks
- Do NOT mix perception prompt format with motor-control instructions in the same prompt -- this causes the prompt-mode misalignment failure (Constraint 10)
- Do NOT use qualitative text descriptions when structured Cartesian data is available -- Martorell (P2) proves JSON consistently outperforms text

## Notes

- The VLM-as-perceiver architecture reduces prompt complexity ~3x, making VLM distillation more sample-efficient (perception is simpler than end-to-end motor reasoning)
- The pipeline operates at ~2 Hz (VLM perception rate) while the ReactiveController can run at ~30 Hz (SceneGraph refresh rate) using the last projected state between VLM frames
- The ReflexGuard's shadow mode is critical for validating the architecture before production switch: it logs every divergence between VLM motor decisions and controller motor decisions without disrupting the robot's actual behavior
- This architecture directly implements the "Cerebellum" role from the portfolio architecture: RoClaw handles VLM motor control with local intelligence, not cloud-dependent end-to-end reasoning
- The Spartun3D-style egocentric fields (distance, direction, passby) are the highest-ROI improvement identified across all four papers -- they transform the SceneGraph from a simple object registry into a situated spatial understanding system
