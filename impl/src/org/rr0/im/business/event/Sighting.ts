import {Being} from "../../../../../../../api/src/org/rr0/im/business/actor/Being";
import {WeatherCondition} from "../../../../../../../api/src/org/rr0/im/business/event/circumstance/WeatherCondition";
import {Moment} from "../../../../../../../api/src/org/rr0/im/business/event/circumstance/Moment";
import {Source} from "../../../../../../../api/src/org/rr0/im/business/report/Source";
import {Account} from "../report/Account";
import {Place} from "../../../../../../../api/src/org/rr0/im/business/event/circumstance/Place";

/**
 * Sighting Reference Implementation.
 */
export class Sighting extends Account {
  /**
   * Where the sighting occurred
   */
  location: Place;

  /**
   * The anomalous appearance will be the first clue for the researcher
   * to doubt the normality of what has been observed.
   * An apparently physical phenomenon will have such an anomalous aspect
   * when its shape or dimensions do not correlate with any identifiable flying craft.
   * Its shape may be that of disk, cigar, etc., or it can include in its description,
   * for instance, lights for which intensity or situation immediately
   * exclude other conventional lights to be sighted in the skies.
   */
  anomalousAppearance: boolean;

  /**
   * Anomalous movements are those dynamic characteristics of the observed phenomenon
   * which make it impossible to receive a logical explanation,
   * based on actual knowledge. Definition must include enormous horizontal or ascending speeds
   * (higher than those of the fastest aircraft); enormous accelerations (idem),
   * strange trajectories (mixed, broken, helicoidal, etc.);
   * ascent or descent in the "dead leaf" fashion (as if no gravity existed);
   * and in general, any contradiction with the usual movements of aeronautical devices,
   * astronomical bodies, birds, etc.
   */
  anomalousMouvements: boolean;

  /**
   * By physical-spatial incongruities we mean those elements
   * which are in flagrant contradiction with the intuitive sense of the dimensions
   * and the volumes (such as evident, well observed apparitions and disappearances sur place,
   * the merging of two objects into one, etc.), and/or that which seems
   * to violate the known behavior of the physical entities
   * (such as deformations of apparently material objects, "solid light" cases, etc.).
   */
  physicalOrSpatialIncongruities: boolean;

  /**
   * The technological detection refers to the observing and/or recording
   * of the passage of the UFO through calibrated precision instruments
   * (technical or scientific): radar or laser tracking,
   * observation through telescope or theodolite, record in photograph,
   * film or videotape, light spectrum analysis, audio recording, etc.
   */
  technologyDetected: boolean;

  /**
   * A close encounter occurs when the witness has enjoyed a privileged position,
   * thanks to the proximity of the event, to observe in detail without the distortion of distance.
   * Quantitatively, this factor should follow Hynek's range
   * (i.e., within 500 feet or 150 meters).
   */
  closeEncounter: boolean;

  /**
   * By traces and effects we mean those lasting physical or chemical characteristics
   * or residues left by a UFO after its disappearance,
   * provided that there matches some testimony that the traces or effects
   * were produced by the presence of the UFO.
   * These should include effects in people, effects of a mechanical nature,
   * physical changes in inanimate bodies, and electromagnetic effects on motors,
   * vehicles, or electric circuits.
   */
  tracesOrEffectsProducted: boolean;

  /**
   * The weather conditions when the sighting occurred.
   */
  weatherConditions: WeatherCondition;

  /**
   * Returns the witness of the Sighting.
   * Multiple witnesses imply multiple Sightings.
   */
  witness: Being;

  ufos = [];

  /**
   * The presence of beings we mean the association of presumed occupants
   * with objects that conform to at least some of the requirements
   * of Anomalous appearance, Anomalous mouvements, and Physical-spatial incongruities.
   *
   * @return A collection of Beings, or an empty collection if no beings were sighted.
   */
  beings = [];

  constructor(someMoment: Moment, someLocation: Place, witness: Being, source: Source) {
    super(someMoment, source);
    this.location = someLocation;
  }
}