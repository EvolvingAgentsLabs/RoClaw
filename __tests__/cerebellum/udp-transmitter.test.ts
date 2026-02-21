import * as dgram from 'dgram';
import { UDPTransmitter } from '../../src/2_qwen_cerebellum/udp_transmitter';
import { encodeFrame, Opcode, FRAME_SIZE } from '../../src/2_qwen_cerebellum/bytecode_compiler';

describe('UDPTransmitter', () => {
  let transmitter: UDPTransmitter;
  let mockServer: dgram.Socket;
  let serverPort: number;

  beforeEach((done) => {
    // Create a mock UDP server to receive frames
    mockServer = dgram.createSocket('udp4');
    mockServer.bind(0, '127.0.0.1', () => {
      const addr = mockServer.address();
      serverPort = addr.port;
      transmitter = new UDPTransmitter({
        host: '127.0.0.1',
        port: serverPort,
        timeoutMs: 500,
        maxRetries: 1,
      });
      done();
    });
  });

  afterEach(async () => {
    await transmitter.disconnect();
    await new Promise<void>((resolve) => mockServer.close(() => resolve()));
  });

  // ===========================================================================
  // Connection
  // ===========================================================================

  test('connect creates UDP socket', async () => {
    await transmitter.connect();
    expect(transmitter.isConnected()).toBe(true);
  });

  test('disconnect closes socket', async () => {
    await transmitter.connect();
    await transmitter.disconnect();
    expect(transmitter.isConnected()).toBe(false);
  });

  test('double connect is idempotent', async () => {
    await transmitter.connect();
    await transmitter.connect(); // should not throw
    expect(transmitter.isConnected()).toBe(true);
  });

  test('disconnect when not connected is safe', async () => {
    await transmitter.disconnect(); // should not throw
    expect(transmitter.isConnected()).toBe(false);
  });

  // ===========================================================================
  // Sending frames
  // ===========================================================================

  test('sends 6-byte frame to server', async () => {
    await transmitter.connect();

    const received = new Promise<Buffer>((resolve) => {
      mockServer.on('message', (msg) => resolve(msg));
    });

    const frame = encodeFrame({ opcode: Opcode.STOP, paramLeft: 0, paramRight: 0 });
    await transmitter.send(frame);

    const msg = await received;
    expect(msg.length).toBe(FRAME_SIZE);
    expect(msg[0]).toBe(0xAA);
    expect(msg[1]).toBe(Opcode.STOP);
    expect(msg[5]).toBe(0xFF);
  });

  test('sends MOVE_FORWARD frame', async () => {
    await transmitter.connect();

    const received = new Promise<Buffer>((resolve) => {
      mockServer.on('message', (msg) => resolve(msg));
    });

    const frame = encodeFrame({ opcode: Opcode.MOVE_FORWARD, paramLeft: 100, paramRight: 100 });
    await transmitter.send(frame);

    const msg = await received;
    expect(msg[1]).toBe(Opcode.MOVE_FORWARD);
    expect(msg[2]).toBe(100);
    expect(msg[3]).toBe(100);
  });

  test('rejects frame with wrong size', async () => {
    await transmitter.connect();
    await expect(transmitter.send(Buffer.from([0xAA, 0x01]))).rejects.toThrow('Invalid frame size');
  });

  test('rejects when not connected', async () => {
    const frame = encodeFrame({ opcode: Opcode.STOP, paramLeft: 0, paramRight: 0 });
    await expect(transmitter.send(frame)).rejects.toThrow('not connected');
  });

  // ===========================================================================
  // Stats
  // ===========================================================================

  test('tracks send stats', async () => {
    await transmitter.connect();

    const frame = encodeFrame({ opcode: Opcode.STOP, paramLeft: 0, paramRight: 0 });
    await transmitter.send(frame);
    await transmitter.send(frame);

    const stats = transmitter.getStats();
    expect(stats.framesSent).toBe(2);
    expect(stats.bytesTransmitted).toBe(12); // 6 * 2
    expect(stats.errors).toBe(0);
    expect(stats.connected).toBe(true);
  });

  // ===========================================================================
  // sendAndReceive
  // ===========================================================================

  test('sendAndReceive gets response', async () => {
    await transmitter.connect();

    // Mock server echoes back
    mockServer.on('message', (msg, rinfo) => {
      mockServer.send(Buffer.from('{"ok":true}'), rinfo.port, rinfo.address);
    });

    const frame = encodeFrame({ opcode: Opcode.GET_STATUS, paramLeft: 0, paramRight: 0 });
    const response = await transmitter.sendAndReceive(frame);

    expect(response.toString()).toBe('{"ok":true}');
  });

  test('sendAndReceive times out', async () => {
    await transmitter.connect();

    // Server doesn't respond
    const frame = encodeFrame({ opcode: Opcode.GET_STATUS, paramLeft: 0, paramRight: 0 });
    await expect(transmitter.sendAndReceive(frame, 100)).rejects.toThrow('timeout');
  });
});
