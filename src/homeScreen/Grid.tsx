import styles from './HomeScreen.module.css';
import grassImage from '@/assets/layer0/grass.png';

interface GridProps {
  grid: number[][];
}

const cellTypeMapping: { [key: number]: string | undefined } = {
  0: grassImage,
  // In the future, you can add more mappings here, e.g.:
  // 1: styles.waterCell,
  // 1: waterImage
};

function Grid({ grid }: GridProps) {
  return (
    <div className={styles.gridContainer}>
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