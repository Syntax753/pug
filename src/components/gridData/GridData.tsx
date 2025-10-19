import React from 'react';

interface GridDataProps {
  grid: number[][];
}

const GridData: React.FC<GridDataProps> = ({ grid }) => {
  return (
    <div style={{ fontFamily: 'monospace', whiteSpace: 'pre', lineHeight: '1.2', backgroundColor: '#f0f0f0', padding: '1rem', borderRadius: '4px' }}>
      {grid.map((row, rowIndex) => (
        <div key={rowIndex}>
          {row.map(cell => cell.toString().padStart(2, ' ')).join(' ')}
        </div>
      ))}
    </div>
  );
};

export default GridData;