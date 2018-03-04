package org.rr0.ufoathome.view.draw;

import java.awt.*;
import java.util.Vector;

/**
 * A selection of DrawEvents.
 *
 * @author Jerôme Beau
 * @version 7 déc. 2003 19:20:58
 */
public class DrawSelection extends Vector {
    private Rectangle bounds = new Rectangle();

    public DrawSelection() {
        clear();
    }

    public int getX() {
        return bounds.x;
    }

    public int getY() {
        return bounds.y;
    }

    /**
     * (un)select the elements of the selection
     *
     * @param selected
     */
    public void select(boolean selected) {
        for (int i = 0; i < this.size(); i++) {
            DrawEvent event = (DrawEvent) this.elementAt(i);
            event.getShape().setSelected(selected);
        }
    }

    /**
     * Add the event (and associated shape) to the selection
     *
     * @param currentEvent The DrawEvent to add
     */
    public void add(DrawEvent currentEvent) {
        DrawShape shape = currentEvent.getShape();
        if (size() > 0) {
            if (shape.getX() < bounds.x) {
                bounds.x = shape.getX();
                bounds.width += bounds.x - shape.getX();
            }
            if (shape.getY() < bounds.y) {
                bounds.y = shape.getY();
                bounds.height += bounds.y - shape.getY();
            }
        } else {
            bounds.x = shape.getX();
            bounds.y = shape.getY();
            bounds.width = shape.getWidth();
            bounds.height = shape.getHeight();
        }
        super.addElement(currentEvent);
    }

    /**
     * Set the color of the whole collection.
     *
     * @param color The Color to set.
     */
    public void setColor(Color color) {
        for (int i = 0; i < this.size(); i++) {
            DrawEvent event = (DrawEvent) this.elementAt(i);
            event.getShape().setColor(color);
        }
    }

    /**
     * Empties the selection.
     */
    public void clear() {
        select(false);
        bounds.x = 0;
        bounds.y = 0;
        bounds.width = 0;
        bounds.height = 0;
        super.removeAllElements();
    }

    /**
     * Remove an element from the collection
     *
     * @param currentEvent The DrawEvent to remove.
     */
    public void remove(DrawEvent currentEvent) {
        super.removeElement(currentEvent);
        bounds.x = Integer.MAX_VALUE;
        bounds.y = Integer.MAX_VALUE;
        for (int i = 0; i < this.size(); i++) {
            DrawEvent event = (DrawEvent) this.elementAt(i);
            DrawShape shape = event.getShape();
            if (shape.getX() < bounds.x) {
                bounds.x = shape.getX();
            }
            if (shape.getY() < bounds.y) {
                bounds.y = shape.getY();
            }
        }
    }

    public Rectangle getBounds() {
        return bounds;
    }

    public void setLocation(int newX, int newY) {
        int deltaX = newX - bounds.x;
        int deltaY = newY - bounds.y;
        translate(deltaX, deltaY);
    }

    public void translate(int deltaX, int deltaY) {
        for (int i = 0; i < size(); i++) {
            DrawEvent event = (DrawEvent) elementAt(i);
            DrawShape shape = event.getShape();
            int xNew = shape.getX() + deltaX;
            int yNew = shape.getY() + deltaY;
            shape.setLocation(xNew, yNew);
        }
        bounds.x += deltaX;
        bounds.y += deltaY;
    }

    public void scaleWidth(double widthFactor) {
        if (size() > 1) {
            for (int i = 0; i < size(); i++) {
                DrawShape selectedShape = scaleEventWidth(i, widthFactor);
                scaleEventX(selectedShape, widthFactor);
            }
        } else {
            scaleEventWidth(0, widthFactor);
        }
    }

    private void scaleEventX(DrawShape selectedShape, double widthFactor) {
        int xDelta = selectedShape.getX() - getX();
        int deltaX = (int) Math.round(xDelta * widthFactor);
        selectedShape.setX(getX() + deltaX);
    }

    private DrawShape scaleEventWidth(int i, double widthFactor) {
        DrawEvent event = (DrawEvent) elementAt(i);
        DrawShape selectedShape = event.getShape();
        selectedShape.scaleWidth(widthFactor);
        return selectedShape;
    }

    public void scaleHeight(double heightFactor) {
        if (size() > 1) {
            for (int i = 0; i < size(); i++) {
                DrawShape selectedShape = scaleEventHeight(i, heightFactor);
                scaleEventY(selectedShape, heightFactor);
            }
        } else {
            scaleEventHeight(0, heightFactor);
        }
    }

    private void scaleEventY(DrawShape selectedShape, double heightFactor) {
        int yDelta = selectedShape.getY() - getY();
        int deltaY = (int) Math.round(yDelta * heightFactor);
        selectedShape.setY(getY() + deltaY);
    }

    private DrawShape scaleEventHeight(int i, double heightFactor) {
        DrawEvent event = (DrawEvent) elementAt(i);
        DrawShape selectedShape = event.getShape();
        selectedShape.scaleHeight(heightFactor);
        return selectedShape;
    }

    public int getWidth() {
        return bounds.width;
    }

    public int getHeight() {
        return bounds.height;
    }

    public void setTranparency(int alpha) {
        for (int i = 0; i < size(); i++) {
            DrawEvent event = (DrawEvent) elementAt(i);
            DrawShape selectedShape = event.getShape();
            selectedShape.setTransparency(alpha);
        }
    }
}
