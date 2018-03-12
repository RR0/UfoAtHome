import {Event} from './Event';

/**
 * <p/>
 * A chronologically ordered collection of events,
 * with an acceptable interval of time between events.
 * </p>
 * <p/>
 * A TimeLine can be viewed as a coarse-grained event.
 * </p>
 */
export interface TimeLine extends Event {
  /**
   * Returns the collection of Events, in their chronological order.
   */
  //iterator(): Iterator;

  /**
   * Adds a event to the TimeLine.
   *
   * @param event The event to add.
   */
  add(event: Event);

  /**
   * @return The events' count in this timeline
   */
  size(): number;
}
