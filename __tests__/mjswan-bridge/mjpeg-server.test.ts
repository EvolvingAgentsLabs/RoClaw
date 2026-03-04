/**
 * Tests for the MJPEG server component of the mjswan bridge.
 *
 * Verifies that:
 *   - The MJPEG endpoint returns a valid multipart stream
 *   - Frames update when the underlying JPEG buffer changes
 */

import * as http from 'http';

/**
 * Start a minimal MJPEG server (extracted pattern from mjswan_bridge.ts)
 * to test in isolation without needing UDP/WS.
 */
function createTestMjpegServer(
  latestJpeg: { data: Buffer },
  fps: number,
): http.Server {
  const server = http.createServer((req, res) => {
    if (req.url !== '/stream') {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found. Use /stream for MJPEG.');
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'multipart/x-mixed-replace;boundary=frame',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const sendFrame = () => {
      const jpeg = latestJpeg.data;
      const header = `--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ${jpeg.length}\r\n\r\n`;
      res.write(Buffer.concat([Buffer.from(header), jpeg, Buffer.from('\r\n')]));
    };

    sendFrame();
    const interval = setInterval(sendFrame, 1000 / fps);

    req.on('close', () => clearInterval(interval));
    res.on('error', () => clearInterval(interval));
  });

  return server;
}

/** Minimal valid JPEG (1x1 grayscale) */
function createMinimalJpeg(): Buffer {
  return Buffer.from([
    0xFF, 0xD8,
    0xFF, 0xDB, 0x00, 0x43, 0x00,
    ...Array(64).fill(0x01),
    0xFF, 0xC0, 0x00, 0x0B, 0x08,
    0x00, 0x01, 0x00, 0x01,
    0x01, 0x01, 0x11, 0x00,
    0xFF, 0xC4, 0x00, 0x14, 0x00,
    0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00,
    0xFF, 0xC4, 0x00, 0x14, 0x10,
    0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00,
    0xFF, 0xDA, 0x00, 0x08,
    0x01, 0x01, 0x00, 0x00, 0x3F, 0x00,
    0x3F,
    0xFF, 0xD9,
  ]);
}

describe('MJPEG Server', () => {
  let server: http.Server;
  let port: number;
  const latestJpeg = { data: createMinimalJpeg() };

  beforeAll((done) => {
    server = createTestMjpegServer(latestJpeg, 10); // 10 FPS for faster test
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        port = addr.port;
      }
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  it('returns 404 for non-stream paths', (done) => {
    http.get(`http://127.0.0.1:${port}/`, (res) => {
      expect(res.statusCode).toBe(404);
      res.resume();
      res.on('end', done);
    });
  });

  it('returns multipart content type on /stream', (done) => {
    const req = http.get(`http://127.0.0.1:${port}/stream`, (res) => {
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('multipart/x-mixed-replace;boundary=frame');
      req.destroy();
      done();
    });
  });

  it('streams valid MJPEG frames starting with boundary', (done) => {
    const chunks: Buffer[] = [];
    const req = http.get(`http://127.0.0.1:${port}/stream`, (res) => {
      res.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
        // After receiving some data, verify it contains the boundary and JPEG markers
        const combined = Buffer.concat(chunks).toString('binary');
        if (combined.includes('--frame') && combined.includes('\xFF\xD8')) {
          req.destroy();
          // Verify boundary present
          expect(combined).toContain('--frame');
          // Verify Content-Type header in multipart
          expect(combined).toContain('Content-Type: image/jpeg');
          // Verify JPEG SOI marker (0xFF 0xD8) is present
          expect(combined).toContain('\xFF\xD8');
          done();
        }
      });
    });

    // Safety timeout
    setTimeout(() => {
      req.destroy();
      done(new Error('Timeout waiting for MJPEG frame'));
    }, 3000);
  });

  it('serves updated frames when latestJpeg changes', (done) => {
    // Create a different JPEG (just change a byte after the SOI)
    const newJpeg = Buffer.from(latestJpeg.data);
    // Modify a byte in the DQT table to make it distinguishable
    newJpeg[7] = 0x42;
    latestJpeg.data = newJpeg;

    const chunks: Buffer[] = [];
    const req = http.get(`http://127.0.0.1:${port}/stream`, (res) => {
      let frameCount = 0;
      res.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
        const combined = Buffer.concat(chunks);
        // Count boundary markers
        const str = combined.toString('binary');
        const boundaries = str.split('--frame').length - 1;
        if (boundaries >= 1) {
          frameCount = boundaries;
          // The modified byte 0x42 should appear in the stream
          if (combined.includes(0x42)) {
            req.destroy();
            expect(frameCount).toBeGreaterThanOrEqual(1);
            done();
            return;
          }
        }
      });
    });

    setTimeout(() => {
      req.destroy();
      done(new Error('Timeout waiting for updated frame'));
    }, 3000);
  });
});
