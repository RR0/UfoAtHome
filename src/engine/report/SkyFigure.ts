import type { ReportReading, ReportWitness } from "./CaseReport.js"
import type { ReportFormat } from "./ReportFormat.js"

/**
 * The sky of one witness, as a report draws it: where they said they saw the phenomenon at each instant, a disc with the uncertainty of the
 * direction shaded around it (see ReportIndication.uncertainty), and where each reading of their account places it at the same instant, a
 * cross linked to the disc it is set against. The computed gaps, seen.
 *
 * Azimuth across, altitude up, both in degrees, as the witness would point: a plain chart rather than a projection, so that a reader reads
 * degrees off it. The azimuths are taken about those said, so that a sighting across the north is not cut in two.
 */
export class SkyFigure {

  /** The marks of the readings, one per reading in turn: told apart by their shape as much as by their colour, for a page printed in grey. */
  static readonly COLOURS = ["#c2410c", "#1d4ed8", "#15803d", "#7e22ce", "#b91c1c", "#0f766e"]

  private static readonly WIDTH = 640
  private static readonly HEIGHT = 320
  private static readonly MARGIN = { left: 44, right: 12, top: 12, bottom: 34 }

  /** The SVG, or nothing for a witness who gave no direction. */
  static svg(witness: ReportWitness, readings: readonly ReportReading[], format: ReportFormat): string | undefined {
    const said = witness.indications.filter(indication => indication.directionSaid && indication.aim)
    if (said.length === 0) return undefined
    const centre = SkyFigure.circularMean(said.map(indication => indication.aim!.azimuthDeg))
    const unwrap = (azimuth: number) => centre + ((((azimuth - centre) % 360) + 540) % 360) - 180
    const points: { x: number, y: number }[] = []
    for (const indication of said) {
      const { azimuthDeg, altitudeDeg } = indication.uncertainty ?? { azimuthDeg: [indication.aim!.azimuthDeg, indication.aim!.azimuthDeg], altitudeDeg: [indication.aim!.altitudeDeg, indication.aim!.altitudeDeg] }
      points.push({ x: unwrap(indication.aim!.azimuthDeg), y: indication.aim!.altitudeDeg })
      // The uncertainty about the direction said, kept on the side of the direction (an azimuth range is a turn either way of it).
      points.push({ x: unwrap(indication.aim!.azimuthDeg) + (azimuthDeg[0] - indication.aim!.azimuthDeg), y: altitudeDeg[0] })
      points.push({ x: unwrap(indication.aim!.azimuthDeg) + (azimuthDeg[1] - indication.aim!.azimuthDeg), y: altitudeDeg[1] })
    }
    for (const reading of readings) for (const comparison of reading.comparisons) points.push({ x: unwrap(comparison.predicted.azimuthDeg), y: comparison.predicted.altitudeDeg })
    const xs = points.map(point => point.x), ys = points.map(point => point.y)
    const [x0, x1] = SkyFigure.padded(Math.min(...xs), Math.max(...xs), 10)
    const [y0, y1] = SkyFigure.padded(Math.max(-10, Math.min(...ys)), Math.min(90, Math.max(...ys)), 5)
    const m = SkyFigure.MARGIN
    const w = SkyFigure.WIDTH - m.left - m.right, h = SkyFigure.HEIGHT - m.top - m.bottom
    const X = (x: number) => m.left + (x - x0) / (x1 - x0) * w
    const Y = (y: number) => m.top + (1 - (y - y0) / (y1 - y0)) * h
    const r = (value: number) => Math.round(value * 10) / 10
    const parts: string[] = []
    // The grid, every step of a round number of degrees, the horizon drawn stronger.
    for (const x of SkyFigure.ticks(x0, x1)) {
      parts.push(`<line x1="${r(X(x))}" y1="${m.top}" x2="${r(X(x))}" y2="${m.top + h}" class="grid"/>`)
      parts.push(`<text x="${r(X(x))}" y="${m.top + h + 14}" text-anchor="middle" class="tick">${format.number(((x % 360) + 360) % 360)}°</text>`)
    }
    for (const y of SkyFigure.ticks(y0, y1)) {
      parts.push(`<line x1="${m.left}" y1="${r(Y(y))}" x2="${m.left + w}" y2="${r(Y(y))}" class="${y === 0 ? "horizon" : "grid"}"/>`)
      parts.push(`<text x="${m.left - 6}" y="${r(Y(y)) + 4}" text-anchor="end" class="tick">${format.number(y)}°</text>`)
    }
    parts.push(`<text x="${m.left + w / 2}" y="${SkyFigure.HEIGHT - 4}" text-anchor="middle" class="axis">${format.texts.azimuth}</text>`)
    parts.push(`<text x="12" y="${m.top + h / 2}" text-anchor="middle" class="axis" transform="rotate(-90 12 ${m.top + h / 2})">${format.texts.altitude}</text>`)
    for (const indication of said) {
      const u = indication.uncertainty
      if (!u) continue
      const ax = unwrap(indication.aim!.azimuthDeg)
      const left = X(ax + u.azimuthDeg[0] - indication.aim!.azimuthDeg), right = X(ax + u.azimuthDeg[1] - indication.aim!.azimuthDeg)
      parts.push(`<rect x="${r(Math.min(left, right))}" y="${r(Y(u.altitudeDeg[1]))}" width="${r(Math.abs(right - left))}" height="${r(Math.max(1, Y(u.altitudeDeg[0]) - Y(u.altitudeDeg[1])))}" class="uncertainty"/>`)
    }
    readings.forEach((reading, index) => {
      const colour = SkyFigure.COLOURS[index % SkyFigure.COLOURS.length]
      for (const comparison of reading.comparisons) {
        const px = X(unwrap(comparison.predicted.azimuthDeg)), py = Y(comparison.predicted.altitudeDeg)
        if (comparison.said) {
          parts.push(`<line x1="${r(X(unwrap(comparison.said.azimuthDeg)))}" y1="${r(Y(comparison.said.altitudeDeg))}" x2="${r(px)}" y2="${r(py)}" stroke="${colour}" class="gap"/>`)
        }
        parts.push(SkyFigure.mark(index, px, py, colour, comparison.agrees))
      }
    })
    for (const indication of said) {
      parts.push(`<circle cx="${r(X(unwrap(indication.aim!.azimuthDeg)))}" cy="${r(Y(indication.aim!.altitudeDeg))}" r="4" class="said"><title>${format.instant(indication.t)}</title></circle>`)
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SkyFigure.WIDTH} ${SkyFigure.HEIGHT}" role="img" class="sky">${parts.join("")}</svg>`
  }

  /** A reading's mark: a cross, a plus, a square… by its rank, filled where it agrees with what was said, hollow where it does not. */
  private static mark(index: number, x: number, y: number, colour: string, agrees: boolean): string {
    const s = 5, r = (value: number) => Math.round(value * 10) / 10
    const fill = agrees ? colour : "none"
    switch (index % 3) {
      case 0: return `<path d="M${r(x - s)} ${r(y - s)}L${r(x + s)} ${r(y + s)}M${r(x - s)} ${r(y + s)}L${r(x + s)} ${r(y - s)}" stroke="${colour}" stroke-width="${agrees ? 2.4 : 1.2}"/>`
      case 1: return `<rect x="${r(x - s)}" y="${r(y - s)}" width="${2 * s}" height="${2 * s}" stroke="${colour}" fill="${fill}" stroke-width="1.4"/>`
      default: return `<path d="M${r(x)} ${r(y - s - 1)}L${r(x + s + 1)} ${r(y + s)}L${r(x - s - 1)} ${r(y + s)}Z" stroke="${colour}" fill="${fill}" stroke-width="1.4"/>`
    }
  }

  /** The legend's mark of a reading, as an inline SVG of its own. */
  static legendMark(index: number): string {
    const colour = SkyFigure.COLOURS[index % SkyFigure.COLOURS.length]
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">${SkyFigure.mark(index, 7, 7, colour, true)}</svg>`
  }

  private static circularMean(degrees: readonly number[]): number {
    const rad = Math.PI / 180
    const x = degrees.reduce((sum, d) => sum + Math.cos(d * rad), 0), y = degrees.reduce((sum, d) => sum + Math.sin(d * rad), 0)
    return Math.atan2(y, x) / rad
  }

  private static padded(low: number, high: number, least: number): [number, number] {
    const span = Math.max(high - low, least)
    const middle = (low + high) / 2
    return [middle - span / 2 - span * 0.08, middle + span / 2 + span * 0.08]
  }

  /** Round values between `low` and `high`, five to ten of them. */
  private static ticks(low: number, high: number): number[] {
    const span = high - low
    const step = [1, 2, 5, 10, 15, 20, 30, 45, 90].find(candidate => span / candidate <= 10) ?? 90
    const ticks: number[] = []
    for (let t = Math.ceil(low / step) * step; t <= high; t += step) ticks.push(t)
    return ticks
  }
}
