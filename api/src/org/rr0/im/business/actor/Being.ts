import {Actor} from "./Actor";
import {Classifiable} from "../../service/function/classification/Classifiable";
import {Length} from "../event/circumstance/Length";
import {Weight} from "../event/circumstance/Weight";

/**
 * A single physical and intelligent being.
 */
export interface Being extends Actor, Classifiable
{
    /**
     * @return The being's height
     * @associates <{org.rr0.im.business.event.circumstance.Length}>
     */
    getHeight(locale: Locale): Length;

    /**
     * @return The being's weight
     * @associates <{org.rr0.im.business.event.circumstance.Weight}>
     */
    getWeight(): Weight;
}
