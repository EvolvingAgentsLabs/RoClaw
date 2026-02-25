# Outdoor Route Fixtures

Captured walking-route sequences used by `semantic-map-outdoor.e2e.test.ts`.

Each route is a directory containing numbered JPEG frames and a `route.json` manifest with compass heading data. Frame images are **gitignored** — each developer captures their own.

## Prerequisites

1. Install **IP Webcam** from the Google Play Store (not DroidCam — only IP Webcam exposes sensor data via HTTP).
2. Open IP Webcam settings:
   - **Video preferences** → Resolution: 320x240
   - **Data logging** → Enable sensor logging
3. Tap **Start server** at the bottom.
4. Note the IP address and port shown on screen.

## Capturing a Route

```bash
# Set your phone's IP and port
export IP_WEBCAM_HOST=192.168.1.50
export IP_WEBCAM_PORT=8080

# Capture a 30-second route at ~2 FPS
npx tsx scripts/capture-route.ts --name basketball-court --duration 30
```

The script saves frames and a `route.json` manifest to:

```
__tests__/navigation/fixtures/outdoor_routes/basketball-court/
  frame_000.jpg
  frame_001.jpg
  ...
  route.json
```

## Verify Sensor Data

Before capturing, verify the phone is exposing sensors:

```bash
curl http://192.168.1.50:8080/sensors.json | jq '.orientation'
```

You should see `[azimuth, pitch, roll]` values in degrees.

## Suggested Scenarios

| Route | Description | Duration |
|-------|-------------|----------|
| `basketball-court` | Walk around a basketball court perimeter | 30-60s |
| `parking-lot` | Walk across a parking lot with parked cars | 30s |
| `hallway-loop` | Walk down a hallway and back | 20s |
| `sidewalk` | Walk along a sidewalk with landmarks | 30s |

## Running the Tests

```bash
OPENROUTER_API_KEY=sk-or-v1-... npm test -- --testPathPattern=semantic-map-outdoor
```

Tests skip automatically if no route fixtures are present.
