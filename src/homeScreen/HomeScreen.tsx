import { useEffect, useState } from "react";

import WaitingEllipsis from '@/components/waitingEllipsis/WaitingEllipsis';
import ContentButton from '@/components/contentButton/ContentButton';
import LoadScreen from '@/loadScreen/LoadScreen';
import TopBar from '@/components/topBar/TopBar';
import Grid from '@/components/grid/Grid';
import GridData from '@/components/grid/GridData';
import { GENERATING, submitPrompt } from '@/homeScreen/interactions/prompt';
import { Entity } from '@/persona/types';
import styles from '@/homeScreen/HomeScreen.module.css';
import Pug from '@/persona/impl/Pug';
import Roach from '@/persona/impl/Roach';

const GRID_WIDTH = 20;
const GRID_HEIGHT = 20;

function HomeScreen() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [prompt, setPrompt] = useState<string>('');
  const [responseText, setResponseText] = useState<string>('');
  const [tileSize, setTileSize] = useState<number>(32);
  const [gameLog, setGameLog] = useState<string[]>(['Game started. Press Space to begin.']);
  const [turn, setTurn] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(true);

  const [entities] = useState<Entity[]>([
    { id: 1, persona: new Pug(), position: { x: 1, y: 1 } },
    { id: 2, persona: new Roach(), position: { x: 3, y: 3 } },
  ]);

  const [layer0] = useState<number[][]>(() => {
    const newGrid = Array(GRID_HEIGHT).fill(0).map(() => Array(GRID_WIDTH).fill(0));
    // For now, just fill with 0s. The Grid component will handle tile variations.
    // You can add more complex terrain generation here later.
    return newGrid;
  });

  const [entityGrid] = useState<number[][]>(() => {
    const newGrid = Array(GRID_HEIGHT).fill(0).map(() => Array(GRID_WIDTH).fill(0));
    for (const entity of entities) {
      newGrid[entity.position.y][entity.position.x] = entity.id;
    }
    return newGrid;
  });

  useEffect(() => {
    if (isLoading || isPaused) return;

    // Game Loop
    const gameLoop = () => {
      const newLog: string[] = [];
      newLog.push(`Starting Turn ${turn + 1}`);

      // First pass: Player
      for (const entity of entities) {
        if (entity.persona.isPlayer) {
          newLog.push("Your move");
        }
      }

      // Second pass: Enemies
      for (const entity of entities) {
        if (!entity.persona.isPlayer) {
          newLog.push(`${entity.persona.constructor.name} to move`);
        }
      }

      newLog.push("Hit Space to continue");
      setGameLog(prevLog => [...prevLog, ...newLog].slice(-10));
      setTurn(t => t + 1);
      setIsPaused(true);
    };

    const timerId = setTimeout(gameLoop, 2000); // Run loop every 2 seconds
    return () => clearTimeout(timerId);
  }, [isLoading, isPaused, entities, turn]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isPaused) {
        setIsPaused(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPaused]);

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
        <div className={styles.notificationArea}>
          {gameLog.map((msg, index) => (
            <p key={index}>{msg}</p>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
          <Grid layer0={layer0} entityGrid={entityGrid} width={GRID_WIDTH} height={GRID_HEIGHT} tileSize={tileSize} />
          <GridData grid={layer0} />
          <GridData grid={entityGrid} />
        </div>
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