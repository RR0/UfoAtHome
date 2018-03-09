import {DrawEvent} from "./DrawEvent";
import {DrawShape} from "./DrawShape";

/**
 * A selection of DrawEvents.
 */
export class DrawSelection extends Array {
  private Rectangle;
  bounds = new Rectangle();

  constructor() {
    super();
    this.clear();
  }

  public getX(): number {
    return this.bounds.x;
  }

  public getY(): number {
    return this.bounds.y;
  }

  /**
   * (un)select the elements of the selection
   *
   * @param selected
   */
  public select(selected: boolean): void {
    for (let i = 0; i < this.size(); i++) {
      const event: DrawEvent = <DrawEvent> this.elementAt(i);
      event.getShape().setSelected(selected);
    }
  }

  /**
   * Add the event (and associated shape) to the selection
   *
   * @param currentEvent The DrawEvent to add
   */
  public add(currentEvent: DrawEvent): void {
    const shape: DrawShape = currentEvent.getShape();
    if (this.size() > 0) {
      if (shape.getX() < this.bounds.x) {
        this.bounds.x = shape.getX();
        this.bounds.width += this.bounds.x - shape.getX();
      }
      if (shape.getY() < this.bounds.y) {
        this.bounds.y = shape.getY();
        this.bounds.height += this.bounds.y - shape.getY();
      }
    } else {
      this.bounds.x = shape.getX();
      this.bounds.y = shape.getY();
      this.bounds.width = shape.getWidth();
      this.bounds.height = shape.getHeight();
    }
    super.push(currentEvent);
  }

  /**
   * Set the color of the whole collection.
   *
   * @param color The Color to set.
   */
  public setColor(color: Color): void {
    for (let i = 0; i < this.size(); i++) {
      const event: DrawEvent = <DrawEvent>this.elementAt(i);
      event.getShape().setColor(color);
    }
  }

  /**
   * Empties the selection.
   */
  public clear(): void {
    this.select(false);
    this.bounds.x = 0;
    this.bounds.y = 0;
    this.bounds.width = 0;
    this.bounds.height = 0;
    super.splice(0, this.length); // clear array
  }

  /**
   * Remove an element from the collection
   *
   * @param currentEvent The DrawEvent to remove.
   */
  public remove(currentEvent: DrawEvent): void {
    super.removeElement(currentEvent);
    this.bounds.x = Integer.MAX_VALUE;
    this.bounds.y = Integer.MAX_VALUE;
    for (let i = 0; i < this.size(); i++) {
      const event: DrawEvent = <DrawEvent>this.elementAt(i);
      const shape: DrawShape = event.getShape();
      if (shape.getX() < this.bounds.x) {
        this.bounds.x = shape.getX();
      }
      if (shape.getY() < this.bounds.y) {
        this.bounds.y = shape.getY();
      }
    }
  }

  public getBounds(): Rectangle {
    return this.bounds;
  }

  public setLocation(newX: number, newY: number): void {
    const deltaX: number = newX - this.bounds.x;
    const deltaY: number = newY - this.bounds.y;
    this.translate(deltaX, deltaY);
  }

  public translate(deltaX: number, deltaY: number): void {
    for (let i = 0; i < this.size(); i++) {
      const event: DrawEvent = <DrawEvent>this.elementAt(i);
      const shape: DrawShape = event.getShape();
      const xNew: number = shape.getX() + deltaX;
      const yNew: number = shape.getY() + deltaY;
      shape.setLocation(xNew, yNew);
    }
    this.bounds.x += deltaX;
    this.bounds.y += deltaY;
  }

  public scaleWidth(widthFactor: number): void {
    if (this.size() > 1) {
      for (let i = 0; i < this.size(); i++) {
        const selectedShape: DrawShape = this.scaleEventWidth(i, widthFactor);
        this.scaleEventX(selectedShape, widthFactor);
      }
    } else {
      this.scaleEventWidth(0, widthFactor);
    }
  }

  private scaleEventX(selectedShape: DrawShape, widthFactor: number): void {
    const xDelta = selectedShape.getX() - this.getX();
    const deltaX = Math.round(xDelta * widthFactor);
    selectedShape.setX(this.getX() + deltaX);
  }

  private scaleEventWidth(i: number, widthFactor: number): DrawShape {
    const event: DrawEvent = <DrawEvent>elementAt(i);
    const selectedShape: DrawShape = event.getShape();
    selectedShape.scaleWidth(widthFactor);
    return selectedShape;
  }

  public scaleHeight(heightFactor: number): void {
    if (this.size() > 1) {
      for (let i = 0; i < this.size(); i++) {
        const selectedShape: DrawShape = this.scaleEventHeight(i, heightFactor);
        this.scaleEventY(selectedShape, heightFactor);
      }
    } else {
      this.scaleEventHeight(0, heightFactor);
    }
  }

  private scaleEventY(selectedShape: DrawShape, heightFactor: number): void {
    const yDelta: number = this.tselectedShape.getY() - this.getY();
    const deltaY = Math.round(yDelta * heightFactor);
    selectedShape.setY(this.getY() + deltaY);
  }

  private scaleEventHeight(i: number, heightFactor: number): DrawShape {
    const event: DrawEvent = <DrawEvent>elementAt(i);
    const selectedShape: DrawShape = event.getShape();
    selectedShape.scaleHeight(heightFactor);
    return selectedShape;
  }

  public getWidth(): number {
    return this.bounds.width;
  }

  public getHeight(): number {
    return this.bounds.height;
  }

  public setTranparency(alpha: number): void {
    for (let i = 0; i < this.size(); i++) {
      const event: DrawEvent = <DrawEvent>this.elementAt(i);
      const selectedShape: DrawShape = event.getShape();
      selectedShape.setTransparency(alpha);
    }
  }
}
