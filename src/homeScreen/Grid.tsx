import styles from './HomeScreen.module.css';
import grassImage from '@/assets/layer0/tile_1.png';
import waterImage from '@/assets/layer0/tile_162.png';

interface GridProps {
  grid: number[][];
  width: number;
  height: number;
}

const cellTypeMapping: { [key: number]: string | undefined } = {
  0: grassImage,
  1: waterImage,
};

function Grid({ grid, width, height }: GridProps) {
  const gridStyle = {
    gridTemplateColumns: `repeat(${width}, 1fr)`,
    gridTemplateRows: `repeat(${height}, 1fr)`,
  };

  return (
    <div className={styles.gridContainer} style={gridStyle}>
      {grid.map((row, rowIndex) => (
        row.map((cellValue, colIndex) => {
          const tileImage = cellTypeMapping[cellValue];
          return (
            <div key={`${rowIndex}-${colIndex}`} className={styles.gridCell}>
              {tileImage && <img src={tileImage} className={styles.tileImage} alt="" />}
            </div>
          );
        })
      ))}
    </div>
  );
}

export default Grid;