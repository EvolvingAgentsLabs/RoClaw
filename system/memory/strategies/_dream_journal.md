# Dream Journal

## 2026-04-27T23:45:00Z
**Dream ID:** dream_20260427_a7f3
**Mode:** goal-focused
**Filter:** architecture documentation ARCHITECTURE.md update SceneGraphPolicy ReflexGuard Spartun3D roadmap next steps
- Traces processed: 1 (trace_2026-04-27.md) + architecture documentation corpus (ARCHITECTURE.md, strategic-analysis-2026-04-27.md, NEXT_STEPS.md, source code changes)
- Sequences analyzed: 3 (L2 architecture documentation update with research backing, L2 perception policy transition, L3 egocentric spatial grounding implementation)
- Strategies created: 3 (L2x2: research-backed-architecture-documentation, perception-policy-transition; L3x1: egocentric-spatial-grounding)
- Strategies updated: 0
- Strategies deprecated: 0
- Constraints learned: 3 (Constraints 37-39: 8B minimum for spatial distillation, ISA documentation accuracy, camera-ready boot check)
- Traces pruned: 0 (goal-focused mode -- no pruning)

This goal-focused dream session consolidated the architecture documentation update executed on 2026-04-27, which cross-referenced 4 peer-reviewed papers (Spartun3D ICLR 2025, NavGPT-2 ECCV 2024, Martorell UBA/CONICET 2025, Tehenan et al. 2025) against the RoClaw codebase to produce a comprehensive ARCHITECTURE.md with 8 Mermaid diagrams, a research-backed roadmap, and corresponding code changes. Three reusable strategies were extracted: (1) a methodology for research-backed architecture documentation that cross-references papers with codebase reality and idea storm proposals, (2) a perception policy transition pattern for moving from direct VLM motor control to scene-graph-mediated deterministic control (validated by all 4 papers), and (3) a tactical pattern for adding Spartun3D-style egocentric spatial grounding fields to the VLM pipeline. Three negative constraints were learned: Constraint 37 (high severity) captures the critical Martorell finding that sub-8B models fail at spatial reasoning, contradicting the NEXT_STEPS.md target of Qwen3-VL-2B; Constraint 38 (medium) addresses documentation-code coherence for ISA versioning; Constraint 39 (medium) addresses the recurring "Camera offline" FAILURE traces that pollute dream consolidation across 4+ days of test sessions.

**Key Strategic Insight**: The architecture documentation update demonstrated that grounding architectural decisions in peer-reviewed research produces stronger design rationale, identifies contradictions between assumptions and evidence (the 2B vs 8B model size question), and creates a roadmap that is defensible rather than aspirational. The SceneGraphPolicy-as-default transition is the strongest-evidenced architectural decision in the project -- all 4 papers independently support separating VLM perception from motor policy.

---

## 2026-04-27T23:59:00Z
**Dream ID:** dream_20260427_b3c9
**Mode:** goal-focused
**Filter:** auto-snapshot, trace collector, ReflexGuard, veto, TelemetryMonitor, stall, event wiring, sim3d_trace_collector, snapshotSceneGraph
- Traces processed: 1 (trace_2026-04-27.md: 20 trace entries from test/real-world session)
- Sequences analyzed: 6 (2 failure sequences with camera-offline cascades, 4 success sequences with navigation completion)
- Strategies created: 2 (L2x1: progressive-safety-deployment; L3x1: event-driven-trace-snapshot)
- Strategies updated: 1 (strat_2_dream-consolidation-loop v1->v2: added auto-capture step with event wiring)
- Strategies deprecated: 0
- Constraints learned: 0 (camera-readiness constraint already written by parallel dream_20260427_a7f3 as Constraint 39)
- Traces pruned: 0 (goal-focused mode -- no pruning)

This goal-focused dream session consolidated the EventEmitter event wiring pattern for automatic trace snapshot capture during navigation runs. The primary evidence came from the implemented code in sim3d_trace_collector.ts (snapshotSceneGraph API), reflex_guard.ts (three-mode progressive deployment with reflexStop/shadowVeto events), telemetry_monitor.ts (rising-edge stall detection), and the wiring code in run_sim3d.ts (lines 608-635) that connects all three event sources to the trace collector. The 2026-04-27 trace file provided 4 successful navigation sequences and 2 failure sequences (camera-offline race condition), while the strategic-analysis-2026-04-27.md explicitly identifies auto-snapshot (Section 8, T1.4) as Milestone M1 of the Continuous Dream Consolidation Flywheel.

**Key Strategic Insight**: The event-driven trace snapshot pattern closes a critical gap in the dream consolidation loop. Previously, trace generation required manual invocation or post-hoc processing. With EventEmitter wiring, every ReflexGuard veto, TelemetryMonitor stall, VisionLoop arrival/stuck/timeout event automatically captures a scene graph snapshot with a descriptive moment tag. This means the dream engine receives spatially-contextualized failure data automatically, without operator intervention. The pattern follows a three-layer architecture: (1) event sources (VisionLoop, ReflexGuard, TelemetryMonitor) emit typed events, (2) Sim3DTraceCollector subscribes and snapshots, (3) dream engine processes the tagged snapshots differentially (veto snapshots inform SWS failure analysis, arrival snapshots inform REM success abstraction).

**Parallel Dream Coordination**: A concurrent dream session (dream_20260427_a7f3) already processed the same trace file and strategic analysis document, extracting architecture documentation strategies and constraints 37-39. This session (dream_20260427_b3c9) focused exclusively on the event wiring pattern and produced complementary, non-overlapping strategies. No constraint duplication occurred because Constraint 39 (camera-readiness boot check) was already written by the parallel session.

---

## 2026-04-27T23:59:30Z
**Dream ID:** dream_20260427_a7f3_spatial
**Mode:** goal-focused
**Filter:** Spartun3D egocentric spatial grounding distance estimation direction_from_agent passby_objects VLM prompt scene_response_parser vision_projector
- Traces processed: 2 (docs/strategic-analysis-2026-04-27.md as synthesized trace, source code evidence across scene_response_parser.ts + vision_projector.ts + bytecode_compiler.ts)
- Sequences analyzed: 3 (L2 situated scene graph architecture, L3 egocentric perception pipeline, L3 safe optional field parsing)
- Strategies created: 3 (L2x1: situated-scene-graph-architecture; L3x2: egocentric-spatial-perception-pipeline, safe-vlm-optional-field-parsing)
- Strategies updated: 0
- Strategies deprecated: 0
- Constraints learned: 3 (Constraints 40-42: distance range validation, optional field test coverage, passby_objects cross-reference)
- Traces pruned: 0 (goal-focused mode -- no pruning)

This goal-focused dream session consolidated the Spartun3D-style egocentric spatial grounding implementation pattern across the RoClaw VLM perception pipeline. The session analyzed the strategic analysis document (2026-04-27) which cross-referenced 4 peer-reviewed papers with the codebase, plus the actual code changes that added three egocentric fields (estimated_distance_cm, direction_from_agent, passby_objects) to the GeminiObject interface, OVERHEAD_SCENE_PROMPT, and scene_response_parser. Three reusable strategies were extracted covering the architecture (L2), the implementation pipeline (L3), and the safe parsing pattern (L3). The SWS phase identified a critical test coverage gap: scene-response-parser.test.ts has zero assertions for the three egocentric fields despite full implementation in the parser. Three constraints (40-42) address distance range validation, optional field test coverage, and passby_objects label cross-referencing.

**Integration with Parallel Dreams (a7f3, b3c9):** Dream a7f3 focused on architecture documentation and model selection constraints. Dream b3c9 focused on event-driven trace snapshots. This dream (a7f3_spatial) zooms into the IMPLEMENTATION PATTERN for egocentric spatial fields, extracting the reusable coding pattern (type system, prompt engineering, never-throw parser, test requirements) and formalizing the VLM-as-perceiver architecture with full research evidence from 4 papers.

---

## 2026-04-26T23:00:00Z
**Dream ID:** dream_20260426_exec_pruning_kernel_validation
**Mode:** goal-focused (per-agent parallel)
**Filter:** validation, reference integrity, dangling references, compilation check, test verification, portfolio execution
- Traces processed: 1 (2026-04-26_execution_trace: CUT/DEVELOP portfolio operations)
- Sequences analyzed: 1 (L2 portfolio execution with 2 sub-phases: CUT and DEVELOP)
- Strategies created: 3 (all L3 tactical: multi-repo-validation-cascade, doc-debt-tracking-triage, validation-before-deletion-checklist)
- Strategies updated: 0
- Strategies deprecated: 0
- Constraints learned: 4 (Constraints 33-36: validation scope, doc debt tracking, pre-deletion audits, deletion registry)
- Traces pruned: 0 (goal-focused mode -- no pruning)

This goal-focused dream session analyzed the portfolio execution trace from 2026-04-26, specifically the validation findings and remaining documentation debt. The execution achieved SUCCESS with all functional validation checks passing (Python syntax, Rust cargo check, grammar review, reference integrity for code). However, a post-execution audit identified 60+ dangling references in documentation (QWEN.md, README, test files, setup scripts) referencing deleted entities (agent_runtime.py, :8420 evolving-memory port, deleted system/agents/ directory, removed cooking cartridge). This revealed a gap in validation scope: reference integrity checking covered functional code paths but not documentation, examples, API reference docs, or configuration scripts.

**Key Strategic Insight (from execution analysis)**: Validation must be conducted in phases: (1) functional validation catches code-to-code breaks, (2) documentation audit catches doc-to-code breaks. These phases must be SEQUENTIAL and INDEPENDENT. Running them together or skipping documentation audit leaves technical debt that compounds across releases. The portfolio execution successfully conducted Phase 1 but deferred Phase 2, resulting in merged-in dangling references that confuse users and developers.

**Strategies Created**:

1. **strat_3_multi-repo-validation-cascade** (L3 Tactical): A systematic validation cascade for coordinated multi-repo changes. Steps: (1) Pre-deletion audit via grep patterns, (2) Functional validation (syntax, tests, reference integrity), (3) Grammar/format validation, (4) Reference integrity for code, (5) Documentation audit for dangling references, (6) Final test execution. Key insight: functional validation and documentation audit must be SEPARATE phases. The cascade ensures changes don't break code (Phase 2) while also identifying documentation debt for later tracking (Phase 5). Confidence: 0.65 (validated on portfolio execution: functional passed, doc findings identified).

2. **strat_3_doc-debt-tracking-triage** (L3 Tactical): After code deletion, documentation contains stale references. This strategy tracks debt systematically: categorize by type (command examples, tool API docs, script references, comments) and severity (critical breaks user workflows, high confuses developers, medium has workarounds, low is stale context). Critical/high fixes scheduled immediately, medium/low batched into tech debt sprints. Portfolio execution example: 7 README examples (HIGH), 5 QWEN.md tool refs (HIGH), 16 test comments (MEDIUM), setup script refs (HIGH). Confidence: 0.60 (strategy synthesized from post-execution analysis; now actionable for follow-up PR).

3. **strat_3_validation-before-deletion-checklist** (L3 Tactical): A 5-phase checklist preventing post-deletion doc debt. (Phase 1) Pre-deletion audit: grep for all candidates before touching code. (Phase 2) Preparation: update functional code callers. (Phase 3) Deletion: execute removals in isolated commits. (Phase 4) Post-deletion audit: identify all dangling references in docs. (Phase 5) Validation complete: triage and schedule cleanup. This prevents the scenario on 2026-04-26 where deletions were validated functionally but documentation cleanup was deferred indefinitely, leaving dangling references merged into main. Confidence: 0.70 (strongest evidence: the execution trace itself shows where the process failed—Phase 4 post-deletion audit found 60+ items that pre-deletion audit would have caught earlier and documented completely).

**New Negative Constraints (33-36)**:
- Constraint 33: Reference integrity checking MUST cover documentation, not just code
- Constraint 34: Implement doc debt tracking system with priority triage
- Constraint 35: Always pre-audit before deletion; post-audit after deletion
- Constraint 36: Maintain deleted_artifacts.md registry for pattern tracking

**Why This Matters**: The portfolio's successful CUT/DEVELOP execution revealed a blind spot in the validation framework. Functional validation was rigorous (Rust cargo, Python compile, grammar, test suite all passed). But validation was CODE-scoped, not DOCUMENTATION-scoped. Dangling references remained because nobody checked the docs, examples, API reference, or setup scripts for stale entity references. These three strategies + four constraints establish documentation debt as a FIRST-CLASS quality metric equal to functional correctness. Future portfolio operations will conduct both functional AND documentation validation, scheduling cleanup by priority instead of deferring it.

**Integration with Parallel Portfolio Dreams**: This dream complements concurrent execution analysis dreams (kernel_b2f8, pruning_a7e5) and strategic portfolio dreams (f7a2, a3f2, 3a8f). Those dreams focused on architecture convergence, priority sequencing, kernel implementation, and systematic pruning. This dream zooms into EXECUTION VALIDATION, answering the question: "When we execute multi-repo changes, how do we validate them safely?" The answer is three-fold: (1) separate functional and documentation validation, (2) conduct pre-deletion audit before any changes, (3) implement doc debt tracking instead of deferring cleanup.

---

## 2026-04-26T22:45:00Z
**Dream ID:** dream_20260426_kernel_b2f8
**Mode:** goal-focused
**Filter:** grammar swap, ISA-aware compactor, state opcode, KV compaction, parser, trace pipeline, llm_os kernel development
- Traces processed: 1 (tr_20260426_execution_trace_develop_operations from Project_portfolio_execution)
- Sequences analyzed: 1 (L2 epic: ISA-aware KV compaction implementation)
- Strategies created: 3 (L2×2, L3×1)
- Strategies updated: 0
- Strategies deprecated: 0
- Constraints learned: 4 (Constraints 29-32)
- Traces pruned: 0 (goal-focused mode -- no pruning)

This goal-focused dream session consolidated the DEVELOP operations from the 2026-04-26 portfolio execution trace, specifically analyzing the §2 ISA-aware KV compactor implementation in llm_os v0.5. The session extracted three reusable strategies for the llm_os kernel development critical path: (1) **strat_2_isa_aware_state_serialization** (L2 Architecture): formalizes the pattern for extracting ISA state before KV cache compaction and injecting it as a JSON preamble for parser recovery. (2) **strat_2_opcode_addition_to_isa** (L2 Architecture): generalizes the <|state|> addition as a reusable 6-step pattern for future ISA extensions (grammar rule, parser variant, parse function, rehydration logic, test coverage, documentation). (3) **strat_3_cross_project_trace_ingestion** (L3 Tactical): standardizes the pattern for converting markdown-formatted traces to JSON-lined DPO training data via regex-based YAML parsing and schema normalization.

**Key Finding (SWS Phase)**: The DEVELOP operations executed all code changes successfully (grammar, parser, compactor, trace pipeline) but **success criteria validation is incomplete**. NEXT_STEPS.md §2 requires "5000-token dispatch at depth 3 survives compaction without grammar rejects" — this integration test remains pending. The trace notes "Added 3 tests" (parse_state, stream_rehydrates_loop_depth, opcode_response_classification) but these are unit tests, not the full round-trip validation specified in success criteria. This leaves confidence at 0.75 (code working) rather than 0.90 (validated).

**Critical Path Insight**: This dream session also revealed that §1 (grammar swap: 3 HTTP requests → 1 llama.cpp hook) is NOT YET IMPLEMENTED but is the #1 priority in the entire portfolio (NEXT_STEPS lines 34-37: "The 8 Hz Pi 5 budget"). According to NEXT_STEPS.md timeline, §1 requires 3 weeks (W1: prototype multi-grammar stack as llama.cpp patch, W2: teach iod to ship grammar-array, W3: bench 100 sequential calls on Pi 5 hardware). This is the critical blocker for reaching the kernel's theoretical performance ceiling.

**Negative Constraints Extracted** (4 new):
- Constraint 29: Extract ISA state before dropping KV cache tokens, or suffer silent grammar corruption
- Constraint 30: Add new opcodes to BOTH top-stmt and loop-stmt in grammar, never just one level
- Constraint 31: Don't defer integration tests after compaction implementation — success criteria must be validated immediately
- Constraint 32: Standardize trace field names across projects before trace ingestion, or accept silent data loss via regex mismatches

**Why This Matters**: The llm_os kernel represents the portfolio's deepest technical work. This dream session operationalizes the NEXT_STEPS roadmap by (a) formalizing §2 (ISA-aware compaction) as a reusable pattern, (b) documenting the opcode addition methodology for future extensions, and (c) connecting trace ingestion to the fine-tuning flywheel. By extracting these three strategies, future kernel development can reference validated patterns rather than re-deriving them. The four new constraints provide guardrails for the next 6 weeks of §1/§2/§3 work (grammar swap, compaction validation, recovery mechanisms).

---

## 2026-04-26T18:17:02Z
**Dream ID:** dream_20260426_pruning_a7e5
**Mode:** goal-focused
**Filter:** pruning, dead code, file deletion, deprecated stubs, portfolio cleanup, CUT operations
- Traces processed: 1 (tr_2026-04-26_portfolio_execution, L2 execution from Project_portfolio_execution)
- Sequences analyzed: 1 (L2 epic: CUT+DEVELOP portfolio operations with 2 sub-phases)
- Strategies created: 1 (L3×1: multi-repo-systematic-pruning)
- Strategies updated: 0
- Strategies deprecated: 0
- Constraints learned: 4 (new: Constraints 29-32)
- Traces pruned: 0 (goal-focused mode -- no pruning)

This goal-focused dream session analyzed the portfolio execution trace from 2026-04-26, which executed both CUT (deletion) and DEVELOP (new features) operations across skillos, skillos_mini, and llm_os. The session extracted a reusable L3 tactical strategy for **multi-repository systematic pruning** with emphasis on pre-deletion verification and reference cleanup. The execution was marked as "success" overall but revealed **incomplete reference cleanup**: 60+ dangling doc references remain in QWEN.md, README.md, test files (~16 tests referencing deleted cooking cartridge), and setup scripts (setup_agents.sh/ps1). Root cause analysis identified that pre-deletion reference scanning occurred but cleanup was deferred as a separate task, creating reference debt. Four new negative constraints (29-32) codify the learnings: always pre-scan for references before deletion, synchronously update references in the same commit batch as deletion, audit setup scripts for bootstrap consistency, and use dependency ordering (leaf-first) for clustered deletions. Key insight: deferred cleanup batching creates phantom problems during future maintenance (e.g., developers update a deleted module, tests fail on deleted references, docs mislead readers). The new strategy (strat_3_multi-repo-systematic-pruning) operationalizes the 10-step pruning pattern: pre-deletion scan → dependency analysis → test validation → leaf-first deletions → synchronous reference cleanup → doc synchronization → test re-validation → setup script audit → completion verification → cross-project smoke tests.

---

## 2026-04-26T18:15:00Z
**Dream ID:** dream_20260426_convergence_f7a2
**Mode:** goal-focused
**Filter:** convergence strategy eliminate reduce raise create cartridge kernel interface standardize layer-cake portfolio
- Traces processed: 1 (2026-04-26_strategic_analysis_trace, L1 epic from Project_strategic_portfolio_analysis)
- Sequences analyzed: 1 (L1 epic with 5 major findings/antipatterns)
- Strategies created: 4 (L1×1, L2×1, L3×2)
- Strategies updated: 0
- Strategies deprecated: 0
- Constraints learned: 7 (new: Constraints 22-28)
- Traces pruned: 0 (goal-focused mode -- no pruning)

This goal-focused dream session consolidated the strategic portfolio analysis conducted on 2026-04-26, analyzing the convergence opportunity across 4 projects (skillos, skillos_mini, RoClaw, llm_os). The session synthesized architectural learnings into reusable L1-L3 strategies centered on a unified **cartridge kernel** as the portfolio's convergence mechanism.

**Key Strategic Insight (from analysis antipatterns)**: The portfolio's current state is fragmented — RoClaw uses 14 motor opcodes, llm_os uses 13; RoClaw traces use one format, skillos traces another; projects cannot share learned strategies due to incompatible interfaces. The convergence thesis: organize into a **layer-cake architecture** (Product→Platform→Infrastructure→I/O) with **cartridges** as the universal interface (manifest.json + schemas + dialect.gbnf). This enables the flywheel loop (traces → dream → strategies → cartridges → fine-tune → kernel → better traces).

**Strategies Created**:

1. **strat_1_multi_project_convergence_architecture** (L1 Epic): Defines the layer-cake vertical stack. skillos_mini serves product users (oficios trade-app). skillos is the platform for skill creators. llm_os is infrastructure/kernel. RoClaw is I/O. Cartridge is the universal exchange format. Priority roadmap: (Tier 1) grammar swap + ISA-aware compactor, (Tier 2) M1 validation, (Tier 3) trace standardization + dream↔kernel integration, (Tier 4) cartridge registry + fine-tuning. Confidence: 0.75 (synthesized from multiple strategic analyses).

2. **strat_2_cartridge_manifest_standardization** (L2 Architecture): Formal specification of a cartridge manifest (JSON) with input/output schemas, ISA requirements, dialect (GBNF), dependencies, and registry metadata. Every component (RoClaw tool, skillos skill, llm_os capability) becomes an npm-like package. Enables discovery, versioning, composition, and cross-project deployment. Key insight: **cartridge manifest is the Rosetta Stone** between projects. Confidence: 0.70.

3. **strat_3_unified_trace_format** (L3 Tactical): Standardized trace schema with YAML frontmatter (traceId, level, source, fidelity, outcome, confidence) + markdown body. Fidelity auto-computed from source (REAL_WORLD=1.0 → DREAM_TEXT=0.3). Solves cross-project dream learning: currently blocked because traces have incompatible field names. Migration: RoClaw by 2026-04-28, skillos by 2026-04-29, evolving-memory by 2026-04-30. Confidence: 0.65.

4. **strat_3_canonical_isa_convergence** (L3 Tactical): Converges motor control opcodes across projects via canonical ISA v1 (16 opcodes: 0x00-0x0B core + 0x0C-0x0F cartridge-extensible). RoClaw 14-op → canonical 1:1 mapping via bridge adapter (roclaw_bridge.py stays 100% compatible). llm_os 13-op → canonical mapping. Dream-learned motor strategies become executable cartridges. Migration: ISA spec by 2026-04-27, validate on llm_os by 2026-04-30. Confidence: 0.68.

**New Negative Constraints (22-28)**:
- Constraint 22: Validate product (M1) before engineering features (M2+)
- Constraint 23: Prune dead code immediately upon pivot
- Constraint 24: ISA convergence mandatory for cross-project learning
- Constraint 25: Trace format must be standardized
- Constraint 26: Reduce compilation modes 4→2 (eliminate over-engineering)
- Constraint 27: Infrastructure blockers (grammar swap, compactor) prioritized over features
- Constraint 28: Flywheel must complete: traces → dream → strategies → cartridges → fine-tune → kernel

**Integration with Parallel Dream (a3f2)**: Dream a3f2 (also 2026-04-26) focused on priority sequencing and flywheel closure. This dream (f7a2) focuses on architectural standards and implementation details. Together, they provide: (a3f2) what to build first, (f7a2) how to build it so projects converge. Both reference the same strategic analysis trace and extract compatible learnings.

**Why This Matters**: The portfolio is at an inflection point. Without convergence, projects will continue diverging (incompatible ISAs, trace formats, interfaces), making cross-project learning impossible and requiring 3x the engineering effort to reach autonomy. With these 4 strategies and 7 constraints, the portfolio becomes a **unified learning system** where RoClaw's experience informs llm_os fine-tuning, skillos skills become cartridge templates, and dream consolidation drives kernel improvement. This is the **operational implementation of the cartridge kernel thesis**.

---

## 2026-04-26T20:15:00.000Z
**Dream ID:** dream_20260426_a3f2
**Mode:** goal-focused
**Filter:** roadmap, priority, sequencing, grammar, swap, compactor, trade-app, validation, flywheel
- Traces processed: 1 (tr_2026-04-26_strategic_analysis from Project_strategic_portfolio_analysis)
- Sequences analyzed: 1 (L1 Epic: Portfolio convergence with 5 sub-goals)
- Strategies created: 2 (L1 epics: cross-project-priority-sequencing, trace-dream-strategy-flywheel)
- Strategies updated: 0
- Strategies deprecated: 0
- Constraints learned: 4 (Constraints 25-28: infrastructure deferral, flywheel closure, product validation, dead code elimination)
- Traces pruned: 0 (goal-focused mode -- no pruning)

This goal-focused dream session consolidated the 2026-04-26 strategic portfolio analysis from Project_strategic_portfolio_analysis. The analysis spanned 4 projects (llm_os, skillos, skillos_mini, RoClaw), identified architecture patterns, maturity levels, and convergence opportunities. Two major L1 epic strategies were extracted: (1) strat_1_cross-project-priority-sequencing (Tier 1 infrastructure blockers → Tier 2 product validation → Tier 3 interoperability standards → Tier 4 flywheel closure → Tier 5 feature development), and (2) strat_1_trace-dream-strategy-flywheel (the closed learning loop from execution traces → dream consolidation → strategy promotion → cartridge deployment → model fine-tune → better kernel). Four critical constraints were added: Constraint 27 (infrastructure deferral is a blocker), Constraint 28 (trace-to-improvement loop must be closed), and retroactive additions from parallel portfolio analyses (Constraints 22-25: product validation gates, dead code elimination, architectural thesis proof-of-concept, subsystem scope management). The strategic analysis identified llm_os grammar swap as the #1 priority in the entire portfolio (15% latency tax blocks kernel thesis), followed by ISA-aware compactor (correctness guarantee), skillos_mini M1 validation (product-market fit gate), and flywheel closure (enables self-improvement). Key findings: (a) skillos_mini was built with unvalidated M1 assumptions, risking 4-6 weeks of wasted features if market pivot occurs; (b) the trace-to-improvement loop is 60% complete (Phase 1: trace→dream working; Phases 2-4: strategy→cartridge→fine-tune missing); (c) cross-project ISA and trace format divergence prevents portfolio-wide pattern recognition; (d) RoClaw's 25 uncommitted sim traces should be committed immediately as training data for the dream engine. This dream session operationalizes the convergence thesis by decomposing it into executable tiers and identifying the critical path that unblocks everything else.

---

## 2026-03-11T19:00:00.000Z
**Dream ID:** dream_20260311_a7b3
**Mode:** goal-focused
**Filter:** A/B tests, cognitive stack, mock inference, scenario runner, realistic scenarios
- Traces processed: 8 (synthesized from test suite analysis -- 22 A/B test assertions, 5 scenarios, dream engine tests, strategy store tests, fidelity weighting tests, cognitive loop test)
- Sequences analyzed: 7 (2 architecture-level, 4 tactical-level, 1 reactive-level)
- Strategies created: 7
- Strategies updated: 0
- Strategies deprecated: 0
- Constraints learned: 5
- Traces pruned: 0 (goal-focused mode -- no pruning)

This dream session consolidated the A/B testing framework patterns established across 459 passing tests in 26 suites. Key learnings: (1) The Baseline vs Full Stack comparison methodology with mock inference is a reusable architecture-level strategy for validating cognitive stack contributions. (2) Five specific negative constraints were extracted from failure analysis -- most critically, the anti-pattern of moving at full speed near obstacles and using small rotation angles for stuck recovery. (3) Memory fidelity weighting (REAL_WORLD=1.0 down to DREAM_TEXT=0.3) is the foundational mechanism preventing dream-derived strategies from overriding real experience, and this understanding was codified as both a strategy and a constraint.

---

## 2026-03-11T19:30:00.000Z
**Dream ID:** dream_20260311_a7f3
**Mode:** goal-focused
**Filter:** type-check, test suite, backward compatibility, existing tests, project structure
- Traces processed: 6 (synthesized from GeminiCore integration project execution)
- Sequences analyzed: 4 (1 epic-level, 1 architecture-level, 2 tactical-level)
- Strategies created: 4
- Strategies updated: 0
- Strategies deprecated: 0
- Constraints learned: 4
- Traces pruned: 0 (goal-focused mode -- no pruning)

This dream session consolidated the GeminiCore integration project that simplified the inference stack from multi-provider (Claude/Gemini/dual) to Gemini-only. The integration achieved zero test breakage across 26 suites (459 tests, 2 skipped for API keys) with clean tsc --noEmit type-checking, no npm dependency changes, and full project structure preservation. Four reusable strategies were extracted: (1) L1 Zero-Breakage Inference Provider Migration -- the end-to-end migration playbook with type-first verification. (2) L2 InferenceFunction Adapter Pattern -- the architectural abstraction that enabled drop-in provider replacement. (3) L3 Type Narrowing for Dead Code Elimination -- using tsc as a verification tool by narrowing types and letting the compiler surface downstream impacts. (4) L3 Backward-Compatible Wrapper Preservation -- the discipline of keeping test-mocked classes even when production routing changes. Four negative constraints were learned covering wrapper class deletion risk, union type over-widening, unnecessary SDK dependencies, and re-export chain depth limits.

---

## 2026-03-11T20:00:00-03:00
**Dream ID:** dream_20260311_b9e2
**Mode:** goal-focused
**Filter:** gemini migration, inference simplification, dream_inference, dream_inference_router, index.ts
- Traces processed: 9
- Sequences analyzed: 2 (1 epic sequence with 8 child traces, 1 standalone failure trace)
- Strategies created: 4
- Strategies updated: 1
- Strategies deprecated: 0
- Constraints learned: 2
- Traces pruned: 0 (goal-focused mode -- no pruning)

This dream session processed the complete Gemini migration execution trace -- a 7-day effort that moved all RoClaw inference paths from multi-provider (Qwen/OpenRouter/Claude) to Gemini Robotics exclusively. The most valuable new learning was the prompt-mode alignment pattern (strat_3_prompt-mode-alignment): when switching a model from text-completion to tool-calling mode, the system prompt MUST be rewritten to match, or the model produces degenerate repeated outputs. This was discovered when Gemini repeated TURN_LEFT on every frame regardless of camera input because it received a hex bytecode prompt while configured for structured tool calling. The existing L1 migration strategy (strat_1_inference-provider-migration) was updated to v2 with 4 additional steps covering additive backend integration, config simplification, entry point updates, and CLI cleanup. Four new strategies were created: L2 Additive Backend Integration (add new provider alongside existing before routing changes), L3 Prompt-Mode Alignment (match system prompt format to inference mode), L3 Dead Code Removal (safe removal of dead provider paths achieving 61% line reduction), and L3 Systematic Bug Sweep (post-integration mechanism audit that found 8 bugs across 7 files). Two new negative constraints were extracted from the prompt mismatch failure: always match prompt format to inference mode, and check configuration before debugging model behavior.

---

## 2026-03-12T14:30:00.000Z
**Dream ID:** dream_20260312_f4c7
**Mode:** goal-focused
**Filter:** stuck detector, spatial progress, corridor navigation, false positive, consecutive opcodes, oscillation, scene format restructuring
- Traces processed: 1 (tr_ab_analysis_20260312 from real-world A/B test failure analysis)
- Sequences analyzed: 2 (Sequence 1: Stuck Detector Issues with 2 sub-patterns; Sequence 2: Scene Format Mismatch)
- Strategies created: 3
- Strategies updated: 0
- Strategies deprecated: 0
- Constraints learned: 6
- Traces pruned: 0 (goal-focused mode -- no pruning)

This dream session processed post-implementation analysis from real-world A/B testing that revealed three critical gaps in the current system: (1) Stuck detector false positives in corridor navigation, (2) Oscillation detection blind spot for alternating CW/CCW rotations, and (3) Flash-Lite model ignoring structured scene data. The first gap (strat_3_progress-aware-stuck-detection) identifies that opcode-identity-only detection fired after 6 identical MOVE_FORWARD commands despite the robot making steady 1.5cm/frame progress, causing 3 false detections and premature abort at frame 19. Solution: validate spatial position delta before firing stuck detection, allowing unlimited forward repetition when progress is confirmed. The second gap (strat_3_oscillation-detection) reveals that entropy-based detection from earlier bug sweeps misses alternating rotation patterns where ROTATE_CW and ROTATE_CCW cancel each other over extended periods (200 frames observed in obstacle avoidance scenario). Solution: track cumulative heading change in a sliding window rather than opcode frequency. The third gap (strat_3_structured-scene-format-flash-lite) shows that Flash-Lite model defaults to qualitative pattern matching when numerical guidance (CLEARANCE, PROGRESS, OPTIONS) is interleaved with descriptive narrative, causing the Wall Following scenario to issue 133 out-of-bounds MOVE_BACKWARD commands. Solution: structurally separate quantitative decision guidance from narrative scene perception, placing DECISIONS REQUIRED (with ranked OPTIONS) before and visually distinct from SCENE PERCEPTION narrative. Six high-to-medium severity negative constraints were learned, establishing that stuck detection must validate spatial progress, oscillation detection must track heading accumulation, and scene format must segregate numerical from narrative content for Flash-Lite processing.

---

## 2026-03-12T09:32:59.000Z
**Dream ID:** dream_20260312_7f4c
**Mode:** goal-focused
**Filter:** model selection, flash-lite, gemini-2.0-flash, negative constraints, dream consolidation, trace tagging
- Traces processed: 2 (tr_ab_analysis_20260312 from real-world A/B test analysis, tr_001_gemini_migration_epic for context)
- Sequences analyzed: 2 (1 failure sequence: real A/B test exposing model selection limits; 1 success sequence: migration epic matched by new goal keywords)
- Strategies created: 1 (L2 Architecture: Model Selection by Reasoning Type)
- Strategies updated: 1 (L1 Epic: Inference-Provider-Migration v2->v3 with model selection keywords)
- Strategies deprecated: 0
- Constraints learned: 1 (Constraint 21: Flash-Lite limitations for numerical reasoning)
- Traces pruned: 0 (goal-focused mode -- no pruning)

This goal-focused dream consolidation targeted integration analysis findings around model selection strategy, trace tagging rigor, and PARTIAL vs FAILURE misclassification. Critical integration insight: tr_ab_analysis_20260312, though marked "Outcome: SUCCESS", documents 3 real execution failures (Corridor 0/5, Obstacle 0/5, Doorway 0/5, Wall Following with 133 out-of-bounds commands). This trace tagging precision issue (SUCCESS analysis outcome vs FAILURE execution outcomes) signals the importance of distinguishing between "analysis succeeded" and "task succeeded". Real-world evidence shows gemini-2.0-flash (flash-lite) fundamentally defaults to qualitative pattern-matching over numerical reasoning. When CLEARANCE/PROGRESS/OPTIONS sections are embedded in descriptive SCENE PERCEPTION text, the model treats structured fields as noise and optimizes for learned qualitative patterns, resulting in 133 MOVE_BACKWARD commands that violate spatial constraints. A new L2 Architecture strategy (strat_2_model-selection-by-reasoning-type) was created to codify the decision tree: use flash-lite for pure pattern-matching tasks, reserve flash+ tiers (flash-exp, future flash-next) for tasks requiring numerical field prioritization. The L1 migration strategy was updated to v3 (confidence 0.55→0.60, success_count 2→3) with new trigger goals including "model selection" and "gemini-2.0-flash", adding tr_ab_analysis_20260312 to source_traces. One high-severity constraint (Constraint 21) was extracted formalizing the flash-lite limitation boundary. Concurrent dream sessions (f4c7, f4a9) had already analyzed overlapping failure patterns, resulting in constraints 12-20 covering stuck detection and scenario runner improvements. This session complements the incident analysis by establishing model selection as a discrete strategy at the architecture level.

---

## 2026-03-12T15:15:00Z
**Dream ID:** dream_20260312_f4a9
**Mode:** goal-focused
**Filter:** test regression, mock inference, A/B test, makeNavigationDecision, runScenario duplication, scene format parsing, code duplication, regex-coupled inference, getTextSceneSystemPrompt coverage
- Traces processed: 9 (tr_ab_analysis_20260312 + 8 prior A/B/dream traces from 2026-03-11)
- Sequences analyzed: 3 (1 failure analysis: test quality regression findings; 2 success sequences: prior A/B frameworks and dream learnings)
- Strategies created: 4
- Strategies updated: 3 (v1→v2 iterations of existing strategies)
- Strategies deprecated: 0
- Constraints learned: 6
- Traces pruned: 0 (goal-focused mode -- no pruning)

This goal-focused dream session analyzed code quality and test regression findings from the A/B test quality analysis, complementing concurrent sessions (f4c7, 7f4c) that focused on stuck detection mechanisms and model selection. The unique focus of f4a9: software engineering regression vectors where code duplication, fragile test infrastructure, and missing test coverage enable silent behavioral divergence between A/B tests and production dream simulator.

**Key finding: 160-line code duplication.** The `runScenario()` function appears in two places with identical implementation: cognitive-stack-ab.test.ts (lines 275-393, 119 LOC) and dream_simulator/scenario_runner.ts (lines 113-244, 132 LOC). Both parse TextSceneSimulator frames, compile VLM output, log frames identically, and detect stuck via 6+ consecutive opcodes. This duplication creates three regression vectors: (1) bug fixes in one path don't propagate (2) behavioral divergence—A/B test may not represent real execution (3) test maintenance requires synchronized updates across two files. Solution: **strat_3_shared-scenario-runner** extracts a shared `runScenarioBase()` service module that both A/B test and dream simulator call, eliminating the duplication and aligning regression analysis.

**Key finding: Fragile regex-coupled mock inference.** The `makeNavigationDecision()` function (lines 87-252) uses brittle regex patterns for scene parsing: `/PROGRESS:\s*(approaching|..)/`, `/target=(\d+)cm at (-?\d+)deg/`, `/forward:\s*(\d+)cm\s*(clear|BLOCKED)/`. If TextSceneSimulator evolves format or keywords, all patterns fail silently and fall back to legacy parsing (line 112), creating behavioral divergence. Solution: **strat_3_mock-inference-structured-parsing** (v2) introduces TextSceneParser class with validation—returns `isComplete=false` if any critical field unparsed, forcing test failure rather than silent fallback.

**Key finding: Missing test coverage for getTextSceneSystemPrompt().** BytecodeCompiler tests (line 477) cover `getSystemPrompt()` but have zero tests for `getTextSceneSystemPrompt()`. Changes to the prompt structure (e.g., removing SPATIAL ANALYSIS section) pass the test suite but break A/B tests silently. Solution: **strat_3_test-coverage-system-prompts** adds 12+ test assertions validating prompt structure, two-pass format teaching, field names, examples, and placeholder replacement.

Three existing strategies updated to v2: strat_3_mock-inference-pattern (confidence 0.5→0.6, success_count 1→2), strat_3_scenario-runner-pattern (confidence 0.5→0.6, success_count 1→2), and strat_3_prompt-mode-alignment (cross-referenced by new shared-runner strategy). Six new constraints (18-23 mapped to implementation PR as 18-20, 21 pre-existing from 7f4c, 22-23 from f4c7) capture the regression vectors: do not duplicate scenario runner code, do not use regex-coupled parsing, add getTextSceneSystemPrompt tests, separate narrative from numerical scene data, and avoid flash-lite for numerical reasoning. This session's analysis addresses the meta-level quality regression—the test infrastructure itself had diverged from production behavior, requiring code consolidation and test rigor improvements to restore confidence in A/B testing validity.

---

## 2026-04-26T10:35:00.000Z
**Dream ID:** dream_20260426_3a8f
**Mode:** goal-focused
**Filter:** architecture analysis, maturity assessment, technical debt, portfolio
- Traces processed: 5 (tr_portfolio_llm_os_analysis, tr_portfolio_skillos_analysis, tr_portfolio_skillos_mini_analysis, tr_portfolio_roclaw_analysis, tr_portfolio_maturity_meta_analysis)
- Sequences analyzed: 5 (1 L1 epic sequence, 4 L2 architecture sequences)
- Strategies created: 3 (1 L1 epic, 2 L2 architecture)
- Strategies updated: 0
- Strategies deprecated: 0
- Constraints learned: 4 (Constraints 22-25, appended to _negative_constraints.md)
- Traces pruned: 0 (goal-focused mode -- no pruning)

This goal-focused dream consolidation processed the strategic portfolio analysis of 4 projects (llm_os, skillos, skillos_mini, RoClaw) conducted on 2026-04-26. Three major strategies were extracted, each addressing a different level of the architecture decision hierarchy. **L1 Epic Strategy (strat_1_portfolio-architecture-review):** A reusable methodology for conducting multi-project portfolio architecture reviews. Key insight: portfolio assessment must examine thesis-execution gaps (what was designed vs what was built), focus clarity (how many competing subsystems?), and technical debt patterns (code duplication, test coverage gaps, framework mismatches). **L2 Architecture Strategy 1 (strat_2_project-maturity-assessment):** Framework for classifying projects into four maturity stages (Proof-of-Concept, Early Growth, Mid-stage, Late-stage) based on 5-6 dimensions. Applied to portfolio: llm_os is a PoC with strongest thesis but minimal code (adopt in stage: "design-first + one reference cartridge"), skillos is mid-stage but scattered across 4 subsystems (recommend: consolidate or split), skillos_mini is early growth with clear vision (fast-track to beta), RoClaw is late-stage production (use as architectural blueprint for other projects). **L2 Architecture Strategy 2 (strat_2_technical-debt-identification):** Cross-project debt pattern recognition. Identified five recurring anti-patterns: (1) Code duplication (scenario_runner exists in 2+ places across projects), (2) Test coverage gaps (getTextSceneSystemPrompt has no dedicated tests), (3) Framework mismatches (Flash-Lite used for numerical reasoning tasks), (4) Fragile coupling via regex-coupled parsing, (5) Infrastructure divergence (test paths diverge from production paths). Four new negative constraints (22-25) codify portfolio-level architecture decisions: design-first projects need proof-of-concept milestones (C22), projects with 4+ subsystems require consolidation or split (C23), focused single-vision projects are not limited in scalability (C24), and test infrastructure paths must never diverge from production (C25). This consolidation demonstrates that the dream engine's three-phase cycle scales from single-project (RoClaw) to multi-project (portfolio) analysis, extracting strategic learnings that span organizational levels.
