import Persona, { Avatar } from '../Persona';
import roachMotherImage from '@/assets/persona/roachMother.png';

class Roach implements Persona {
    public isPlayer: boolean = false;
    public avatar: Avatar = {
        North: roachMotherImage,
        East: roachMotherImage,
        South: roachMotherImage,
        West: roachMotherImage,
    };
    public goal: string = "You want to flee the pug.";
    public prompt: string = "You want to maximise the distance to the pug.";
}

export default Roach;