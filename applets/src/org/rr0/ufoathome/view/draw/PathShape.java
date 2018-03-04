package org.rr0.ufoathome.view.draw;

import java.awt.*;
import java.util.Enumeration;
import java.util.Vector;

/**
 * @author Jerôme Beau
 * @version 24 oct. 2003 19:34:37
 */
public class PathShape extends DrawShape {
    protected Vector data = new Vector(4);

    public PathShape(Component component) {
        super(component);
    }

    public void add(Object data) {
        this.data.addElement(data);
        if (data instanceof DrawShape) {
            Rectangle dataBounds = ((DrawShape) data).getBounds();
            bounds.x = Math.min(bounds.x, dataBounds.x);
            bounds.y = Math.min(bounds.y, dataBounds.y);
            bounds.width = Math.max(bounds.width, dataBounds.width);
            bounds.height = Math.max(bounds.height, dataBounds.height);
        }
    }

    protected void compute() {

    }

    public void paint(Graphics g, Rectangle bounds) {
        paint(g, getColor(), bounds);
    }

    public void paint(Graphics g, Color color, Rectangle bounds) {
        if (color != null) {
            g.setColor(color);
        }
        Enumeration instructionsEnumeration = data.elements();
        while (instructionsEnumeration.hasMoreElements()) {
            Object instruction = (Object) instructionsEnumeration.nextElement();
            if (instruction instanceof PolygonShape) {
                PolygonShape polygonShape = (PolygonShape) instruction;
                polygonShape.paint(g, polygonShape.getColor(), bounds);
            }
        }
    }
}
