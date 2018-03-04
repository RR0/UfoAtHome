package org.rr0.ufoathome.view.draw;

import java.awt.*;

/**
 * @author Jerôme Beau
 * @version 24 oct. 2003 19:34:37
 */
public class RectangleShape extends DrawShape {
    public RectangleShape(Component component) {
        super(component);
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
        g.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
    }

    public Object clone() throws CloneNotSupportedException {
        RectangleShape clone = (RectangleShape) super.clone();
        clone.bounds = new Rectangle(bounds);
        return clone;
    }
}
