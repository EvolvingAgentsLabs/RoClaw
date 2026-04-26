---
id: strat_1_portfolio-architecture-review
version: 1
hierarchy_level: 1
title: Multi-Project Portfolio Architecture Review & Assessment
trigger_goals: ["architecture analysis", "maturity assessment", "technical debt", "portfolio evaluation", "project comparison", "thesis evaluation", "cross-project architecture"]
preconditions: ["Portfolio contains 2+ autonomous projects", "Each project has clear architectural documentation", "Technical debt inventory exists or can be synthesized", "Strategic objectives are defined for portfolio"]
confidence: 0.60
success_count: 1
failure_count: 0
source_traces: ["tr_portfolio_maturity_meta_analysis"]
deprecated: false
---

# Multi-Project Portfolio Architecture Review & Assessment

## Steps

1. **Define review scope:** Identify the 2-N projects in your portfolio and establish the review boundaries (are we assessing architecture, product maturity, technical debt, all three?).

2. **Create maturity matrix:** Build a comparison table across projects using at least 5 dimensions: (1) architectural thesis strength, (2) running code maturity, (3) focus clarity, (4) technical debt level, (5) product readiness. Score each on a scale (Least/Low/Medium/High/Most/Strongest) or 1-5.

3. **Analyze thesis vs execution gaps:** For each project, identify inversions where thesis strength doesn't match code maturity (e.g., strongest architecture but least running code). Note whether this gap is intentional (design-first) or indicates execution risk.

4. **Assess focus clarity:** Map the breadth of subsystems in each project. Wide portfolios (4+ subsystems) risk scattered maintenance. Narrow portfolios (1-2 subsystems) offer clear focus but less feature breadth. Note: this is a spectrum, not a failure state.

5. **Extract technical debt patterns:** For each project, identify the top 3-5 technical debt items. Look for:
   - Code duplication across subsystems or codebases
   - Test infrastructure divergence from production paths
   - Fragile parsing or tightly-coupled components
   - Missing test coverage for critical business logic
   - Model/framework capability mismatches

6. **Generate cross-project constraints:** Identify architectural anti-patterns that appear in multiple projects. These become enforced constraints across the portfolio (e.g., "never duplicate scenario runner logic", "always separate numerical from narrative scene data").

7. **Score projects on architectural maturity:** Use this rubric:
   - **Proof-of-Concept:** Design complete, minimal running code
   - **Early Growth:** Clear vision, focused scope, growing execution
   - **Mid-stage:** Feature-rich, strong execution, scattered focus
   - **Late-stage:** Robust engineering, active improvement cycle, narrow focus

8. **Identify cross-project architecture patterns:** Document which projects demonstrate best practices worth replicating (e.g., "RoClaw's trace/strategy system is production-ready"). Note which projects have unique architectural innovations (e.g., "llm_os ISA + cartridge design").

9. **Generate recommendations per project:** For each project, provide 1-3 specific recommendations based on the analysis:
   - **For Proof-of-Concept projects:** Prioritize one executable milestone (e.g., "ship bootloader + reference cartridge")
   - **For scattered projects:** Recommend deprecation or consolidation of overlapping subsystems
   - **For focused projects:** Recommend fast-tracking to beta
   - **For mature projects:** Recommend elevating to blueprint/reference role

10. **Document cross-project constraints:** Create or update architecture-level constraints that apply to the entire portfolio (e.g., test infrastructure must mirror production, critical business logic must not be duplicated).

## Negative Constraints

- Do not assume late-stage projects are error-free -- they need regular audits for technical debt accumulation
- Do not treat code duplication as acceptable "for performance reasons" -- shared service modules are faster and safer
- Do not ignore thesis-execution gaps in early projects -- adoption risk compounds over time
- Do not apply scattered-project recommendations to focused projects -- focus is a feature
- Do not skip cross-project architecture analysis in multi-project portfolios -- duplication and divergence are the silent costs

## Notes

This strategy emerged from the 2026-04-26 portfolio assessment across 4 projects (llm_os, skillos, skillos_mini, RoClaw). Key insights:

1. **Thesis vs Code Inversion (llm_os):** The strongest architectural thesis often correlates with the least running code when the project takes a design-first approach. This is intentional but creates adoption risk. Recommendation: have a "minimum viable cartridge" that proves the architecture end-to-end.

2. **Feature Scatter (skillos):** Projects that try to do everything (planning layer, agent system, dream consolidation, scenario runner) end up with scattered maintenance. The hidden cost is regression risk from duplicated code paths. Recommendation: ruthlessly extract and consolidate duplicated subsystems.

3. **Clear Vision (skillos_mini):** Projects with a single, clear product vision (on-device trade app for specific trades) achieve clean architecture and fast decision-making after being split from a parent project. Recommendation: fast-track to beta with minimal feature set.

4. **Mature Architecture (RoClaw):** Projects that have undergone multiple consolidation cycles have the most rigorous testing and traceability systems. The A/B testing framework and trace/strategy persistence pattern should be replicated in other projects.

5. **Cross-Project Anti-Patterns:**
   - Code duplication appears when a logic pattern is discovered during one project and reinvented during another (scenario_runner was duplicated between A/B test and dream simulator)
   - Test infrastructure divergence masks regressions: when A/B tests use mock inference but production uses real VLM calls, the paths diverge invisibly
   - Model capability mismatches: Flash-Lite is unsuitable for numerical reasoning tasks; always match model selection to task type

This strategy is reusable for any portfolio assessment. Adapt the dimension list (step 2) and maturity rubric (step 7) to your specific goals.
