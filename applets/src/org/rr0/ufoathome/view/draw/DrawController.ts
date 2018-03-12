import {AbstractController} from "../../control/AbstractController";
import {DrawView} from "./DrawView";
import {DrawSelection} from "./DrawSelection";
import {DrawShape} from "./DrawShape";
import {DrawEvent} from "./DrawEvent";
import {AbstractView} from "../AbstractView";
import {KeyEvent} from "../gui/KeyEvent";
import {MessageEditable} from "../gui/MessageEditable";
import {DrawModel} from "./DrawModel";
import {MessageProducer} from "../../model/ufo/MessageProducer";
import {DateFormat} from "../../DateFormat";
import {ActionListener} from "../gui/ActionListener";
import {Locale} from "../../../util/Locale";
import {GregorianCalendar} from "../../GregorianCalendar";
import {TimeZone} from "../../TimeZone";
import {Calendar} from "../../Calendar";
import {Rectangle} from "../gui/Rectangle";
import {ActionEvent} from "../gui/ActionEvent";

/**
 * Handles drawing events to update a DrawView and a DrawModel accordingly.
 */
export class DrawController extends AbstractController {

  //    protected String mode = UFOController.LOCATION_TAB;

  /**
   * @supplierRole view
   */
  protected view: DrawView;
  private messageProducer: MessageProducer;
  protected model: DrawModel;
  private drawListeners = [];

  private dateFormat: DateFormat;
  protected timeKey: String;

  protected zoomFactor: number;

  /**
   * The sampling rate, in milliseconds
   */
  private samplingRate: number;

  //    private long lastRecordEnd;

  /**
   * @supplierRole current selection
   */
  private selection = new DrawSelection();
  private topShapePrototype: DrawShape;
  private middleShapePrototype: DrawShape;
  private bottomShapePrototype: DrawShape;
  protected moveDeltaX: number;
  protected moveDeltaY: number;
  private currentEvent: DrawEvent;

  private endTime: Date;
  private startTime: Date;
  public SHAPES_LAYER: number;
  private BACKGROUND_LAYER: number;
  private shapeMenuListener: ActionListener;

  //    private MouseEvent eventToRecord;
  //    private Thread dragRecordThread;

  constructor(view: DrawView, model: DrawModel, samplingRate: number, locale: Locale, messageProducer: MessageProducer) {
    super();
    this.setView(view);
    this.messageProducer = messageProducer;
    view.setMessageBundle(this.messagesBundle);
    this.model = model;
    this.samplingRate = samplingRate;
    this.dateFormat = DateFormat.getDateTimeInstance(DateFormat.FULL, DateFormat.LONG, locale);

    this.BACKGROUND_LAYER = this.newLayer();
    this.SHAPES_LAYER = this.newLayer();
    this.lastLayersStartBit = this.layersStartBit;
    this.setTime(GregorianCalendar.getInstance());
    this.modified(this.SHAPES_LAYER);
  }

  private setView(view: DrawView) {
    this.view = view;
    this.view.addMouseListener(this);
    this.view.addMouseMotionListener(this);
    this.view.addKeyListener(this);
  }

  public keyPressed(e: KeyEvent) {
    switch (e.getKeyCode()) {
      case KeyEvent.VK_UP:
        if (!this.selection.isEmpty()) {
          this.selection.translate(0, -1);
          this.modified(this.SHAPES_LAYER);
          e.consume();
        }
        break;
      case KeyEvent.VK_DOWN:
        if (!this.selection.isEmpty()) {
          this.selection.translate(0, 1);
          this.modified(this.SHAPES_LAYER);
          e.consume();
        }
        break;
      case KeyEvent.VK_LEFT:
        if (!this.selection.isEmpty()) {
          this.selection.translate(-1, 0);
          this.modified(this.SHAPES_LAYER);
          e.consume();
        }
        break;

      case KeyEvent.VK_RIGHT:
        if (!this.selection.isEmpty()) {
          this.selection.translate(1, 0);
          this.modified(this.SHAPES_LAYER);
          e.consume();
        }
        break;

      case KeyEvent.VK_DELETE:
        if (!this.selection.isEmpty()) {
          this.deleteSelection();
          this.modified(this.SHAPES_LAYER);
          e.consume();
        }
        break;
    }
  }

  protected deleteSelection() {
    const currentEvents = this.model.getEvents(this.timeKey);
    const eventsToDelete = this.selection.elements();
    while (eventsToDelete.hasMoreElements()) {
      const eventToDelete = eventsToDelete.nextElement();
      currentEvents.removeElement(eventToDelete);
    }
    this.selection.clear();
    this.modified(this.SHAPES_LAYER);
  }

  public getView(): AbstractView {
    return this.view;
  }

  public getModel(): DrawModel {
    return this.model;
  }

  //    public int getAs() {
  //        return as;
  //    }

  public getTimeZone(): TimeZone {
    return this.model.getTimeZone();
  }

  public setTimeZone(timeZone: TimeZone) {
    this.model.setTimeZone(timeZone);
  }

  //    public Locale getLocale() {
  //        return locale;
  //    }

  public getDateFormat(): DateFormat {
    return this.dateFormat;
  }

  public getEndTime(): Date {
    return this.endTime;
  }

  public setEndTime(endTime: Date) {
    this.endTime = endTime;
  }

  public getStartTime(): Date {
    return this.startTime;
  }

  public setStartTime(startTime: Date) {
    this.startTime = startTime;
  }

  public start() {
    this.view.start();
  }

  public getSamplingRate(): number {
    return this.samplingRate;
  }

  public fireMessage(s: String, editable: MessageEditable) {
    if (this.messageProducer != null) {
      this.messageProducer.fireMessage(s, editable);
    }
  }

  public setTime(currentTime: GregorianCalendar) {
    super.setTime(currentTime);
    const millis = currentTime.get(Calendar.MILLISECOND) / this.samplingRate;
    this.timeKey = this.dateFormat.format(currentTime.getTime()) + millis;
  }

  protected fireEventSelected(currentEvent: DrawEvent) {
    for (let i = 0; i < this.drawListeners.length; i++) {
      const drawListener = this.drawListeners[i];
      drawListener.eventSelected(currentEvent);
    }
  }

  /**
   * A click in the applet area.
   *
   * @param e The mouse click event
   */
  public mouseClicked(e: MouseEvent) {
    const mouseX = e.x;
    const mouseY = e.y;
    if (this.isShapePrototypeAvailable()) {
      createNewShape(mouseX, mouseY, e.getSource());
      this.modified(this.SHAPES_LAYER);
      e.consume();
    } else {
      const currentEvent = this.model.getEvent(this.timeKey, mouseX, mouseY);
      if (currentEvent != null) {
        const ctrlPressed = (e.getModifiers() == 18);
        const alreadySelected = this.selection.contains(currentEvent) || currentEvent.getShape().isSelected();
        if (e.getModifiers() == 4) {
          this.showShapeMenu(mouseX, mouseY, currentEvent);
        } else if (alreadySelected) {
          this.deselect(currentEvent);
        } else {
          this.select(ctrlPressed, currentEvent);
        }
        this.modified(this.SHAPES_LAYER);
        e.consume();
      } else {
        if (!this.selection.isEmpty()) {
          this.view.setCursor(DrawView.DEFAULT_CURSOR);
        }
        this.backgroundClicked(e);
      }
    }
    this.draw();
  }

  private isShapePrototypeAvailable(): boolean {
    return this.topShapePrototype != null || this.middleShapePrototype != null || this.bottomShapePrototype != null;
  }

  public backgroundClicked(e: MouseEvent) {
    this.selection.clear();
    this.modified(this.SHAPES_LAYER);
    for (const i = 0; i < this.drawListeners.length; i++) {
      const drawListener = this.drawListeners[i];
      drawListener.backgroundClicked();
    }
  }

  private createNewShape(mouseX: number, mouseY: number, eventSource: Object) {
    try {
      this.selection.clear();
      let drawEventSource: Object;
      const hoveredEvent = this.model.getEvent(this.timeKey, mouseX, mouseY);
      if (hoveredEvent != null) {
        drawEventSource = hoveredEvent.getSource();
      } else {
        drawEventSource = eventSource;
      }

      let topShapeHeight = 0;
      if (this.topShapePrototype != null) {
        const topShapeEvent: DrawEvent = this.record(mouseX, mouseY, drawEventSource, this.topShapePrototype);
        const topShape: DrawShape = topShapeEvent.getShape();
        topShape.setSelected(true);
        this.selection.add(topShapeEvent);
        topShapeHeight = topShape.getHeight();
        this.topShapePrototype = null;
      }

      let midShapeHeight = 0;
      if (this.middleShapePrototype != null) {
        const middleEvent = this.record(mouseX, mouseY + topShapeHeight, drawEventSource, this.middleShapePrototype);
        const middleShape = middleEvent.getShape();
        midShapeHeight = middleShape.getHeight();
        middleShape.setSelected(true);
        this.selection.add(middleEvent);
        this.middleShapePrototype = null;
      }

      if (this.bottomShapePrototype != null) {
        const bottomEvent = this.record(mouseX, mouseY + topShapeHeight + midShapeHeight, drawEventSource, this.bottomShapePrototype);
        const bottomShape = bottomEvent.getShape();
        bottomShape.setSelected(true);
        this.selection.add(bottomEvent);
        this.bottomShapePrototype = null;
      }

      this.view.setCursor(DrawView.DEFAULT_CURSOR);
    } catch (e1: Exception) {
      throw new RuntimeException("Could not clone " + this.topShapePrototype + ": " + e1.getClass().getName() + ": " + e1.getMessage());
    }
  }

  public showShapeMenu(mouseX: number, mouseY: number, currentEvent: DrawEvent) {
    const editable = this.currentEvent.getSource();
    const menu = this.view.getShapeMenu(this.selection, this.selection, mouseX, mouseY, editable);
    menu.addActionListener(this.getShapeMenuListener());
    menu.show(this.view, mouseX, mouseY);
  }

  protected getShapeMenuListener(): ActionListener {
    if (this.shapeMenuListener == null) {
      this.shapeMenuListener = new ShapeMenuListener();
    }
    return this.shapeMenuListener;
  }

  /**
   * Select a applet event.
   *
   * @param multiple
   * @param currentEvent
   */
  public select(multiple: boolean, currentEvent: DrawEvent) {
    if (!multiple) {
      this.selection.clear();
    }
    this.fireEventSelected(currentEvent);
    this.selection.add(currentEvent);
    this.selection.select(true);
  }

  public deselect(currentEvent: DrawEvent) {
    this.selection.remove(currentEvent);
  }

  public mouseMoved(mouseEvent: MouseEvent) {
    const mouseX = mouseEvent.x;
    const mouseY = mouseEvent.y;
    const currentEvent = this.model.getEvent(this.timeKey, mouseX, mouseY);
    if (currentEvent != null) {
      const source: MessageEditable = currentEvent.getSource();
      this.fireMessage(source.getTitle(), source);
      const shape = currentEvent.getShape();
      if (shape.isSelected() && this.selection.contains(currentEvent)) {
        this.moveOverShape(shape, mouseX, mouseY);
      }
      mouseEvent.consume();
    } else {
      if (this.isShapePrototypeAvailable()) {
        this.fireMessage("Click the sky area to set the location of the shape", null);
        this.view.setCursor(DrawView.CROSS_HAIR_CURSOR);
        //                    drawSky(false);
        //                currentShape.paint(skyView.getGraphics(), Color.gray);
        //                if (mouseX < SCROLL_MARGIN) {
        //                    setAzimut(azimutDegrees - 1);
        //                    update();
        //                } else if (mouseX > SKY_WIDTH - SCROLL_MARGIN) {
        //                    setAzimut(azimutDegrees + 1);
        //                    update();
        //                }
        //                if (mouseY < SCROLL_MARGIN) {
        //                    setAltitude(altitudeDegrees + 1);
        //                    update();
        //                } else if (mouseY > SKY_HEIGHT - SCROLL_MARGIN) {
        //                    setAltitude(altitudeDegrees - 1);
        //                    update();
        //                }
        //                    currentShape.setLocation(mouseX, mouseY);
        //                    currentShape.paint(skyView.getGraphics());
        //                skyView.repaint();
      } else {
        this.view.setCursor(DrawView.DEFAULT_CURSOR);
      }
    }
  }

  private moveOverShape(selectedShape: DrawShape, mouseX: number, mouseY: number) {
    const ufoX = selectedShape.x;
    const ufoY = selectedShape.y;
    const moveDeltaX = mouseX - ufoX;
    const moveDeltaY = mouseY - ufoY;
    const ufoWidth = selectedShape.getBounds().width;
    const ufoHalfWidth = ufoWidth / 2;
    const ufoHeight = selectedShape.getBounds().height;
    const ufoHalfHeight = ufoHeight / 2;
    if (mouseX >= ufoX - DrawShape.HALF_CORNER_SIZE && mouseX <= ufoX + DrawShape.HALF_CORNER_SIZE) {
      if (mouseY >= ufoY - DrawShape.HALF_CORNER_SIZE && mouseY <= ufoY + DrawShape.HALF_CORNER_SIZE) {
        this.view.setCursor(DrawView.NORTH_WEST_RESIZE_CURSOR);
      } else if (mouseY >= ufoY + ufoHalfHeight - DrawShape.HALF_CORNER_SIZE && mouseY <= ufoY + ufoHalfHeight + DrawShape.HALF_CORNER_SIZE) {
        this.view.setCursor(DrawView.WIDTH_RESIZE_CURSOR);
      } else if (mouseY >= ufoY + ufoHeight - DrawShape.HALF_CORNER_SIZE && mouseY <= ufoY + ufoHeight + DrawShape.HALF_CORNER_SIZE) {
        this.view.setCursor(DrawView.SOUTH_WEST_RESIZE_CURSOR);
      } else {
        this.view.setCursor(DrawView.MOVE_CURSOR);
      }
    } else if (mouseX >= ufoX + ufoHalfWidth - DrawShape.HALF_CORNER_SIZE && mouseX <= ufoX + ufoHalfWidth + DrawShape.HALF_CORNER_SIZE) {
      if ((mouseY >= ufoY - DrawShape.HALF_CORNER_SIZE && mouseY <= ufoY + DrawShape.HALF_CORNER_SIZE) || (mouseY >= ufoY + ufoHeight - DrawShape.HALF_CORNER_SIZE && mouseY <= ufoY + ufoHeight + DrawShape.HALF_CORNER_SIZE)) {
        this.view.setCursor(DrawView.HEIGHT_RESIZE_CURSOR);
      } else {
        this.view.setCursor(DrawView.MOVE_CURSOR);
      }
    } else if (mouseX >= ufoX + ufoWidth - DrawShape.HALF_CORNER_SIZE && mouseX <= ufoX + ufoWidth + DrawShape.HALF_CORNER_SIZE) {
      if (mouseY >= ufoY - DrawShape.HALF_CORNER_SIZE && mouseY <= ufoY + DrawShape.HALF_CORNER_SIZE) {
        this.view.setCursor(DrawView.NORTH_EAST_RESIZE_CURSOR);
      } else if (mouseY >= ufoY + ufoHalfHeight - DrawShape.HALF_CORNER_SIZE && mouseY <= ufoY + ufoHalfHeight + DrawShape.HALF_CORNER_SIZE) {
        this.view.setCursor(DrawView.WIDTH_RESIZE_CURSOR);
      } else if (mouseY >= ufoY + ufoHeight - DrawShape.HALF_CORNER_SIZE && mouseY <= ufoY + ufoHeight + DrawShape.HALF_CORNER_SIZE) {
        this.view.setCursor(DrawView.SOUTH_EAST_RESIZE_CURSOR);
      } else {
        this.view.setCursor(DrawView.MOVE_CURSOR);
      }
    } else {
      this.view.setCursor(DrawView.MOVE_CURSOR);
    }
  }

  public record(x: number, y: number, source: Object, shape: DrawShape): DrawEvent {
    let drawEvent = null;
    this.fireMessage("Recording " + source + " at " + this.timeKey, null);
    try {
      const ufoShape = shape.clone();
      ufoShape.setLocation(x, y);
      drawEvent = new DrawEvent(ufoShape, ufoShape);
      this.model.addEvent(this.timeKey, drawEvent);
      this.fireEventRecorded(drawEvent);
    } catch (e: CloneNotSupportedException) {
      e.printStackTrace();
    }
    return drawEvent;
  }

  protected fireEventRecorded(drawEvent: DrawEvent) {
    for (let i = 0; i < this.drawListeners.length; i++) {
      const drawListener = this.drawListeners[i];
      drawListener.eventRecorded(drawEvent);
    }
  }

  public mouseReleased(e: MouseEvent) {
    this.moveDeltaX = 0;
    this.moveDeltaY = 0;
    this.currentEvent = null;
  }

  public mouseDragged(e: MouseEvent) {
    if (this.isResizingWidth()) {
      const shape = this.currentEvent.getShape();
      const shapeBounds = shape.getBounds();
      this.setNewWidth(shapeBounds, e.x);
      this.modified(this.SHAPES_LAYER);
      e.consume();
    } else if (this.isResizingCorner()) {
      const shape = this.currentEvent.getShape();
      const shapeBounds = shape.getBounds();
      this.setNewWidth(shapeBounds, e.x);
      this.setNewHeight(shapeBounds, e.y);
      this.modified(this.SHAPES_LAYER);
      e.consume();
    } else if (this.isResizingHeight()) {
      const shape = this.currentEvent.getShape();
      const shapeBounds = shape.getBounds();
      this.setNewHeight(shapeBounds, e.y);
      this.modified(this.SHAPES_LAYER);
      e.consume();
    } else if (this.isMoving()) {
      const newX = e.x - this.moveDeltaX;
      const newY = e.y - this.moveDeltaY;
      const shape = this.currentEvent.getShape();
      const deltaX = newX - shape.x;
      const deltaY = newY - shape.y;
      this.selection.translate(deltaX, deltaY);
      this.modified(this.SHAPES_LAYER);
      e.consume();
    } else if (this.isShapePrototypeAvailable()) {
      createNewShape(e.x, e.y, e.getSource());
      this.currentEvent = this.model.getEvent(timeKey, e.x, e.x);
      if (this.currentEvent != null) {
        this.moveOverShape(this.currentEvent.getShape(), e.x, e.y);
        e.consume();
      }
      this.modified(this.SHAPES_LAYER);
    }
    this.lastX = e.x;
    this.lastY = e.y;
    this.draw();
  }

  private setNewHeight(shapeBounds: Rectangle, newY: number) {
    const maxY = shapeBounds.y + shapeBounds.height - 1;
    let deltaHeight;
    if (newY >= maxY) {
      deltaHeight = newY - maxY;
    } else if (newY > shapeBounds.y) {
      if (this.lastY < newY) {
        deltaHeight = this.lastY - newY;
        this.selection.translate(0, -deltaHeight);
      } else {
        deltaHeight = newY - this.lastY;
      }
    } else {
      deltaHeight = shapeBounds.y - newY;
      this.selection.translate(0, -deltaHeight);
    }
    const factor = ((shapeBounds.height + deltaHeight)) / (shapeBounds.height);
    this.selection.scaleHeight(factor);
  }

  private setNewWidth(shapeBounds: Rectangle, newX: number) {
    const maxX = shapeBounds.x + shapeBounds.width - 1;
    let deltaWidth;
    if (newX >= maxX) {
      deltaWidth = newX - maxX;
    } else if (newX > shapeBounds.x) {
      if (this.lastX < newX) {
        deltaWidth = this.lastX - newX;
        this.selection.translate(-deltaWidth, 0);
      } else {
        deltaWidth = newX - this.lastX;
      }
    } else {
      deltaWidth = shapeBounds.x - newX;
      this.selection.translate(-deltaWidth, 0);
    }
    const factor = ((shapeBounds.width + deltaWidth)) / (shapeBounds.width);
    this.selection.scaleWidth(factor);
  }

  /*
      public boolean isAspectMode() {
          return mode.equals(UFOController.ASPECT_TAB);
      }

      public boolean isMapMode() {
          return mode.equals(UFOController.MAP);
      }

      public boolean isBehaviorMode() {
          return mode.equals(UFOController.BEHAVIOR_TAB);
      }
  */

  /*
      private record(MouseEvent e, DrawSelection selection) {
          int newX = e.x - selection.getWidth() / 2;
          int newY = e.y - selection.getHeight();
          int deltaX = newX - selection.x;
          int deltaY = newY - selection.y;
          for (int i = 0; i < selection.length; i++) {
              DrawEvent event = (DrawEvent) selection.elementAt(i);
              DrawShape shape = event.getShape();
              int xNew = shape.x + deltaX;
              int yNew = shape.y + deltaY;
              record(xNew, yNew, event.getSource(), shape);
          }
          Rectangle bounds = selection.getBounds();
          bounds.x += deltaX;
          bounds.y += deltaY;
      }
  */

  private isMoving(): boolean {
    return this.view.getCursor() == DrawView.MOVE_CURSOR;
  }

  private isResizingHeight(): boolean {
    return this.view.getCursor() == DrawView.HEIGHT_RESIZE_CURSOR;
  }

  private isResizingCorner(): boolean {
    const cursor = this.view.getCursor();
    return cursor == DrawView.NORTH_WEST_RESIZE_CURSOR || cursor == DrawView.SOUTH_WEST_RESIZE_CURSOR || cursor == DrawView.SOUTH_EAST_RESIZE_CURSOR || cursor == DrawView.NORTH_EAST_RESIZE_CURSOR;
  }

  private isResizingWidth(): boolean {
    return this.view.getCursor() == DrawView.WIDTH_RESIZE_CURSOR;
  }

  public paintShapes() {
    const ufoEvents = this.model.getEvents(this.timeKey);
    if (ufoEvents != null) {
      for (let layer = 0; layer < ufoEvents.length; layer++) {
        const ufoEvent = (DrawEvent)
        ufoEvents.elementAt(layer);
        const ufoShape = ufoEvent.getShape();
        this.view.paintShape(ufoShape);
      }
    }
  }

  public paintBackground() {
    this.view.setForeground(Color.blue);
    this.view.getBufferedGraphics().fillRect(0, 0, this.view.getlength.width, this.view.getlength.height);
  }

  public addSelection(selection: DrawEvent) {
    this.selection.add(selection);
  }

  public setColor(color: Color) {
    if (this.topShapePrototype != null) {
      this.topShapePrototype.setColor(color);
    }
    if (this.middleShapePrototype != null) {
      this.middleShapePrototype.setColor(color);
    }
    if (this.bottomShapePrototype != null) {
      this.bottomShapePrototype.setColor(color);
    }
    if (!this.isShapePrototypeAvailable()) {
      this.selection.setColor(color);
    }
  }

  public draw(requiredLayers: BitSet) {
    if (this.isToDraw(this.requiredLayers, this.BACKGROUND_LAYER)) {
      this.paintBackground();
    }
    if (this.isToDraw(this.requiredLayers, this.SHAPES_LAYER)) {
      this.paintShapes();
    }
    super.draw(this.requiredLayers);
  }

  public setZoomFactor(x: number) {
    //        zoomFactor = x;
    this.model.setZoomFactor(x);
  }

  public addDrawListener(drawListener: DrawListener) {
    this.drawListeners.addElement(drawListener);
  }

  public setTopShape(shapePrototype: DrawShape) {
    this.topShapePrototype = shapePrototype;
    this.view.setCursor(DrawView.CROSS_HAIR_CURSOR);
    this.fireMessage("Click your shape on the applet area", null);
  }

  public setMidShape(shapePrototype: DrawShape) {
    this.middleShapePrototype = shapePrototype;
    this.view.setCursor(DrawView.CROSS_HAIR_CURSOR);
    this.fireMessage("Click your shape on the applet area", null);
  }

  public setBottomShape(shapePrototype: DrawShape) {
    this.bottomShapePrototype = shapePrototype;
    this.view.setCursor(DrawView.CROSS_HAIR_CURSOR);
    this.fireMessage("Click your shape on the applet area", null);
  }

  /*
      public setMode(String modeName) {
          this.mode = modeName;
          fireModeChanged();
          if (isAspectMode()) {
              selection = ufoSelection;
              selection.select(true);
          } else if (isBehaviorMode()) {
              selection = ufoSelection;
              if (selection.isEmpty()) {

              }
              selection.select(false);
          } else if (isMapMode()) {
              selection = mapSelection;
              selection.select(true);
          }
      }
  */

  public setTransparency(alpha: number) {
    this.selection.setTranparency(alpha);
  }

  public getSelection(): DrawSelection {
    return this.selection;
  }

  public getTimeKey(): String {
    return this.timeKey;
  }

  public setTimeKey(timeKey: String) {
    this.timeKey = timeKey;
  }

  public setDateFormat(dateFormat: DateFormat) {
    this.dateFormat = dateFormat;
  }

  public class ShapeMenuListener implements ActionListener {
  public actionPerformed(actionEvent: ActionEvent) {
    if (actionEvent.getActionCommand().equals(DrawView.REMOVE_SELECTION_ACTION_COMMAND)) {
      this.deleteSelection();
    } else if (actionEvent.getActionCommand().equals(DrawView.DELETE_SOURCE_ACTION_COMMAND)) {
      const sourceName = <MenuItem> actionEvent.getSource()).getName();
      this.model.removeSource(sourceName);
      this.modified(this.SHAPES_LAYER);
    }
  }
};
}
