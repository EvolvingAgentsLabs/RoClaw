import {
  DEFAULT_FIRMWARE_SAFETY_CONFIG,
  DEFAULT_STEPPER_SAFETY_CONFIG,
  validateSafetyConfig,
  validateStepperSafetyConfig,
  clampStepperSpeed,
  clampStepperSteps,
  clampMotorPWM,
} from '../../src/shared/safety-config';

// ===========================================================================
// Default configs
// ===========================================================================

describe('DEFAULT_FIRMWARE_SAFETY_CONFIG', () => {
  test('passes its own validation', () => {
    const result = validateSafetyConfig(DEFAULT_FIRMWARE_SAFETY_CONFIG);
    expect(result).toEqual({ valid: true, errors: [] });
  });

  test('all fields are defined and positive', () => {
    expect(DEFAULT_FIRMWARE_SAFETY_CONFIG.maxMotorPWM).toBeGreaterThan(0);
    expect(DEFAULT_FIRMWARE_SAFETY_CONFIG.emergencyStopCm).toBeGreaterThan(0);
    expect(DEFAULT_FIRMWARE_SAFETY_CONFIG.speedReduceCm).toBeGreaterThan(0);
    expect(DEFAULT_FIRMWARE_SAFETY_CONFIG.maxContinuousMs).toBeGreaterThan(0);
    expect(DEFAULT_FIRMWARE_SAFETY_CONFIG.hostTimeoutMs).toBeGreaterThan(0);
    expect(DEFAULT_FIRMWARE_SAFETY_CONFIG.minBatteryVoltage).toBeGreaterThan(0);
  });
});

describe('DEFAULT_STEPPER_SAFETY_CONFIG', () => {
  test('passes its own validation', () => {
    const result = validateStepperSafetyConfig(DEFAULT_STEPPER_SAFETY_CONFIG);
    expect(result).toEqual({ valid: true, errors: [] });
  });

  test('all fields are defined and positive', () => {
    expect(DEFAULT_STEPPER_SAFETY_CONFIG.maxStepsPerSecond).toBeGreaterThan(0);
    expect(DEFAULT_STEPPER_SAFETY_CONFIG.maxContinuousSteps).toBeGreaterThan(0);
    expect(DEFAULT_STEPPER_SAFETY_CONFIG.hostHeartbeatMs).toBeGreaterThan(0);
    expect(DEFAULT_STEPPER_SAFETY_CONFIG.maxCoilCurrentMa).toBeGreaterThan(0);
  });
});

// ===========================================================================
// validateSafetyConfig
// ===========================================================================

describe('validateSafetyConfig', () => {
  test('valid full config returns valid: true with no errors', () => {
    const result = validateSafetyConfig({
      maxMotorPWM: 150,
      emergencyStopCm: 10,
      speedReduceCm: 30,
      maxContinuousMs: 20000,
      hostTimeoutMs: 3000,
      minBatteryVoltage: 3.3,
    });
    expect(result).toEqual({ valid: true, errors: [] });
  });

  test('empty partial config is valid (all fields optional)', () => {
    const result = validateSafetyConfig({});
    expect(result).toEqual({ valid: true, errors: [] });
  });

  test('maxMotorPWM: -1 produces error', () => {
    const result = validateSafetyConfig({ maxMotorPWM: -1 });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('maxMotorPWM must be >= 0');
  });

  test('maxMotorPWM: 256 produces error', () => {
    const result = validateSafetyConfig({ maxMotorPWM: 256 });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('maxMotorPWM must be <= 255');
  });

  test('emergencyStopCm: 0 produces error (must be >= 1)', () => {
    const result = validateSafetyConfig({ emergencyStopCm: 0 });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('emergencyStopCm must be >= 1');
  });

  test('emergencyStopCm: 101 produces error', () => {
    const result = validateSafetyConfig({ emergencyStopCm: 101 });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('emergencyStopCm must be <= 100');
  });

  test('speedReduceCm <= emergencyStopCm produces error', () => {
    const result = validateSafetyConfig({ emergencyStopCm: 20, speedReduceCm: 20 });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('speedReduceCm must be greater than emergencyStopCm');
  });

  test('negative maxContinuousMs, hostTimeoutMs, minBatteryVoltage each produce errors', () => {
    const result = validateSafetyConfig({
      maxContinuousMs: -1,
      hostTimeoutMs: -1,
      minBatteryVoltage: -1,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('maxContinuousMs must be >= 0');
    expect(result.errors).toContain('hostTimeoutMs must be >= 0');
    expect(result.errors).toContain('minBatteryVoltage must be >= 0');
    expect(result.errors).toHaveLength(3);
  });
});

// ===========================================================================
// validateStepperSafetyConfig
// ===========================================================================

describe('validateStepperSafetyConfig', () => {
  test('valid full config returns valid: true', () => {
    const result = validateStepperSafetyConfig({
      maxStepsPerSecond: 512,
      maxContinuousSteps: 10000,
      hostHeartbeatMs: 1000,
      maxCoilCurrentMa: 200,
    });
    expect(result).toEqual({ valid: true, errors: [] });
  });

  test('empty partial config is valid', () => {
    const result = validateStepperSafetyConfig({});
    expect(result).toEqual({ valid: true, errors: [] });
  });

  test('maxStepsPerSecond: 0 produces error (must be >= 1)', () => {
    const result = validateStepperSafetyConfig({ maxStepsPerSecond: 0 });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('maxStepsPerSecond must be >= 1');
  });

  test('maxStepsPerSecond: 2049 produces error', () => {
    const result = validateStepperSafetyConfig({ maxStepsPerSecond: 2049 });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('maxStepsPerSecond must be <= 2048');
  });

  test('hostHeartbeatMs: 499 and 10001 each produce errors', () => {
    const low = validateStepperSafetyConfig({ hostHeartbeatMs: 499 });
    expect(low.valid).toBe(false);
    expect(low.errors).toContain('hostHeartbeatMs must be >= 500');

    const high = validateStepperSafetyConfig({ hostHeartbeatMs: 10001 });
    expect(high.valid).toBe(false);
    expect(high.errors).toContain('hostHeartbeatMs must be <= 10000');
  });

  test('maxCoilCurrentMa: -1 produces error', () => {
    const result = validateStepperSafetyConfig({ maxCoilCurrentMa: -1 });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('maxCoilCurrentMa must be >= 0');
  });
});

// ===========================================================================
// clampStepperSpeed
// ===========================================================================

describe('clampStepperSpeed', () => {
  const config = DEFAULT_STEPPER_SAFETY_CONFIG;

  test('speed within range is unchanged', () => {
    expect(clampStepperSpeed(500, config)).toBe(500);
  });

  test('speed above max is clamped to maxStepsPerSecond', () => {
    expect(clampStepperSpeed(2000, config)).toBe(1024);
  });

  test('speed at 0 returns 0', () => {
    expect(clampStepperSpeed(0, config)).toBe(0);
  });

  test('negative speed returns 0', () => {
    expect(clampStepperSpeed(-100, config)).toBe(0);
  });

  test('speed at exact max is unchanged', () => {
    expect(clampStepperSpeed(1024, config)).toBe(1024);
  });
});

// ===========================================================================
// clampStepperSteps
// ===========================================================================

describe('clampStepperSteps', () => {
  const config = DEFAULT_STEPPER_SAFETY_CONFIG;

  test('steps within range is unchanged', () => {
    expect(clampStepperSteps(1000, config)).toBe(1000);
  });

  test('steps above max is clamped to maxContinuousSteps', () => {
    expect(clampStepperSteps(99999, config)).toBe(40960);
  });

  test('steps below -max is clamped to -maxContinuousSteps', () => {
    expect(clampStepperSteps(-99999, config)).toBe(-40960);
  });

  test('negative steps within range is unchanged', () => {
    expect(clampStepperSteps(-5000, config)).toBe(-5000);
  });

  test('steps at exact boundaries is unchanged', () => {
    expect(clampStepperSteps(40960, config)).toBe(40960);
    expect(clampStepperSteps(-40960, config)).toBe(-40960);
  });
});

// ===========================================================================
// clampMotorPWM
// ===========================================================================

describe('clampMotorPWM', () => {
  const config = DEFAULT_FIRMWARE_SAFETY_CONFIG;
  // config: maxMotorPWM=200, emergencyStopCm=8, speedReduceCm=20

  test('no distance: PWM within range is unchanged', () => {
    expect(clampMotorPWM(150, config)).toBe(150);
  });

  test('no distance: PWM above max is clamped to maxMotorPWM', () => {
    expect(clampMotorPWM(255, config)).toBe(200);
  });

  test('no distance: negative PWM returns 0', () => {
    expect(clampMotorPWM(-50, config)).toBe(0);
  });

  test('emergency zone: distance <= emergencyStopCm returns 0', () => {
    expect(clampMotorPWM(200, config, 5)).toBe(0);
    expect(clampMotorPWM(200, config, 8)).toBe(0);
  });

  test('speed reduce zone: distance 14cm gives linear ramp effectiveMax = 100', () => {
    // range = 20 - 8 = 12, progress = 14 - 8 = 6
    // effectiveMax = floor((6/12) * 200) = 100
    expect(clampMotorPWM(255, config, 14)).toBe(100);
  });

  test('safe zone: distance > speedReduceCm allows full maxMotorPWM', () => {
    expect(clampMotorPWM(200, config, 30)).toBe(200);
    expect(clampMotorPWM(255, config, 30)).toBe(200); // still capped by maxMotorPWM
  });

  test('boundary: distance exactly at speedReduceCm allows full max', () => {
    // range = 12, progress = 20 - 8 = 12
    // effectiveMax = floor((12/12) * 200) = 200
    expect(clampMotorPWM(200, config, 20)).toBe(200);
  });
});
