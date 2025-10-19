import { useEffect, useMemo, useState } from "react";

import WaitingEllipsis from '@/components/waitingEllipsis/WaitingEllipsis';
import ContentButton from '@/components/contentButton/ContentButton';
import LoadScreen from '@/loadScreen/LoadScreen';
import TopBar from '@/components/topBar/TopBar';
import Grid from '@/components/grid/Grid';
import GridData from '@/components/gridData/GridData';
import { GENERATING, submitPrompt } from '@/homeScreen/interactions/prompt';
import { Entity, Position } from '@/persona/types';
import styles from '@/homeScreen/HomeScreen.module.css';
import Pug from '@/persona/impl/Pug';
import Roach from '@/persona/impl/Roach';

const GRID_WIDTH = 20;
const GRID_HEIGHT = 20;

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
  const [gameLog, setGameLog] = useState<string[]>(['Game started. Press Space to begin.']);
  const [turn, setTurn] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(true);
  const [awaitingPlayerInput, setAwaitingPlayerInput] = useState<boolean>(false);

  const [entities, setEntities] = useState<Entity[]>([
    { id: 1, persona: new Pug(), position: { x: 1, y: 1 } },
    { id: 2, persona: new Roach(), position: { x: 3, y: 3 } },
  ]);

  const [entityGrid, setEntityGrid] = useState<number[][]>(() => {
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
      newGrid[entity.position.y][entity.position.x] = entity.id;
    }
    setEntityGrid(newGrid);
  }, [entities]);

  useEffect(() => {
    if (isLoading || isPaused) return;

    // Game Loop
    const runGameTurn = () => {
      const newLog: string[] = [];
      newLog.push(`Starting Turn ${turn + 1}`);
      setGameLog(prevLog => [...prevLog, ...newLog].slice(-10));

      // Player's turn
      setAwaitingPlayerInput(true);
      // The rest of the turn logic will be triggered by player input in the other useEffect
    };

    runGameTurn();
    // The main game loop is now event-driven by player input, so no timeout is needed here.
  }, [isLoading, isPaused, turn]);

  const handlePlayerMove = (newPosition: Position) => {
    if (!awaitingPlayerInput) return;

    setAwaitingPlayerInput(false);

    const intendedMoves: { entity: Entity, newPosition: Position }[] = [];
    const newLog: string[] = [];

    // 1. Calculate Player's intended move
    const player = entities.find(e => e.persona.isPlayer);
    if (player) {
      intendedMoves.push({ entity: player, newPosition });
      newLog.push(`Player intends to move to (${newPosition.x}, ${newPosition.y})`);
    }

    // 2. Calculate NPCs' intended moves
    const playerPosition = player?.position;
    for (const entity of entities) {
      if (!entity.persona.isPlayer && playerPosition) {
        let { x, y } = entity.position;
        const dx = playerPosition.x - x;
        const dy = playerPosition.y - y;

        // Roach AI: prefer vertical movement
        if (dy !== 0) {
          y += Math.sign(dy);
        } else if (dx !== 0) {
          x += Math.sign(dx);
        }

        const npcNewPosition = { x, y };
        intendedMoves.push({ entity, newPosition: npcNewPosition });
        newLog.push(`${entity.persona.constructor.name} intends to move to (${npcNewPosition.x}, ${npcNewPosition.y})`);
      }
    }

    // 3. Apply all moves simultaneously
    setEntities(prevEntities => {
      return prevEntities.map(e => {
        const move = intendedMoves.find(m => m.entity.id === e.id);
        if (move) {
          // Basic boundary check
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
    newLog.push("Hit Space to continue");
    setGameLog(prevLog => [...prevLog, ...newLog].slice(-10));
    setTurn(t => t + 1);
    setIsPaused(true);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isPaused && !awaitingPlayerInput) {
        setIsPaused(false);
        return;
      }

      if (awaitingPlayerInput) {
        const player = entities.find(e => e.persona.isPlayer);
        if (!player) return;

        let { x, y } = player.position;
        if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') y--;
        else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') y++;
        else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') x--;
        else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') x++;
        else return; // Not a movement key

        handlePlayerMove({ x, y });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPaused, awaitingPlayerInput, entities]);

  useEffect(() => {
    if (awaitingPlayerInput) {
      const newLog = ["Your move (use arrows or WASD)"];
      setGameLog(prevLog => [...prevLog, ...newLog].slice(-10));
    }
  }, [awaitingPlayerInput]);

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