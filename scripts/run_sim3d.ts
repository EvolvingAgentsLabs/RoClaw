/**
 * RoClaw mjswan Full Loop — Standalone test runner
 *
 * Starts the VisionLoop immediately (no cortex gateway needed).
 * Connects to the mjswan bridge for 3D physics simulation.
 *
 * Prerequisites:
 *   1. mjswan scene running: cd sim && python build_scene.py
 *   2. Bridge running: npm run sim:3d
 *   3. Browser open: http://localhost:8000?bridge=ws://localhost:9090
 *
 * Usage:
 *   npx tsx scripts/run_sim3d.ts
 *   npx tsx scripts/run_sim3d.ts --goal "navigate to the red box"
 */

import * as dotenv from 'dotenv';
import { logger } from '../src/shared/logger';
import { BytecodeCompiler, formatHex } from '../src/2_qwen_cerebellum/bytecode_compiler';
import { UDPTransmitter } from '../src/2_qwen_cerebellum/udp_transmitter';
import { VisionLoop } from '../src/2_qwen_cerebellum/vision_loop';
import { CerebellumInference } from '../src/2_qwen_cerebellum/inference';

dotenv.config();

// =============================================================================
// Configuration
// =============================================================================

const config = {
  esp32Host: process.env.ESP32_S3_HOST || '127.0.0.1',
  esp32Port: parseInt(process.env.ESP32_S3_PORT || '4210', 10),
  cameraHost: process.env.ESP32_CAM_HOST || '127.0.0.1',
  cameraPort: parseInt(process.env.ESP32_CAM_PORT || '8081', 10),
  cameraPath: process.env.ESP32_CAM_PATH || '/stream',
  frameHistorySize: parseInt(process.env.FRAME_HISTORY_SIZE || '4', 10),
  apiKey: process.env.OPENROUTER_API_KEY || '',
  model: process.env.QWEN_MODEL || 'qwen/qwen-2.5-vl-72b-instruct',
  localInferenceUrl: process.env.LOCAL_INFERENCE_URL,
};

// Parse CLI goal
let goal = 'explore the arena and avoid obstacles';
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--goal' && args[i + 1]) {
    goal = args[++i];
  }
}

// =============================================================================
// Boot
// =============================================================================

async function main(): Promise<void> {
  logger.info('Sim3D', '=== RoClaw mjswan Full Loop ===');
  logger.info('Sim3D', `Goal: "${goal}"`);

  // 1. Compiler
  const compiler = new BytecodeCompiler('fewshot');

  // 2. UDP transmitter -> bridge
  const transmitter = new UDPTransmitter({
    host: config.esp32Host,
    port: config.esp32Port,
  });
  await transmitter.connect();
  logger.info('Sim3D', `UDP transmitter -> ${config.esp32Host}:${config.esp32Port}`);

  // 3. Inference (OpenRouter or local)
  const inferenceConfig = config.localInferenceUrl
    ? { apiKey: config.apiKey || 'local', apiBaseUrl: config.localInferenceUrl, model: config.model }
    : { apiKey: config.apiKey, model: config.model };

  const inference = new CerebellumInference(inferenceConfig);
  const infer = inference.createInferenceFunction();
  logger.info('Sim3D', `Inference: ${config.localInferenceUrl ? 'local' : 'OpenRouter'} (${config.model})`);

  // 4. Vision loop -> bridge MJPEG stream
  const cameraUrl = `http://${config.cameraHost}:${config.cameraPort}${config.cameraPath}`;
  const visionLoop = new VisionLoop(
    { cameraUrl, targetFPS: 2, frameHistorySize: config.frameHistorySize },
    compiler,
    transmitter,
    infer,
  );

  // Event logging
  visionLoop.on('connected', () => {
    logger.info('Sim3D', 'Camera stream connected — VLM loop active');
  });

  visionLoop.on('bytecode', (bytecode: Buffer, vlmOutput: string) => {
    logger.info('Sim3D', `VLM -> ${formatHex(bytecode)}`, { vlm: vlmOutput?.slice(0, 80) });
  });

  visionLoop.on('arrival', () => {
    logger.info('Sim3D', 'STOP detected (arrival)');
  });

  visionLoop.on('stuck', () => {
    logger.warn('Sim3D', 'Stuck detection triggered');
  });

  visionLoop.on('reconnecting', () => {
    logger.warn('Sim3D', 'Camera reconnecting...');
  });

  // 5. Start the loop immediately
  logger.info('Sim3D', `Starting vision loop: ${cameraUrl}`);
  await visionLoop.start(goal);

  logger.info('Sim3D', 'Vision loop started — full closed loop active!');
  logger.info('Sim3D', 'Cycle: 3D render -> MJPEG -> VLM -> bytecode -> UDP -> bridge -> MuJoCo physics');

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Sim3D', 'Shutting down...');
    visionLoop.stop();
    await transmitter.disconnect();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  logger.error('Sim3D', 'Fatal error', {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
