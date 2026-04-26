---
id: strat_3_cross_project_trace_ingestion
version: 1
hierarchy_level: 3
title: Pattern for Ingesting Markdown Traces into DPO Pipeline
trigger_goals: ["trace ingestion", "markdown to JSON conversion", "DPO dataset", "cross-project learning", "trace format standardization", "training data preparation"]
preconditions: ["markdown trace files with YAML frontmatter exist", "target trace schema defined", "DPO pipeline format documented"]
confidence: 0.65
success_count: 1
failure_count: 0
source_traces: ["tr_20260426_execution_trace_develop_trace_pipeline", "dream_20260426_kernel_b2f8"]
deprecated: false
---

# Pattern for Ingesting Markdown Traces into DPO Pipeline

## Context

Execution traces are emitted in different formats across projects: RoClaw writes YAML frontmatter + markdown body, evolving-memory uses JSON, and early skillos traces used unstandardized field names. To enable cross-project dream consolidation and unified fine-tuning datasets, traces must be ingested into a standardized format (DPO pairs: good completion vs bad completion).

This pattern describes how to convert markdown-formatted traces to JSON-lined DPO training data without introducing external dependencies.

## Solution

Parse YAML frontmatter with regex (no pyyaml), extract trace metadata, convert to canonical schema, and merge with other trace sources.

## Steps

1. **Define target trace schema** (JSON):
   ```json
   {
     "trace_id": "tr_abc123",
     "timestamp": "2026-04-26T18:30:00Z",
     "goal": "navigate to kitchen",
     "source": "real_world",
     "fidelity": 1.0,
     "hierarchy_level": 2,
     "outcome": "success",
     "confidence": 0.85,
     "actions": ["move_forward 50", "rotate_cw 45", ...],
     "strategy_applied": "strat_3_corridor_navigation_v1",
     "duration_ms": 5000
   }
   ```

2. **Parse YAML frontmatter** (regex-based, no dependencies):
   ```python
   def _parse_yaml_frontmatter(content: str) -> Dict:
       # Match: ---\n key: value \n key: value \n---\n
       match = re.match(r'^---\n(.*?)\n---\n', content, re.DOTALL)
       if not match:
           return {}
       yaml_text = match.group(1)
       # Parse key:value pairs manually
       result = {}
       for line in yaml_text.split('\n'):
           if ':' in line:
               key, value = line.split(':', 1)
               result[key.strip()] = value.strip().strip('"\'')
       return result
   ```
   - Extract: `timestamp`, `goal`, `outcome`, `source`, `fidelity`, `hierarchy_level`, `confidence`
   - Set defaults for missing fields: `fidelity=0.6`, `confidence=0.5`

3. **Parse markdown body** to extract actions:
   - If trace follows a standard section pattern (e.g., `## Actions`):
     ```python
     def _extract_actions(markdown_body: str) -> List[str]:
         match = re.search(r'## Actions\n(.*?)(?=##|$)', markdown_body, re.DOTALL)
         if not match:
             return []
         lines = match.group(1).strip().split('\n')
         return [line.strip('- ').strip() for line in lines if line.strip().startswith('-')]
     ```
   - If no standard section, extract action-like text (heuristic: lines with verbs like `move_`, `rotate_`, `turn_`, `scan_`)

4. **Convert outcome to canonical enum**:
   - Map trace outcome field to: `success`, `partial`, `failure`, `unknown`, `aborted`
   - Case-insensitive mapping (handle "SUCCESS", "Success", "success")

5. **Convert to DPO pair format**:
   - For successful traces (outcome = success OR partial with confidence > 0.5):
     - Create pair: `(instruction=goal, chosen=actions, rejected=null)`
     - Mark as positive example
   - For failed traces (outcome = failure):
     - Create pair: `(instruction=goal, chosen=null, rejected=actions)`
     - Mark as negative example
   - For unknown/aborted: skip or create with low confidence weighting

6. **Load and merge** with existing JSONL traces:
   ```python
   def load_markdown_traces(pattern: str) -> List[Dict]:
       results = []
       for md_file in glob(pattern):
           with open(md_file) as f:
               content = f.read()
           frontmatter = _parse_yaml_frontmatter(content)
           body = content.split('---', 2)[2]  # skip YAML, get markdown body
           actions = _extract_actions(body)
           outcome = frontmatter.get('outcome', 'unknown')

           trace = {
               'trace_id': frontmatter.get('traceId', md_file),
               'timestamp': frontmatter.get('timestamp'),
               'goal': frontmatter.get('goal', ''),
               'source': frontmatter.get('source', 'unknown'),
               'fidelity': float(frontmatter.get('fidelity', 0.6)),
               'hierarchy_level': int(frontmatter.get('hierarchy_level', 3)),
               'outcome': outcome.lower(),
               'confidence': float(frontmatter.get('confidence', 0.5)),
               'actions': actions,
           }
           results.append(trace)
       return results

   def main():
       md_traces = load_markdown_traces('traces/**/*.md')
       jsonl_traces = load_jsonl_traces('traces/archive.jsonl')
       merged = md_traces + jsonl_traces
       # Deduplicate by trace_id
       merged = {t['trace_id']: t for t in merged}.values()
       # Convert to DPO format and save
       dpo_pairs = [to_dpo_pair(t) for t in merged]
       with open('dpo_training_data.jsonl', 'w') as f:
           for pair in dpo_pairs:
               f.write(json.dumps(pair) + '\n')
   ```

7. **Test coverage**:
   - Test 1: `parse_yaml_frontmatter_extracts_all_fields` — verify all expected fields are extracted
   - Test 2: `parse_yaml_frontmatter_handles_missing_fields` — verify defaults are applied
   - Test 3: `extract_actions_from_markdown_body` — verify action list is parsed correctly
   - Test 4: `md_trace_to_jsonl_converts_outcome` — verify outcome normalization
   - Test 5: `md_trace_to_dpo_pair_success_case` — verify DPO pair generation for successful trace
   - Test 6: `md_trace_to_dpo_pair_failure_case` — verify DPO pair generation for failed trace

## Negative Constraints

- Do not assume YAML parsing library is available — use regex instead, keep zero extra dependencies
- Do not skip field normalization (outcome enum, source enum, fidelity clamping) — downstream pipeline expects canonical values
- Do not mix different trace formats without explicit `source_format` field — this prevents you from debugging if an old format is accidentally included
- Do not assume all markdown bodies have standard section headers — add heuristic fallback parsing

## Notes

**Implemented in**: `scripts/promote_traces.py` (llm_os v0.5, 2026-04-26)
- `_parse_yaml_frontmatter()`: regex-based YAML extraction (no dependencies)
- `_md_trace_to_jsonl()`: converts markdown to DPO pair schema
- `load_markdown_traces()`: loads all `.md` files matching pattern
- `main()`: merges with JSONL, deduplicates, writes DPO dataset

**Use case**: RoClaw traces (YAML frontmatter + markdown) → llm_os fine-tuning dataset
- RoClaw simulator emits: `traces/sim3d/2026-04-26_execution.md`
- Dream consolidation calls `load_markdown_traces('traces/**/*.md')`
- Output: `dpo_training_data.jsonl` with 500+ positive examples
- DPO fine-tune recipe ingests this data into Unsloth LoRA

**Confidence basis**: Implemented and syntax-validated (Python checks), but not yet tested in production DPO pipeline. Confidence increases to 0.85 after first successful fine-tune cycle.
