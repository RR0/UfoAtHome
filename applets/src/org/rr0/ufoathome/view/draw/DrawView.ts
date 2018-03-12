import {AbstractView} from "../AbstractView";
import {MessageEditable} from "../gui/MessageEditable";
import {DrawSelection} from "./DrawSelection";
import {DrawShape} from "./DrawShape";
import {Image} from "../gui/Image";
import {ResourceBundle} from "../../ResourceBundle";
import {Cursor} from "../gui/Cursor";
import {Dimension} from "../gui/Dimension";
import {Graphics} from "../gui/Graphics";

/**
 * A drawable view.
 */
export class DrawView extends AbstractView {
  public static DEFAULT_CURSOR: Cursor = Cursor.getPredefinedCursor(Cursor.DEFAULT_CURSOR);
  public static CROSS_HAIR_CURSOR: Cursor = Cursor.getPredefinedCursor(Cursor.CROSSHAIR_CURSOR);
  public static WIDTH_RESIZE_CURSOR: Cursor = Cursor.getPredefinedCursor(Cursor.E_RESIZE_CURSOR);
  public static HEIGHT_RESIZE_CURSOR: Cursor = Cursor.getPredefinedCursor(Cursor.N_RESIZE_CURSOR);
  public static NORTH_WEST_RESIZE_CURSOR = Cursor.getPredefinedCursor(Cursor.NW_RESIZE_CURSOR);
  public static SOUTH_WEST_RESIZE_CURSOR = Cursor.getPredefinedCursor(Cursor.SW_RESIZE_CURSOR);
  public static NORTH_EAST_RESIZE_CURSOR = Cursor.getPredefinedCursor(Cursor.NE_RESIZE_CURSOR);
  public static SOUTH_EAST_RESIZE_CURSOR = Cursor.getPredefinedCursor(Cursor.SE_RESIZE_CURSOR);
  public static MOVE_CURSOR = Cursor.getPredefinedCursor(Cursor.MOVE_CURSOR);

  private bufferedImage: Image;
  protected bufferedGraphics: Graphics;
  private messageBundle: ResourceBundle;
  public static REMOVE_SELECTION_ACTION_COMMAND: String = "DeleteSelection";
  public static DELETE_SOURCE_ACTION_COMMAND: String = "DeleteX";

  public void;

  start() {
    const size: Dimension = this.getSize();     // Avoid using getWidth()/getHeight() which is not available from Java 1.1 (default applets)
    this.bufferedImage = this.createImage(size.width, size.height);
    this.bufferedGraphics = this.bufferedImage.getGraphics();
  }

  public paint(g: Graphics): void {
    g.drawImage(this.bufferedImage, 0, 0, this, this.horizonY, this);
  }

  public paintShape(ufoShape: DrawShape): void {
    ufoShape.paint(this.bufferedGraphics);
  }

  public displayBuffered(): void {
    this.paint(this.getGraphics());
  }

  public getShapeMenu(source: DrawSelection, drawSelection: DrawSelection, mouseX: number, mouseY: number, editable: MessageEditable): PopupMenu {
    const menu = new PopupMenu(source.toString());
    this.add(menu);
    //        MenuItem toFront = new MenuItem ("To front");
    //        menu.add(toFront);
    //        MenuItem toBack = new MenuItem ("To back");
    //        menu.add(toBack);
    const removeSelectionItem: MenuItem = new MenuItem(this.messageBundle.getString(this.REMOVE_SELECTION_ACTION_COMMAND));
    removeSelectionItem.setActionCommand(this.REMOVE_SELECTION_ACTION_COMMAND);
    menu.add(removeSelectionItem);

    const removeUFO: MenuItem = new MenuItem(MessageFormat.format(this.messageBundle.getString(this.DELETE_SOURCE_ACTION_COMMAND), [editable.getTitle()]));
    menu.add(removeUFO);
    return menu;
  }

  public setMessageBundle(messagesBundle: ResourceBundle): void {
    this.messageBundle = messagesBundle;
  }

  /**
   * Prevents flickering
   *
   * @param g
   */
  public update(g: Graphics): void {
    this.paint(g);
  }

  public getBufferedGraphics(): Graphics {
    return this.bufferedGraphics;
  }
}
