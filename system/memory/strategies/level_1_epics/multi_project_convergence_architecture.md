---
id: strat_1_multi_project_convergence_architecture
version: 1
hierarchy_level: 1
title: Multi-Project Convergence via Layer-Cake Architecture
trigger_goals: ["portfolio convergence", "multi-project architecture", "layer cake", "eliminate redundancy", "strategic integration"]
preconditions:
  - "4+ projects exist with overlapping capabilities (skillos, skillos_mini, RoClaw, llm_os)"
  - "Projects have diverged on interface standards, trace formats, and ISA definitions"
  - "Leadership has endorsed convergence as strategic priority"
confidence: 0.75
success_count: 1
failure_count: 0
source_traces: ["2026-04-26_strategic_analysis_trace"]
deprecated: false
---

# Multi-Project Convergence via Layer-Cake Architecture

## Executive Summary

The portfolio convergence strategy organizes four projects into a vertical layer-cake stack, each serving a distinct architectural purpose, with a canonical **cartridge kernel** as the universal interface standard.

## The Layer Cake (Product → Platform → Infrastructure → I/O)

```
┌─────────────────────────────────────────┐
│  Layer 0: Product (skillos_mini)       │
│  Trade-app UI (Android, M1 validation) │
│  Who: End-user oficios (electricista,  │
│  plomero, pintor)                      │
└─────────────────────────────────────────┘
                    ↓ (consumes cartridges)
┌─────────────────────────────────────────┐
│  Layer 1: Platform (skillos)            │
│  Pure Markdown OS, agents, skills tree  │
│  Who: App developers, skill creators    │
└─────────────────────────────────────────┘
                    ↓ (invokes cartridges via HTTP)
┌─────────────────────────────────────────┐
│  Layer 2: Infrastructure (llm_os)       │
│  Rust runtime, ISA, grammar swap,       │
│  cartridge execution, fine-tuning       │
│  Who: Platform engineers, kernel devs   │
└─────────────────────────────────────────┘
                    ↓ (dispatches opcodes)
┌─────────────────────────────────────────┐
│  Layer 3: I/O Device (RoClaw)           │
│  Robot hardware, VLM inference,         │
│  motor control, scene analysis          │
│  Who: Roboticists, motor engineers      │
└─────────────────────────────────────────┘
```

## The Cartridge Kernel

**Definition:** A cartridge is the canonical unit of software across all layers. It has three invariant components:

### 1. Manifest
```json
{
  "name": "domain/cartridge_name",
  "version": "1.0.0",
  "description": "...",
  "input_schema": { /* JSON Schema */ },
  "output_schema": { /* JSON Schema */ },
  "isa_requirement": "llm_os_canonical_v1",
  "handler": "path/to/handler.gbnf"
}
```

### 2. Schemas (Input/Output)
JSON Schema definitions with strict type validation. Each cartridge declares its contract explicitly.

### 3. Dialect (Grammar)
A `.gbnf` file defining the legal token sequences and opcode outputs the cartridge can produce. Integrates with the llm_os grammar-swap system.

### 4. Handler
The executable logic: GBNF rules (llm_os), markdown spec (skillos), TypeScript (RoClaw bridge), or Rust (llm_os runtime).

## The Convergence Roadmap

### Priority Tier 1 (Unblock Flywheel)
1. **llm_os grammar swap** → enables 8 Hz on Pi 5, unblocks all cartridges
2. **llm_os ISA-aware compactor** → prevents state corruption across cartridge boundaries
3. **Cartridge manifest standardization** → canonical schema across all projects

### Priority Tier 2 (Validate Product)
4. **skillos_mini M1 validation** → interview 5+ target users (oficios), validate product-market fit
5. **skillos ↔ skillos_mini bridge** → skillos_mini consumes cartridges published by skillos

### Priority Tier 3 (Enable Learning)
6. **Trace format standardization** → YAML frontmatter + markdown body + Level field across RoClaw, skillos, llm_os
7. **Dream ↔ llm_os integration** → skillos dream consolidation writes cartridges to llm_os, fine-tunes kernel

### Priority Tier 4 (Scale)
8. **Cartridge registry** → npm-like package manager for cartridges across projects
9. **Cross-project dream sharing** → traces from skillos_mini inform RoClaw strategies, etc.

## The Flywheel Loop

```
Real execution (RoClaw)
      ↓ (writes traces with unified format)
Trace logs (RoClaw/system/memory/traces/)
      ↓ (read by skillos dream consolidation)
Dream consolidation (skillos)
      ↓ (learns patterns, extracts strategies)
Strategy promotion (skillos → cartridge)
      ↓ (cartridge uploaded to llm_os)
Kernel fine-tune (llm_os)
      ↓ (improved kernel compiled as cartridge dialect)
Better execution (RoClaw next attempt)
```

## Anti-Patterns to Eliminate

| Anti-Pattern | Impact | Action |
|---|---|---|
| **Dead Code** | Cognitive load, testing burden | Prune agent_runtime.py, off-pivot cartridges |
| **Dual ISAs** | Cross-project strategy failure | Converge RoClaw 14-op ISA → llm_os canonical 13 ops |
| **Incompatible Traces** | Blocks dream learning | Standardize: Level field, YAML frontmatter, hierarchy |
| **Over-Engineered Modes** | State corruption risk | Reduce llm_os modes from 4 → 2 |
| **Premature Features** | Wasted engineering | Validate skillos_mini M1 before M2 features |

## Success Metrics

- **Grammar swap deployment:** 8 Hz achieved on Pi 5 (target: 2026-05-15)
- **M1 validation:** 5+ interviews completed, product-market fit confirmed (target: 2026-05-01)
- **Trace standardization:** 100% of new traces conform to unified schema (target: 2026-04-30)
- **Flywheel first loop:** Dream consolidation writes and deploys 1 cartridge to llm_os (target: 2026-06-01)

## Negative Constraints Applied

- Constraint 22: Do not build M2+ features before M1 validation
- Constraint 23: Prune dead code immediately
- Constraint 24: ISA convergence is mandatory for cross-project learning
- Constraint 25: Trace format must be standardized
- Constraint 26: Reduce compilation modes to 2

## Notes

This strategy represents a **L1 Epic** level decision that reshapes the entire portfolio architecture. It was synthesized from the strategic portfolio analysis executed 2026-04-26 and should be reviewed quarterly as the projects evolve.

The layer-cake pattern is inspired by Elon Musk's "Make the machine that makes the machine" principle — each layer serves a distinct stakeholder and builds on the one below, creating a coherent, scalable stack.
