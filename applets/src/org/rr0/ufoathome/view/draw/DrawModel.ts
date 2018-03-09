import {DrawEvent} from "./DrawEvent";
import {DrawShape} from "./DrawShape";
import {MessageEditable} from "../gui/MessageEditable";

/**
 * Model of a set of DrawEvents, i.e. shapes at given positions and configuration (size, color) at multiple times.
 */
export class DrawModel {
  /**
   * Vectors of DrawEvents for a given time key
   */
  private layeredEvents = new Hashtable();

  private timeZone: TimeZone;
  protected sources = new Hashtable();

  public createShape(shapePrototype: DrawShape): DrawShape {
    try {
      const ufoShape: DrawShape = shapePrototype.clone();
      return ufoShape;
    } catch (e: CloneNotSupportedException) {
      e.printStackTrace();
      throw new RuntimeException(e.getClass().getName() + ": " + e.getMessage());
    }
  }

  public addEvent(timeKey: Object, newEvent: DrawEvent) {
    let eventsByLayerForThisDate = this.getEvents(timeKey);
    if (eventsByLayerForThisDate == null) {
      eventsByLayerForThisDate = new Vector(1);
      this.layeredEvents.put(timeKey, eventsByLayerForThisDate);
    }
    eventsByLayerForThisDate.push(newEvent);
  }

  /**
   * Get recorded events for a given time.
   *
   * @param dateKey A identifier that uniquely identify the time of the events to retrieve.
   * @return A Vector of events for this date key, by layer order.
   */
  public getEvents(dateKey: Object): [] {
    return this.layeredEvents.get(dateKey);
  }

  public getShape(source: Object, timeKey: Object): DrawShape {
    let found: DrawShape = null;
    const layerEvents = this.getEvents(timeKey);
    if (layerEvents != null) {
      for (let i = layerEvents.size() - 1; i >= 0; i--) {
        const existingEvent = (DrawEvent);
        layerEvents.elementAt(i);
        const existingSource = existingEvent.getSource();
        if (existingSource.equals(source)) {
          found = existingEvent.getShape();
          break;
        }
      }
    }
    return found;
  }

  public getEvent(timeKey: Object, x: number, y: number): DrawEvent {
    let found: DrawEvent = null;
    const layerEvents = this.getEvents(timeKey);
    if (layerEvents != null) {
      for (let i = layerEvents.size() - 1; i >= 0; i--) {
        const ufoEvent = (DrawEvent);
        layerEvents.elementAt(i);
        const ufoShape = ufoEvent.getShape();
        if (ufoShape.contains(x, y)) {
          found = ufoEvent;
          break;
        }
      }
    }
    return found;
  }

  public getSelectedEvent(timeKey: Object, x: number, y: number): DrawEvent {
    let found: DrawEvent = null;
    const layerEvents = this.getEvents(timeKey);
    if (layerEvents != null) {
      for (let i = layerEvents.size() - 1; i >= 0; i--) {
        const event = (DrawEvent);
        layerEvents.elementAt(i);
        const shape = event.getShape();
        if (selectedShapeContains(shape, x, y)) {
          found = event;
          break;
        }
      }
    }
    return found;
  }

  private selectedShapeContains(shape: DrawShape, x: number, y: number): boolean {
    const selectionBounds = new Rectangle(shape.getBounds());
    selectionBounds.x -= DrawShape.HALF_CORNER_SIZE;
    selectionBounds.y -= DrawShape.HALF_CORNER_SIZE;
    selectionBounds.width = DrawShape.CORNER_SIZE;
    selectionBounds.height = DrawShape.CORNER_SIZE;
    const ufoContains = selectionBounds.contains(x, y);
    return ufoContains;
  }

  public setZoomFactor(as: number) {
    //        Vector layerEvents = getEvents(timeKey);
    //        for (int i = 0; i < layerEvents.size(); i++) {
    //            DrawEvent event = (DrawEvent) layerEvents.elementAt(i);
    //
    //        }
    //        if (currentShape != null) {
    //            currentShape.scale(factor);
    //            drawSky(false);
    //        }
    //        int ufoIndex = ufoList.getSelectedIndex();
    //        if (ufoIndex >= 0) {
    //            DrawShape sizedShape = ufoScene.getUFO(ufoList.getItems()[ufoIndex], fullDate);
    //            if (sizedShape != null) {
    //                sizedShape.scale(factor);
    //            }
    //        }
  }

  public removeSource(fromSourceName: String) {
    const enumeration = this.layeredEvents.elements();
    const fromSource: MessageEditable = this.sources.get(fromSourceName);
    while (enumeration.hasMoreElements()) {
      const someDateEvents: [] = enumeration.nextElement();
      const eventsToRemove = this.getEvents(someDateEvents, fromSource);
      for (let i = 0; i < eventsToRemove.size(); i++) {
        const event = eventsToRemove.elementAt(i);
        someDateEvents.removeElement(event);    // Remove from the original enumeration
      }
    }
    this.sources.remove(fromSourceName);
  }

  /**
   * Returns a <b>copied Vector</b> of the events
   *
   * @param allEventsForThatDate
   * @param fromSource
   * @return A <b>copied Vector</b> of the events
   */
  private getEvents(allEventsForThatDate: [], fromSource: Object): [] {
    const eventsFromThatSource = new Vector(allEventsForThatDate.size());
    for (let i = 0; i < this.allEventsForThatDate.size(); i++) {
      const existingEvent = allEventsForThatDate[i];
      const existingSource = existingEvent.getSource();
      if (existingSource == fromSource) {
        eventsFromThatSource.addElement(existingEvent);
      }
    }
    return eventsFromThatSource;
  }

  public getEvents(dateKey: Object, fromSource: Object): [] {
    const allEventsForThatDate = this.getEvents(dateKey);
    const sourceEventsAtThatDate = this.getEvents(allEventsForThatDate, fromSource);
    return sourceEventsAtThatDate;
  }

  public getTimeZone(): TimeZone {
    return this.timeZone;
  }

  public setTimeZone(timeZone: TimeZone) {
    this.timeZone = timeZone;
  }

  public toString(): String {
    const uudfBuffer = new StringBuffer();
    const ufosEnumeration = this.layeredEvents.keys();
    while (ufosEnumeration.hasMoreElements()) {
      const timeKey = ufosEnumeration.nextElement();
      const eventsByLayerForThisDate = (Vector);
      this.layeredEvents.get(timeKey);
      for (let layer = 0; layer < eventsByLayerForThisDate.size(); layer++) {
        const layerEvent = (DrawEvent);
        eventsByLayerForThisDate.elementAt(layer);
        uudfBuffer.append("<event");
        uudfBuffer.append(" time=\"").append(timeKey).append("\"");
        uudfBuffer.append(" layer=\"" + layer + "\"");
        uudfBuffer.append(">\n");
        uudfBuffer.append(layerEvent.toString()).append("\n");
        uudfBuffer.append("</event>\n");
      }
    }
    return uudfBuffer.toString();
  }

  public getSources() {
    return this.sources;
  }

  public getSource(name: String): Object {
    return this.sources.get(name);
  }
}
