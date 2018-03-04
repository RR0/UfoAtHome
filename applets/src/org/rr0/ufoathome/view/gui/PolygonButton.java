package org.rr0.ufoathome.view.gui;

import java.awt.*;

/**
 * <p>A on/off button that displays a Shape.</p>
 * <p>This class is implemented to be usable in Java 1.1 applets, and so follows an AWT-only requirement
 * (no Swing, Java2D, geom, or Java 2 feature)</P>
 * <p>Because of the graphics to be drawn on it, this button inherits from java.gui.Canvas and not from java.gui.Button
 * (of which the peer cannot be overwritten on every platform)</p>
 *
 * @author Jerôme Beau
 * @version 24 oct. 2003 16:36:35
 */
public class PolygonButton extends ShapeButton {
    private Polygon polygon;

    public PolygonButton(Polygon aPolygon) {
        super();
        setPolygon(aPolygon);
    }

    public void setPolygon(Polygon aPolygon) {
        this.polygon = aPolygon;
        Dimension size = aPolygon.getBounds().getSize();
        setShapeDimension(size);
    }

    public void paint(Graphics g) {
        super.paint(g);
        g = g.create(getMargin(), getMargin(), size().width - getMargin() * 2, size().height - getMargin() * 2);

        int n = polygon.npoints;
        int[] x;
        int[] y;
        if (isPushed()) {
            x = new int[n];
            y = new int[n];
            for (int i = 0; i < n; i++) {
                x[i] = polygon.xpoints[i] + 1;
                y[i] = polygon.ypoints[i] + 1;
            }
        } else {
            x = polygon.xpoints;
            y = polygon.ypoints;
        }
        g.fillPolygon(x, y, n);
    }

    public Polygon getPolygon() {
        return polygon;
    }
}
