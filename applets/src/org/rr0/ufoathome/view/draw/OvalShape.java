package org.rr0.ufoathome.view.draw;

import java.awt.*;

/**
 * @author Jerôme Beau
 * @version 22 sept. 2003 21:49:45
 */
public class OvalShape extends DrawShape {
    private int centerX;
    private int centerY;
    private PolygonShape polygonVersion;

    public OvalShape(Component component) {
        super(component);
    }

    public int getCenterX() {
        return centerX;
    }

    public int getCenterY() {
        return centerY;
    }

    public void setCenterX(int centerX) {
        this.centerX = centerX;
    }

    public void setCenterY(int centerY) {
        this.centerY = centerY;
    }

    public void setWidth(int width) {
        super.setWidth(width);
        //        bounds.x = centerX - (width / 2);
        compute();
    }

    public void setHeight(int height) {
        super.setHeight(height);
        //        bounds.y = centerY - (height / 2);
        compute();
    }

    public void setX(int x) {
        super.setX(x);
        setCenterX(x + bounds.width / 2);
    }

    public void setY(int y) {
        super.setY(y);
        setCenterY(y + bounds.height / 2);
    }

    protected void compute() {
        if (polygonVersion != null) {
            int nPoints = 20;
            double step = PolygonShape.TWO_PI / nPoints;
            int point = 0;
            int xStart = bounds.x + centerX;
            int yStart = bounds.y + centerY;
            int xRadius = bounds.width / 2;
            int yRadius = bounds.height / 2;
            int[] xPoints = new int [nPoints];
            int[] yPoints = new int [nPoints];
            for (double i = 0; i < PolygonShape.TWO_PI; i += step, point++) {
                xPoints[point] = xStart + (int) (Math.cos(i) * xRadius);
                yPoints[point] = yStart + (int) (Math.sin(i) * yRadius);
            }
            polygonVersion = new PolygonShape(component);
            polygonVersion.setPoints(xPoints, yPoints);
        }
    }

    public void paint(Graphics g, Color someColor, Rectangle bounds) {
        if (someColor != null) {
            g.setColor(someColor);
        }
        if (angle == 0 || angle == Math.PI) {
            g.fillOval(bounds.x, bounds.y, bounds.width, bounds.height);
        } else if (angle == Math.PI / 2 || angle == 3 * (Math.PI / 2)) {
            g.fillOval(bounds.x, bounds.y, bounds.width, bounds.height);
        } else {
            // Non remarquable angles are processed through polygon rotation
            polygonVersion.paint(g, someColor, bounds);
        }
    }

    /**
     * Bresenham circle algorithm.
     *
     * @param g
     * @param r
     */
    private void circle(Graphics g, int r) {
        int x = 0;
        int y = r;
        int d = 3 - 2 * r;
        while (x < y) {
            circlePoint(g, x, y);
            if (d < 0) {
                d += 4 * x + 6;         // Select S
            } else {
                d += 4 * (x - y) + 10;   // Select T -- decrement Y
                y--;
            }
            x++;
        }
        if (x == y) {
            circlePoint(g, x, y);
        }
    }

    private void circlePoint(Graphics g, int dx, int dy) {
        point(g, centerX + dx, centerY + dy);
        point(g, centerX + dy, centerY + dx);
        point(g, centerX + dy, centerY - dx);
        point(g, centerX + dx, centerY - dy);
        point(g, centerX - dx, centerY - dy);
        point(g, centerX - dy, centerY - dx);
        point(g, centerX - dy, centerY + dx);
        point(g, centerX - dx, centerY + dy);
    }

    private void point(Graphics g, int x, int y) {
        g.drawLine(x, y, x, y);
    }

    protected String getType() {
        return "oval";
    }

    public String toString() {
        StringBuffer uudfBuffer = new StringBuffer();
        uudfBuffer.append("<ellipse");
        uudfBuffer.append(super.toString());
        uudfBuffer.append(" rx=\"" + getWidth() + "\"");
        uudfBuffer.append(" ry=\"" + getHeight() + "\"");
        uudfBuffer.append("/>\n");
        return uudfBuffer.toString();
    }
}

