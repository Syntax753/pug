/**
 * Generates sprite images for dynamically created enemies
 * Uses HTML5 Canvas to render letters on colored backgrounds
 */

const spriteCache = new Map<string, string>();

/**
 * Simple hash function to generate consistent colors from a letter
 */
function hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

/**
 * Generate a sprite from a letter
 * @param letter - The letter to render (will use first character)
 * @param size - Size of the sprite in pixels (default 64)
 * @returns Data URL of the generated sprite
 */
export function generateLetterSprite(letter: string, size: number = 64): string {
    const char = letter.charAt(0).toUpperCase();

    // Check cache first
    const cacheKey = `${char}_${size}`;
    if (spriteCache.has(cacheKey)) {
        return spriteCache.get(cacheKey)!;
    }

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('Could not get canvas context');
    }

    // Generate consistent color from letter
    const hash = hashCode(char);
    const hue = hash % 360;
    const saturation = 60 + (hash % 30); // 60-90%
    const lightness = 40 + (hash % 20);  // 40-60%

    // Draw background with gradient
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, `hsl(${hue}, ${saturation}%, ${lightness + 10}%)`);
    gradient.addColorStop(1, `hsl(${hue}, ${saturation}%, ${lightness - 10}%)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    // Draw border
    ctx.strokeStyle = `hsl(${hue}, ${saturation}%, ${lightness - 20}%)`;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, size - 2, size - 2);

    // Draw letter
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${size * 0.6}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillText(char, size / 2, size / 2);

    // Convert to data URL
    const dataUrl = canvas.toDataURL('image/png');

    // Cache it
    spriteCache.set(cacheKey, dataUrl);

    return dataUrl;
}

/**
 * Clear the sprite cache
 */
export function clearSpriteCache(): void {
    spriteCache.clear();
}
