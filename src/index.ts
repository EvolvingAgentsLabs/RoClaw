/**
 * RoClaw — Main Entry Point
 *
 * Boots the complete dual-brain system with multi-backend VLM inference:
 * 1. Load configuration from .env
 * 2. Initialize UDP transmitter (-> ESP32-S3 spinal cord)
 * 3. Initialize bytecode compiler (neural compiler)
 * 4. Initialize VLM inference (OpenRouter Qwen3-VL or Gemini Robotics)
 * 5. Initialize vision loop (-> ESP32-CAM eyes)
 * 6. Enable dual-loop: SemanticLoop (2 Hz VLM) + ReactiveLoop (20 Hz motors)
 * 7. Arm ReflexGuard (active collision veto before motor commands)
 * 8. Start Cartridge adapter (ws://localhost:7424/cartridge for llm_os)
 * 9. Connect to OpenClaw Gateway (cortex tool invocations)
 *
 * Backend selection:
 *   - OPENROUTER_API_KEY set -> OpenRouter + Qwen3-VL-8B (default)
 *   - GOOGLE_API_KEY set     -> Gemini Robotics (with --gemini flag or as fallback)
 */

import * as dotenv from 'dotenv';
import { logger } from './shared/logger';
import { BytecodeCompiler } from './control/bytecode_compiler';
import { UDPTransmitter } from './bridge/udp_transmitter';
import { VisionLoop } from './brain/perception/vision_loop';
import { GeminiRoboticsInference, createPerceptionInference } from './brain/inference/gemini_robotics';
import { CerebellumInference, createOpenRouterPerceptionInference } from './brain/inference/inference';
import { CortexNode } from './brain/planning/index';
import { SceneGraph } from './brain/memory/scene_graph';
import { ReactiveController } from './control/reactive_controller';
import { ReflexGuard, attachReflexGuard } from './control/reflex_guard';
import { HeartbeatKeepAlive } from './control/heartbeat';
import { HierarchicalPlanner } from './brain/planning/planner';
import { MemoryManager } from './brain/memory/memory_manager';
import { startCartridgeAdapter } from './cartridge/adapter';
import { setRobotState } from './cartridge/state';
import { TraceSource } from './llmunix-core/types';
import type { ToolContext } from './brain/planning/roclaw_tools';
import type { InferenceFunction } from './llmunix-core/interfaces';
import type { ArenaConfig } from './brain/perception/vision_projector';

// Load .env
dotenv.config();

// =============================================================================
// Configuration
// =============================================================================

const config = {
  // OpenClaw Gateway
  gatewayUrl: process.env.OPENCLAW_GATEWAY_URL || 'ws://localhost:8080',

  // ESP32 Hardware
  esp32Host: process.env.ESP32_S3_HOST || '192.168.1.100',
  esp32Port: parseInt(process.env.ESP32_S3_PORT || '4210', 10),
  cameraHost: process.env.ESP32_CAM_HOST || '192.168.1.101',
  cameraPort: parseInt(process.env.ESP32_CAM_PORT || '80', 10),
  cameraPath: process.env.ESP32_CAM_PATH || '/stream',

  // Vision Loop
  frameHistorySize: parseInt(process.env.FRAME_HISTORY_SIZE || '4', 10),

  // Arena (for VisionProjector / SceneGraph)
  arenaWidthCm: parseInt(process.env.ARENA_WIDTH_CM || '300', 10),
  arenaHeightCm: parseInt(process.env.ARENA_HEIGHT_CM || '200', 10),

  // Cartridge adapter
  cartridgePort: parseInt(process.env.CARTRIDGE_PORT || '7424', 10),

  // Inference backends
  googleApiKey: process.env.GOOGLE_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3-flash-preview',
  openRouterApiKey: process.env.OPENROUTER_API_KEY || '',
  qwenModel: process.env.QWEN_MODEL || 'qwen/qwen3-vl-8b-instruct',
};

// CLI flag: --gemini forces Gemini backend
const useGemini = process.argv.includes('--gemini');

// =============================================================================
// Boot
// =============================================================================

async function main(): Promise<void> {
  logger.info('RoClaw', '=== RoClaw — The Physical Embodiment for OpenClaw ===');

  // 1. Initialize bytecode compiler
  const compiler = new BytecodeCompiler('fewshot');
  logger.info('RoClaw', 'Bytecode compiler initialized (fewshot mode)');

  // 2. Initialize UDP transmitter
  const transmitter = new UDPTransmitter({
    host: config.esp32Host,
    port: config.esp32Port,
  });

  try {
    await transmitter.connect();
    logger.info('RoClaw', `UDP transmitter -> ${config.esp32Host}:${config.esp32Port}`);
  } catch (err) {
    logger.warn('RoClaw', 'UDP transmitter offline (ESP32 not connected)', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 3. Initialize VLM inference (motor control + planning)
  let infer: InferenceFunction;
  let perceptionInfer: InferenceFunction | undefined;
  let backendName: string;

  if (useGemini && config.googleApiKey) {
    // Gemini Robotics mode (explicit --gemini flag)
    const inference = new GeminiRoboticsInference({
      apiKey: config.googleApiKey,
      model: config.geminiModel,
      maxOutputTokens: 64,
      temperature: 0.1,
      timeoutMs: 10000,
      thinkingBudget: 0,
      useToolCalling: true,
    });
    infer = inference.createInferenceFunction();
    perceptionInfer = createPerceptionInference({
      apiKey: config.googleApiKey,
      model: config.geminiModel,
    });
    backendName = `Gemini Robotics (${config.geminiModel})`;
  } else if (config.openRouterApiKey) {
    // OpenRouter + Qwen3-VL (default)
    const inference = new CerebellumInference({
      apiKey: config.openRouterApiKey,
      model: config.qwenModel,
      maxTokens: 512,
      temperature: 0.1,
      timeoutMs: 15000,
    });
    infer = inference.createInferenceFunction();
    perceptionInfer = createOpenRouterPerceptionInference({
      apiKey: config.openRouterApiKey,
      model: config.qwenModel,
    });
    backendName = `OpenRouter (${config.qwenModel})`;
  } else if (config.googleApiKey) {
    // Gemini fallback (no OpenRouter key, but Google key available)
    const inference = new GeminiRoboticsInference({
      apiKey: config.googleApiKey,
      model: config.geminiModel,
      maxOutputTokens: 64,
      temperature: 0.1,
      timeoutMs: 10000,
      thinkingBudget: 0,
      useToolCalling: true,
    });
    infer = inference.createInferenceFunction();
    perceptionInfer = createPerceptionInference({
      apiKey: config.googleApiKey,
      model: config.geminiModel,
    });
    backendName = `Gemini Robotics (${config.geminiModel}) [fallback]`;
  } else {
    logger.error('RoClaw', 'No inference backend configured. Set OPENROUTER_API_KEY or GOOGLE_API_KEY in .env');
    process.exit(1);
  }

  logger.info('RoClaw', `Inference: ${backendName}`);

  // 4. Initialize vision loop (rolling video buffer for temporal/3D perception)
  const cameraUrl = `http://${config.cameraHost}:${config.cameraPort}${config.cameraPath}`;
  const visionLoop = new VisionLoop(
    { cameraUrl, targetFPS: 2, frameHistorySize: config.frameHistorySize },
    compiler,
    transmitter,
    infer,
  );
  logger.info('RoClaw', `Vision loop -> ${cameraUrl} (${config.frameHistorySize}-frame video buffer)`);

  // 5. SceneGraph + Dual-Loop + ReflexGuard
  const sceneGraph = new SceneGraph();
  const controller = new ReactiveController();
  const ARENA: ArenaConfig = {
    widthCm: config.arenaWidthCm,
    heightCm: config.arenaHeightCm,
  };

  // Arm ReflexGuard in active mode (collision veto before motor commands)
  const reflexGuard = new ReflexGuard(sceneGraph, { mode: 'active' });
  const detachGuard = attachReflexGuard(transmitter, reflexGuard);
  logger.info('RoClaw', 'ReflexGuard attached (mode: active)');

  // Heartbeat keepalive: sends STOP if no motor command within 500ms.
  // Inspired by OpenBot's 750ms firmware watchdog — prevents motor runaway.
  const heartbeat = new HeartbeatKeepAlive(transmitter, { intervalMs: 500 });
  heartbeat.start();
  logger.info('RoClaw', 'Heartbeat keepalive started (500ms)');

  // Enable dual-loop: SemanticLoop (2 Hz VLM perception) + ReactiveLoop (20 Hz motor control)
  if (perceptionInfer !== undefined) {
    visionLoop.enableDualLoop({
      graph: sceneGraph,
      controller,
      guard: reflexGuard,
      arena: ARENA,
      perceptionInfer,
    });
    logger.info('RoClaw', 'Dual-loop enabled: SemanticLoop (2 Hz) + ReactiveLoop (20 Hz)');
  }

  // Forward VisionLoop events for observability
  visionLoop.on('arrival', (reason: string) => {
    logger.info('RoClaw', `Navigation arrived: ${reason}`);
  });
  visionLoop.on('stuck', (reason: string) => {
    logger.warn('RoClaw', `Navigation stuck: ${reason}`);
  });
  visionLoop.on('error', (err: Error) => {
    logger.error('RoClaw', `VisionLoop error: ${err.message}`);
  });

  // 6. Build tool context
  const toolContext: ToolContext = {
    compiler,
    transmitter,
    visionLoop,
    infer,
    traceSource: TraceSource.REAL_WORLD,
    sceneGraph,
  };

  // 7. Register subsystems and start Cartridge adapter (for llm_os / skillos_mini)
  const memoryManager = new MemoryManager();
  const planner = new HierarchicalPlanner(infer, memoryManager, TraceSource.REAL_WORLD);

  setRobotState({
    transmitter,
    visionLoop,
    sceneGraph,
    reactiveController: controller,
    planner,
  });

  const cartridgeServer = startCartridgeAdapter({
    port: config.cartridgePort,
    onListen: (port, path) => {
      logger.info('RoClaw', `Cartridge adapter listening on ws://localhost:${port}${path}`);
    },
  });

  // 8. Connect to OpenClaw Gateway (cortex — for direct tool invocations)
  const cortex = new CortexNode(
    { gatewayUrl: config.gatewayUrl },
    toolContext,
  );

  try {
    await cortex.connect();
    logger.info('RoClaw', `Cortex connected to ${config.gatewayUrl}`);
  } catch (err) {
    logger.warn('RoClaw', 'Gateway not available (standalone mode)', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  logger.info('RoClaw', 'System ready. Waiting for commands...');
  logger.info('RoClaw', `  Cartridge: ws://localhost:${config.cartridgePort}/cartridge`);
  logger.info('RoClaw', `  Gateway:   ${config.gatewayUrl}`);

  // Handle graceful shutdown
  const shutdown = async () => {
    logger.info('RoClaw', 'Shutting down...');
    heartbeat.stop();
    visionLoop.stop();
    detachGuard();
    await cartridgeServer.close();
    cortex.disconnect();
    await transmitter.disconnect();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  logger.error('RoClaw', 'Fatal error', {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
