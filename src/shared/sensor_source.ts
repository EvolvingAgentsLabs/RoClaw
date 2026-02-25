/**
 * SensorSource — Abstract interface for phone/device sensor data
 *
 * Primary implementation: IpWebcamSensorSource, which reads compass heading
 * from the IP Webcam Android app's HTTP sensor endpoint (/sensors.json).
 *
 * IP Webcam exposes phone sensors (orientation, accelerometer, GPS, etc.)
 * via HTTP — DroidCam does NOT, which is why IP Webcam is required.
 */

import { logger } from './logger';

// =============================================================================
// Types
// =============================================================================

export interface SensorReading {
  /** Compass heading in degrees (0-360, 0=North) */
  heading: number;
  /** Timestamp from Date.now() */
  timestamp: number;
}

export interface SensorSource {
  getHeading(): Promise<SensorReading | null>;
}

// =============================================================================
// IpWebcamSensorSource
// =============================================================================

export class IpWebcamSensorSource implements SensorSource {
  private host: string;
  private port: number;
  private cachedReading: SensorReading | null = null;
  private cacheTimestamp = 0;
  private readonly cacheTtlMs = 100;

  constructor(host: string, port: number) {
    this.host = host;
    this.port = port;
  }

  /**
   * Fetch compass heading from IP Webcam's orientation sensor.
   *
   * IP Webcam sensor format:
   *   { "orientation": { "data": [[[azimuth, pitch, roll], ...]], "unit": "deg" } }
   *
   * Azimuth (index 0) is the compass heading in degrees.
   * Caches readings for 100ms to avoid flooding the phone.
   * Returns null gracefully on network errors (never throws).
   */
  async getHeading(): Promise<SensorReading | null> {
    const now = Date.now();

    // Return cached reading if fresh enough
    if (this.cachedReading && now - this.cacheTimestamp < this.cacheTtlMs) {
      return this.cachedReading;
    }

    try {
      const url = `http://${this.host}:${this.port}/sensors.json`;
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) });

      if (!response.ok) {
        logger.debug('IpWebcamSensor', `HTTP ${response.status} from sensors endpoint`);
        return this.cachedReading;
      }

      const data = (await response.json()) as Record<string, unknown>;
      const orientation = data?.orientation as { data?: number[][][] } | undefined;

      if (!orientation?.data?.[0]?.[0]) {
        logger.debug('IpWebcamSensor', 'No orientation data in sensor response');
        return this.cachedReading;
      }

      const azimuth = orientation.data[0][0][0];
      if (typeof azimuth !== 'number' || isNaN(azimuth)) {
        logger.debug('IpWebcamSensor', `Invalid azimuth value: ${azimuth}`);
        return this.cachedReading;
      }

      // Normalize to 0-360
      const heading = ((azimuth % 360) + 360) % 360;

      this.cachedReading = { heading, timestamp: now };
      this.cacheTimestamp = now;

      return this.cachedReading;
    } catch (err) {
      logger.debug('IpWebcamSensor', `Sensor fetch failed: ${err instanceof Error ? err.message : String(err)}`);
      return this.cachedReading;
    }
  }
}
