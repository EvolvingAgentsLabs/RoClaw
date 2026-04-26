---
id: strat_3_multi-repo-validation-cascade
version: 1
hierarchy_level: 3
title: Multi-Repository Change Validation Cascade
trigger_goals: ["validation", "reference integrity", "dangling references", "compilation check", "test verification", "portfolio execution", "multi-repo changes"]
preconditions: ["Multiple repositories are involved in a coordinated change", "Changes include file/directory deletions or API modifications", "Cross-repo documentation and scripts may reference changed entities"]
confidence: 0.65
success_count: 1
failure_count: 0
source_traces: ["2026-04-26_execution_trace (CUT/DEVELOP portfolio execution)"]
deprecated: false
---

# Multi-Repository Change Validation Cascade

## Purpose
When executing coordinated changes across multiple repositories (e.g., CUT operations deleting deprecated code, DEVELOP operations adding ISA enhancements), validate changes in a systematic cascade to catch functional breaks and documentation debt before integration.

## Steps

1. **Pre-deletion audit phase** (BEFORE any deletions)
   - For each file/directory to be deleted, grep the entire repository for references
   - Include patterns: function names, module imports, file paths, API endpoints, port numbers (e.g., :8420)
   - Document findings in a manifest: deleted_artifacts.md (see Phase 2)
   - Categorize references by type: functional code, documentation, tests, scripts, examples
   - Flag high-risk references that will cause immediate breakage if left unvalidated

2. **Functional validation** (DURING code changes)
   - Run syntax checks on modified files (Python: compile, TypeScript: tsc --noEmit, Rust: cargo check)
   - Run linter/formatter passes
   - Execute test suite to confirm zero breakage from code changes
   - For API deletions, verify all functional callers updated to new API

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

## Negative Constraints
- Do not validate functional code and documentation debt together -- separate phases
- Do not assume reference integrity checking catches documentation references (it doesn't)
- Do not mark validation as passed if dangling references exist -- escalate to doc debt tracking (see strat_3_doc-debt-tracking)
- Do not merge changes if any functional code still references deleted symbols
- Do not delete files without a pre-deletion audit

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

**Key Insight**: Functional validation and documentation audit are INDEPENDENT. A change can pass functional validation while leaving documentation debt. This separation is intentional -- documentation debt is tracked separately via strat_3_doc-debt-tracking.
