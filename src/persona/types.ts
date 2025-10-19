import Persona from '@/persona/Persona';

export interface Position {
  x: number;
  y: number;
}

export interface Entity {
  id: number;
  type: 'pug' | 'roach';
  persona: Persona;
  position: Position;
}