import type { GeoBounds } from "../render3d/terrain/GeoBounds.js"

/**
 * Which part of the observer's ground the map is showing — the fitted box by default, and whatever
 * a reader has since zoomed into or dragged to.
 *
 * Stated RELATIVE to the fitted box (a zoom factor and a centre in fractions of it), so that the
 * default view is simply "no change" and a new recording's box needs nothing done to it. When the box
 * of the SAME recording is refitted (an author moving the observer), refit keeps the ground on
 * screen where it was: a map that jumped under the click that moved the observer would put him
 * somewhere other than where the author just pointed.
 *
 * Fractions are taken the way the map is drawn: linear in longitude across, Web Mercator down (see
 * fractionWithinBounds). A view worked out linearly in latitude would drift off the imagery it is
 * placed on by exactly the error that function exists to avoid.
 */
export class ObserverMapView {
  /** Out to four times the fitted box: enough to find the road a path came in on, not so far that
   * the imagery for it becomes a request for half a department. */
  static readonly MIN_ZOOM = 0.25
  /** In to a sixty-fourth: a 400 m box becomes about 6 m, a car's length on a 280 px panel. Past
   * that the tiles have nothing more to show. */
  static readonly MAX_ZOOM = 64

  /** 1 = the fitted box; 2 = half its width. */
  private zoom = 1
  /** The view's centre, in fractions of the fitted box from its west and north edges. */
  private centerX = 0.5
  private centerY = 0.5

  /** Whether the reader has changed anything — what decides whether "back to the fitted box" is
   * worth offering at all. */
  get changed(): boolean {
    return this.zoom !== 1 || this.centerX !== 0.5 || this.centerY !== 0.5
  }

  get zoomFactor(): number {
    return this.zoom
  }

  reset(): void {
    this.zoom = 1
    this.centerX = 0.5
    this.centerY = 0.5
  }

  /**
   * Zooms by `factor` keeping the ground under (x, y) — fractions of the VIEW — where it is, which is
   * what a wheel under a pointer means: the thing pointed at stays under the pointer.
   */
  zoomAt(x: number, y: number, factor: number): void {
    const zoom = Math.min(ObserverMapView.MAX_ZOOM, Math.max(ObserverMapView.MIN_ZOOM, this.zoom * factor))
    // The fitted-box fraction under the pointer, before and after, must be the same point.
    const pointX = this.centerX + (x - 0.5) / this.zoom
    const pointY = this.centerY + (y - 0.5) / this.zoom
    this.centerX = pointX - (x - 0.5) / zoom
    this.centerY = pointY - (y - 0.5) / zoom
    this.zoom = zoom
  }

  /** Moves the ground by (dx, dy) fractions of the VIEW — a drag to the right brings in what was to
   * the west. */
  panBy(dx: number, dy: number): void {
    this.centerX -= dx / this.zoom
    this.centerY -= dy / this.zoom
  }

  /** Re-expresses the view against a new fitted box so it covers the same ground as it did against
   * the old one. Nothing to do while the view is the fitted box itself: that one follows the path. */
  refit(from: GeoBounds, to: GeoBounds): void {
    if (!this.changed) return
    const view = this.boundsWithin(from)
    const toNorth = ObserverMapView.mercatorY01(to.north)
    const toSouth = ObserverMapView.mercatorY01(to.south)
    const viewNorth = ObserverMapView.mercatorY01(view.north)
    const viewSouth = ObserverMapView.mercatorY01(view.south)
    this.zoom = (to.east - to.west) / (view.east - view.west)
    this.centerX = ((view.west + view.east) / 2 - to.west) / (to.east - to.west)
    this.centerY = ((viewNorth + viewSouth) / 2 - toNorth) / (toSouth - toNorth)
  }

  /**
   * Recentres the view on `point` once it comes within `margin` (a fraction of the view) of an
   * edge — how a zoomed map follows an observer who walks, drives or flies out of it. Recentred
   * rather than nudged: a map that only kept them at its edge would show where they had been and
   * nothing of where they were going. The fitted box needs none of this: it was fitted to the whole
   * path. True when the view moved.
   */
  keepInView(fitted: GeoBounds, point: { lat: number; lng: number }, margin: number): boolean {
    if (!this.changed) return false
    const bounds = this.boundsWithin(fitted)
    const north = ObserverMapView.mercatorY01(bounds.north)
    const south = ObserverMapView.mercatorY01(bounds.south)
    const x = (point.lng - bounds.west) / (bounds.east - bounds.west)
    const y = (ObserverMapView.mercatorY01(point.lat) - north) / (south - north)
    if (x >= margin && x <= 1 - margin && y >= margin && y <= 1 - margin) return false
    this.panBy(0.5 - x, 0.5 - y)
    return true
  }

  /** The ground this view covers, inside the fitted box `fitted`. */
  boundsWithin(fitted: GeoBounds): GeoBounds {
    if (!this.changed) return fitted
    const half = 0.5 / this.zoom
    const north = ObserverMapView.mercatorY01(fitted.north)
    const south = ObserverMapView.mercatorY01(fitted.south)
    const width = fitted.east - fitted.west
    return {
      west: fitted.west + (this.centerX - half) * width,
      east: fitted.west + (this.centerX + half) * width,
      north: ObserverMapView.latitudeAt(north + (this.centerY - half) * (south - north)),
      south: ObserverMapView.latitudeAt(north + (this.centerY + half) * (south - north))
    }
  }

  /** `bounds` grown by `fraction` of its own width and height on every side — degrees, which over
   * the few hundred metres a map spans is the same as metres to well under a pixel. */
  static expand(bounds: GeoBounds, fraction: number): GeoBounds {
    const width = bounds.east - bounds.west
    const height = bounds.north - bounds.south
    return {
      west: bounds.west - width * fraction,
      east: bounds.east + width * fraction,
      south: bounds.south - height * fraction,
      north: bounds.north + height * fraction
    }
  }

  /** The place at (x, y), fractions of `bounds` from its west and north edges — the inverse of
   * fractionWithinBounds, which is what a click on the map has to go through to become a coordinate. */
  static pointAt(bounds: GeoBounds, x: number, y: number): { lat: number; lng: number } {
    const north = ObserverMapView.mercatorY01(bounds.north)
    const south = ObserverMapView.mercatorY01(bounds.south)
    return {
      lat: ObserverMapView.latitudeAt(north + y * (south - north)),
      lng: bounds.west + x * (bounds.east - bounds.west)
    }
  }

  /** Same projection as TileMath's own: 0 at the north edge of the Web Mercator world, 1 at the
   * south. */
  private static mercatorY01(latDeg: number): number {
    const latRad = (latDeg * Math.PI) / 180
    return (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2
  }

  private static latitudeAt(y01: number): number {
    return (Math.atan(Math.sinh(Math.PI * (1 - 2 * y01))) * 180) / Math.PI
  }
}
