/**
 *  A polygon or polyline.
 *
 *  @author Franz-Josef Elmer
 */
export class Polygon extends BasicGraphicalElement {
  private _points = [];
  private _closed: boolean;

  /**
   * Creates an instance of the specified graphic attributes.
   * @param closed <tt>true</tt> if this polygon is closed.
   */
  constructor(attributes: GraphicAttributes, closed: boolean) {
    super(attributes);
    this._closed = closed;
  }

  /** Returns <tt>true</tt> if this polygon is closed. */
  public isClosed(): boolean {
    return this._closed;
  }

  /** Returns the number points. */
  public getNumberOfPoints() {
    return this._points.size();
  }

  /** Returns the point for the specified index. */
  public getPoint(index: number): GraphPoint {
    return <GraphPoint> this._points[index];
  }

  /** Adds a new point to the end of the list of points. */
  public addPoint(point: GraphPoint) {
    this._points.push(point);
  }

  /** Removes all points. */
  public removeAllPoints() {
    this._points.removeAllElements();
  }

  /** Replaces the point at the specified index by a new one. */
  public replacePointAt(index: number, point: GraphPoint) {
    this._points[index] = point;
  }

  /**
   *  Renders this line with the specified {@link Renderer}.
   *  @param renderer An instance of {@link PolygonRenderer}.
   *  @throws IllegalArgumentException if <tt>renderer</tt> is not
   *          an instance of <tt>PolygonRenderer</tt>.
   */
  public renderWith(renderer: Renderer) {
    if (renderer instanceof PolygonRenderer) {
      (<PolygonRenderer>renderer).render(this);
    } else {
      throw new IllegalArgumentException(renderer
        + " does not implements PolygonRenderer.");
    }
  }
}
