/**
 * Fixture Loader — Load Kaggle House Rooms images for vision E2E tests
 *
 * Loads indoor scene JPEG fixtures as base64 strings ready for VLM inference.
 * Images come from the CC0-licensed Kaggle House Rooms Image Dataset.
 */

import * as fs from 'fs';
import * as path from 'path';

const FIXTURES_DIR = path.join(__dirname, 'indoor_scenes');

/**
 * Scene fixture names matching the Kaggle House Rooms dataset categories.
 * Note: hallway and office are NOT available in this dataset.
 */
export const SCENE_NAMES = [
  'bathroom',
  'bedroom',
  'kitchen',
  'living_room',
] as const;

export type SceneName = (typeof SCENE_NAMES)[number];

export interface SceneFixture {
  name: SceneName;
  imageBase64: string;
  filePath: string;
  sizeBytes: number;
}

/**
 * Load a single scene fixture by name.
 * Returns the image as a base64 string suitable for VLM inference.
 */
export function loadSceneFixture(name: SceneName): SceneFixture {
  const filePath = path.join(FIXTURES_DIR, `${name}.jpg`);

  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Fixture image not found: ${filePath}\n` +
      `Run the download script first:\n` +
      `  KAGGLE_USERNAME=... KAGGLE_KEY=... npx tsx __tests__/navigation/fixtures/download-kaggle-rooms.ts`,
    );
  }

  const buffer = fs.readFileSync(filePath);
  return {
    name,
    imageBase64: buffer.toString('base64'),
    filePath,
    sizeBytes: buffer.length,
  };
}

/**
 * Load all scene fixtures into a keyed record.
 * Throws if any fixture is missing.
 */
export function loadAllSceneFixtures(): Record<SceneName, SceneFixture> {
  const fixtures = {} as Record<SceneName, SceneFixture>;
  for (const name of SCENE_NAMES) {
    fixtures[name] = loadSceneFixture(name);
  }
  return fixtures;
}

/**
 * Check if all fixture images exist and are valid JPEGs under the size limit.
 */
export function validateFixtures(maxSizeBytes = 500 * 1024): {
  valid: boolean;
  errors: string[];
  available: SceneName[];
  missing: SceneName[];
} {
  const errors: string[] = [];
  const available: SceneName[] = [];
  const missing: SceneName[] = [];

  for (const name of SCENE_NAMES) {
    const filePath = path.join(FIXTURES_DIR, `${name}.jpg`);

    if (!fs.existsSync(filePath)) {
      missing.push(name);
      errors.push(`Missing: ${name}.jpg`);
      continue;
    }

    const buffer = fs.readFileSync(filePath);

    // Check JPEG magic bytes (FF D8)
    if (buffer.length < 2 || buffer[0] !== 0xFF || buffer[1] !== 0xD8) {
      errors.push(`Invalid JPEG: ${name}.jpg (bad magic bytes)`);
      continue;
    }

    if (buffer.length > maxSizeBytes) {
      errors.push(`Too large: ${name}.jpg (${(buffer.length / 1024).toFixed(1)} KB > ${(maxSizeBytes / 1024).toFixed(0)} KB limit)`);
      continue;
    }

    available.push(name);
  }

  return {
    valid: errors.length === 0,
    errors,
    available,
    missing,
  };
}

/**
 * Check whether fixture images are available (without throwing).
 * Returns true only if ALL expected fixtures exist.
 */
export function fixturesAvailable(): boolean {
  return SCENE_NAMES.every(name =>
    fs.existsSync(path.join(FIXTURES_DIR, `${name}.jpg`)),
  );
}

/**
 * Get list of which fixtures are present on disk.
 */
export function getAvailableFixtures(): SceneName[] {
  return SCENE_NAMES.filter(name =>
    fs.existsSync(path.join(FIXTURES_DIR, `${name}.jpg`)),
  );
}
