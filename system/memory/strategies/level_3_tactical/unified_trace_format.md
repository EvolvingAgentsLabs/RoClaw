---
id: strat_3_unified_trace_format
version: 1
hierarchy_level: 3
title: Unified Trace Format for Cross-Project Learning
trigger_goals: ["trace standardization", "cross-project dream", "format convergence", "memory interoperability", "execution logging"]
preconditions:
  - "Multiple projects write execution traces (RoClaw, skillos, evolving-memory)"
  - "Projects use incompatible field names and hierarchy structures"
  - "Dream consolidation needs to read traces from multiple sources"
confidence: 0.65
success_count: 1
failure_count: 0
source_traces: ["2026-04-26_strategic_analysis_trace"]
deprecated: false
---

# Unified Trace Format for Cross-Project Learning

## Problem Statement

Currently, traces from different projects use incompatible formats:

| Project | Hierarchy | Key Fields | Payload Format |
|---|---|---|---|
| **RoClaw** | Level: 1-4 (numeric) | Goal, Source, Outcome, Duration, Reason | YAML frontmatter + markdown body |
| **skillos** | Not hierarchical (or inconsistent) | Goal, Agent, Context | Markdown with varied structure |
| **evolving-memory** | hierarchy_level: L1-L4 (enum) | goal, outcome, source, timestamp | YAML frontmatter only |

**Impact:** Dream consolidation cannot:
- Identify parent-child relationships across projects
- Normalize confidence scores from different sources
- Aggregate fidelity-weighted traces for cross-project learning
- Recognize duplicate patterns from different projects

## Unified Schema

All traces MUST conform to this format:

### Frontmatter (YAML)

```yaml
---
# Identity
traceId: "tr_[project]_[timestamp]_[randomhex]"
timestamp: "2026-04-26T18:00:00Z"

# Hierarchy (REQUIRED)
level: 1  # 1=Epic, 2=Architecture, 3=Tactical, 4=Reactive/Motor
parentTraceId: null  # or "tr_xxx" for child traces

# Execution Semantics
goal: "Detailed goal description"
outcome: "SUCCESS|FAILURE|PARTIAL|UNKNOWN|ABORTED"  # lowercase enum
reason: "Explanation of outcome"
confidence: 0.75  # [0.0-1.0], fidelity-weighted by source

# Source & Fidelity
source: "REAL_WORLD|SIM_3D|SIM_2D|DREAM_TEXT"  # canonical sources
fidelity: 1.0  # Auto-computed: REAL_WORLD=1.0, SIM_3D=0.8, SIM_2D=0.5, DREAM_TEXT=0.3

# Execution Details
duration_ms: 1234  # Total execution time
strategy_applied: null  # or "strat_2_strategy_slug" if a strategy was used

# Dream Metadata (for dream engine)
dream_id: "dream_20260426_convergence_f7a2"  # Which dream processed this trace
dream_processed: false  # Set to true when dream consolidation completes
---
```

### Markdown Body

The body contains narrative documentation and structured data:

```markdown
# [Goal Title]

## Scene Description
[VLM perception, sensor data, or narrative scene description]

## Actions Executed
1. [Action 1 with parameters]
2. [Action 2 with parameters]
3. [Action 3 with parameters]

## Child Traces (if parent)
- tr_xxx (goal: ..., outcome: SUCCESS)
- tr_yyy (goal: ..., outcome: FAILURE)

## Analysis
[Optional human or agent analysis of why outcome occurred]

## Constraints Violated (if FAILURE)
- Constraint 12: [description]
- Constraint 24: [description]

## Related Strategies
- strat_1_xyz: [how strategy applies to this trace]
- strat_2_abc: [alternative strategy that might work]

## Notes
[Any additional context for dream consolidation]
```

## Mapping Existing Projects

### RoClaw Traces
Already mostly aligned. Changes needed:
- Change `Source: REAL_WORLD` to `source: real_world` (lowercase)
- Change `Level: 1` to `level: 1` (lowercase)
- Ensure all traces have `traceId` field
- Add `parentTraceId` field for hierarchical linking
- Add optional `strategyApplied` field

Example migration:
```yaml
# OLD
Level: 1
Goal: Navigate to the kitchen
Source: REAL_WORLD
Outcome: SUCCESS

# NEW
level: 1
parentTraceId: null
goal: Navigate to the kitchen
source: REAL_WORLD
outcome: success  # lowercase
fidelity: 1.0
```

### Skillos Traces
Need structural change:
- Add `level` field (infer from context if needed)
- Add `source` field (default to DREAM_TEXT)
- Add `outcome` field (infer from execution status)
- Add `traceId` field (generate from project + timestamp)
- Add `parentTraceId` for hierarchical linking

### Evolving-Memory Traces
Need alignment:
- Change `hierarchy_level: "L1"` to `level: 1` (numeric, not string)
- Change `source: "sim_3d"` to `source: SIM_3D` (uppercase)
- Change `outcome: "success"` to `outcome: SUCCESS` (uppercase)
- Add `traceId` field if missing
- Ensure `parentTraceId` is present (or null)

## Implementation Plan

### Phase 1: Define Standard (2026-04-27)
1. Publish `trace_schema.json` in llm_os/grammar/
2. Create validation tool: `trace validate traces/*.md`
3. Create migration tool: `trace migrate --from=roclaw --to=unified traces/`

### Phase 2: Migrate RoClaw (2026-04-28)
1. Run migration tool on all RoClaw traces
2. Run validator on migrated traces
3. Verify dream consolidation still works

### Phase 3: Migrate Skillos (2026-04-29)
1. Add `level` field to all skillos execution logs
2. Add `source: DREAM_TEXT` to all skillos-generated traces
3. Generate `traceId` for all traces

### Phase 4: Migrate Evolving-Memory (2026-04-30)
1. Update enum values (UPPERCASE for source/outcome)
2. Convert hierarchy_level to numeric
3. Add `traceId` generation

### Phase 5: Validate Cross-Project (2026-05-01)
1. Run dream consolidation on mixed-project traces
2. Verify pattern recognition works across projects
3. Test parent-child relationships across project boundaries

## Fidelity Computation

Fidelity is auto-computed from `source` field:

```python
def fidelity_from_source(source: str) -> float:
    return {
        "REAL_WORLD": 1.0,
        "SIM_3D": 0.8,
        "SIM_2D": 0.5,
        "DREAM_TEXT": 0.3,
    }.get(source, 0.6)  # default 0.6 for unknown
```

Confidence can be manually set or auto-computed as:
```python
confidence = base_confidence * fidelity_from_source(source)
```

## Hierarchy Semantics

```
L1 (Epic): Portfolio-level goal
  ├─ L2 (Architecture): System design, integration
  │   ├─ L3 (Tactical): Feature implementation, bug fix
  │   │   └─ L4 (Reactive): Motor control, single opcode sequence
  │   └─ L3 (Tactical): ...
  └─ L2 (Architecture): ...
```

Parent traces SHOULD include `child_trace_ids` list in markdown body.

## Validation Rules

When dream consolidation loads a trace, it checks:

1. `traceId` exists and is unique across all traces loaded
2. `level` is in [1, 2, 3, 4]
3. `outcome` is one of: SUCCESS, FAILURE, PARTIAL, UNKNOWN, ABORTED
4. `source` is one of: REAL_WORLD, SIM_3D, SIM_2D, DREAM_TEXT
5. `confidence` is in [0.0, 1.0]
6. `timestamp` is valid ISO 8601
7. If `parentTraceId` is set, that parent must exist and have `level < child.level`
8. `fidelity` matches `source` (or is recomputed)

Traces failing validation are skipped with a warning.

## Example: Unified RoClaw Trace

```yaml
---
traceId: tr_roclaw_20260426T180000_a7f2
timestamp: 2026-04-26T18:00:00Z
level: 2
parentTraceId: null
goal: "Navigate through hallway to kitchen with obstacle avoidance"
outcome: success
reason: "Robot reached kitchen, all tactical steps completed"
confidence: 0.82
source: REAL_WORLD
fidelity: 1.0
duration_ms: 3421
strategy_applied: strat_2_architecture_hallway_nav
dream_id: dream_20260426_convergence_f7a2
dream_processed: false
---

# Hallway Navigation L2 Trace

## Scene Description
I see a white hallway with a door on the left wall, ~2m away. Several obstacles: a plant near the door, a chair 1.5m ahead. Robot is centered in hallway.

## Actions Executed
1. MOVE_FORWARD (speed: 80, distance_estimate: 1000cm)
2. DETECT_OBSTACLE (bearing: 15°, distance: 150cm)
3. ROTATE_CW (degrees: 45, speed: 50)
4. MOVE_FORWARD (speed: 60, distance_estimate: 500cm)
5. TURN_RIGHT (speed_l: 100, speed_r: 70)
6. MOVE_FORWARD (speed: 50, distance_estimate: 200cm)

## Child Traces
- tr_roclaw_20260426T180015_b2d4 (L3, goal: obstacle avoidance, outcome: SUCCESS)
- tr_roclaw_20260426T180021_c1e8 (L3, goal: door alignment, outcome: SUCCESS)
- tr_roclaw_20260426T180027_d9f3 (L4, goal: motor: MOVE_FORWARD, outcome: SUCCESS)

## Related Strategies
- strat_2_hallway_navigation: Directly applied (strategy_applied field)
- strat_3_obstacle_detection: Used for L3 child trace
- strat_3_stuck_detection: Not needed (continuous progress detected)

## Notes
Fidelity 1.0 (real hardware). Confidence 0.82 reflects the scene complexity (multi-object obstacle field) and successful outcome.
```

## Negative Constraints Applied

- Constraint 25: Unified trace format is the solution to format chaos
- Constraint 27: This work is prerequisite for flywheel closure (before fine-tuning)
- Constraint 28: Traces must be interoperable for the consolidation loop to work

## Success Criteria

- Validation tool passes on 100% of migrated traces (target: 2026-04-30)
- Dream consolidation successfully reads mixed-project traces (target: 2026-05-01)
- Cross-project pattern recognition works (e.g., RoClaw trace informs skillos strategy) (target: 2026-05-05)
- All new traces use unified format automatically (target: 2026-04-28)

## Notes

This strategy is essential for **closing the flywheel loop**. Without unified traces, dream consolidation cannot aggregate learning across projects. With unified traces, every project's execution becomes training data for every other project's kernel.

The format is intentionally minimal (6 required fields) to reduce friction for existing projects while providing enough structure for cross-project analysis.
