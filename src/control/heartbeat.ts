/**
 * HeartbeatKeepAlive — OpenBot-inspired safety mechanism
 *
 * Sends a periodic STOP frame to the ESP32 if no motor command has been
 * sent within the heartbeat interval. This prevents motor runaway if:
 *   - The VisionLoop crashes or hangs
 *   - The network connection drops
 *   - The Node.js process stalls (GC pause, etc.)
 *
 * Inspired by OpenBot firmware's 750ms heartbeat timeout: if the firmware
 * doesn't receive any command within the interval, it stops the motors.
 * This module is the Node.js-side complement — it ensures the firmware
 * always receives a command within the timeout.
 *
 * Usage:
 *   const hb = new HeartbeatKeepAlive(transmitter, { intervalMs: 500 });
 *   hb.start();
 *   // ... robot operates normally; reactive loop sends commands ...
 *   hb.stop();
 */

import { Opcode, encodeFrame } from './bytecode_compiler';
import type { UDPTransmitter } from '../bridge/udp_transmitter';

export interface HeartbeatConfig {
  /** Interval in ms between heartbeat checks (default: 500). Should be
   *  less than the ESP32 firmware's watchdog timeout. */
  intervalMs: number;
  /** If true, log each heartbeat STOP (noisy; default: false). */
  verbose: boolean;
}

const DEFAULT_HEARTBEAT_CONFIG: HeartbeatConfig = {
  intervalMs: 500,
  verbose: false,
};

export class HeartbeatKeepAlive {
  private transmitter: UDPTransmitter;
  private config: HeartbeatConfig;
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastCommandTime = Date.now();
  private running = false;

  constructor(transmitter: UDPTransmitter, config: Partial<HeartbeatConfig> = {}) {
    this.transmitter = transmitter;
    this.config = { ...DEFAULT_HEARTBEAT_CONFIG, ...config };
  }

  /** Call this every time a motor command is sent (resets the heartbeat timer). */
  notifyCommand(): void {
    this.lastCommandTime = Date.now();
  }

  /** Start the heartbeat monitor. */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastCommandTime = Date.now();

    this.timer = setInterval(async () => {
      const elapsed = Date.now() - this.lastCommandTime;
      if (elapsed >= this.config.intervalMs) {
        // No command sent recently — send STOP as a keepalive / safety net
        try {
          const frame = encodeFrame({ opcode: Opcode.STOP, paramLeft: 0, paramRight: 0 });
          await this.transmitter.send(frame);
          if (this.config.verbose) {
            // eslint-disable-next-line no-console
            console.log(`[heartbeat] STOP sent (${elapsed}ms since last command)`);
          }
        } catch {
          // Transmitter offline — nothing to do, motor safety is firmware's job
        }
      }
    }, Math.max(100, Math.floor(this.config.intervalMs / 2)));
  }

  /** Stop the heartbeat monitor. */
  stop(): void {
    if (!this.running) return;
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  isRunning(): boolean {
    return this.running;
  }
}
