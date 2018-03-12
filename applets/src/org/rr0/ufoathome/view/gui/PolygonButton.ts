import {ShapeButton} from "./ShapeButton";
import {Polygon} from "../../../../../../../JCCKit/src/jcckit/graphic/Polygon";

/**
 * <p>A on/off button that displays a Shape.</p>
 * <p>This class is implemented to be usable in Java 1.1 applets, and so follows an AWT-only requirement
 * (no Swing, Java2D, geom, or Java 2 feature)</P>
 * <p>Because of the graphics to be drawn on it, this button inherits from java.gui.Canvas and not from java.gui.Button
 * (of which the peer cannot be overwritten on every platform)</p>
 */
export class PolygonButton extends ShapeButton {
  private polygon: Polygon;

  constructor(aPolygon: Polygon) {
    super();
    this.setPolygon(aPolygon);
  }

  public setPolygon(aPolygon: Polygon) {
    this.polygon = aPolygon;
    const size = aPolygon.getBounds().getSize();
    this.setShapeDimension(size);
  }

  public paint(g: Graphics) {
    super.paint(g);
    g = g.create(this.getMargin(), this.getMargin(), this.size().width - this.getMargin() * 2, this.size().height - this.getMargin() * 2);

    const n = this.polygon.npoints;
    let x: number[];
    let y: number[];
    if (this.isPushed()) {
      x = [];
      y = [];
      for (let i = 0; i < n; i++) {
        x[i] = this.polygon.xpoints[i] + 1;
        y[i] = this.polygon.ypoints[i] + 1;
      }
    } else {
      x = this.polygon.xpoints;
      y = this.polygon.ypoints;
    }
    g.fillPolygon(x, y, n);
  }

  public getPolygon(): Polygon {
    return this.polygon;
  }
}
