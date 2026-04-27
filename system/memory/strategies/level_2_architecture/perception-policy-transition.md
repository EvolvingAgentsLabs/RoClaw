---
id: strat_2_perception-policy-transition
version: 1
hierarchy_level: 2
title: Perception Policy Transition -- VLM Motor to Scene Graph Default
trigger_goals: ["SceneGraphPolicy", "perception policy", "VLM deprecation", "VLMMotorPolicy", "scene graph default", "policy switch", "deterministic controller"]
preconditions: ["Two perception policies exist: direct VLM motor control and scene-graph-mediated control", "SceneGraphPolicy has been tested in A/B framework", "ReactiveController exists with deterministic motor reasoning", "ReflexGuard exists for collision veto (at minimum in shadow mode)", "Research evidence supports separation of perception from policy (NavGPT-2, Spartun3D)"]
confidence: 0.70
success_count: 1
failure_count: 0
source_traces: ["docs/ARCHITECTURE.md_section_4", "docs/strategic-analysis-2026-04-27.md_section_2"]
deprecated: false
---

# Perception Policy Transition -- VLM Motor to Scene Graph Default

## Overview
Transition the default perception policy from direct VLM motor control (VLM emits tool calls that become motor commands) to scene-graph-mediated control (VLM emits bounding boxes and labels, deterministic TypeScript controller makes motor decisions). This separation is validated by 4 peer-reviewed papers and enables L0 safety guarantees, spatial memory persistence, and easier VLM distillation.

## Steps
1. **Verify SceneGraphPolicy completeness.** Confirm the scene-graph policy handles all navigation scenarios: target seeking, obstacle avoidance, doorway traversal, corridor following, exploration. Run regression suite.
2. **Verify ReflexGuard readiness.** Confirm L0 collision veto works with scene-graph nodes. ReflexGuard should predict motor command effects via cone intersection against obstacles and veto reliably. Test with intentional collision scenarios.
3. **Swap flag polarity.** Change the default perception policy from VLMMotorPolicy to SceneGraphPolicy. The legacy policy becomes opt-in (e.g., `--legacy-motor` flag) rather than opt-out.
4. **Activate ReflexGuard enforcement.** Move ReflexGuard from shadow mode (log-only) to active mode (actual veto). Auto-enable when SceneGraphPolicy is active (no separate flag needed).
5. **Simplify VLM prompt.** Update the system prompt to request only perception outputs: `{objects: [{label, box_2d, confidence, estimated_distance_cm, direction_from_agent, passby_objects}]}`. Remove motor reasoning instructions from the prompt.
6. **Add graceful fallback.** If SceneGraphPolicy fails to parse VLM output (no objects detected), emit STOP and log a warning rather than crashing. This prevents the transition from causing catastrophic failures.
7. **Run A/B regression.** Execute the full regression suite comparing SceneGraphPolicy (new default) against VLMMotorPolicy (legacy). Document parity metrics.
8. **Update documentation.** Update ARCHITECTURE.md to reflect the new default, including "why scene-graph won" rationale with paper citations.
9. **Schedule legacy removal.** Mark VLMMotorPolicy for removal after 2 successful regression runs with the new default. Keep the file in tree during transition period.

## Negative Constraints
- Do not remove VLMMotorPolicy code before completing 2 regression runs with SceneGraphPolicy as default -- premature removal prevents rollback
- Do not activate ReflexGuard in active mode without SceneGraphPolicy -- VLM tool calls are unpredictable and ReflexGuard cannot reliably veto them
- Do not assume SceneGraphPolicy handles all edge cases from day one -- add graceful fallback to STOP on parse failure
- Do not skip the VLM prompt simplification -- leaving motor reasoning instructions in the prompt when the VLM should only perceive creates confusion and wasted tokens

## Notes
- Research justification from 4 papers:
  1. NavGPT-2 (ECCV 2024): Frozen VLM + separate policy network outperforms end-to-end VLM motor control
  2. Spartun3D (ICLR 2025): Situated scene graphs with egocentric spatial relations dramatically improve 3D understanding
  3. Martorell (UBA/CONICET 2025): JSON/Cartesian coordinates outperform text for spatial reasoning across all model sizes
  4. Tehenan et al. (2025): Spatial relations compose linearly in LLM activations -- structured output enables algebraic composition
- Key enabler: ReflexGuard can predict effects of deterministic controller commands (cone intersection) but cannot predict VLM tool calls. This makes L0 safety guarantees possible only with SceneGraphPolicy.
- Distillation benefit: Fine-tuning a VLM on bounding-box extraction is approximately 3x more sample-efficient than fine-tuning on motor reasoning.
- Validated on RoClaw 2026-04-27: SceneGraphPolicy is now the default, ReflexGuard runs in active mode, VLMMotorPolicy remains as --legacy-motor opt-in.
