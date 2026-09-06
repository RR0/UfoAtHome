import type { GeoBounds } from "../render3d/terrain/GeoBounds.js"
import type { ImageryTexture } from "../render3d/terrain/ImageryProvider.js"
import { fractionWithinBounds } from "../render3d/terrain/TileMath.js"
import { geoToLocalMeters } from "../render3d/terrain/GeoProjection.js"
import type { WitnessPath } from "../engine/place/WitnessPath.js"

/** A named moment of the account (see Milestone) at the place the witness had reached by then. */
export interface WitnessMapMarker {
  label: string
  lat: number
  lng: number
  /** The one the playhead is currently in — drawn filled, the others hollow. */
  current: boolean
}

/** One piece of scenery the recording places on the ground — see DecorObject, whose eastM/northM
 * are resolved against the witness's own t=0 position before they get here. */
export interface WitnessMapDecor {
  lat: number
  lng: number
  /** Which way it faces, when the recording says — a parked car and a shack are different facts. */
  headingDeg?: number
}

/** Everything the map shows at one instant of the recording. Assembled by the component, so this
 * renderer never reaches into a Sighting and can be exercised on any canvas. */
export interface WitnessMapFrame {
  /** The ground the canvas covers, north up. */
  bounds: GeoBounds
  /** The photograph under it, with its OWN bounds — normally larger than `bounds`, and placed by
   * them rather than stretched to fit (see ImageryTexture.bounds). Absent when the tiles could not
   * be fetched, which the map survives: the path is the point, the photograph is the context. */
  imagery?: ImageryTexture
  path: WitnessPath
  /** Where the witness is at the playhead — absent only for a recording whose track has coordinates
   * at some times and not at this one. */
  position?: { lat: number; lng: number }
  /** Which way they were facing, degrees clockwise from true north. Undefined means the recording
   * never said, and then NO cone is drawn — a cone pointing north at a witness who was never asked
   * which way they looked would be the map inventing the one thing it is being consulted about. */
  headingDeg?: number
  /** Half of what the instrument takes in across, degrees of azimuth — see
   * ImageProjection.halfWidthAngleDeg. */
  coneHalfAngleDeg?: number
  markers: ReadonlyArray<WitnessMapMarker>
  /** The scenery the recording puts on this ground — the shack, the patrol car, the other
   * witnesses. Drawn because a cone that clears a landmark is only evidence once the landmark is on
   * the map too. */
  decor: ReadonlyArray<WitnessMapDecor>
  /**
   * How dark it was, 0 in daylight to 1 well after dusk — see the night wash below.
   *
   * The imagery is somebody's daytime photograph of that ground, always, whatever hour the account
   * is about. Laying it unchanged under a 02:45 sighting says the witnesses could see a sunlit
   * countryside, which they could not. Absent means nothing has been worked out about the light,
   * and then the photograph is left as it came.
   */
  nightFraction?: number
  /** What the imagery provider's own licence requires be shown wherever its tiles are (see
   * ImageryProvider.attribution) — or, when there are no tiles, what says so. Drawn on the map
   * itself rather than in a strip beneath it: a caption laid over the canvas from outside covers
   * whatever the map had put there, and what it covered here was the scale. */
  attribution?: string
}

/**
 * The witness's own position and gaze, drawn from above on real aerial imagery, in step with the
 * frame being played.
 *
 * The reconstruction answers "what did they see"; this answers the question underneath it — "from
 * where, and looking at what". Those are different pieces of evidence and the second is the one a
 * reader can check against a road, a canyon rim, a hangar or a runway, none of which the view from
 * inside the witness's eyes can show.
 *
 * The CONE is why this is worth building rather than a pin on a map. It is the instrument's real
 * horizontal field (see WitnessMapFrame.coneHalfAngleDeg) laid over the ground, so a testimony
 * placing something over a landmark that falls outside it is a testimony with a problem — and one
 * placing it squarely inside is one more thing that holds together. A map that drew a fixed
 * decorative wedge would answer neither way.
 *
 * NORTH IS UP, always, and the cone turns within it. The alternative — turning the map with the
 * witness — costs the reader the one frame of reference they can carry between this and every other
 * map of the site they will ever look at.
 */
export class WitnessMapRenderer {
  /** Metres the scale bar may be, coarsest first — the bar takes the largest that still fits in
   * about a third of the map, so it lands on a number a reader can multiply in their head. */
  private static readonly SCALE_STEPS_M = [5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5]
  /** Radius of a named moment's own disc, pixels — and the distance within which the witness is
   * standing ON one rather than near it. */
  private static readonly MARKER_RADIUS_PX = 7

  constructor(private readonly ctx: CanvasRenderingContext2D) {}

  private get width(): number {
    return this.ctx.canvas.width
  }

  private get height(): number {
    return this.ctx.canvas.height
  }

  paint(frame: WitnessMapFrame): void {
    const { ctx } = this
    ctx.save()
    ctx.clearRect(0, 0, this.width, this.height)
    this.paintGround(frame)
    this.paintNight(frame.nightFraction)
    this.paintPath(frame)
    if (frame.position) {
      this.paintCone(frame, frame.position)
      // OVER the cone, not under it. Scenery is what the cone is checked against — "was the shack
      // inside what they could see" — and a landmark tinted by the very wedge it is being compared
      // with is a landmark nobody can read: cyan under that yellow wash comes out green, which is
      // how this was drawn and invisible at first.
      this.paintDecor(frame)
      this.paintMarkers(frame)
      this.paintWitness(frame, frame.position)
    } else {
      this.paintDecor(frame)
      this.paintMarkers(frame)
    }
    this.paintNorth()
    this.paintFooter(frame.bounds, frame.attribution)
    ctx.restore()
  }

  /** Where a real coordinate falls on this canvas. The one conversion the whole map is built on —
   * every mark below goes through it, so nothing can drift out of register with anything else. */
  private toCanvas(bounds: GeoBounds, lat: number, lng: number): { x: number; y: number } {
    const fraction = fractionWithinBounds(bounds, lng, lat)
    return { x: fraction.x * this.width, y: fraction.y * this.height }
  }

  /** The photograph, placed by its own extent — and a plain dark field when there is none, which is
   * what an embed with no network, a blocked tile host, or a test gets. Drawn either way rather
   * than left blank: everything above needs something to be legible against. */
  private paintGround(frame: WitnessMapFrame): void {
    const { ctx } = this
    ctx.fillStyle = "#1d2321"
    ctx.fillRect(0, 0, this.width, this.height)
    const imagery = frame.imagery
    if (!imagery) return
    const topLeft = this.toCanvas(frame.bounds, imagery.bounds.north, imagery.bounds.west)
    const bottomRight = this.toCanvas(frame.bounds, imagery.bounds.south, imagery.bounds.east)
    ctx.drawImage(imagery.source, topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y)
  }

  /**
   * A wash over the photograph for the hour the account is about.
   *
   * Over the imagery and UNDER everything the recording itself puts on the map: the path, the cone
   * and the moments are statements, not things a witness had to see by the available light, and
   * dimming them would make a night sighting harder to read for no gain. What darkens is only the
   * borrowed daytime photograph.
   *
   * Blue rather than grey because that is what little colour survives at night — the eye's own rods
   * carry no colour at all, and everything painted for a dark scene in this project already leans
   * this way.
   */
  private paintNight(nightFraction = 0): void {
    if (nightFraction <= 0) return
    const { ctx } = this
    ctx.save()
    ctx.fillStyle = `rgba(6, 12, 30, ${Math.min(nightFraction, 1) * 0.78})`
    ctx.fillRect(0, 0, this.width, this.height)
    ctx.restore()
  }

  /**
   * The scenery, where the recording put it.
   *
   * Small and plain on purpose. These are the things the cone is checked AGAINST — did the shack
   * fall inside what they could see, was the patrol car between them and it — so they have to be
   * findable without competing with the path or the moments for attention.
   */
  private paintDecor(frame: WitnessMapFrame): void {
    const { ctx } = this
    for (const object of frame.decor) {
      const at = this.toCanvas(frame.bounds, object.lat, object.lng)
      ctx.beginPath()
      ctx.rect(at.x - 3, at.y - 3, 6, 6)
      ctx.fillStyle = "rgba(120, 220, 255, 0.85)"
      ctx.fill()
      ctx.lineWidth = 1.5
      ctx.strokeStyle = "rgba(0, 0, 0, 0.7)"
      ctx.stroke()
      if (object.headingDeg === undefined) continue
      // A short tick the way it faces — a parked car and a shack are different facts, and which way
      // a vehicle was pointed is one of them.
      const angle = ((object.headingDeg - 90) * Math.PI) / 180
      ctx.beginPath()
      ctx.moveTo(at.x, at.y)
      ctx.lineTo(at.x + Math.cos(angle) * 9, at.y + Math.sin(angle) * 9)
      ctx.lineWidth = 3
      ctx.strokeStyle = "rgba(0, 0, 0, 0.6)"
      ctx.stroke()
      ctx.lineWidth = 1.5
      ctx.strokeStyle = "rgba(120, 220, 255, 0.9)"
      ctx.stroke()
    }
  }

  /** The whole journey at once, drawn under everything else and in full from the first frame: this
   * is the recording's own statement about where the witness went, not a trail growing behind them,
   * and a reader asking "where does this road go" should not have to play to the end to find out. */
  private paintPath(frame: WitnessMapFrame): void {
    if (!frame.path.moved) return
    const { ctx } = this
    const points = frame.path.points.map(point => this.toCanvas(frame.bounds, point.lat, point.lng))
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    for (const point of points.slice(1)) ctx.lineTo(point.x, point.y)
    // Twice, dark under light: a white line alone vanishes over pale ground (a desert road, a roof,
    // snow) and a dark one vanishes over everything else. Nothing can be assumed about the colour
    // of a photograph nobody has looked at yet.
    ctx.lineJoin = "round"
    ctx.lineCap = "round"
    ctx.strokeStyle = "rgba(0, 0, 0, 0.65)"
    ctx.lineWidth = 5
    ctx.stroke()
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)"
    ctx.lineWidth = 2
    ctx.stroke()
  }

  /**
   * The wedge of ground the instrument had in front of it.
   *
   * FADED OUT WITH DISTANCE AND STOPPED NOWHERE. It has no range and must not appear to claim one:
   * this project stores angles, never distances (see the note on ObserverPose and the angular-only
   * testimony it keeps), so how far away the phenomenon was is exactly what is unknown. A wedge
   * ending in a clean arc would draw a boundary the record does not contain; one that dissolves
   * says "somewhere along here" — which is the truth.
   *
   * Drawn at the horizon, ignoring how far up or down they were looking. A witness craning their
   * neck sweeps a wider piece of ground than this, and one looking at their feet sweeps a narrower
   * one; both are refinements on an azimuth this already gets right.
   */
  private paintCone(frame: WitnessMapFrame, position: { lat: number; lng: number }): void {
    const { headingDeg, coneHalfAngleDeg } = frame
    if (headingDeg === undefined || coneHalfAngleDeg === undefined) return
    const { ctx } = this
    const origin = this.toCanvas(frame.bounds, position.lat, position.lng)
    // Past the far corner, so the cone always runs off the map rather than stopping inside it.
    const reach = Math.hypot(this.width, this.height)
    // Canvas y grows southward and a heading is measured clockwise from north, which together make
    // the screen angle (heading - 90) in ordinary canvas terms.
    const axis = ((headingDeg - 90) * Math.PI) / 180
    const half = (coneHalfAngleDeg * Math.PI) / 180
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(origin.x, origin.y)
    ctx.arc(origin.x, origin.y, reach, axis - half, axis + half)
    ctx.closePath()
    const fade = ctx.createRadialGradient(origin.x, origin.y, 0, origin.x, origin.y, reach)
    fade.addColorStop(0, "rgba(255, 224, 130, 0.55)")
    fade.addColorStop(0.35, "rgba(255, 224, 130, 0.22)")
    fade.addColorStop(1, "rgba(255, 224, 130, 0)")
    ctx.fillStyle = fade
    ctx.fill()
    ctx.restore()
  }

  /** The named moments, each at the place the witness had reached by then — which is what turns the
   * seek bar's own marks into geography: "C" is not a time here, it is the point where he left the
   * road. */
  private paintMarkers(frame: WitnessMapFrame): void {
    const { ctx } = this
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.font = "bold 10px sans-serif"
    // The one the recording is currently in goes on top, and the rest keep their own order. Two
    // named moments at the same place is not a drawing fault to be nudged apart — a witness who
    // stopped where they stood really did have several things happen at one spot, and moving a
    // marker off its coordinates to make room would be the map lying about where. What can be
    // fixed without lying is which of them is legible, and that is the one being played.
    for (const marker of [...frame.markers].sort((a, b) => Number(a.current) - Number(b.current))) {
      const at = this.toCanvas(frame.bounds, marker.lat, marker.lng)
      ctx.beginPath()
      ctx.arc(at.x, at.y, WitnessMapRenderer.MARKER_RADIUS_PX, 0, Math.PI * 2)
      ctx.fillStyle = marker.current ? "rgba(255, 224, 130, 0.95)" : "rgba(0, 0, 0, 0.55)"
      ctx.fill()
      ctx.lineWidth = 1.5
      ctx.strokeStyle = "rgba(255, 255, 255, 0.9)"
      ctx.stroke()
      ctx.fillStyle = marker.current ? "#1d2321" : "#fff"
      ctx.fillText(marker.label, at.x, at.y)
    }
  }

  /**
   * Where they are at the playhead. Last, and over everything, because it is the one mark that
   * moves while the recording plays.
   *
   * A RING when they are standing on a named moment, a disc otherwise — and that is not a
   * decoration. A milestone is a moment in the witness's own account, so the playhead sits exactly
   * on one every time the recording reaches it; a filled dot there covered the very letter that
   * says which moment it is. Ringing the marker instead says both things at once: this is where
   * they are, and this is what was happening.
   */
  private paintWitness(frame: WitnessMapFrame, position: { lat: number; lng: number }): void {
    const { ctx } = this
    const at = this.toCanvas(frame.bounds, position.lat, position.lng)
    const onMarker = frame.markers.some(marker => {
      if (!marker.current) return false
      const markerAt = this.toCanvas(frame.bounds, marker.lat, marker.lng)
      return Math.hypot(markerAt.x - at.x, markerAt.y - at.y) <= WitnessMapRenderer.MARKER_RADIUS_PX
    })
    ctx.beginPath()
    ctx.arc(at.x, at.y, onMarker ? WitnessMapRenderer.MARKER_RADIUS_PX + 2.5 : 4.5, 0, Math.PI * 2)
    if (!onMarker) {
      ctx.fillStyle = "#ff5a3c"
      ctx.fill()
    }
    ctx.lineWidth = 4
    ctx.strokeStyle = "rgba(0, 0, 0, 0.5)"
    ctx.stroke()
    ctx.lineWidth = onMarker ? 2.5 : 2
    ctx.strokeStyle = onMarker ? "#ff5a3c" : "#fff"
    ctx.stroke()
  }

  /** Which way is up. Cheap, and without it the cone is a shape rather than a bearing. */
  private paintNorth(): void {
    const { ctx } = this
    const x = this.width - 14
    const y = 16
    ctx.beginPath()
    ctx.moveTo(x, y - 9)
    ctx.lineTo(x - 4.5, y + 5)
    ctx.lineTo(x, y + 2)
    ctx.lineTo(x + 4.5, y + 5)
    ctx.closePath()
    ctx.fillStyle = "rgba(255, 255, 255, 0.92)"
    ctx.strokeStyle = "rgba(0, 0, 0, 0.6)"
    ctx.lineWidth = 1
    ctx.fill()
    ctx.stroke()
    ctx.font = "bold 9px sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "top"
    ctx.strokeText("N", x, y + 6)
    ctx.fillText("N", x, y + 6)
  }

  /**
   * How far across the map really is, and whose photograph it is.
   *
   * Together, because they share one strip along the bottom and the licence text is long enough to
   * wrap: laid out separately, whichever was drawn second covered the other.
   *
   * The scale is the difference between an illustration and a measurement. "He was four hundred
   * metres from the object" is a claim a reader can hold against this only if the map states its
   * own scale, and the scale changes with every recording, since the box is fitted to each
   * witness's own path.
   */
  private paintFooter(bounds: GeoBounds, attribution?: string): void {
    const { ctx } = this
    ctx.font = "9px sans-serif"
    ctx.textBaseline = "bottom"
    const lines = attribution ? this.wrap(attribution, this.width - 20) : []
    let y = this.height - 4
    ctx.textAlign = "right"
    for (const line of lines.slice().reverse()) {
      this.paintOutlinedText(line, this.width - 6, y)
      y -= 11
    }
    const centerLat = (bounds.south + bounds.north) / 2
    const widthM = Math.abs(geoToLocalMeters(centerLat, bounds.east, centerLat, bounds.west).x)
    const metersPerPx = widthM / this.width
    const barM = WitnessMapRenderer.SCALE_STEPS_M.find(step => step / metersPerPx <= this.width / 3)
    if (barM === undefined) return
    const barPx = barM / metersPerPx
    const x = 8
    const barY = y - 3
    ctx.lineWidth = 3
    ctx.strokeStyle = "rgba(0, 0, 0, 0.6)"
    ctx.beginPath()
    ctx.moveTo(x, barY)
    ctx.lineTo(x + barPx, barY)
    ctx.stroke()
    ctx.lineWidth = 1.5
    ctx.strokeStyle = "rgba(255, 255, 255, 0.95)"
    ctx.stroke()
    ctx.textAlign = "left"
    this.paintOutlinedText(barM >= 1000 ? `${barM / 1000} km` : `${barM} m`, x, barY - 3)
  }

  /** Dark outline under white fill, the same reason the path is drawn twice: nothing can be assumed
   * about the colour of a photograph nobody has looked at yet. */
  private paintOutlinedText(text: string, x: number, y: number): void {
    const { ctx } = this
    ctx.lineWidth = 3
    ctx.strokeStyle = "rgba(0, 0, 0, 0.75)"
    ctx.strokeText(text, x, y)
    ctx.fillStyle = "#fff"
    ctx.fillText(text, x, y)
  }

  /** Greedy word wrap at the current font — the licence text is fixed and long, and the panel is as
   * narrow as a reader's column allows. */
  private wrap(text: string, maxWidth: number): string[] {
    const lines: string[] = []
    let line = ""
    for (const word of text.split(" ")) {
      const candidate = line ? `${line} ${word}` : word
      if (line && this.ctx.measureText(candidate).width > maxWidth) {
        lines.push(line)
        line = word
      } else {
        line = candidate
      }
    }
    if (line) lines.push(line)
    return lines
  }
}
