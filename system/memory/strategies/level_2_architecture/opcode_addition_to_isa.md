---
id: strat_2_opcode_addition_to_isa
version: 1
hierarchy_level: 2
title: Pattern for Adding a New Opcode to the ISA (Grammar, Parser, Tests)
trigger_goals: ["ISA extension", "new opcode", "grammar modification", "parser update", "semantic payload", "state tracking"]
preconditions: ["ISA spec document (ARCHITECTURE.md) open for editing", "grammar/isa.gbnf writable", "runtime/parser.rs writable", "new opcode has clear semantics and payload schema"]
confidence: 0.80
success_count: 1
failure_count: 0
source_traces: ["tr_20260426_execution_trace_develop_state_opcode", "dream_20260426_kernel_b2f8"]
deprecated: false
---

# Pattern for Adding a New Opcode to the ISA

## Context

When the kernel requires new functionality (e.g., state persistence across KV cache boundaries, new capability bits, new fault modes), a new opcode must be added to the ISA. The addition requires coordinated changes across three files: grammar definition, parser implementation, and test suite. Rushing any one step creates silent bugs or grammar mismatches.

## Solution

Follow a 6-step pattern that ensures grammar and parser stay in sync, both productions receive test coverage, and the opcode is properly documented.

## Steps

1. **Design the opcode syntax and payload**:
   - Define the opcode markers (e.g., `<|state|>` and `<|/state|>`)
   - Define the payload schema (JSON, enum, typed struct, plain text?)
   - Document the semantics: when is this opcode emitted? what does it signal?
   - Write 1-2 sentence description in ARCHITECTURE.md spec table

2. **Add to grammar** (in `grammar/isa.gbnf`):
   ```
   state-stmt ::= "<|state|>" json "<|/state|>" nl
   ```
   - Create a new rule (e.g., `state-stmt`)
   - Define payload constraints (whitespace, nesting, escaping rules)
   - **Critical**: Add to **both** `top-stmt` and `loop-stmt` alternations
     - `top-stmt ::= ... | state-stmt`
     - `loop-stmt ::= ... | state-stmt`
   - If opcode can appear at _intermediate_ levels, add to each level
   - If opcode is only end-of-sequence, add only to `top-stmt`

3. **Add parser variant** (in `runtime/parser.rs`):
   ```rust
   pub enum Statement {
       // ... existing variants ...
       State { payload: Value },
   }

   pub enum Opcode {
       // ... existing variants ...
       State,
   }
   ```
   - Add variant to `Statement` enum
   - Add variant to `Opcode` enum (if it's an opcode; some stmts are not)

4. **Implement parse function**:
   ```rust
   fn parse_state(tokens: &[Token]) -> Result<(Statement, usize)> {
       // 1. consume "<|state|>"
       // 2. extract JSON payload between state markers
       // 3. validate schema (if applicable)
       // 4. consume "<|/state|>"
       // 5. return Statement::State { payload }, tokens_consumed
   }
   ```
   - Handle edge cases: unclosed markers, malformed JSON, missing closing marker
   - Return `Err` for well-defined failures (helps with grammar rejection later)

5. **Add rehydration logic** (in `OpcodeStream` or equivalent):
   - If the opcode carries state that the sampler needs to know about (e.g., restoring loop_depth):
     - Extract from payload in `next_statement()`
     - Update internal tracker (e.g., `self.loop_depth = payload.loop_depth`)
     - The opcode itself may not emit a token to the sampler (it's "informative only")

6. **Write unit tests** (in `runtime/tests/`):
   - **Test 1**: `parse_state_extracts_json_payload` — verify payload is parsed and deserialized
   - **Test 2**: `parse_state_with_nested_structures` — verify nesting, escaping, special characters work
   - **Test 3**: `stream_rehydrates_from_state_preamble` — verify `OpcodeStream::next_statement()` rehydrates internal state from the opcode
   - Optional: **Test 4**: round-trip test (serialize state → inject → parse → verify restored state matches)

## Validation Checklist

- [ ] Grammar rule is in BOTH `top-stmt` and `loop-stmt` (if applicable)
- [ ] Parser variant exists in both `Statement` and `Opcode` enums
- [ ] `parse_*` function has error handling for all edge cases
- [ ] Rehydration logic updates internal tracker if opcode carries state
- [ ] 3+ unit tests, at least one covering rehydration
- [ ] Spec table updated in ARCHITECTURE.md with opcode number (e.g., "14th opcode")
- [ ] Grammar fixtures still pass (`grammar/tests/legal/`)
- [ ] No compiler warnings from cargo check

## Negative Constraints

- Do not add opcode to only one level (e.g., top-stmt but not loop-stmt) — creates silent grammar mismatches
- Do not parse opcode payload without schema validation — malformed payloads corrupt downstream state
- Do not skip the rehydration step if the opcode carries state — the state will be lost on session resume
- Do not forget to add to grammar BEFORE writing parser tests — the grammar is the source of truth

## Notes

**Case study**: Adding `<|state|>` to llm_os v0.5 (2026-04-26)
- Grammar rule: added to both `top-stmt` and `loop-stmt` ✅
- Parser: added `State` variant to `Statement`, `Opcode` enums ✅
- Parse logic: `parse_state()` extracts JSON, validates schema ✅
- Rehydration: `OpcodeStream::next_statement()` updates `loop_depth` from payload ✅
- Tests: 3 unit tests (parses_state, stream_rehydrates_loop_depth_from_state, opcode_response_classification) ✅
- Result: Success. Grammar still passes all 12 fixture tests.

This pattern ensures that new opcodes are added systematically and can be adopted by other projects needing similar extensions.
