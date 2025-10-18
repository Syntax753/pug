import styles from './HomeScreen.module.css';

interface GridProps {
  grid: number[][];
}

const cellTypeMapping: { [key: number]: string } = {
  0: styles.grassCell,
  // In the future, you can add more mappings here, e.g.:
  // 1: styles.waterCell,
};

function Grid({ grid }: GridProps) {
  return (
    <div className={styles.gridContainer}>
      {grid.map((row, rowIndex) => (
        row.map((cellValue, colIndex) => {
          const cellClass = cellTypeMapping[cellValue] || '';
          return <div key={`${rowIndex}-${colIndex}`} className={`${styles.gridCell} ${cellClass}`} />;
        })
      ))}
    </div>
  );
}

export default Grid;