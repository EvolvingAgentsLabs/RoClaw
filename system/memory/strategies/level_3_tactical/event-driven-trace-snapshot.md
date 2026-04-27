---
id: strat_3_event-driven-trace-snapshot
version: 1
hierarchy_level: 3
title: Event-Driven Scene Graph Snapshot for Dream Consolidation
trigger_goals: ["auto-snapshot", "trace collector", "event wiring", "scene graph snapshot", "dream feedback loop", "ReflexGuard veto trace", "TelemetryMonitor stall trace"]
preconditions: ["Sim3DTraceCollector instantiated with tracesDir", "SceneGraph reference set via setSceneGraph()", "VisionLoop active with EventEmitter events (bytecode, arrival, stuck, stepTimeout)", "ReflexGuard attached to transmitter (optional, for veto snapshots)", "TelemetryMonitor processing UDP messages (optional, for stall snapshots)"]
confidence: 0.70
success_count: 4
failure_count: 0
source_traces: ["tr_mohr7wx1_qsj5", "tr_mohr7wy9_fs0q", "tr_mohr98bv_em52", "tr_mohr98dp_blsy", "strategic-analysis-2026-04-27-section-8-T1.4"]
deprecated: false
---

# Event-Driven Scene Graph Snapshot for Dream Consolidation

## Steps
1. **Instantiate Sim3DTraceCollector** with a `tracesDir` configuration. Set the SceneGraph reference via `collector.setSceneGraph(graph)` so snapshots capture spatial state.
2. **Attach to VisionLoop** via `collector.attach(visionLoop, goal)`. This internally wires four events:
   - `bytecode` -- captures every VLM frame emission as a FrameCapture
   - `arrival` -- auto-snapshots the scene graph at goal confirmation (moment: "arrival")
   - `stuck` -- auto-snapshots at low-entropy motor pattern detection (moment: "stuck")
   - `stepTimeout` -- auto-snapshots on frame processing timeout (moment: "timeout")
3. **Wire ReflexGuard veto events** to the trace collector. Subscribe to both `reflexStop` (active mode vetoes) and `shadowVeto` (shadow mode would-be vetoes). On each event, call `collector.snapshotSceneGraph('reflex_veto:<obstacleLabel>')` or `collector.snapshotSceneGraph('shadow_veto:<obstacleLabel>')`. This captures the spatial state at the exact moment a collision was predicted.
4. **Wire TelemetryMonitor stall events** to the trace collector. Subscribe to the `stall` event (rising edge only: false->true transition). On stall, call `collector.snapshotSceneGraph('telemetry_stall')`. This captures the spatial state when the robot physically stalls (motor current thresholds exceeded).
5. **On shutdown or navigation completion**, call `collector.detach(visionLoop)` then `collector.writeTrace()`. The trace file includes YAML frontmatter with `scene_nodes` and `collisions_predicted` counts, plus a "Scene Graph Snapshots" section with timestamped markdown tables for each snapshot moment.

## Negative Constraints
- Do not wire events before calling setSceneGraph() -- snapshotSceneGraph() silently returns if no graph is set, producing traces without spatial context
- Do not subscribe to ReflexGuard events without also setting the SceneGraph on the collector -- the veto snapshot will be empty
- Do not rely solely on VisionLoop internal events (arrival/stuck/timeout) for comprehensive trace capture -- ReflexGuard and TelemetryMonitor events provide fundamentally different information (predicted collisions vs. physical stalls vs. VLM-detected stuck patterns)
- Do not emit snapshots on every telemetry message -- only on rising-edge stall transitions (false->true), otherwise trace files balloon with redundant spatial data

## Notes
- This strategy implements Milestone M1 of the Continuous Dream Consolidation Flywheel (strategic-analysis-2026-04-27, Section 8). M1 is the zero-risk, pure-software foundation that enables the entire flywheel: traces -> dream -> strategies -> cartridge -> fine-tune -> kernel.
- The `moment` string tag in each snapshot (e.g., "reflex_veto:wall", "telemetry_stall", "arrival") enables the dream engine to distinguish WHY a snapshot was taken, which is critical for Phase 1 (SWS) failure analysis vs Phase 2 (REM) success abstraction.
- The snapshotSceneGraph() method is public specifically to enable external callers (ReflexGuard, TelemetryMonitor, future subsystems) to inject snapshots without modifying the collector internals. This is the extension point for future event sources.
- Scene graph snapshots are serialized as markdown tables via serializeSceneGraph() and include collision prediction counts via countCollisionPredictions(). Both are exported from roclaw_dream_adapter.ts.
- Reference implementation: `scripts/run_sim3d.ts` lines 608-635 (attach + event wiring), `src/3_llmunix_memory/sim3d_trace_collector.ts` (collector + snapshotSceneGraph API)
- Validated by: `__tests__/memory/dream-scene-graph.test.ts` (scene graph serialization + trace collector integration tests)
