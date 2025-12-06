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

    public move(context: MoveContext, _: (string | number)[][]): Position {
        const { entities, myPosition } = context;
        const pug = entities.find(e => e.type === 'pug');

        let newX = myPosition.x;
        let newY = myPosition.y;

        if (pug) {
            const dx = pug.position.x - myPosition.x;
            const dy = pug.position.y - myPosition.y;

            // Try diagonal move first
            let targetX = myPosition.x + (dx !== 0 ? Math.sign(dx) : 0);
            let targetY = myPosition.y + (dy !== 0 ? Math.sign(dy) : 0);

            if (context.isValid(targetX, targetY)) {
                newX = targetX;
                newY = targetY;
            } else {
                // Diagonal blocked, try vertical first (prefer vertical over horizontal)
                if (dy !== 0) {
                    targetX = myPosition.x;
                    targetY = myPosition.y + Math.sign(dy);
                    if (context.isValid(targetX, targetY)) {
                        newX = targetX;
                        newY = targetY;
                    } else if (dx !== 0) {
                        // Vertical blocked, try horizontal
                        targetX = myPosition.x + Math.sign(dx);
                        targetY = myPosition.y;
                        if (context.isValid(targetX, targetY)) {
                            newX = targetX;
                            newY = targetY;
                        }
                        // If all blocked, stay at current position (newX, newY unchanged)
                    }
                } else if (dx !== 0) {
                    // Only horizontal movement needed
                    targetX = myPosition.x + Math.sign(dx);
                    targetY = myPosition.y;
                    if (context.isValid(targetX, targetY)) {
                        newX = targetX;
                        newY = targetY;
                    }
                    // If blocked, stay at current position
                }
            }
        }

        return { x: newX, y: newY };
    }
}

export default Roach;