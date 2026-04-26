---
id: strat_2_technical-debt-identification
version: 1
hierarchy_level: 2
title: Cross-Project Technical Debt Pattern Recognition
trigger_goals: ["technical debt", "code duplication", "test coverage gaps", "architecture health", "debt inventory", "risk assessment"]
preconditions: ["Code repository is accessible", "Test suite exists (even if incomplete)", "Team has conducted at least one release cycle", "Change history (git log) spans 2+ weeks"]
confidence: 0.75
success_count: 1
failure_count: 0
source_traces: ["tr_portfolio_skillos_analysis", "tr_portfolio_roclaw_analysis"]
deprecated: false
---

# Cross-Project Technical Debt Pattern Recognition

## Steps

1. **Establish debt taxonomy:** Define categories of technical debt that matter to your portfolio. Recommended set:
   - **Code Duplication:** Same logic exists in 2+ places (file line counts, regex patterns, algorithm implementations)
   - **Test Coverage Gaps:** Critical business logic lacks test coverage (especially I/O boundaries, model integration points)
   - **Framework Mismatches:** Tool/framework used for wrong purpose (e.g., Flash-Lite for numerical reasoning)
   - **Fragile Coupling:** Components depend on implementation details rather than contracts (e.g., regex-coupled parsing)
   - **Infrastructure Divergence:** Test paths diverge from production paths (mock inference vs real VLM calls)
   - **Dead Code:** Code in production that is never called (indicate by marking in tool-calling vs text-completion prompts)

2. **Audit for code duplication:** Use code comparison tools or manual inspection to find repeated logic:
   - Exact duplication (copy-paste): most dangerous, highest priority
   - Similar duplication (same logic, different implementation): medium priority
   - Duplication across projects (same code in skillos AND RoClaw): portfolio-level risk
   - Target: no logic should exist in 2+ places unless there's a documented reason (e.g., "deliberately isolated for performance")

3. **Audit test coverage for critical paths:** Identify critical business logic (decision-making, I/O, model integration) and check:
   - Is it tested directly (white-box test cases)?
   - Is it tested end-to-end (integration tests)?
   - If not tested, estimate the effort to add coverage and prioritize

4. **Identify framework mismatches:** For each tool/library, verify it's used for its intended purpose:
   - **Example:** gemini-2.0-flash (Flash-Lite) defaults to qualitative pattern matching. Using it for tasks requiring structured numerical reasoning (CLEARANCE/PROGRESS fields) is a mismatch. Recommendation: use flash-exp or later for quantitative tasks.
   - **Example:** Regex patterns for scene parsing are fragile -- they break when format changes. Better: structured parsing with validation that fails loudly.

5. **Assess coupling tightness:** For each subsystem, measure coupling:
   - **Tight coupling:** Component depends on specific implementation details (regex patterns, internal APIs)
   - **Loose coupling:** Component depends only on published contracts (interfaces, formatted outputs)
   - **Recommendation:** Move tight coupling to loose coupling through abstraction layers (e.g., TextSceneParser class instead of regex functions)

6. **Detect infrastructure divergence:** Verify that test paths match production paths:
   - **Red flag:** A/B tests use mock inference but production uses real VLM calls
   - **Red flag:** Test runner parses scene data differently from production
   - **Solution:** Extract shared scenario runner to a service module used by both A/B tests and production

7. **Quantify debt impact:** For each debt item, estimate:
   - **Effort to fix:** Hours needed to resolve
   - **Impact if unfixed:** Risk to quality, performance, maintainability
   - **Regression risk:** How likely is this debt to cause bugs in the next release?

8. **Categorize by severity:** Bucket debt items into tiers:
   - **Critical (fix before next release):** Affects product safety or correctness (e.g., code duplication that masks regressions)
   - **High (fix in next sprint):** Affects maintenance burden or test confidence
   - **Medium (roadmap):** Affects future feature velocity
   - **Low (nice-to-have):** Technical excellence, no immediate risk

9. **Identify cross-project patterns:** Look for the same debt appearing in multiple projects:
   - If scenario_runner is duplicated in skillos (2 places) AND likely in other projects, this is a **portfolio-level problem**
   - Solution: create a shared service module (e.g., @lmunix/scenario-runner) used across all projects
   - Benefit: fix it once, benefit everywhere

10. **Create debt inventory with remediation priorities:**
    - Document each item with ID, category, severity, effort, impact
    - Assign owners (which project/team should fix this?)
    - Schedule fixes across multiple cycles (don't try to fix everything at once)

## Negative Constraints

- Do not ignore "small" duplications (5-10 line functions) -- they compound over time and become costly to maintain
- Do not defer test coverage gaps on "non-critical" logic -- A/B test failures show gaps propagate to production
- Do not use regex for scene parsing when structured parsing is feasible -- regex breaks silently
- Do not diverge test paths from production paths under any circumstance -- invisible divergence = masked regressions
- Do not conflate "test coverage" with "test quality" -- a test that passes both good and bad inputs is worthless
- Do not assume late-stage projects have no technical debt -- they often hide accreted debt under "working" systems

## Notes

This strategy emerged from analyzing skillos and RoClaw and identifying concrete debt patterns:

1. **Code Duplication Hazard (skillos):** scenario_runner exists in cognitive-stack-ab.test.ts (119 LOC) and dream_simulator/scenario_runner.ts (132 LOC). This 160-line duplication creates three regression vectors:
   - Bug fix in one path doesn't propagate
   - A/B test may not represent real execution (paths have diverged)
   - Test maintenance requires synchronized updates
   - **Solution:** Extract shared runScenarioBase() service module called by both

2. **Test Coverage Gap (skillos):** getTextSceneSystemPrompt() has no dedicated tests despite critical role in model behavior. Changes to prompt structure (e.g., removing SPATIAL ANALYSIS section) pass the test suite but break A/B tests silently. **Solution:** Add 12+ assertions covering prompt structure, field names, examples, placeholder replacement.

3. **Fragile Parsing Anti-Pattern (skillos):** makeNavigationDecision() uses brittle regex patterns (`/PROGRESS:\s*(approaching|..)/`, `/target=(\d+)cm at (-?\d+)deg/`) that fail silently and fall back to legacy parsing. **Solution:** Create TextSceneParser class with validation that returns `isComplete=false` if critical fields are missing, forcing test failure rather than silent fallback.

4. **Framework Mismatch (RoClaw):** gemini-2.0-flash was used as default for navigation tasks requiring numerical reasoning (CLEARANCE/PROGRESS/OPTIONS fields). Flash-Lite defaults to qualitative pattern matching, not quantitative reasoning. Real-world test result: 133 MOVE_BACKWARD commands ignoring clearance constraints, driving robot out of bounds. **Solution:** Create strat_2_model-selection-by-reasoning-type mapping task type → model tier.

5. **Infrastructure Divergence (skillos/RoClaw):** A/B test scenario runner and production dream simulator parse scenes differently:
   - Test uses mock inference with regex-coupled decisions
   - Production uses real VLM with unstructured prompting
   - Result: A/B tests pass but production fails, or vice versa
   - **Solution:** Extract shared scenario_runner service, ensure both paths use identical parsing logic

Prioritize the following fixes in order of impact:
1. Eliminate code duplication (scenario_runner) -- highest regression risk
2. Add test coverage for system prompt generation -- medium risk, easy fix
3. Replace regex parsing with structured TextSceneParser -- medium risk, medium effort
4. Document model selection strategy (Flash-Lite vs Flash+) -- low effort, high clarity
5. Align test paths with production paths -- high effort, critical for regression prevention

This strategy should be run quarterly as part of portfolio health assessment. Track debt accumulation over time to identify when projects are becoming too complex to maintain.
