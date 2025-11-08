import { Entity } from "@/persona/types";
import { GRID_HEIGHT, GRID_WIDTH } from "./HomeScreen";

export interface GameState {
  turn: number;
  entities: Entity[];
  entityGrid: (string | number)[][];
  gameLog: string[];
  awaitingPlayerInput: boolean;
}

export type GameAction =
  | { type: 'START_TURN' }
  | { type: 'PLAYER_MOVE'; payload: { newEntities: Entity[] } }
  | { type: 'ENEMY_TURN'; payload: { newEntities: Entity[] } }
  | { type: 'LOG_MESSAGE'; payload: string | string[] }
  | { type: 'SET_AWAITING_INPUT'; payload: boolean };

export function initState(initialEntities: Entity[]): GameState {
    const entityGrid = Array(GRID_HEIGHT).fill(0).map(() => Array(GRID_WIDTH).fill(0));
    for (const entity of initialEntities) {
        entityGrid[entity.position.y][entity.position.x] = entity.type;
    }

    return {
        turn: 0,
        entities: initialEntities,
        entityGrid,
        gameLog: [],
        awaitingPlayerInput: false,
    };
}

function getCurrentTime(): string {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_TURN':
      return {
        ...state,
        turn: state.turn + 1,
        awaitingPlayerInput: true,
        gameLog: [`${getCurrentTime()} Awaiting player move (use arrows or WASD)`, `${getCurrentTime()} Start turn ${state.turn + 1}`, ...state.gameLog].slice(0, 100),
      };
    case 'PLAYER_MOVE':
      const newGrid = Array(GRID_HEIGHT).fill(0).map(() => Array(GRID_WIDTH).fill(0));
      for (const entity of action.payload.newEntities) {
        newGrid[entity.position.y][entity.position.x] = entity.type;
      }
      return { ...state, entities: action.payload.newEntities, entityGrid: newGrid };
    case 'ENEMY_TURN':
      const enemyGrid = Array(GRID_HEIGHT).fill(0).map(() => Array(GRID_WIDTH).fill(0));
      for (const entity of action.payload.newEntities) {
        enemyGrid[entity.position.y][entity.position.x] = entity.type;
      }
      // After enemies move, we start the next turn, which will await player input.
      return { ...state, turn: state.turn + 1, entities: action.payload.newEntities, entityGrid: enemyGrid };
    case 'LOG_MESSAGE':
        const messages = Array.isArray(action.payload) ? action.payload : [action.payload];
        const timedMessages = messages.map(msg => `${getCurrentTime()} ${msg}`);
        return { ...state, gameLog: [...timedMessages, ...state.gameLog].slice(0, 100) };
    case 'SET_AWAITING_INPUT':
        return { ...state, awaitingPlayerInput: action.payload };
    default:
      return state;
  }
}