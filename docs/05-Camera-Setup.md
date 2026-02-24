# Camera Setup Guide

RoClaw needs an MJPEG camera stream for its vision loop. You can use either an **ESP32-CAM** module (default) or an **Android phone** running a webcam app.

## Option A: ESP32-CAM (Default)

The ESP32-CAM is a low-cost Wi-Fi camera module designed for embedded projects.

### Setup

1. Flash the ESP32-CAM with the CameraWebServer example firmware (Arduino IDE or PlatformIO).
2. Connect the ESP32-CAM to your Wi-Fi network.
3. Note the IP address printed to Serial Monitor on boot.
4. Configure `.env`:

```env
ESP32_CAM_HOST=192.168.1.101
ESP32_CAM_PORT=80
ESP32_CAM_PATH=/stream
```

The `/stream` path is the default MJPEG endpoint on ESP32-CAM firmware.

## Option B: Android Phone

Turn any Android phone into a wireless camera using an MJPEG streaming app.

### Using IP Webcam

1. Install **IP Webcam** from the Play Store.
2. Open the app, scroll to **Video preferences**:
   - Set resolution to **320x240** (keeps bandwidth low for the VLM).
   - Set video format to **MJPEG**.
3. Tap **Start server** at the bottom.
4. Note the IP address and port shown on screen.
5. Configure `.env`:

```env
ESP32_CAM_HOST=192.168.1.50
ESP32_CAM_PORT=8080
ESP32_CAM_PATH=/video
```

### Using DroidCam

1. Install **DroidCam** from the Play Store.
2. Open the app and note the IP and port.
3. Configure `.env`:

```env
ESP32_CAM_HOST=192.168.1.50
ESP32_CAM_PORT=4747
ESP32_CAM_PATH=/mjpegfeed
```

## Comparison

| Feature | ESP32-CAM | Android Phone |
|---|---|---|
| Cost | ~$5 | Uses existing phone |
| Resolution | Up to 1600x1200 (UXGA) | Up to 1920x1080 |
| Setup complexity | Requires flashing firmware | Install app and start |
| Extra sensors | None | Gyroscope, accelerometer, GPS |
| Power | USB or battery | Phone battery |
| Form factor | Tiny, mountable | Bulky for a robot |

## Quick `.env` Reference

```env
# ESP32-CAM (default)
ESP32_CAM_HOST=192.168.1.101
ESP32_CAM_PORT=80
ESP32_CAM_PATH=/stream

# Android IP Webcam
ESP32_CAM_HOST=192.168.1.50
ESP32_CAM_PORT=8080
ESP32_CAM_PATH=/video

# Android DroidCam
ESP32_CAM_HOST=192.168.1.50
ESP32_CAM_PORT=4747
ESP32_CAM_PATH=/mjpegfeed
```

## Troubleshooting

**"Connection refused" or timeout**
- Verify the phone/ESP32 is on the same Wi-Fi network as the machine running RoClaw.
- Check your firewall allows incoming connections on the camera port.
- Ping the camera IP to confirm reachability: `ping 192.168.1.50`

**Wrong stream path**
- Open `http://<host>:<port><path>` in a browser. You should see a live MJPEG stream.
- IP Webcam uses `/video`, DroidCam uses `/mjpegfeed`, ESP32-CAM uses `/stream`.

**Frames dropping or high latency**
- Lower the camera resolution to 320x240. The VLM doesn't need high resolution.
- Ensure no other app is consuming the stream simultaneously.
- Move closer to the Wi-Fi access point to improve signal strength.

**Stream works in browser but not in RoClaw**
- Some apps require you to keep the app in the foreground. Check the app's background streaming setting.
- Confirm the stream format is MJPEG, not RTSP or HLS.
