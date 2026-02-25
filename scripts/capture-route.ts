#!/usr/bin/env npx tsx
/**
 * capture-route.ts — Walk a route with phone, capture frames + compass at ~2 FPS
 *
 * Usage:
 *   npx tsx scripts/capture-route.ts --name basketball-court --duration 30
 *
 * Requires IP Webcam running on an Android phone (not DroidCam — only IP Webcam
 * exposes sensor data via HTTP).
 *
 * Environment variables (or CLI flags):
 *   IP_WEBCAM_HOST  (or --host)   Phone IP address
 *   IP_WEBCAM_PORT  (or --port)   IP Webcam port (default: 8080)
 *
 * Output:
 *   __tests__/navigation/fixtures/outdoor_routes/{name}/frame_000.jpg
 *   __tests__/navigation/fixtures/outdoor_routes/{name}/frame_001.jpg
 *   __tests__/navigation/fixtures/outdoor_routes/{name}/route.json
 */

import * as fs from 'fs';
import * as path from 'path';

// =============================================================================
// CLI Argument Parsing
// =============================================================================

function parseArgs(): { name: string; duration: number; host: string; port: number } {
  const args = process.argv.slice(2);
  let name = 'unnamed-route';
  let duration = 30;
  let host = process.env.IP_WEBCAM_HOST || '';
  let port = parseInt(process.env.IP_WEBCAM_PORT || '8080', 10);

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--name':
        name = args[++i];
        break;
      case '--duration':
        duration = parseInt(args[++i], 10);
        break;
      case '--host':
        host = args[++i];
        break;
      case '--port':
        port = parseInt(args[++i], 10);
        break;
    }
  }

  if (!host) {
    console.error('Error: IP_WEBCAM_HOST env var or --host flag is required.');
    console.error('Usage: IP_WEBCAM_HOST=192.168.1.50 npx tsx scripts/capture-route.ts --name my-route');
    process.exit(1);
  }

  if (isNaN(duration) || duration < 1) {
    console.error('Error: --duration must be a positive integer (seconds).');
    process.exit(1);
  }

  return { name, duration, host, port };
}

// =============================================================================
// Capture Logic
// =============================================================================

interface RouteFrame {
  index: number;
  file: string;
  heading: number | null;
  timestamp: number;
}

interface RouteManifest {
  name: string;
  capturedAt: string;
  frameCount: number;
  fps: number;
  frames: RouteFrame[];
}

const JPEG_MAGIC = Buffer.from([0xFF, 0xD8]);

function isValidJpeg(buffer: Buffer): boolean {
  return buffer.length > 2 && buffer[0] === JPEG_MAGIC[0] && buffer[1] === JPEG_MAGIC[1];
}

async function fetchFrame(host: string, port: number): Promise<Buffer | null> {
  try {
    const url = `http://${host}:${port}/shot.jpg`;
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    const arrayBuf = await response.arrayBuffer();
    return Buffer.from(arrayBuf);
  } catch {
    return null;
  }
}

async function fetchHeading(host: string, port: number): Promise<number | null> {
  try {
    const url = `http://${host}:${port}/sensors.json`;
    const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
    if (!response.ok) return null;
    const data = await response.json();
    const azimuth = data?.orientation?.data?.[0]?.[0]?.[0];
    if (typeof azimuth !== 'number' || isNaN(azimuth)) return null;
    return ((azimuth % 360) + 360) % 360;
  } catch {
    return null;
  }
}

function padIndex(i: number): string {
  return String(i).padStart(3, '0');
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  const { name, duration, host, port } = parseArgs();
  const fps = 2;
  const totalFrames = duration * fps;
  const intervalMs = 1000 / fps;

  const outDir = path.join(
    __dirname,
    '..',
    '__tests__',
    'navigation',
    'fixtures',
    'outdoor_routes',
    name,
  );

  // Create output directory
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`Capturing route: ${name}`);
  console.log(`  Host: ${host}:${port}`);
  console.log(`  Duration: ${duration}s at ${fps} FPS (${totalFrames} frames)`);
  console.log(`  Output: ${outDir}`);
  console.log('');

  // Verify connectivity
  console.log('Verifying connection to IP Webcam...');
  const testFrame = await fetchFrame(host, port);
  if (!testFrame || !isValidJpeg(testFrame)) {
    console.error('Failed to fetch a valid JPEG from IP Webcam. Check host/port and ensure IP Webcam is running.');
    process.exit(1);
  }
  console.log('Connection OK. Starting capture...\n');

  const frames: RouteFrame[] = [];
  let skipped = 0;

  for (let i = 0; i < totalFrames; i++) {
    const tickStart = Date.now();

    // Fetch frame and heading in parallel
    const [frameBuffer, heading] = await Promise.all([
      fetchFrame(host, port),
      fetchHeading(host, port),
    ]);

    if (!frameBuffer || !isValidJpeg(frameBuffer)) {
      console.log(`  Frame ${i + 1}/${totalFrames}: SKIPPED (invalid or missing)`);
      skipped++;
    } else {
      const fileName = `frame_${padIndex(i)}.jpg`;
      const filePath = path.join(outDir, fileName);
      fs.writeFileSync(filePath, frameBuffer);

      const headingStr = heading !== null ? `${heading.toFixed(1)}deg` : 'N/A';
      console.log(`  Frame ${i + 1}/${totalFrames}, heading: ${headingStr}`);

      frames.push({
        index: i,
        file: fileName,
        heading,
        timestamp: Date.now(),
      });
    }

    // Maintain target FPS
    const elapsed = Date.now() - tickStart;
    const sleepTime = intervalMs - elapsed;
    if (sleepTime > 0) {
      await sleep(sleepTime);
    }
  }

  // Write route manifest
  const manifest: RouteManifest = {
    name,
    capturedAt: new Date().toISOString(),
    frameCount: frames.length,
    fps,
    frames,
  };

  const manifestPath = path.join(outDir, 'route.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

  console.log(`\nCapture complete!`);
  console.log(`  Saved: ${frames.length} frames (${skipped} skipped)`);
  console.log(`  Manifest: ${manifestPath}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
