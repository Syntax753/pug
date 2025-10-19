export interface Avatar {
    North: string;
    East: string;
    South: string;
    West: string;
}

export default interface Persona {
    isPlayer: boolean;
    avatar: Avatar;
    goal: string;
    prompt: string;
}