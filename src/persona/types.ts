import Persona from '@/persona/Persona';

export interface Position {
  x: number;
  y: number;
}

export interface Entity {
  id: number;
  type: 'pug' | 'roach' | 'roachMother';
  persona: Persona;
  position: Position;
}