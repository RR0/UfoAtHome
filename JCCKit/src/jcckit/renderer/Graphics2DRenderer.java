/*
 * Copyright 2003-2004, Franz-Josef Elmer, All rights reserved
 *
 * This library is free software; you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation; either version 2.1 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Lesser General Public License for more details
 * (http://www.gnu.org/copyleft/lesser.html).
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this library; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
 */
package jcckit.renderer;

import jcckit.graphic.*;
import jcckit.graphic.Polygon;
import jcckit.graphic.Rectangle;

import java.awt.*;
import java.awt.font.TextLayout;
import java.awt.geom.AffineTransform;
import java.awt.geom.Ellipse2D;
import java.awt.geom.GeneralPath;
import java.awt.geom.Rectangle2D;

/**
 * Renderer who draws the {@link jcckit.graphic.GraphicalElement
 * GraphicalElements} into a <tt>java.gui.Graphics2D</tt> context.
 * <p/>
 * The default color for lines and texts is determined by the
 * current color of the <tt>Graphics2D</tt> context when a new
 * instance of <tt>Graphics2DRenderer</tt> is created.
 * <p/>
 * The default font is <tt>SansSerif-12</tt>.
 *
 * @author Franz-Josef Elmer
 */
public class Graphics2DRenderer implements GraphicalCompositeRenderer,
        PolygonRenderer, OvalRenderer,
        TextRenderer, RectangleRenderer {
    private static final int FS = 1;
    private static final String DEFAULT_FONT_NAME = "SansSerif";
    private static final FontStyle DEFAULT_FONT_STYLE = FontStyle.NORMAL;
    private static final int DEFAULT_FONT_SIZE = 12;

    private Color _defaultColor;
    private Graphics2D _graphics;

    /**
     * Initializes this instance. During renderering the current transformation
     * will be leaved unchanged. But the current Clip may be cleared.
     *
     * @param graphics Graphics2D context into which the
     *                 {@link BasicGraphicalElement BaiscGraphicalElements} are painted.
     * @return this instance.
     */
    public Graphics2DRenderer init(Graphics2D graphics) {
        _graphics = graphics;
        _defaultColor = graphics.getColor(); // the foreground color
        return this;
    }

    /**
     * Starts rendering of the specified composite. Does nothing except if
     * <tt>composite</tt> has a {@link ClippingShape}. In this case the
     * Clip of the <tt>Graphics2D</tt> context becomes the clipping
     * rectangle determined by the bounding box of the <tt>ClippingShape</tt>.
     */
    public void startRendering(GraphicalComposite composite) {
        ClippingShape shape = composite.getClippingShape();
        if (shape != null) {
            ClippingRectangle rect = shape.getBoundingBox();
            _graphics.clip(new Rectangle2D.Double(rect.getMinX(), rect.getMinY(),
                    rect.getMaxX() - rect.getMinX(), rect.getMaxY() - rect.getMinY()));
        }
    }

    /**
     * Finishes rendering of the specified composite. Does nothing except if
     * <tt>composite</tt> has a {@link ClippingShape}. In this case the
     * Clip of the <tt>Graphics2D</tt> context will be cleared.
     */
    public void finishRendering(GraphicalComposite composite) {
        _graphics.setClip(null);
    }

    /**
     * Paints the specified polygon into the <tt>Graphics2D</tt> context.
     */
    public RenderedPolygon render(Polygon polygon) {
        int numberOfPoints = polygon.getNumberOfPoints();
        if (numberOfPoints > 0) {
            Color currentColor = _graphics.getColor();
            GeneralPath p
                    = new GeneralPath(GeneralPath.WIND_EVEN_ODD, numberOfPoints);
            p.moveTo((float) polygon.getPoint(0).getX(),
                    (float) polygon.getPoint(0).getY());
            for (int i = 1; i < numberOfPoints; i++) {
                p.lineTo((float) polygon.getPoint(i).getX(),
                        (float) polygon.getPoint(i).getY());
            }
            if (polygon.isClosed()) {
                p.closePath();
            }
            drawShape(p, polygon, currentColor);
        }
        return null;
    }

    /**
     * Paints the specified rectangle into the current <tt>Graphics</tt> context.
     */
    public void render(Rectangle rectangle) {
        Color currentColor = _graphics.getColor();
        GraphPoint center = rectangle.getCenter();
        double width = rectangle.getWidth();
        double height = rectangle.getHeight();
        Rectangle2D rect = new Rectangle2D.Double(center.getX() - 0.5 * width,
                center.getY() - 0.5 * height,
                width, height);
        drawShape(rect, rectangle, currentColor);
    }

    /**
     * Paints the specified oval into the current <tt>Graphics</tt> context.
     */
    public void render(Oval oval) {
        Color currentColor = _graphics.getColor();
        GraphPoint center = oval.getCenter();
        double width = oval.getWidth();
        double height = oval.getHeight();
        Ellipse2D ellipse = new Ellipse2D.Double(center.getX() - 0.5 * width,
                center.getY() - 0.5 * height,
                width, height);
        drawShape(ellipse, oval, currentColor);
    }

    private void drawShape(Shape shape, BasicGraphicalElement element,
                           Color backupColor) {
        GraphicAttributes attributes = element.getGraphicAttributes();
        Color fillColor = null;
        if (element.isClosed() && attributes instanceof FillAttributes) {
            fillColor = ((FillAttributes) attributes).getFillColor();
        }
        if (fillColor != null) {
            _graphics.setColor(fillColor);
            _graphics.fill(shape);
        }
        Color lineColor = _defaultColor;
        if (attributes instanceof LineAttributes) {
            LineAttributes la = (LineAttributes) attributes;
            BasicStroke stroke = new BasicStroke((float) la.getLineThickness());
            double[] linePattern = la.getLinePattern();
            if (linePattern != null) {
                float[] dash = new float[linePattern.length];
                for (int i = 0; i < dash.length; i++) {
                    dash[i] = (float) la.getLinePattern()[i];
                }
                stroke = new BasicStroke(stroke.getLineWidth(), BasicStroke.CAP_BUTT,
                        BasicStroke.JOIN_MITER, 10f, dash, 0f);
            }
            _graphics.setStroke(stroke);
            if (la.getLineColor() != null || fillColor != null) {
                lineColor = la.getLineColor();
            }
        }
        if (lineColor != null) {
            _graphics.setColor(lineColor);
            _graphics.draw(shape);
        }
        _graphics.setColor(backupColor);
    }

    /**
     * Paints the specified text into the current <tt>Graphics</tt> context.
     * <p/>
     * If the font size is zero the default font size will be used.
     * <p/>
     * If the orientation angle is unequal zero the text will first be painted
     * into an off-screen image and rotated. Finally, it will be drawn into the
     * current <tt>Graphics</tt> context. Note, that only integer multiples of
     * 90 degree rotation are performed. Other orientation angles will be
     * adjusted to the nearest integer multiple of 90 degree.
     */
    public void render(Text text) {
        final GraphicAttributes ga = text.getGraphicAttributes();
        if (ga instanceof TextAttributes) {
            final TextAttributes ta = (TextAttributes) ga;
            final Color currentColor = _graphics.getColor();
            Color fontColor = ta.getTextColor();
            if (fontColor == null) {
                fontColor = _defaultColor;
            }
            _graphics.setColor(fontColor);

            final double scale = _graphics.getTransform().getScaleX();
            final String str = text.getText();
            final TextLayout layout
                    = new TextLayout(str.length() == 0 ? " " : str, // error if str==""
                            GraphicsRenderer.createFont(ta, 0),
                            _graphics.getFontRenderContext());
            double fs = ta.getFontSize();
            fs = fs == 0 ? 1 / scale : fs / DEFAULT_FONT_SIZE;
            final Shape ts
                    = layout.getOutline(new AffineTransform(fs, 0, 0, -fs, 0, 0));
            final double x = -0.5 * ta.getHorizontalAnchor().getFactor()
                    * ts.getBounds2D().getWidth();
            final double y = -0.5 * ta.getVerticalAnchor().getFactor()
                    * ts.getBounds2D().getHeight();
            final AffineTransform transformation
                    = AffineTransform.getTranslateInstance(text.getPosition().getX(),
                            text.getPosition().getY());
            transformation.rotate(ta.getOrientationAngle() * Math.PI / 180);
            transformation.translate(x, y);
            _graphics.fill(transformation.createTransformedShape(ts));
            _graphics.setColor(currentColor);
        }
    }
}
