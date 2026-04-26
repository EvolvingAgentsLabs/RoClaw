---
id: strat_2_isa_aware_state_serialization
version: 1
hierarchy_level: 2
title: ISA-Aware State Serialization for KV Cache Compaction
trigger_goals: ["KV cache compaction", "ISA state preservation", "message summarization", "loop depth tracking", "pending result tracking"]
preconditions: ["executing within llm_os kernel runtime", "KV cache utilization > 70%", "pending loop depth > 0 OR pending results queue nonempty"]
confidence: 0.75
success_count: 1
failure_count: 0
source_traces: ["tr_20260426_execution_trace_develop_operations", "dream_20260426_kernel_b2f8"]
deprecated: false
---

# ISA-Aware State Serialization for KV Cache Compaction

## Context

When the runtime compacts the KV cache (at ~70% utilization), older tokens are dropped and summarized. If the dropped window contains unclosed `<|loop|>` constructs or pending `<|result|>` expectations, the GBNF state machine loses coherence on session resume — the next token fails to parse because the parser has no knowledge of the lost context.

## Solution

Extract an `IsaState` snapshot before dropping the window, serialize it as a JSON preamble, and inject it into the compacted summary. On resume, the parser reads the preamble and rehydrates its internal grammar state.

## Steps

1. **Define IsaState struct** (in `runtime/swap.rs` or equivalent):
   ```rust
   struct IsaState {
       loop_depth: u32,
       pending_results: Vec<PendingResult>,  // unmatched <|read|>/<|call|>/<|wait|>/<|fault|>/<|policy|>
       pending_acks: Vec<PendingAck>,        // unmatched <|write|>
       open_fork_ids: Vec<ForkId>,           // <|fork|> with no terminating <|halt|>
       open_loops: Vec<LoopGoal>,            // <|loop|>goal=...
   }
   ```

2. **Walk the dropped window** to extract state:
   - Iterate through message tokens in reverse chronological order (from most recent back to the point of drop)
   - Track each opcode: increment loop_depth on `<|loop|>`, decrement on `<|break|>/<|halt|>`
   - Collect unmatched `<|read|>`, `<|call|>`, `<|wait|>`, `<|result|>`, `<|fault|>`, `<|policy|>` in pending_results queue
   - Collect unmatched `<|write|>`, `<|ack|>` in pending_acks queue
   - Record any `<|fork|>` without matching `<|halt|>` in open_fork_ids

3. **Serialize to preamble**:
   - Convert IsaState to JSON: `{"loop_depth": N, "pending_results": [...], "pending_acks": [...], "forks": [...], "loops": [...]}`
   - Wrap in opcode: `<|state|>{...}<|/state|>`
   - Prepend to the summarized (dropped) text before returning to sampler

4. **Rehydrate on parser init** (in `runtime/parser.rs`):
   - Recognize `<|state|>` token in token stream
   - Extract and parse JSON payload
   - Push IsaState back into the parser's internal state tracker
   - Continue normal parsing from next token

5. **Test coverage**:
   - Test 1: `isa_aware_compaction_injects_state_preamble` — verify preamble is injected when pending results exist
   - Test 2: `extract_isa_state_tracks_nested_loops` — verify loop_depth correctly tracked through 3 levels of nesting
   - Test 3: `extract_isa_state_trivial_when_balanced` — verify empty state when all constructs are balanced

## Negative Constraints

- Do not drop tokens without first extracting ISA state — this causes silent grammar state corruption
- Do not assume pending_results queue is empty just because the dispatch looks "balanced" — a partial read/call/wait can be pending
- Do not serialize IsaState without JSON validation — malformed preamble breaks parser recovery

## Notes

This pattern is generalizable to any ISA construct that requires state tracking across KV cache boundaries. The critical insight is that **compaction is a state machine reset point** — the preamble is not informative text for the sampler, it's a state restoration signal for the parser.

**Tested on**: llm_os v0.5 runtime/swap.rs + runtime/parser.rs

**Confidence basis**: Rust implementation validated by tsc/cargo check, 3 unit tests passing. Integration test (5000-token dispatch at depth 3 surviving compaction) is pending.
