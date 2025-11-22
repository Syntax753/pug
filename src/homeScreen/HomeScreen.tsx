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

function generateLayer1(width: number, height: number, seed: number): number[][] {
  const newGrid = Array(height).fill(0).map(() => Array(width).fill(0));
  // Simple pseudo-random generator based on seed
  let currentSeed = seed;
  const random = () => {
    const x = Math.sin(currentSeed++) * 10000;
    return x - Math.floor(x);
  };

  // Add walls in top right cluster (so pug can hide from enemies)
  const topRightWalls = [
    { x: 7, y: 0 }, { x: 8, y: 0 }, { x: 9, y: 0 },
    { x: 7, y: 1 }, { x: 9, y: 1 },
    { x: 7, y: 2 }
  ];

  for (const wall of topRightWalls) {
    if (wall.x < width && wall.y < height) {
      newGrid[wall.y][wall.x] = 92;
    }
  }

  let obstaclesPlaced = 0;
  while (obstaclesPlaced < 5) {
    const x = Math.floor(random() * width);
    const y = Math.floor(random() * height);

    // Avoid initial entity positions
    if ((x === 1 && y === 1) || (x === 2 && y === 8) || (x === 7 && y === 8) || (x === 8 && y === 2)) {
      continue;
    }
    // Avoid top right cluster
    if (x >= 7 && y <= 2) {
      continue;
    }

    if (newGrid[y][x] === 0) {
      newGrid[y][x] = 92;
      obstaclesPlaced++;
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

  // History state for Undo
  const [history, setHistory] = useState<Entity[][]>([]);

  // Factory function for initial entities to ensure fresh instances on reset
  const getInitialEntities = (): Entity[] => [
    { id: 1, type: 'pug', persona: new Pug(), position: { x: 1, y: 1 } },
    { id: 2, type: 'roach', persona: new Roach(), position: { x: 2, y: 8 } },
    { id: 3, type: 'roach', persona: new Roach(), position: { x: 7, y: 8 } },
    { id: 4, type: 'roachMother', persona: new RoachMother(), position: { x: 8, y: 2 } },
  ];

  // Simplified entity state
  const [entities, setEntities] = useState<Entity[]>(getInitialEntities());

  const [entityGrid, setEntityGrid] = useState<(string | number)[][]>(() => {
    const newGrid = Array(GRID_HEIGHT).fill(0).map(() => Array(GRID_WIDTH).fill(0));
    return newGrid;
  });

  useEffect(() => {
    const handleResize = () => {
      setTileSize(Math.floor(window.innerWidth * 0.8 / GRID_WIDTH));
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial calculation
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Generate a random seed once per component instance to vary the grass pattern
  const seed = useMemo(() => Math.random() * 1000, []);

  const layer0 = useMemo<number[][]>(() => {
    return loadGrid(GRID_WIDTH, GRID_HEIGHT, seed);
  }, [seed]);

  const layer1 = useMemo<number[][]>(() => {
    return generateLayer1(GRID_WIDTH, GRID_HEIGHT, seed);
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
      setGameLog(prev => [`${getCurrentTime()} Turn ${turn + 1}. Awaiting player move (arrows/WASD/numpad).`, ...prev].slice(0, 100));
      // Player's turn
      setAwaitingPlayerInput(true);
    };

    runGameTurn();
  }, [isLoading, turn]);

  const executeTurn = async (playerMove: { x: number, y: number }) => {
    // Save current state to history before moving
    setHistory(prev => [...prev, entities]);

    const moveDesc = playerMove.x === 0 && playerMove.y === 0 ? 'skip' : `(${playerMove.x}, ${playerMove.y})`;
    setGameLog(prev => [`${getCurrentTime()} Player move: ${moveDesc}`, ...prev].slice(0, 100));

    // Initialize future grid (empty for entities)
    const futureGrid = Array(GRID_HEIGHT).fill(0).map(() => Array(GRID_WIDTH).fill(0));

    // Create a copy of entities to update positions
    const nextEntities = entities.map(e => ({ ...e }));

    // 1. Find Player and calculate their move FIRST
    const playerIndex = nextEntities.findIndex(e => e.persona.isPlayer);
    if (playerIndex !== -1) {
      const playerEntity = nextEntities[playerIndex];
      const playerContext: MoveContext = {
        entities: entities,
        myPosition: playerEntity.position,
        playerInput: playerMove,
        layer1: layer1
      };
      const newPlayerPos = playerEntity.persona.move(playerContext, futureGrid);
      playerEntity.position = newPlayerPos;
    }

    // 2. Create a context with the Player's NEW position for the enemies
    // We use 'nextEntities' which now has the updated player position
    const contextEntities = nextEntities.map(e => ({ ...e }));

    // 3. Process moves for ENEMIES
    for (const entity of nextEntities) {
      if (entity.persona.isPlayer) continue; // Already moved

      const context: MoveContext = {
        entities: contextEntities, // Use the state where player has already moved
        myPosition: entity.position,
        playerInput: undefined,
        layer1: layer1
      };

      const newPos = entity.persona.move(context, futureGrid);
      entity.position = newPos;
    }

    setEntities(nextEntities);
    // entityGrid will be updated by the useEffect

    setTurn(t => t + 1);
  };

  const handleReset = () => {
    setEntities(getInitialEntities());
    setHistory([]);
    setTurn(0);
    setGameLog([]);
    setAwaitingPlayerInput(true); // Enable player input immediately after reset
  };

  const handleUndo = () => {
    if (history.length === 0) return;

    const previousState = history[history.length - 1];
    setEntities(previousState);
    setHistory(prev => prev.slice(0, -1));
    setTurn(t => Math.max(0, t - 1));
    setGameLog(prev => [`${getCurrentTime()} Undo last move.`, ...prev].slice(0, 100));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Global keys
      if (e.key.toLowerCase() === 'r') {
        handleReset();
        return;
      }
      if (e.key.toLowerCase() === 'z') {
        handleUndo();
        return;
      }

      if (awaitingPlayerInput) {
        const player = entities.find(e => e.persona.isPlayer);
        if (!player) return;

        let moveVector: { x: number, y: number } | null = null;

        // Arrow keys and WASD
        if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') moveVector = { x: 0, y: -1 };
        else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') moveVector = { x: 0, y: 1 };
        else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') moveVector = { x: -1, y: 0 };
        else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') moveVector = { x: 1, y: 0 };
        // Numpad
        else if (e.key === '1') moveVector = { x: -1, y: 1 };  // Down-left
        else if (e.key === '2') moveVector = { x: 0, y: 1 };   // Down
        else if (e.key === '3') moveVector = { x: 1, y: 1 };   // Down-right
        else if (e.key === '4') moveVector = { x: -1, y: 0 };  // Left
        else if (e.key === '5' || e.key === ' ') moveVector = { x: 0, y: 0 }; // Skip turn
        else if (e.key === '6') moveVector = { x: 1, y: 0 };   // Right
        else if (e.key === '7') moveVector = { x: -1, y: -1 }; // Up-left
        else if (e.key === '8') moveVector = { x: 0, y: -1 };  // Up
        else if (e.key === '9') moveVector = { x: 1, y: -1 };  // Up-right
        else return; // Not a movement key

        if (moveVector) {
          e.preventDefault(); // Prevent default browser action (scrolling)
          setAwaitingPlayerInput(false);
          executeTurn(moveVector);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [awaitingPlayerInput, entities, history]);

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
          <Grid layer0={layer0} layer1={layer1} entityGrid={entityGrid} width={GRID_WIDTH} tileSize={tileSize} />
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