/**
 * RoClaw — Main Entry Point
 *
 * Boots the dual-brain system:
 * 1. Load configuration from .env
 * 2. Initialize UDP transmitter (→ ESP32-S3 spinal cord)
 * 3. Initialize bytecode compiler (neural compiler)
 * 4. Initialize vision loop (→ ESP32-CAM eyes)
 * 5. Connect to OpenClaw Gateway (cortex)
 * 6. Start listening for tool invocations
 */

import * as dotenv from 'dotenv';
import { logger } from './shared/logger';
import { BytecodeCompiler } from './2_qwen_cerebellum/bytecode_compiler';
import { UDPTransmitter } from './2_qwen_cerebellum/udp_transmitter';
import { VisionLoop } from './2_qwen_cerebellum/vision_loop';
import { CerebellumInference } from './2_qwen_cerebellum/inference';
import { CortexNode } from './1_openclaw_cortex/index';
import type { ToolContext } from './1_openclaw_cortex/roclaw_tools';

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

  // Inference
  apiKey: process.env.OPENROUTER_API_KEY || '',
  model: process.env.QWEN_MODEL || 'qwen/qwen-2.5-vl-72b-instruct',
  localInferenceUrl: process.env.LOCAL_INFERENCE_URL,
};

// =============================================================================
// Boot
// =============================================================================

async function main(): Promise<void> {
  logger.info('RoClaw', '=== RoClaw — The Physical Embodiment for OpenClaw ===');
  logger.info('RoClaw', 'Dual-Brain Architecture: Cortex (OpenClaw) + Cerebellum (Qwen-VL)');

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
    logger.info('RoClaw', `UDP transmitter → ${config.esp32Host}:${config.esp32Port}`);
  } catch (err) {
    logger.warn('RoClaw', 'UDP transmitter offline (ESP32 not connected)', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 3. Initialize inference
  const inferenceConfig = config.localInferenceUrl
    ? { apiKey: config.apiKey || 'local', apiBaseUrl: config.localInferenceUrl, model: config.model }
    : { apiKey: config.apiKey, model: config.model };

  const inference = new CerebellumInference(inferenceConfig);
  const infer = inference.createInferenceFunction();
  logger.info('RoClaw', `Inference: ${config.localInferenceUrl ? 'local' : 'OpenRouter'} (${config.model})`);

  // 4. Initialize vision loop (rolling video buffer for temporal/3D perception)
  const cameraUrl = `http://${config.cameraHost}:${config.cameraPort}${config.cameraPath}`;
  const visionLoop = new VisionLoop(
    { cameraUrl, targetFPS: 2, frameHistorySize: config.frameHistorySize },
    compiler,
    transmitter,
    infer,
  );
  logger.info('RoClaw', `Vision loop → ${cameraUrl} (${config.frameHistorySize}-frame video buffer)`);

  // 5. Build tool context
  const toolContext: ToolContext = {
    compiler,
    transmitter,
    visionLoop,
    infer,
  };

  // 6. Connect to OpenClaw Gateway
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

  logger.info('RoClaw', 'System ready. Waiting for tool invocations...');

  // Handle graceful shutdown
  const shutdown = async () => {
    logger.info('RoClaw', 'Shutting down...');
    visionLoop.stop();
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
