import styles from '@/homeScreen/HomeScreen.module.css';

import Grass0 from '@/assets/layer0/grass_0.png';
import Grass1 from '@/assets/layer0/grass_1.png';
import Grass2 from '@/assets/layer0/grass_2.png';
import Grass3 from '@/assets/layer0/grass_3.png';
import Grass4 from '@/assets/layer0/grass_4.png';
import Rock0 from '@/assets/layer1/rock_0.png';
import Rock1 from '@/assets/layer1/rock_1.png';
import Rock2 from '@/assets/layer1/rock_2.png';
import Pug from '@/persona/impl/Pug';
import Roach from '@/persona/impl/Roach';
import RoachMother from '@/persona/impl/RoachMother';

interface GridProps {
  layer0: number[][];
  layer1: number[][];
  entityGrid: (string | number)[][];
  width: number;
  tileSize: number;
}

const pug = new Pug();
const roach = new Roach();
const roachMother = new RoachMother();

// Map layer0 values to grass tiles
const layer0TileMapping: { [key: number]: string | undefined } = {
  1: Grass0,
  6: Grass1,
  12: Grass2,
  // Use all 5 grass variations for more variety
  0: Grass3,
  2: Grass4,
};

// Map layer1 values to rock/obstacle tiles
const layer1TileMapping: { [key: number]: string | undefined } = {
  92: Rock0,  // Primary rock type for walls
  91: Rock1,  // Alternative rock
  90: Rock2,  // Alternative rock
};


function Grid({ layer0, layer1, entityGrid, width, tileSize }: GridProps) {
  const gridStyle = {
    gridTemplateColumns: `repeat(${width}, 1fr)`,
    width: `${width * tileSize}px`,
  };

  const entityImageMapping: { [key: string]: string } = {
    'pug': pug.avatar.South,
    'roach': roach.avatar.South,
    'roachMother': roachMother.avatar.South,
  };

  return (
    <div className={styles.gridContainer} style={gridStyle}>
      {layer0.map((row, rowIndex) => (
        row.map((_, colIndex) => {
          const bgValue = layer0[rowIndex][colIndex];
          const bgImage = layer0TileMapping[bgValue] || Grass0; // Default to Grass0 if not found

          const layer1Value = layer1[rowIndex][colIndex];
          const layer1Image = layer1TileMapping[layer1Value];

          const entityType = entityGrid[rowIndex][colIndex];
          const entityImage = entityType ? entityImageMapping[entityType] : undefined;

          return (
            <div key={`${rowIndex}-${colIndex}`} className={styles.gridCell}>
              {bgImage && <img src={bgImage} className={styles.tileImage} alt="background" />}
              {layer1Image && <img src={layer1Image} className={styles.tileImage} style={{ zIndex: 1 }} alt="obstacle" />}
              {entityImage && <img src={entityImage} className={styles.entityImage} style={{ zIndex: 2 }} alt="entity" />}
            </div>
          );
        })
      ))}
    </div>
  );
}

export default Grid;