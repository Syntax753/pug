import Persona, { Avatar, MoveContext } from '../Persona';
import { Position } from '../types';
import pugImage from '@/assets/persona/pug.png';

class Pug implements Persona {
    public isPlayer: boolean = true;
    public avatar: Avatar = {
        North: pugImage,
        East: pugImage,
        South: pugImage,
        West: pugImage,
    };
    public goal: string = "";
    public prompt: string = "";

    public move(context: MoveContext, futureGrid: (string | number)[][]): Position {
        const { myPosition, playerInput } = context;
        let newX = myPosition.x;
        let newY = myPosition.y;

        if (playerInput === 'up') newY--;
        else if (playerInput === 'down') newY++;
        else if (playerInput === 'left') newX--;
        else if (playerInput === 'right') newX++;

        // Clamp to grid bounds
        newX = Math.max(0, Math.min(futureGrid[0].length - 1, newX));
        newY = Math.max(0, Math.min(futureGrid.length - 1, newY));

        // Check for obstacles in layer1
        if (context.layer1[newY][newX] === 92) {
            // Blocked, stay at current position
            newX = myPosition.x;
            newY = myPosition.y;
        }

        // Update future grid
        futureGrid[newY][newX] = 'pug';
        return { x: newX, y: newY };
    }
}

export default Pug;