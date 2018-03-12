import {Canvas} from "./gui/Canvas";
import {Graphics} from "./gui/Graphics";

export abstract class AbstractView extends Canvas {
  public abstract displayBuffered(): void ;

  public abstract getBufferedGraphics(): Graphics;
}
