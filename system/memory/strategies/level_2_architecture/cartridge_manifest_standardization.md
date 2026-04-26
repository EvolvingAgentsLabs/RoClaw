---
id: strat_2_cartridge_manifest_standardization
version: 1
hierarchy_level: 2
title: Cartridge Manifest as Universal Interface Standard
trigger_goals: ["cartridge standardization", "interface design", "manifest schema", "cross-project cartridges", "package discovery"]
preconditions:
  - "Layer-cake architecture agreed upon (L1 strategy: multi_project_convergence)"
  - "Projects need a canonical unit of software exchange"
  - "Skill tree / cartridge discovery is a roadmap priority"
confidence: 0.70
success_count: 1
failure_count: 0
source_traces: ["2026-04-26_strategic_analysis_trace"]
deprecated: false
---

# Cartridge Manifest Standardization

## Purpose

The cartridge manifest (`manifest.json` or `manifest.yaml`) is the canonical declaration of a reusable software unit across all projects in the layer-cake architecture. It provides:

1. **Interface Contract:** Input/output schemas, ISA requirements
2. **Discoverability:** Package registry queries ("find cartridges for electrical diagnostics")
3. **Execution Safety:** Opcode dialect requirements, state isolation
4. **Version Management:** Semantic versioning, deprecation tracking

## Standard Cartridge Structure

Every cartridge, regardless of layer, follows this directory structure:

```
cartridges/domain/cartridge_name/
├── manifest.json           # Interface contract + metadata
├── schemas/
│   ├── input.json         # Input JSON schema
│   └── output.json        # Output JSON schema
├── handler.gbnf           # Execution rules (llm_os)
├── handler.md             # Skill spec (skillos)
├── handler.ts             # Bridge adapter (RoClaw)
├── tests/
│   └── cartridge_test.ts  # Execution tests
├── README.md              # Documentation
└── CHANGELOG.md           # Version history
```

## Manifest Schema (Canonical JSON)

```json
{
  "cartridge": {
    "name": "domain/cartridge_name",
    "version": "1.0.0",
    "author": "org/team",
    "description": "One-line purpose",
    "tier": "product|platform|infrastructure|io",
    "keywords": ["keyword1", "keyword2"],
    "input": {
      "schema": "input.json",
      "required_fields": ["field1", "field2"],
      "example": { /* input example */ }
    },
    "output": {
      "schema": "output.json",
      "fields": ["result", "confidence", "trace_id"],
      "example": { /* output example */ }
    },
    "execution": {
      "isa_requirement": "llm_os_canonical_v1",
      "opcode_set": ["MOVE", "ROTATE", "SENSE", "DECIDE"],
      "dialect": "handler.gbnf",
      "max_tokens_per_run": 1000,
      "timeout_ms": 5000,
      "state_isolation": "strict"
    },
    "dependencies": [
      { "cartridge": "domain/dependency", "version": ">=1.0.0" }
    ],
    "registry": {
      "published_to": ["llm_os_registry", "skillos_registry"],
      "download_url": "registry.evolvingagents.io/...",
      "checksum_sha256": "abc123..."
    }
  }
}
```

## Key Design Decisions

### 1. Strict Input/Output Schemas
Every cartridge declares JSON schemas for inputs and outputs. This enables:
- **Type checking** at cartridge boundary
- **Static analysis** of cartridge chains
- **Testing** without live execution
- **Composition** of cartridges (output of A → input of B)

### 2. ISA Requirements
Cartridges declare which ISA version they require (e.g., `llm_os_canonical_v1`). This prevents:
- **Opcode mismatches** (llm_os 13-op vs RoClaw 14-op confusion)
- **Silent failures** (cartridge compiled for wrong ISA)
- **Cross-project conflicts** (different projects using incompatible opcode sets)

### 3. State Isolation
Each cartridge runs with its own state context, isolated from:
- Other cartridges
- Previous cartridge executions
- Kernel state (read-only access)

This prevents **state corruption** — a critical issue identified in the strategic analysis.

### 4. Dialect Declaration
The `handler.gbnf` file is the cartridge's executable grammar. It declares:
- Legal token sequences
- Opcode generation rules
- Constraint satisfaction methods
- Integration with grammar-swap system

### 5. Dependency Management
Cartridges can depend on other cartridges. The manifest declares:
- Cartridge name and version range
- Required features
- Conflict constraints

This enables **cartridge composition** — building complex behaviors from simpler building blocks.

## Implementation Steps

### Phase 1: Canonicalize (2026-04-28)
1. Define `cartridge_manifest_schema.json` in llm_os/grammar/
2. Validate all existing cartridges against schema
3. Create migration tool for non-conforming cartridges

### Phase 2: Publish (2026-05-05)
1. Export cartridge manifests to registry (npm-style)
2. Create CLI tool: `cartridge install domain/name`
3. Create CLI tool: `cartridge package` (create new cartridge)

### Phase 3: Cross-Project Adoption (2026-05-15)
1. skillos skill-tree items become cartridges with manifest
2. RoClaw tool definitions become cartridges with manifest
3. Dream consolidation outputs cartridges with manifest

### Phase 4: Fine-Tuning Loop (2026-06-01)
1. Dream consolidation reads traces
2. Extracts strategies as cartridges
3. Publishes cartridges to registry
4. llm_os kernel incorporates via fine-tuning

## Relationship to Layer Cake

- **Layer 0 (skillos_mini):** Invokes cartridges via HTTP bridge
- **Layer 1 (skillos):** Publishes skill-derived cartridges; consumes domain cartridges
- **Layer 2 (llm_os):** Manages cartridge registry; compiles cartridges to ISA; fine-tunes kernel
- **Layer 3 (RoClaw):** Bridge translates cartridges to motor opcodes

## Negative Constraints Applied

- Constraint 24: ISA convergence via canonical cartridge ISA
- Constraint 25: Cartridge manifests enforce trace format convergence
- Constraint 26: Cartridge execution modes reduced to grammar-aware only

## Success Criteria

- All 6 existing llm_os cartridges have valid manifests (target: 2026-04-28)
- Cartridge registry CLI deployed (target: 2026-05-05)
- First skillos-to-llm_os cartridge published (target: 2026-05-15)
- First dream-to-cartridge promotion (target: 2026-06-01)

## Notes

The cartridge manifest is inspired by:
- **Docker image manifests** (reproducible, versioned, dependency management)
- **npm package.json** (registry integration, semantic versioning)
- **GBNF grammar specs** (executable, constraint-based)

It serves as the **Rosetta Stone** between projects — every component can be expressed as a cartridge with an explicit, machine-readable contract.
