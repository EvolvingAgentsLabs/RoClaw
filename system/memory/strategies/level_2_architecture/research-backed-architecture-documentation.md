---
id: strat_2_research-backed-architecture-documentation
version: 1
hierarchy_level: 2
title: Research-Backed Architecture Documentation Update
trigger_goals: ["architecture documentation", "ARCHITECTURE.md", "research analysis", "paper review", "strategic analysis", "roadmap update", "codebase audit"]
preconditions: ["Existing codebase with running code to audit", "Access to relevant peer-reviewed papers (arXiv, conference proceedings)", "Existing architecture documentation to update (or blank slate)", "Clear idea storm or improvement proposals to cross-reference"]
confidence: 0.70
success_count: 1
failure_count: 0
source_traces: ["docs/ARCHITECTURE.md_2026-04-27", "docs/strategic-analysis-2026-04-27.md"]
deprecated: false
---

# Research-Backed Architecture Documentation Update

## Overview
A methodology for updating architecture documentation by cross-referencing peer-reviewed research papers with codebase reality and proposed improvements. This ensures architectural decisions are grounded in validated evidence rather than opinion, and that documentation accurately reflects both current state and research-motivated next steps.

## Steps
1. **Gather idea storm proposals.** Collect all proposed improvements, feature ideas, and architectural changes from team discussions, issue trackers, or brainstorming sessions.
2. **Select relevant papers.** For each proposal category, find 2-4 peer-reviewed papers (prefer ICLR, ECCV, NeurIPS, ACL, or strong workshop papers). Focus on papers that either validate or contradict the proposals.
3. **Create cross-reference matrix.** For each proposal, document: (a) what the idea storm says, (b) what each paper says about it, (c) what the codebase currently implements. This three-way comparison reveals gaps.
4. **Audit codebase reality.** For each proposal, grep the codebase to verify which features actually exist, which are partially implemented, and which are aspirational. Document file paths and line counts.
5. **Grade each proposal.** Assign a verdict: PROCEED (all evidence supports), PROCEED WITH MODIFICATIONS (papers suggest different approach), DEFER (prerequisites missing), or REJECT (papers contradict).
6. **Implement code changes first.** Make the architectural changes in code before documenting them. This prevents documentation-before-implementation divergence.
7. **Update architecture docs.** Write each section with: (a) Mermaid diagrams showing data flow, (b) paper citations motivating the design, (c) explicit "why X won" rationale for key decisions. Use structured tables for tier responsibilities, feature roadmaps, and status tracking.
8. **Create research-backed roadmap.** Organize next steps into tiers (do now, do next, do later, future research). Each roadmap item must cite the paper that motivates it and state its current status.
9. **Document critical corrections.** If papers contradict current assumptions (e.g., model size requirements, format preferences), document these as explicit corrections with paper citations.
10. **Cross-link strategic analysis.** Write a companion strategic-analysis document with the full paper cross-referencing, and link to it from the main architecture doc.

## Negative Constraints
- Do not document aspirational features as implemented -- always distinguish "implemented in host software" from "deployed end-to-end"
- Do not cite papers selectively -- if a paper contradicts a proposal, document the contradiction explicitly with corrective recommendations
- Do not skip the codebase audit step -- documentation that doesn't match code creates false confidence
- Do not omit the "why X won" rationale -- future contributors need to understand the decision context, not just the outcome
- Do not create roadmap items without paper citations or clear engineering rationale -- every tier item must justify its priority

## Notes
- Validated on the RoClaw 2026-04-27 architecture update, which cross-referenced 4 papers (Spartun3D ICLR 2025, NavGPT-2 ECCV 2024, Martorell UBA/CONICET 2025, Tehenan et al. 2025) against 8 idea storm proposals. Key outcome: SceneGraphPolicy became default (all 4 papers supported), 2B distillation target was corrected to 8B (Martorell contradiction), ReflexGuard activated (enabled by deterministic controller path), Spartun3D egocentric fields added to VLM prompt.
- The three-way comparison (proposal vs papers vs code) is the critical differentiator. Without it, documentation becomes either aspirational (ignoring code reality) or conservative (ignoring research opportunities).
- Mermaid diagrams should use consistent theming across the entire document for visual coherence.
- Time investment: approximately 4-6 hours for a thorough architecture doc update with 4 papers and 8 proposals. This amortizes well because the resulting document serves as the project's authoritative reference for months.
