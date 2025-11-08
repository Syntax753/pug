import { useEffect, useMemo, useState, useReducer } from "react";

import WaitingEllipsis from '@/components/waitingEllipsis/WaitingEllipsis';
import ContentButton from '@/components/contentButton/ContentButton';
import LoadScreen from '@/loadScreen/LoadScreen';
import TopBar from '@/components/topBar/TopBar';
import Grid from '@/components/grid/Grid';  
import { gameReducer, initState } from './gameLogic';
import { GENERATING, submitPrompt, SYSTEM_MESSAGE } from '@/homeScreen/interactions/prompt';
import { getLLMNavigatorMove } from '@/homeScreen/interactions/game';
import { Entity, Position } from '@/persona/types';
import styles from '@/homeScreen/HomeScreen.module.css';
import Pug from '@/persona/impl/Pug';
import Roach from '@/persona/impl/Roach';
import RoachMother from '@/persona/impl/RoachMother';

const SYSTEM_PROMPT = `You are an AI controlling enemies in a turn-based grid game.

You will be given a JSON array of objects, where each object represents an enemy with its type and its position relative to the player ('pug').
For example: \`[{ "type": "roach", "relative_pos": }, { "type": "roachMother", "relative_pos": [-1, 4] }]\`
This means the 'roach' is 3 squares right and 2 squares down from the pug, and the 'roachMother' is 1 square left and 4 squares down.

Enemy goals for this turn:
- 'roach': Move one square closer to the 'pug' (0,0).
- 'roachMother': Move one square further away from the 'pug' (0,0).

Rules:
- Each enemy can only move one square (up, down, left, or right).
- Enemies cannot move into spaces occupied by other entities.
- Do not move the 'pug'.

Your task is to return a new JSON array with the new relative positions for ALL enemies for this single turn. Only output the JSON array.
`;
export const GRID_WIDTH = 15;
export const GRID_HEIGHT = 9;


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

function HomeScreen() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [prompt, setPrompt] = useState<string>('');
  const [responseText, setResponseText] = useState<string>('');
  const [tileSize, setTileSize] = useState<number>(() => Math.floor(window.innerWidth * 0.8 / GRID_WIDTH));


  useEffect(() => {
    const handleResize = () => {
      setTileSize(Math.floor(window.innerWidth * 0.8 / GRID_WIDTH));
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial calculation
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const initialEntities: Entity[] = useMemo(() => [
    { id: 1, type: 'pug', persona: new Pug(), position: { x: 1, y: 1 } },
    { id: 2, type: 'roach', persona: new Roach(), position: { x: 3, y: 3 } },
    { id: 3, type: 'roach', persona: new Roach(), position: { x: 4, y: 4 } },
    { id: 4, type: 'roachMother', persona: new RoachMother(), position: { x: 3, y: 1 } },
  ], []);

  const [gameState, dispatch] = useReducer(gameReducer, initialEntities, initState);
  const { turn, entities, entityGrid, gameLog, awaitingPlayerInput } = gameState;

  // Generate a random seed once per component instance to vary the grass pattern
  const seed = useMemo(() => Math.random() * 1000, []);

  const layer0 = useMemo<number[][]>(() => {
    return loadGrid(GRID_WIDTH, GRID_HEIGHT, seed);
  }, [seed]);

  useEffect(() => {
    if (isLoading) return;

    // Game Loop
    if (turn === 0 || !awaitingPlayerInput) {
      dispatch({ type: 'START_TURN' });
    }
  }, [isLoading, turn, awaitingPlayerInput]);

  const executeTurn = async (playerDirection: 'up' | 'down' | 'left' | 'right') => {
    dispatch({ type: 'LOG_MESSAGE', payload: `Player move: ${playerDirection}` });
  
    // --- Player's Turn ---
    // 1. Calculate player's new position
    const player = entities.find(e => e.type === 'pug');
    if (!player) return;
    let newPlayerPos = { ...player.position };
    if (playerDirection === 'up') newPlayerPos.y--;
    else if (playerDirection === 'down') newPlayerPos.y++;
    else if (playerDirection === 'left') newPlayerPos.x--;
    else if (playerDirection === 'right') newPlayerPos.x++;
  
    // Apply player's move
    const entitiesAfterPlayerMove = entities.map(e => e.id === player.id ? { ...player, position: newPlayerPos } : e);
    dispatch({ type: 'PLAYER_MOVE', payload: { newEntities: entitiesAfterPlayerMove } });

    // --- Enemy's Turn (pass the next state to the LLM) ---
    // 2. Prepare grid for LLM
    const playerAfterMove = entitiesAfterPlayerMove.find(e => e.type === 'pug');
    if (!playerAfterMove) return;

    const enemyRelativePositions = entitiesAfterPlayerMove
      .filter(e => !e.persona.isPlayer)
      .map(enemy => ({
        type: enemy.type,
        relative_pos: [
          enemy.position.x - playerAfterMove.position.x,
          enemy.position.y - playerAfterMove.position.y,
        ],
      }));

    const userPrompt = JSON.stringify(enemyRelativePositions);
  
    dispatch({ type: 'LOG_MESSAGE', payload: 'Awaiting enemy moves...' });
    const llmResponse = await getLLMNavigatorMove(SYSTEM_PROMPT, userPrompt);
    dispatch({ type: 'LOG_MESSAGE', payload: 'Enemies have moved.' });
  
    // 3. Parse LLM response and create new entity list
    const newRelativePositions = JSON.parse(llmResponse);
    dispatch({ type: 'LOG_MESSAGE', payload: `LLM response: ${llmResponse}` });

    const newEntities: Entity[] = [];
    const enemiesToMove = entitiesAfterPlayerMove.filter(e => !e.persona.isPlayer);
  
    for (let i = 0; i < newRelativePositions.length; i++) {
      const enemyData = newRelativePositions[i];
      const originalEnemy = enemiesToMove[i]; // Match by index
      if (originalEnemy && originalEnemy.type === enemyData.type) {
        const newPosition = {
          x: playerAfterMove.position.x + enemyData.relative_pos[0],
          y: playerAfterMove.position.y + enemyData.relative_pos[1],
        };
        newEntities.push({ ...originalEnemy, position: newPosition });
      }
    }
  
    // Add player to the new entity list
    if (playerAfterMove) newEntities.push(playerAfterMove);
  
    // Add any enemies that the LLM failed to place back in their original positions
    // This logic is now handled by matching indices. If the LLM returns fewer enemies, they won't be moved.
  
    // 4. Apply all moves simultaneously
    const sortedEntities = newEntities.sort((a, b) => a.id - b.id);
    dispatch({ type: 'ENEMY_TURN', payload: { newEntities: sortedEntities } });
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
          dispatch({ type: 'SET_AWAITING_INPUT', payload: false });
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
        <div className={styles.mainArea}>
          <Grid layer0={layer0} entityGrid={entityGrid} width={GRID_WIDTH} height={GRID_HEIGHT} tileSize={tileSize} />
          <div className={styles.notificationArea} style={{ overflowY: 'auto' }}>
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
        </div>
      </div>
    </div>
  );
}

export default HomeScreen;