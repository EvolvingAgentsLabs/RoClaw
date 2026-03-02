# LLMunix Evolution

## Markdown Memory

RoClaw's memory system is radically simple: markdown files and JSON graphs.

```
src/3_llmunix_memory/
├── trace_types.ts        # Shared types (HierarchyLevel, TraceOutcome, Strategy, etc.)
├── trace_logger.ts       # Hierarchical trace recorder (v2) + legacy appendTrace()
├── strategy_store.ts     # Read/write hierarchical strategy files with YAML frontmatter
├── memory_manager.ts     # Strategy-aware memory context for Cortex
├── dream_inference.ts    # LLM inference adapter for Dreaming Engine
├── semantic_map.ts       # VLM-powered topological graph (Navigation CoT)
├── semantic_map_loop.ts  # Async sidecar that feeds camera frames to the map
├── system/
│   ├── hardware.md       # Physical specs (wheel size, motor limits)
│   └── identity.md       # "I am RoClaw"
├── skills/               # Flat skill files (legacy, from Dreaming Engine v1)
├── strategies/           # Hierarchical strategies (from Dreaming Engine v2)
│   ├── level_1_goals/    # Goal decomposition strategies
│   ├── level_2_routes/   # Multi-room navigation strategies
│   ├── level_3_tactical/ # Intra-room movement strategies
│   ├── level_4_motor/    # Motor pattern strategies
│   ├── _seeds/           # Bootstrap strategies (checked into git)
│   ├── _negative_constraints.md  # Anti-patterns from failures
│   └── _dream_journal.md        # Append-only dream session log
└── traces/
    ├── semantic_map.json # Pose→label store (simple observations)
    ├── topo_map.json     # Topological graph (nodes + edges)
    └── trace_*.md        # Execution trace files (v1 + v2 format)
```

No database. No vector store. No embeddings. Just text files and JSON that an LLM can read and write.

## System Memory

The `system/` directory contains immutable facts about the robot:

- **hardware.md**: Motor specs, chassis dimensions, camera resolution, safety limits. This is injected into every VLM prompt so the Cerebellum understands its physical constraints.
- **identity.md**: Who the robot is. This grounds the LLM's self-model.

## Semantic Map

The **Semantic Map** is the robot's topological memory — a graph where nodes are locations (identified by VLM-extracted visual features) and edges are navigation paths between them. It powers the [Navigation Chain of Thought](../README.md#navigation-chain-of-thought).

Two layers:
- **PoseMap** (`semantic_map.json`): Simple pose→label store. Records observations as the robot drives.
- **SemanticMap** (`topo_map.json`): VLM-powered topological graph. Each node stores a location label, description, visual features, and navigation hints. Edges record how the robot traversed between locations.

The SemanticMap runs as an async background sidecar (`SemanticMapLoop`) alongside the Cerebellum's vision loop. It captures the latest camera frame, asks the VLM to describe the scene, then analyzes the description to build and update the graph. Both `analyzeScene()` and `processScene()` accept optional images for direct vision analysis.

Navigation planning now accepts optional `strategyHint` and `constraints` parameters, which inject strategy knowledge into the VLM prompt for more informed motor decisions.

The full pipeline is validated with E2E tests using real indoor photographs — see `__tests__/navigation/semantic-map-vision.e2e.test.ts`.

## Hierarchical Strategies

The `strategies/` directory stores learned behaviors organized by the 4-tier cognitive hierarchy:

| Level | Directory | Purpose | Example |
|-------|-----------|---------|---------|
| 1 (Goal) | `level_1_goals/` | High-level goal decomposition | "Fetch pattern: go to X, find Y, return" |
| 2 (Strategy) | `level_2_routes/` | Multi-room navigation routes | "Room exploration: systematic sweep pattern" |
| 3 (Tactical) | `level_3_tactical/` | Intra-room movement patterns | "Doorway approach: slow down, center, proceed" |
| 4 (Reactive) | `level_4_motor/` | Motor control patterns | "Obstacle avoidance: stop, scan, turn away" |

Each strategy is a markdown file with YAML-like frontmatter:

```markdown
---
id: strat_4_obstacle-avoidance
version: 1
hierarchy_level: 4
title: Basic Obstacle Avoidance
confidence: 0.3
success_count: 0
failure_count: 0
trigger_goals:
  - explore
  - avoid obstacles
  - navigate
preconditions:
  - Camera feed available
  - Motors operational
source_traces: []
deprecated: false
---

# Basic Obstacle Avoidance

## Steps
1. When obstacle detected within ~20cm, issue STOP
2. Scan left and right by rotating in place
3. Turn toward the direction with more open space
4. Resume forward movement at reduced speed

## Negative Constraints
- Never accelerate toward a detected obstacle
- Never ignore persistent obstacles hoping they will move
```

### Seed Strategies

The `_seeds/` directory contains 5 bootstrap strategies with `confidence: 0.3` (theoretical, never tested). These provide useful defaults before the robot has accumulated any real traces:

- `seed_4_obstacle-avoidance.md` — Stop and turn when obstacle detected
- `seed_4_wall-following.md` — Hug wall using differential speed
- `seed_3_doorway-approach.md` — Slow down, center, proceed through doors
- `seed_2_room-exploration.md` — Systematic room sweep pattern
- `seed_1_fetch-pattern.md` — Go to X, find Y, return

As the Dreaming Engine processes real traces, it either reinforces seeds (increasing confidence) or deprecates them.

### Strategy Selection (Composite Scoring)

When the planner queries `findStrategies(goal, level)`, strategies are scored using a weighted composite:

| Factor | Weight | Description |
|--------|--------|-------------|
| Trigger match quality | 50% | Exact match (1.0) > substring (0.7) > word overlap (0.4) |
| Confidence | 30% | The strategy's `confidence` field (0-1), updated by reinforcement and decay |
| Success rate | 20% | `successCount / (successCount + failureCount)`, defaults to 0.5 for untested strategies |

Strategies with a composite score below 0.2 are filtered out. The planner matches strategies **per step** — each step in a multi-step plan finds the best strategy for its own description rather than reusing a single strategy for all steps.

### Negative Constraints

The `_negative_constraints.md` file accumulates anti-patterns extracted from failure traces — things the robot learned NOT to do. These are injected into the VisionLoop's system prompt alongside strategy hints.

Example:
```markdown
- **WARNING**: Do not accelerate when obstacle is within 15cm (context: indoor navigation)
- **CRITICAL**: Do not attempt tight turns in narrow hallways (context: hallway navigation)
```

## Execution Traces

Traces accumulate during operation in `traces/trace_YYYY-MM-DD.md`. The system supports two formats:

### v1 Format (legacy)

```markdown
### Time: 2026-02-22T14:23:00.000Z
**Goal:** explore and avoid obstacles
**VLM Reasoning:** I see a clear hallway ahead with no obstacles...
**Compiled Bytecode:** `AA 01 64 64 01 FF`
---
```

### v2 Format (hierarchical)

```markdown
### Time: 2026-03-01T10:15:30.000Z
**Trace ID:** tr_abc123_xyz
**Level:** 3
**Parent:** tr_parent456_def
**Goal:** navigate through doorway
**VLM Reasoning:** Doorway detected ahead, centering...
**Compiled Bytecode:** `AA 01 3C 3C 3D FF`
---
```

v2 traces add optional fields that v1 parsers skip — full backward compatibility is maintained.

### REACTIVE Traces (Level 4)

The VisionLoop automatically generates Level 4 REACTIVE traces by wrapping every 10 bytecodes in a windowed trace parented to the active higher-level trace. These give the Dreaming Engine motor-sequence-level data for pattern learning:

- **On arrival** — the reactive trace closes as SUCCESS (the motor sequence achieved its sub-goal)
- **On stuck/timeout** — the reactive trace closes as FAILURE (the motor sequence didn't work)
- **On window complete** — the reactive trace closes as UNKNOWN and a new window opens

This ensures the Dreaming Engine's REM phase has Level 4 traces with outcome data, enabling it to abstract successful motor patterns into reusable reactive strategies and extract negative constraints from failures.

### Trace Lifecycle

The `HierarchicalTraceLogger` class manages trace lifecycle:

1. `startTrace(level, goal)` — Open a new trace with a unique ID
2. `appendBytecode(traceId, vlmOutput, bytecode)` — Record each inference cycle
3. `endTrace(traceId, outcome, reason?)` — Close the trace with SUCCESS/FAILURE/PARTIAL

## The Dreaming Engine

Between active operation periods, RoClaw "dreams" — reviewing traces, extracting patterns, and consolidating them into reusable strategies.

### v2: LLM-Powered Consolidation

The Dreaming Engine v2 (`scripts/dream.ts`) uses LLM inference to analyze traces, modeled on biological sleep phases:

**Phase 1 — Slow Wave Sleep (Replay & Pruning):**
1. Read all `trace_*.md` files, parse both v1 and v2 formats
2. Check `_dream_journal.md` for last dream timestamp, filter to new traces only
3. Group traces into sequences by `parentTraceId` links or goal + time proximity (30s window)
4. Score each sequence: `confidence × outcomeWeight × recencyBonus / durationPenalty`
5. For FAILURE sequences: call LLM to extract negative constraints
6. Prune sequences below confidence threshold

**Phase 2 — REM Sleep (Strategy Abstraction):**
1. Group successful traces by hierarchy level
2. Summarize each sequence compactly (~200 tokens, with RLE-compressed bytecodes)
3. Check for existing matching strategies (fuzzy `triggerGoal` overlap)
4. If match exists: call LLM to merge new evidence into existing strategy
5. If no match: call LLM to abstract traces into a new strategy
6. Deprecate strategies with high failure rates

**Phase 3 — Consolidation:**
1. Write new strategies to `strategies/level_N_*/strat_N_<slug>.md`
2. Reinforce existing strategies confirmed by new traces
3. Write negative constraints to `_negative_constraints.md`
4. Generate and append a dream journal entry to `_dream_journal.md`
5. Delete processed trace files older than retention period (default 7 days)
6. Clear memory manager cache

### Usage

```bash
npm run dream      # v2: LLM-powered 3-phase consolidation
npm run dream:v1   # v1: Statistical 3-opcode sliding-window patterns
```

### Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `DREAM_MODEL` | (uses QWEN_MODEL) | Model for dream inference |
| `DREAM_MAX_TOKENS` | 2048 | Max tokens per dream LLM call |
| `DREAM_TEMPERATURE` | 0.3 | Temperature for dream inference |
| `DREAM_BATCH_SIZE` | 10 | Max trace sequences per LLM call |
| `DREAM_WINDOW_DAYS` | 7 | Only process traces from last N days |
| `DREAM_RETENTION_DAYS` | 7 | Delete processed traces older than N days |

### Cold Start

When no API key is configured or no traces exist, the dream engine installs seed strategies from `_seeds/` and exits. This ensures the robot has useful baseline behaviors from the first run.

### v1: Statistical Pattern Extraction (Legacy)

The original Dreaming Engine (`scripts/dream_v1.ts`) uses a simpler statistical approach:

1. Parse trace files into structured entries (timestamp, goal, bytecode)
2. Extract opcode sequences grouped by goal
3. Find 3-command sliding-window patterns that appear 3+ times
4. Generate skill markdown files in `src/3_llmunix_memory/skills/`

This is preserved for environments where LLM API access is unavailable.

## The Evolution Loop

The complete evolution cycle:

1. **Operate** — Execute goals, accumulate hierarchical traces
2. **Dream** — LLM-powered consolidation: failures → constraints, successes → strategies
3. **Remember** — Strategies + constraints stored in `strategies/` directory
4. **Evolve** — Planner queries strategies for next operation, VisionLoop uses constraints
5. **Repeat** — New traces reflect improved behavior, next dream cycle refines further
