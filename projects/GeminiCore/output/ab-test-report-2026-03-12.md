# RoClaw A/B Test Report — Real Gemini Robotics
**Date:** 2026-03-12 | **Image model:** gemini-robotics-er-1.5-preview | **Text model:** gemini-3.1-flash-lite-preview | **Scenarios:** 5

## Summary
| Metric | Baseline | Full Stack | Change |
|--------|----------|------------|--------|
| Success Rate | 0/5 | 0/5 | — |
| Avg Collisions | 0.0 | 26.6 | +26.6 |
| Avg Stuck Events | 1.8 | 1.2 | -33.3% |
| Avg Frames to End | 96.0 | 151.8 | +58.1% |
| Total Duration | 478.0s | 742.9s | — |
| Avg Inference Latency | 996ms | 978ms | — |

## Per-Scenario Results
| Scenario | Condition | Goal? | Frames | Collisions | Stuck | Distance | Duration |
|----------|-----------|-------|--------|------------|-------|----------|----------|
| Corridor Target Seek | Baseline | NO | 19 | 0 | 3 | 229cm | 37.3s |
| Corridor Target Seek | Full Stack | NO | 19 | 0 | 3 | 237cm | 18.4s |
| Room Exploration | Baseline | NO | 38 | 0 | 3 | 231cm | 35.1s |
| Room Exploration | Full Stack | NO | 140 | 0 | 3 | 247cm | 137.9s |
| Obstacle Avoidance Course | Baseline | NO | 200 | 0 | 0 | 189cm | 190.9s |
| Obstacle Avoidance Course | Full Stack | NO | 200 | 0 | 0 | 201cm | 197.6s |
| Wall Following | Baseline | NO | 200 | 0 | 0 | 263cm | 193.0s |
| Wall Following | Full Stack | NO | 200 | 133 | 0 | 283cm | 195.8s |
| Doorway Navigation | Baseline | NO | 23 | 0 | 3 | 172cm | 21.7s |
| Doorway Navigation | Full Stack | NO | 200 | 0 | 0 | 194cm | 193.2s |

## Strategies Injected (Full Stack condition)
- When obstacle or wall is detected in scene text, immediately reduce speed to 60-80 (not full 128-255)
- If collision warning ("very close to a wall"), move backward at speed 60 before attempting rotation -- do not try to turn in-place when pressed against obstacle
- If path ahead is blocked, rotate 90 degrees (not 30) to systematically survey alternative paths
- After rotation, re-check scene before advancing -- do not blindly move forward after turning
- If stuck detected (6+ consecutive identical opcodes), break the loop with a larger rotation (90-120 degrees) or switch to reverse-then-rotate sequence
- When obstacle is cleared and path is open, resume forward motion at moderate speed (100-120, not maximum 255)

## Constraints Applied (Full Stack condition)
- NEVER: Do not move forward into detected obstacles at full speed -- always reduce speed when obstacle distance is under 50cm
- NEVER: Do not charge through doorways at speed exceeding 100 -- always center alignment and reduce speed to 60-80 before entering a doorway
- NEVER: Do not rely on small rotation angles (under 45 degrees) to clear blocked paths -- use 90-degree systematic scan rotations when path is blocked
- NEVER: Do not treat dream-sourced strategies as equivalent to real-world strategies -- always apply fidelity weighting (DREAM_TEXT confidence = base * 0.3, REAL_WORLD = base * 1.0)
- NEVER: Do not skip source tagging on execution traces -- untagged traces default to UNKNOWN_SOURCE with fidelity 0.6, which may be higher than intended for synthetic data
- NEVER: Do not delete backward-compatible wrapper classes during integration simplification -- if tests mock a class directly (e.g., CerebellumInference), the class must remain even when production routing changes
- NEVER: Do not widen union types for inference modes beyond what is actively used -- dead type branches create untested code paths and confuse consumers
- NEVER: Do not introduce npm SDK dependencies for API integrations that have straightforward REST request/response shapes -- prefer native fetch with manual type assertions
- NEVER: Do not chain more than two re-export hops for shared types -- import directly from the canonical barrel export rather than intermediate re-exporters
- NEVER: Do not enable structured tool calling on an inference backend while using a text-completion-style system prompt -- the system prompt format MUST match the inference mode (tool calling requires function-call-style prompts, not hex bytecode prompts)
- NEVER: Do not assume a model is misbehaving when it produces the same output regardless of input variation -- first check for prompt/mode configuration mismatches before debugging model behavior
