import Persona, { Avatar, MoveContext } from '../Persona';
import { Position } from '../types';
import roachMotherImage from '@/assets/persona/roachMother.png';

class RoachMother implements Persona {
    public isPlayer: boolean = false;
    public avatar: Avatar = {
        North: roachMotherImage,
        East: roachMotherImage,
        South: roachMotherImage,
        West: roachMotherImage,
    };
    public goal: string = "Avoid the pug";
    public prompt: string = "";

    public move(context: MoveContext, futureGrid: (string | number)[][]): Position {
        const { entities, myPosition } = context;
        const pug = entities.find(e => e.type === 'pug');

        let newX = myPosition.x;
        let newY = myPosition.y;

        if (pug) {
            const dx = myPosition.x - pug.position.x; // Vector FROM pug
            const dy = myPosition.y - pug.position.y;

            // Move away (allows diagonal)
            if (dx !== 0) newX += Math.sign(dx);
            else newX += (Math.random() > 0.5 ? 1 : -1); // If aligned, pick a random side direction

            if (dy !== 0) newY += Math.sign(dy);
            else newY += (Math.random() > 0.5 ? 1 : -1);
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

        futureGrid[newY][newX] = 'roachMother';
        return { x: newX, y: newY };
    }
}

export default RoachMother;