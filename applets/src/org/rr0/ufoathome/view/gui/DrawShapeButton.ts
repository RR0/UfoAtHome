import {ShapeButton} from "./ShapeButton";
import {DrawShape} from "../draw/DrawShape";
import {Rectangle} from "./Rectangle";
import {Graphics} from "./Graphics";

/**
 * <p>A on/off button that displays a Shape.</p>
 * <p>This class is implemented to be usable in Java 1.1 applets, and so follows an AWT-only requirement
 * (no Swing, Java2D, geom, or Java 2 feature)</P>
 * <p>Because of the graphics to be drawn on it, this button inherits from java.gui.Canvas and not from java.gui.Button
 * (of which the peer cannot be overwritten on every platform)</p>
 */
export class DrawShapeButton extends ShapeButton {
  /**
   * The on/off state of the button
   */
  private shape: DrawShape;
  private drawBounds: Rectangle;
  private pushedBounds: Rectangle;

  constructor(aShape: DrawShape) {
    super();
    this.setShape(aShape);
  }

  public setShape(aShape: DrawShape) {
    this.shape = aShape;
    const size = aShape.getBounds().getSize();
    this.setShapeDimension(size);
    const margin = this.getMargin();
    const shapeBounds = this.shape.getBounds();
    const x = shapeBounds.x;
    const y = shapeBounds.y;
    const newBounds = new Rectangle(x + margin, y + margin, shapeBounds.width + margin * 2, shapeBounds.height + margin * 2);
    this.setBounds(newBounds);
    this.drawBounds = new Rectangle(shapeBounds.x + margin, shapeBounds.y + margin, shapeBounds.width, shapeBounds.height);
    this.pushedBounds = new Rectangle(shapeBounds.x + margin + 1, shapeBounds.y + margin + 1, shapeBounds.width, shapeBounds.height);
  }

  public paint(g: Graphics) {
    super.paint(g);
    (<DrawShape>this.shape).paint(g, this.isPushed() ? this.pushedBounds : this.drawBounds);
  }

  public getShape(): DrawShape {
    return this.shape;
  }
}
