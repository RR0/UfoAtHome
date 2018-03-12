import {Duration} from "./circumstance/Duration";

/**
 * Something that last for some time.
 */
export interface Durable {
  getDuration(): Duration;
}
