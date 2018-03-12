import {EventObject} from "../gui/EventObject";
import {DrawShape} from "./DrawShape";

/**
 * An event on a shape from a given source.
 */
export class DrawEvent extends EventObject {
  /**
   * @supplierRole event shape
   */
  private shape: DrawShape;

  constructor(shape: DrawShape, source: Object) {
    super(source);
    this.shape = shape;
  }

  public getShape(): DrawShape {
    return this.shape;
  }

  public toString(): string {
    return `\t${this.source}\n\t${this.shape}`;
  }
}