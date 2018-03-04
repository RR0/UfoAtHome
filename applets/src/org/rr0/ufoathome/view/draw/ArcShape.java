package org.rr0.ufoathome.view.draw;

import java.awt.*;

/**
 * @author Jerome Beau
 * @version 0.3
 */
public class ArcShape extends DrawShape {
    private int centerX;
    private int centerY;
    private PolygonShape polygonVersion;
    private int startAngle;
    private int arcAngle;
    private int ellipseHeight;
    private int ellipseWidth;

    /**
     * The y coordinate of the upper-left corner of the arc to be filled.
     */
    private int ellipseY;

    public ArcShape(Component component) {
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
        int deltaY = y - getY();
        super.setY(y);
        setEllipseY(ellipseY + deltaY);
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
            int[] xPoints = new int[nPoints];
            int[] yPoints = new int[nPoints];
            for (double i = 0; i < PolygonShape.TWO_PI; i += step, point++) {
                xPoints[point] = xStart + (int) (Math.cos(i) * xRadius);
                yPoints[point] = yStart + (int) (Math.sin(i) * yRadius);
            }
            polygonVersion = new PolygonShape(component);
            polygonVersion.setPoints(xPoints, yPoints);
        }
    }

    public int getStartAngle() {
        return startAngle;
    }

    public void setStartAngle(int startAngle) {
        this.startAngle = startAngle;
    }

    public int getArcAngle() {
        return arcAngle;
    }

    public void setArcAngle(int arcAngle) {
        this.arcAngle = arcAngle;
    }

    public void paint(Graphics g, Color someColor, Rectangle bounds) {
        if (someColor != null) {
            g.setColor(someColor);
        }
        if (angle == 0 || angle == Math.PI) {
            g.fillArc(bounds.x, ellipseY, ellipseWidth, ellipseHeight, startAngle, arcAngle);
        } else if (angle == Math.PI / 2 || angle == 3 * (Math.PI / 2)) {
            g.fillArc(bounds.x, ellipseY, ellipseHeight, ellipseWidth, startAngle, arcAngle);
        } else {
            // Non remarquable angles are processed through polygon rotation
            polygonVersion.paint(g, someColor, bounds);
        }
    }

    public void scaleWidth(double widthRatio) {
        super.scaleWidth(widthRatio);
        int newWidth = (int) (ellipseWidth * widthRatio);
        setEllipseWidth(newWidth);
    }

    public void scaleHeight(double heightRatio) {
        super.scaleHeight(heightRatio);
        int newHeight = (int) (ellipseHeight * heightRatio);
        setEllipseHeight(newHeight);
    }

    public void setEllipseWidth(int i) {
        this.ellipseWidth = i;
    }

    public void setEllipseHeight(int i) {
        this.ellipseHeight = i;
    }

    public void setEllipseY(int ellipseY) {
        this.ellipseY = ellipseY;
    }

    public Object clone() throws CloneNotSupportedException {
        return super.clone();
    }

    public boolean contains(int x, int y) {
        boolean handled;
        if (polygonVersion != null) {
            handled = polygonVersion.contains(x, y);
        } else {
            handled = super.contains(x, y);
        }
        return handled;
    }

    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ArcShape)) return false;
        if (!super.equals(o)) return false;

        final ArcShape arcShape = (ArcShape) o;

        if (arcAngle != arcShape.arcAngle) return false;
        if (ellipseHeight != arcShape.ellipseHeight) return false;
        if (ellipseWidth != arcShape.ellipseWidth) return false;
        if (startAngle != arcShape.startAngle) return false;
        if (polygonVersion != null ? !polygonVersion.equals(arcShape.polygonVersion) : arcShape.polygonVersion != null) return false;

        return true;
    }

    public int hashCode() {
        int result = super.hashCode();
        result = 29 * result + (polygonVersion != null ? polygonVersion.hashCode() : 0);
        result = 29 * result + startAngle;
        result = 29 * result + arcAngle;
        result = 29 * result + ellipseHeight;
        result = 29 * result + ellipseWidth;
        return result;
    }
}

