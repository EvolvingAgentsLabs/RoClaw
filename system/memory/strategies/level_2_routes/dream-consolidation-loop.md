---
id: strat_2_dream-consolidation-loop
version: 2
hierarchy_level: 2
title: Full Cognitive Loop -- Run then Dream then Improve
trigger_goals: ["dream", "consolidate", "learning loop", "improve", "cognitive loop", "run dream improve", "auto-snapshot", "event wiring", "trace collector", "dream flywheel"]
preconditions: ["DreamEngine instantiated with adapter and mock inference", "StrategyStore with writable directory", "Trace files from prior execution cycles available"]
confidence: 0.55
success_count: 2
failure_count: 0
source_traces: ["cognitive-stack-ab.test.ts:716-779", "dream-engine.test.ts:234-287", "dream_20260311_a7b3", "tr_mohr7wx1_qsj5", "tr_mohr98bv_em52", "strategic-analysis-2026-04-27-section-8"]
deprecated: false
---

# Full Cognitive Loop -- Run then Dream then Improve

## Steps
1. CYCLE 1 (Run): Execute scenarios with baseline inference (no strategies), collecting execution traces with outcomes, confidence, and action sequences
2. AUTO-CAPTURE (v2): Wire EventEmitter events to Sim3DTraceCollector for automatic trace generation. Attach the collector to VisionLoop before navigation starts. Wire ReflexGuard veto events (reflexStop, shadowVeto) and TelemetryMonitor stall events to snapshotSceneGraph() for scene-graph snapshots at critical moments. This replaces manual trace generation for sim3d and real-world runs.
3. GENERATE TRACES: Write structured trace files from execution results using HierarchicalTraceLogger, generateTraces(), or auto-captured Sim3DTraceCollector output, tagging each with source (DREAM_TEXT, SIM_2D, SIM_3D, or REAL_WORLD)
4. DREAM: Instantiate DreamEngine with a DreamDomainAdapter and mock inference function. Run engine.dream() to process traces through SWS (failure analysis) and REM (strategy abstraction) phases
5. EXTRACT: Dream engine produces (a) negative constraints from failure sequences, (b) new strategies from success sequences, (c) a journal entry summarizing the consolidation
6. CYCLE 2 (Improve): Create strategy-augmented inference by injecting learned strategies and constraints. Re-run the same scenarios
7. VALIDATE: Assert that Cycle 2 metrics improve over Cycle 1 -- fewer collisions, fewer stuck events, equal or better goal completion

## Negative Constraints
- Do not skip trace generation between cycles -- the dream engine requires structured traces as input
- Do not use the same inference function for both cycles -- Cycle 2 must incorporate learned knowledge
- Do not assume dream-derived strategies have the same confidence as real-world strategies -- apply fidelity weighting

## Notes
- The test in cognitive-stack-ab.test.ts (Test 8) demonstrates this full loop with obstacle-avoidance as the target scenario
- Dream inference is mocked to return deterministic JSON for failure analysis, strategy abstraction, and summary phases
- The pattern generalizes: any scenario can be improved through this loop as long as traces are properly generated
- Memory fidelity weighting ensures REAL_WORLD experiences (1.0) outweigh DREAM_TEXT (0.3) by 3.33x
- v2 addition: The auto-capture step (Step 2) implements Milestone M1 of the Continuous Dream Consolidation Flywheel (strategic-analysis-2026-04-27). By wiring EventEmitter events to the trace collector, trace generation becomes automatic rather than manual, closing the gap between execution and dream consolidation. See strat_3_event-driven-trace-snapshot for the detailed wiring pattern.
- The scene-graph snapshots captured at veto/stall moments provide the dream engine with spatial context at failure points, enabling more precise failure analysis in SWS phase and more targeted strategy extraction in REM phase
