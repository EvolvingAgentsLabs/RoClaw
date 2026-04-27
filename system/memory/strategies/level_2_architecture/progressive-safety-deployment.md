---
id: strat_2_progressive-safety-deployment
version: 1
hierarchy_level: 2
title: Progressive Safety Deployment via Three-Mode Guard
trigger_goals: ["ReflexGuard", "safety deployment", "shadow mode", "progressive rollout", "collision guard", "veto system", "safety layer"]
preconditions: ["SceneGraph populated with obstacle data from perception pipeline", "Guard component implements three modes: disabled, shadow, active", "Transmitter layer supports send() interception (monkey-patch or middleware)", "Logging infrastructure captures shadow-mode would-be vetoes for analysis"]
confidence: 0.75
success_count: 1
failure_count: 0
source_traces: ["strategic-analysis-2026-04-27-section-2", "reflex-guard.test.ts-23-tests", "scene-graph-pipeline.test.ts-5-tests"]
deprecated: false
---

# Progressive Safety Deployment via Three-Mode Guard

## Steps
1. **Implement the guard with three modes** (disabled, shadow, active). The guard sits between the decision-maker (controller or VLM) and the actuator (transmitter). It inspects every outgoing command frame and decides whether to allow, log, or replace it.
   - `disabled`: Never inspect, always pass through. Use during initial development or to bypass for benchmarking.
   - `shadow`: Inspect every frame and log would-be vetoes, but always pass the original through. Use to validate the predictor against real execution without putting it on the critical path.
   - `active`: Replace would-collide commands with a safe fallback (e.g., STOP frame) and emit a veto event. This is the production enforcement mode.
2. **Deploy in shadow mode first** and collect data. Monitor shadow veto counts, false positive rates, and correlation with actual collisions. The guard should emit distinct events for shadow vetoes (`shadowVeto`) vs active vetoes (`reflexStop`) so downstream systems (trace collector, dream engine) can distinguish them.
3. **Analyze shadow data** to validate the predictor. Key metrics: (a) Would shadow vetoes have prevented actual collisions? (b) What is the false positive rate (vetoes on safe commands)? (c) Does the prediction window and safety margin correctly tune the sensitivity?
4. **Transition to active mode** once shadow data validates the predictor. Change the default from 'shadow' to 'active'. Provide environment variable override (e.g., `RF_REFLEX_ENABLED=disabled`) for operators who need to bypass during debugging.
5. **Wire veto events to the trace collector** so every active veto and shadow veto generates a scene graph snapshot. This creates a feedback loop: collision prediction -> trace -> dream -> strategy -> better avoidance -> fewer vetoes.

## Negative Constraints
- Do not deploy directly in active mode without a shadow-mode validation period -- false positive vetoes in active mode will stop the robot unnecessarily and degrade task completion
- Do not remove shadow mode after transitioning to active -- operators must always be able to revert to shadow for debugging or benchmarking without code changes
- Do not make the guard stateful between decisions -- each decide() call must be pure (based only on current SceneGraph state and frame content), not on history of previous decisions. History-based logic belongs in the controller, not the guard.
- Do not gate pure rotations (ROTATE_CW, ROTATE_CCW) or non-motion opcodes (STOP, GET_STATUS) -- only translational motion (MOVE_FORWARD, MOVE_BACKWARD, TURN_LEFT, TURN_RIGHT) creates collision risk

## Notes
- RoClaw's ReflexGuard transitioned from shadow to active default on 2026-04-27. The `readModeFromEnv()` function now returns 'active' when no environment variable is set (previously returned 'shadow'). This transition was validated by 23 unit tests and 5 integration tests.
- The monkey-patch approach (`attachReflexGuard()`) preserves the original `send()` method reference and returns a `detach()` function for full reversibility. This is important for test isolation and graceful shutdown.
- The pattern generalizes beyond collision avoidance: any safety layer that inspects outgoing commands can use the disabled->shadow->active progression. Examples: joint limit guards, battery low guards, geofence guards.
- The guard's `decide()` method returns a `GuardDecision` with structured fields (allow, reason, opcodeName, predictedDistanceCm, obstacleId, obstacleLabel) enabling rich downstream analysis in traces and dream consolidation.
- Reference implementation: `src/2_qwen_cerebellum/reflex_guard.ts` (ReflexGuard class + attachReflexGuard helper)
- Validated by: `__tests__/cerebellum/reflex-guard.test.ts`, `__tests__/integration/scene-graph-pipeline.test.ts`
