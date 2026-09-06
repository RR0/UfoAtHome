import { describe, expect, it } from "vitest"
import { WitnessMapRenderer } from "../../src/render/WitnessMapRenderer.js"
import type { WitnessMapFrame } from "../../src/render/WitnessMapRenderer.js"
import { WitnessPath } from "../../src/engine/place/WitnessPath.js"
import { Sighting } from "../../src/engine/model/Sighting.js"

const CENTER = { lat: 34.0475, lng: -106.8956 }

interface ArcCall {
  x: number
  y: number
  radius: number
  from: number
  to: number
}

/**
 * A context that records rather than draws — jsdom has no real 2D canvas, and what is worth
 * checking here is geometry, not pixels: which way the cone points and how wide it opens are
 * numbers, and they are exactly the numbers a sign error would flip.
 */
class RecordingContext {
  readonly arcs: ArcCall[] = []
  readonly texts: Array<{ text: string; x: number; y: number }> = []
  /** Every fillStyle in the order it was actually used, which is the only way to check z-order. */
  readonly fills: unknown[] = []
  readonly rects: Array<{ x: number; y: number; width: number; height: number }> = []
  readonly images: Array<{ x: number; y: number; width: number; height: number }> = []
  readonly canvas = { width: 200, height: 200 }
  lineWidth = 0
  strokeStyle: unknown = ""
  fillStyle: unknown = ""
  font = ""
  textAlign = ""
  textBaseline = ""
  lineJoin = ""
  lineCap = ""

  save(): void {}
  restore(): void {}
  clearRect(): void {}
  fillRect(): void {
    this.fills.push(this.fillStyle)
  }
  beginPath(): void {}
  closePath(): void {}
  moveTo(): void {}
  lineTo(): void {}
  fill(): void {
    this.fills.push(this.fillStyle)
  }

  rect(x: number, y: number, width: number, height: number): void {
    this.rects.push({ x, y, width, height })
  }
  stroke(): void {}
  fillText(text: string, x: number, y: number): void {
    this.texts.push({ text, x, y })
  }

  strokeText(): void {}

  measureText(text: string): { width: number } {
    return { width: text.length * 5 }
  }

  arc(x: number, y: number, radius: number, from: number, to: number): void {
    this.arcs.push({ x, y, radius, from, to })
  }

  drawImage(_source: unknown, x: number, y: number, width: number, height: number): void {
    this.images.push({ x, y, width, height })
  }

  createRadialGradient(): { addColorStop: () => void } {
    return { addColorStop: () => {} }
  }
}

function frameWith(overrides: Partial<WitnessMapFrame> = {}): { frame: WitnessMapFrame; context: RecordingContext } {
  const sighting = Sighting.create(undefined, [CENTER])
  const path = WitnessPath.of(sighting)!
  return {
    context: new RecordingContext(),
    frame: {
      bounds: path.boundsAround(400, 0.6),
      path,
      position: CENTER,
      headingDeg: 90,
      coneHalfAngleDeg: 20,
      markers: [],
      decor: [],
      ...overrides
    }
  }
}

/** The cone is the widest arc drawn — the milestone dots and the witness are arcs too, at a few
 * pixels' radius. */
function coneOf(context: RecordingContext): ArcCall | undefined {
  return context.arcs.slice().sort((a, b) => b.radius - a.radius)[0]
}

describe("WitnessMapRenderer", () => {
  it("keeps the licence line and the scale clear of each other", () => {
    // They shared the bottom strip, and whichever was drawn second covered the other — which is how
    // the scale disappeared under a two-line Esri credit. The bar and its own label must sit above
    // every wrapped line of the credit, not on top of one.
    const { frame, context } = frameWith()
    new WitnessMapRenderer(context as unknown as CanvasRenderingContext2D).paint({
      ...frame,
      attribution: "Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community"
    })
    const credit = context.texts.filter(t => t.text.includes("Esri") || t.text.includes("Community"))
    const scale = context.texts.find(t => /^\d+ (m|km)$/.test(t.text))!
    expect(credit.length).toBeGreaterThan(1) // it wraps at this width
    expect(scale.y).toBeLessThan(Math.min(...credit.map(t => t.y)) - 10)
  })

  it("draws the moment being played over the ones it sits on top of", () => {
    // Zamora stopped where he stood, so Socorro's E and F are fifteen metres apart and their two
    // markers overlap. Whichever is drawn last is the readable one, and that has to be the moment
    // the recording is actually in — not whichever happens to come later in the account.
    const { frame, context } = frameWith({
      markers: [
        { label: "E", t: 0, lat: CENTER.lat, lng: CENTER.lng, current: true },
        { label: "F", t: 0, lat: CENTER.lat, lng: CENTER.lng, current: false }
      ]
    })
    new WitnessMapRenderer(context as unknown as CanvasRenderingContext2D).paint(frame)
    const letters = context.texts.filter(t => t.text === "E" || t.text === "F").map(t => t.text)
    expect(letters).toEqual(["F", "E"])
  })

  it("goes back to a plain dot the moment it leaves a named moment's own spot", () => {
    // The moment stays CURRENT long after he has left its spot — that is what a milestone is, held
    // until the next one — so only distance can say he has moved off it. Testing against the
    // marker's own radius kept the ring up while he was plainly walking away inside the disc.
    const { frame, context } = frameWith({
      // Fifteen metres north of the marker — Zamora's own run — which at this map's scale is
      // barely two pixels and sits well inside the disc drawn for the moment.
      markers: [{ label: "E", t: 0, lat: CENTER.lat - 0.000135, lng: CENTER.lng, current: true }]
    })
    new WitnessMapRenderer(context as unknown as CanvasRenderingContext2D).paint(frame)
    const marks = context.arcs.filter(a => a.radius < 20).map(a => a.radius)
    expect(Math.max(...marks)).toBeLessThan(9) // the marker itself, no ring around the witness
  })

  it("rings the moment it is standing on instead of covering its letter", () => {
    // A milestone IS a moment of the witness's own account, so the playhead lands exactly on one
    // every time the recording reaches it — and a filled dot there hid the letter naming it.
    const { frame, context } = frameWith({
      markers: [{ label: "E", t: 0, lat: CENTER.lat, lng: CENTER.lng, current: true }]
    })
    new WitnessMapRenderer(context as unknown as CanvasRenderingContext2D).paint(frame)
    const marks = context.arcs.filter(a => a.radius < 20).map(a => a.radius)
    expect(Math.max(...marks)).toBeGreaterThan(7) // rings the marker rather than sitting inside it
    expect(context.texts.some(t => t.text === "E")).toBe(true)
  })

  it("washes the borrowed daytime photograph down for a night sighting", () => {
    // The imagery is somebody's daylight photograph of that ground whatever hour the account is
    // about. Chiles & Whitted is 02:45; laying it unchanged under that says the crew could see a
    // sunlit countryside.
    const { frame, context } = frameWith({ nightFraction: 1 })
    new WitnessMapRenderer(context as unknown as CanvasRenderingContext2D).paint(frame)
    expect(context.fills.some(fill => String(fill).startsWith("rgba(6, 12, 30"))).toBe(true)

    const day = frameWith({ nightFraction: 0 })
    new WitnessMapRenderer(day.context as unknown as CanvasRenderingContext2D).paint(day.frame)
    expect(day.context.fills.some(fill => String(fill).startsWith("rgba(6, 12, 30"))).toBe(false)
  })

  it("draws the scenery over the cone, not under it", () => {
    // Scenery is what the cone is CHECKED AGAINST — "was the shack inside what they could see" — so
    // it has to survive the wedge passing over it. Drawn underneath, the cyan came out green
    // wherever the cone crossed it, which is how it shipped invisible the first time.
    const { frame, context } = frameWith({
      decor: [{ lat: CENTER.lat - 0.001, lng: CENTER.lng, headingDeg: 225 }]
    })
    new WitnessMapRenderer(context as unknown as CanvasRenderingContext2D).paint(frame)
    const cone = context.fills.findIndex(fill => typeof fill === "object")
    const scenery = context.fills.findIndex(fill => String(fill).startsWith("rgba(120, 220, 255"))
    expect(scenery).toBeGreaterThan(cone)
    expect(context.rects).toHaveLength(1)
  })

  it("points the cone the way the witness faced, north up", () => {
    // Due east, on a north-up map, is straight to the right of screen — mid-arc angle 0 in canvas
    // terms. Getting this wrong is a quiet, plausible-looking error: a cone mirrored or turned a
    // quarter is still a cone over a landscape, and would silently clear or convict whatever
    // landmark it happened to land on.
    const { frame, context } = frameWith({ headingDeg: 90 })
    new WitnessMapRenderer(context as unknown as CanvasRenderingContext2D).paint(frame)
    const cone = coneOf(context)!
    expect((cone.from + cone.to) / 2).toBeCloseTo(0, 6)
    expect(cone.to - cone.from).toBeCloseTo((40 * Math.PI) / 180, 6)
  })

  it("puts north at the top", () => {
    const { frame, context } = frameWith({ headingDeg: 0 })
    new WitnessMapRenderer(context as unknown as CanvasRenderingContext2D).paint(frame)
    expect((coneOf(context)!.from + coneOf(context)!.to) / 2).toBeCloseTo(-Math.PI / 2, 6)
  })

  it("draws no cone at all when the recording never said which way they looked", () => {
    // An undefined heading is "nobody wrote it down" (see ObserverPose.headingDeg). Drawing a cone
    // due north for it would have the map assert the very thing it is being consulted about.
    const { frame, context } = frameWith({ headingDeg: undefined })
    new WitnessMapRenderer(context as unknown as CanvasRenderingContext2D).paint(frame)
    expect(coneOf(context)!.radius).toBeLessThan(20)
  })

  it("places the photograph by its own extent rather than stretching it to the map", () => {
    // The imagery covers three times the map's span here, as a real tile grid does. It must
    // therefore be drawn three times the canvas's size and offset by one canvas outside it — not
    // squeezed into the frame, which is the bug ImageryTexture.bounds exists to prevent.
    const { frame, context } = frameWith()
    const latSpan = frame.bounds.north - frame.bounds.south
    const lngSpan = frame.bounds.east - frame.bounds.west
    new WitnessMapRenderer(context as unknown as CanvasRenderingContext2D).paint({
      ...frame,
      imagery: {
        source: {} as CanvasImageSource,
        width: 768,
        height: 768,
        bounds: {
          south: frame.bounds.south - latSpan,
          north: frame.bounds.north + latSpan,
          west: frame.bounds.west - lngSpan,
          east: frame.bounds.east + lngSpan
        }
      }
    })
    const drawn = context.images[0]
    expect(drawn.width).toBeCloseTo(600, 0)
    expect(drawn.x).toBeCloseTo(-200, 0)
    expect(drawn.height).toBeCloseTo(600, 0)
    expect(drawn.y).toBeCloseTo(-200, 0)
  })

  it("draws the map with no photograph at all", () => {
    // What an offline embed, a blocked tile host and a test all get. The path, the cone and the
    // scale come from the recording itself, so the map still says everything it is for.
    const { frame, context } = frameWith()
    expect(() => new WitnessMapRenderer(context as unknown as CanvasRenderingContext2D).paint(frame)).not.toThrow()
    expect(context.images).toHaveLength(0)
    expect(coneOf(context)!.radius).toBeGreaterThan(200)
  })
})
