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
package jcckit;

import jcckit.graphic.GraphPoint;
import jcckit.graphic.Renderer;
import jcckit.renderer.Graphics2DRenderer;
import jcckit.util.ConfigParameters;
import jcckit.util.Factory;

import java.awt.*;
import java.awt.geom.AffineTransform;
import java.awt.geom.NoninvertibleTransformException;

/**
 * A subclass of {@link GraphicsPlotCanvas} for 
 * the {@link jcckit.renderer.Graphics2DRenderer}.
 * 
 * @author Franz-Josef Elmer
 */
public class Graphics2DPlotCanvas extends  GraphicsPlotCanvas2 {
  /** Key of a configuration parameter. */
  public static final String ANTI_ALIASINGD_KEY = "antiAliasing";
    
  private static final AffineTransform IDENTITY = new AffineTransform();
  
  /**
   * Painter which draw the plot into a <tt>Graphics2D</tt> instance.
   * 
   * @author Franz-Josef Elmer
   */
  protected class Graphics2DPainter extends GraphicsPainter {
    public Graphics2DPainter(Component component) {
      super(component);
    }

    /** 
     * Sets identity transformation for the specified <tt>Graphics2D</tt>
     * context.
     */
    protected void prepare(Graphics g) {
      ((Graphics2D) g).setTransform(IDENTITY);
    }

    /** 
     * Creates an instance of {@link Graphics2DRenderer} for the
     * specified <tt>Graphics2D</tt> context. 
     */ 
    protected Renderer createRenderer(Graphics g) {
      ((Graphics2D) g).setRenderingHint(RenderingHints.KEY_ANTIALIASING, 
             _antiAliasing ? RenderingHints.VALUE_ANTIALIAS_ON
                           : RenderingHints.VALUE_ANTIALIAS_OFF);
      ((Graphics2D) g).setTransform(_transformation);
      return ((Graphics2DRenderer) Factory.create(_renderer))
                                                    .init((Graphics2D) g);
    }
    
    protected void calculateTransformation(Dimension size) { 
      double pWidth = getPaper().getMaxX() - getPaper().getMinX();
      double pHeight = getPaper().getMaxY() - getPaper().getMinY();
      double scale = Math.min(size.width / pWidth, size.height / pHeight);
      double x0 = 0.5 * getHorizontalAnchor().getFactor() 
          * (size.width - scale * pWidth) + scale * getPaper().getMinX();
      double y0 = 0.5 * getVerticalAnchor().getFactor() * (scale * pHeight 
                                                           - size.height) 
                  + size.height + scale * getPaper().getMinY();
      _transformation = new AffineTransform(scale, 0, 0, -scale, x0, y0);
    }
  }

  protected class Graphics2DCanvas extends GraphicsCanvas {
    public Graphics2DCanvas() {
      super();
      _painter = new Graphics2DPainter(this);
    }
  }

  protected class Graphics2DJPanel extends GraphicsJPanel {
    public Graphics2DJPanel() {
      super();
      _painter = new Graphics2DPainter(this);
    }
  }

  protected String _renderer = "jcckit.renderer.Graphics2DRenderer"; 
  private AffineTransform _transformation;
  private final boolean _antiAliasing; 
  
  /**
   * Creates an instance from the specified configuration parameters.
   * <table border=1 cellpadding=5>
   * <tr><th>Key &amp; Default Value</th><th>Type</th><th>Mandatory</th>
   *     <th>Description</th></tr>
   * <tr><td><tt>antiAliasing = true</tt></td>
   *     <td><tt>boolean</tt></td><td>no</td>
   *     <td>If <tt>true</tt> everything will be rendererd 
   *         anti-aliasing.</td></tr>
   * </table>
   * In addition the configuration parameters of the
   * <a href=
   * "GraphicsPlotCanvas.html#GraphicsPlotCanvas(jcckit.util.ConfigParameters)"
   * >s constructor</a> of the superclass {@link GraphicsPlotCanvas} apply.
   */
  public Graphics2DPlotCanvas(ConfigParameters config) {
    super(config);
    _antiAliasing = config.getBoolean(ANTI_ALIASINGD_KEY, true);
    setRenderer("jcckit.renderer.Graphics2DRenderer");
  }

  /** 
   * Creates an instance of {@link Graphics2DCanvas}
   * which wraps the rendered plot. 
   */
  protected void createGraphicsCanvas() {
    _canvas = new Graphics2DCanvas();
  }
  
  /**
   * Creates an instance of {@link Graphics2DJPanel}
   * which wraps the rendered plot. 
   */
  protected void createGraphicsJPanel() {
    _jPanel = new Graphics2DJPanel();
  }

  /**
   * Draws the plot into the specified image by using Java2D API. 
   * Can be used for off-screen renderering if double-buffering is switched
   * off. Otherwise <tt>NullPointerException</tt> will be thrown.
   */
  public void draw2DInto(Image image) 
  {
    _jPanel.setSize(image.getWidth(null), image.getHeight(null));
    _jPanel.update(image.getGraphics());
  }


  /**
   * Maps the cursor position onto a point in device-independent coordinates.
   * @param x X-coordinate of the cursor.
   * @param y Y-coordinate of the cursor.
   */
  public GraphPoint mapCursorPosition(int x, int y) {
    double[] coordinates = new double[] {(double) x, (double) y, 0, 0};
    try {
      _transformation.inverseTransform(coordinates, 0, coordinates, 2, 1);
    } catch (NoninvertibleTransformException e) {}
    return new GraphPoint(coordinates[2], coordinates[3]);
  }
  
  

  /**
   * Shows a plot in a <tt>Frame</tt>. The plot (data and layout) is 
   * defined in the <tt>.properties</tt> file specified by the first
   * command line argument.
   * <p>
   * Usage: <tt>java jcckit.Graphics2DPlotCanvas  [-r &lt;renderer class&gt;]
   *            &lt;<i>properties file</i>&gt;</tt>
   */
  public static void main(String[] args) throws Exception {
    run(args, "jcckit.Graphics2DPlotCanvas");
  }
}
