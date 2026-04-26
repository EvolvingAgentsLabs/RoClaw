---
id: strat_1_cross-project-priority-sequencing
version: 1
hierarchy_level: 1
title: Cross-Project Priority Sequencing and Critical Path Identification
trigger_goals: ["portfolio priority", "roadmap planning", "critical path", "sequencing decisions", "what to do first", "priority framework", "roadmap integration"]
preconditions:
  - "Multi-project portfolio with interdependent work items"
  - "Strategic goals are defined (e.g., product launch, kernel maturity)"
  - "Project teams are resource-constrained (can't do everything in parallel)"
  - "Projects have explicit dependencies (llm_os kernel blocks skillos_mini trade-app)"
confidence: 0.70
success_count: 1
failure_count: 0
source_traces: ["tr_2026-04-26_strategic_analysis"]
deprecated: false
---

# Cross-Project Priority Sequencing and Critical Path Identification

## Purpose

When managing a portfolio of interdependent projects (especially in self-improving systems), priority sequencing is critical. This strategy provides a framework for identifying which work items unlock the most downstream value, and in what order they must be executed to unblock dependent work.

## The Priority Sequencing Framework

### Tier 1: Infrastructure Blockers (2-6 weeks)
These are the foundational items that block ALL downstream work. They must be completed first, even if they're not the most glamorous work.

**Identification criteria:**
- Blocks execution of 3+ dependent projects
- Prevents the system from reaching its theoretical performance ceiling
- Correctness or latency guarantee required (not optional)
- 4-6 week timeframe

**Portfolio example:**
1. **llm_os grammar swap** (15% latency tax on every syscall → unblocks 8 Hz target)
2. **llm_os ISA-aware compactor** (silent state corruption risk → unblocks long-running tasks)

**Action:** Assign your strongest engineer. Accept that feature work pauses. This is the gating item.

### Tier 2: Product Validation (1-2 weeks)
These are the user-facing validation points that confirm the strategic direction before committing resources to full implementation.

**Identification criteria:**
- Real-world validation with actual users (not assumptions)
- Blocks M2+ feature development
- Pivot risk: getting this wrong wastes 4-12 weeks downstream
- 1-2 week timeframe (interviews + synthesis, not engineering)

**Portfolio example:**
- **skillos_mini M1 validation:** 5+ interviews with target oficios (electricista, plomero, pintor)
- Confirms product-market fit before M2 (MVP features) engineering

**Action:** Do this BEFORE you build M2. If the premise is wrong, stop and redirect.

### Tier 3: Interoperability Standards (1-2 weeks)
These are the "one-time" standardization efforts that enable cross-project learning and code reuse for the first time.

**Identification criteria:**
- Enables cross-project pattern recognition
- Done once, then enforced on all future work
- 1-2 week timeframe (definition + enforcement, not redesign of existing projects)
- Unblocks Tier 4 (flywheel)

**Portfolio example:**
1. **Trace format standardization** (RoClaw YAML + markdown → canonical schema for all projects)
2. **ISA convergence** (RoClaw 14 ops → llm_os canonical ISA, used by all cartridges)
3. **Cartridge manifest alignment** (manifest.json format standardized across skillos_mini, llm_os, skillos)

**Action:** Define the standard. All new traces/cartridges from this point forward conform. Old traces are grandfathered.

### Tier 4: The Self-Improving Flywheel (4-8 weeks)
These are the architecture-level changes that enable the portfolio to learn and improve from its own execution.

**Identification criteria:**
- Enables dream consolidation → strategy promotion → model fine-tune
- Closes the loop: execution → learning → improvement → better execution
- 4-8 week timeframe (integration, not green-field development)
- Highest leverage: compounds over time

**Portfolio example:**
- **Dream ↔ llm_os integration:** skillos dream consolidation writes cartridges, llm_os compiles them, kernel gets better
- **Trace promotion pipeline:** RoClaw traces → DPO fine-tune data → llama fine-tune → better kernel → better RoClaw performance

**Action:** This is the "flywheel close" work. Once Tiers 1-3 are done, this becomes the continuous improvement loop.

### Tier 5: Feature Development (ongoing, after Tiers 1-4)
Only after infrastructure, validation, and interoperability are locked down should teams build new features.

**Portfolio example:**
- skillos_mini M2+ features (only after M1 validation)
- llm_os cartridge library (only after grammar swap)
- skillos skill tree expansion (only after trace format standardization)

## The Portfolio Dependency Graph

```
Tier 1 (Infrastructure)
├── llm_os grammar swap (8 Hz unblock)
│   └─→ Tier 2: skillos_mini M1 validation
│       └─→ Tier 3: Trace + ISA standardization
│           └─→ Tier 4: Dream ↔ llm_os integration
│               └─→ Tier 5: Feature work (M2+, cartridge library, etc.)
│
└── llm_os ISA-aware compactor (correctness)
    └─→ (same dependency chain)
```

## Implementation Pattern: The Critical Path

### Step 1: Identify Blocking Items
List all work items in your portfolio. For each, ask:
- What upstream work does this depend on?
- What downstream work depends on this?
- Is this a blocker (3+ downstream), nice-to-have (1-2), or orthogonal (0)?

### Step 2: Classify by Tier
Assign each item to Tier 1-5 above based on impact and dependencies.

### Step 3: Sequence Within Each Tier
Within Tier 1 (e.g., both grammar swap and compactor are blockers), identify:
- Is there a sub-dependency? (grammar swap enables faster iteration on compactor → do grammar first)
- Are there parallel paths? (do them in parallel if resources permit)

### Step 4: Set Go/No-Go Gates
For Tier 2 items (validation), define:
- Success criteria (e.g., "5+ interviews completed, 3/5 express purchase intent")
- Failure criteria (e.g., "market pivot required" → redirect to different Tier 2 item)
- Timeline (hard deadline, e.g., 2026-05-01)

### Step 5: Enforce Sequencing Discipline
This is the hard part: **do not skip Tiers 1-3 to get to feature work (Tier 5)**.

Example of what breaks this:
- Temptation: "Let's add more features to skillos_mini to impress users"
- Problem: Users haven't validated the product direction yet (Tier 2 incomplete)
- Outcome: Wasted features, pivot risk

## Negative Constraints

- **Do not start Tier 2 (validation) before Tier 1 (infrastructure) is complete** — a blocked infrastructure layer will frustrate users and invalidate feedback
- **Do not start Tier 5 (features) before Tier 4 (flywheel) is complete** — you lose the compounding learning effect that makes the portfolio self-improving
- **Do not parallelize Tier 1 items across different teams** — they need to be sequential or heavily coordinated (grammar swap unblocks compactor faster iteration)
- **Do not skip validation because you "know" the direction** — the 2026-04-26 analysis explicitly showed skillos_mini was built with unvalidated M1 assumptions

## Success Metrics

1. **Tier 1 blockers:**
   - All items complete within 6 weeks
   - No feature work starts until both grammar swap and compactor are shipped
   - Performance ceiling reached: 8 Hz on Pi 5 (grammar swap), zero state corruption in 1000+ frame sequences (compactor)

2. **Tier 2 validation:**
   - M1 interviews completed: 5+ oficios, 3 distinct trades
   - Go/No-Go decision made: proceed to M2 (feature dev) or pivot
   - Timeline met: 2026-05-01 hard gate

3. **Tier 3 standardization:**
   - 100% of new traces conform to standard (YAML frontmatter, Level field, hierarchy)
   - ISA convergence: RoClaw uses canonical ISA, all cartridges use same opcode set
   - Cartridge manifest: skillos_mini, llm_os, skillos all use same JSON schema

4. **Tier 4 flywheel:**
   - Dream consolidation writes 1+ cartridges per week
   - Cartridges are deployed to llm_os kernel
   - First fine-tune cycle: 100 traces → DPO data → model improvement

5. **Tier 5 features:**
   - Only start after all Tiers 1-4 are complete
   - Feature velocity: 1-2 features/week (no longer bottlenecked by infrastructure)

## Notes

This strategy was synthesized from the 2026-04-26 strategic portfolio analysis. The analysis revealed that the original skillos_mini roadmap (12 weeks, 6 milestones) was over-scoped relative to the actual constraints:

- **Missing Tier 1:** No infrastructure unblocking (grammar swap, compactor were assumed to be "already done")
- **Missing Tier 2:** M1 validation was never executed (product direction was assumed)
- **Missing Tier 3:** Trace format divergence was not recognized as a blocker
- **Missing Tier 4:** No flywheel closure strategy (dream → cartridge → fine-tune loop was incomplete)

The corrected sequencing collapses 12-week roadmap to 8 weeks by:
1. Completing Tiers 1-4 in weeks 1-6 (in sequence, not parallel)
2. Starting M1 validation in week 2 (parallel to grammar swap work)
3. Releasing M2 features in week 7-8 (after all Tiers complete)

This framework is reusable for any multi-project portfolio. Adapt the specific work items (Tier 1 blockers, Tier 2 validation gates) to your context.
