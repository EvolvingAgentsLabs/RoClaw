#!/usr/bin/env npx tsx
/**
 * Download Indoor Room Images from Kaggle House Rooms Dataset
 *
 * Downloads one representative image per room type from the CC0-licensed
 * "House Rooms Image Dataset" by RobinReni on Kaggle.
 *
 * Source: https://www.kaggle.com/datasets/robinreni/house-rooms-image-dataset
 * License: CC0 Public Domain
 *
 * Usage:
 *   KAGGLE_USERNAME=your-user KAGGLE_KEY=your-key npx tsx __tests__/navigation/fixtures/download-kaggle-rooms.ts
 *
 * Get Kaggle API credentials at: https://www.kaggle.com/settings → API → Create New Token
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// =============================================================================
// Configuration
// =============================================================================

const KAGGLE_USERNAME = process.env.KAGGLE_USERNAME;
const KAGGLE_KEY = process.env.KAGGLE_KEY;

if (!KAGGLE_USERNAME || !KAGGLE_KEY) {
  console.error('Error: KAGGLE_USERNAME and KAGGLE_KEY environment variables are required.');
  console.error('Get credentials at: https://www.kaggle.com/settings → API → Create New Token');
  console.error('');
  console.error('Usage:');
  console.error('  KAGGLE_USERNAME=your-user KAGGLE_KEY=your-key npx tsx __tests__/navigation/fixtures/download-kaggle-rooms.ts');
  process.exit(1);
}

const DATASET = 'robinreni/house-rooms-image-dataset';
const API_URL = `https://www.kaggle.com/api/v1/datasets/download/${DATASET}`;
const OUTPUT_DIR = path.join(__dirname, 'indoor_scenes');
const TEMP_DIR = path.join(__dirname, '.tmp_kaggle_download');
const TEMP_ZIP = path.join(TEMP_DIR, 'dataset.zip');

/** Target image dimensions */
const TARGET_WIDTH = 640;
const TARGET_HEIGHT = 480;

/**
 * Room categories in the Kaggle dataset mapped to our fixture names.
 * The dataset folder structure is: House_Room_Dataset/{Category}/*.png
 */
const ROOM_CATEGORIES: Array<{
  /** Folder name in the Kaggle zip */
  kaggleFolder: string;
  /** Output fixture name */
  fixtureName: string;
  /** Description for logging */
  description: string;
}> = [
  { kaggleFolder: 'Bathroom', fixtureName: 'bathroom', description: 'Bathroom with fixtures' },
  { kaggleFolder: 'Bedroom', fixtureName: 'bedroom', description: 'Bedroom with bed' },
  { kaggleFolder: 'Kitchen', fixtureName: 'kitchen', description: 'Kitchen with appliances' },
  { kaggleFolder: 'Livingroom', fixtureName: 'living_room', description: 'Living room with seating' },
];

// =============================================================================
// Download & Extract
// =============================================================================

function isValidJPEG(buffer: Buffer): boolean {
  return buffer.length > 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
}

function isValidImage(filePath: string): boolean {
  if (!fs.existsSync(filePath)) return false;
  const buffer = fs.readFileSync(filePath);
  // Check for JPEG or PNG magic bytes
  const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8;
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  return isJpeg || isPng;
}

async function downloadDataset(): Promise<void> {
  console.log(`Downloading dataset: ${DATASET}`);
  console.log(`API URL: ${API_URL}\n`);

  const auth = Buffer.from(`${KAGGLE_USERNAME}:${KAGGLE_KEY}`).toString('base64');

  const response = await fetch(API_URL, {
    headers: {
      'Authorization': `Basic ${auth}`,
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Kaggle API error ${response.status}: ${response.statusText}\n${body}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  fs.writeFileSync(TEMP_ZIP, buffer);
  console.log(`Downloaded: ${(buffer.length / 1024 / 1024).toFixed(1)} MB\n`);
}

function extractDataset(): void {
  console.log('Extracting...');
  const extractDir = path.join(TEMP_DIR, 'extracted');
  if (fs.existsSync(extractDir)) {
    fs.rmSync(extractDir, { recursive: true });
  }
  fs.mkdirSync(extractDir, { recursive: true });

  execSync(`unzip -q -o "${TEMP_ZIP}" -d "${extractDir}"`, { stdio: 'pipe' });
  console.log('Extracted successfully.\n');
}

function findImagesInDir(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
    .sort()
    .map(f => path.join(dir, f));
}

/**
 * Recursively search for a directory matching the category name.
 * The zip structure may vary (e.g., House_Room_Dataset/Kitchen/ or just Kitchen/).
 */
function findCategoryDir(baseDir: string, categoryName: string): string | null {
  const entries = fs.readdirSync(baseDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const fullPath = path.join(baseDir, entry.name);

    if (entry.name.toLowerCase() === categoryName.toLowerCase()) {
      return fullPath;
    }

    // Recurse one level deep
    const nested = findCategoryDir(fullPath, categoryName);
    if (nested) return nested;
  }

  return null;
}

/**
 * Convert an image to JPEG at target dimensions using available system tools.
 * Falls back to simple copy if no resize tool is available.
 */
function convertAndResize(srcPath: string, dstPath: string): void {
  const ext = path.extname(srcPath).toLowerCase();

  try {
    // macOS: use sips (built-in)
    if (process.platform === 'darwin') {
      if (ext === '.png' || ext === '.webp') {
        // Convert to JPEG first
        const tmpJpg = dstPath + '.tmp.jpg';
        execSync(`sips -s format jpeg "${srcPath}" --out "${tmpJpg}" 2>/dev/null`, { stdio: 'pipe' });
        execSync(`sips --resampleWidth ${TARGET_WIDTH} --resampleHeight ${TARGET_HEIGHT} "${tmpJpg}" --out "${dstPath}" 2>/dev/null`, { stdio: 'pipe' });
        if (fs.existsSync(tmpJpg)) fs.unlinkSync(tmpJpg);
      } else {
        execSync(`sips --resampleWidth ${TARGET_WIDTH} --resampleHeight ${TARGET_HEIGHT} "${srcPath}" --out "${dstPath}" 2>/dev/null`, { stdio: 'pipe' });
      }
      return;
    }

    // Linux: try convert (ImageMagick)
    try {
      execSync(`convert "${srcPath}" -resize ${TARGET_WIDTH}x${TARGET_HEIGHT}! "${dstPath}" 2>/dev/null`, { stdio: 'pipe' });
      return;
    } catch { /* not available */ }
  } catch {
    // Fall through to copy
  }

  // Fallback: just copy the file
  fs.copyFileSync(srcPath, dstPath);
}

function selectAndProcessImages(): { name: string; success: boolean; size: string; error?: string }[] {
  const extractDir = path.join(TEMP_DIR, 'extracted');
  const results: { name: string; success: boolean; size: string; error?: string }[] = [];

  for (const cat of ROOM_CATEGORIES) {
    process.stdout.write(`  ${cat.fixtureName.padEnd(15)} `);

    const categoryDir = findCategoryDir(extractDir, cat.kaggleFolder);
    if (!categoryDir) {
      console.log(`SKIP — folder "${cat.kaggleFolder}" not found`);
      results.push({ name: cat.fixtureName, success: false, size: '0', error: `Folder not found: ${cat.kaggleFolder}` });
      continue;
    }

    const images = findImagesInDir(categoryDir);
    if (images.length === 0) {
      console.log('SKIP — no images in folder');
      results.push({ name: cat.fixtureName, success: false, size: '0', error: 'No images found' });
      continue;
    }

    // Pick an image from the middle of the sorted list (avoids edge cases)
    const pickIndex = Math.min(Math.floor(images.length / 2), images.length - 1);
    const srcImage = images[pickIndex];
    const dstImage = path.join(OUTPUT_DIR, `${cat.fixtureName}.jpg`);

    try {
      convertAndResize(srcImage, dstImage);

      if (!fs.existsSync(dstImage)) {
        throw new Error('Output file not created');
      }

      const stats = fs.statSync(dstImage);
      const sizeKB = (stats.size / 1024).toFixed(1);
      console.log(`OK (${sizeKB} KB) — from ${path.basename(srcImage)} [${images.length} available]`);
      results.push({ name: cat.fixtureName, success: true, size: `${sizeKB} KB` });
    } catch (err) {
      console.log(`FAILED: ${err instanceof Error ? err.message : err}`);
      results.push({ name: cat.fixtureName, success: false, size: '0', error: String(err) });
    }
  }

  return results;
}

// =============================================================================
// Hallway & Office — not in Kaggle dataset, generate placeholder note
// =============================================================================

function createPlaceholderNote(): void {
  const note = path.join(OUTPUT_DIR, 'README.md');
  if (!fs.existsSync(note)) {
    fs.writeFileSync(note, [
      '# Indoor Scene Fixtures',
      '',
      'Downloaded from: https://www.kaggle.com/datasets/robinreni/house-rooms-image-dataset',
      'License: CC0 Public Domain',
      '',
      'Room types available from Kaggle: bathroom, bedroom, dining_room, kitchen, living_room',
      '',
      'Note: hallway and office are not in this dataset.',
      'If needed, add them manually from another CC0 source.',
      '',
    ].join('\n'));
  }
}

// =============================================================================
// Cleanup
// =============================================================================

function cleanup(): void {
  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  }
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  console.log('=== Kaggle House Rooms Dataset Downloader ===\n');
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log(`Target: ${TARGET_WIDTH}x${TARGET_HEIGHT} JPEG\n`);

  // Ensure directories exist
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(TEMP_DIR, { recursive: true });

  try {
    // Step 1: Download
    await downloadDataset();

    // Step 2: Extract
    extractDataset();

    // Step 3: Select and process images
    console.log('Selecting images:');
    const results = selectAndProcessImages();

    // Step 4: Create README
    createPlaceholderNote();

    // Summary
    const successCount = results.filter(r => r.success).length;
    console.log(`\n=== Summary ===`);
    console.log(`Processed: ${successCount}/${ROOM_CATEGORIES.length} room types`);

    if (results.some(r => !r.success)) {
      console.log('\nMissing:');
      for (const r of results.filter(r => !r.success)) {
        console.log(`  - ${r.name}: ${r.error}`);
      }
    }

    console.log('\nFixture files:');
    for (const r of results.filter(r => r.success)) {
      console.log(`  ${OUTPUT_DIR}/${r.name}.jpg (${r.size})`);
    }

    console.log('\nNote: hallway and office rooms are not in this dataset.');
    console.log('The vision tests will use the available room types.');
  } finally {
    // Always cleanup temp files
    console.log('\nCleaning up temp files...');
    cleanup();
  }
}

main().catch((err) => {
  cleanup();
  console.error('Fatal error:', err);
  process.exit(1);
});
