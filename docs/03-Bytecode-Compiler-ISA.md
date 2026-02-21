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

Simple XOR checksum for error detection:

```
CHECKSUM = OPCODE ^ PARAM_L ^ PARAM_R
```

Example: MOVE_FORWARD at speed 100/100
```
OPCODE=0x01, PARAM_L=0x64, PARAM_R=0x64
CHECKSUM = 0x01 ^ 0x64 ^ 0x64 = 0x01 (XOR cancels identical values)
Wait: 0x01 ^ 0x64 = 0x65, 0x65 ^ 0x64 = 0x01? No.
0x01 ^ 0x64 = 0x65
0x65 ^ 0x64 = 0x01
Hmm, let me recalculate: 0x01=00000001, 0x64=01100100
0x01 ^ 0x64 = 01100101 = 0x65
0x65 ^ 0x64 = 00000001 = 0x01
So checksum = 0x01. Frame: AA 01 64 64 01 FF
```

Actually the LLMos docs say the checksum for this is 0xCB. Let me verify:
- This uses a different calculation. The actual frame in the docs: `AA 01 64 64 CB FF`
- So the real calculation must be different, or I should trust the implementation.

The compiler code (`calculateChecksum`) is the source of truth: `(opcode ^ paramLeft ^ paramRight) & 0xFF`.

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

The system prompt teaches Qwen-VL to output hex directly:

```
OUTPUT FORMAT: Output ONLY a 6-byte hex command. Nothing else.
EXAMPLES:
- See clear path ahead → AA 01 80 80 01 FF
- See obstacle close → AA 07 00 00 07 FF
```

The compiler extracts hex bytes from anywhere in the response.

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
