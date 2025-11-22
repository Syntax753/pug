import styles from '@/homeScreen/HomeScreen.module.css';

import Tile1 from '@/assets/layer0/tile_1.png';
import Tile6 from '@/assets/layer0/tile_6.png';
import Tile12 from '@/assets/layer0/tile_12.png';
import Pug from '@/persona/impl/Pug';
import Roach from '@/persona/impl/Roach';
import RoachMother from '@/persona/impl/RoachMother';

interface GridProps {
  layer0: number[][];
  entityGrid: (string | number)[][];
  width: number;
  tileSize: number;
}

const pug = new Pug();
const roach = new Roach();
const roachMother = new RoachMother();

const tileMapping: { [key: number]: string | undefined } = {
  1: Tile1,
  6: Tile6,
  12: Tile12,
};


function Grid({ layer0, entityGrid, width, tileSize }: GridProps) {
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
          const bgImage = tileMapping[bgValue];

          const entityType = entityGrid[rowIndex][colIndex];
          const entityImage = entityType ? entityImageMapping[entityType] : undefined;

          return (
            <div key={`${rowIndex}-${colIndex}`} className={styles.gridCell}>
              {bgImage && <img src={bgImage} className={styles.tileImage} alt="background" />}
              {entityImage && <img src={entityImage} className={styles.entityImage} alt="entity" />}
            </div>
          );
        })
      ))}
    </div>
  );
}

export default Grid;