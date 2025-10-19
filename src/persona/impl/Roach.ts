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
    public goal: string = "You are a roach. You are hungry. You want to reach the player and eat them.";
    public prompt: string = "You prefer vertical movement over horizontal movement.";
}

export default Roach;