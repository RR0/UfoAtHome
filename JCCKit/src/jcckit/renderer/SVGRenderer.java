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
import jcckit.util.Format;

import java.awt.Color;
import java.util.Hashtable;

/**
 * Renderer creating Scalable Vector Graphics (SVG) from
 * {@link jcckit.graphic.GraphicalElement GraphicalElements}.
 * SVG is an XML-based standard for vector graphics as recommended by
 * <a href="http://www.w3.org/Graphics/SVG/Overview.htm8">W3C</a>.
 * <p>
 * There is no coordinate transformation of {@link jcckit.graphic.GraphPoint
 * GraphPoints} except that the sign of the y-coordinate is flipped
 * because in SVG the y-axis points downwards.
 * <p>
 * The renderer writes the XML elements into a <tt>StringBuffer</tt>.
 * An appropriated header and root element has to be written elsewhere
 * (e.g. by the class {@link jcckit.SVGPlotter}).
 * <p>
 * Shapes will be outlined in black if neither a fill color nor a line color 
 * is defined. A zero line thickness is translated into
 * a stroke width of 10<super>-6</super>.
 * <p>
 * The Java standard font names <tt>Serif</tt>, <tt>SansSerif</tt>, and
 * <tt>Monospaced</tt> are mapped onto the SVG font families <tt>serif</tt>, 
 * <tt>sans-serif</tt>, and <tt>monospace</tt>, respectively. 
 * The default font family is <tt>sans-serif</tt>.
 * The default font color is black and the default font size is 1% of the
 * paper size (as specified in the constructor).
 *
 * @author Franz-Josef Elmer
 */
public class SVGRenderer implements GraphicalCompositeRenderer,
                                         PolygonRenderer, OvalRenderer,
                                         TextRenderer, RectangleRenderer {
  private static final Format POLYGON_FORMAT = new Format("%9.7g,%9.7g");
  private static final Format RECT_FORMAT 
      = new Format("<rect x='%9.7g' y='%9.7g' width='%9.7g' height='%9.7g'");
  private static final Format OVAL_FORMAT 
      = new Format("<ellipse cx='%9.7g' cy='%9.7g' rx='%9.7g' ry='%9.7g'");
  private static final Format TEXT_FORMAT 
      = new Format("<text x='%9.7g' y='%9.7g'");
  private static final Format ORIENTATION_FORMAT 
      = new Format(" transform='rotate(%9.7g,%9.7g,%9.7g)'");
  private static final Format FONT_FORMAT 
      = new Format(" font-size='%9.7g' text-anchor='");
  private static final Format COLOR_FORMAT = new Format("='#%06x'");
  private static final Format STROKE_WIDTH_FORMAT 
      = new Format(" stroke-width='%9.7g'");
  private static final String DEFAULT_FONT_NAME = "SansSerif";
  private static final Color DEFAULT_COLOR = Color.black;
  private static final double DEFAULT_FONT_SIZE = 0.01;
  private static final int BASELINE_SHIFT_OFFSET = 41;
  private static final int BASELINE_SHIFT_FACTOR = 64;
  private static final Hashtable FONT_MAP = new Hashtable();

  private StringBuffer _document;
  private double _defaultFontSize;
  private int _level;
  private int _id;

  static {
    FONT_MAP.put("SansSerif", "sans-serif");
    FONT_MAP.put("Serif", "serif");
    FONT_MAP.put("Monospaced", "monospace");
  }

  /**
   * Initializes this instance.
   * @param buffer The buffer into which the XML elements are written.
   * @param initialIndentLevel Initial level of indentation. Nested XML
   *        elements are indented.
   * @param paperSize The size of the paper. It is needed to determine
   *        the default font size.
   * @return this instance.
   */
  public SVGRenderer init(StringBuffer buffer, int initialIndentLevel,
                          double paperSize) {
    _document = buffer;
    _level = initialIndentLevel;
    _defaultFontSize = paperSize * DEFAULT_FONT_SIZE;
    return this;
  }

  /**
   *  Adds spaces in accordance with the current identation level and
   *  adds the specified text.
   */
  private void indentAndAdd(String text) {
    for (int i = 2 * _level; i > 0; i--) {
      _document.append(' ');
    }
    _document.append(text);
  }

  /**
   * Starts renderering of the specified composite. The <tt>g</tt>
   * element of SVG is used for this purpose. 
   * <p>
   * If <tt>composite</tt> has
   * a {@link jcckit.graphic.ClippingShape} a <tt>clip-path</tt> attribute
   * is added with an URL which points onto a <tt>clipPath</tt> element.
   * The id of this element is of the form <tt>path<i>number</i></tt>
   * where <tt><i>number</i></tt> is an index counting all clip paths 
   * starting at zero. The clip path is defined by a <tt>rect</tt> element 
   * determined by the bounding box of the clipping shape.
   */
  public void startRendering(GraphicalComposite composite) {
    indentAndAdd("<g");
    ClippingShape shape = composite.getClippingShape();
    if (shape == null) {
      _document.append(">\n");
    } else {
      _document.append(" clip-path='url(#path").append(_id).append(")'>\n");
    }
    _level++;
    if (shape != null) {
      indentAndAdd("<clipPath id='path");
      _document.append(_id++).append("'>\n");
     _level++;
      shape.getBoundingBox().getGraphicalElement().renderWith(this);
      _level--;
      indentAndAdd("</clipPath>\n");
    }
  }

  /**
   *  Ends renderering of the specified composite.
   *  Closes the <tt>g</tt> element.
   */
  public void finishRendering(GraphicalComposite composite) {
    _level--;
    indentAndAdd("</g>\n");
  }

  /**
   * Renders a polygon. Depending on whether <tt>polygon</tt> is closed or 
   * not an SVG <tt>polygon</tt> or <tt>polyline</tt> element will be created.
   */
  public RenderedPolygon render(Polygon polygon) {
    indentAndAdd(polygon.isClosed() ? "<polygon" : "<polyline");
    int n = polygon.getNumberOfPoints();
    if (n > 0) {
      _document.append(" points='");
      for (int i = 0; i < n; i++) {
        _document.append(POLYGON_FORMAT.form(
                          new double[] {polygon.getPoint(i).getX(),
                                        -polygon.getPoint(i).getY()}))
                 .append(i < n - 1 ? ' ' : '\'');
      }
    }
    addShapeAttributes(polygon);
      return null;
  }

  /** Renders a rectangle. An SVG <tt>rect</tt> element is created. */
  public void render(Rectangle rectangle) {
    double width = rectangle.getWidth();
    double height = rectangle.getHeight();
    indentAndAdd(RECT_FORMAT.form(new double[] {
          rectangle.getCenter().getX() - width / 2,
          -rectangle.getCenter().getY() - height / 2, width, height}));
    addShapeAttributes(rectangle);
  }

  /** Renders an oval. An SVG <tt>ellipse</tt> element is created. */
  public void render(Oval oval) {
    indentAndAdd(OVAL_FORMAT.form(new double[] {oval.getCenter().getX(),
        -oval.getCenter().getY(), oval.getWidth() / 2, oval.getHeight() / 2}));
    addShapeAttributes(oval);
  }

  /** Renders text. An SVG <tt>text</tt> element is created. */
  public void render(Text text) {
    double x = text.getPosition().getX();
    double y = -text.getPosition().getY();
    indentAndAdd(TEXT_FORMAT.form(new double[] {x, y}));
    TextAttributes ta = (TextAttributes) text.getGraphicAttributes();
    addTextAttributes(ta);
    if (ta != null && ta.getOrientationAngle() != 0) {
      _document.append(ORIENTATION_FORMAT.form(
                          new double[] {-ta.getOrientationAngle(), x, y}));
    }
    _document.append('>');
    String str = text.getText();
    for (int i = 0, n = str.length(); i < n; i++) {
      char c = str.charAt(i);
      switch (c) {
      case '&': _document.append("&amp;"); break;
      case '<': _document.append("&lt;"); break;
      case '>': _document.append("&gt;"); break;
      case '"': _document.append("&quot;"); break;
      default: _document.append(c);
      }
    }
    _document.append("</text>\n");
  }

  private void addShapeAttributes(BasicGraphicalElement element) {
    GraphicAttributes ga = element.getGraphicAttributes();
    Color fillColor = null;
    if (ga instanceof FillAttributes) {
      fillColor = ((FillAttributes) ga).getFillColor();
      addColor(" fill", fillColor);
    }
    if (ga instanceof LineAttributes) {
      addLineAttributes((LineAttributes) ga,
                        fillColor == null ? DEFAULT_COLOR : null);
    }
    _document.append("/>\n");
  }

  private void addLineAttributes(LineAttributes attributes,
                                 Color defaultColor) {
    Color color = attributes.getLineColor();
    if (color == null) {
      color = defaultColor;
    }
    if (color != null) {
      addColor(" stroke", color);
      _document.append(STROKE_WIDTH_FORMAT.form(
                          Math.max(1e-6, attributes.getLineThickness())));
      double[] linePattern = attributes.getLinePattern();
      if (linePattern != null && linePattern.length > 0) {
        _document.append(" stroke-dasharray='");
        for (int i = 0; i < linePattern.length; i++) {
          _document.append(linePattern[i])
                   .append(i < linePattern.length - 1 ? ',' : '\'');
        }
      }
    }
  }

  private void addTextAttributes(TextAttributes ta) {
    if (ta != null) {
      addColor(" fill", ta.getTextColor() == null ? DEFAULT_COLOR
                                                  : ta.getTextColor());
      String fontName = ta.getFontName();
      if (fontName == null) {
        fontName = DEFAULT_FONT_NAME;
      }
      String fontFamily = (String) FONT_MAP.get(fontName);
      if (fontFamily == null) {
        fontFamily = fontName;
      }
      FontStyle fontStyle = ta.getFontStyle();
      if (fontStyle == FontStyle.BOLD || fontStyle == FontStyle.BOLD_ITALIC) {
        _document.append(" font-weight='bold'");
      }
      if (fontStyle == FontStyle.ITALIC
          || fontStyle == FontStyle.BOLD_ITALIC) {
        _document.append(" font-style='italic'");
      }
      _document.append(FONT_FORMAT.form(
                        ta.getFontSize() == 0 ? _defaultFontSize
                                              : ta.getFontSize()))
               .append(ta.getHorizontalAnchor() == Anchor.CENTER ? "middle'"
                       : (ta.getHorizontalAnchor() == Anchor.RIGHT_TOP ?
                          "end'" : "start'"))
               .append(" font-family='").append(fontFamily)
               .append("' baseline-shift='")
               .append(BASELINE_SHIFT_OFFSET 
                       - (ta.getVerticalAnchor() == null ? 
                           1 : ta.getVerticalAnchor().getFactor())
                         * BASELINE_SHIFT_FACTOR)
               .append("%'");
    }
  }

  private void addColor(String name, Color color) {
    _document.append(name);
    if (color == null) {
      _document.append("='none'");
    } else {
      _document.append(COLOR_FORMAT.form(color.getRGB() & 0xffffff));
    }
  }
}
