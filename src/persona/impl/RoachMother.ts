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
            let tryX = newX;
            let tryY = newY;

            if (dx !== 0) tryX += Math.sign(dx);
            else tryX += (Math.random() > 0.5 ? 1 : -1); // If aligned, pick a random side direction

            if (dy !== 0) tryY += Math.sign(dy);
            else tryY += (Math.random() > 0.5 ? 1 : -1);

            // Simple bounds check
            tryX = Math.max(0, Math.min(futureGrid[0].length - 1, tryX));
            tryY = Math.max(0, Math.min(futureGrid.length - 1, tryY));

            // Check for obstacles in layer1 OR futureGrid
            if (context.isValid(tryX, tryY)) {
                newX = tryX;
                newY = tryY;
            } else {
                // Blocked, try random cardinal move? Or just stay put for now as per simple AI
                // For now, RoachMother just stays put if blocked, or we could add retry logic.
                // Given the request was specifically about Roach logic (prefer vertical), 
                // and RoachMother has different logic (fleeing), staying put is a safe default for now
                // to avoid complex fleeing pathfinding in this step.
            }
        }

        return { x: newX, y: newY };
    }
}

export default RoachMother;