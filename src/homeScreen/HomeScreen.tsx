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

  // Helper to place a wall
  const placeWall = (x: number, y: number) => {
    if (x >= 0 && x < width && y >= 0 && y < height) {
      newGrid[y][x] = 92;
    }
  };

  // 1. Border Walls
  for (let x = 0; x < width; x++) {
    placeWall(x, 0);
    placeWall(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    placeWall(0, y);
    placeWall(width - 1, y);
  }

  // 2. Intricate Maze Walls
  // Vertical Spines
  for (let y = 2; y < 18; y++) {
    if (y !== 4 && y !== 15) placeWall(5, y);  // Wall at x=5 with gaps
    if (y !== 2 && y !== 17 && (y < 8 || y > 11)) placeWall(10, y); // Wall at x=10 (avoiding center room)
    if (y !== 4 && y !== 15) placeWall(15, y); // Wall at x=15 with gaps
  }

  // Horizontal Spines
  for (let x = 2; x < 18; x++) {
    if (x !== 2 && x !== 17 && (x < 8 || x > 11)) placeWall(x, 5);  // Wall at y=5 (avoiding center)
    if (x !== 5 && x !== 15) placeWall(x, 10); // Wall at y=10 (crossing center)
    if (x !== 2 && x !== 17 && (x < 8 || x > 11)) placeWall(x, 15); // Wall at y=15 (avoiding center)
  }

  // Extra maze details to break up long corridors
  placeWall(2, 8); placeWall(3, 8);
  placeWall(17, 12); placeWall(16, 12);
  placeWall(7, 2); placeWall(7, 3);
  placeWall(12, 17); placeWall(12, 16);

  // Clear Center Room (8,8) to (11,11)
  for (let y = 8; y <= 11; y++) {
    for (let x = 8; x <= 11; x++) {
      newGrid[y][x] = 0;
    }
  }
  // Add center room entrances
  newGrid[8][9] = 0; newGrid[8][10] = 0; // Top
  newGrid[11][9] = 0; newGrid[11][10] = 0; // Bottom
  newGrid[9][8] = 0; newGrid[10][8] = 0; // Left
  newGrid[9][11] = 0; newGrid[10][11] = 0; // Right

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
  const [tileSize, setTileSize] = useState<number>(() => Math.floor(window.innerWidth * 0.8 / GRID_WIDTH * 0.5));

  // History state for Undo
  const [history, setHistory] = useState<Entity[][]>([]);

  // Factory function for initial entities to ensure fresh instances on reset
  const getInitialEntities = (): Entity[] => [
    { id: 1, type: 'pug', persona: new Pug(), position: { x: 2, y: 2 }, movementOrder: 0 },
    // Roaches scattered in the maze
    { id: 2, type: 'roach', persona: new Roach(), position: { x: 8, y: 9 }, movementOrder: 1 }, // Center
    { id: 3, type: 'roach', persona: new Roach(), position: { x: 17, y: 2 }, movementOrder: 2 }, // Top Right
    { id: 4, type: 'roach', persona: new Roach(), position: { x: 2, y: 17 }, movementOrder: 3 }, // Bottom Left
    { id: 5, type: 'roach', persona: new Roach(), position: { x: 12, y: 7 }, movementOrder: 4 }, // Mid Right
    { id: 6, type: 'roach', persona: new Roach(), position: { x: 7, y: 13 }, movementOrder: 5 }, // Mid Left
    // Mother in the bottom right room
    { id: 7, type: 'roachMother', persona: new RoachMother(), position: { x: 17, y: 17 }, movementOrder: 6 },
  ];

  // Simplified entity state
  const [entities, setEntities] = useState<Entity[]>(getInitialEntities());

  const [entityGrid, setEntityGrid] = useState<(string | number)[][]>(() => {
    const newGrid = Array(GRID_HEIGHT).fill(0).map(() => Array(GRID_WIDTH).fill(0));
    return newGrid;
  });

  useEffect(() => {
    const handleResize = () => {
      setTileSize(Math.floor(window.innerWidth * 0.8 / GRID_WIDTH * 0.5));
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

    // Initialize future grid (empty for entities)
    const futureGrid = Array(GRID_HEIGHT).fill(0).map(() => Array(GRID_WIDTH).fill(0));

    // Create a copy of entities to update positions
    const nextEntities = entities.map(e => ({ ...e }));

    const newLogs: string[] = [];

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

      // Log Player Move
      newLogs.push(`${getCurrentTime()} Pug move: (${newPlayerPos.x}, ${newPlayerPos.y})`);
    }

    // 2. Create a context with the Player's NEW position for the enemies
    // We use 'nextEntities' which now has the updated player position
    const contextEntities = nextEntities.map(e => ({ ...e }));

    // 3. Process moves for ENEMIES in movement order
    // Sort enemies by movementOrder to ensure deterministic execution
    const enemies = nextEntities
      .filter(e => !e.persona.isPlayer)
      .sort((a, b) => a.movementOrder - b.movementOrder);

    for (const entity of enemies) {
      const context: MoveContext = {
        entities: contextEntities, // Use the state where player has already moved
        myPosition: entity.position,
        playerInput: undefined,
        layer1: layer1
      };

      const newPos = entity.persona.move(context, futureGrid);

      // Check if another entity is already at the new position in the future grid
      const occupiedByEntity = futureGrid[newPos.y]?.[newPos.x];
      if (occupiedByEntity && typeof occupiedByEntity === 'string') {
        // Position is occupied, stay at current position
        futureGrid[entity.position.y][entity.position.x] = entity.type;
        // Don't update entity.position
        newLogs.push(`${getCurrentTime()} ${entity.type} ${entity.movementOrder} move: (${entity.position.x}, ${entity.position.y}) (Blocked)`);
      } else {
        // Position is free, move there
        futureGrid[newPos.y][newPos.x] = entity.type;
        entity.position = newPos;
        newLogs.push(`${getCurrentTime()} ${entity.type} ${entity.movementOrder} move: (${newPos.x}, ${newPos.y})`);
      }
    }

    setEntities(nextEntities);
    // entityGrid will be updated by the useEffect

    setTurn(t => t + 1);

    // Update logs in reverse order so newest is at top
    setGameLog(prev => [...newLogs.reverse(), ...prev].slice(0, 100));
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

    // Find the highest movement order and assign the next one
    const maxMovementOrder = entities.reduce((max, e) => Math.max(max, e.movementOrder), -1);

    const newEnemy: Entity = {
      id: Date.now(),
      type: type,
      position: { x: 8, y: 8 }, // Default spawn
      persona: persona,
      movementOrder: maxMovementOrder + 1
    };

    setEntities(prev => [...prev, newEnemy]);
    setGameLog(prev => [`${getCurrentTime()} Added new enemy '${newEnemy.type}' (order ${newEnemy.movementOrder})`, ...prev].slice(0, 100));
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