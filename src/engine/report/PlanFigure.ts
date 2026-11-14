import type { ReportReading, ReportWitness } from "./CaseReport.js"
import type { ReportFormat } from "./ReportFormat.js"
import { SkyFigure } from "./SkyFigure.js"

/**
 * The case seen from above, north up, in metres: where each witness stood, the lines of sight of the directions they gave (the azimuth's
 * uncertainty as a fan around each), and the path each reading places its bodies on. For several witnesses, whether their lines of sight
 * meet where a reading puts the phenomenon is what this shows at a glance.
 *
 * Drawn on nothing: no map underneath, so that the report stands alone, owes no licence, and shows only what the case states. The ground is
 * flat, as everywhere the report measures.
 */
export class PlanFigure {

  private static readonly SIZE = 520
  /** Tells the clips of several maps of one page apart. */
  private static count = 0
  private static readonly MARGIN = 28

  /** The SVG, or nothing for a case none of whose witnesses says where they stood. */
  static svg(witnesses: readonly ReportWitness[], readings: readonly ReportReading[], format: ReportFormat): string | undefined {
    const placed = witnesses.filter(witness => witness.at)
    if (placed.length === 0) return undefined
    const shown = readings.filter(reading => reading.paths.length > 0)
    const points = [...placed.map(witness => witness.at!), ...shown.flatMap(reading => reading.paths.flatMap(path => path.points))]
    const xs = points.map(point => point.eastM), ys = points.map(point => point.northM)
    // Square, so that a direction drawn is the direction it is; at least 200 m across, so that a lone witness's lines can be seen.
    const span = Math.max(200, Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) * 1.25
    const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2
    const inner = PlanFigure.SIZE - 2 * PlanFigure.MARGIN
    const X = (east: number) => PlanFigure.MARGIN + (east - cx + span / 2) / span * inner
    const Y = (north: number) => PlanFigure.MARGIN + (1 - (north - cy + span / 2) / span) * inner
    const r = (value: number) => Math.round(value * 10) / 10
    const reach = span * 0.75
    const rad = Math.PI / 180
    const toward = (from: { eastM: number, northM: number }, azimuth: number) => ({ eastM: from.eastM + reach * Math.sin(azimuth * rad), northM: from.northM + reach * Math.cos(azimuth * rad) })
    // Everything drawn within the frame: a line of sight or a fan of uncertainty runs on, the figure does not.
    const clip = `plan-clip-${PlanFigure.count++}`
    const parts: string[] = [`<defs><clipPath id="${clip}"><rect x="${PlanFigure.MARGIN}" y="${PlanFigure.MARGIN}" width="${inner}" height="${inner}"/></clipPath></defs>`,
      `<rect x="${PlanFigure.MARGIN}" y="${PlanFigure.MARGIN}" width="${inner}" height="${inner}" class="frame"/>`, `<g clip-path="url(#${clip})">`]
    for (const witness of placed) {
      for (const indication of witness.indications) {
        if (!indication.directionSaid || !indication.aim) continue
        const at = witness.at!
        const u = indication.uncertainty?.azimuthDeg
        if (u && u[1] - u[0] < 180) {
          const a = toward(at, u[0]), b = toward(at, u[1])
          parts.push(`<path d="M${r(X(at.eastM))} ${r(Y(at.northM))}L${r(X(a.eastM))} ${r(Y(a.northM))}L${r(X(b.eastM))} ${r(Y(b.northM))}Z" class="fan"/>`)
        }
        const end = toward(at, indication.aim.azimuthDeg)
        parts.push(`<line x1="${r(X(at.eastM))}" y1="${r(Y(at.northM))}" x2="${r(X(end.eastM))}" y2="${r(Y(end.northM))}" class="sight"><title>${format.instant(indication.t)}</title></line>`)
      }
    }
    shown.forEach(reading => {
      const colour = SkyFigure.COLOURS[readings.indexOf(reading) % SkyFigure.COLOURS.length]
      for (const path of reading.paths) {
        const d = path.points.map((point, i) => `${i === 0 ? "M" : "L"}${r(X(point.eastM))} ${r(Y(point.northM))}`).join("")
        parts.push(`<path d="${d}" stroke="${colour}" class="track"/>`)
        const last = path.points[path.points.length - 1]
        parts.push(`<circle cx="${r(X(last.eastM))}" cy="${r(Y(last.northM))}" r="2.5" fill="${colour}"/>`)
      }
    })
    parts.push("</g>")
    // Witnesses who stood at one place (a case that gives it to a tenth of a degree puts them together) are one dot, named together.
    const spots: { at: { eastM: number, northM: number }, names: string[] }[] = []
    for (const witness of placed) {
      const near = spots.find(spot => Math.hypot(spot.at.eastM - witness.at!.eastM, spot.at.northM - witness.at!.northM) < span / 100)
      if (near) near.names.push(witness.title)
      else spots.push({ at: witness.at!, names: [witness.title] })
    }
    for (const spot of spots) {
      parts.push(`<circle cx="${r(X(spot.at.eastM))}" cy="${r(Y(spot.at.northM))}" r="4.5" class="witness"/>`)
      parts.push(`<text x="${r(X(spot.at.eastM) + 7)}" y="${r(Y(spot.at.northM) - 7)}" class="name">${PlanFigure.escape(spot.names.join(", "))}</text>`)
    }
    // A scale of a round length, about a fifth of the width, and the north.
    const metres = PlanFigure.round(span / 5)
    const length = metres / span * inner
    const y = PlanFigure.SIZE - 10
    parts.push(`<line x1="${PlanFigure.MARGIN}" y1="${y}" x2="${r(PlanFigure.MARGIN + length)}" y2="${y}" class="scale"/>`)
    parts.push(`<text x="${r(PlanFigure.MARGIN + length + 6)}" y="${y + 4}" class="tick">${PlanFigure.escape(format.fill(format.texts.scale, { metres: format.number(metres) }))}</text>`)
    parts.push(`<path d="M${PlanFigure.SIZE - 18} 34L${PlanFigure.SIZE - 12} 18L${PlanFigure.SIZE - 6} 34Z" class="north"/><text x="${PlanFigure.SIZE - 12}" y="14" text-anchor="middle" class="tick">N</text>`)
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PlanFigure.SIZE} ${PlanFigure.SIZE}" role="img" class="plan">${parts.join("")}</svg>`
  }

  /** 1, 2 or 5 times a power of ten, the nearest under `value`. */
  private static round(value: number): number {
    const power = 10 ** Math.floor(Math.log10(value))
    return [5, 2, 1].map(step => step * power).find(candidate => candidate <= value) ?? power
  }

  private static escape(text: string): string {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  }
}
