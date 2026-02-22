/**
 * RoClaw Tools — OpenClaw tool handler implementations
 *
 * Maps high-level OpenClaw tool invocations to Cerebellum actions.
 * Each tool translates a human intent into a motor control goal.
 */

import { logger } from '../shared/logger';
import { BytecodeCompiler, Opcode, formatHex } from '../2_qwen_cerebellum/bytecode_compiler';
import { UDPTransmitter } from '../2_qwen_cerebellum/udp_transmitter';
import { VisionLoop } from '../2_qwen_cerebellum/vision_loop';
import type { InferenceFunction } from '../2_qwen_cerebellum/inference';
import { MemoryManager } from '../3_llmunix_memory/memory_manager';

// =============================================================================
// Types
// =============================================================================

export interface ToolResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

export interface ToolContext {
  compiler: BytecodeCompiler;
  transmitter: UDPTransmitter;
  visionLoop: VisionLoop;
  infer: InferenceFunction;
}

// Module-level singleton — avoids changing ToolContext interface
const memoryManager = new MemoryManager();

/** Exposed for testing — allows injecting a mock MemoryManager */
export function _getMemoryManager(): MemoryManager {
  return memoryManager;
}

// =============================================================================
// Tool Definitions
// =============================================================================

export const TOOL_DEFINITIONS = [
  {
    name: 'robot.read_memory',
    description: 'Read the robot\'s memory (hardware profile, identity, skills, recent traces). Use this to understand physical capabilities and distill constraints before issuing movement commands.',
  },
  {
    name: 'robot.explore',
    description: 'Start exploring the environment, avoiding obstacles',
    parameters: { constraints: 'string (optional)' },
  },
  {
    name: 'robot.go_to',
    description: 'Navigate to a described location (e.g., "the kitchen", "the door")',
    parameters: { location: 'string', constraints: 'string (optional)' },
  },
  {
    name: 'robot.describe_scene',
    description: 'Take a photo and describe what the robot currently sees',
  },
  {
    name: 'robot.stop',
    description: 'Immediately stop all motor movement',
  },
  {
    name: 'robot.status',
    description: 'Get current robot status (pose, motor state, battery)',
  },
] as const;

export type ToolName = typeof TOOL_DEFINITIONS[number]['name'];

// =============================================================================
// Tool Handlers
// =============================================================================

export async function handleTool(
  toolName: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolResult> {
  switch (toolName) {
    case 'robot.read_memory':
      return handleReadMemory();

    case 'robot.explore':
      return handleExplore(ctx, args.constraints as string | undefined);

    case 'robot.go_to':
      return handleGoTo(args.location as string, ctx, args.constraints as string | undefined);

    case 'robot.describe_scene':
      return handleDescribeScene(ctx);

    case 'robot.stop':
      return handleStop(ctx);

    case 'robot.status':
      return handleStatus(ctx);

    default:
      return { success: false, message: `Unknown tool: ${toolName}` };
  }
}

// ---------------------------------------------------------------------------
// Individual handlers
// ---------------------------------------------------------------------------

async function handleReadMemory(): Promise<ToolResult> {
  logger.info('Tools', 'robot.read_memory invoked');

  const content = memoryManager.getFullContext();
  return {
    success: true,
    message: content || 'No memory files found.',
    data: { type: 'memory' },
  };
}

async function handleExplore(ctx: ToolContext, constraints?: string): Promise<ToolResult> {
  logger.info('Tools', 'robot.explore invoked', constraints ? { constraints } : undefined);

  const baseGoal = 'Explore the environment. Move forward when the path is clear. Turn to avoid obstacles. Look for interesting objects.';
  const goal = constraints ? `${baseGoal}\nConstraints: ${constraints}` : baseGoal;

  try {
    await ctx.visionLoop.start(goal);
    return {
      success: true,
      message: 'Exploration started. The robot is now autonomously navigating.',
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to start exploration: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function handleGoTo(location: string, ctx: ToolContext, constraints?: string): Promise<ToolResult> {
  if (!location) {
    return { success: false, message: 'No location specified' };
  }

  logger.info('Tools', `robot.go_to: ${location}`, constraints ? { constraints } : undefined);

  const baseGoal = `Navigate to: ${location}. Look for visual cues that indicate this location. Move toward it. Stop when you arrive.`;
  const goal = constraints ? `${baseGoal}\nConstraints: ${constraints}` : baseGoal;

  try {
    await ctx.visionLoop.start(goal);
    return {
      success: true,
      message: `Navigation started toward "${location}".`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to start navigation: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function handleDescribeScene(ctx: ToolContext): Promise<ToolResult> {
  logger.info('Tools', 'robot.describe_scene invoked');

  try {
    // Grab the latest camera frame for visual context
    const frameBase64 = ctx.visionLoop.getLatestFrameBase64();
    const images = frameBase64 ? [frameBase64] : undefined;

    const description = await ctx.infer(
      'You are a robot with a camera. Describe what you see in detail. Focus on objects, distances, and spatial layout.',
      'Describe the current scene.',
      images,
    );

    return {
      success: true,
      message: description,
      data: { type: 'scene_description' },
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to describe scene: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function handleStop(ctx: ToolContext): Promise<ToolResult> {
  logger.info('Tools', 'robot.stop invoked');

  try {
    // Stop the vision loop
    ctx.visionLoop.stop();

    // Send STOP bytecode
    const stopFrame = ctx.compiler.createFrame(Opcode.STOP);
    await ctx.transmitter.send(stopFrame);

    return {
      success: true,
      message: `Stopped. Sent ${formatHex(stopFrame)}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to stop: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function handleStatus(ctx: ToolContext): Promise<ToolResult> {
  logger.info('Tools', 'robot.status invoked');

  try {
    // Send GET_STATUS bytecode and wait for response
    const statusFrame = ctx.compiler.createFrame(Opcode.GET_STATUS);
    const response = await ctx.transmitter.sendAndReceive(statusFrame, 2000);

    // Parse JSON response from firmware
    const statusJson = response.toString();
    const status = JSON.parse(statusJson);

    return {
      success: true,
      message: `Robot status: position (${status.pose?.x?.toFixed(1)}, ${status.pose?.y?.toFixed(1)}), heading ${((status.pose?.h || 0) * 180 / Math.PI).toFixed(0)} deg, ${status.run ? 'moving' : 'idle'}`,
      data: status,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to get status: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
