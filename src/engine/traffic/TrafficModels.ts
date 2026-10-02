/**
 * Which model of the decor catalogue (see public/models/index.json) draws an aircraft close to the observer, by its ICAO type designator.
 *
 * A DATUM table: a model is added by a catalogue entry and a row here, never by more code. A type with no row keeps the built-in shape,
 * which is also what every aircraft is drawn with at a distance (see SceneRenderer.TRAFFIC_MODEL_RANGE_M). The model is scaled to the real
 * length of the TYPE it stands for (see TrafficDecor.sizeOf), so one A320 model draws an A321 half as long again.
 */
export class TrafficModels {
  private static readonly FAMILIES: Record<string, readonly string[]> = {
    "amvlab-a320": ["A318", "A319", "A320", "A321", "A19N", "A20N", "A21N"],
    "amvlab-b737": ["B732", "B733", "B734", "B735", "B736", "B737", "B738", "B739", "B37M", "B38M", "B39M", "B3XM"],
    "amvlab-a350": ["A359", "A35K"],
    "amvlab-a380": ["A388"],
    "amvlab-b787": ["B788", "B789", "B78X"]
  }

  private static readonly BY_TYPE = new Map<string, string>(
    Object.entries(TrafficModels.FAMILIES).flatMap(([id, types]) => types.map(type => [type, id] as const))
  )

  /** The catalogue id of the model that draws this type, if there is one. */
  static idOf(type: string | undefined): string | undefined {
    return type ? TrafficModels.BY_TYPE.get(type.toUpperCase()) : undefined
  }
}
