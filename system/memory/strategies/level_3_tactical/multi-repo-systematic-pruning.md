---
id: strat_3_multi-repo-systematic-pruning
version: 1
hierarchy_level: 3
title: Safe Multi-Repository Portfolio Pruning with Pre-Deletion Verification
trigger_goals: ["pruning", "dead code", "file deletion", "deprecated stubs", "portfolio cleanup", "CUT operations", "code reduction"]
preconditions: ["Portfolio analysis complete identifying what to remove", "Removal targets are truly dead (not used by other projects)", "Version control staging area is clean (no uncommitted changes)"]
confidence: 0.6
success_count: 1
failure_count: 0
source_traces: ["tr_2026-04-26_portfolio_execution"]
deprecated: false
---

# Safe Multi-Repository Portfolio Pruning with Pre-Deletion Verification

## Steps

1. **Pre-Deletion Reference Scan** (Critical — prevents dangling references)
   - Grep across entire repository for references to every target file/directory
   - Command template: `grep -r "filename\|module_name\|import_path" --include="*.md" --include="*.py" --include="*.rs" --include="*.ts" --include="*.sh" --include="*.ps1"`
   - Catalog all references in a file: `targets_to_delete.txt` with reference count per target
   - Group references by type: code imports, documentation, test mocks, config, scripts
   - For each reference: decide KEEP (change reference), UPDATE (fix reference), or DELETE (entire file/dir contains only dead code)

2. **Cascading Dependency Analysis**
   - For each target with references, determine if:
     - Downstream is also marked for deletion (safe to delete both)
     - Downstream is production code (must update or skip deletion)
     - Downstream is test code (must update test fixtures first)
     - Downstream is documentation (safe to update)
   - Identify files that should be deleted as a CLUSTER (e.g., all demo projects together) vs independent items

3. **Validate Test Suite Before Deletion**
   - Run full test suite: `npm test` or `cargo test` or `pytest`
   - All tests must PASS with current code before beginning deletions
   - Document baseline test status for verification after deletions

4. **Execute Deletions in Dependency Order**
   - LEAF-FIRST: Delete items with no dependents first
   - CLUSTER: Delete related items (e.g., all demo projects in skillos_mini) in one batch
   - Example order for portfolio pruning:
     1. Demo project directories (no other code depends on them)
     2. Deprecated subsystem cartridges (cooking, learn, demo)
     3. Experimental runners (compactor.py, run_aorta_gemma.py)
     4. Backward-compat redirect stubs (system/agents/, system/tools/)
     5. Deprecated runtime files (agent_runtime.py)
   - After each batch: commit with message `Prune [category]: [item names]`

5. **Reference Cleanup** (Critical — resolves dangling references)
   - Update imports in production code (change `from agents.something import X` to `from skills.orchestration.something import X`)
   - Update documentation: fix URLs, remove references to deleted paths, update command examples
   - Update test files: change mocks, remove deprecated test cases, update fixtures
   - Update setup scripts: remove deleted directory references, update initialization paths
   - Update configuration files: remove deleted module entries from sources.list, packages.lock, etc.

6. **Doc Synchronization**
   - Update README.md: remove deprecated command examples, add context about why deletions occurred
   - Update CLAUDE.md: if system design changed, document the new structure
   - Update internal documentation (QWEN.md, architecture diagrams): remove references to deleted components
   - Create DELETION_SUMMARY.md explaining what was removed and why (for future archaeological investigation)

7. **Test Suite Validation**
   - Run full test suite again: `npm test`, `cargo test`, `pytest`
   - All tests must PASS (same baseline + no new failures)
   - If tests reference deleted code:
     - Delete or update the test if it's testing deleted functionality
     - OR add mocks/stubs if the test is valid but the code implementation changed

8. **Setup Script Audit**
   - Review all setup scripts (setup_agents.sh, setup_agents.ps1, build_scene.py, bootstrap.sh)
   - Remove references to deleted directories/files
   - Verify scripts execute cleanly on fresh environment
   - Test: `bash setup_agents.sh` and `powershell setup_agents.ps1` (on respective platforms)

9. **Verify Deletion Scope Completeness**
   - Diff against original target list from Step 1
   - Confirm estimated size reduction matches: `du -sh [deleted_paths]` summed
   - Commit with message documenting total reduction (e.g., "Prune portfolio: 2.5 MB across 40+ files")

10. **Cross-Project Smoke Test**
    - If multiple repos affected (skillos, skillos_mini, RoClaw, llm_os):
      - Boot RoClaw (verify navigation still works)
      - Boot skillos (verify skill tree loads)
      - Deploy skillos_mini (verify no import errors)
      - Run `npm run sim:3d` (verify bridge and sim still work)
    - If any integration breaks, identify the cascade and revert or fix

## Negative Constraints

- **Never skip pre-deletion reference scanning** — dangling references hide bugs and obscure debugging
- **Never delete entire directories without cataloging their contents first** — you may miss nested files you wanted to keep
- **Never combine feature additions with pruning** — each operation should be in its own commit for clarity and revertibility
- **Never delete test files for functionality you've deleted without confirming no other code uses those tests** — tests are documentation
- **Never assume setup scripts don't reference deleted code** — infrastructure often lags architecture changes
- **Never update documentation as a last step** — doc updates should be part of the pruning commit so readers see the current state

## Notes

**Portfolio Pruning Execution (2026-04-26):**
- Successfully deleted 8 items from skillos (agent_runtime.py, deprecated stubs, demo projects)
- Successfully deleted 15 items from skillos_mini (off-pivot cartridges, experimental runners, demo projects)
- Estimated reduction: ~2.5 MB across 40+ files/directories
- **Incomplete: 60+ dangling doc references remain** (QWEN.md, README.md, test files, setup scripts)
  - Root cause: pre-deletion scan found references but cleanup was deferred
  - Learning: must make reference cleanup synchronous with deletions, not a separate follow-up pass
  - Recommendation: batch deletions and reference updates in single session per file/directory

**Key Insight:**
The most common failure mode in code pruning is leaving dangling references that create phantom problems during future maintenance (e.g., updating a deleted module, debugging a test that references missing code, confusion in documentation). The pre-deletion scan is the most critical step and often skipped because it's tedious. Making it automatic (grep across repo, diff against deletions) prevents surprises. Pairing each deletion with synchronous reference cleanup in the same session prevents reference debt from accumulating.

**Dependency Ordering Example:**
When pruning skillos_mini, the correct order was:
1. Demo projects (highest-level, no internal dependents)
2. Cartridges like cooking/ (used by demo projects, mid-level)
3. Experimental runners like compactor.py (low-level utilities)
4. setup.py references to deleted cartridges (configuration)

Reverse order (deleting compactor.py first) would require updating cartridge code before discovering those cartridges were themselves deleted.
