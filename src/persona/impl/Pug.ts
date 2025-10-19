import Persona, { Avatar } from '../Persona';
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
}

export default Pug;