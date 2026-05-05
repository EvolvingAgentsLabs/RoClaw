# Cartridge adapter

skillos_robot exposed as an llm_os-style cartridge over WebSocket. Lets an upstream OS (skillos_mini, llm_os browser demo) call into the robot's high-level capabilities — navigate, observe, describe, stop, set_speed — without knowing anything about UDP bytecode, the 20Hz reactive loop, or ESP32 firmware.

## Architecture

```
upstream OS (skillos_mini cartridge runner)
  │
  │  WebSocket (this folder)
  ▼
robot cartridge adapter (this folder)  ──→  planner / SemanticLoop / ReactiveController
                                              │
                                              │  6-byte UDP bytecode
                                              ▼
                                            ESP32-S3-CAM (motor + IMU + camera)
```

**Realtime stays onboard.** The 20Hz reactive loop, reflex guard, and ESP32 firmware are unchanged. The cartridge adapter is the *strategic-layer* surface — high-level intents come in, real-time execution remains where it has to be.

## Wire protocol

JSON over WebSocket. Default URL `ws://localhost:7424/cartridge` (configurable).

**Request** (caller → adapter):
```json
{
  "id": "req-abc",
  "type": "call",
  "cartridge": "robot",
  "method": "navigate",
  "args": { "goal": "the red cube", "timeout_s": 60, "policy": "safe" }
}
```

**Progress event** (adapter → caller, optional, multiple per request):
```json
{ "id": "req-abc", "type": "progress", "data": { "phase": "executing", "steps": 3 } }
```

**Result** (adapter → caller, exactly one per request):
```json
{ "id": "req-abc", "type": "result", "ok": true, "result": { "distance_m": 1.2 } }
```
or
```json
{ "id": "req-abc", "type": "result", "ok": false, "error": { "code": "TIMEOUT", "message": "navigate exceeded 60s" } }
```

Full type definitions in [`protocol.ts`](protocol.ts).

## Running the adapter

```bash
# from skillos_robot (a.k.a. RoClaw) repo root
npx tsx src/cartridge/cli.ts             # default port 7424
npx tsx src/cartridge/cli.ts --port 8000 # custom port
```

The adapter logs `client connected` / `client disconnected` and the status of each request as it flows through.

## Methods

| Method | Status | Behavior |
|---|---|---|
| `navigate({goal, timeout_s, policy})` | wired (planning) | Calls `HierarchicalPlanner.planGoal()`. Returns the multi-step plan. **Plan execution is integrator-managed** (see method header in [`methods.ts`](methods.ts)). |
| `observe({})` | wired | Returns `SceneGraph.toJSON()` — robot pose plus tracked objects with bboxes, confidences, last-seen timestamps. |
| `describe({})` | wired | Returns the most recent VLM textual description cached by the semantic loop, plus age in ms. |
| `stop({})` | wired | Emits STOP (opcode 0x07) directly via UDP. ESP32 firmware safety layer halts motors within one tick (~50ms). |
| `set_speed({max: slow\|normal\|fast})` | wired | Calls `ReactiveController.setSpeedTier()`. Effective on next tick. |

All five method bodies are real (not stubs). Each consults [`state.ts`](state.ts) for its required subsystem; if the integrator has not registered it, the method returns `HARDWARE_UNAVAILABLE` with a clear error message naming the missing slot.

## Cartridge manifest

[`manifest.json`](manifest.json) declares the cartridge in **llm_os kernel format** — same shape the kernel's [`Cartridge`](https://github.com/EvolvingAgentsLabs/llm_os/blob/main/kernel/cartridge.js) class consumes. This means an llm_os browser demo can mount the robot as a remote cartridge: build the trie from `manifest.json`, generate `<|call|>robot.navigate {...}<|/call|>` opcodes, and the result of each call is whatever this WebSocket adapter returns. No code translation needed at the manifest layer.

## Two ISAs, no conflict

skillos_robot has its own ISA — the 6-byte UDP bytecode for stepper-motor commands ([`bytecode_compiler.ts`](../control/bytecode_compiler.ts)). llm_os has its own ISA — the 14-opcode LLM-token grammar. They sit at different abstractions:

- llm_os ISA: **syscall layer** (LLM emits `<|call|>robot.navigate {...}<|/call|>`)
- robot ISA: **device-driver layer** (motor wire format on UDP)

The cartridge adapter is the bridge. An upstream OS emits a syscall; the adapter dispatches to the planner; the planner produces motor primitives; the reactive loop emits bytecode. Nothing competes.

## Integration: how to register live subsystems

Methods read live state from [`state.ts`](state.ts). The integrator (whoever starts the robot's main reactive/perception loops) must populate it:

```ts
import { setRobotState } from './cartridge/state';
import { startCartridgeAdapter } from './cartridge/adapter';
import { UDPTransmitter } from './bridge/udp_transmitter';
import { SceneGraph } from './brain/memory/scene_graph';
import { ReactiveController } from './control/reactive_controller';
import { HierarchicalPlanner } from './brain/planning/planner';

// 1. Construct subsystems (or reuse the ones your main loop already created).
const transmitter = new UDPTransmitter({ host: '192.168.1.100' });
await transmitter.connect();
const sceneGraph = new SceneGraph();
const reactiveController = new ReactiveController();
const planner = new HierarchicalPlanner(infer, memoryManager);

// 2. Register them so cartridge methods can find them.
setRobotState({ transmitter, sceneGraph, reactiveController, planner });

// 3. (Per perception cycle) refresh the cached scene description.
setRobotState({ lastDescription: { text: vlmResult, timestamp: Date.now() } });

// 4. Start the cartridge adapter.
startCartridgeAdapter({ port: 7424 });
```

The CLI ([`cli.ts`](cli.ts)) wires only the UDPTransmitter (via `--robot-host`) — sufficient for testing `stop` end-to-end. To wire the other methods, embed the adapter in your main process and call `setRobotState()` with live instances.

## Plan execution is the integrator's responsibility

`navigate` returns a `HierarchicalPlanner` plan. It does NOT drive the reactive loop to execute that plan. Coupling cartridge calls to plan completion would require fundamental refactors of the reactive loop's lifecycle (today it owns its own goal source and runs at 20Hz independently); the cartridge contract is "give me a plan", not "finish driving."

The recommended integration pattern: feed `plan.steps` into the reactive loop's goal queue, emit progress via the adapter's WebSocket channel, and resolve a separate `await_done` cartridge call when execution completes — or use a different mechanism that fits your runtime. The `result.execution: 'integrator_responsibility'` field signals this explicitly.

## Smoke test

Trivial Node/Browser client that calls each method and prints results:

```js
const ws = new WebSocket('ws://localhost:7424/cartridge');
ws.onmessage = (e) => console.log(JSON.parse(e.data));
ws.onopen = () => {
  ws.send(JSON.stringify({
    id: 'test-1', type: 'call', cartridge: 'robot',
    method: 'observe', args: {},
  }));
};
// expect: { id: 'test-1', type: 'result', ok: false,
//           error: { code: 'NOT_IMPLEMENTED', message: '...' } }
```

That round-trip exercises the protocol; replace with a real implementation in `methods.ts` once the underlying subsystem is ready.
