import type { CaseReportData, ReportReading, ReportValue, ReportWitness } from "./CaseReport.js"
import type { CaseReportTexts } from "./messages/CaseReportTexts.js"
import { ReportFormat } from "./ReportFormat.js"
import { SkyFigure } from "./SkyFigure.js"
import { PlanFigure } from "./PlanFigure.js"
import { TimelineFigure } from "./TimelineFigure.js"

/**
 * A report on a case as one HTML page standing on its own: its styles and its figures inside it, nothing fetched, so that it can be saved,
 * sent, opened years later, or printed to a PDF by the browser, whose print layout it has.
 *
 * Asked for by the GEIPAN (A. Cousyn, November 2026), for the parameters, the computed gaps, the intermediate conclusions and the figures
 * of a reconstruction to go into a report. No word-processor format: a page any tool reads, and a PDF from it.
 */
export class CaseReportHtml {

  private static readonly CSS = `
:root { color-scheme: light; --ink: #1b1d22; --dim: #5b6070; --line: #d6d9e0; --ok: #15803d; --warn: #b45309; --error: #b91c1c; }
* { box-sizing: border-box; }
body { margin: 0 auto; max-width: 60rem; padding: 2rem 1rem 4rem; font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; color: var(--ink); background: #fff; }
h1 { font-size: 1.6rem; margin: 0 0 .3rem; }
h2 { font-size: 1.25rem; margin: 2.2rem 0 .6rem; border-bottom: 1px solid var(--line); padding-bottom: .2rem; }
h3 { font-size: 1.05rem; margin: 1.6rem 0 .4rem; }
h4 { font-size: .95rem; margin: 1rem 0 .3rem; color: var(--dim); }
p.meta { color: var(--dim); margin: 0 0 1rem; }
p.method { font-size: .92rem; background: #f5f6f8; padding: .7rem .9rem; border-radius: 6px; }
table { border-collapse: collapse; width: 100%; margin: .4rem 0 1rem; font-size: .88rem; }
th, td { border-bottom: 1px solid var(--line); padding: .3rem .5rem; text-align: left; vertical-align: top; }
th { font-weight: 600; color: var(--dim); white-space: nowrap; }
td.n { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.sufficient, .holds { color: var(--ok); } .fine-tuned, .too-few { color: var(--warn); } .fails { color: var(--error); } .nothing, .unjudged, .untested { color: var(--dim); }
figure { margin: .6rem 0 1.2rem; }
figcaption { font-size: .85rem; color: var(--dim); }
.legend { list-style: none; padding: 0; margin: .3rem 0 0; display: flex; flex-wrap: wrap; gap: .4rem 1.2rem; font-size: .85rem; }
.legend li { display: flex; align-items: center; gap: .35rem; }
svg.sky { width: 100%; height: auto; display: block; }
svg.sky .grid { stroke: #e5e7eb; stroke-width: 1; } svg.sky .horizon { stroke: #9ca3af; stroke-width: 1.2; }
svg.sky .tick { font-size: 10px; fill: #6b7280; } svg.sky .axis { font-size: 11px; fill: #374151; }
svg.sky .uncertainty { fill: #9ca3af; fill-opacity: .18; stroke: #9ca3af; stroke-opacity: .5; }
svg.sky .said { fill: #111827; } svg.sky .gap { stroke-width: 1; stroke-dasharray: 3 2; stroke-opacity: .7; }
svg.plan, svg.timeline { width: 100%; height: auto; display: block; } svg.plan { max-width: 34rem; }
svg.plan .frame { fill: none; stroke: #e5e7eb; } svg.plan .fan { fill: #9ca3af; fill-opacity: .07; stroke: none; }
svg.plan .sight { stroke: #6b7280; stroke-width: 1; stroke-dasharray: 4 3; } svg.plan .track { fill: none; stroke-width: 2.2; }
svg.plan .witness { fill: #111827; } svg.plan .name { font-size: 12px; fill: #111827; } svg.plan .scale { stroke: #374151; stroke-width: 2; }
svg.plan .north { fill: #374151; } svg.plan .tick, svg.timeline .tick { font-size: 10px; fill: #6b7280; }
svg.timeline .axis-line { stroke: #9ca3af; } svg.timeline .said { fill: #111827; } svg.timeline .moment { stroke: #b45309; stroke-dasharray: 2 2; }
svg.timeline .moment-label { font-size: 11px; fill: #b45309; }
blockquote { margin: .4rem 0 1rem; padding: .4rem .9rem; border-left: 3px solid var(--line); color: #2b2f38; white-space: pre-line; }
dl.facts { display: grid; grid-template-columns: max-content 1fr; gap: .1rem .8rem; margin: .3rem 0 .8rem; font-size: .92rem; } dl.facts dt { color: var(--dim); }
ul.sources { margin: .2rem 0 1rem; padding-left: 1.2rem; font-size: .9rem; }
.print { float: right; margin: 0 0 .6rem 1rem; padding: .45rem .9rem; border: 1px solid var(--line); border-radius: 999px; background: #fff; font: inherit; cursor: pointer; }
.scroll { overflow-x: auto; }
@media print {
  body { max-width: none; padding: 0; font-size: 10.5pt; }
  .print { display: none; }
  h2 { break-after: avoid; } h3, h4 { break-after: avoid; }
  table, figure { break-inside: avoid; }
  .scroll { overflow: visible; }
  @page { margin: 16mm 14mm; }
}
`

  /** @param appVersion The version of UFO@home it was worked out by: a report says what made it. */
  static of(data: CaseReportData, texts: CaseReportTexts, language: string, appVersion: string): string {
    const f = new ReportFormat(texts, language)
    const e = CaseReportHtml.escape
    const title = f.fill(texts.title, { title: data.case.title ?? data.case.id ?? "" })
    const date = new Intl.DateTimeFormat(language, { dateStyle: "long", timeStyle: "short" }).format(new Date(data.generatedAt))
    const body: string[] = [
      `<button type="button" class="print" onclick="print()">${e(texts.print)}</button>`,
      `<h1>${e(title)}</h1>`,
      `<p class="meta">${e(f.fill(texts.generated, { date, version: appVersion }))}${data.case.time ? ` · ${e(data.case.time)}` : ""}</p>`,
      ...(data.case.summary ? [`<p>${e(data.case.summary)}</p>`] : []),
      `<p class="method">${e(texts.method)}</p>`
    ]
    if (data.readings.length > 0) body.push(`<h2>${e(texts.readingsCompared)}</h2>`, CaseReportHtml.comparedTable(data, f))
    const plan = PlanFigure.svg(data.witnesses, data.readings, f)
    if (plan) {
      const shown = data.readings.filter(reading => reading.paths.length > 0)
      const legend = shown.map(reading => `<li><svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true"><line x1="1" y1="7" x2="13" y2="7" stroke="${SkyFigure.COLOURS[data.readings.indexOf(reading) % SkyFigure.COLOURS.length]}" stroke-width="2.5"/></svg>${e(reading.title)} (${e(reading.reads)})</li>`)
      body.push(`<h2>${e(texts.map)}</h2>`, `<figure>${plan}${legend.length ? `<ul class="legend">${legend.join("")}</ul>` : ""}<figcaption>${e(texts.mapCaption)}</figcaption></figure>`)
    }
    body.push(`<h2>${e(texts.witnesses)}</h2>`)
    for (const witness of data.witnesses) body.push(...CaseReportHtml.witness(witness, data.readings.filter(reading => reading.reads === witness.title), f))
    for (const reading of data.readings) body.push(...CaseReportHtml.reading(reading, data.witnesses.find(witness => witness.title === reading.reads), f))
    if (data.interviews.length > 0) {
      const c = texts.columns
      body.push(`<h2>${e(texts.interviews)}</h2>`, CaseReportHtml.table([c.title, c.witness, c.time, c.by, c.medium],
        data.interviews.map(interview => [e(interview.title), e(interview.witness ?? ""), e(interview.time ?? ""), e(interview.by.join(", ")), e(interview.medium ?? "")])))
    }
    return `<!doctype html>
<html lang="${e(language)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="UFO@home ${e(appVersion)}">
<title>${e(title)}</title>
<style>${CaseReportHtml.CSS}</style>
</head>
<body>
${body.join("\n")}
</body>
</html>
`
  }

  private static comparedTable(data: CaseReportData, f: ReportFormat): string {
    const c = f.texts.columns, e = CaseReportHtml.escape
    return CaseReportHtml.table([c.reading, c.reads, c.reproduced, c.gap, c.robustness, c.supposedCount], data.readings.map(reading => {
      const robustness = f.robustness(reading.sensitivity)
      return [e(reading.title), e(reading.reads), `<span class="n">${f.reproduced(reading.sensitivity)}</span>`, f.degrees(reading.sensitivity?.medianSeparationDeg),
        `<span class="${robustness.kind}">${e(robustness.text)}</span>`, String(reading.supposed.length)]
    }), [2, 3, 5])
  }

  private static witness(witness: ReportWitness, readings: readonly ReportReading[], f: ReportFormat): string[] {
    const t = f.texts, c = t.columns, e = CaseReportHtml.escape
    const parts = [`<h3>${e(f.fill(t.witnessHeading, { witness: witness.title }))}</h3>`]
    const facts: [string, string][] = [[t.columns.time, witness.time ?? ""], [t.place, witness.place ?? ""],
      [t.duration, witness.durationSeconds !== undefined ? f.instant(witness.durationSeconds * 1000) : ""], [t.instrument, witness.instrument ?? ""]]
    const stated = facts.filter(([, value]) => value !== "")
    if (stated.length) parts.push(`<dl class="facts">${stated.map(([name, value]) => `<dt>${e(name)}</dt><dd>${e(value)}</dd>`).join("")}</dl>`)
    if (witness.description) parts.push(`<h4>${e(t.account)}</h4>`, `<blockquote>${e(witness.description)}</blockquote>`)
    if (witness.sources.length) {
      parts.push(`<h4>${e(t.sources)}</h4>`, `<ul class="sources">${witness.sources.map(source => {
        const what = [source.authors?.join(", "), source.title ? `<em>${e(source.title)}</em>` : "", source.publisher, source.time, source.index].filter(Boolean)
          .map(part => part!.startsWith("<em>") ? part : e(part!)).join(", ")
        return `<li>${what}${source.url ? ` <a href="${e(source.url)}">${e(source.url)}</a>` : ""}</li>`
      }).join("")}</ul>`)
    }
    const timeline = TimelineFigure.svg(witness, f)
    if (timeline) parts.push(`<figure>${timeline}<figcaption>${e(t.timelineCaption)}</figcaption></figure>`)
    // Only the readings that place something to compare: one that explains no phenomenon has no mark, and no place in the legend.
    readings = readings.filter(reading => reading.comparisons.length > 0)
    const figure = SkyFigure.svg(witness, readings, f)
    if (figure) {
      const legend = [`<li><svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="4" fill="#111827"/></svg>${e(t.saidLegend)}</li>`,
        ...readings.map((reading, index) => `<li>${SkyFigure.legendMark(index)}${e(reading.title)}</li>`)]
      parts.push(`<figure>${figure}<ul class="legend">${legend.join("")}</ul><figcaption>${e(t.figureCaption)}</figcaption></figure>`)
    }
    parts.push(`<h4>${e(t.indications)}</h4>`)
    if (witness.indications.length === 0) parts.push(`<p>${e(t.noIndication)}</p>`)
    else {
      parts.push(CaseReportHtml.table([c.instant, c.phenomenon, c.azimuth, c.altitude, c.uncertainty, c.size, c.basis, c.rests],
        witness.indications.map(indication => {
          const u = indication.uncertainty
          return [f.instant(indication.t), e(indication.phenomenon ?? indication.sourceId),
            indication.directionSaid ? f.azimuth(indication.aim?.azimuthDeg) : "", indication.directionSaid ? f.degrees(indication.aim?.altitudeDeg) : "",
            u ? `${f.azimuth(u.azimuthDeg[0])} … ${f.azimuth(u.azimuthDeg[1])} ; ${f.degrees(u.altitudeDeg[0])} … ${f.degrees(u.altitudeDeg[1])}` : "",
            indication.sizeSaid ? f.degrees(indication.angular?.widthDeg) : "", indication.basis ? e(t.bases[indication.basis]) : "", e(f.rests(indication))]
        }), [0, 2, 3, 5]))
    }
    const values = witness.values.filter(value => !/^timeline\.keyframes\.\d+\.shapes\.\d+\.shape\.(aim|angular)/.test(value.path))
    if (values.length > 0) parts.push(`<h4>${e(t.values)}</h4>`, CaseReportHtml.valuesTable(values, f))
    return parts
  }

  private static reading(reading: ReportReading, witness: ReportWitness | undefined, f: ReportFormat): string[] {
    const t = f.texts, c = t.columns, e = CaseReportHtml.escape
    const parts = [`<h2>${e(f.fill(t.readingHeading, { title: reading.title, witness: reading.reads }))}</h2>`]
    const meta = [reading.by.length ? f.fill(t.by, { names: reading.by.join(", ") }) : "", reading.time ? f.fill(t.made, { time: reading.time }) : ""].filter(Boolean).join(" ")
    if (meta) parts.push(`<p class="meta">${e(meta)}</p>`)
    if (reading.description) parts.push(`<blockquote>${e(reading.description)}</blockquote>`)
    parts.push(`<h4>${e(t.supposed)}</h4>`, reading.supposed.length ? CaseReportHtml.valuesTable(reading.supposed, f) : `<p>${e(t.noneSupposed)}</p>`)
    parts.push(`<h4>${e(t.findings)}</h4>`)
    parts.push(reading.findings.length ? CaseReportHtml.table([c.finding, c.outcome, c.against, c.origin], reading.findings.map(finding => [
      e(finding.text), `<span class="${finding.outcome}">${e(t.outcomes[finding.outcome])}</span>`,
      finding.outcome === "fails" ? e(t.grounds[finding.against ?? "established"]) : "", e(t.origins[finding.written ? "written" : "computed"])])) : `<p>${e(t.noFinding)}</p>`)
    const sensitivity = reading.sensitivity
    if (sensitivity) {
      const robustness = f.robustness(sensitivity)
      parts.push(`<h4>${e(t.sensitivity)}</h4>`,
        `<p>${e(c.reproduced)} : ${f.reproduced(sensitivity) || "–"} · ${e(c.gap)} : ${f.degrees(sensitivity.medianSeparationDeg) || "–"} · <span class="${robustness.kind}">${e(robustness.text)}</span></p>`)
      if (robustness.kind !== "too-few" && robustness.kind !== "nothing" && sensitivity.margins.length > 0) {
        parts.push(CaseReportHtml.table([c.knob, c.from, c.to, c.reference, c.covered], sensitivity.margins.map(margin => {
          const ends = f.ends(margin)
          const reference = margin.reference ? `${f.amount(margin.knob, margin.reference.lower)} … ${f.amount(margin.knob, margin.reference.upper)}` : t.noLaw
          return [e(t.knobs[margin.knob]), ends.from, ends.to, e(reference), margin.coverage === undefined ? "" : `${Math.round(margin.coverage * 100)} %`]
        }), [1, 2, 4]))
      }
      if (sensitivity.better) {
        const { knob, amount, agreement } = sensitivity.better
        parts.push(`<p class="fine-tuned">${e(f.fill(t.better, { knob: t.knobs[knob], amount: f.amount(knob, amount),
          agreed: String(Math.round(agreement * sensitivity.compared)), compared: String(sensitivity.compared) }))}</p>`)
      }
    }
    if (reading.comparisons.length > 0) {
      parts.push(`<h4>${e(t.comparisons)}</h4>`, CaseReportHtml.table([c.instant, c.phenomenon, `${c.said} (${c.azimuth}, ${c.altitude})`, `${c.read} (${c.azimuth}, ${c.altitude})`, c.separation, c.agrees],
        reading.comparisons.map(comparison => [f.instant(comparison.t), e(witness?.phenomena?.[comparison.sourceId] ?? comparison.sourceId),
          comparison.said ? `${f.azimuth(comparison.said.azimuthDeg)}, ${f.degrees(comparison.said.altitudeDeg)}` : "",
          `${f.azimuth(comparison.predicted.azimuthDeg)}, ${f.degrees(comparison.predicted.altitudeDeg)}`, f.degrees(comparison.separationDeg),
          `<span class="${comparison.agrees ? "holds" : "fails"}">${e(comparison.agrees ? t.yes : t.no)}</span>`]), [0, 4]))
    }
    return parts
  }

  private static valuesTable(values: readonly ReportValue[], f: ReportFormat): string {
    const t = f.texts, c = t.columns, e = CaseReportHtml.escape
    return CaseReportHtml.table([c.path, c.value, c.basis, c.rests], values.map(value => [`<code>${e(value.path)}</code>`, e(f.value(value)), e(t.bases[value.basis]), e(f.rests(value))]))
  }

  /** A table of cells already escaped; `numeric` the columns aligned as numbers. */
  private static table(heads: readonly string[], rows: readonly (readonly string[])[], numeric: readonly number[] = []): string {
    const e = CaseReportHtml.escape
    const head = `<tr>${heads.map(head => `<th scope="col">${e(head)}</th>`).join("")}</tr>`
    const lines = rows.map(row => `<tr>${row.map((cell, index) => `<td${numeric.includes(index) ? ' class="n"' : ""}>${cell}</td>`).join("")}</tr>`)
    return `<div class="scroll"><table><thead>${head}</thead><tbody>${lines.join("")}</tbody></table></div>`
  }

  static escape(text: string): string {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  }
}
