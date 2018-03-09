import {AbstractController} from "../../control/AbstractController";
import {DrawSelection} from "./DrawSelection";
import {DrawView} from "./DrawView";
import {DrawModel} from "./DrawModel";
import {DrawShape} from "./DrawShape";
import {DrawEvent} from "./DrawEvent";
import {AbstractView} from "../AbstractView";
import {MessageListener} from "../gui/MessageListener";
import {MessageEditable} from "../gui/MessageEditable";

/**
 * Handles drawing events to update a DrawView and a DrawModel accordingly.
 */
export class BehaviorController extends AbstractController {
  /**
   * @supplierRole view
   */
  protected view: DrawView;
  protected model: DrawModel;
  private messageListeners = [];
  private drawListeners = new [];

  private dateFormat: DateFormat;
  protected timeKey: String;

  protected as: number;

  /**
   * The sampling rate, in milliseconds
   */
  private samplingRate: number;

  private lastRecordEnd: number;

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

  private animationListeners = [];
  private endTime: Date;
  private startTime: Date;
  private locale: Locale;
  private messagesBundle: ResourceBundle;

  protected lastX: number;
  protected lastY: number;
  private eventToRecord: MouseEvent;
  private dragRecordThread: Thread;
  private messageProducer: MessageProducer;

  public SHAPES_LAYER: number = layersStartBit + 1;

  constructor(view: DrawView, model: DrawModel, samplingRate: number, locale: Locale, messageProducer: MessageProducer) {
    super();
    this.messageProducer = messageProducer;
    this.messagesBundle = ResourceBundle.getBundle("org.rr0.is.presentation.view.report.applet.StarSkyLabels");
    this.view = view;
    view.setMessageBundle(messagesBundle);
    this.model = model;
    this.samplingRate = samplingRate;
    this.locale = locale;
    this.dateFormat = DateFormat.getDateTimeInstance(DateFormat.FULL, DateFormat.LONG, locale);

    this.ALL_LAYERS.set(this.SHAPES_LAYER);
  }

  public getView(): AbstractView {
    return this.view;
  }

  public getModel(): DrawModel {
    return this.model;
  }

  public getAs(): number {
    return this.as;
  }

  public getLastX(): number {
    return this.lastX;
  }

  public getLastY(): number {
    return this.lastY;
  }

  public TimeZone;

  getTimeZone() {
    return this.model.getTimeZone();
  }

  public setTimeZone(timeZone: TimeZone) {
    this.model.setTimeZone(timeZone);
  }

  public getLocale(): Locale {
    return this.locale;
  }

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

  public setTime(currentTime: GregorianCalendar) {
    super.setTime(currentTime);
    if (this.currentEvent != null) {
      this.topShapePrototype = this.currentEvent.getShape();
    }
    const millis = this.currentTime.get(Calendar.MILLISECOND) / this.samplingRate;
    this.timeKey = this.dateFormat.format(currentTime.getTime()) + millis;
    this.fireTimeChanged(currentTime);
  }

  private fireEventSelected(currentEvent: DrawEvent) {
    for (let i = 0; i < this.drawListeners.size(); i++) {
      const drawListener = this.drawListeners.elementAt(i);
      drawListener.eventSelected(currentEvent);
    }
  }

  public addMessageListener(messageListener: MessageListener) {
    this.messageListeners.push(messageListener);
  }

  /**
   * Send a text message to our message listeners.
   *
   * @param message
   * @param editable
   */
  public fireMessage(message: String, editable: MessageEditable) {
    this.messageProducer.fireMessage(message, editable);
  }

  /**
   * A click in the applet area.
   *
   * @param e The mouse click event
   */
  public mouseClicked(e: MouseEvent) {
    this.record(e, this.selection);
  }

  private isShapePrototypeAvailable(): boolean {
    return this.topShapePrototype != null || this.middleShapePrototype != null || this.bottomShapePrototype != null;
  }

  public backgroundClicked(e: MouseEvent) {

  }

  public showShapeMenu(mouseX: number, mouseY: number) {
    const selectedShapesCount = this.selection.size();
    if (selectedShapesCount > 0) {
      const currentUfo = <UFO> (<DrawEvent>this.selection[0]).getSource();
      const menu = this.view.getShapeMenu(this.selection, this.selection, mouseX, mouseY, currentUfo);
      menu.show(this.view, mouseX, mouseY);
    }
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
    const mouseX = mouseEvent.getX() - this.selection.getWidth() / 2;
    const mouseY = mouseEvent.getY() - this.selection.getHeight();
    this.selection.setLocation(mouseX, mouseY);
    this.draw(this.ALL_LAYERS);
  }

  public mouseExited(e: MouseEvent) {
    const currentEvents: [] = this.model.getEvents(this.timeKey);
    if (currentEvents != null) {
      for (let i = 0; i < currentEvents.size(); i++) {
        const currentEvent = (DrawEvent);
        currentEvents[i];
        const currentEventShape = currentEvent.getShape();
        const enumeration = selection.elements();
        while (enumeration.hasMoreElements()) {
          const selectionEvent = (DrawEvent);
          enumeration.nextElement();
          const selectionShape = selectionEvent.getShape();
          if (currentEventShape == selectionShape) {
            currentEvents.removeElement(currentEvent);
          }
        }
      }
      this.draw(this.ALL_LAYERS);
    }
    super.mouseExited(e);
  }

  public record(x: number, y: number, source: Object, shape: DrawShape): DrawEvent {
    let drawEvent = null;
    this.fireMessage("Recording " + source + " at " + this.timeKey, null);
    try {
      shape.setLocation(x, y);
      const ufoShape = (DrawShape);
      shape.clone();
      drawEvent = new DrawEvent(ufoShape, source);
      this.model.addEvent(this.timeKey, drawEvent);
      this.fireEventRecorded(drawEvent);
    } catch (e: CloneNotSupportedException) {
      e.printStackTrace();
    }
    return drawEvent;
  }

  private fireEventRecorded(drawEvent: DrawEvent) {
    for (let i = 0; i < this.drawListeners.size(); i++) {
      const drawListener = this.drawListeners[i];
      drawListener.eventRecorded(drawEvent);
    }
  }

  public mouseReleased(e: MouseEvent) {
    this.lastRecordEnd = 0;
    this.moveDeltaX = 0;
    this.moveDeltaY = 0;
    this.currentEvent = null;
    this.eventToRecord = null;
    this.dragRecordThread = null;
  }

  public mouseDragged(e: MouseEvent) {
    this.eventToRecord = e;
    if (this.dragRecordThread == null) {
      this.dragRecordThread = new Thread();
      {
      public
        run();
        {
          while (this.eventToRecord != null) {
            const recordTime = System.currentTimeMillis();
            if (this.lastRecordEnd != 0) {
              const deltaMillis = (int)(recordTime - this.lastRecordEnd);
              if (deltaMillis >= this.samplingRate) {
                this.record(this.eventToRecord, this.selection);
                this.draw(this.ALL_LAYERS);
                const someCurrentTime = this.getCurrentTime();
                someCurrentTime.add(Calendar.MILLISECOND, deltaMillis);
                this.setTime(someCurrentTime);
              }
            }
            this.lastRecordEnd = recordTime;
          }
        }
      }
      this.dragRecordThread.start();
    }
  }

  public setLastX(lastX: number) {
    this.lastX = lastX;
  }

  public setLastY(lastY: number) {
    this.lastY = lastY;
  }

  private record(e: MouseEvent, selection: DrawSelection) {
    const newX = e.getX() - selection.getWidth() / 2;
    const newY = e.getY() - selection.getHeight();
    const deltaX = newX - selection.getX();
    const deltaY = newY - selection.getY();
    for (let i = 0; i < selection.size(); i++) {
      const event = (DrawEvent);
      selection[i];
      const shape = event.getShape();
      const xNew = shape.getX() + deltaX;
      const yNew = shape.getY() + deltaY;
      this.record(xNew, yNew, event.getSource(), shape);
    }
    const bounds = selection.getBounds();
    bounds.x += deltaX;
    bounds.y += deltaY;
  }

  public paintShapes() {
    const ufoEvents = this.model.getEvents(this.timeKey);
    if (ufoEvents != null) {
      for (let layer = 0; layer < ufoEvents.size(); layer++) {
        const ufoEvent = (DrawEvent);
        ufoEvents.elementAt(layer);
        const ufoShape = ufoEvent.getShape();
        this.view.paintShape(ufoShape);
      }
    }
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

  public getMessagesBundle(): ResourceBundle {
    return this.messagesBundle;
  }

  public draw(layers: BitSet) {
    this.paintShapes();
    this.view.displayBuffered();
  }

  public setAs(x: number) {
    this.as = x;
    this.model.setZoomFactor(as);
  }

  public addDrawListener(drawListener: DrawListener) {
    this.drawListeners.push(drawListener);
  }

  public addAnimationListener(animationListener: AnimationListener) {
    this.animationListeners.push(animationListener);
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

  public setSelection(selection: DrawSelection) {
    this.selection = selection;
  }
}
