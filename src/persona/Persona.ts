import { Entity, Position } from './types';

export interface Avatar {
    North: string;
    East: string;
    South: string;
    West: string;
}

export interface MoveContext {
    entities: Entity[];
    myPosition: Position;
    playerInput?: { x: number, y: number };
    layer1: number[][];
    isValid: (x: number, y: number) => boolean;
}

export default interface Persona {
    isPlayer: boolean;
    avatar: Avatar;
    goal: string;
    prompt: string;
    move(context: MoveContext, futureGrid: (string | number)[][]): Position;
}