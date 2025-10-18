import styles from './HomeScreen.module.css';

interface GridProps {
  grid: number[][];
}

function Grid({ grid }: GridProps) {
  return (
    <div className={styles.gridContainer}>
      {grid.map((row, rowIndex) => (
        row.map((cell, colIndex) => (
          <div key={`${rowIndex}-${colIndex}`} className={`${styles.gridCell} ${styles.grassCell}`} />
        ))
      ))}
    </div>
  );
}

export default Grid;