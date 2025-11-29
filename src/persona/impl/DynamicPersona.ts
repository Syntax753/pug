import Persona, { Avatar, MoveContext } from '../Persona';
import { Position } from '../types';
import { generateLetterSprite } from '@/common/spriteGenerator';

/**
 * DynamicPersona - A persona that uses runtime-generated move() code
 * This allows for LLM-generated enemy behaviors
 */
class DynamicPersona implements Persona {
    public isPlayer: boolean = false;
    public avatar: Avatar;
    public goal: string;
    public prompt: string = "";

    private moveFunction: (context: MoveContext, futureGrid: (string | number)[][]) => Position;
    private enemyName: string;

    /**
     * Create a new DynamicPersona
     * @param enemyName - Name of the enemy
     * @param moveCode - JavaScript code for the move() method body
     * @param goal - Optional goal description
     */
    constructor(enemyName: string, moveCode: string, goal?: string) {
        this.enemyName = enemyName;
        this.goal = goal || `Custom behavior: ${enemyName}`;

        // Generate sprite from first letter of enemy name
        const sprite = generateLetterSprite(enemyName);
        this.avatar = {
            North: sprite,
            East: sprite,
            South: sprite,
            West: sprite,
        };

        // Create the move function from the generated code
        try {
            // Use Function constructor to create a function from the code string
            // This is safer than eval() as it doesn't have access to the local scope
            this.moveFunction = new Function(
                'context',
                'futureGrid',
                moveCode
            ) as (context: MoveContext, futureGrid: (string | number)[][]) => Position;
        } catch (error) {
            console.error(`Failed to create move function for ${enemyName}:`, error);
            // Fallback: stay in place
            this.moveFunction = (context: MoveContext) => context.myPosition;
        }
    }

    /**
     * Execute the dynamically generated move logic
     */
    public move(context: MoveContext, futureGrid: (string | number)[][]): Position {
        try {
            const result = this.moveFunction(context, futureGrid);

            // Validate the result
            if (!result || typeof result.x !== 'number' || typeof result.y !== 'number') {
                console.error(`Invalid move result from ${this.enemyName}:`, result);
                return context.myPosition;
            }

            // Ensure position is within bounds
            const x = Math.max(0, Math.min(19, Math.floor(result.x)));
            const y = Math.max(0, Math.min(19, Math.floor(result.y)));

            return { x, y };
        } catch (error) {
            console.error(`Error executing move for ${this.enemyName}:`, error);
            // Fallback: stay in place
            return context.myPosition;
        }
    }
}

export default DynamicPersona;
