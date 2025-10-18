import styles from './HomeScreen.module.css';
import grassImage from '@/assets/layer0/tile_1.png';
import waterImage from '@/assets/layer0/tile_162.png';
import { Entity } from './HomeScreen';

interface GridProps {
  grid: number[][];
  width: number;
  height: number;
  tileSize: number;
  entities: Entity[];
}

const cellTypeMapping: { [key: number]: string | undefined } = {
  0: grassImage,
  1: waterImage,
};

function Grid({ grid, width, height, tileSize, entities }: GridProps) {
  const gridStyle = {
    gridTemplateColumns: `repeat(${width}, 1fr)`,
    gridTemplateRows: `repeat(${height}, 1fr)`,
    width: `${width * tileSize}px`,
    height: `${height * tileSize}px`,
  };

  return (
    <div className={styles.gridContainer} style={gridStyle}>
      {grid.map((row, rowIndex) => (
        row.map((cellValue, colIndex) => {
          const tileImage = cellTypeMapping[cellValue];
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