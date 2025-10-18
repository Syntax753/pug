import styles from './HomeScreen.module.css';
import grassImage from '@/assets/layer0/tile_1.png';
import waterImage from '@/assets/layer0/tile_162.png';
import playerImage from '@/assets/persona/pug.png';

interface Position {
  x: number;
  y: number;
}

interface GridProps {
  grid: number[][];
  width: number;
  height: number;
  tileSize: number;
  playerPosition: Position;
}

const cellTypeMapping: { [key: number]: string | undefined } = {
  0: grassImage,
  1: waterImage,
};

function Grid({ grid, width, height, tileSize, playerPosition }: GridProps) {
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
          const isPlayerHere = playerPosition.x === colIndex && playerPosition.y === rowIndex;
          const tileImage = cellTypeMapping[cellValue];
          return (
            <div key={`${rowIndex}-${colIndex}`} className={styles.gridCell}>
              {tileImage && <img src={tileImage} className={styles.tileImage} alt="" />}
              {isPlayerHere && <img src={playerImage} className={styles.entityImage} alt="player" />}
            </div>
          );
        })
      ))}
    </div>
  );
}

export default Grid;