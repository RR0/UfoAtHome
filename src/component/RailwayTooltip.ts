import type { RailwayTexts } from "./messages/SceneNames.js"
import type { RailwayLine } from "../render3d/terrain/RailwayProvider.js"

/** A railway pointed at, as the scene finds it (see SceneRenderer.pickRailwayAt). */
export interface RailwayPick {
  line: RailwayLine
  /** From the eye to where the pointer hit it, metres. */
  distanceM: number
  /** The height of its contact wire over the rail, where it has one. */
  contactM?: number
}

/**
 * What a railway pointed at says: its name, or what it is where the map names nothing, and with Alt held what the survey says of it (how many tracks,
 * how it takes its current, its gauge where it is not the standard one) and how far it is.
 *
 * WHY: a railway is what explains a light at night as often as an aircraft does (the arc of a pantograph on the wire, the lights of a train across a
 * valley), and a reader pointing at one wants to know whether trains under a wire run there, and how high that wire is.
 */
export class RailwayTooltip {
  /** The sentences in English, which is what a reader has until their language's module has arrived and all an English reader ever has. */
  static readonly ENGLISH: RailwayTexts = {
    kinds: { rail: "Railway", light_rail: "Light rail", tram: "Tramway", subway: "Metro", funicular: "Funicular" },
    highSpeed: "High-speed line",
    service: "Siding",
    singleTrack: "single track",
    tracks: "{count} tracks",
    overhead: "overhead wire {height} m above the rail",
    thirdRail: "third rail",
    notElectrified: "not electrified",
    gauge: "{mm} mm gauge",
    metreGauge: "metre gauge",
    distance: "{distance} away"
  }

  private static readonly STANDARD_GAUGE_MM = 1435
  private static readonly METRE_GAUGE_MM = 1000

  /** What it is: a high-speed line, a siding, or the kind of what runs on it. */
  static kind(line: RailwayLine, texts: RailwayTexts): string {
    return line.highSpeed ? texts.highSpeed : line.service ? texts.service : texts.kinds[line.kind]
  }

  /** The tooltip without Alt: the line's name, else what it is. */
  static name(line: RailwayLine, texts: RailwayTexts): string {
    return line.name ?? RailwayTooltip.kind(line, texts)
  }

  /** The tooltip with Alt: "name — what it is, its tracks, its current, its gauge, how far". `distance` writes a distance as the page writes it. */
  static detail(pick: RailwayPick, texts: RailwayTexts, distance: (metres: number) => string, locale?: string): string {
    const { line } = pick
    const parts: string[] = []
    if (line.name) parts.push(RailwayTooltip.kind(line, texts).toLocaleLowerCase(locale))
    parts.push(line.tracks > 1 ? texts.tracks.replace("{count}", String(line.tracks)) : texts.singleTrack)
    if (pick.contactM !== undefined) parts.push(texts.overhead.replace("{height}", pick.contactM.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })))
    else if (line.electrification === "third_rail") parts.push(texts.thirdRail)
    else if (line.electrification === "none") parts.push(texts.notElectrified)
    if (line.gaugeMm === RailwayTooltip.METRE_GAUGE_MM) parts.push(texts.metreGauge)
    else if (line.gaugeMm !== RailwayTooltip.STANDARD_GAUGE_MM) parts.push(texts.gauge.replace("{mm}", line.gaugeMm.toLocaleString(locale)))
    parts.push(texts.distance.replace("{distance}", distance(pick.distanceM)))
    return `${RailwayTooltip.name(line, texts)} — ${parts.join(", ")}`
  }
}
