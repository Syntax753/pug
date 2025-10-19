import { useEffect, useMemo, useState } from "react";

import WaitingEllipsis from '@/components/waitingEllipsis/WaitingEllipsis';
import ContentButton from '@/components/contentButton/ContentButton';
import LoadScreen from '@/loadScreen/LoadScreen';
import TopBar from '@/components/topBar/TopBar';
import Grid from '@/components/grid/Grid';  
import { GENERATING, submitPrompt, SYSTEM_MESSAGE } from '@/homeScreen/interactions/prompt';
import { getLLMNavigatorMove } from '@/homeScreen/interactions/game';
import { Entity, Position } from '@/persona/types';
import styles from '@/homeScreen/HomeScreen.module.css';
import Pug from '@/persona/impl/Pug';
import Roach from '@/persona/impl/Roach';

const SYSTEM_PROMPT = "You are a navigator and must return a single direction: up, down, left, or right.";
const GRID_WIDTH = 20;
const GRID_HEIGHT = 17;

// Simple noise function to create clusters
function simpleNoise(x: number, y: number, seed: number = 0): number {
  const n = x + y * 57 + seed;
  const x1 = (n << 13) ^ n;
  // Return a value between 0 and 1
  return (1.0 - ((x1 * (x1 * x1 * 15731 + 789221) + 1376312589) & 0x7fffffff) / 1073741824.0);
}

function loadGrid(width: number, height: number, seed: number): number[][] {
  const newGrid = Array(height).fill(0).map(() => Array(width).fill(0));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const scale = 0.2;
      const noiseValue = simpleNoise(x * scale, y * scale, seed);
      if (noiseValue < 0.33) {
        newGrid[y][x] = 1;
      } else if (noiseValue < 0.66) {
        newGrid[y][x] = 6;
      } else {
        newGrid[y][x] = 12;
      }
    }
  }
  return newGrid;
}

function HomeScreen() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [prompt, setPrompt] = useState<string>('');
  const [responseText, setResponseText] = useState<string>('');
  const [tileSize, setTileSize] = useState<number>(32);
  const [gameLog, setGameLog] = useState<string[]>([]);
  const [turn, setTurn] = useState<number>(0);
  const [awaitingPlayerInput, setAwaitingPlayerInput] = useState<boolean>(false);

  useEffect(() => {
    // Prevent scrolling on the page
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto'; // Restore scrolling on component unmount
    };
  }, []);

  const [entities, setEntities] = useState<Entity[]>([
    { id: 1, type: 'pug', persona: new Pug(), position: { x: 1, y: 1 } },
    { id: 2, type: 'roach', persona: new Roach(), position: { x: 10, y: 10 } },
    { id: 3, type: 'roach', persona: new Roach(), position: { x: 11, y: 10 } },
  ]);   

  const [entityGrid, setEntityGrid] = useState<(string | number)[][]>(() => {
    const newGrid = Array(GRID_HEIGHT).fill(0).map(() => Array(GRID_WIDTH).fill(0));
    return newGrid;
  });

  // Generate a random seed once per component instance to vary the grass pattern
  const seed = useMemo(() => Math.random() * 1000, []);

  const [layer0] = useState<number[][]>(() => {
    return loadGrid(GRID_WIDTH, GRID_HEIGHT, seed);
  });

  // This effect synchronizes the entityGrid with the entities' positions
  useEffect(() => {
    const newGrid = Array(GRID_HEIGHT).fill(0).map(() => Array(GRID_WIDTH).fill(0));
    for (const entity of entities) {
      newGrid[entity.position.y][entity.position.x] = entity.type;
    }
    setEntityGrid(newGrid);
  }, [entities]);

  useEffect(() => {
    if (isLoading) return;

    // Game Loop
    const runGameTurn = () => {
      setGameLog(prev => [`Awaiting player move (use arrows or WASD)`, `Start turn ${turn + 1}`, ...prev].slice(0, 100));
      // Player's turn
      setAwaitingPlayerInput(true);
      // The rest of the turn logic will be triggered by player input in the other useEffect
    };

    runGameTurn();
    // The main game loop is now event-driven by player input, so no timeout is needed here.
  }, [isLoading, turn]);

  const executeTurn = async (playerDirection: 'up' | 'down' | 'left' | 'right') => {
    setAwaitingPlayerInput(false);
    const intendedMoves: { entity: Entity, newPosition: Position }[] = [];
    setGameLog(prev => [`Player intends to move ${playerDirection}`, ...prev].slice(0, 100));

    // 1. Calculate player's intended move
    const player = entities.find(e => e.type === 'pug');
    if (!player) return;
    let { x: playerX, y: playerY } = player.position;
    if (playerDirection === 'up') playerY--;
    else if (playerDirection === 'down') playerY++;
    else if (playerDirection === 'left') playerX--;
    else if (playerDirection === 'right') playerX++;
    intendedMoves.push({ entity: player, newPosition: { x: playerX, y: playerY } });

    // 2. Calculate roach moves sequentially
    const roaches = entities.filter(e => e.type === 'roach').sort((a, b) => a.id - b.id);
    const playerPosition = player.position;

    for (const roach of roaches) {
      setGameLog(prev => [`Awaiting roach move...`, ...prev].slice(0, 100));
      let { x, y } = roach.position;

      // LLM-driven movement
      const deltaX = playerPosition.x - roach.position.x;
      const deltaY = playerPosition.y - roach.position.y;

      const horizontal = deltaX > 0 ? `${deltaX} steps right` : deltaX < 0 ? `${Math.abs(deltaX)} steps left` : '';
      const vertical = deltaY > 0 ? `${deltaY} steps down` : deltaY < 0 ? `${Math.abs(deltaY)} steps up` : '';

      let relativePosition = [vertical, horizontal].filter(Boolean).join(' and ');
      if (!relativePosition) relativePosition = 'at your location';

      const userPrompt = `${roach.persona.goal}\n${roach.persona.prompt}\nThe player is ${relativePosition}.\nWhich direction will you move?`;
      //setGameLog(prev => [`Calling LLM with prompt: ${userPrompt.replace(/\n/g, ' ')}`, ...prev].slice(0, 100));
      const direction = await getLLMNavigatorMove(SYSTEM_PROMPT, userPrompt);
      setGameLog(prev => [`Response from LLM: ${direction}`, ...prev].slice(0, 100));

      // Translate direction to position change
      if (direction.toLowerCase().includes('up')) y--;
      else if (direction.toLowerCase().includes('down')) y++;
      else if (direction.toLowerCase().includes('left')) x--;
      else if (direction.toLowerCase().includes('right')) x++;
      setGameLog(prev => [`Roach intends to move: ${direction}`, ...prev].slice(0, 100));

      intendedMoves.push({ entity: roach, newPosition: { x, y } });
    }

    // 3. Apply all moves simultaneously
    setEntities(prevEntities => {
      return prevEntities.map(e => {
        const move = intendedMoves.find(m => m.entity.id === e.id);
        if (move) {
          if (
            move.newPosition.x >= 0 && move.newPosition.x < GRID_WIDTH &&
            move.newPosition.y >= 0 && move.newPosition.y < GRID_HEIGHT
          ) {
            return { ...e, position: move.newPosition };
          }
        }
        return e;
      });
    });

    // 4. Log results and end turn
    setTurn(t => t + 1);
    setAwaitingPlayerInput(true);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (awaitingPlayerInput) {
        const player = entities.find(e => e.persona.isPlayer);
        if (!player) return;

        let direction: 'up' | 'down' | 'left' | 'right' | null = null;
        if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') direction = 'up';
        else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') direction = 'down';
        else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') direction = 'left';
        else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') direction = 'right';
        else return; // Not a movement key

        setAwaitingPlayerInput(false);
        executeTurn(direction);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [awaitingPlayerInput, entities]);

  if (isLoading) {
    return <LoadScreen onComplete={() => setIsLoading(false)} />;
  }

  function _onKeyDown(e:React.KeyboardEvent<HTMLInputElement>) {
    if(e.key === 'Enter' && prompt !== '') {
      submitPrompt(
        SYSTEM_MESSAGE,
        prompt,
        () => setResponseText(GENERATING),
        (response, isFinal) => { if (isFinal) _onRespond(response); else setResponseText(response); },
        false
      );
      setPrompt('');
    }
  }

  function _onRespond(text:string) {
    setResponseText(text + '\n');
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
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
          <Grid layer0={layer0} entityGrid={entityGrid} width={GRID_WIDTH} height={GRID_HEIGHT} tileSize={tileSize} />
        </div>
        <div className={styles.controlsContainer}>
          <div className={styles.prompt}>
            <p><input type="text" className={styles.promptBox} placeholder="What now?" value={prompt} onKeyDown={_onKeyDown} onChange={(e) => setPrompt(e.target.value)} />
            <ContentButton text="Send" onClick={() => {
              submitPrompt(
                'You are sidekick for Beethro the pug. You like to tell jokes',
                prompt,
                () => setResponseText(GENERATING),
                (response, isFinal) => { if (isFinal) _onRespond(response); else setResponseText(response); },
                false
              );
              setPrompt('');
            }} />
            <ContentButton text="Zoom In" onClick={zoomIn} />
            <ContentButton text="Zoom Out" onClick={zoomOut} /></p>
            {response}
          </div>
          <div className={styles.notificationArea} style={{ minHeight: '10em' }}>
            {gameLog.map((msg, index) => (
              <p
                key={index}
                style={{
                  fontFamily: 'system-ui, sans-serif',
                  fontSize: '0.8rem',
                  padding: '0.2rem 0.5rem'
                }}
              >{msg}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomeScreen;