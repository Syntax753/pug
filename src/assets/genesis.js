// Run with Node.js to split a spritesheet into individual tiles
//
// node split-tiles.js

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exit } from 'process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const inputFile = path.resolve(__dirname, 'layer0.png');
const outputDir = path.resolve(__dirname, 'layer0');

async function splitTiles() {
  try {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const image = sharp(inputFile);
    const metadata = await image.metadata();

    const TILE_WIDTH = 16;
    const TILE_HEIGHT = 16;
    const PADDING = 1;

    const tilesX = Math.floor(metadata.width / (TILE_WIDTH + PADDING));
    const tilesY = Math.floor(metadata.height / (TILE_HEIGHT + PADDING));

    console.log('Splitting spritesheet into individual tiles...');

    for (let y = 0; y < tilesY; y++) {
      for (let x = 0; x < tilesX; x++) {
        const tileNumber = y * tilesX + x;
        const outputFile = path.join(outputDir, `tile_${tileNumber}.png`);

        await image
          .clone()
          .extract({
            left: 2 + x * (TILE_WIDTH + PADDING),
            top: 2 + y * (TILE_HEIGHT + PADDING),
            width: TILE_WIDTH,
            height: TILE_HEIGHT,
          })
          .toFile(outputFile);
          exit();
      }
    }

    console.log(`Successfully created ${tilesX * tilesY} tiles in ${outputDir}`);
  } catch (error) {
    console.error('An error occurred during tile splitting:', error);
  }
}

splitTiles();
