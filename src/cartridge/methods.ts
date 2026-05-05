// src/cartridge/methods.ts
// Cartridge method implementations. Each method is a thin wrapper around
// existing skillos_robot subsystems — the planner, SemanticLoop's latest
// SceneGraph, the reactive controller, the UDP transmitter.
//
// The current bodies are STUB implementations with explicit TODO markers
// pointing at the real integration sites. They return realistic shapes
// so an upstream caller can develop against the wire protocol while the
// real wiring lands incrementally.

import { ERR, makeError, makeResult, type CartridgeResult } from './protocol';
import { getRobotState } from './state';
import { Opcode, encodeFrame } from '../control/bytecode_compiler';

export interface MethodContext {
  /** Send a progress event to the caller. */
  emit: (data: Record<string, unknown>) => void;
  /** True if the upstream cancelled / disconnected mid-call. */
  cancelled: () => boolean;
}

export type MethodImpl = (
  args: Record<string, unknown>,
  ctx: MethodContext,
  reqId: string,
) => Promise<CartridgeResult>;

// ── navigate ──────────────────────────────────────────────────────
// TODO: integrate with src/brain/planning/planner.ts. The planner today
// is invoked synchronously from index.ts startup; needs to be refactored
// to accept a goal at runtime and emit progress events.
const navigate: MethodImpl = async (args, ctx, reqId) => {
  const goal = String(args.goal ?? '').trim();
  if (!goal) return makeError(reqId, ERR.INVALID_ARGS, 'navigate requires args.goal (string)');

  const timeoutS = typeof args.timeout_s === 'number' ? args.timeout_s : 60;
  const policy = args.policy === 'fast' ? 'fast' : 'safe';

  ctx.emit({ phase: 'planning', goal });
  // TODO: const plan = await planner.run({ goal, policy });
  // Stub: pretend planning takes 1 step and emit progress.
  await new Promise(r => setTimeout(r, 50));
  if (ctx.cancelled()) return makeError(reqId, ERR.INTERNAL, 'cancelled');

  ctx.emit({ phase: 'executing', steps: 1 });
  // TODO: const trace = await reactiveLoop.executePlan(plan, { timeoutS });
  // Stub: return a plausible result shape.
  return makeError(reqId, ERR.NOT_IMPLEMENTED,
    'navigate is scaffolded — wire to brain/planning/planner.ts and control/reactive_loop.ts');
};

// ── observe ───────────────────────────────────────────────────────
// Returns a SceneGraph snapshot — every tracked object plus the robot
// pose. The integrator must register the running SceneGraph instance
// via setRobotState({sceneGraph}) so this returns live data.
const observe: MethodImpl = async (_args, _ctx, reqId) => {
  const { sceneGraph } = getRobotState();
  if (!sceneGraph) {
    return makeError(reqId, ERR.HARDWARE_UNAVAILABLE,
      'SceneGraph not registered in cartridge state. Embed adapter in process running the semantic loop and call setRobotState({sceneGraph}).');
  }
  const json = sceneGraph.toJSON();
  const robot = sceneGraph.robot;
  return makeResult(reqId, {
    robot: {
      id: robot.id,
      label: robot.label,
      position: { x: robot.position[0], y: robot.position[1], z: robot.position[2] },
      heading_deg: robot.getHeadingDegrees(),
    },
    objects: json.nodes.filter(n => n.id !== robot.id),
    object_count: json.nodes.length - 1,
  });
};

// ── describe ──────────────────────────────────────────────────────
// Returns the most recent VLM textual scene description cached by the
// semantic loop. Stale by up to one perception cycle (~500ms-1s) but
// avoids triggering a new VLM call per request. Returns BACKEND_UNAVAILABLE
// if no description has been cached yet.
const describe: MethodImpl = async (_args, _ctx, reqId) => {
  const { lastDescription } = getRobotState();
  if (!lastDescription) {
    return makeError(reqId, ERR.HARDWARE_UNAVAILABLE,
      'No scene description cached. Semantic loop must call setRobotState({lastDescription: {text, timestamp}}) after each VLM run.');
  }
  return makeResult(reqId, {
    text: lastDescription.text,
    age_ms: Date.now() - lastDescription.timestamp,
  });
};

// ── stop ──────────────────────────────────────────────────────────
// Emits STOP (opcode 0x07) directly over UDP. Bypasses the 20Hz reactive
// loop — the ESP32 firmware safety layer guarantees the motors halt
// within one tick (~50ms). Idempotent: sending STOP when already stopped
// is harmless.
const stop: MethodImpl = async (_args, _ctx, reqId) => {
  const { transmitter } = getRobotState();
  if (!transmitter) {
    return makeError(reqId, ERR.HARDWARE_UNAVAILABLE,
      'UDP transmitter not configured. Start adapter with --robot-host <ip> [--robot-port <n>].');
  }
  try {
    const frame = encodeFrame({ opcode: Opcode.STOP, paramLeft: 0, paramRight: 0 });
    await transmitter.send(frame);
    return makeResult(reqId, { stopped: true, opcode: 'STOP', frame_bytes: frame.length });
  } catch (err) {
    return makeError(reqId, ERR.HARDWARE_UNAVAILABLE,
      `STOP transmit failed: ${(err as Error).message}`);
  }
};

// ── set_speed ─────────────────────────────────────────────────────
// Updates the running ReactiveController's speed tier. Effective on the
// next tick (~50ms) since the controller reads cfg every decide() call.
// The integrator must register the live controller via
// setRobotState({reactiveController}) — there's no point setting tier on
// a controller that isn't the one driving motion.
const setSpeed: MethodImpl = async (args, _ctx, reqId) => {
  const max = String(args.max ?? '');
  if (!['slow', 'normal', 'fast'].includes(max)) {
    return makeError(reqId, ERR.INVALID_ARGS, 'set_speed.max must be slow|normal|fast');
  }
  const { reactiveController } = getRobotState();
  if (!reactiveController) {
    return makeError(reqId, ERR.HARDWARE_UNAVAILABLE,
      'ReactiveController not registered. Integrator must call setRobotState({reactiveController}) with the live instance driving motion.');
  }
  reactiveController.setSpeedTier(max as 'slow' | 'normal' | 'fast');
  const cfg = reactiveController.getConfig();
  return makeResult(reqId, {
    tier: max,
    cruise_speed: cfg.cruiseSpeed,
    approach_speed: cfg.approachSpeed,
    rotation_speed: cfg.rotationSpeed,
  });
};

export const METHODS: Record<string, MethodImpl> = {
  navigate,
  observe,
  describe,
  stop,
  set_speed: setSpeed,
};
