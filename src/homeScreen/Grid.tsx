import { useMemo } from 'react';
import grassImage1 from '@/assets/layer0/tile_1.png';
import grassImage6 from '@/assets/layer0/tile_6.png';
import waterImage from '@/assets/layer0/tile_162.png';
import styles from '@/homeScreen/HomeScreen.module.css';
import { Entity } from '@/persona/types';

interface GridProps {
  grid: number[][];
  width: number;
  height: number;
  tileSize: number;
  entities: Entity[];
}

const grassImages = [grassImage1, grassImage6];

const cellTypeMapping: { [key: number]: string | undefined } = {
  // Grass (0) is handled dynamically
  1: waterImage,
};

// Simple noise function to create clusters
function simpleNoise(x: number, y: number, seed: number = 0): number {
  const n = x + y * 57 + seed;
  const x1 = (n << 13) ^ n;
  // Return a value between 0 and 1
  return (1.0 - ((x1 * (x1 * x1 * 15731 + 789221) + 1376312589) & 0x7fffffff) / 1073741824.0);
}

function Grid({ grid, width, height, tileSize, entities }: GridProps) {
  const gridStyle = {
    gridTemplateColumns: `repeat(${width}, 1fr)`,
    gridTemplateRows: `repeat(${height}, 1fr)`,
    width: `${width * tileSize}px`,
    height: `${height * tileSize}px`,
  };

  // Generate a random seed once per component instance to vary the grass pattern
  const seed = useMemo(() => Math.random() * 1000, []);

  return (
    <div className={styles.gridContainer} style={gridStyle}>
      {grid.map((row, rowIndex) => (
        row.map((cellValue, colIndex) => {
          let tileImage;
          if (cellValue === 0) {
            // Use noise to select grass tile for a clustering effect
            const scale = 0.2; // Adjust for bigger or smaller clusters
            const noiseValue = simpleNoise(colIndex * scale, rowIndex * scale, seed);
            const threshold = 0.5; // Adjust threshold to change tile distribution

            tileImage = noiseValue > threshold ? grassImages[0] : grassImages[1];
          } else {
            tileImage = cellTypeMapping[cellValue];
          }
          const entityHere = entities.find(e => e.position.x === colIndex && e.position.y === rowIndex);

          return (
            <div key={`${rowIndex}-${colIndex}`} className={styles.gridCell}>
              {tileImage && <img src={tileImage} className={styles.tileImage} alt="" />}
              {entityHere && <img src={entityHere.persona.avatar.North} className={styles.entityImage} alt="entity" />}
            </div>
          );
        })
      ))}
    </div>
  );
}

export default Grid;