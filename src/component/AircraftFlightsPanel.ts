import type { AircraftFlightView } from "./SceneElement.js"

/** The words of the list, from the editor's messages. */
export interface AircraftFlightsTexts {
  aircraftFlightsColumns: { flight: string; distance: string; direction: string; height: string; altitude: string }
  aircraftFlightsIntro: string
  aircraftFlightAim: string
  aircraftFlightMarked: string
  aircraftFlightLater: string
  aircraftFlightAbsent: string
  aircraftFlightNotDrawn: string
  aircraftFlightUnknown: string
}

/** The cells of one row that change with the instant, or with what the record comes to say of the flight. */
interface FlightRow {
  row: HTMLTableRowElement
  flight: AircraftFlightView
  label: HTMLTableCellElement
  distance: HTMLTableCellElement
  direction: HTMLTableCellElement
  height: HTMLTableCellElement
  altitude: HTMLTableCellElement
}

/**
 * The flights a record of air traffic says were around the witness: who was there, and where to look. In a bright sky an aircraft is a pixel
 * or two, and the scene alone cannot say which point is which, nor that one is there at all.
 *
 * The rows are made once for a set of flights, and only their numbers are written again as the time goes, because this runs while a recording
 * plays, and a row rebuilt under the pointer loses its click.
 */
export class AircraftFlightsPanel {
  private rows = new Map<string, FlightRow>()
  private selected?: string

  constructor(
    private readonly container: HTMLElement,
    private readonly aim: (flight: AircraftFlightView) => void,
    private readonly compassPoint: (azimuthDeg: number) => string
  ) {}

  /** Shows the flights as they stand. `rebuild` says the words changed, which are in every row. */
  show(flights: readonly AircraftFlightView[], texts: AircraftFlightsTexts, rebuild = false): void {
    const same = flights.length === this.rows.size && flights.every(flight => this.rows.has(flight.key))
    if (rebuild || !same) this.build(flights, texts)
    for (const flight of flights) this.write(this.rows.get(flight.key)!, flight, texts)
  }

  /** The flight looked at, which the scene rings. */
  get selectedKey(): string | undefined {
    return this.selected
  }

  /** Marks the flight looked at, or none. */
  select(key: string | undefined, texts: AircraftFlightsTexts): void {
    this.selected = key
    for (const cells of this.rows.values()) this.write(cells, cells.flight, texts)
  }

  private build(flights: readonly AircraftFlightView[], texts: AircraftFlightsTexts): void {
    this.rows = new Map()
    if (!flights.some(flight => flight.key === this.selected)) this.selected = undefined
    if (flights.length === 0) {
      this.container.replaceChildren()
      return
    }
    const intro = document.createElement("p")
    intro.className = "message-info"
    intro.textContent = texts.aircraftFlightsIntro
    const table = document.createElement("table")
    table.className = "aircraft-flights-table"
    const head = table.createTHead().insertRow()
    const { flight: name, distance, direction, height, altitude } = texts.aircraftFlightsColumns
    for (const title of [name, distance, direction, height, altitude]) {
      const cell = document.createElement("th")
      cell.scope = "col"
      cell.textContent = title
      head.append(cell)
    }
    const body = table.createTBody()
    for (const flight of flights) {
      const row = body.insertRow()
      row.dataset.flight = flight.key
      const label = row.insertCell()
      const cells = { distance: row.insertCell(), direction: row.insertCell(), height: row.insertCell(), altitude: row.insertCell() }
      row.addEventListener("click", () => {
        const current = this.rows.get(flight.key)?.flight
        if (current) this.aim(current)
      })
      this.rows.set(flight.key, { row, flight, label, ...cells })
    }
    const scroll = document.createElement("div")
    scroll.className = "aircraft-flights-scroll"
    scroll.append(table)
    this.container.replaceChildren(intro, scroll)
  }

  private write(cells: FlightRow, flight: AircraftFlightView, texts: AircraftFlightsTexts): void {
    cells.flight = flight
    // Written each time: the aircraft are found before what they are, which comes a moment later (see SceneElement.describeTraffic).
    cells.label.textContent = [flight.type ?? texts.aircraftFlightUnknown, flight.registration].filter(Boolean).join(" · ")
    const { row } = cells
    const sky = flight.sky
    const number = (value: number, digits = 0) => value.toLocaleString(undefined, { maximumFractionDigits: digits })
    cells.distance.textContent = sky ? `${number(sky.distanceKm, sky.distanceKm < 10 ? 1 : 0)} km` : ""
    cells.direction.textContent = sky ? `${this.compassPoint(sky.azimuthDeg)} ${number(sky.azimuthDeg)}°` : ""
    cells.height.textContent = sky ? `${number(sky.altitudeDeg, 1)}°` : ""
    cells.altitude.textContent = flight.altitudeFt !== undefined ? `${number(flight.altitudeFt)} ft` : ""
    row.classList.toggle("absent", !sky)
    row.setAttribute("aria-disabled", String(!sky && flight.firstMs === undefined))
    const said = sky ? texts.aircraftFlightAim : flight.firstMs !== undefined ? texts.aircraftFlightLater : texts.aircraftFlightAbsent
    const marked = flight.key === this.selected
    row.setAttribute("aria-selected", String(marked))
    const title = marked ? texts.aircraftFlightMarked : said
    row.title = flight.drawn ? title : `${title}. ${texts.aircraftFlightNotDrawn}`
  }
}
