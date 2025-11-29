// Procedural tile generator for grassland (layer0) and rocks (layer1)
// Run with: node src/assets/generateTiles.js

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TILE_SIZE = 64;
const PIXEL_SIZE = 16; // Create 16x16 grid, then scale to 64x64 for pixel art effect
const SEED = 12345; // Fixed seed for consistency

// Seeded random number generator
class SeededRandom {
    constructor(seed) {
        this.seed = seed;
    }

    next() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }

    nextInt(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }
}

// Create a pixel art buffer by scaling up from a smaller grid
function createPixelArtBuffer(pixelGrid) {
    const scale = TILE_SIZE / PIXEL_SIZE;
    const buffer = Buffer.alloc(TILE_SIZE * TILE_SIZE * 4);

    for (let y = 0; y < TILE_SIZE; y++) {
        for (let x = 0; x < TILE_SIZE; x++) {
            const pixelX = Math.floor(x / scale);
            const pixelY = Math.floor(y / scale);
            const color = pixelGrid[pixelY][pixelX];
            const idx = (y * TILE_SIZE + x) * 4;
            buffer[idx] = color.r;
            buffer[idx + 1] = color.g;
            buffer[idx + 2] = color.b;
            buffer[idx + 3] = color.a;
        }
    }

    return buffer;
}

// Generate grassland tile
function generateGrasslandTile(variant, random) {
    const grid = [];

    // Base grass colors (healthy green)
    const baseColors = [
        { r: 76, g: 153, b: 76, a: 255 },    // Healthy green
        { r: 85, g: 167, b: 85, a: 255 },    // Slightly lighter
        { r: 68, g: 140, b: 68, a: 255 },    // Slightly darker
        { r: 80, g: 160, b: 80, a: 255 },    // Medium
    ];

    // Grass tuft color (darker)
    const tuftColor = { r: 50, g: 120, b: 50, a: 255 };

    // Initialize grid with base color variations
    for (let y = 0; y < PIXEL_SIZE; y++) {
        grid[y] = [];
        for (let x = 0; x < PIXEL_SIZE; x++) {
            grid[y][x] = baseColors[random.nextInt(0, baseColors.length - 1)];
        }
    }

    // Add occasional grass tufts (small dark spots)
    const tuftCount = random.nextInt(3, 6 + variant);
    for (let i = 0; i < tuftCount; i++) {
        const x = random.nextInt(0, PIXEL_SIZE - 1);
        const y = random.nextInt(0, PIXEL_SIZE - 1);

        // Create small tuft pattern (1-3 pixels)
        grid[y][x] = tuftColor;
        if (random.next() > 0.5 && x < PIXEL_SIZE - 1) {
            grid[y][x + 1] = tuftColor;
        }
        if (random.next() > 0.7 && y < PIXEL_SIZE - 1) {
            grid[y + 1][x] = tuftColor;
        }
    }

    return grid;
}

// Generate rock/obstacle tile
function generateRockTile(variant, random) {
    const grid = [];

    // Dark, ominous colors for rocks
    const rockColors = [
        { r: 40, g: 40, b: 45, a: 255 },     // Very dark gray
        { r: 35, g: 35, b: 40, a: 255 },     // Darker
        { r: 45, g: 45, b: 50, a: 255 },     // Slightly lighter
        { r: 30, g: 30, b: 35, a: 255 },     // Very dark
    ];

    // Highlight color (for edges)
    const highlightColor = { r: 55, g: 55, b: 60, a: 255 };

    // Shadow color (very dark)
    const shadowColor = { r: 20, g: 20, b: 25, a: 255 };

    // Initialize with transparent
    for (let y = 0; y < PIXEL_SIZE; y++) {
        grid[y] = [];
        for (let x = 0; x < PIXEL_SIZE; x++) {
            grid[y][x] = { r: 0, g: 0, b: 0, a: 0 };
        }
    }

    // Create rock shape (roughly centered, irregular)
    const centerX = PIXEL_SIZE / 2;
    const centerY = PIXEL_SIZE / 2;
    const baseRadius = 5 + variant;

    for (let y = 0; y < PIXEL_SIZE; y++) {
        for (let x = 0; x < PIXEL_SIZE; x++) {
            const dx = x - centerX;
            const dy = y - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Add some randomness to create irregular edges
            const noise = random.next() * 2;

            if (distance < baseRadius + noise) {
                // Main rock body
                grid[y][x] = rockColors[random.nextInt(0, rockColors.length - 1)];

                // Add highlights on top/left edges
                if (y < centerY && x < centerX && random.next() > 0.6) {
                    grid[y][x] = highlightColor;
                }

                // Add shadows on bottom/right edges
                if (y > centerY && x > centerX && random.next() > 0.6) {
                    grid[y][x] = shadowColor;
                }
            }
        }
    }

    return grid;
}

async function generateTiles() {
    try {
        console.log('Starting procedural tile generation...');

        // Create output directories
        const layer0Dir = path.resolve(__dirname, 'layer0');
        const layer1Dir = path.resolve(__dirname, 'layer1');

        if (!fs.existsSync(layer0Dir)) {
            fs.mkdirSync(layer0Dir, { recursive: true });
        }
        if (!fs.existsSync(layer1Dir)) {
            fs.mkdirSync(layer1Dir, { recursive: true });
        }

        // Generate grassland tiles (layer0) - 5 variants
        console.log('Generating grassland tiles...');
        for (let i = 0; i < 5; i++) {
            const random = new SeededRandom(SEED + i * 100);
            const pixelGrid = generateGrasslandTile(i, random);
            const buffer = createPixelArtBuffer(pixelGrid);

            await sharp(buffer, {
                raw: {
                    width: TILE_SIZE,
                    height: TILE_SIZE,
                    channels: 4
                }
            })
                .png()
                .toFile(path.join(layer0Dir, `grass_${i}.png`));

            console.log(`  Created grass_${i}.png`);
        }

        // Generate rock tiles (layer1) - 3 variants
        console.log('Generating rock tiles...');
        for (let i = 0; i < 3; i++) {
            const random = new SeededRandom(SEED + 1000 + i * 100);
            const pixelGrid = generateRockTile(i, random);
            const buffer = createPixelArtBuffer(pixelGrid);

            await sharp(buffer, {
                raw: {
                    width: TILE_SIZE,
                    height: TILE_SIZE,
                    channels: 4
                }
            })
                .png()
                .toFile(path.join(layer1Dir, `rock_${i}.png`));

            console.log(`  Created rock_${i}.png`);
        }

        console.log('✓ Tile generation complete!');
        console.log(`  Layer0 (grassland): ${layer0Dir}`);
        console.log(`  Layer1 (rocks): ${layer1Dir}`);

    } catch (error) {
        console.error('Error during tile generation:', error);
        process.exit(1);
    }
}

generateTiles();
