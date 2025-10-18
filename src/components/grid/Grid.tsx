import grassImage from '@/assets/layer0/tile_1.png';
import styles from '@/homeScreen/HomeScreen.module.css';
import Pug from '@/persona/impl/Pug';
import Roach from '@/persona/impl/Roach';

interface GridProps {
  layer0: number[][];
  entityGrid: number[][];
  width: number;
  height: number;
  tileSize: number;
}

const pug = new Pug();
const roach = new Roach();

const tileMapping: { [key: number]: string | undefined } = {
  0: grassImage,
};

const entityMapping: { [key: number]: string | undefined } = {
  1: pug.avatar.South,
  2: roach.avatar.South,
};

function Grid({ layer0, entityGrid, width, height, tileSize }: GridProps) {
  const gridStyle = {
    gridTemplateColumns: `repeat(${width}, 1fr)`,
    gridTemplateRows: `repeat(${height}, 1fr)`,
    width: `${width * tileSize}px`,
    height: `${height * tileSize}px`,
  };

  return (
    <div className={styles.gridContainer} style={gridStyle}>
      {layer0.map((row, rowIndex) => (
        row.map((_, colIndex) => {
          const baseTileImage = tileMapping[0]; // Always render grass as the base
          const entityValue = entityGrid[rowIndex][colIndex];
          const entityImage = entityMapping[entityValue];

          return (
            <div key={`${rowIndex}-${colIndex}`} className={styles.gridCell}>
              {baseTileImage && <img src={baseTileImage} className={styles.tileImage} alt="" />}
              {entityImage && <img src={entityImage} className={styles.entityImage} alt="entity" />}
            </div>
          );
        })
      ))}
    </div>
  );
}

export default Grid;