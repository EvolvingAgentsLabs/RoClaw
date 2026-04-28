# Negative Constraints

## Constraint 1
- **Description:** Do not move forward into detected obstacles at full speed -- always reduce speed when obstacle distance is under 50cm
- **Context:** obstacle avoidance, navigation, proximity control
- **Severity:** high
- **Learned From:** cognitive-stack-ab.test.ts (Baseline vs Full Stack obstacle avoidance comparison), dream_20260311_a7b3
- **Dream ID:** dream_20260311_a7b3

## Constraint 2
- **Description:** Do not charge through doorways at speed exceeding 100 -- always center alignment and reduce speed to 60-80 before entering a doorway
- **Context:** doorway navigation, narrow passage traversal
- **Severity:** high
- **Learned From:** cognitive-stack-ab.test.ts (Doorway Navigation scenario, lines 168-171), dream_20260311_a7b3
- **Dream ID:** dream_20260311_a7b3

## Constraint 3
- **Description:** Do not rely on small rotation angles (under 45 degrees) to clear blocked paths -- use 90-degree systematic scan rotations when path is blocked
- **Context:** stuck recovery, blocked path handling, exploration
- **Severity:** medium
- **Learned From:** cognitive-stack-ab.test.ts (Baseline stuck detection in obstacle course, lines 262-270), dream_20260311_a7b3
- **Dream ID:** dream_20260311_a7b3

## Constraint 4
- **Description:** Do not treat dream-sourced strategies as equivalent to real-world strategies -- always apply fidelity weighting (DREAM_TEXT confidence = base * 0.3, REAL_WORLD = base * 1.0)
- **Context:** dream consolidation, strategy confidence initialization, memory fidelity
- **Severity:** medium
- **Learned From:** dream-engine.test.ts (fidelity weighting tests, lines 410-443), cognitive-stack-ab.test.ts (Memory Fidelity tests), dream_20260311_a7b3
- **Dream ID:** dream_20260311_a7b3

## Constraint 5
- **Description:** Do not skip source tagging on execution traces -- untagged traces default to UNKNOWN_SOURCE with fidelity 0.6, which may be higher than intended for synthetic data
- **Context:** trace logging, source provenance, dream engine input quality
- **Severity:** low
- **Learned From:** dream-engine.test.ts (legacy trace parsing, lines 469-506), dream_20260311_a7b3
- **Dream ID:** dream_20260311_a7b3

## Constraint 6
- **Description:** Do not delete backward-compatible wrapper classes during integration simplification -- if tests mock a class directly (e.g., CerebellumInference), the class must remain even when production routing changes
- **Context:** inference provider migration, test suite compatibility, mock-based testing
- **Severity:** high
- **Learned From:** GeminiCore integration (CerebellumInference preserved for test mocking), dream_20260311_a7f3
- **Dream ID:** dream_20260311_a7f3

## Constraint 7
- **Description:** Do not widen union types for inference modes beyond what is actively used -- dead type branches create untested code paths and confuse consumers
- **Context:** TypeScript type narrowing, DreamInferenceMode, inference routing
- **Severity:** medium
- **Learned From:** GeminiCore integration (DreamInferenceMode narrowed from 'claude'|'gemini'|'dual' to 'gemini'), dream_20260311_a7f3
- **Dream ID:** dream_20260311_a7f3

## Constraint 8
- **Description:** Do not introduce npm SDK dependencies for API integrations that have straightforward REST request/response shapes -- prefer native fetch with manual type assertions
- **Context:** Gemini Robotics inference adapter, npm dependency management, API integration
- **Severity:** medium
- **Learned From:** GeminiCore integration (gemini_robotics.ts uses native fetch, zero new dependencies), dream_20260311_a7f3
- **Dream ID:** dream_20260311_a7f3

## Constraint 9
- **Description:** Do not chain more than two re-export hops for shared types -- import directly from the canonical barrel export rather than intermediate re-exporters
- **Context:** TypeScript module organization, re-export chains, InferenceFunction type
- **Severity:** low
- **Learned From:** GeminiCore integration (InferenceFunction re-exported through 3+ hops), dream_20260311_a7f3
- **Dream ID:** dream_20260311_a7f3

## Constraint 10
- **Description:** Do not enable structured tool calling on an inference backend while using a text-completion-style system prompt -- the system prompt format MUST match the inference mode (tool calling requires function-call-style prompts, not hex bytecode prompts)
- **Context:** inference backend configuration, system prompt design, Gemini tool calling, VisionLoop, motor control
- **Severity:** high
- **Learned From:** tr_004_prompt_mismatch_failure (Gemini repeated TURN_LEFT regardless of input due to hex prompt + tool calling mode), tr_003_route_all_inference
- **Dream ID:** dream_20260311_b9e2

## Constraint 11
- **Description:** Do not assume a model is misbehaving when it produces the same output regardless of input variation -- first check for prompt/mode configuration mismatches before debugging model behavior
- **Context:** inference debugging, model output analysis, configuration validation
- **Severity:** medium
- **Learned From:** tr_004_prompt_mismatch_failure (45 minutes spent debugging what appeared to be model behavior but was a configuration mismatch)
- **Dream ID:** dream_20260311_b9e2

## Constraint 12
- **Description:** Do not detect stuck state based solely on opcode repetition; must include spatial progress validation before firing stuck detection
- **Context:** Stuck detection in navigation loops, especially corridor traversal with monotonic forward motion
- **Severity:** high
- **Learned From:** tr_ab_analysis_20260312 (Corridor scenario: MOVE_FORWARD progresses 1.5cm/frame but stuck detector fires after 6 identical opcodes, causing 3 false detections and premature abort at frame 19)
- **Dream ID:** dream_20260312_f4c7

## Constraint 13
- **Description:** Do not fire stuck detection after exactly 6 identical consecutive opcodes without checking if spatial position advanced between detections
- **Context:** Vision loop stuck detection using opcode counts
- **Severity:** high
- **Learned From:** tr_ab_analysis_20260312 (Each 6-opcode threshold triggers abort without querying robot position delta)
- **Dream ID:** dream_20260312_f4c7

## Constraint 14
- **Description:** Do not ignore oscillation patterns where opcodes alternate (e.g., ROTATE_CW / ROTATE_CCW pairs) causing zero net progress over extended periods
- **Context:** Stuck detection for alternating rotation sequences
- **Severity:** high
- **Learned From:** tr_ab_analysis_20260312 (Obstacle Avoidance + Doorway Navigation: model alternates ROTATE_CW 90° / ROTATE_CCW 90° for 200 frames, net heading change = 0°, entropy-based detector misses it because opcodes never repeat identically)
- **Dream ID:** dream_20260312_f4c7

## Constraint 15
- **Description:** Do not rely solely on entropy-based or opcode-count detection for stuck states; must track directional reversals (rotation sign changes) and net heading changes
- **Context:** Vision loop stuck detection for complex oscillation patterns
- **Severity:** high
- **Learned From:** tr_ab_analysis_20260312 (Oscillation pattern persists 200 frames because stuck detector counts opcode frequency, not directional accumulation)
- **Dream ID:** dream_20260312_f4c7

## Constraint 16
- **Description:** Do not interleave SCENE PERCEPTION (qualitative descriptive text) with CLEARANCE/PROGRESS/OPTIONS (quantitative numerical values) in the same markdown block
- **Context:** System prompt structure for Flash-Lite robot model; scene description formatting
- **Severity:** high
- **Learned From:** tr_ab_analysis_20260312 (Wall Following Full Stack: model treats numerical CLEARANCE/PROGRESS sections as noise when embedded in perception text, falls back to qualitative pattern matching, issues 133 MOVE_BACKWARD commands driving out of bounds)
- **Dream ID:** dream_20260312_f4c7

## Constraint 17
- **Description:** Do not expect Flash-Lite to prioritize numerical guidance (CLEARANCE values, distance metrics) when embedded within descriptive perception text
- **Context:** Scene format design for Gemini Flash-Lite robot navigation
- **Severity:** medium
- **Learned From:** tr_ab_analysis_20260312 (Flash-Lite model default behavior is qualitative pattern matching; numerical fields must be separated and emphasized structurally)
- **Dream ID:** dream_20260312_f4c7

## Constraint 18
- **Description:** Do not allow code duplication between A/B test scenario runner and production dream simulator -- extract shared runScenario() and makeNavigationDecision() logic to reusable service modules
- **Context:** Test regression, mock inference, A/B testing framework
- **Severity:** high
- **Learned From:** dream_20260312_f4a9 (cognitive-stack-ab.test.ts lines 87-252 and dream_simulator/scenario_runner.ts lines 113-244 contain identical runScenario implementation with 80% opcode-parsing and stuck-detection logic duplication; duplicated code obfuscates regression sources)
- **Dream ID:** dream_20260312_f4a9

## Constraint 19
- **Description:** Do not use regex-coupled mock inference that relies on brittle string pattern matching for scene parsing -- prefer structured decision logic based on parsed fields from a well-defined scene format
- **Context:** Mock inference pattern, scene format parsing, test determinism
- **Severity:** medium
- **Learned From:** dream_20260312_f4a9 (makeNavigationDecision in cognitive-stack-ab.test.ts lines 98-109 uses regex matches for PROGRESS, target distance, forward clearance; if regex doesn't match, falls back to legacy pattern matching on line 113, creating fragile decision logic)
- **Dream ID:** dream_20260312_f4a9

## Constraint 20
- **Description:** Do not leave getTextSceneSystemPrompt() untested in core compiler tests -- ensure system prompt generation methods have explicit test coverage with assertions on content structure and placeholders
- **Context:** BytecodeCompiler test coverage, system prompt validation
- **Severity:** medium
- **Learned From:** dream_20260312_f4a9 (bytecode-compiler.test.ts line 477 has tests for getSystemPrompt() but no dedicated tests for getTextSceneSystemPrompt(); test coverage gap masks prompt formatting issues)
- **Dream ID:** dream_20260312_f4a9

## Constraint 21
- **Description:** Do not use gemini-2.0-flash as default model for navigation tasks requiring numerical reasoning over structured guidance (CLEARANCE, PROGRESS, OPTIONS fields) -- flash-lite defaults to qualitative pattern matching and will ignore quantitative fields. For structured decision-making, use gemini-2.0-flash-exp or later model tiers that prioritize numerical fields
- **Context:** model selection, A/B testing, inference provider defaults, navigation system prompts
- **Severity:** high
- **Learned From:** tr_ab_analysis_20260312 (Real-world A/B test: gemini-2.0-flash Wall Following scenario produced 133 MOVE_BACKWARD commands, ignoring CLEARANCE/PROGRESS sections, driving robot out of bounds. Root cause: flash-lite model defaults to qualitative matching, treats numerical sections as noise when embedded in perception text)
- **Dream ID:** dream_20260312_7f4c

## Constraint 22
- **Description:** Do not start projects with design-first philosophy without an explicit end-to-end execution milestone -- architecture theses require proof-of-concept to reduce adoption risk
- **Context:** portfolio strategy, project planning, architecture validation, proof-of-concept design
- **Severity:** medium
- **Learned From:** tr_portfolio_llm_os_analysis (llm_os has strongest architectural thesis but least running code; adoption risk compounds when design is validated but executable proof-of-concept doesn't exist. Recommendation: deliver bootloader + reference cartridge as minimum proof)
- **Dream ID:** dream_20260426_3a8f

## Constraint 23
- **Description:** Do not allow projects to grow beyond 4 semi-autonomous subsystems without consolidation or product split -- scattered subsystem maintenance creates rework cycles and masks regressions through code duplication
- **Context:** portfolio scope, subsystem coordination, feature focus, technical debt accumulation
- **Severity:** medium
- **Learned From:** tr_portfolio_skillos_analysis (skillos contains planning, agents, dream consolidation, scenario runner subsystems competing for maintenance. Result: 160+ lines of scenario runner code duplicated in A/B tests vs production, obscuring regression sources. Recommendation: consolidate overlapping subsystems or split into focused products)
- **Dream ID:** dream_20260426_3a8f

## Constraint 24
- **Description:** Do not assume a project with clear product vision and narrow scope will struggle to scale -- early-growth projects with 1-2 focused subsystems achieve faster decision-making, cleaner architecture, and faster time-to-beta
- **Context:** portfolio strategy, product management, MVP design, project scaling
- **Severity:** low
- **Learned From:** tr_portfolio_skillos_mini_analysis (skillos_mini has clearest product vision--on-device trade app for specific trades--and cleanest architecture post-split from skillos. Result: faster team onboarding, clear feature priorities, minimal technical debt. Recommendation: use as model for portfolio focus discipline)
- **Dream ID:** dream_20260426_3a8f

## Constraint 25
- **Description:** Do not diverge test infrastructure paths from production paths under any circumstance -- invisible divergence masks regressions and creates false confidence in A/B testing validity
- **Context:** test infrastructure, A/B testing, mock inference, regression prevention, test quality assurance
- **Severity:** high
- **Learned From:** dream_20260312_f4a9, tr_portfolio_skillos_analysis (A/B test scenario runner and production dream simulator parse scenes with different logic. When paths diverge (test uses regex-coupled mock inference, production uses real VLM), A/B test results no longer represent real execution. Solution: extract shared scenario_runner service module used by both test and production)
- **Dream ID:** dream_20260426_3a8f

## Constraint 22
- **Description:** Do not build product features (M2+, advanced UI) before validating market fit (M1 interviews with target users) -- this violates product development phase gates and causes wasted engineering effort when pivot direction emerges
- **Context:** skillos_mini trade-app development, product roadmap, priority ordering
- **Severity:** high
- **Learned From:** Project_strategic_portfolio_analysis (skillos_mini built M2/M3 features including recipe system, community sharing before M1 user validation. Pivot to trade-app (oficios) revealed early features misaligned with target market)
- **Dream ID:** dream_20260426_convergence_f7a2

## Constraint 23
- **Description:** Do not maintain dead code paths (deprecated agent_runtime.py, off-pivot cartridge handlers, unused compilation modes) in the master codebase -- prune them immediately when project pivot occurs, as they consume cognitive load and obscure the critical path
- **Context:** skillos dead code cleanup, llm_os compilation modes, code simplification, technical debt
- **Severity:** high
- **Learned From:** Project_strategic_portfolio_analysis (skillos includes 3+ deprecated stubs from pre-skill-tree architecture; llm_os has 4 compilation modes when only 2 are used; skillos_mini cartridges include off-pivot handlers for cooking/household when trade focus is optimal)
- **Dream ID:** dream_20260426_convergence_f7a2

## Constraint 24
- **Description:** Do not define incompatible ISA opcode sets across related projects (llm_os 13 opcodes vs RoClaw 14 opcodes) -- the cartridge kernel must establish a canonical ISA with unambiguous opcode semantics, and all projects must converge on this unified standard
- **Context:** multi-project architecture, ISA standardization, cartridge kernel interface, cross-project learning
- **Severity:** high
- **Learned From:** Project_strategic_portfolio_analysis (RoClaw and llm_os both use motor control opcodes but define them differently: rotate_cw vs ROTATE opcode with direction parameter; move_forward vs MOVE with speed. This prevents dream traces from one project being applicable to another)
- **Dream ID:** dream_20260426_convergence_f7a2

## Constraint 25
- **Description:** Do not use project-specific trace formats (YAML vs markdown frontmatter, different field names, missing hierarchy levels) -- standardize all traces to a unified schema (YAML frontmatter + markdown body with Level field) to enable cross-project dream consolidation and strategy transfer
- **Context:** trace format standardization, cross-project learning, dream engine input, memory interoperability
- **Severity:** high
- **Learned From:** Project_strategic_portfolio_analysis (RoClaw traces use "Level: 1/2/3/4" field; early skillos traces used different field names; evolving-memory uses enum-based hierarchy. This prevents automated cross-project pattern recognition because trace structure is inconsistent)
- **Dream ID:** dream_20260426_convergence_f7a2

## Constraint 26
- **Description:** Do not over-engineer compilation/execution modes beyond what the use case requires -- reduce llm_os compilation modes from 4 (mode_0_raw, mode_1_grammar, mode_2_swapped, mode_3_incremental) to 2 (baseline, grammar-aware), eliminating cross-mode state corruption risk and cognitive load
- **Context:** llm_os compilation pipeline, ISA-aware compactor, grammar swap design, state management
- **Severity:** medium
- **Learned From:** Project_strategic_portfolio_analysis (llm_os has 4 distinct compilation modes but only modes 0 and 2 are actively used in production; modes 1/3 introduce ISA_MISMATCH risks and obscure the grammar-swap mechanism)
- **Dream ID:** dream_20260426_convergence_f7a2

## Constraint 27
- **Description:** Do not defer critical infrastructure work (grammar swap latency reduction, KV compactor correctness guarantee) in favor of feature engineering -- infrastructure blockers prevent the system from reaching its theoretical performance ceiling and must be resolved in priority order before dependent work
- **Context:** portfolio priority sequencing, cross-project roadmapping, llm_os kernel development
- **Severity:** high
- **Learned From:** tr_2026-04-26_strategic_analysis (Strategic analysis identifies grammar swap as #1 priority in entire portfolio: 3 HTTP requests per syscall = 15% latency tax blocks "LLM as CPU" thesis. ISA-aware compactor is #1 correctness risk. These 4-6 week foundational efforts unblock all downstream kernel validation, better model fine-tuning, and cartridge promotion pipeline)
- **Dream ID:** dream_20260426_a3f2

## Constraint 28
- **Description:** Do not complete the trace-to-improvement flywheel at 60% -- consolidate the loop: traces → dream consolidation → strategies → cartridge promotion → fine-tune → better kernel. Breaking this loop at any stage prevents execution learning from translating to system improvement
- **Context:** self-improving systems, dream engine output utilization, RoClaw-llm_os integration, model fine-tuning
- **Severity:** high
- **Learned From:** tr_2026-04-26_strategic_analysis (Currently: RoClaw traces→dream→strategies works (PHASE 1 of flywheel). But RoClaw strategies don't promote into llm_os cartridge manifests (PHASE 2 missing). And neither project's traces promote to DPO fine-tune data (PHASE 3 missing). Closing the gap is the highest-leverage work after infrastructure items, enabling kernel self-improvement via portfolio-wide experience)
- **Dream ID:** dream_20260426_a3f2

## Constraint 29
- **Description:** Do not implement KV cache compaction without explicit ISA state extraction and preamble injection -- dropping tokens that contain unclosed <|loop|> or pending <|result|> constructs causes silent grammar state corruption on session resume
- **Context:** llm_os kernel development, KV cache management, GBNF state machine coherence, message history summarization
- **Severity:** high
- **Learned From:** tr_20260426_execution_trace_develop_operations (runtime/swap.rs must extract IsaState before dropping tokens and inject <|state|>{...}<|/state|> preamble into summary; omitting this causes PHASE 2 REM sleep strategy extraction failure: ISA-aware compaction works in theory but lacks integration test validation)
- **Dream ID:** dream_20260426_kernel_b2f8

## Constraint 30
- **Description:** Do not add new ISA opcodes to grammar without verifying presence in BOTH top-stmt and loop-stmt alternations -- missing from either level causes silent grammar mismatches and parser desynchronization
- **Context:** llm_os ISA evolution, GBNF rule consistency, opcode scope definition, grammar-parser coherence
- **Severity:** high
- **Learned From:** tr_20260426_execution_trace_develop_operations (adding <|state|> required updates to grammar/isa.gbnf lines defining both top-stmt and loop-stmt; failure to add to both would create invisible parse failures in nested loop contexts)
- **Dream ID:** dream_20260426_kernel_b2f8

## Constraint 31
- **Description:** Do not defer integration testing for compaction behavior after implementation -- the code for ISA state extraction was written but 5000-token depth-3 round-trip test remains pending, leaving success criteria unvalidated
- **Context:** llm_os compactor testing, state machine validation, kernel correctness guarantees, success criteria verification
- **Severity:** medium
- **Learned From:** tr_20260426_execution_trace_develop_operations (NEXT_STEPS.md §2 defines clear success criteria: "5000-token dispatch with nested loops at depth 3 survives compaction without grammar rejects"; trace notes "Added 3 tests" but integration test suite is incomplete; this blocks confidence increase from 0.75→0.90)
- **Dream ID:** dream_20260426_kernel_b2f8

## Constraint 32
- **Description:** Do not implement trace format conversion without standardizing field names across all source projects -- different projects using "Level" vs "hierarchy_level", "timestamp" vs "ts", "outcome" vs "result" creates fragile regex parsing and silent data loss
- **Context:** cross-project trace ingestion, DPO dataset preparation, trace pipeline robustness, schema standardization
- **Severity:** medium
- **Learned From:** tr_20260426_execution_trace_develop_operations (scripts/promote_traces.py assumes specific field names; this works for RoClaw markdown traces but fails if skillos or evolving-memory traces have different naming conventions; solution requires pre-ingestion field normalization or project-specific parsers)
- **Dream ID:** dream_20260426_kernel_b2f8

## Constraint 29
- **Description:** Do not delete code without pre-deletion reference scanning -- perform repository-wide grep for all references to target items across code, tests, documentation, scripts, and configuration files before deletion begins
- **Context:** code pruning, multi-repo deletion, dangling reference prevention, technical debt elimination
- **Severity:** high
- **Learned From:** tr_2026-04-26_portfolio_execution (CUT operations deleted 40+ items but left 60+ dangling references in documentation (QWEN.md, README.md), test files (~16 test files referencing deleted cooking cartridge), and setup scripts (setup_agents.sh/ps1). Root cause: pre-deletion scan cataloged references but cleanup was deferred as separate task, creating phantom problems during future maintenance)
- **Dream ID:** dream_20260426_pruning_a7e5

## Constraint 30
- **Description:** Do not defer reference cleanup after code deletion -- synchronously update all references (imports, documentation, test fixtures, config files, setup scripts) as part of the same commit batch as the deletion
- **Context:** code pruning, reference consistency, documentation debt prevention, test suite maintenance
- **Severity:** high
- **Learned From:** tr_2026-04-26_portfolio_execution (Deferred cleanup left dangling references that obscure debugging and consume cognitive load: README.md command examples reference deleted agent_runtime.py, QWEN.md tool functions reference deleted :8420 port, test files mock deleted cooking cartridge. Learning: async cleanup batching creates reference debt that compounds over time)
- **Dream ID:** dream_20260426_pruning_a7e5

## Constraint 31
- **Description:** Do not assume setup scripts automatically stay in sync with code deletions -- audit all bootstrapping scripts (setup_agents.sh, setup_agents.ps1, build_scene.py, etc.) and remove references to deleted directories/files immediately after deletion
- **Context:** infrastructure scripts, portfolio initialization, multi-platform deployment, environment consistency
- **Severity:** medium
- **Learned From:** tr_2026-04-26_portfolio_execution (setup_agents.sh and setup_agents.ps1 still reference deleted system/agents/ directory. Result: fresh environment bootstrap will fail or create orphaned directories if scripts execute blindly. These scripts define the reproducible initialization state and must be updated synchronously with deletion)
- **Dream ID:** dream_20260426_pruning_a7e5

## Constraint 32
- **Description:** Do not cluster unrelated deletions (demo projects, deprecated subsystems, experimental code) without explicit dependency ordering -- delete leaf-first (items with no dependents) to avoid cascading failures
- **Context:** code pruning sequencing, multi-item deletions, dependency analysis
- **Severity:** medium
- **Learned From:** tr_2026-04-26_portfolio_execution (In skillos_mini pruning, demo projects should have been deleted before their dependencies (experimental cartridges). Clustering without order risks deleting items needed by surviving code. Solution: topological sort of dependencies, delete leaf nodes first, handle clusters as isolated units)
- **Dream ID:** dream_20260426_pruning_a7e5

## Constraint 33
- **Description:** After file/directory deletion, always re-validate all cross-references in documentation. Reference integrity checking must cover .md files, comments, examples, and shell scripts (not just functional code). False negatives in validation leave dangling references as technical debt
- **Context:** validation, file deletion, reference integrity, documentation maintenance
- **Severity:** high
- **Learned From:** 2026-04-26_execution_trace (CUT operations deleted 8 skillos items; functional validation passed (Python/Rust syntax OK, grammar OK, reference integrity OK), but documentation audit found 60+ dangling references in README, QWEN, test files, setup scripts. This reveals reference integrity checking was limited to functional code, not documentation)
- **Dream ID:** dream_20260426_exec_pruning_kernel_validation

## Constraint 34
- **Description:** Implement a doc debt tracking system. After deletions, quantify remaining dangling references by type (function examples, command examples, script paths, test comments) and severity (critical/high/medium/low). Schedule fixes by priority: critical examples and API docs same-day, high-priority items in next release, medium/low deferred to tech debt sprints
- **Context:** documentation maintenance, technical debt tracking, post-deletion cleanup
- **Severity:** high
- **Learned From:** 2026-04-26_execution_trace (Portfolio cleanup left 5 QWEN.md tool refs to :8420, 7 README command examples, 16 test comments, setup script refs -- classified as CRITICAL/HIGH but no tracking system. Result: dangling references remained unfixed in main branch, confusing users and developers)
- **Dream ID:** dream_20260426_exec_pruning_kernel_validation

## Constraint 35
- **Description:** Never validate file deletions in isolation. Always conduct a pre-deletion reference audit (grep across repo for file/function/port names). Document findings. Then delete. Then re-validate post-deletion
- **Context:** validation process, deletion safety, reference tracking
- **Severity:** medium
- **Learned From:** 2026-04-26_execution_trace (Deletions happened without pre-audit of documentation references. Post-deletion audit found references that could have been caught and addressed before deletion, reducing cleanup burden and preventing merged-in dangling references)
- **Dream ID:** dream_20260426_exec_pruning_kernel_validation

## Constraint 36
- **Description:** Maintain a "Deleted Artifacts" registry in each project (e.g., system/memory/deleted_artifacts.md) documenting what was removed, when, and why. Include patterns (old imports, old ports, old file paths) that should trigger warnings in future validation
- **Context:** deletion tracking, reference audit enablement, project memory
- **Severity:** medium
- **Learned From:** 2026-04-26_execution_trace (No central record of deleted entities made follow-up reference audit difficult. A deleted_artifacts.md manifest would have enabled fast pattern searching and prioritization of cleanup work)
- **Dream ID:** dream_20260426_exec_pruning_kernel_validation

## Constraint 37
- **Description:** Do not set distillation target model size below 8B parameters for tasks involving spatial reasoning -- Martorell (UBA/CONICET 2025, 2502.16690) proves sub-8B models perform at chance level on spatial navigation regardless of prompt format or spatial information representation
- **Context:** VLM distillation planning, student model selection, roadmap planning, Qwen3-VL fine-tuning
- **Severity:** high
- **Learned From:** docs/strategic-analysis-2026-04-27.md (cross-referencing Martorell 2502.16690), docs/NEXT_STEPS.md section 1 (still targets Qwen3-VL-2B, contradicting paper evidence)
- **Dream ID:** dream_20260427_a7f3

## Constraint 38
- **Description:** Do not document ISA version transitions as complete in architecture docs when ESP32 firmware has not been reflashed -- ARCHITECTURE.md must clearly distinguish between "implemented in host software" and "deployed end-to-end" to prevent operator confusion during debugging or hardware setup
- **Context:** architecture documentation accuracy, ISA versioning, firmware deployment, documentation-code coherence
- **Severity:** medium
- **Learned From:** docs/ARCHITECTURE.md section 6 (documents ISA v2 8-byte frames as canonical) vs codebase reality (ISA v1 6-byte is still production on ESP32, V2 is implemented but not deployed)
- **Dream ID:** dream_20260427_a7f3

## Constraint 39
- **Description:** Do not start autonomous exploration without a camera-availability check -- always validate camera connectivity before launching explore:autonomous to prevent systematic FAILURE traces that pollute the dream consolidation pipeline with non-actionable noise
- **Context:** boot sequence design, camera initialization, trace quality, explore:autonomous, dream engine input quality
- **Severity:** medium
- **Learned From:** trace_2026-04-27.md (4 "Camera offline" FAILURE traces in single test session), trace_2026-04-16.md (same pattern), trace_2026-04-17.md (same pattern), trace_2026-04-15.md (same pattern). Recurring across 4+ days -- systematic, not transient
- **Dream ID:** dream_20260427_a7f3

## Constraint 40
- **Description:** Do not accept VLM-estimated distances (estimated_distance_cm) without range validation in downstream consumers -- a value exceeding the arena diagonal (e.g., >500cm for a 300x200cm arena) should be clamped or discarded to prevent hallucinated distances from corrupting SceneGraph spatial reasoning
- **Context:** VLM perception, egocentric spatial grounding, scene_response_parser, distance estimation, Spartun3D
- **Severity:** medium
- **Learned From:** docs/strategic-analysis-2026-04-27.md (Martorell P2: models below 8B perform near chance on spatial tasks; VLMs may hallucinate distances. Current parser in scene_response_parser.ts accepts any non-negative number without upper bound validation. Downstream consumers of estimated_distance_cm should clamp to arena-relative bounds.)
- **Dream ID:** dream_20260427_a7f3_spatial

## Constraint 41
- **Description:** Do not add optional fields to VLM response schemas (estimated_distance_cm, direction_from_agent, passby_objects) without corresponding parser test coverage -- untested optional fields create silent regression vectors when the VLM prompt or response format changes
- **Context:** scene_response_parser.ts test coverage, VLM JSON schema evolution, egocentric fields, Spartun3D integration
- **Severity:** high
- **Learned From:** __tests__/cerebellum/scene-response-parser.test.ts (current test file has zero assertions for estimated_distance_cm, direction_from_agent, or passby_objects despite these fields being fully implemented in scene_response_parser.ts lines 100-121. This repeats the anti-pattern documented in Constraint 20 for getTextSceneSystemPrompt)
- **Dream ID:** dream_20260427_a7f3_spatial

## Constraint 42
- **Description:** Do not rely on VLM-estimated passby_objects without cross-referencing against the current SceneGraph node labels in downstream consumers -- hallucinated labels (e.g., "blue wall" when no blue wall exists in the graph) create phantom obstacles that distort path planning and collision avoidance
- **Context:** VLM perception, passby_objects validation, SceneGraph consistency, situated scene graph, Spartun3D
- **Severity:** medium
- **Learned From:** docs/strategic-analysis-2026-04-27.md (Spartun3D P3 uses passby_objects to encode obstacles between agent and target; RoClaw's parser accepts arbitrary string arrays without SceneGraph cross-validation. Downstream consumers must filter passby labels against known graph nodes before using them for path planning.)
- **Dream ID:** dream_20260427_a7f3_spatial

## Constraint 43
- **Description:** Do not consider multi-repo changes "done" after editing code -- always run the type-checker/compiler for EACH affected repo (tsc --noEmit for TypeScript, svelte-check for Svelte, cargo check for Rust) AND test new CLI entry points (help commands, status commands) before declaring the change complete. Skipping per-repo validation after cross-cutting changes risks shipping type errors or broken entry points that only surface in CI or user-facing failures
- **Context:** multi-repo changes, build validation, type checking, CLI entry points, tsc, svelte-check, cargo check, cross-cutting changes
- **Severity:** high
- **Learned From:** 2026-04-28 multi-repo build validation session (RoClaw tsc --noEmit clean, skillos_mini svelte-check 0 errors/4 pre-existing warnings, llm_os cargo check clean/4 pre-existing warnings, all 3 CLI scripts tested: robot help, trade help, llmos help+status)
- **Dream ID:** dream_20260428_a3f7

## Constraint 44
- **Description:** Do not embed architecture diagrams (Mermaid, flowcharts, ASCII art, SVG banners) in README.md -- they belong in ARCHITECTURE.md. A README that duplicates architecture content creates maintenance drift between the two documents and overwhelms the quickstart purpose. The README is the pitch; ARCHITECTURE.md is the map.
- **Context:** README structure, documentation separation, ARCHITECTURE.md, Mermaid diagrams, SVG banners, maintenance drift, terminal-first documentation
- **Severity:** medium
- **Learned From:** 2026-04-28 README simplification across 3 repos (RoClaw, skillos_mini, llm_os). Prior READMEs contained 300+ lines with SVG banners, Mermaid diagrams, and full architecture sections that duplicated ARCHITECTURE.md content. Rewriting to 60-80 line terminal-first format eliminated the drift risk entirely.
- **Dream ID:** dream_20260428_a7f3

## Constraint 45
- **Description:** Do not exceed 80 lines in a README. A README that functions as a reference document has failed its primary purpose as a quickstart card. If the README is growing beyond 80 lines, technical depth is leaking in and should be moved to ARCHITECTURE.md, USAGE.md, or TUTORIAL.md. The target structure is: title (1 line) + pitch (2 lines) + Install (4-5 lines) + Use (15-20 lines) + How it works (5-10 lines) + Architecture links (5-8 lines) + License (2 lines).
- **Context:** README length, documentation discipline, quickstart card, terminal-first format, documentation hierarchy
- **Severity:** low
- **Learned From:** 2026-04-28 README simplification across 3 repos. All three resulting READMEs (RoClaw 78 lines, skillos_mini 76 lines, llm_os 72 lines) fit comfortably under 80 lines while providing complete quickstart coverage. The pattern proves that 60-80 lines is sufficient for Install + Use + How it works + doc links.
- **Dream ID:** dream_20260428_a7f3

## Constraint 46
- **Description:** Do not dispatch CLI subcommands to underlying tools without first verifying the tool binary exists on PATH -- a wrapper that silently fails because `npx`, `python3`, or `cargo` is missing creates a worse experience than running the underlying script directly, which would at least produce a shell "command not found" error. The wrapper must check prerequisites and produce an actionable install message (e.g., "python3 not found. Install via: brew install python@3.12")
- **Context:** bin/ CLI wrappers, shell dispatcher, prerequisite validation, developer experience, cross-platform toolchain
- **Severity:** medium
- **Learned From:** dream_20260428_a7f3_cli (synthesized from CLI wrapper pattern analysis: analogous to Constraint 39 camera-readiness boot check -- both follow the "validate prerequisites before dispatch" anti-pattern)
- **Dream ID:** dream_20260428_a7f3_cli

## Constraint 47
- **Description:** Do not build multi-screen navigation architectures (tabs, routes, screen state management) for single-purpose mobile apps where the core interaction is natural language task input -- a single terminal/chat interface with command prompt eliminates routing complexity, reduces maintenance surface, and maps directly to the user's mental model of "describe the task, get guidance"
- **Context:** mobile app architecture, Svelte component design, trade-app UX, skillos_mini, product pivot UI decisions
- **Severity:** medium
- **Learned From:** tr_termshell_epic_refactor, tr_termshell_arch_simplification (skillos_mini App.svelte reduced from 191 lines with 5+ screen imports and tab navigation to 20 lines with single TerminalShell import; multi-screen architecture was overengineered for command-driven trade-app interaction model)
- **Dream ID:** dream_20260428_c4e1

## Constraint 48
- **Description:** Do not accumulate UI components (HomeScreen, PhotoCapture, Onboarding, JobsList, TradeFlowSheet) that serve independent workflows when a product pivot has narrowed to a single interaction pattern -- unused screen components create dead code, inflate bundle size, and dilute development focus. Delete aggressively when the interaction model simplifies rather than deprecating gradually
- **Context:** product pivot cleanup, dead UI code, Svelte component lifecycle, mobile bundle optimization, component deletion timing
- **Severity:** medium
- **Learned From:** tr_termshell_component_deletion (5 screen components deleted in single pass after TerminalShell replaced all their functionality; keeping them would have created the same reference debt documented in Constraints 29-36)
- **Dream ID:** dream_20260428_c4e1

## Constraint 49
- **Description:** Do not assume Ollama's `/v1/chat/completions` endpoint is compatible with llm_os -- the daemon requires `/v1/completions` (raw text completions with per-request GBNF grammar injection). Ollama does not expose this endpoint. Always use llama-server directly for llm_os inference, or document the incompatibility prominently in onboarding materials.
- **Context:** llm_os boot sequence, local inference setup, Hello World demo, developer onboarding, llama-server vs Ollama
- **Severity:** medium
- **Learned From:** tr_hello_world_004 (discovered during llm_os Hello World demo: Ollama's chat completions API lacks per-request grammar support required by llm_os ISA dispatch; llama-server provides `/v1/completions` natively with GBNF grammar parameter)
- **Dream ID:** dream_20260428_a3f7

## Constraint 50
- **Description:** When adding a new ISA opcode, verify wiring through ALL dispatch layers in the Rust runtime -- not just grammar/isa.gbnf and parser, but also capability.rs opcode_string() match arm, iod.rs handle_statement() match arm, and DaemonConfig fields. A Rust build may succeed with a catch-all `_` arm or missing struct fields while silently dropping or misconfiguring the new opcode at runtime.
- **Context:** llm_os runtime development, ISA opcode addition, Rust match arm exhaustiveness, dispatch chain completeness
- **Severity:** high
- **Learned From:** tr_hello_world_002 (llm_os Hello World demo: `State` opcode was added to parser but not wired through capability.rs opcode_string() and iod.rs handle_statement() match arms; DaemonConfig was also missing max_tokens_per_task and slot_id fields. All 5 issues compiled away silently until runtime)
- **Dream ID:** dream_20260428_a3f7

## Constraint 51
- **Description:** Do not unify developer experience across only a subset of ecosystem repos -- if 3 of 4 repos follow the new convention (minimal README, CLI entry point, ARCHITECTURE.md delegation), the remaining repo creates cognitive dissonance for contributors who move between projects. When applying a cross-repo UX standard, apply it to ALL repos in the ecosystem or explicitly document the exception and schedule the remaining repo for alignment.
- **Context:** multi-repo UX unification, portfolio convergence, developer experience consistency, README convention, CLI entry points, ecosystem branding
- **Severity:** medium
- **Learned From:** 2026-04-28 UX unification effort (RoClaw, skillos_mini, llm_os unified to minimal README + CLI + ARCHITECTURE.md pattern; skillos was excluded, retaining old verbose format with ASCII art banner, multiple runtime options, and no CLI entry point convention. The gap means developers switching between repos encounter two different documentation paradigms.)
- **Dream ID:** dream_20260428_c4e7
