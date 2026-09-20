import type { SaidText } from "./SaidText.js"

/** How a road is built — see RoadProvider, which uses the same three for a surveyed one. */
export type StatedRoadSurface = "paved" | "gravel" | "dirt"

/**
 * A road the case file states, as opposed to one a survey of today reports.
 *
 * This exists because the two are not the same claim and must not be drawn alike. A road from
 * OpenStreetMap is what is there now; a road stated here is what the people who went to the place
 * at the time measured and drew — the gravel road on the Blue Book plan of Socorro, with the
 * distances written along it. Sixty years separate the two, over which roads are widened,
 * realigned and abandoned, and an unsealed track is the first to go. So a stated road is drawn at
 * full presence and a surveyed one faint (see RoadSystem), and a reader can tell which is which.
 *
 * In metres from the witness's own place, exactly like DecorObject.eastM/northM and for the same
 * reason: this is scenery for ONE account, drawn from that account's own plan, and the plan gives
 * distances from the things on it — not latitudes.
 */
export interface StatedRoad {
  id: string
  /** What the account calls it, where it calls it anything. Translatable — see SaidText. */
  title?: SaidText
  surface: StatedRoadSurface
  /** Carriageway width, metres. A 1960s New Mexico ranch track is about four. */
  widthM: number
  /** The centre line, in metres east and north of the witness's place at t=0. */
  path: { eastM: number; northM: number }[]
  /** Where this line comes from — the plan, the survey, the report it was read off. Shown with the
   * other credits, because a road nobody can trace back to a document is an illustration. */
  source?: SaidText
}
