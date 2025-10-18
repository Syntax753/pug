import Persona from '@/personas/Persona';

export interface Position {
  x: number;
  y: number;
}

export interface Entity {
  id: number;
  persona: Persona;
  position: Position;
}