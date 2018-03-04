package org.rr0.ufoathome.view.draw;

import java.awt.*;

/**
 * @author Jerôme Beau
 * @version 24 oct. 2003 19:34:37
 */
public class PolygonShape extends DrawShape {
    protected int[] xPoints;
    protected int[] yPoints;
    protected int nPoints;
    protected static final double TWO_PI = 2 * Math.PI;

    public PolygonShape(Component component) {
        super(component);
    }

    protected void compute() {

    }

    public void scaleWidth(double widthRatio) {
        if (xPoints != null) {
            if (getWidth() > 0 && widthRatio != 1.0) {
                int maxX = Integer.MIN_VALUE;
                for (int i = 0; i < xPoints.length; i++) {
                    xPoints[i] *= widthRatio;
                    if (xPoints[i] > maxX) {
                        maxX = xPoints[i];
                    }
                }
                setWidth(maxX);
            }
        } else {
            super.scaleWidth(widthRatio);
        }
    }

    public void scaleHeight(double heightFactor) {
        if (yPoints != null) {
            if (getHeight() > 0 && heightFactor != 1.0) {
                int maxY = Integer.MIN_VALUE;
                for (int i = 0; i < yPoints.length; i++) {
                    yPoints[i] *= heightFactor;
                    if (yPoints[i] > maxY) {
                        maxY = yPoints[i];
                    }
                }
                setHeight(maxY);
            }
        } else {
            super.scaleHeight(heightFactor);
        }
    }

    public void setAngle(double angle) {
        super.setAngle(angle);
        for (int i = 0; i < nPoints; i++) {
            xPoints[i] = (int) (xPoints[i] * Math.cos(angle));
            yPoints[i] = (int) (yPoints[i] * Math.sin(angle));
        }
    }

    public void setPoints(Polygon shape) {
        setPoints(shape.xpoints, shape.ypoints);
    }

    public void setPoints(int[] xPoints, int[] yPoints) {
        this.xPoints = xPoints;
        int maxX = 0;
        for (int i = 0; i < xPoints.length; i++) {
            int xPoint = xPoints[i];
            if (xPoint < bounds.x) {
                bounds.x = xPoint;
            }
            if (xPoint > maxX) {
                maxX = xPoint;
            }
        }
        bounds.width = maxX - bounds.x;
        this.yPoints = yPoints;
        int maxY = 0;
        for (int i = 0; i < yPoints.length; i++) {
            int yPoint = yPoints[i];
            if (yPoint < bounds.y) {
                bounds.y = yPoint;
            }
            if (yPoint > maxY) {
                maxY = yPoint;
            }
        }
        bounds.height = maxY - bounds.y;
        this.nPoints = xPoints.length;
    }

    public void paint(Graphics g, Rectangle bounds) {
        paint(g, getColor(), bounds);
    }

    public void paint(Graphics g, Color color, Rectangle bounds) {
        if (color != null) {
            g.setColor(color);
        }
        int[] translatedXPoints = new int[xPoints.length];
        for (int i = 0; i < xPoints.length; i++) {
            translatedXPoints[i] = xPoints[i] + bounds.x;
        }
        int[] translatedYPoints = new int[yPoints.length];
        for (int i = 0; i < yPoints.length; i++) {
            translatedYPoints[i] = yPoints[i] + bounds.y;
        }
        g.fillPolygon(translatedXPoints, translatedYPoints, nPoints);
        //        g.fillPolygon(xPoints, yPoints, nPoints);
    }

    public void setnPoints(int nPoints) {
        this.nPoints = nPoints;
        xPoints = new int[nPoints];
        yPoints = new int[nPoints];
        compute();
    }

    public Object clone() throws CloneNotSupportedException {
        PolygonShape clone = (PolygonShape) super.clone();
        if (xPoints != null) {
            clone.xPoints = new int[xPoints.length];
            System.arraycopy(xPoints, 0, clone.xPoints, 0, xPoints.length);
            clone.yPoints = new int[yPoints.length];
            System.arraycopy(yPoints, 0, clone.yPoints, 0, yPoints.length);
        }
        return clone;
    }
}
