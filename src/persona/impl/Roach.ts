import Persona, { Avatar } from '../Persona';
import roachImage from '@/assets/persona/roach.png';

class Roach implements Persona {
    public isPlayer: boolean = false;
    public avatar: Avatar = {
        North: roachImage,
        East: roachImage,
        South: roachImage,
        West: roachImage,
    };
    public goal: string = "You are hungry - You want to reach the player and eat them.";
    public prompt: string = "You are a roach. You prefer vertical over horizontal.";
}

export default Roach;