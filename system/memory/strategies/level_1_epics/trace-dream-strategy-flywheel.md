---
id: strat_1_trace-dream-strategy-flywheel
version: 1
hierarchy_level: 1
title: Self-Improving Flywheel: Traces → Dreams → Strategies → Cartridge Promotion → Fine-Tune
trigger_goals: ["self-improving systems", "flywheel closure", "trace promotion", "dream integration", "model fine-tune", "cartridge promotion", "learning loop", "execution as training data"]
preconditions:
  - "System has working trace logging (RoClaw: YAML+markdown traces)"
  - "System has working dream consolidation (skillos: SWS/REM/Consolidation phases)"
  - "System has strategy persistence (skillos_robot/skillos: markdown strategy files)"
  - "Kernel platform exists (llm_os: runtime + cartridge system)"
  - "Model fine-tuning pipeline exists (llama.cpp or equivalent)"
confidence: 0.65
success_count: 1
failure_count: 0
source_traces: ["tr_2026-04-26_strategic_analysis"]
deprecated: false
---

# Self-Improving Flywheel: The Closed Learning Loop

## Vision

A **self-improving system** learns from its own execution. The flywheel closes when:

```
Real Execution (RoClaw)
    ↓ (emits traces)
Trace Logs (unified format)
    ↓ (read by dream consolidation)
Dream Consolidation (identify patterns, extract strategies)
    ↓ (writes strategies)
Reusable Strategies (markdown + manifests)
    ↓ (promote to executable form)
Cartridge Promotion (strategies become kernel cartridges)
    ↓ (deploy to inference)
Model Fine-Tuning (DPO: preferred behavior from cartridges)
    ↓ (train kernel model)
Better Kernel
    ↓ (improved motor control, navigation, reasoning)
Better Execution (RoClaw next attempt is smarter)
    ↓ (back to top)
```

This loop compounds: execution → learning → improvement → better execution → more learning → ...

**Without this loop:** Traces are logged but never analyzed. Strategies are written but never applied to the kernel. Fine-tuning data is never collected. The system learns nothing.

**With this loop:** The portfolio becomes a self-improving organism. Each execution contributes to the next generation's intelligence.

## Current State (2026-04-26)

The flywheel is **60% complete**:

### Phase 1: ✅ Trace → Dream (WORKING)
- **RoClaw traces:** YAML frontmatter + markdown body, 25+ traces committed
- **skillos dream consolidation:** 5+ parallel dream sessions, 24 strategies written, 21 constraints extracted
- **Outcome:** Dream produces reusable strategies (e.g., "oscillation-detection", "prompt-mode-alignment")

### Phase 2: ❌ Strategy → Cartridge (MISSING)
- **Current:** RoClaw strategies are markdown files (e.g., `oscillation-detection.md`)
- **Required:** Strategies must be promoted to cartridge manifests (manifest.json + schemas/ + handler)
- **Gap:** No script converts strategy markdown → cartridge manifest

### Phase 3: ❌ Cartridge → Fine-Tune (MISSING)
- **Current:** Cartridges exist in llm_os (6 examples: demo, roclaw, cooking, residential-electrical)
- **Required:** Execution traces must become DPO (Direct Preference Optimization) training data
- **Gap:** No pipeline collects preferred outputs from dreams and converts them to fine-tune format

### Phase 4: ❌ Fine-Tune → Better Kernel (MISSING)
- **Current:** llm_os runtime loads a base kernel model (Qwen 2.5 3B or Gemini)
- **Required:** Better model must be deployed via cartridge swap or in-situ fine-tune
- **Gap:** No model versioning, no fine-tune validation, no deployment mechanism

## The Four Phases in Detail

### PHASE 1: Trace → Dream (Currently Working)

**Purpose:** Extract patterns from execution logs.

**Input:** Execution traces from RoClaw, skillos agents, or simulation.

```yaml
---
timestamp: 2026-04-26T17:30:00Z
goal: "Navigate to kitchen"
outcome: success
source: SIM_3D
fidelity: 0.8
hierarchy_level: L2
parent_trace: tr_kitchen_nav_plan
---

# Navigation to Kitchen

## Actions
1. Enter hallway (success)
2. Turn left at corner (success, but 2 oscillations before settling)
3. Navigate through doorway (success, speed reduced to 60)

## Learnings
- Oscillation pattern detected: ROTATE_CW / ROTATE_CCW alternating
- Recovery: 90-degree scan rotation unblocks path
```

**Output:** Strategies written to `system/memory/strategies/level_*/*.md` with:
- Trigger goals (keywords that activate the strategy)
- Steps (the essential action sequence)
- Negative constraints (what NOT to do)
- Confidence score (how much we trust it)

**Current Implementation:** Skillos dream consolidation (SWS → REM → Consolidation phases) produces strategies like:
- `oscillation-detection.md` (L3 tactical: detect when robot is stuck rotating)
- `prompt-mode-alignment.md` (L3 tactical: match system prompt to inference mode)
- `model-selection-by-reasoning-type.md` (L2 architecture: choose model based on task)

**Status:** ✅ Working well. 24 strategies extracted from 5+ dream sessions.

---

### PHASE 2: Strategy → Cartridge (MISSING)

**Purpose:** Convert reusable strategies into executable cartridge manifests.

**Challenge:** Strategies are prose (markdown), cartridges are executable (JSON + GBNF + code).

**Solution:** Define a mapping from strategy to cartridge:

#### Strategy Levels → Cartridge Types

| Strategy Level | Cartridge Type | Example | Handler |
|---|---|---|---|
| L1 Epic | Cartridge suite (meta-cartridge) | `suite/portfolio-convergence` | Orchestration (skillos agent) |
| L2 Architecture | Cartridge system module | `system/model-selector` | GBNF rules + schema |
| L3 Tactical | Cartridge utility | `util/oscillation-detector` | GBNF detector + state |
| L4 Reactive | Cartridge micro-handler | `io/roclaw.motor-control` | ISA opcode dispatch |

#### Example: Oscillation Detection Strategy → Cartridge

**Strategy (PHASE 1 output):**
```markdown
---
id: strat_3_oscillation-detection
title: Detect oscillating rotation patterns
trigger_goals: ["stuck detection", "rotation loops"]
steps:
  1. Track rotation opcode sequence over sliding 20-frame window
  2. Detect pattern: ROTATE_CW, ROTATE_CCW alternating with net heading = 0
  3. Fire stuck-recovery interrupt (90-degree scan rotation)
---
```

**Cartridge (PHASE 2 output):**
```json
{
  "name": "util/oscillation-detector",
  "version": "1.0.0",
  "description": "Detect and recover from oscillating rotation patterns",
  "input_schema": {
    "type": "object",
    "properties": {
      "opcode_sequence": { "type": "array", "items": { "type": "string" } },
      "window_size": { "type": "integer", "default": 20 }
    }
  },
  "output_schema": {
    "type": "object",
    "properties": {
      "is_oscillating": { "type": "boolean" },
      "recovery_action": { "type": "string" }
    }
  },
  "handler": "oscillation_detector.gbnf",
  "isa_requirement": "llm_os_canonical_v1"
}
```

**Steps to implement PHASE 2:**

1. **Create strategy-to-cartridge mapping tool:**
   - Read strategy markdown from `system/memory/strategies/level_*/*.md`
   - Extract trigger goals, steps, preconditions
   - Generate JSON manifest with matching schema

2. **Define cartridge manifest schema:**
   - Standardize `name`, `version`, `description`, `input_schema`, `output_schema`
   - Include metadata: `source_strategy`, `confidence`, `success_count`
   - All cartridges conform to this schema

3. **Create cartridge handler templates:**
   - GBNF templates for common patterns (detection, classification, routing)
   - Copy strategy steps into GBNF rules
   - Validate grammar compiles

4. **Write validation tests:**
   - For each promoted cartridge, create test cases
   - Test input → handler → output matches expected behavior
   - Verify cartridge integrates with kernel without breaking existing cartridges

**Timeline:** 2-3 weeks (one engineer, part-time).

**Deliverable:** Script `scripts/promote_strategy_to_cartridge.py` that produces ready-to-deploy cartridges from dream outputs.

---

### PHASE 3: Cartridge → Fine-Tune (MISSING)

**Purpose:** Convert execution traces and strategies into training data for model fine-tuning.

**Challenge:** Models are trained on token sequences, not high-level strategies. We need to convert trace narratives into preferred/non-preferred token sequences.

**Solution:** Use DPO (Direct Preference Optimization) format:

#### Trace → DPO Triple Conversion

**Input (from PHASE 1: trace + strategy):**
```yaml
timestamp: 2026-04-26
goal: "Navigate around obstacle"
outcome: SUCCESS
strategy_applied: "90-degree-scan-rotation"
steps:
  1. Detect obstacle ahead (distance 30cm)
  2. Execute ROTATE_CW 90 degrees
  3. Check forward clearance → success
  4. Continue forward
```

**Output (PHASE 3: DPO triple):**
```json
{
  "prompt": "Navigate around obstacle ahead at 30cm distance. Choose next action.",
  "chosen": "<|call|>io.roclaw.rotate {\"angle\": 90, \"direction\": \"cw\"} <|result|>success",
  "rejected": "<|call|>io.roclaw.move_forward {\"speed\": 150} <|result|>collision"
}
```

**Steps to implement PHASE 3:**

1. **Define trace-to-prompt conversion:**
   - Scene description + history → prompt template
   - Example: "Robot at (x,y), obstacle 30cm ahead, tried forward motion failed"

2. **Extract preferred action:**
   - Successful trace action → `chosen` token sequence
   - Map RoClaw opcodes to llm_os ISA syntax

3. **Generate rejected alternative:**
   - Pattern mining: for failed traces, the failed action → `rejected`
   - Or: contrastive sampling: what action would have been worse?

4. **Batch collection:**
   - Collect 100+ DPO triples from RoClaw traces
   - Filter by success rate and execution quality
   - Save to JSONL format (standard fine-tune input)

**Timeline:** 1-2 weeks (one engineer, part-time).

**Deliverable:** Script `scripts/traces_to_dpo_triples.py` that converts RoClaw traces → JSONL DPO data.

---

### PHASE 4: Fine-Tune → Better Kernel (MISSING)

**Purpose:** Train an improved kernel model using collected DPO data.

**Challenge:** Fine-tuning a Llama model requires GPU, LoRA setup, validation harness.

**Solution:** Use existing fine-tune infrastructure (if available) or defer to external service (e.g., Together.ai, Replicate).

**Steps to implement PHASE 4:**

1. **Set up fine-tune job:**
   - Provider: Together.ai (supports Llama fine-tune via API)
   - Model: `meta-llama/Llama-2-7b` or equivalent
   - Data: JSONL DPO triples from PHASE 3
   - LoRA rank: 8, alpha: 16 (standard)

2. **Train and validate:**
   - Run 3-epoch training (50-100 traces per epoch = 150-300 total)
   - Validate on holdout set (10% of traces)
   - Metrics: accuracy on unseen scenarios, latency, tokenization consistency

3. **Deploy new kernel:**
   - Export fine-tuned model as GGUF (Llama.cpp format)
   - Update llm_os kernel version (v0.5.2 → v0.5.3)
   - Canary: test on 10 RoClaw scenarios
   - If metrics improve: promote to production

4. **Measure improvement:**
   - A/B test: old kernel vs. new kernel on held-out scenarios
   - Metric: collision count, stuck detection false positives, success rate
   - Target: 10-20% improvement in primary metric

**Timeline:** 3-4 weeks (one engineer, support from ML specialist).

**Deliverable:** Updated kernel GGUF, version bump, A/B test report.

---

## The Closed Flywheel: Putting it Together

Once all four phases are implemented:

```
Week 1-2 (PHASE 2 + PHASE 3):
  - Promote 5 strategies to cartridges
  - Collect 100 DPO triples from existing traces
  - Cartridges deployed to staging llm_os

Week 3-4 (PHASE 4):
  - Fine-tune kernel on 100 triples
  - Validate on held-out scenarios
  - Deploy improved kernel to Pi 5

Week 5+:
  - RoClaw executes with new kernel
  - New traces generated (better performance → more diverse scenarios)
  - Dream consolidation extracts new strategies (learned from better execution)
  - New cartridges promoted (compounding improvement)
  - Cycle repeats with 200 traces, finer granularity
  - By week 12: thousands of traces, multiple fine-tune generations, measurable improvement
```

## Success Metrics

| Phase | Metric | Target | Status |
|---|---|---|---|
| 1 | Traces logged per week | 50+ (from RoClaw sim) | ✅ |
| 1 | Strategies created | 5+/session | ✅ |
| 1 | Constraint extraction | 20+ total | ✅ |
| 2 | Cartridges promoted | 5+/month | ❌ (0 to date) |
| 2 | Cartridge test coverage | 90%+ | ❌ |
| 3 | DPO triples collected | 100+/month | ❌ (0 to date) |
| 3 | Trace → prompt fidelity | 95%+ accuracy | ❌ |
| 4 | Kernel fine-tune cycles | 1+/month | ❌ (0 to date) |
| 4 | A/B improvement | 10%+ metric gain | ❌ |

## Critical Dependencies

**Flywheel is blocked until these are done:**

1. **Trace format standardization (PHASE 1 → PHASE 2):**
   - All new traces must have unified YAML frontmatter
   - Must include `hierarchy_level`, `source`, `goal`, `outcome`
   - Without this, strategy extraction fails

2. **ISA convergence (PHASE 2 → PHASE 4):**
   - RoClaw and llm_os must use same opcode set
   - Otherwise, converted actions won't tokenize correctly
   - Target: canonical ISA with 13-15 opcodes, used by both projects

3. **Cartridge manifest standardization (PHASE 2 → PHASE 3):**
   - All cartridges must use same manifest.json schema
   - Input/output schemas must be JSON Schema compatible
   - Without this, DPO conversion fails

4. **Dream consolidation reliability (PHASE 1):**
   - Dream must run weekly on new traces
   - Must produce strategies with confidence ≥ 0.5
   - Must deduplicate and merge strategies automatically
   - Without this, flywheel accumulates duplicate cartridges

## Anti-Patterns

- **Do not skip PHASE 2:** Draft strategies directly to fine-tune (losing the interpretability and reusability of cartridges)
- **Do not freeze kernel model:** If fine-tune invalidates existing cartridges, the flywheel breaks. Use versioning and compatibility checks.
- **Do not over-fine-tune early:** Wait for 200+ high-quality traces before fine-tuning (noisy data causes model collapse)
- **Do not ignore validation:** Fine-tuned models can regress on existing tasks. Always A/B test before deployment.

## Implementation Timeline

**Quarter 2 (Weeks 1-6):**
- PHASE 2: Promote 5 strategies to cartridges (2 weeks)
- PHASE 3: Collect 100 DPO triples (2 weeks)
- Testing & validation (2 weeks)

**Quarter 2 (Weeks 7-12):**
- PHASE 4: Run first fine-tune cycle (4 weeks)
- Deploy improved kernel (1 week)
- Measure A/B improvement (1 week)

**Quarter 3+:**
- Ongoing: Weekly dream consolidation → new cartridges
- Monthly: Collect DPO triples, fine-tune kernel
- Quarterly: Deploy improved kernel, measure compounded improvement

## Negative Constraints Applied

- Constraint 27: Don't defer infrastructure (grammar swap, compactor) — these unblock the flywheel
- Constraint 28: Close the loop — don't leave trace-to-improvement incomplete

## Notes

This strategy is the **highest-leverage work item** in the portfolio after infrastructure (grammar swap, compactor). The flywheel compounds: each month, execution becomes smarter; each quarter, the kernel improves measurably.

The 2026-04-26 strategic analysis identified this as "the differentiator" that no other LLM system has: a closed loop from real execution to training data to model improvement. Implementing this fully (all 4 phases) is the path to a genuinely self-improving autonomous system.
