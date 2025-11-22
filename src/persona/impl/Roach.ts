import Persona, { Avatar, MoveContext } from '../Persona';
import { Position } from '../types';
import roachImage from '@/assets/persona/roach.png';

class Roach implements Persona {
    public isPlayer: boolean = false;
    public avatar: Avatar = {
        North: roachImage,
        East: roachImage,
        South: roachImage,
        West: roachImage,
    };
    public goal: string = "Seek the pug";
    public prompt: string = "";

    public move(context: MoveContext, futureGrid: (string | number)[][]): Position {
        const { entities, myPosition } = context;
        const pug = entities.find(e => e.type === 'pug');

        let newX = myPosition.x;
        let newY = myPosition.y;

        if (pug) {
            const dx = pug.position.x - myPosition.x;
            const dy = pug.position.y - myPosition.y;

            // Move towards pug (allows diagonal)
            if (dx !== 0) newX += Math.sign(dx);
            if (dy !== 0) newY += Math.sign(dy);
        }

        // Simple bounds check
        newX = Math.max(0, Math.min(futureGrid[0].length - 1, newX));
        newY = Math.max(0, Math.min(futureGrid.length - 1, newY));

        // Check for obstacles in layer1
        if (context.layer1[newY][newX] === 92) {
            // Blocked, stay at current position
            newX = myPosition.x;
            newY = myPosition.y;
        }

        futureGrid[newY][newX] = 'roach';
        return { x: newX, y: newY };
    }
}

export default Roach;