import { useEffect, useState } from "react";

import WaitingEllipsis from '@/components/waitingEllipsis/WaitingEllipsis';
import { init } from "./interactions/initialization";
import { GENERATING, submitPrompt } from "./interactions/prompt";
import ContentButton from '@/components/contentButton/ContentButton';
import LoadScreen from '@/loadScreen/LoadScreen';
import TopBar from '@/components/topBar/TopBar';
import Grid from "./Grid";
import styles from './HomeScreen.module.css';
import layer0 from '@/assets/layer0.png';

const GRID_WIDTH = 20;
const GRID_HEIGHT = 20;

interface Position {
  x: number;
  y: number;
}

function HomeScreen() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [prompt, setPrompt] = useState<string>('');
  const [responseText, setResponseText] = useState<string>('');
  const [tileSize, setTileSize] = useState<number>(32);
  const [playerPosition] = useState<Position>({ x: Math.floor(GRID_WIDTH / 2), y: Math.floor(GRID_HEIGHT / 2) });
  const [grid] = useState<number[][]>(() => {
    const newGrid = Array(GRID_HEIGHT).fill(0).map(() => Array(GRID_WIDTH).fill(0));
    // Add a small pond in the center of the grid
    const centerX = Math.floor(GRID_WIDTH / 2);
    const centerY = Math.floor(GRID_HEIGHT / 2);

    // Safely create a small pond, ensuring it's within grid bounds
    if (GRID_HEIGHT > 1 && GRID_WIDTH > 3) {
      newGrid[centerY][centerX] = 1;
      newGrid[centerY - 1][centerX + 1] = 1;
    }
    return newGrid;
  });
  
  const handleGenerateClick = async () => {
    const image = new Image();
    image.src = layer0;
    image.onload = () => {
      const TILE_WIDTH = 16;
      const TILE_HEIGHT = 16;
      const PADDING = 1;

      const canvas = document.createElement('canvas');
      canvas.width = TILE_WIDTH;
      canvas.height = TILE_HEIGHT;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        console.error('Could not get canvas context');
        return;
      }

      // Extract the first tile (tile_0)
      const x = 0;
      const y = 0;
      const sx = 2 + x * (TILE_WIDTH + PADDING);
      const sy = 2 + y * (TILE_HEIGHT + PADDING);

      ctx.drawImage(image, sx, sy, TILE_WIDTH, TILE_HEIGHT, 0, 0, TILE_WIDTH, TILE_HEIGHT);

      const dataUrl = canvas.toDataURL('image/png');
      
      // The user wants to process only a single file, like in genesis.js.
      // We will call submitPrompt for the first tile.
      const newPrompt = `describe this image ${dataUrl}`;
      submitPrompt(newPrompt, setPrompt, _onRespond);
    };
  };

  useEffect(() => {
    if (isLoading) return;

    init().then(isLlmConnected => { 
      if (!isLlmConnected) setIsLoading(true);
    });
  }, [isLoading]);

  if (isLoading) return <LoadScreen onComplete={() => setIsLoading(false)} />;

  function _onKeyDown(e:React.KeyboardEvent<HTMLInputElement>) {
    if(e.key === 'Enter' && prompt !== '') submitPrompt(prompt, setPrompt, _onRespond);
  }

  function _onRespond(text:string) {
    setResponseText(text);
  }

  function zoomIn() {
    setTileSize(prevSize => prevSize + 8);
  }

  function zoomOut() {
    setTileSize(prevSize => Math.max(16, prevSize - 8)); // Don't allow zooming out smaller than 16px
  }

  const response = responseText === GENERATING ? <p>hmmm<WaitingEllipsis/></p> : <p>{responseText}</p>
  
  return (
    <div className={styles.container}>
      <TopBar />
      <div className={styles.content}>
        <img src={layer0} alt="layer0 spritesheet" style={{ maxWidth: '100%', marginBottom: '1rem' }} />
        <ContentButton text="Generate" onClick={handleGenerateClick} />
        <Grid grid={grid} width={GRID_WIDTH} height={GRID_HEIGHT} playerPosition={playerPosition} tileSize={tileSize} />
        <div className={styles.prompt}>
          <p><input type="text" className={styles.promptBox} placeholder="What now?" value={prompt} onKeyDown={_onKeyDown} onChange={(e) => setPrompt(e.target.value)} />
          <ContentButton text="Send" onClick={() => submitPrompt(prompt, setPrompt, _onRespond)} />
          <ContentButton text="Zoom In" onClick={zoomIn} />
          <ContentButton text="Zoom Out" onClick={zoomOut} /></p>
          {response}
        </div>
      </div>
    </div>
  );
}

export default HomeScreen;