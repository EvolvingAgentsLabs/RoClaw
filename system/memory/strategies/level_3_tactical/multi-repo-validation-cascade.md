---
id: strat_3_multi-repo-validation-cascade
version: 2
hierarchy_level: 3
title: Multi-Repository Change Validation Cascade
trigger_goals: ["validation", "reference integrity", "dangling references", "compilation check", "test verification", "portfolio execution", "multi-repo changes", "tsc", "svelte-check", "cargo", "build validation", "CLI entry points"]
preconditions: ["Multiple repositories are involved in a coordinated change", "Changes include file/directory deletions, API modifications, or cross-cutting refactors", "Cross-repo documentation and scripts may reference changed entities", "Each repo has a native type-checker or compiler (tsc, svelte-check, cargo, python -m py_compile, etc.)"]
confidence: 0.70
success_count: 2
failure_count: 0
source_traces: ["2026-04-26_execution_trace (CUT/DEVELOP portfolio execution)", "2026-04-28_multi_repo_build_validation (tsc+svelte-check+cargo across skillos_robot/skillos_mini/llm_os, all 3 CLI entry points tested)"]
deprecated: false
---

# Multi-Repository Change Validation Cascade

## Purpose
When executing coordinated changes across multiple repositories (e.g., CUT operations deleting deprecated code, DEVELOP operations adding features, or cross-cutting refactors touching shared interfaces), validate changes in a systematic cascade to catch functional breaks, type errors, and documentation debt before integration.

## Steps

1. **Pre-change audit phase** (BEFORE any modifications)
   - For each file/directory to be deleted or modified, grep the entire repository for references
   - Include patterns: function names, module imports, file paths, API endpoints, port numbers (e.g., :8420)
   - Document findings in a manifest: deleted_artifacts.md (see Phase 2)
   - Categorize references by type: functional code, documentation, tests, scripts, examples
   - Flag high-risk references that will cause immediate breakage if left unvalidated

2. **Per-repo type-checker / compiler validation** (DURING and AFTER code changes)
   - Run the native type-checker or compiler for EACH affected repository:
     - **TypeScript repos**: `tsc --noEmit` (type-check without emitting output)
     - **Svelte repos**: `svelte-check` (validates .svelte + .ts files)
     - **Rust repos**: `cargo check` (fast compilation check without producing binary)
     - **Python repos**: `python -m py_compile` or `mypy` if configured
   - Run linter/formatter passes if configured
   - **Distinguish pre-existing warnings from new regressions**: If the repo had N warnings before your changes, it should have <= N warnings after. Document pre-existing warning counts so reviewers understand what is inherited vs introduced
   - Execute test suite to confirm zero breakage from code changes
   - For API changes, verify all functional callers updated to new API

3. **Grammar/format validation** (DURING schema or spec changes)
   - If modifying grammar files (GBNF), validate new rules parse correctly
   - If modifying config formats (YAML, JSON), validate all config files still parse
   - If modifying trace schema, validate trace files conform to new schema

4. **Reference integrity validation** (DURING deletions)
   - Re-run grep scan with deletion candidates (files/functions/imports being removed)
   - Verify no functional code still calls deleted functions
   - Verify no active test code references deleted symbols (archived tests OK)
   - Verify no setup scripts or configuration reference deleted paths
   - Verify no environment variable documentation references deleted modules

5. **Documentation audit** (AFTER deletions, before merge)
   - Scan all documentation files (.md, .txt) for references to deleted entities
   - Scan code comments and docstrings for explanations of deleted subsystems
   - Scan README/QUICKSTART for command examples using deleted tools
   - Scan API reference docs for tool function signatures that were removed
   - Document all dangling references with path and type (see Phase 2)

6. **Test execution** (FINAL verification)
   - Run full test suite across all modified repositories
   - Run integration tests if cross-repo dependencies exist
   - Verify no tests use deleted APIs (tests should fail at compile time, not runtime)

7. **CLI entry point testing** (FINAL gate)
   - For each repo that exposes a CLI interface, test the primary entry points:
     - Help commands (e.g., `robot help`, `trade help`, `llmos help`)
     - Status commands (e.g., `llmos status`)
     - Smoke-test any new subcommands added in the change
   - This catches issues where code compiles but the CLI wiring (arg parsing, subcommand registration, module imports) is broken
   - Only declare the change complete after all CLI entry points respond correctly

## Negative Constraints
- Do not validate functional code and documentation debt together -- separate phases
- Do not assume reference integrity checking catches documentation references (it doesn't)
- Do not mark validation as passed if dangling references exist -- escalate to doc debt tracking (see strat_3_doc-debt-tracking)
- Do not merge changes if any functional code still references deleted symbols
- Do not delete files without a pre-deletion audit
- Do not consider changes "done" after code edits alone -- per-repo compiler validation AND CLI entry point testing are mandatory final gates (Constraint 43)
- Do not conflate pre-existing warnings with new regressions -- always document the baseline warning count before changes so reviewers can distinguish inherited vs introduced warnings

## Notes

**Portfolio Execution Example (2026-04-26)**:
- CUT phase deleted 8 items from skillos (agent_runtime.py, system/agents/, system/tools/, etc.)
- DEVELOP phase added 5 items to llm_os (ISA-aware compactor, parser enhancements, grammar swap)
- Functional validation passed: Rust cargo check, Python syntax, grammar review all passed
- Reference integrity check passed: no functional code still referenced deleted symbols
- HOWEVER: Documentation audit found 60+ dangling references:
  - 5 in QWEN.md (tool functions referencing :8420)
  - 7 in README.md (command examples using agent_runtime.py)
  - 16 in skillos_mini tests (references to deleted cooking cartridge)
  - setup_agents.sh/ps1 reference deleted system/agents/ directory

**Multi-Repo Build Validation Example (2026-04-28)**:
- After making changes across 3 repos, validated all builds:
  - RoClaw: `tsc --noEmit` -- clean (0 errors, 0 new warnings)
  - skillos_mini: `svelte-check` -- 0 errors, 4 pre-existing warnings (not introduced by changes)
  - llm_os: `cargo check` -- clean, 4 pre-existing warnings (not introduced by changes)
- Tested all 3 CLI entry points:
  - `robot help` -- working
  - `trade help` -- working
  - `llmos help` + `llmos status` -- working
- Pattern: per-repo type-checker/compiler validation + CLI entry point testing catches issues that cross-repo grep alone would miss (type mismatches, broken CLI wiring, import chain failures)

**Key Insight**: Functional validation and documentation audit are INDEPENDENT. A change can pass functional validation while leaving documentation debt. This separation is intentional -- documentation debt is tracked separately via strat_3_doc-debt-tracking. The 2026-04-28 session demonstrated that per-repo compiler validation is the fastest confidence signal: if tsc/svelte-check/cargo all pass clean, the cross-cutting change is structurally sound. CLI entry point testing is the user-facing confidence signal: if help commands work, the change is wired correctly.
