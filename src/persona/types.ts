import Persona from '@/persona/Persona';

export interface Position {
  x: number;
  y: number;
}

export interface Entity {
  id: number;
  type: string;
  persona: Persona;
  position: Position;
  movementOrder: number;
}