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
    public goal: string = "You want to flee the pug.";
    public prompt: string = "You want to maximise the distance to the pug.";

    public move(context: MoveContext, futureGrid: (string | number)[][]): Position {
        const { entities, myPosition } = context;
        const pug = entities.find(e => e.type === 'pug');

        let newX = myPosition.x;
        let newY = myPosition.y;

        if (pug) {
            const dx = myPosition.x - pug.position.x; // Vector FROM pug
            const dy = myPosition.y - pug.position.y;

            // Move away
            if (Math.abs(dx) > Math.abs(dy)) {
                newX += Math.sign(dx) || (Math.random() > 0.5 ? 1 : -1);
                if (dx === 0 && dy === 0) newX++;
            } else {
                newY += Math.sign(dy) || (Math.random() > 0.5 ? 1 : -1);
            }
        }

        // Simple bounds check
        newX = Math.max(0, Math.min(futureGrid[0].length - 1, newX));
        newY = Math.max(0, Math.min(futureGrid.length - 1, newY));

        futureGrid[newY][newX] = 'roachMother';
        return { x: newX, y: newY };
    }
}

export default RoachMother;