import { useEffect, useMemo, useState } from "react";

import WaitingEllipsis from '@/components/waitingEllipsis/WaitingEllipsis';
import ContentButton from '@/components/contentButton/ContentButton';
import LoadScreen from '@/loadScreen/LoadScreen';
import TopBar from '@/components/topBar/TopBar';
import Grid from '@/components/grid/Grid'; // This line is already correct
import GridData from '@/components/gridData/GridData';
import { GENERATING, submitPrompt } from '@/homeScreen/interactions/prompt';
import { getLLMNavigatorMove } from '@/homeScreen/interactions/game';
import { Entity, Position } from '@/persona/types';
import styles from '@/homeScreen/HomeScreen.module.css';
import Pug from '@/persona/impl/Pug';
import Roach from '@/persona/impl/Roach';

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
  const [gameLog, setGameLog] = useState<string[]>(['Game started. Press Space to begin.']);
  const [turn, setTurn] = useState<number>(1);
  const [awaitingPlayerInput, setAwaitingPlayerInput] = useState<boolean>(false);

  const [isDebug, setIsDebug] = useState<boolean>(false);

  useEffect(() => {
    // Check for debug mode in URL params on initial load
    const params = new URLSearchParams(window.location.search);
    setIsDebug(params.get('debug') === 'true');

    setGameLog([]);
  }, []);

  useEffect(() => {
    // Prevent scrolling on the page
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto'; // Restore scrolling on component unmount
    };
  }, []);

  const [entities, setEntities] = useState<Entity[]>([
    { id: 1, persona: new Pug(), position: { x: 1, y: 1 } },
    { id: 2, persona: new Roach(), position: { x: 10, y: 10 } },
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
    if (isLoading) return;

    // Game Loop
    const runGameTurn = () => {
      const newLog: string[] = [`Start turn ${turn}`];
      newLog.push(`Awaiting player move (use arrows or WASD)`);
      if (isDebug) setGameLog(prevLog => [...prevLog, ...newLog].slice(-10));
      else setGameLog(newLog);

      // Player's turn
      setAwaitingPlayerInput(true);
    };

    runGameTurn();
    // The main game loop is now event-driven by player input, so no timeout is needed here.
  }, [isLoading, turn]);

  const handlePlayerMove = async (playerDirection: 'up' | 'down' | 'left' | 'right') => {
    setAwaitingPlayerInput(false);
    const turnLog: string[] = [];

    // 1. Move player instantly and get their new position
    let playerNewPosition: Position | null = null;
    setEntities(prevEntities => {
      const newEntities = [...prevEntities];
      const playerIndex = newEntities.findIndex(e => e.persona.isPlayer);
      if (playerIndex !== -1) {
        const player = newEntities[playerIndex];
        let { x, y } = player.position;

        if (playerDirection === 'up') y--;
        else if (playerDirection === 'down') y++;
        else if (playerDirection === 'left') x--;
        else if (playerDirection === 'right') x++;

        // Boundary check
        if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
          playerNewPosition = { x, y };
          newEntities[playerIndex] = { ...player, position: playerNewPosition };
          if (isDebug) turnLog.push(`Player moved ${playerDirection} to (${x}, ${y})`);
        }
      }
      return newEntities;
    });

    // 2. Trigger NPC moves in the background
    if (playerNewPosition) {
      executeNpcTurns(playerNewPosition, turnLog);
    } else {
      // If player didn't move, just start the next turn
      setTurn(t => t + 1);
    }
  };

  const executeNpcTurns = async (playerPosition: Position, turnLog: string[]) => {
    const npcMoves: { entity: Entity, newPosition: Position }[] = [];

    // Calculate all NPC moves
    for (const entity of entities.filter(e => !e.persona.isPlayer)) {
      if (isDebug) turnLog.push(`Awaiting roach move...`);
      const personaName = entity.persona.constructor.name;
      let { x, y } = entity.position;
      const userPrompt = `${entity.persona.goal}\n${entity.persona.prompt}\nMy coordinates are (${entity.position.x}, ${entity.position.y}). The player's coordinates are (${playerPosition.x}, ${playerPosition.y}).\nWhich direction should I move?`;
      if (isDebug) turnLog.push(`LLM Request => ${userPrompt.replace(/\n/g, ' ')}`);

      const direction = await getLLMNavigatorMove(userPrompt);
      if (isDebug) turnLog.push(`LLM Response <= ${direction}`);

      if (direction.toLowerCase().includes('up')) y--;
      else if (direction.toLowerCase().includes('down')) y++;
      else if (direction.toLowerCase().includes('left')) x--;
      else if (direction.toLowerCase().includes('right')) x++;

      if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
        npcMoves.push({ entity, newPosition: { x, y } });
      }
    }

    // Apply all NPC moves
    setEntities(prevEntities => {
      return prevEntities.map(e => {
        const move = npcMoves.find(m => m.entity.id === e.id);
        if (move) {
          return { ...e, position: move.newPosition };
        }
        return e;
      });
    });

    // Log results and start next turn
    if (isDebug) setGameLog(prev => [...prev, ...turnLog].slice(-10));
    setTurn(t => t + 1);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (awaitingPlayerInput) {
        let direction: 'up' | 'down' | 'left' | 'right' | null = null;
        if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') direction = 'up';
        else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') direction = 'down';
        else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') direction = 'left';
        else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') direction = 'right';
        else return; // Not a movement key

        handlePlayerMove(direction);
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
        (response, isFinal) => { if (isFinal) _onRespond(response); else setResponseText(response); }
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
          {isDebug && (
            <>
              <GridData grid={layer0} />
              <GridData grid={entityGrid} />
            </>
          )}
        </div>
        <div className={styles.prompt}>
          <p><input type="text" className={styles.promptBox} placeholder="What now?" value={prompt} onKeyDown={_onKeyDown} onChange={(e) => setPrompt(e.target.value)} />
          <ContentButton text="Send" onClick={() => {
            submitPrompt(
              SYSTEM_MESSAGE, prompt, () => setResponseText(GENERATING),
              (response, isFinal) => { if (isFinal) _onRespond(response); else setResponseText(response); }
            );
            setPrompt('');
          }} />
          <ContentButton text="Zoom In" onClick={zoomIn} />
          <ContentButton text="Zoom Out" onClick={zoomOut} /></p>
          {response}
        </div>
        <div className={styles.notificationArea}>
          {gameLog.map((msg, index) => (
            <p key={index}>{msg}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

export default HomeScreen;