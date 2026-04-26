---
id: strat_3_validation-before-deletion-checklist
version: 1
hierarchy_level: 3
title: Validation Checklist Before File/API Deletion
trigger_goals: ["validation", "file deletion", "API deprecation", "reference integrity", "compilation check", "test verification"]
preconditions: ["One or more files, directories, or APIs are scheduled for deletion", "Changes are part of a larger refactoring or simplification effort"]
confidence: 0.70
success_count: 1
failure_count: 0
source_traces: ["2026-04-26_execution_trace (CUT phase analysis revealed reference validation gaps)"]
deprecated: false
---

# Validation Checklist Before File/API Deletion

## Purpose
Before deleting files or APIs, execute a systematic validation checklist to catch reference breaks early and avoid post-deletion doc debt cleanup.

## Checklist

### Phase 1: Pre-Deletion Audit (BEFORE any deletions)

- [ ] **Identify all deletion candidates**
  - List all files/directories to delete
  - List all functions/exports to remove
  - List all environment variables/ports/config keys that will be deleted

- [ ] **Scan for functional references**
  ```bash
  grep -r "filename" . --include="*.ts" --include="*.js" --include="*.py" --include="*.rs"
  grep -r "function_name" . --include="*.ts" --include="*.js" --include="*.py" --include="*.rs"
  grep -r "old_port_number" . --include="*.ts" --include="*.js" --include="*.py" --include="*.rs" --include="*.md"
  ```
  - Record all matches
  - Classify each match: functional code vs documentation vs comment vs example

- [ ] **Scan for test references**
  ```bash
  grep -r "deleted_function" . --include="*.test.ts" --include="*.test.js"
  grep -r "mock.*DeletedClass" . --include="*.test.ts" --include="*.test.js"
  ```
  - Check if tests directly import or mock the deleted entity
  - Check if tests use the deleted API

- [ ] **Scan for documentation references**
  ```bash
  grep -r "agent_runtime.py" . --include="*.md"
  grep -r ":8420" . --include="*.md"
  grep -r "system/agents/" . --include="*.md"
  ```
  - Record all .md files with references
  - Note line numbers and context

- [ ] **Scan for script references**
  ```bash
  grep -r "old_path" . --include="*.sh" --include="*.ps1"
  grep -r "old_config" . --include="*.json" --include="*.yaml" --include="*.yml"
  ```
  - Check setup scripts for hardcoded references
  - Check configuration templates

- [ ] **Create deleted_artifacts.md**
  - Document deletion candidates with risk levels
  - List all found references by type and severity
  - Estimate cleanup effort
  - Identify quick wins vs deferred cleanup

### Phase 2: Preparation (BEFORE code changes)

- [ ] **Update all functional code callers**
  - For each functional reference: migrate to new API or remove call
  - Verify no functional code still uses deleted entity
  - Check imports and exports

- [ ] **Update tests** (if applicable)
  - Migrate tests from deleted API to new API
  - Delete test files for deleted subsystems
  - Verify mock classes/functions updated
  - Run test suite to confirm compile-time errors are caught

- [ ] **Flag but don't fix documentation**
  - Add TODO comments in docs (e.g., "TODO: this example uses deleted agent_runtime.py")
  - Do NOT delete doc content yet
  - This allows post-deletion audit to be complete and accurate

### Phase 3: Deletion

- [ ] **Delete files/directories** in dedicated commit(s)
  - One logical deletion per commit (e.g., "delete agent_runtime.py and related stubs")
  - Include deletion reason in commit message

- [ ] **Run test suite**
  - Verify zero test failures
  - Verify no compile errors

### Phase 4: Post-Deletion Audit (IMMEDIATELY after deletion)

- [ ] **Verify functional references are gone**
  - Re-run grep scans for deleted entities
  - Should return zero matches in functional code

- [ ] **Identify all documentation references**
  - Re-run grep scans including .md, .txt files
  - Update deleted_artifacts.md with complete reference list
  - Verify no stale references exist in functional code (should be caught by tests)

- [ ] **Triage documentation cleanup** (see strat_3_doc-debt-tracking-triage)
  - Categorize by type: command examples, API docs, script references, comments
  - Categorize by severity: critical, high, medium, low
  - Schedule fixes per priority

- [ ] **Create doc cleanup PR(s)**
  - One PR per high-priority file or group of related fixes
  - Reference deleted_artifacts.md in PR description
  - Track completion in project memory

### Phase 5: Validation Complete

- [ ] **Mark deletion as validated**
  - Update deleted_artifacts.md: "Validation complete: [date]"
  - Document any deferred cleanup and its priority

- [ ] **Run full test suite one more time**
  - Ensure integration tests pass
  - Ensure no cross-repo dependencies are broken

## Example Execution (Portfolio 2026-04-26)

**Phase 1 Audit (Pre-Deletion)**:
```
Deletion candidates: agent_runtime.py, system/agents/, system/tools/, :8420 references

Functional references found:
- RoClaw/bridge.py line 12: import agent_runtime (FUNCTIONAL - must migrate)
- skillos/CLAUDE.md line 45: agent_runtime.py example (DOC - defer to Phase 4)
- QWEN.md line 87: :8420 server reference (DOC - defer to Phase 4)

Deleted_artifacts.md created with findings.
Risk assessment: HIGH (multiple functional callers found)
```

**Phase 2 Preparation**:
```
RoClaw/bridge.py migrated to direct import
Tests updated to not mock agent_runtime
agent_runtime.py deleted safely in Phase 3
```

**Phase 3 Deletion**:
```
Commit: "chore: remove deprecated agent_runtime.py (replaced by SkillOS)"
Test suite: PASS
```

**Phase 4 Post-Deletion Audit**:
```
Functional code grep for agent_runtime.py: 0 matches (GOOD)
Documentation grep for agent_runtime.py: 7 matches in README.md, QWEN.md (identified)

Triage:
- Critical: README.md examples (7 fixes) - 15 min effort
- High: QWEN.md API docs (5 fixes) - 5 min effort
- Medium: test comments (16 fixes) - 160 min effort, deferred

Schedule immediate fixes for critical+high.
```

## Negative Constraints
- Do not skip the pre-deletion audit -- it catches issues before they become doc debt
- Do not assume functional validation will catch all references -- must explicitly grep for deletion candidates
- Do not mix deletion with feature addition -- pure deletion only
- Do not defer critical documentation cleanup -- fix broken examples and API docs same-day
- Do not rely on "re-validation after deletion" to catch everything -- pre-deletion audit is more thorough

## Notes

**Why This Works**:
1. Pre-deletion audit creates a complete reference map before changes
2. Functional references are caught and migrated BEFORE deletion
3. Documentation references are identified but not addressed until post-deletion (for accuracy)
4. Post-deletion audit is fast because we already know what to look for
5. Triage ensures critical doc debt is fixed immediately, preventing user-facing issues

**Metrics**:
- Time from deletion to functional validation: <1 hour
- Percentage of functional references caught pre-deletion: target 100%
- Percentage of critical doc debt fixed same-day: target >90%
- Time from deletion to complete documentation audit: <4 hours

This prevents the scenario on 2026-04-26 where functional validation passed but 60+ dangling doc references remained unfixed.
