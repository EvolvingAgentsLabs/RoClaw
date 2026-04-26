---
id: strat_3_canonical_isa_convergence
version: 1
hierarchy_level: 3
title: Converge to Canonical ISA for Cross-Project Motor Control
trigger_goals: ["ISA standardization", "eliminate opcode redundancy", "unified motor interface", "cartridge kernel", "cross-project hardware"]
preconditions:
  - "RoClaw uses 14 motor opcodes (move_forward, rotate_cw, rotate_ccw, turn_left, turn_right, etc.)"
  - "llm_os uses 13 opcodes (MOVE, ROTATE with direction, SENSE, DECIDE, etc.)"
  - "Projects cannot share cartridges due to opcode mismatch"
  - "Dream consolidation cannot transfer motor strategies across projects"
confidence: 0.68
success_count: 1
failure_count: 0
source_traces: ["2026-04-26_strategic_analysis_trace"]
deprecated: false
---

# Canonical ISA Convergence for Motor Control

## Problem Analysis

Currently, RoClaw and llm_os define motor control opcodes incompatibly:

### RoClaw Motor Tools (14 Operations)
```
1. move_forward(speed_l, speed_r)
2. rotate_cw(degrees, speed)
3. rotate_ccw(degrees, speed)
4. turn_left(speed_l, speed_r)
5. turn_right(speed_l, speed_r)
6. move_backward(speed)
7. stop()
8. set_motor_power(left, right)
9. calibrate()
10. sensor_read()
11. light_on()
12. light_off()
13. beep()
14. [reserved]
```

### llm_os ISA (13 Operations)
```
0x00 - MOVE: direction + speed
0x01 - ROTATE: angle + speed + clockwise(bool)
0x02 - SENSE: sensor_type + timeout
0x03 - DECIDE: condition + next_opcode_index
0x04 - CALIBRATE: subsystem
0x05 - CONFIG: setting + value
0x06 - STATUS: query_type
0x07 - STOP
... (8-13 reserved for cartridge-specific opcodes)
```

### The Incompatibility Problem

When dream consolidation learns a strategy from RoClaw:
```
RoClaw trace: "MOVE_FORWARD(180), ROTATE_CW(45), MOVE_FORWARD(100)"
↓ (exported to cartridge)
Cartridge manifest requires: "llm_os_canonical_v1"
↓ (kernel tries to execute)
ERROR: "MOVE_FORWARD" not in ISA opcode table
```

Result: **Cartridge is unexecutable on llm_os, strategy cannot transfer.**

## Unified Canonical ISA Design

The canonical ISA must be a **superset** of both projects' needs, with normalized opcode naming:

```
CANONICAL_V1 Opcode Set (16 total, 0-15):

[Motor Control] (0-6)
0x00 - MOVE: (direction: L|R|F|B, speed: u8, distance_estimate: u16?)
0x01 - ROTATE: (degrees: i16, speed: u8, clockwise: bool)
0x02 - TURN: (left_speed: u8, right_speed: u8, duration_ms: u16?)
0x03 - STOP: ()

[Sensing] (4-5)
0x04 - SENSE: (sensor_type: u8, timeout_ms: u16)
0x05 - DETECT: (query_type: u8, threshold: u8?)

[System] (6-11)
0x06 - CALIBRATE: (subsystem: u8)
0x07 - CONFIG: (setting: u8, value: u16)
0x08 - WAIT: (duration_ms: u16)
0x09 - BRANCH: (condition_id: u8, jump_offset: i8)
0x0A - EMIT_LOG: (msg_id: u8)
0x0B - STATUS: (query_type: u8)

[Cartridge Extension] (12-15)
0x0C - 0x0F - Cartridge-specific (defined by manifest)
```

## Mapping Old Opcodes to Canonical

### RoClaw Motor Tool → Canonical ISA

| RoClaw Tool | Canonical Encoding |
|---|---|
| `move_forward(speed)` | `0x00 0xFF 00 80 [speed] [00 00]` (direction=F) |
| `move_backward(speed)` | `0x00 0xFF 00 80 [speed] [00 00]` (direction=B) |
| `rotate_cw(degrees, speed)` | `0x01 [deg_hi] [deg_lo] [speed] 0x01` (clockwise=true) |
| `rotate_ccw(degrees, speed)` | `0x01 [deg_hi] [deg_lo] [speed] 0x00` (clockwise=false) |
| `turn_left(speed_l, speed_r)` | `0x02 [speed_l] [speed_r]` |
| `turn_right(speed_l, speed_r)` | `0x02 [speed_r] [speed_l]` (reversed) |
| `stop()` | `0x03` |
| `sensor_read()` | `0x04 [sensor_type]` |

### llm_os ISA → Canonical ISA

| llm_os Opcode | Canonical Mapping |
|---|---|
| `0x00 MOVE` | Maps directly to `0x00` (MOVE) |
| `0x01 ROTATE` | Maps directly to `0x01` (ROTATE) |
| `0x02 SENSE` | Maps to `0x04` (SENSE) |
| `0x03 DECIDE` | Maps to `0x09` (BRANCH) with condition encoding |
| Others | Trivial mapping |

## Implementation Strategy

### Phase 1: Publish Canonical ISA (2026-04-27)
1. Write `canonical_isa_v1.gbnf` in llm_os/grammar/
2. Create encoding/decoding library: llm_os/isa/canonical.rs
3. Document all 16 opcodes with formal semantics
4. Create opcode test suite (100+ test cases)

### Phase 2: Implement Adapters (2026-04-28)
1. RoClaw bridge adapter: RoClaw tool calls → Canonical ISA bytecode
2. llm_os bytecode compiler: Canonical ISA → grammar rules
3. Reverse adapters: Canonical ISA → RoClaw tool calls (for simulation)

### Phase 3: Migrate RoClaw Traces (2026-04-29)
1. Re-write all RoClaw motor traces using canonical opcodes
2. Example: `move_forward(180)` → `0x00 FF 00 B4 00 00`
3. Validate that re-encoded traces execute identically

### Phase 4: Cartridge Promotion (2026-04-30)
1. Dream consolidation learns RoClaw motor strategy
2. Exports as cartridge with canonical ISA requirement
3. Cartridge executes on llm_os kernel simulator
4. Compare llm_os output with original RoClaw trace

### Phase 5: Fine-Tuning Integration (2026-05-05)
1. Feed canonical-encoded traces to llm_os fine-tuning
2. Train kernel to emit canonical opcodes natively
3. Validate 1 cartridge on llm_os hardware (if available)

## Backwards Compatibility

RoClaw hardware MUST continue working. The adapter maintains 100% compatibility:

```
RoClaw Application
    ↓ (calls move_forward, rotate_cw, etc.)
Bridge Adapter (roclaw_bridge.py)
    ↓ (translates to canonical ISA)
Canonical ISA Encoder
    ↓ (emits 0x00 FF 00 B4 00 00)
Motor Control
    ↓ (RoClaw motor still receives move_forward call)
RoClaw Hardware
```

The bridge adapter **intercepts** RoClaw tool calls and translates them before forwarding to motors. From hardware perspective, nothing changes.

## Opcode Semantics (Formal)

Each opcode has a formal specification:

```
Opcode: 0x00 MOVE
Mnemonic: MOVE direction speed [distance_estimate]
Binary Encoding: [0x00] [direction:u8] [speed:u8] [distance_hi:u8] [distance_lo:u8]
Semantics:
  - direction in {F=0xFF, B=0x00, L=0x80, R=0x7F} (forward, backward, left, right)
  - speed in [0, 255] (0=stop, 255=full power)
  - distance_estimate in [0, 65535] cm (0=unknown duration)
  - Execute motor control with given parameters
  - Return when distance reached OR timeout (5s default)
Side Effects:
  - Motor state updated
  - Odometry updated (spatial position delta)
  - Optionally: logs written if EMIT_LOG follows
State Isolation:
  - No modification to kernel state
  - Motor context reset after opcode completes
Failure Modes:
  - MOTOR_TIMEOUT: distance not reached within timeout
  - MOTOR_STALLED: no motor response (detect via odometry)
  - MOTOR_OVERHEAT: thermal throttle (rare)
Example Trace:
  [0x00 0xFF 0xB4 0x00 0x64] → move forward at speed 180 for ~100cm estimate
```

## Testing Strategy

1. **Unit Tests:** Each opcode executes in isolation on llm_os simulator
2. **Integration Tests:** Full motor control sequences (4-6 opcodes)
3. **Fidelity Tests:** RoClaw real hardware vs canonical ISA simulation (same output?)
4. **Cartridge Tests:** Dream-derived cartridges execute on both RoClaw (via adapter) and llm_os

## Negative Constraints Applied

- Constraint 24: Canonical ISA is the solution to opcode mismatch
- Constraint 27: ISA-aware compactor depends on canonical ISA existing first
- Constraint 28: Motor cartridge standardization enables fine-tuning integration

## Success Criteria

- Canonical ISA specification document published (target: 2026-04-27)
- All RoClaw traces re-encoded in canonical opcodes (target: 2026-04-29)
- First motor strategy cartridge executes on llm_os simulator (target: 2026-04-30)
- RoClaw hardware still works post-adapter implementation (target: 2026-04-28)
- Cross-project motor learning demonstrated (1 trace from RoClaw → strategy → cartridge → llm_os execution) (target: 2026-05-05)

## Design Principles

1. **Minimalism:** 16 opcodes sufficient for all motor control, sensing, system operations
2. **Extensibility:** Cartridge-specific opcodes (0x0C-0x0F) allow domain specialization
3. **Efficiency:** Bytecode compact (3-5 bytes per opcode), fits in 64KB ISA ROM
4. **Clarity:** Formal semantics, no ambiguity in encoding/decoding
5. **Compatibility:** RoClaw tools map 1:1 to canonical ISA, no behavior loss

## Notes

The canonical ISA is the **heart of the cartridge kernel**. It's the foundation that enables:
- Dream consolidation to write executable cartridges
- llm_os fine-tuning to improve motor control
- skillos agents to reason about hardware constraints
- RoClaw strategies to transfer to llm_os and other robots

Without this convergence, cross-project learning is impossible. With it, the entire portfolio becomes a unified training dataset for improving hardware autonomy.
