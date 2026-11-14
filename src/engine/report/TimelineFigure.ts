import type { ReportWitness } from "./CaseReport.js"
import type { ReportFormat } from "./ReportFormat.js"

/**
 * A witness's sighting in time, as a strip: its length, the instants they gave an indication at (what the readings are compared on), and
 * the moments the account names. What a reader needs to place the comparisons, which are given by instant.
 */
export class TimelineFigure {

  private static readonly WIDTH = 640
  private static readonly HEIGHT = 74
  private static readonly LEFT = 16
  private static readonly RIGHT = 16

  /** The SVG, or nothing for an account with neither an indication nor a moment. */
  static svg(witness: ReportWitness, format: ReportFormat): string | undefined {
    const instants = witness.indications.map(indication => indication.t)
    const moments = witness.moments
    if (instants.length === 0 && moments.length === 0) return undefined
    const end = Math.max(1000, (witness.durationSeconds ?? 0) * 1000, ...instants, ...moments.map(moment => moment.t))
    const w = TimelineFigure.WIDTH - TimelineFigure.LEFT - TimelineFigure.RIGHT
    const X = (t: number) => TimelineFigure.LEFT + t / end * w
    const r = (value: number) => Math.round(value * 10) / 10
    const axis = 40
    const parts = [`<line x1="${TimelineFigure.LEFT}" y1="${axis}" x2="${TimelineFigure.LEFT + w}" y2="${axis}" class="axis-line"/>`]
    const step = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600].find(candidate => end / 1000 / candidate <= 10) ?? 600
    for (let s = 0; s * 1000 <= end; s += step) {
      parts.push(`<line x1="${r(X(s * 1000))}" y1="${axis - 3}" x2="${r(X(s * 1000))}" y2="${axis + 3}" class="axis-line"/>`)
      parts.push(`<text x="${r(X(s * 1000))}" y="${axis + 16}" text-anchor="middle" class="tick">${format.instant(s * 1000)}</text>`)
    }
    for (const moment of moments) {
      parts.push(`<line x1="${r(X(moment.t))}" y1="8" x2="${r(X(moment.t))}" y2="${axis}" class="moment"/>`)
      parts.push(`<text x="${r(X(moment.t) + 3)}" y="16" class="moment-label">${TimelineFigure.escape(moment.label)}${moment.note ? `<title>${TimelineFigure.escape(moment.note)}</title>` : ""}</text>`)
    }
    for (const t of instants) parts.push(`<circle cx="${r(X(t))}" cy="${axis}" r="3.5" class="said"><title>${format.instant(t)}</title></circle>`)
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TimelineFigure.WIDTH} ${TimelineFigure.HEIGHT}" role="img" class="timeline">${parts.join("")}</svg>`
  }

  private static escape(text: string): string {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  }
}
