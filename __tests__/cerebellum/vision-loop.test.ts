import { VisionLoop } from '../../src/2_qwen_cerebellum/vision_loop';
import { BytecodeCompiler, Opcode, formatHex } from '../../src/2_qwen_cerebellum/bytecode_compiler';
import { UDPTransmitter } from '../../src/2_qwen_cerebellum/udp_transmitter';
import type { InferenceFunction } from '../../src/2_qwen_cerebellum/inference';

describe('VisionLoop', () => {
  let compiler: BytecodeCompiler;
  let transmitter: UDPTransmitter;
  let mockInfer: jest.Mock;
  let visionLoop: VisionLoop;

  beforeEach(() => {
    compiler = new BytecodeCompiler('fewshot');
    transmitter = new UDPTransmitter({ host: '127.0.0.1', port: 4210 });

    // Mock inference function
    mockInfer = jest.fn<Promise<string>, [string, string, string[] | undefined]>();
    mockInfer.mockResolvedValue('AA 07 00 00 07 FF');

    visionLoop = new VisionLoop(
      { cameraUrl: 'http://127.0.0.1:80/stream', targetFPS: 2 },
      compiler,
      transmitter,
      mockInfer as InferenceFunction,
    );
  });

  afterEach(() => {
    visionLoop.stop();
  });

  // ===========================================================================
  // Goal management
  // ===========================================================================

  test('default goal is set', () => {
    expect(visionLoop.getGoal()).toBe('explore and avoid obstacles');
  });

  test('setGoal updates the goal', () => {
    visionLoop.setGoal('navigate to the kitchen');
    expect(visionLoop.getGoal()).toBe('navigate to the kitchen');
  });

  // ===========================================================================
  // State
  // ===========================================================================

  test('isRunning is false initially', () => {
    expect(visionLoop.isRunning()).toBe(false);
  });

  test('stop sets isRunning to false', () => {
    visionLoop.stop();
    expect(visionLoop.isRunning()).toBe(false);
  });

  // ===========================================================================
  // Stats
  // ===========================================================================

  test('initial stats are zero', () => {
    const stats = visionLoop.getStats();
    expect(stats.framesReceived).toBe(0);
    expect(stats.framesProcessed).toBe(0);
    expect(stats.inferenceCount).toBe(0);
    expect(stats.bytecodesSent).toBe(0);
    expect(stats.errors).toBe(0);
    expect(stats.connected).toBe(false);
  });

  // ===========================================================================
  // Single frame processing (no network required)
  // ===========================================================================

  test('processSingleFrame calls inference with image', async () => {
    // Mock transmitter as connected
    const mockSend = jest.fn().mockResolvedValue(undefined);
    (transmitter as any).connected = true;
    (transmitter as any).socket = { send: jest.fn() };
    transmitter.send = mockSend;

    mockInfer.mockResolvedValue('AA 07 00 00 07 FF');

    const result = await visionLoop.processSingleFrame('base64imagedata');

    expect(mockInfer).toHaveBeenCalledTimes(1);
    expect(mockInfer).toHaveBeenCalledWith(
      expect.stringContaining('robot motor controller'),
      expect.any(String),
      ['base64imagedata'],
    );
  });

  test('processSingleFrame compiles and sends bytecode', async () => {
    const mockSend = jest.fn().mockResolvedValue(undefined);
    (transmitter as any).connected = true;
    (transmitter as any).socket = { send: jest.fn() };
    transmitter.send = mockSend;

    mockInfer.mockResolvedValue('AA 07 00 00 07 FF');

    const result = await visionLoop.processSingleFrame('base64imagedata');

    expect(result).not.toBeNull();
    expect(result!.length).toBe(6);
    expect(result![0]).toBe(0xAA);
    expect(result![1]).toBe(Opcode.STOP);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  test('processSingleFrame returns null on inference failure', async () => {
    const mockSend = jest.fn().mockResolvedValue(undefined);
    (transmitter as any).connected = true;
    (transmitter as any).socket = { send: jest.fn() };
    transmitter.send = mockSend;

    mockInfer.mockRejectedValue(new Error('API error'));

    const result = await visionLoop.processSingleFrame('base64imagedata');
    expect(result).toBeNull();
  });

  test('processSingleFrame returns null on compile failure', async () => {
    const mockSend = jest.fn().mockResolvedValue(undefined);
    (transmitter as any).connected = true;
    (transmitter as any).socket = { send: jest.fn() };
    transmitter.send = mockSend;

    mockInfer.mockResolvedValue('I have no idea what to do');

    const result = await visionLoop.processSingleFrame('base64imagedata');
    expect(result).toBeNull();
  });

  test('processSingleFrame with FORWARD command', async () => {
    const mockSend = jest.fn().mockResolvedValue(undefined);
    (transmitter as any).connected = true;
    (transmitter as any).socket = { send: jest.fn() };
    transmitter.send = mockSend;

    mockInfer.mockResolvedValue('FORWARD 128 128');

    const result = await visionLoop.processSingleFrame('base64imagedata');
    expect(result).not.toBeNull();
    expect(result![1]).toBe(Opcode.MOVE_FORWARD);
    expect(result![2]).toBe(128);
  });
});
