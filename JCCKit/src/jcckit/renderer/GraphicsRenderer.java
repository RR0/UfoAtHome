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

import java.awt.Color;
import java.awt.Component;
import java.awt.Font;
import java.awt.FontMetrics;
import java.awt.Graphics;
import java.awt.Image;
import java.awt.image.ColorModel;
import java.awt.image.MemoryImageSource;
import java.awt.image.PixelGrabber;
import java.util.Stack;

/**
 * Renderer who draws the {@link jcckit.graphic.GraphicalElement
 * GraphicalElements} into a <tt>java.gui.Graphics</tt> context.
 * <p/>
 * The default color for lines and texts is determined by the
 * current color of the <tt>Graphics</tt> context when a new
 * instance of <tt>GraphicsRenderer</tt> is created.
 * <p/>
 * The default font is <tt>SansSerif-12</tt>.
 *
 * @author Franz-Josef Elmer
 */
public class GraphicsRenderer implements GraphicalCompositeRenderer,
        PolygonRenderer, OvalRenderer,
        TextRenderer, RectangleRenderer {
    private static final String DEFAULT_FONT_NAME = "SansSerif";
    private static final FontStyle DEFAULT_FONT_STYLE = FontStyle.NORMAL;
    private static final int DEFAULT_FONT_SIZE = 12;

    /**
     * Creates a font instance based on the specified text attributes and
     * font size.
     *
     * @param attributes Text attributes (font name and style).
     * @param size       Font size in pixel. If 0 {@link #DEFAULT_FONT_SIZE}
     *                   will be used.
     * @return new font instance.
     */
    static Font createFont(TextAttributes attributes, int size) {
        String fontName = attributes.getFontName();
        if (fontName == null) {
            fontName = DEFAULT_FONT_NAME;
        }

        FontStyle fontStyle = attributes.getFontStyle();
        if (fontStyle == null) {
            fontStyle = DEFAULT_FONT_STYLE;
        }
        int style = Font.PLAIN;
        if (fontStyle == FontStyle.BOLD) {
            style = Font.BOLD;
        } else if (fontStyle == FontStyle.ITALIC) {
            style = Font.ITALIC;
        } else if (fontStyle == FontStyle.BOLD_ITALIC) {
            style = Font.BOLD + Font.ITALIC;
        }

        if (size == 0) {
            size = DEFAULT_FONT_SIZE;
        }

        return new Font(fontName, style, size);
    }

    private final Stack _graphicsStack = new Stack();
    private Transformation _t;
    private Component _component;
    private Graphics _graphics;
    private Color _defaultColor;

    /**
     * Initializes this instance.
     *
     * @param graphics       Graphics context into which the
     *                       {@link BasicGraphicalElement BaiscGraphicalElements} are painted.
     * @param component      A component needed for creating off-screen images of
     *                       rotated texts.
     * @param transformation Transformation from the device-independent
     *                       coordinates into pixel-based Java coordinates.
     * @return this instance.
     */
    public GraphicsRenderer init(Graphics graphics, Component component,
                                 Transformation transformation) {
        _graphics = graphics;
        _component = component;
        _t = transformation;
        _defaultColor = graphics.getColor(); // the foreground color
        return this;
    }

    /**
     * Starts rendering of the specified composite. Does nothing except if
     * <tt>composite</tt> has a {@link ClippingShape}. In this case the
     * current <tt>Graphics</tt> context will be pushed onto a stack.
     * The new <tt>Graphics</tt> context is a clone of the current one
     * where the clipping rectangle is determined by the bounding box
     * of <tt>ClippingShape</tt>.
     */
    public void startRendering(GraphicalComposite composite) {
        ClippingShape shape = composite.getClippingShape();
        if (shape != null) {
            _graphicsStack.push(_graphics);
            _graphics = _graphics.create();
            ClippingRectangle rect = shape.getBoundingBox();
            int x = _t.transformX(rect.getMinX());
            int y = _t.transformY(rect.getMaxY());
            _graphics.setClip(x, y, _t.transformX(rect.getMaxX()) - x,
                    _t.transformY(rect.getMinY()) - y);
        }
    }

    /**
     * Finishes rendering of the specified composite. Does nothing except if
     * <tt>composite</tt> has a {@link ClippingShape}. In this case the
     * <tt>Graphics</tt> context will be poped from the stack and will replace
     * the current one.
     */
    public void finishRendering(GraphicalComposite composite) {
        if (composite.getClippingShape() != null) {
            _graphics = (Graphics) _graphicsStack.pop();
        }
    }

    /**
     * Paints the specified polygon into the current <tt>Graphics</tt> context.
     */
    public RenderedPolygon render(Polygon polygon) {
        GraphicsPolygon renderedPolygon;
        int numberOfPoints = polygon.getNumberOfPoints();
        if (numberOfPoints > 0) {
            Color currentColor = _graphics.getColor();
            renderedPolygon = (GraphicsPolygon) getRenderedPolygon(polygon);
            Color color = getFillColor(polygon);
            if (color != null) {
                _graphics.setColor(color);
                _graphics.fillPolygon(renderedPolygon);
            }
            color = getLineColor(polygon);
            if (color != null) {
                _graphics.setColor(color);
                if (polygon.isClosed()) {
                    _graphics.drawPolygon(renderedPolygon);
                } else {
                    _graphics.drawPolyline(renderedPolygon.getXPoints(), renderedPolygon.getYPoints(), numberOfPoints);
                }
            }
            _graphics.setColor(currentColor);
        } else {
            renderedPolygon = null;
        }
        return renderedPolygon;
    }

    private RenderedPolygon getRenderedPolygon(Polygon polygon) {
        int numberOfPoints = polygon.getNumberOfPoints();
        int[] xPoints = new int[numberOfPoints];
        int[] yPoints = new int[numberOfPoints];
        for (int i = 0; i < numberOfPoints; i++) {
            GraphPoint point = polygon.getPoint(i);
            xPoints[i] = _t.transformX(point.getX());
            yPoints[i] = _t.transformY(point.getY());
        }
        RenderedPolygon renderedPolygon = new GraphicsPolygon(xPoints, yPoints, numberOfPoints);
        return renderedPolygon;
    }

    public boolean contains(RenderedPolygon polygon, int x, int y) {
        return ((GraphicsPolygon) polygon).contains(x, y);
    }

    /**
     * Paints the specified rectangle into the current <tt>Graphics</tt> context.
     */
    public void render(Rectangle rectangle) {
        Color currentColor = _graphics.getColor();
        GraphPoint center = rectangle.getCenter();
        double width = rectangle.getWidth();
        double height = rectangle.getHeight();
        int x = _t.transformX(center.getX() - 0.5 * width);
        int y = _t.transformY(center.getY() + 0.5 * height);
        int w = _t.transformX(center.getX() + 0.5 * width) - x;
        int h = _t.transformY(center.getY() - 0.5 * height) - y;

        Color color = getFillColor(rectangle);
        if (color != null) {
            _graphics.setColor(color);
            _graphics.fillRect(x, y, w, h);
        }
        color = getLineColor(rectangle);
        if (color != null) {
            _graphics.setColor(color);
            _graphics.drawRect(x, y, w, h);
        }
        _graphics.setColor(currentColor);
    }

    /**
     * Paints the specified oval into the current <tt>Graphics</tt> context.
     */
    public void render(Oval oval) {
        Color currentColor = _graphics.getColor();
        GraphPoint center = oval.getCenter();
        double width = oval.getWidth();
        double height = oval.getHeight();
        int x = _t.transformX(center.getX() - 0.5 * width);
        int y = _t.transformY(center.getY() + 0.5 * height);
        int w = _t.transformX(center.getX() + 0.5 * width) - x;
        int h = _t.transformY(center.getY() - 0.5 * height) - y;

        Color color = getFillColor(oval);
        if (color != null) {
            _graphics.setColor(color);
            _graphics.fillOval(x, y, w, h);
        }
        color = getLineColor(oval);
        if (color != null) {
            _graphics.setColor(color);
            _graphics.drawOval(x, y, w, h);
        }
        _graphics.setColor(currentColor);
    }

    private Color getFillColor(BasicGraphicalElement element) {
        Color result = null;
        GraphicAttributes ga = element.getGraphicAttributes();
        if (element.isClosed() && ga instanceof FillAttributes) {
            result = ((FillAttributes) ga).getFillColor();
        }
        return result;
    }

    private Color getLineColor(BasicGraphicalElement element) {
        Color result = _defaultColor;
        GraphicAttributes ga = element.getGraphicAttributes();
        if (ga instanceof LineAttributes) {
            LineAttributes la = (LineAttributes) ga;
            if (la.getLineColor() != null || getFillColor(element) != null) {
                result = la.getLineColor();
            }
        }
        return result;
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
            final int orientation
                    = ((int) (ta.getOrientationAngle() / 90 + 4.5)) % 4;
            Color fontColor = ta.getTextColor();
            if (fontColor == null) {
                fontColor = _defaultColor;
            }
            _graphics.setColor(fontColor);
            final Font font = createFont(ta, _t.transformHeight(ta.getFontSize()));
            _graphics.setFont(font);
            final String str = text.getText();
            final FontMetrics metrics = _graphics.getFontMetrics();
            final int ascent = metrics.getAscent();
            final int descent = metrics.getDescent();
            final int height = ascent + descent;
            final int width = metrics.stringWidth(str);
            final int xAnchor = ta.getHorizontalAnchor().getFactor();
            final int yAnchor = ta.getVerticalAnchor().getFactor();
            final int x = _t.transformX(text.getPosition().getX());
            final int y = _t.transformY(text.getPosition().getY());
            if (orientation == 0) {
                _graphics.drawString(str, x - (width * xAnchor) / 2,
                        y + (yAnchor * height) / 2 - descent);
            } else {
                Image textImage = makeImage(str, font, fontColor, orientation - 2,
                        ascent, width, height);
                int xf = orientation == 2 ? xAnchor : yAnchor;
                if (orientation != 3) {
                    xf = 2 - xf;
                }
                int yf = orientation == 2 ? yAnchor : xAnchor;
                if (orientation == 1) {
                    yf = 2 - yf;
                }
                _graphics.drawImage(textImage, x - (xf * textImage.getWidth(null)) / 2,
                        y - (yf * textImage.getHeight(null)) / 2, null);
                textImage.flush();
            }
            _graphics.setColor(currentColor);
        }
    }

    private Image makeImage(String text, Font font, Color color, int orientation,
                            int ascent, int width, int height) {
        int w = orientation == 0 ? width : height;
        int h = orientation == 0 ? height : width;

        // Draw text in mormal oriention into the buffer
        Image img = _component.createImage(width, height);
        Graphics g = img.getGraphics();
        g.setColor(_component.getForeground());
        g.setFont(font);
        g.drawString(text, 0, ascent);

        // Grab pixels from the buffer
        int[] origPixels = new int[width * height];
        try {
            new PixelGrabber(img, 0, 0, width, height,
                    origPixels, 0, width).grabPixels();
        } catch (InterruptedException e) {
        }
        int background = origPixels[0];

        // Calculate rotation parameters
        int o2 = orientation * orientation - 1;
        int index = w * h * ((1 - orientation - o2) / 2) + w * orientation
                + (o2 - orientation - 1) / 2;
        int dx = o2 + w * orientation;
        int dy = o2 - (w * (h - 1) + 1) * orientation;

        // rotated pixels
        int[] pixels = new int[origPixels.length];
        int fc = 0xff000000 | color.getRGB();
        int lastCol = width - 1;
        for (int i = 0; i < origPixels.length; i++) {
            pixels[index] = (origPixels[i] == background) ? 0 : fc;
            index += (i % width) == lastCol ? dy : dx;
        }

        // create rotated image
        return _component.createImage(new MemoryImageSource(w, h, ColorModel.getRGBdefault(),
                pixels, 0, w));
    }
}
