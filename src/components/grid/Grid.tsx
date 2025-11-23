import styles from '@/homeScreen/HomeScreen.module.css';

import Grassland1 from '@/assets/layer0/tile_1.png';
import Grassland2 from '@/assets/layer0/tile_6.png';
import Grassland3 from '@/assets/layer0/tile_12.png';
import Wall1 from '@/assets/layer0/tile_92.png';
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

const tileMapping: { [key: number]: string | undefined } = {
  1: Grassland1,
  6: Grassland2,
  12: Grassland3,
  92: Wall1,
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
          const bgImage = tileMapping[bgValue];

          const layer1Value = layer1[rowIndex][colIndex];
          const layer1Image = tileMapping[layer1Value];

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