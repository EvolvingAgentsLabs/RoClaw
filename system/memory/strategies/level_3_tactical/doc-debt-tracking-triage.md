---
id: strat_3_doc-debt-tracking-triage
version: 1
hierarchy_level: 3
title: Documentation Debt Tracking and Triage
trigger_goals: ["validation", "doc debt", "dangling references", "technical debt", "cleanup priority", "portfolio execution"]
preconditions: ["Files or APIs have been deleted from the codebase", "Documentation audit has identified dangling references", "A deleted_artifacts.md manifest exists documenting what was removed"]
confidence: 0.60
success_count: 1
failure_count: 0
source_traces: ["2026-04-26_execution_trace (CUT operations identified 60+ dangling doc references)"]
deprecated: false
---

# Documentation Debt Tracking and Triage

## Purpose
After code deletion, documentation often contains stale references. Track this debt systematically and prioritize cleanup based on impact (broken tutorials > broken workflows > stale comments) and effort.

## Steps

1. **Create deleted_artifacts.md manifest** (one per project)
   - Add to: `system/memory/deleted_artifacts.md` (or project root for consistency)
   - Document format:
   ```markdown
   ## Deletion: [date]
   ### Artifacts Removed
   - [file/function/module name]
   - Pattern to search for: [regex or exact string]
   - Reason: [why deleted]
   - Risk level: high|medium|low (based on likely reference frequency)

   ### Known Dangling References
   - [path/to/file.md]: line [N], type: [example|tool|command|comment], severity: [critical|high|medium|low]
   ```
   - Example entry:
   ```markdown
   ## Deletion: 2026-04-26
   ### Artifacts Removed
   - agent_runtime.py (deprecated Python runtime)
   - Pattern to search for: "agent_runtime.py"
   - Reason: Replaced by native SkillOS agent definitions
   - Risk level: high

   ### Known Dangling References
   - README.md: lines 42-48, type: command example, severity: high (users follow this)
   - setup_agents.sh: line 15, type: script path, severity: high (breaks onboarding)
   - QWEN.md: line 87, type: tool reference, severity: high (breaks API docs)
   ```

2. **Audit documentation and collect dangling references**
   - Scan all .md files: grep for deleted_artifacts patterns
   - Categorize by type:
     - **Command examples** (user-facing tutorials): CRITICAL priority
     - **Tool function examples** (API docs): HIGH priority
     - **Script references** (setup paths): HIGH priority
     - **Test file comments** (developer docs): MEDIUM priority
     - **Comment explanations** (codebase context): LOW priority
   - Categorize by severity:
     - **Critical**: Breaks user workflows or onboarding (requires immediate action)
     - **High**: Confuses developers or API consumers (should fix in next release)
     - **Medium**: Misleads but has workarounds (can batch into tech debt sprint)
     - **Low**: Stale but harmless (fix when refactoring nearby area)

3. **Quantify and triage**
   - Count dangling references by type and severity
   - Group by file to batch cleanup efforts
   - Create triage list with total effort estimate:
     - Example: "QWEN.md has 5 dangling :8420 references (5 min fix), README.md has 7 agent_runtime.py examples (15 min fix), 16 test comments in skillos_mini (varies by file)"
   - Identify quick wins (high-impact, low-effort fixes)

4. **Document in project memory**
   - Add entry to `memory/long_term/doc_debt_log.md`:
   ```markdown
   ## [Date]: Doc Debt from [Operation]
   **Total dangling references**: [N]
   **By priority**:
   - Critical: [N] ([effort estimate])
   - High: [N] ([effort estimate])
   - Medium: [N] ([effort estimate])
   - Low: [N] ([effort estimate])

   **Quick wins** (high-impact, <5min each):
   - [list]

   **Batch cleanup** (medium effort):
   - [list]

   **Deferred** (low priority):
   - [list]
   ```

5. **Schedule cleanup** in priority order
   - Schedule critical fixes immediately (same day if possible, else next planning cycle)
   - Schedule high fixes in next release sprint
   - Batch medium-priority fixes into tech debt weeks
   - Mark low-priority for "refactor when near that area"

6. **Create PRs for cleanup** with traceability
   - Link PR to deleted_artifacts.md entry
   - Reference dangling reference count and priority
   - Include before/after counts in PR summary
   - Track completion in doc_debt_log.md

## Negative Constraints
- Do not leave critical doc debt unfixed for more than 1 release cycle
- Do not treat command examples and comment drift equally -- command examples break user workflows
- Do not assume "someone will clean this up later" -- schedule it explicitly
- Do not delete files without creating a deleted_artifacts.md entry with cleanup TODO list

## Notes

**Portfolio Execution (2026-04-26) Triage Example**:
```
Total dangling references: 60+

CRITICAL (affects user workflows):
- 7 README.md command examples using agent_runtime.py (breaks tutorial)
- 5 QWEN.md tool function examples referencing :8420 (breaks API docs)
- Effort: 15 min fix + 5 min test

HIGH (confuses developers):
- setup_agents.sh references deleted system/agents/ directory (breaks onboarding)
- Effort: 5 min fix

MEDIUM (misleads but has workarounds):
- 16 skillos_mini test file comments referencing deleted cooking cartridge
- Effort: varies (10 min per file, 160 min total)

DEFERRED (stale context):
- Comments in deprecated code explaining old flow
- Effort: batch into refactor pass
```

**Metrics**:
- Time from deletion to critical debt fix: should be <24 hours
- Percentage of critical debt fixed in same cycle: target >90%
- High debt fixed in next cycle: target >100%
- Medium/low debt fixed in next tech debt sprint: track ongoing

This strategy ensures deletions don't leave broken documentation in the main branch for users to encounter.
