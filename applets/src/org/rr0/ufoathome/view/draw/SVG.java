package org.rr0.ufoathome.view.draw;

import java.awt.*;
import java.util.Enumeration;

/**
 * Helper class to build Scalable Vector Graphics (SVG) ) character Strings from shape objects.
 * See the <a href="http://www.w3.org/TR/SVG">Scalable Vector Graphics (SVG) 1.1 Specification</a>.
 *
 * @author Jerôme Beau
 * @version 0.3
 */
public class SVG {
    private static final String VERSION = "1.1";

    public static String color(Color color) {
        StringBuffer uudfBuffer = new StringBuffer();
        float[] hsb = new float[3];
        Color.RGBtoHSB(color.getRed(), color.getGreen(), color.getBlue(), hsb);
        uudfBuffer.append("hsb(");
        uudfBuffer.append(hsb[0]).append(',');
        uudfBuffer.append(hsb[1]).append(',');
        uudfBuffer.append(hsb[2]);
        uudfBuffer.append(')');
        return uudfBuffer.toString();
    }

    public static String bounds(Rectangle bounds) {
        StringBuffer uudfBuffer = new StringBuffer();
        uudfBuffer.append("<bounds");
        uudfBuffer.append(" x=\"").append(bounds.x).append("\"");
        uudfBuffer.append(" y=\"").append(bounds.y).append("\"");
        uudfBuffer.append(" width=\"").append(bounds.width).append("\"");
        uudfBuffer.append(" height=\"").append(bounds.height).append("\"");
        uudfBuffer.append("/>");
        return uudfBuffer.toString();
    }

    public static void appendAngle(StringBuffer uudfBuffer, double angle) {
        uudfBuffer.append("<angle value=\"").append(angle).append("\"/>");
    }

    public static void appendTitle(StringBuffer uudfBuffer, String titleValue) {
        TagHelper.appendElement(uudfBuffer, "title", titleValue);
    }

    public static void appendViewBox(StringBuffer uudfBuffer, Rectangle bounds) {
        uudfBuffer.append("viewBox=\"").append(bounds.x).append(' ').append(bounds.y).append(' ').append(bounds.width).append(' ').append(bounds.height).append("\"");
    }

    public static void appendVersion(StringBuffer uudfBuffer) {
        uudfBuffer.append("xmlns=\"http://www.w3.org/2000/svg\"").append(' ').append("version=\"").append(VERSION).append("\">");
    }

    public static void appendFill(StringBuffer uudfBuffer, Color color) {
        uudfBuffer.append("fill=\"").append(color(color)).append("\"");
    }

    public static String toString(Object object) {
        StringBuffer uudfBuffer = new StringBuffer();
        uudfBuffer.append("<svg ");
        if (object instanceof DrawShape) {
            DrawShape shape = (DrawShape) object;
            //        uudfBuffer.append("width="12cm" height="5.25cm")");
            SVG.appendViewBox(uudfBuffer, shape.bounds);
            uudfBuffer.append(' ');
            SVG.appendVersion(uudfBuffer);
            if (shape.title != null) {
                SVG.appendTitle(uudfBuffer, shape.title);
            }
            if (object instanceof PathShape) {
                appendPath(uudfBuffer, (PathShape) object);
            }
        }
        uudfBuffer.append("</svg>");
        return uudfBuffer.toString();
    }

    public static void appendDraw(StringBuffer uudfBuffer, DrawShape shape) {
        if (shape.color != null) {
            uudfBuffer.append(' ');
            appendFill(uudfBuffer, shape.color);
        }
        if (shape.angle != 0) {
            uudfBuffer.append(" transform=\"");
            if (shape.angle != 0) {
                uudfBuffer.append(" rotate(");
                appendAngle(uudfBuffer, shape.angle);
                uudfBuffer.append(")");
            }
            uudfBuffer.append("\"");
        }
    }

    public static void appendPath(StringBuffer uudfBuffer, PathShape shape) {
        Enumeration instructionsEnumeration = shape.data.elements();
        while (instructionsEnumeration.hasMoreElements()) {
            Object instruction = (Object) instructionsEnumeration.nextElement();
            if (instruction instanceof PolygonShape) {
                PolygonShape polygonShape = ((PolygonShape) instruction);
                uudfBuffer.append("<path");
                if (polygonShape.getColor() != null) {
                    uudfBuffer.append(' ');
                    appendFill(uudfBuffer, polygonShape.getColor());
                }
                uudfBuffer.append(" d=\"");
                appendPathData(uudfBuffer, polygonShape);
                uudfBuffer.append("\"/>");
            }
        }
    }

    public static void appendArc(StringBuffer uudfBuffer, ArcShape shape) {
        uudfBuffer.append("a");
        appendDraw(uudfBuffer, shape);
        uudfBuffer.append(" rx=\"" + shape.getWidth() + "\"");
        uudfBuffer.append(" ry=\"" + shape.getHeight() + "\"");
        uudfBuffer.append("/>\n");
    }

    public static void appendPolygon(StringBuffer uudfBuffer, PolygonShape polygon) {
        uudfBuffer.append("<polygon");
        appendDraw(uudfBuffer, polygon);
        uudfBuffer.append(" points=\"");
        String separator = "";
        for (int i = 0; i < polygon.xPoints.length; i++) {
            int xPoint = polygon.xPoints[i];
            int yPoint = polygon.yPoints[i];
            uudfBuffer.append(separator).append(xPoint).append(',').append(yPoint);
            separator = " ";
        }
        uudfBuffer.append("\"/>");
    }

    public static void appendPathData(StringBuffer uudfBuffer, PolygonShape polygon) {
        uudfBuffer.append("M ").append(polygon.xPoints[0]).append(' ').append(polygon.yPoints[0]);
        for (int i = 1; i < polygon.xPoints.length; i++) {
            int xPoint = polygon.xPoints[i];
            int yPoint = polygon.yPoints[i];
            uudfBuffer.append(" L ").append(xPoint).append(' ').append(yPoint);
        }
        uudfBuffer.append(" z");
    }

    public static void appendRectangle(StringBuffer uudfBuffer, RectangleShape rectangle) {
        uudfBuffer.append("<rect");
        appendDraw(uudfBuffer, rectangle);
        uudfBuffer.append(" x=\"").append(rectangle.bounds.x).append("\"")
                .append(" y=\"").append(rectangle.bounds.y).append("\"")
                .append(" width=\"").append(rectangle.bounds.width).append("\"")
                .append(" height=\"").append(rectangle.bounds.height).append("\"/>\n");
    }
}
