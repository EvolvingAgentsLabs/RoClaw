# Bytecode Compiler & ISA

## The Problem with JSON

The LLMos V0 protocol sends JSON commands over UDP:

```json
{"cmd":"move_cm","left_cm":10,"right_cm":10,"speed":500}
```

This is 58 bytes. On an ESP32 running ArduinoJson, parsing takes ~15ms. It requires:
- String allocation
- Key-value traversal
- Type conversion
- Error handling for malformed JSON

For a robot that needs to react at 4+ FPS, 15ms of parsing overhead per command is unacceptable.

## The Bytecode Solution

RoClaw ISA v1 uses a 6-byte binary frame:

```
[0xAA] [OPCODE] [PARAM_L] [PARAM_R] [CHECKSUM] [0xFF]
```

The firmware reads 6 bytes into a struct with a single `memcpy`. Parse time: ~0.1ms. No ArduinoJson dependency. No string allocation. No heap fragmentation.

## Frame Structure

| Byte | Name | Description |
|------|------|-------------|
| 0 | START | Always `0xAA` — frame sync marker |
| 1 | OPCODE | Command identifier (see table below) |
| 2 | PARAM_L | Left parameter (0-255) |
| 3 | PARAM_R | Right parameter (0-255) |
| 4 | CHECKSUM | XOR of bytes 1-3 |
| 5 | END | Always `0xFF` — frame end marker |

## Checksum

RoClaw uses a fast XOR checksum for error detection. It is calculated exclusively on the instruction bytes (Opcode, Param_L, Param_R).

`CHECKSUM = (OPCODE ^ PARAM_L ^ PARAM_R) & 0xFF`

**Example: MOVE_FORWARD at speed 100/100**
- OPCODE: `0x01`
- PARAM_L: `0x64` (100 in decimal)
- PARAM_R: `0x64` (100 in decimal)

Calculation:
1. `0x01 ^ 0x64 = 0x65`
2. `0x65 ^ 0x64 = 0x01`

*(Note: Since Param_L and Param_R are identical, they cancel each other out in XOR).*

**Resulting Frame:** `AA 01 64 64 01 FF`

## Three Compilation Modes

The bytecode compiler supports three modes, tried in priority order:

### Mode 1: Grammar-Constrained (GBNF)

The VLM's output is constrained by a GBNF grammar that forces exactly 6 hex bytes:

```bnf
root ::= hex-byte " " hex-byte " " hex-byte " " hex-byte " " hex-byte " " hex-byte
hex-byte ::= hex-digit hex-digit
hex-digit ::= [0-9A-Fa-f]
```

This requires a serving framework that supports grammar-constrained decoding (llama.cpp, vLLM with guided generation).

### Mode 2: Few-Shot Prompting

The system prompt teaches Qwen-VL to output hex directly, with an explicit navigation strategy and rich examples:

```
OUTPUT FORMAT: Output ONLY a 6-byte hex command. Nothing else.

NAVIGATION STRATEGY:
- If the path ahead is clear and the goal is visible, MOVE FORWARD.
- If the path ahead is blocked (wall, obstacle, dark surface), ROTATE to scan.
- If you see the target object, turn toward it and approach.
- STOP only when you have arrived at the goal.

EXAMPLES:
- See clear path ahead → AA 01 80 80 01 FF
- Wall ahead, need to scan → AA 05 5A 80 DB FF
- See wall on left → AA 04 60 80 E4 FF
- Target visible on the right → AA 04 40 80 C4 FF
- Arrived at target → AA 07 00 00 07 FF
- Need to turn around → AA 05 B4 80 31 FF
```

The navigation strategy section is critical — without it, VLMs tend to output only MOVE_FORWARD regardless of what they see. The explicit instructions to ROTATE when blocked and STOP only on arrival produce diverse, situation-appropriate commands.

The compiler extracts hex bytes from anywhere in the response.

### Checksum Repair

VLMs reliably produce correct opcodes and parameters but frequently miscalculate the XOR checksum. The compiler auto-repairs these frames: if the start/end markers are correct (`0xAA`/`0xFF`) and the opcode is recognized, it recalculates the checksum rather than rejecting the frame. This significantly improves the grammar and few-shot compilation rates.

## STOP Holding Torque Mode

The STOP opcode (`0x07`) supports an optional holding torque mode via `PARAM_L`:

| PARAM_L | Behavior |
|---------|----------|
| `0x00` | Freewheel (default) — motor coils disabled to save power |
| `0x01` | Hold — motor coils stay energized to maintain position |

**Freewheel (default):** `AA 07 00 00 07 FF`
**Hold torque:** `AA 07 01 00 06 FF`

This is backward-compatible: existing STOP frames with `PARAM_L=0` behave identically to before.

### Mode 3: Host Fallback

If the VLM outputs text like `FORWARD 100 100`, the host compiles it to bytecode. This is the most reliable but least elegant mode.

## The Three Epochs

The bytecode protocol is part of a larger vision:

| Epoch | Protocol | Parsing | Where |
|-------|----------|---------|-------|
| 1 | JSON over UDP | ArduinoJson (~15ms) | ESP32 |
| 2 | 6-byte bytecode | `memcpy` (~0.1ms) | ESP32 |
| 3 | Native Xtensa binary | Direct execution | ESP32 flash |

RoClaw ships at Epoch 2. Epoch 3 is aspirational — compiling LLM output directly to ESP32 machine code.
