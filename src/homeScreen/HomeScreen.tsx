import { useEffect, useMemo, useState } from "react";
import { lua, lauxlib, lualib, to_luastring } from "fengari";

import WaitingEllipsis from '@/components/waitingEllipsis/WaitingEllipsis';
import ContentButton from '@/components/contentButton/ContentButton';
import LoadScreen from '@/loadScreen/LoadScreen';
import TopBar from '@/components/topBar/TopBar';
import Grid from '@/components/grid/Grid';
import { GENERATING, submitPrompt } from "@/homeScreen/interactions/prompt";
import { Entity, Position } from '@/persona/types';
import styles from '@/homeScreen/HomeScreen.module.css';
import Pug from '@/persona/impl/Pug';

const LUA_GEN_SYSTEM_PROMPT = `
You are an AI assistant that generates Lua scripts for enemy behavior in a grid-based game.
The user will describe a monster and its behavior. You will translate this into a Lua script.
The script must contain a 'move' function with the signature: function move(player, self, enemies)
- 'player': A table with the player's position, e.g., { x = 1, y = 1 }.
- 'self': A table with the current enemy's position, e.g., { x = 8, y = 8 }.
- 'enemies': A list of tables for all other enemies, e.g., [ { x = 3, y = 4 } ].
The 'move' function must return a table with the new x and y coordinates for the enemy.
The enemy can only move one square in any cardinal direction (up, down, left, or right).
Do not move diagonally. Do not stay in the same spot unless there are no valid moves.
Ensure the new position is within the 10x10 grid (coordinates 0 to 9).
Only output the raw Lua script. Do not include any extra text or markdown.
`;

const SYSTEM_PROMPT = `You are an AI controlling enemies in a turn-based grid game. This is a single turn. After all enemies have moved one square, the player will have their turn.

On the grid, the player is 'pug', enemies are 'roach' or 'roachMother', and '*' is an open space.

Enemy goals for this turn:
- 'roach': Move one square towards the 'pug', preferring vertical movement.
- 'roachMother': Move one square away from the 'pug'.

Rules:
- Each enemy can only move a maximum of one square (up, down, left, or right) into an adjacent '*' space.
- Enemies cannot move into spaces occupied by other entities.
- Do not move the 'pug'.

You will be given the current grid state. Your task is to return a new grid of the same size showing the new positions for ALL enemies for this single turn. Only output the new grid.
`;
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

  const toLuaTable = (obj: any): string => {
    if (Array.isArray(obj)) {
      return `{${obj.map(toLuaTable).join(',')}}`;
    } else if (typeof obj === 'object' && obj !== null) {
      return `{${Object.entries(obj).map(([k, v]) => `${k}=${toLuaTable(v)}`).join(',')}}`;
    }
    return JSON.stringify(obj);
  };

  const executeTurn = async (playerDirection: 'up' | 'down' | 'left' | 'right') => {
    setGameLog(prev => [`${getCurrentTime()} Player move: ${playerDirection}`, ...prev].slice(0, 100));

    // 1. Calculate player's new position
    const player = entities.find(e => e.persona.isPlayer);
    if (!player) return;
    let newPlayerPos = { ...player.position };
    if (playerDirection === 'up') newPlayerPos.y--;
    else if (playerDirection === 'down') newPlayerPos.y++;
    else if (playerDirection === 'left') newPlayerPos.x--;
    else if (playerDirection === 'right') newPlayerPos.x++;

    // Clamp player position
    newPlayerPos.x = Math.max(0, Math.min(GRID_WIDTH - 1, newPlayerPos.x));
    newPlayerPos.y = Math.max(0, Math.min(GRID_HEIGHT - 1, newPlayerPos.y));

    const newEntities = entities.map(e => ({ ...e })); // Create a mutable copy
    const playerEntity = newEntities.find(e => e.persona.isPlayer);
    if (playerEntity) playerEntity.position = newPlayerPos;

    // 2. Process enemy moves
    setGameLog(prev => [`${getCurrentTime()} Processing enemy moves...`, ...prev].slice(0, 100));
    const enemies = newEntities.filter(e => !e.persona.isPlayer);
    for (const enemy of enemies) {
      if (enemy.luaScript) {
        const L = lauxlib.lauxlib.luaL_newstate();
        lualib.lualib.luaL_openlibs(L);

        const playerTable = toLuaTable(playerEntity?.position);
        const selfTable = toLuaTable(enemy.position);
        const otherEnemies = enemies.filter(e => e.id !== enemy.id).map(e => e.position);
        const enemiesTable = toLuaTable(otherEnemies);

        const luaCode = `
          player = ${playerTable}
          self = ${selfTable}
          enemies = ${enemiesTable}
          ${enemy.luaScript}
          return move(player, self, enemies)
        `;

        try {
          lauxlib.lauxlib.luaL_dostring(L, to_luastring(luaCode));

          if (lua.lua.lua_istable(L, -1)) {
            lua.lua.lua_getfield(L, -1, to_luastring('x'));
            const newX = lua.lua.lua_tointeger(L, -1);
            lua.lua.lua_pop(L, 1);

            lua.lua.lua_getfield(L, -1, to_luastring('y'));
            const newY = lua.lua.lua_tointeger(L, -1);
            lua.lua.lua_pop(L, 1);

            enemy.position = { x: newX, y: newY };
            setGameLog(prev => [`${getCurrentTime()} Enemy ${enemy.type}#${enemy.id} moved to (${newX}, ${newY})`, ...prev].slice(0, 100));
          }
        } catch (e) {
          console.error("Lua execution error:", e);
          setGameLog(prev => [`${getCurrentTime()} Error executing script for enemy ${enemy.type}#${enemy.id}`, ...prev].slice(0, 100));
        }

        lua.lua.lua_close(L);
      }
    }

    setEntities(newEntities);
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
    setGameLog(prev => [`${getCurrentTime()} Generating new enemy...`, ...prev].slice(0, 100));

    const luaScript = await submitPrompt(
      LUA_GEN_SYSTEM_PROMPT,
      prompt,
      () => { },
      (response, isFinal) => { },
      true
    );

    const newEnemy: Entity = {
      id: Date.now(),
      type: prompt.charAt(0).toUpperCase(),
      position: { x: 8, y: 8 },
      luaScript: luaScript,
      persona: { isPlayer: false }
    };

    setEntities(prev => [...prev, newEnemy]);
    setGameLog(prev => [`${getCurrentTime()} Added new enemy '${newEnemy.type}' with script:`, luaScript, ...prev].slice(0, 100));
  };

  return (
    <div className={styles.container}>
      <TopBar />
      <div className={styles.content}>
        <div className={styles.mainArea}>
          <Grid layer0={layer0} entityGrid={entityGrid} width={GRID_WIDTH} height={GRID_HEIGHT} tileSize={tileSize} />
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
              placeholder="Describe a monster and its behavior..."
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