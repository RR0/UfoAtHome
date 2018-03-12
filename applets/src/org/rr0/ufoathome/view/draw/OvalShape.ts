import {DrawShape} from "./DrawShape";
import {Component} from "../gui/Component";
import {Graphics} from "../gui/Graphics";
import {Color} from "../gui/Color";
import {Rectangle} from "../gui/Rectangle";

export class OvalShape extends DrawShape {
  private centerX: number;
  private centerY: number;
  private polygonVersion: PolygonShape;

  constructor(component: Component) {
    super(component);
  }

  public getCenterX(): number {
    return this.centerX;
  }

  public getCenterY(): number {
    return this.centerY;
  }

  public setCenterX(centerX: number) {
    this.centerX = centerX;
  }

  public setCenterY(centerY: number) {
    this.centerY = centerY;
  }

  public setWidth(width: number) {
    super.setWidth(width);
    //        bounds.x = centerX - (width / 2);
    this.compute();
  }

  public setHeight(height: number) {
    super.setHeight(height);
    //        bounds.y = centerY - (height / 2);
    this.compute();
  }

  public setX(x: number) {
    super.setX(x);
    this.setCenterX(x + this.bounds.width / 2);
  }

  public setY(y: number) {
    super.setY(y);
    this.setCenterY(y + this.bounds.height / 2);
  }

  protected compute() {
    if (this.polygonVersion != null) {
      const nPoints = 20;
      let step = PolygonShape.TWO_PI / nPoints;
      let point = 0;
      let xStart = this.bounds.x + this.centerX;
      let yStart = this.bounds.y + this.centerY;
      let xRadius = this.bounds.width / 2;
      let yRadius = this.bounds.height / 2;
      let xPoints = [];
      let yPoints = [];
      for (let i = 0; i < PolygonShape.TWO_PI; i += step, point++) {
        xPoints[point] = xStart + (Math.cos(i) * xRadius);
        yPoints[point] = yStart + (Math.sin(i) * yRadius);
      }
      this.polygonVersion = new PolygonShape(this.component);
      this.polygonVersion.setPoints(xPoints, yPoints);
    }
  }

  public paint(g: Graphics, someColor: Color, bounds: Rectangle) {
    if (someColor != null) {
      g.setColor(someColor);
    }
    if (this.angle == 0 || this.angle == Math.PI) {
      g.fillOval(bounds.x, bounds.y, bounds.width, bounds.height);
    } else if (this.angle == Math.PI / 2 || angle == 3 * (Math.PI / 2)) {
      g.fillOval(bounds.x, bounds.y, bounds.width, bounds.height);
    } else {
      // Non remarquable angles are processed through polygon rotation
      this.polygonVersion.paint(g, someColor, bounds);
    }
  }

  /**
   * Bresenham circle algorithm.
   *
   * @param g
   * @param r
   */
  private circle(g: Graphics, r: number) {
    let x = 0;
    let y = r;
    let d = 3 - 2 * r;
    while (x < y) {
      this.circlePoint(g, x, y);
      if (d < 0) {
        d += 4 * x + 6;         // Select S
      } else {
        d += 4 * (x - y) + 10;   // Select T -- decrement Y
        y--;
      }
      x++;
    }
    if (x == y) {
      this.circlePoint(g, x, y);
    }
  }

  private circlePoint(g: Graphics, dx: number, dy: number) {
    this.point(g, this.centerX + dx, this.centerY + dy);
    this.point(g, this.centerX + dy, this.centerY + dx);
    this.point(g, this.centerX + dy, this.centerY - dx);
    this.point(g, this.centerX + dx, this.centerY - dy);
    this.point(g, this.centerX - dx, this.centerY - dy);
    this.point(g, this.centerX - dy, this.centerY - dx);
    this.point(g, this.centerX - dy, this.centerY + dx);
    this.point(g, this.centerX - dx, this.centerY + dy);
  }

  private point(g: Graphics, x: number, y: number) {
    g.drawLine(x, y, x, y);
  }

  protected getType(): String {
    return "oval";
  }

  public toString(): String {
    const uudfBuffer = new StringBuffer();
    uudfBuffer.append("<ellipse");
    uudfBuffer.append(super.toString());
    uudfBuffer.append(" rx=\"" + this.getWidth() + "\"");
    uudfBuffer.append(" ry=\"" + this.getHeight() + "\"");
    uudfBuffer.append("/>\n");
    return uudfBuffer.toString();
  }
}

