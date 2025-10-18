// Run with Node.js to split a spritesheet into individual tiles
//
// node split-tiles.js

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const TILE_WIDTH = 32;
const TILE_HEIGHT = 32;
const TILES_X = 10;
const TILES_Y = 8;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const inputFile = path.resolve(__dirname, 'layer0.webp');
const outputDir = path.resolve(__dirname, '../layer0');

async function splitTiles() {
  try {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const image = sharp(inputFile);
    console.log('Splitting spritesheet into individual tiles...');

    for (let y = 0; y < TILES_Y; y++) {
      for (let x = 0; x < TILES_X; x++) {
        const tileNumber = y * TILES_X + x;
        const outputFile = path.join(outputDir, `tile_${tileNumber}.png`);

        await image
          .clone()
          .extract({ left: x * TILE_WIDTH, top: y * TILE_HEIGHT, width: TILE_WIDTH, height: TILE_HEIGHT })
          .toFile(outputFile);
      }
    }

    console.log(`Successfully created ${TILES_X * TILES_Y} tiles in ${outputDir}`);
  } catch (error) {
    console.error('An error occurred during tile splitting:', error);
  }
}

splitTiles();
