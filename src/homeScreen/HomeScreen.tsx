import { useEffect, useMemo, useState } from "react";

import ContentButton from '@/components/contentButton/ContentButton';
import LoadScreen from '@/loadScreen/LoadScreen';
import TopBar from '@/components/topBar/TopBar';
import Grid from '@/components/grid/Grid';
import { Entity } from '@/persona/types';
import styles from '@/homeScreen/HomeScreen.module.css';
import Pug from '@/persona/impl/Pug';
import Roach from '@/persona/impl/Roach';
import RoachMother from '@/persona/impl/RoachMother';
import { MoveContext } from "@/persona/Persona";

const GRID_WIDTH = 10;
const GRID_HEIGHT = 10;


// Simple noise function to create clusters
function simpleNoise(x: number, y: number, seed: number = 0): number {
  const n = x + y * 57 + seed;
  const x1 = (n << 13) ^ n;
  // Return a value between 0 and 1
  return (1.0 - ((x1 * (x1 * x1 * 15731 + 789221) + 1376312589) & 0x7fffffff) / 1073741824.0);
}

function loadGrid(width: number, height: number, seed: number): number[][] {
  const NOISE_SCALE = 0.2;
  const newGrid = Array(height).fill(0).map(() => Array(width).fill(0));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const noiseValue = simpleNoise(x * NOISE_SCALE, y * NOISE_SCALE, seed);
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

function getCurrentTime(): string {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function HomeScreen() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [gameLog, setGameLog] = useState<string[]>([]);
  const [turn, setTurn] = useState<number>(0);
  const [awaitingPlayerInput, setAwaitingPlayerInput] = useState<boolean>(false);
  const [tileSize, setTileSize] = useState<number>(() => Math.floor(window.innerWidth * 0.8 / GRID_WIDTH));

  useEffect(() => {
    const handleResize = () => {
      setTileSize(Math.floor(window.innerWidth * 0.8 / GRID_WIDTH));
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial calculation
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Simplified entity state
  const [entities, setEntities] = useState<Entity[]>([
    { id: 1, type: 'pug', persona: new Pug(), position: { x: 1, y: 1 } },
    { id: 2, type: 'roach', persona: new Roach(), position: { x: 2, y: 8 } },
    { id: 3, type: 'roach', persona: new Roach(), position: { x: 7, y: 8 } },
    { id: 4, type: 'roachMother', persona: new RoachMother(), position: { x: 8, y: 2 } },
  ]);

  const [entityGrid, setEntityGrid] = useState<(string | number)[][]>(() => {
    const newGrid = Array(GRID_HEIGHT).fill(0).map(() => Array(GRID_WIDTH).fill(0));
    return newGrid;
  });

  // Generate a random seed once per component instance to vary the grass pattern
  const seed = useMemo(() => Math.random() * 1000, []);

  const layer0 = useMemo<number[][]>(() => {
    return loadGrid(GRID_WIDTH, GRID_HEIGHT, seed);
  }, [seed]);

  // This effect synchronizes the entityGrid with the entities' positions
  useEffect(() => {
    const newGrid = Array(GRID_HEIGHT).fill(0).map(() => Array(GRID_WIDTH).fill(0));
    for (const entity of entities) {
      newGrid[entity.position.y][entity.position.x] = entity.type;
    }
    setEntityGrid(newGrid);
  }, [entities]);

  // Game Loop
  useEffect(() => {
    if (isLoading) return;

    const runGameTurn = () => {
      setGameLog(prev => [`${getCurrentTime()} Turn ${turn + 1}. Awaiting player move (arrows/WASD).`, ...prev].slice(0, 100));
      // Player's turn
      setAwaitingPlayerInput(true);
    };

    runGameTurn();
  }, [isLoading, turn]);

  const executeTurn = async (playerDirection: 'up' | 'down' | 'left' | 'right') => {
    setGameLog(prev => [`${getCurrentTime()} Player move: ${playerDirection}`, ...prev].slice(0, 100));

    // Initialize future grid (empty for entities)
    const futureGrid = Array(GRID_HEIGHT).fill(0).map(() => Array(GRID_WIDTH).fill(0));

    // Create a copy of entities to update positions
    const nextEntities = entities.map(e => ({ ...e }));

    // Process moves for ALL entities (including player)
    for (const entity of nextEntities) {
      const context: MoveContext = {
        entities: entities, // Pass current state as context
        myPosition: entity.position,
        playerInput: entity.persona.isPlayer ? playerDirection : undefined
      };

      const newPos = entity.persona.move(context, futureGrid);

      // Update entity position
      entity.position = newPos;

      if (!entity.persona.isPlayer) {
        // setGameLog(prev => [`${getCurrentTime()} Enemy ${entity.type}#${entity.id} moved to (${newPos.x}, ${newPos.y})`, ...prev].slice(0, 100));
      }
    }

    setEntities(nextEntities);
    // entityGrid will be updated by the useEffect

    setTurn(t => t + 1);
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

        if (direction) {
          e.preventDefault(); // Prevent default browser action (scrolling)
          setAwaitingPlayerInput(false);
          executeTurn(direction);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [awaitingPlayerInput, entities]);

  if (isLoading) {
    return <LoadScreen onComplete={() => setIsLoading(false)} />;
  }

  function zoomIn() {
    setTileSize(prevSize => prevSize + 8);
  }

  function zoomOut() {
    setTileSize(prevSize => Math.max(16, prevSize - 8)); // Don't allow zooming out smaller than 16px
  }

  const handleAddEnemy = async (prompt: string) => {
    if (!prompt) return;

    // Determine type based on prompt content (simple heuristic)
    let type: 'roach' | 'roachMother' = 'roach';
    let persona = new Roach();

    if (prompt.toLowerCase().includes('mother') || prompt.toLowerCase().includes('flee')) {
      type = 'roachMother';
      persona = new RoachMother();
    }

    const newEnemy: Entity = {
      id: Date.now(),
      type: type,
      position: { x: 8, y: 8 }, // Default spawn
      persona: persona
    };

    setEntities(prev => [...prev, newEnemy]);
    setGameLog(prev => [`${getCurrentTime()} Added new enemy '${newEnemy.type}'`, ...prev].slice(0, 100));
  };

  return (
    <div className={styles.container}>
      <TopBar />
      <div className={styles.content}>
        <div className={styles.mainArea}>
          <Grid layer0={layer0} entityGrid={entityGrid} width={GRID_WIDTH} tileSize={tileSize} />
          <div className={styles.notificationArea} style={{
            overflowY: 'auto',
            height: '300px',
            border: '1px solid #ccc',
            marginTop: '1rem',
            padding: '0.5rem',
            fontFamily: 'monospace',
            fontSize: '0.8rem'
          }}>
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
        <div className={styles.controlsContainer}>
          <div>
            <input
              type="text"
              className={styles.promptBox}
              placeholder="Type 'roach' or 'mother'..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddEnemy(e.currentTarget.value);
              }}
            />
            <ContentButton text="Add Enemy" onClick={() => handleAddEnemy((document.querySelector(`.${styles.promptBox}`) as HTMLInputElement).value)} />
            <ContentButton text="Zoom In" onClick={zoomIn} />
            <ContentButton text="Zoom Out" onClick={zoomOut} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomeScreen;