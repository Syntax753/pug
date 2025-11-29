import { useEffect, useState } from "react";

import ContentButton from '@/components/contentButton/ContentButton';
import LoadScreen from '@/loadScreen/LoadScreen';
import TopBar from '@/components/topBar/TopBar';
import Grid from '@/components/grid/Grid';
import { Entity } from '@/persona/types';
import styles from '@/homeScreen/HomeScreen.module.css';
import Pug from '@/persona/impl/Pug';
import Roach from '@/persona/impl/Roach';
import RoachMother from '@/persona/impl/RoachMother';
import DynamicPersona from '@/persona/impl/DynamicPersona';
import { MoveContext } from "@/persona/Persona";
import { generateEnemyBehavior, validateGeneratedCode } from '@/llm/llmEnemyGenerator';

const GRID_WIDTH = 20;
const GRID_HEIGHT = 20;

// Helper to create persona instances
function createPersona(type: string) {
  switch (type) {
    case 'pug': return new Pug();
    case 'roach': return new Roach();
    case 'roachMother': return new RoachMother();
    default: return new Roach();
  }
}

// Simple noise function to create clusters
function simpleNoise(x: number, y: number, seed: number = 0): number {
  const n = x + y * 57 + seed;
  const x1 = (n << 13) ^ n;
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

function generateLayer1(width: number, height: number): number[][] {
  const newGrid = Array(height).fill(0).map(() => Array(width).fill(0));

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
  for (let y = 2; y < 18; y++) {
    if (y !== 4 && y !== 15) placeWall(5, y);
    if (y !== 2 && y !== 17 && (y < 8 || y > 11)) placeWall(10, y);
    if (y !== 4 && y !== 15) placeWall(15, y);
  }

  for (let x = 2; x < 18; x++) {
    if (x !== 2 && x !== 17 && (x < 8 || x > 11)) placeWall(x, 5);
    if (x !== 5 && x !== 15) placeWall(x, 10);
    if (x !== 2 && x !== 17 && (x < 8 || x > 11)) placeWall(x, 15);
  }

  placeWall(2, 8); placeWall(3, 8);
  placeWall(17, 12); placeWall(16, 12);
  placeWall(7, 2); placeWall(7, 3);
  placeWall(12, 17); placeWall(12, 16);

  // Clear Center Room
  for (let y = 8; y <= 11; y++) {
    for (let x = 8; x <= 11; x++) {
      newGrid[y][x] = 0;
    }
  }
  newGrid[8][9] = 0; newGrid[8][10] = 0;
  newGrid[11][9] = 0; newGrid[11][10] = 0;
  newGrid[9][8] = 0; newGrid[10][8] = 0;
  newGrid[9][11] = 0; newGrid[10][11] = 0;

  return newGrid;
}

type LevelData = {
  layer0: number[][];
  layer1: number[][];
  initialConfigs: { type: string, position: { x: number, y: number }, movementOrder: number }[];
};

function generateLevel(width: number, height: number): LevelData {
  const seed = Math.random() * 1000;
  const layer0 = loadGrid(width, height, seed);
  const layer1 = generateLayer1(width, height);

  // Find all valid empty spots
  const emptySpots: { x: number, y: number }[] = [];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (layer1[y][x] === 0) {
        emptySpots.push({ x, y });
      }
    }
  }

  // Shuffle empty spots
  for (let i = emptySpots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [emptySpots[i], emptySpots[j]] = [emptySpots[j], emptySpots[i]];
  }

  const initialConfigs: { type: string, position: { x: number, y: number }, movementOrder: number }[] = [];
  let movementOrder = 0;

  // 1. Place Pug (Try (2,2) first, else random)
  const pugSpotIndex = emptySpots.findIndex(p => p.x === 2 && p.y === 2);
  let pugPos = { x: 2, y: 2 };
  if (pugSpotIndex !== -1) {
    pugPos = emptySpots.splice(pugSpotIndex, 1)[0];
  } else {
    pugPos = emptySpots.pop()!;
  }
  initialConfigs.push({ type: 'pug', position: pugPos, movementOrder: movementOrder++ });

  // Filter for safe enemy spots (>= 7 tiles away horizontally AND vertically)
  const validEnemySpots = emptySpots.filter(s =>
    Math.abs(s.x - pugPos.x) >= 7 && Math.abs(s.y - pugPos.y) >= 7
  );

  // 2. Place RoachMothers (1 or 2)
  const motherCount = Math.random() > 0.5 ? 2 : 1;
  for (let i = 0; i < motherCount; i++) {
    if (validEnemySpots.length > 0) {
      initialConfigs.push({ type: 'roachMother', position: validEnemySpots.pop()!, movementOrder: movementOrder++ });
    }
  }

  // 3. Place Roaches (5 to 8)
  const roachCount = Math.floor(Math.random() * 4) + 5; // 5, 6, 7, or 8
  for (let i = 0; i < roachCount; i++) {
    if (validEnemySpots.length > 0) {
      initialConfigs.push({ type: 'roach', position: validEnemySpots.pop()!, movementOrder: movementOrder++ });
    }
  }

  return { layer0, layer1, initialConfigs };
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
  const [isGeneratingEnemy, setIsGeneratingEnemy] = useState<boolean>(false);
  const [generationStatus, setGenerationStatus] = useState<string>('');

  // Level Data State
  const [levelData] = useState<LevelData>(() => generateLevel(GRID_WIDTH, GRID_HEIGHT));

  // Entity State
  const [entities, setEntities] = useState<Entity[]>([]);
  const [history, setHistory] = useState<Entity[][]>([]);

  // Initialize entities from level data
  useEffect(() => {
    const newEntities = levelData.initialConfigs.map((c, index) => ({
      id: Date.now() + index,
      type: c.type as any,
      position: { ...c.position },
      movementOrder: c.movementOrder,
      persona: createPersona(c.type)
    }));
    setEntities(newEntities);
  }, [levelData]);

  const [entityGrid, setEntityGrid] = useState<(string | number)[][]>(() => {
    return Array(GRID_HEIGHT).fill(0).map(() => Array(GRID_WIDTH).fill(0));
  });

  useEffect(() => {
    const handleResize = () => {
      setTileSize(Math.floor(window.innerWidth * 0.8 / GRID_WIDTH * 0.5));
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Synchronize entityGrid
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
      setGameLog(prev => [`${getCurrentTime()} Turn ${turn + 1}. Awaiting player move (numpad).`, ...prev].slice(0, 100));
      setAwaitingPlayerInput(true);
    };

    runGameTurn();
  }, [isLoading, turn]);

  const executeTurn = async (playerMove: { x: number, y: number }) => {
    setHistory(prev => [...prev, entities]);

    // Initialize futureGrid with ALL current entity positions for collision detection
    const futureGrid = Array(GRID_HEIGHT).fill(0).map(() => Array(GRID_WIDTH).fill(0));
    for (const e of entities) {
      futureGrid[e.position.y][e.position.x] = e.type;
    }

    const nextEntities = entities.map(e => ({ ...e }));
    const newLogs: string[] = [];

    // 1. Move Player
    const playerIndex = nextEntities.findIndex(e => e.persona.isPlayer);
    if (playerIndex !== -1) {
      const playerEntity = nextEntities[playerIndex];

      // Remove self from futureGrid before moving
      futureGrid[playerEntity.position.y][playerEntity.position.x] = 0;

      const playerContext: MoveContext = {
        entities: entities,
        myPosition: playerEntity.position,
        playerInput: playerMove,
        layer1: levelData.layer1,
        isValid: (x: number, y: number) => {
          return x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT &&
            levelData.layer1[y][x] !== 92 &&
            futureGrid[y][x] === 0;
        }
      };
      const newPlayerPos = playerEntity.persona.move(playerContext, futureGrid);

      // Update futureGrid with new position
      futureGrid[newPlayerPos.y][newPlayerPos.x] = playerEntity.type;
      playerEntity.position = newPlayerPos;

      newLogs.push(`${getCurrentTime()} Pug move: (${newPlayerPos.x}, ${newPlayerPos.y})`);
    }

    // 2. Move Enemies
    const contextEntities = nextEntities.map(e => ({ ...e }));
    const enemies = nextEntities
      .filter(e => !e.persona.isPlayer)
      .sort((a, b) => a.movementOrder - b.movementOrder);

    for (const entity of enemies) {
      // Remove self from futureGrid before moving
      futureGrid[entity.position.y][entity.position.x] = 0;

      const context: MoveContext = {
        entities: contextEntities,
        myPosition: entity.position,
        playerInput: undefined,
        layer1: levelData.layer1,
        isValid: (x: number, y: number) => {
          return x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT &&
            levelData.layer1[y][x] !== 92 &&
            futureGrid[y][x] === 0;
        }
      };

      const newPos = entity.persona.move(context, futureGrid);

      // Check if the move was blocked (position didn't change)
      // Note: persona.move should return old pos if blocked, but we double check futureGrid just in case
      // Actually, if persona.move returns a position that is occupied in futureGrid, it's a bug in persona.move
      // But we update futureGrid regardless to reflect where the entity ENDS UP.

      futureGrid[newPos.y][newPos.x] = entity.type;

      if (newPos.x === entity.position.x && newPos.y === entity.position.y) {
        newLogs.push(`${getCurrentTime()} ${entity.type} ${entity.movementOrder} move: (${entity.position.x}, ${entity.position.y}) (Blocked)`);
      } else {
        entity.position = newPos;
        newLogs.push(`${getCurrentTime()} ${entity.type} ${entity.movementOrder} move: (${newPos.x}, ${newPos.y})`);
      }
    }

    setEntities(nextEntities);
    setTurn(t => t + 1);
    setGameLog(prev => [...newLogs.reverse(), ...prev].slice(0, 100));
  };

  const handleReset = () => {
    // Restore initial entities from level data
    const newEntities = levelData.initialConfigs.map((c, index) => ({
      id: Date.now() + index,
      type: c.type as any,
      position: { ...c.position },
      movementOrder: c.movementOrder,
      persona: createPersona(c.type)
    }));
    setEntities(newEntities);
    setHistory([]);
    setTurn(0);
    setGameLog([]);
    setAwaitingPlayerInput(true);
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
      // Ignore game controls if typing in an input
      if (document.activeElement?.tagName === 'INPUT') return;

      if (e.key.toLowerCase() === 'r') { handleReset(); return; }
      if (e.key.toLowerCase() === 'z') { handleUndo(); return; }

      if (awaitingPlayerInput) {
        const player = entities.find(e => e.persona.isPlayer);
        if (!player) return;

        let moveVector: { x: number, y: number } | null = null;
        if (e.key === '1') moveVector = { x: -1, y: 1 };
        else if (e.key === '2') moveVector = { x: 0, y: 1 };
        else if (e.key === '3') moveVector = { x: 1, y: 1 };
        else if (e.key === '4') moveVector = { x: -1, y: 0 };
        else if (e.key === '5') moveVector = { x: 0, y: 0 };
        else if (e.key === '6') moveVector = { x: 1, y: 0 };
        else if (e.key === '7') moveVector = { x: -1, y: -1 };
        else if (e.key === '8') moveVector = { x: 0, y: -1 };
        else if (e.key === '9') moveVector = { x: 1, y: -1 };
        else return;

        if (moveVector) {
          e.preventDefault();
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

  function zoomIn() { setTileSize(prevSize => prevSize + 8); }
  function zoomOut() { setTileSize(prevSize => Math.max(16, prevSize - 8)); }

  const handleAddEnemy = async (prompt: string) => {
    if (!prompt) return;
    if (isGeneratingEnemy) return; // Prevent multiple simultaneous generations

    setIsGeneratingEnemy(true);
    setGenerationStatus(''); // Clear previous status
    setGameLog(prev => [`${getCurrentTime()} Generating enemy from prompt: "${prompt}"...`, ...prev].slice(0, 100));

    try {
      // Generate enemy behavior using LLM
      const { enemyName, moveCode } = await generateEnemyBehavior(
        prompt,
        (status, percent) => {
          setGenerationStatus(`${status} (${Math.floor(percent * 100)}%)`);
        }
      );

      // Validate the generated code
      if (!validateGeneratedCode(moveCode)) {
        setGameLog(prev => [`${getCurrentTime()} Error: Generated code validation failed. Enemy not created.`, ...prev].slice(0, 100));
        setIsGeneratingEnemy(false);
        // Keep the error status visible
        return;
      }

      const maxMovementOrder = entities.reduce((max, e) => Math.max(max, e.movementOrder), -1);

      // Spawn at grid center (10, 10)
      let spawnPos = { x: 10, y: 10 };

      // If center is occupied, try nearby positions
      if (levelData.layer1[spawnPos.y][spawnPos.x] !== 0 || entities.some(e => e.position.x === spawnPos.x && e.position.y === spawnPos.y)) {
        // Try positions around center
        const offsets = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
        { x: 1, y: 1 }, { x: -1, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 1 }];
        for (const offset of offsets) {
          const testX = 10 + offset.x;
          const testY = 10 + offset.y;
          if (testX >= 0 && testX < GRID_WIDTH && testY >= 0 && testY < GRID_HEIGHT &&
            levelData.layer1[testY][testX] === 0 &&
            !entities.some(e => e.position.x === testX && e.position.y === testY)) {
            spawnPos = { x: testX, y: testY };
            break;
          }
        }
      }

      // Create dynamic persona with generated code
      const persona = new DynamicPersona(enemyName, moveCode, prompt);

      const newEnemy: Entity = {
        id: Date.now(),
        type: enemyName.toLowerCase(),
        position: spawnPos,
        persona: persona,
        movementOrder: maxMovementOrder + 1
      };

      setEntities(prev => [...prev, newEnemy]);
      setGameLog(prev => [`${getCurrentTime()} Created enemy '${enemyName}' at (${spawnPos.x}, ${spawnPos.y}) with order ${newEnemy.movementOrder}`, ...prev].slice(0, 100));
    } catch (error) {
      console.error('Error generating enemy:', error);
      setGameLog(prev => [`${getCurrentTime()} Error generating enemy: ${error instanceof Error ? error.message : 'Unknown error'}`, ...prev].slice(0, 100));
    } finally {
      setIsGeneratingEnemy(false);
      // Do NOT clear generationStatus here, so it persists
    }
  };

  return (
    <div className={styles.container}>
      <TopBar />
      <div className={styles.content}>
        <div className={styles.mainArea}>
          <div className={styles.gameArea} onClick={(e) => {
            if ((e.target as HTMLElement).tagName !== 'INPUT') {
              (document.activeElement as HTMLElement)?.blur();
            }
          }}>
            <Grid layer0={levelData.layer0} layer1={levelData.layer1} entityGrid={entityGrid} entities={entities} width={GRID_WIDTH} tileSize={tileSize} />

            <div className={styles.controlsRow}>
              <div className={styles.inputWrapper}>
                <input
                  type="text"
                  className={styles.promptBox}
                  placeholder="Describe an enemy (e.g., 'Create a Scarab that seeks the pug')..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isGeneratingEnemy) {
                      handleAddEnemy(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                  disabled={isGeneratingEnemy}
                />
                {generationStatus && <p className={styles.statusText}>{generationStatus}</p>}
              </div>
              <ContentButton
                text={isGeneratingEnemy ? "Generating..." : "Generate"}
                onClick={() => {
                  if (!isGeneratingEnemy) {
                    const input = document.querySelector(`.${styles.promptBox}`) as HTMLInputElement;
                    handleAddEnemy(input.value);
                    input.value = '';
                  }
                }}
              />
            </div>
          </div>

          <div className={styles.notificationArea} style={{
            overflowY: 'auto',
            height: '600px', /* Increased height to match grid better */
            border: '1px solid #ccc',
            padding: '0.5rem',
            fontFamily: 'monospace',
            fontSize: '0.8rem'
          }}>
            {gameLog.map((msg, index) => (
              <p key={index} style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}>{msg}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomeScreen;