package org.rr0.ufoathome.view.draw;

import org.rr0.ufoathome.view.gui.MessageEditable;

import java.awt.*;
import java.util.Enumeration;
import java.util.Hashtable;
import java.util.TimeZone;
import java.util.Vector;

/**
 * Model of a set of DrawEvents, i.e. shapes at given positions and configuration (size, color) at multiple times.
 *
 * @author Jerôme Beau
 * @version 15 nov. 2003 19:38:01
 */
public class DrawModel {
    /**
     * Vectors of DrawEvents for a given time key
     */
    private Hashtable layeredEvents = new Hashtable();

    private TimeZone timeZone;
    protected Hashtable sources = new Hashtable();

    public DrawShape createShape(DrawShape shapePrototype) {
        try {
            DrawShape ufoShape = (DrawShape) shapePrototype.clone();
            return ufoShape;
        } catch (CloneNotSupportedException e) {
            e.printStackTrace();
            throw new RuntimeException(e.getClass().getName() + ": " + e.getMessage());
        }
    }

    public void addEvent(Object timeKey, DrawEvent newEvent) {
        Vector eventsByLayerForThisDate = getEvents(timeKey);
        if (eventsByLayerForThisDate == null) {
            eventsByLayerForThisDate = new Vector(1);
            layeredEvents.put(timeKey, eventsByLayerForThisDate);
        }
        eventsByLayerForThisDate.addElement(newEvent);
    }

    /**
     * Get recorded events for a given time.
     *
     * @param dateKey A identifier that uniquely identify the time of the events to retrieve.
     * @return A Vector of events for this date key, by layer order.
     */
    public Vector getEvents(Object dateKey) {
        return (Vector) layeredEvents.get(dateKey);
    }

    public DrawShape getShape(Object source, Object timeKey) {
        DrawShape found = null;
        Vector layerEvents = getEvents(timeKey);
        if (layerEvents != null) {
            for (int i = layerEvents.size() - 1; i >= 0; i--) {
                DrawEvent existingEvent = (DrawEvent) layerEvents.elementAt(i);
                Object existingSource = existingEvent.getSource();
                if (existingSource.equals(source)) {
                    found = existingEvent.getShape();
                    break;
                }
            }
        }
        return found;
    }

    public DrawEvent getEvent(Object timeKey, int x, int y) {
        DrawEvent found = null;
        Vector layerEvents = getEvents(timeKey);
        if (layerEvents != null) {
            for (int i = layerEvents.size() - 1; i >= 0; i--) {
                DrawEvent ufoEvent = (DrawEvent) layerEvents.elementAt(i);
                DrawShape ufoShape = ufoEvent.getShape();
                if (ufoShape.contains(x, y)) {
                    found = ufoEvent;
                    break;
                }
            }
        }
        return found;
    }

    public DrawEvent getSelectedEvent(Object timeKey, int x, int y) {
        DrawEvent found = null;
        Vector layerEvents = getEvents(timeKey);
        if (layerEvents != null) {
            for (int i = layerEvents.size() - 1; i >= 0; i--) {
                DrawEvent event = (DrawEvent) layerEvents.elementAt(i);
                DrawShape shape = event.getShape();
                if (selectedShapeContains(shape, x, y)) {
                    found = event;
                    break;
                }
            }
        }
        return found;
    }

    private boolean selectedShapeContains(DrawShape shape, int x, int y) {
        Rectangle selectionBounds = new Rectangle(shape.getBounds());
        selectionBounds.x -= DrawShape.HALF_CORNER_SIZE;
        selectionBounds.y -= DrawShape.HALF_CORNER_SIZE;
        selectionBounds.width = DrawShape.CORNER_SIZE;
        selectionBounds.height = DrawShape.CORNER_SIZE;
        boolean ufoContains = selectionBounds.contains(x, y);
        return ufoContains;
    }

    public void setZoomFactor(int as) {
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

    public void removeSource(String fromSourceName) {
        Enumeration enumeration = layeredEvents.elements();
        MessageEditable fromSource = (MessageEditable) sources.get(fromSourceName);
        while (enumeration.hasMoreElements()) {
            Vector someDateEvents = (Vector) enumeration.nextElement();
            Vector eventsToRemove = getEvents(someDateEvents, fromSource);
            for (int i = 0; i < eventsToRemove.size(); i++) {
                DrawEvent event = (DrawEvent) eventsToRemove.elementAt(i);
                someDateEvents.removeElement(event);    // Remove from the original enumeration
            }
        }
        sources.remove(fromSourceName);
    }

    /**
         * Returns a <b>copied Vector</b> of the events
         *
         * @param allEventsForThatDate
         * @param fromSource
         * @return A <b>copied Vector</b> of the events
         */
    private Vector getEvents(Vector allEventsForThatDate, Object fromSource) {
        Vector eventsFromThatSource = new Vector(allEventsForThatDate.size());
        for (int i = 0; i < allEventsForThatDate.size(); i++) {
            DrawEvent existingEvent = (DrawEvent) allEventsForThatDate.elementAt(i);
            Object existingSource = existingEvent.getSource();
            if (existingSource == fromSource) {
                eventsFromThatSource.addElement(existingEvent);
            }
        }
        return eventsFromThatSource;
    }

    public Vector getEvents(Object dateKey, Object fromSource) {
        Vector allEventsForThatDate = getEvents(dateKey);
        Vector sourceEventsAtThatDate = getEvents(allEventsForThatDate, fromSource);
        return sourceEventsAtThatDate;
    }

    public TimeZone getTimeZone() {
        return timeZone;
    }

    public void setTimeZone(TimeZone timeZone) {
        this.timeZone = timeZone;
    }

    public String toString() {
        StringBuffer uudfBuffer = new StringBuffer();
        Enumeration ufosEnumeration = layeredEvents.keys();
        while (ufosEnumeration.hasMoreElements()) {
            Object timeKey = ufosEnumeration.nextElement();
            Vector eventsByLayerForThisDate = (Vector) layeredEvents.get(timeKey);
            for (int layer = 0; layer < eventsByLayerForThisDate.size(); layer++) {
                DrawEvent layerEvent = (DrawEvent) eventsByLayerForThisDate.elementAt(layer);
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

    public Hashtable getSources() {
        return sources;
    }

    public Object getSource(String name) {
        return sources.get(name);
    }
}
