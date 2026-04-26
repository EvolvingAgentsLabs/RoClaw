---
id: strat_2_project-maturity-assessment
version: 1
hierarchy_level: 2
title: Structured Project Maturity Assessment Framework
trigger_goals: ["maturity assessment", "project evaluation", "technical debt identification", "architecture health", "project stage classification"]
preconditions: ["Project has documented architecture", "Running codebase exists (even if minimal)", "Team has access to trace/telemetry data", "Evaluation period is at least one sprint (2 weeks)"]
confidence: 0.70
success_count: 1
failure_count: 0
source_traces: ["tr_portfolio_llm_os_analysis", "tr_portfolio_skillos_analysis", "tr_portfolio_skillos_mini_analysis", "tr_portfolio_roclaw_analysis"]
deprecated: false
---

# Structured Project Maturity Assessment Framework

## Steps

1. **Establish assessment dimensions:** Select 4-6 dimensions that align with your portfolio strategy. Recommended set:
   - **Thesis Strength:** How well-reasoned and differentiated is the architectural thesis? (Low = generic, High = unique/well-justified)
   - **Code Maturity:** How much production-ready code exists? (Low = design docs only, High = deployed, battle-tested)
   - **Focus Clarity:** How clearly defined is the project scope? (Low = 4+ overlapping subsystems, High = 1-2 core subsystems)
   - **Technical Debt Level:** Quantify blockers: code duplication, test gaps, framework mismatches. (Low = <5 blockers, High = >10 blockers)
   - **Product Readiness:** How close to customer-facing release? (Low = pre-alpha, High = production + feature pipeline)

2. **Score each project per dimension:** Use a consistent rubric (e.g., 1-5 scale, or Low/Medium/High, or Least/Most). Record the scoring rationale -- this creates auditability.

3. **Create maturity matrix:** Visualize as a table with projects as rows and dimensions as columns. Highlight inversions (e.g., Thesis = High but Code Maturity = Low).

4. **Classify project stage:** Map to one of four maturity stages:
   - **Proof-of-Concept (PoC):** Thesis complete, design validated, <30% running code. Adoption risk is concept validation; execution risk is high.
   - **Early Growth:** Clear vision + focused scope, >30% running code, <1 year in flight. Main risk: feature creep.
   - **Mid-stage:** Feature-rich (4+ subsystems), >70% running code, active user feedback. Main risk: scattered maintenance, technical debt accumulation.
   - **Late-stage:** Production deployed, 2+ years in flight, active improvement cycle. Main risk: aging codebase, new projects cannibalizing focus.

5. **Identify thesis-execution gaps:** For each project, compute the gap between Thesis Strength and Code Maturity. Large gaps (>2 points) warrant investigation:
   - If gap is positive (strong thesis, weak code): project is design-first. Assess whether this is intentional or indicates execution risk.
   - If gap is negative (weak thesis, strong code): project is ad-hoc or legacy. Question whether it should exist in the portfolio.

6. **Extract technical debt inventory:** For each project, document top 5-10 technical debt items. Categorize by type:
   - **Code Duplication:** Logic exists in 2+ places
   - **Test Coverage Gaps:** Critical paths lack test coverage
   - **Framework Mismatches:** Component uses wrong tool (e.g., Flash-Lite for numerical reasoning)
   - **Fragile Coupling:** Tight coupling between components (e.g., regex-coupled parsing)
   - **Infrastructure Divergence:** Test paths diverge from production paths

7. **Score technical debt urgency:** For each debt item, assess urgency:
   - **Critical:** Blocks product release or causes data loss
   - **High:** Causes rework cycles or regression risk
   - **Medium:** Creates maintenance burden or future risk
   - **Low:** Technical excellence, nice-to-have

8. **Assess focus clarity risk:** Count the number of semi-autonomous subsystems in each project:
   - 1-2 subsystems: High focus (good for MVP, scaling may be hard)
   - 3 subsystems: Balanced (feature breadth + maintainability)
   - 4+ subsystems: Low focus (feature-rich but scattered maintenance)
   - If a project has 4+ subsystems without shared business logic, recommend consolidation or splitting.

9. **Map to portfolio strategy:** For each project, answer:
   - Is this project a **strategic pillar** (core to portfolio strategy)?
   - Is this project a **proof-of-concept** (validating a hypothesis)?
   - Is this project a **cash cow** (mature, stable, funds other projects)?
   - Is this project a **problem child** (high potential but high risk)?

10. **Generate stage-specific recommendations:**
    - **PoC projects:** Prioritize one end-to-end milestone (e.g., "ship bootloader + reference cartridge for llm_os")
    - **Early Growth:** Validate product-market fit before scaling features
    - **Mid-stage:** Consolidate overlapping subsystems, establish focus
    - **Late-stage:** Consider spinning off successful subsystems as separate products, or deprecate underperforming features

## Negative Constraints

- Do not conflate Thesis Strength with actual value -- a strong thesis + weak execution = failed investment
- Do not assume late-stage = no technical debt -- mature projects often hide accreted debt
- Do not penalize early projects for low code maturity -- design-first is valid, but must have clear execution milestones
- Do not treat focus clarity as binary -- 3 subsystems is acceptable; only 4+ becomes a scattered maintenance burden
- Do not assess maturity without considering team capacity -- a 2-person PoC project with 3 subsystems is appropriately scoped

## Notes

This strategy emerged from analyzing 4 projects (llm_os, skillos, skillos_mini, RoClaw) and discovering several patterns:

1. **Design-First Advantage (llm_os):** Projects with the strongest thesis (ISA + cartridge architecture) but least running code can be de-risked by delivering ONE validated reference implementation. Bootloader + sim/sim_world cartridge would prove the end-to-end architecture.

2. **Feature Scatter Cost (skillos):** Projects with 4+ subsystems (planning, agents, dream consolidation, scenario runner) pay a hidden maintenance cost: 160+ lines of scenario runner code duplicated in A/B tests vs production. The cost is rework + regression risk.

3. **Clear Vision Multiplier (skillos_mini):** Projects with a single, clear product vision (on-device trade app for trades) achieve:
   - Faster decision-making (no feature debates)
   - Cleaner architecture (no subsystem competition)
   - Easier team onboarding
   - Faster time to beta

4. **Mature Engineering Pattern (RoClaw):** Late-stage projects should have:
   - Production-grade trace/telemetry system (26+ strategies, 23+ constraints documented)
   - A/B testing framework (459 tests across 26 suites)
   - Active improvement cycle (quarterly strategy consolidation)
   - Clear architectural blueprints for other projects to follow

Use this framework as a quarterly or semi-annual exercise to track portfolio health over time. Trend the scores to identify when projects are moving between stages.
