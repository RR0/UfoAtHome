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

import java.awt.BorderLayout;
import java.awt.Canvas;
import java.awt.Component;
import java.awt.Dimension;
import java.awt.Frame;
import java.awt.Graphics;
import java.awt.Image;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;
import java.util.Properties;

import jcckit.data.DataPlot;
import jcckit.graphic.GraphPoint;
import jcckit.graphic.GraphicalElement;
import jcckit.graphic.Renderer;
import jcckit.plot.Plot;
import jcckit.plot.PlotCanvas;
import jcckit.plot.PlotEvent;
import jcckit.plot.PlotEventType;
import jcckit.renderer.GraphicsRenderer;
import jcckit.renderer.Transformation;
import jcckit.util.ConfigParameters;
import jcckit.util.ConfigParametersBasedConfigData;
import jcckit.util.Factory;
import jcckit.util.PropertiesBasedConfigData;

/**
 * Class which handles plotting into a <tt>Graphics</tt> context based on
 * the {@link jcckit.renderer.GraphicsRenderer}.
 * This class is not a subclass of <tt>java.gui.Component</tt>.
 * The actual AWT component presenting the plot is an innerclass. Its
 * instance wrapped by <tt>GraphicsPlotCanvas</tt> can be obtained with
 * {@link #getGraphicsCanvas}.
 * <p>
 * The plot is painted by using double-buffering and pre-rendered
 * view of the coordinate system. That is, the coordinate system is
 * drawn into an off-screen image. It will be redrawn only if the 
 * size of the embedding AWT component is changed.
 * 
 * @author Franz-Josef Elmer
 */
public class GraphicsPlotCanvas extends PlotCanvas {
  /** Key of a configuration parameter. */
  public static final String BACKGROUND_KEY = "background",
                             FOREGROUND_KEY = "foreground",
                             DOUBLE_BUFFERING_KEY = "doubleBuffering";
                     
  /**
   * Class which does the actual painting. Needs the <tt>Component</tt>
   * into which the plot is painted for some resources like size,
   * background color, etc.
   * 
   * @author Franz-Josef Elmer
   */                        
  protected class GraphicsPainter {
    private final Component _component;
    private Image _buffer;
    private Image _coordinateSystem;
    private Graphics _bufferGraphics;
    private Dimension _currentSize;

    /**
     * Creates an instance for the specified component.
     * @param component AWT or Swing component.
     */
    public GraphicsPainter(Component component) {
      _component = component;
    }

    /** 
     * Paints the plot. If {@link GraphicsPlotCanvas#_doubleBuffering}
     * is set double-buffering and pre-rendered view of
     * the coordinate system is used.
     */
    public void paint(Graphics g) 
    {
      Dimension size = _component.getSize();
      if (size.width <= 0)
      {
        size.width = 1;
      }
      if (size.height <= 0)
      {
        size.height = 1;
      }
      if (_reset || !size.equals(_currentSize)) 
      {
        init(size);
      }
      //long time = System.currentTimeMillis();
      Plot plot = getPlot();
      drawCoordinateSystem(size, plot, g);
      drawPlot(plot, _doubleBuffering ? _bufferGraphics : g);
      if (_doubleBuffering)
      {
        g.drawImage(_buffer, 0, 0, null);
      }
      if (_marker != null)
      {
        _marker.renderWith(createRenderer(g));
      }
      //System.out.println((System.currentTimeMillis() - time) + " msec");
    }
    
    private void drawPlot(Plot plot, Graphics g)
    {
      prepare(g);
      if (_doubleBuffering)
      {
        g.drawImage(_coordinateSystem, 0, 0, null);
      }
      Renderer renderer = createRenderer(g);
      GraphicalElement[] curves = plot.getCurves();
      for (int i = 0; i < curves.length; i++) {
        curves[i].renderWith(renderer);
      }
      GraphicalElement annotation = plot.getAnnotation();
      if (annotation != null)
      {
        annotation.renderWith(renderer);
      }
      if (plot.isLegendVisible()) {
        plot.getLegend().renderWith(renderer);
      }
    }

    private void init(Dimension size)
    {
      _reset = false;
      _currentSize = size;
      if (_buffer != null) 
      {
        _buffer.flush();
        _bufferGraphics.dispose();
      }
      if (_doubleBuffering)
      {
        _buffer = _component.createImage(size.width, size.height);
        _bufferGraphics = _buffer.getGraphics();
      }
      if (_coordinateSystem != null) 
      {
        _coordinateSystem.flush();
        _coordinateSystem = null;
      }
      calculateTransformation(size);
    }

    private void drawCoordinateSystem(Dimension size, Plot plot, Graphics g)
    {
      if (_coordinateSystem == null || _doubleBuffering == false) 
      {
        if (_doubleBuffering)
        {
          _coordinateSystem = _component.createImage(size.width, size.height);
          g = _coordinateSystem.getGraphics();
        }
        g.setColor(_component.getBackground());
        g.fillRect(0, 0, size.width, size.height);
        g.setColor(_component.getForeground());
        plot.getCoordinateSystem().renderWith(createRenderer(g));
        if (_doubleBuffering) 
        {
          g.dispose();
        }
      }
    }

    /** 
     * Prepare graphics context before drawing the pre-rendered view of
     * the coordinate system. Does nothing but will be used in subclasses.
     */
    protected void prepare(Graphics g) {}

    /** 
     * Calculate the transformation form device-independent coordinates
     * into device-dependent coordinates according to the specified
     * canvas size.
     */
    protected void calculateTransformation(Dimension size) {
      _transformation = new Transformation(size.width, size.height,
              getPaper(), getHorizontalAnchor(), getVerticalAnchor());
    }
    
    /** 
     * Creates an appropriated {@link Renderer} for the specified
     * <tt>Graphics</tt> context.
     */
    protected Renderer createRenderer(Graphics g) {
      return ((GraphicsRenderer) Factory.create(_renderer))
                                      .init(g, _component, _transformation);
    }
  }

  /** 
   * AWT component which actually shows the rendered plot. 
   * 
   * @author Franz-Josef Elmer
   */
  protected class GraphicsCanvas extends Canvas {
    /** Painter which does the actual painting. */
    protected GraphicsPainter _painter;
    
    /**
     * Creates an instance with an appropriated 
     * {@link GraphicsPlotCanvas.GraphicsPainter}.
     */
    public GraphicsCanvas() {
      super();
      _painter = new GraphicsPainter(this);
    }

    /** Handles the event. Just invokes <tt>repaint()</tt>. */
    public void handleEvent(PlotEvent event) {
      repaint();
    }

    /** Directly invokes <tt>paint</tt>. */
    public void update(Graphics g) {
      paint(g);
    }

    /** 
     * Paints the plot. If {@link GraphicsPlotCanvas#_doubleBuffering}
     * is set double-buffering and pre-rendered view of
     * the coordinate system is used.
     */
    public void paint(Graphics g) {
      _painter.paint(g);
    }
  } // end class GraphicsCanvas

  private Transformation _transformation;
  private boolean _reset = true;
  private boolean _doubleBuffering;
  private String _renderer = "jcckit.renderer.GraphicsRenderer"; 

  /** Wrapped AWT component. */
  protected GraphicsCanvas _canvas;
  
  private GraphicalElement _marker;

  /**
   * Creates an instance from the specified configuration parameters.
   * <table border=1 cellpadding=5>
   * <tr><th>Key &amp; Default Value</th><th>Type</th><th>Mandatory</th>
   *     <th>Description</th></tr>
   * <tr><td><tt>background = </tt><i>default background color of the wrapped
   *      AWT component</i></td>
   *     <td><tt>Color</tt></td><td>no</td>
   *     <td>Background color of the wrapped AWT component.</td></tr>
   * <tr><td><tt>foreground = </tt><i>default foreground color of the wrapped
   *      AWT component</i></td>
   *     <td><tt>Color</tt></td><td>no</td>
   *     <td>Foreground color of the wrapped AWT component.</td></tr>
   * <tr><td><tt>doubleBuffering = true</td>
   *     <td><tt>boolean</tt></td><td>no</td>
   *     <td>If <tt>true</tt> the plot will be painted by using 
   *         double-buffering and pre-rendered view of the coordinate system.
   *     </td></tr>
   * </table>
   * In addition the configuration parameters of the
   * <a href="plot/PlotCanvas.html#PlotCanvas(jcckit.util.ConfigParameters)">
   * constructor</a> of the superclass {@link jcckit.plot.PlotCanvas} apply.
   */
  public GraphicsPlotCanvas(ConfigParameters config) {
    super(config);
    createGraphicsCanvas();
    _doubleBuffering = config.getBoolean(DOUBLE_BUFFERING_KEY, true);
    _canvas.setBackground(config.getColor(BACKGROUND_KEY,
                                          _canvas.getBackground()));
    _canvas.setForeground(config.getColor(FOREGROUND_KEY,
                                          _canvas.getForeground()));
  }
  
  /** 
   * Sets the renderer used to render the plot. The default value is
   * {@link GraphicsRenderer}.
   * @param className Fully qualified name of the renderer class.
   */ 
  public void setRenderer(String className) {
    _renderer = className;    
  }

  /**
   * Sets the flag for double buffering. For off-screen rendering this
   * flag has to be set <tt>false</tt>.
   */
  public void setDoubleBuffering(boolean doubleBuffering)
  {
    _doubleBuffering = doubleBuffering;
  }
  
  /**
   * Draws the plot into the specified image. Can be used for off-screen
   * renderering if double-buffering is switched off and if all texts
   * are not rotated. Otherwise <tt>NullPointerException</tt> will be
   * thrown.
   */
  public void drawInto(Image image) 
  {
    _canvas.setSize(image.getWidth(null), image.getHeight(null));
    _canvas.paint(image.getGraphics());
  }
  
  /** 
   * Creates an instance of {@link GraphicsCanvas}
   * which wraps the rendered plot. 
   */
  protected void createGraphicsCanvas() {
    _canvas = new GraphicsCanvas();
  }

  /** Repaints the wrapping GUI component. */
  public void plotChanged(PlotEvent event) {
    if (event.getType() == PlotEventType.COODINATE_SYSTEM_CHANGED)
    {
      _reset = true;;
    }
    _canvas.handleEvent(event);
  }

  /** 
   * Returns an AWT component which wraps the rendered plot. 
   * Note that the returned <tt>Canvas</tt> object has preferred size zero.
   * This is important to know when used with certain LayoutManagers like
   * <tt>FlowLayout</tt>.
   */
  public Canvas getGraphicsCanvas() {
    return _canvas;
  }
  
  /**
   * Maps the cursor position onto a point in device-independent coordinates.
   * @param x X-coordinate of the cursor.
   * @param y Y-coordinate of the cursor.
   */
  public GraphPoint mapCursorPosition(int x, int y) {
    return _transformation.transformBack(x, y);
  }
  
  /**
   * Defines a graphical marker which will be drawn on top of the plot.
   * To remove the marker call this method with argument <tt>null</tt>. 
   * @param marker Marker element. Can be <tt>null</tt>.
   */
  public void setMarker(GraphicalElement marker)
  {
    _marker = marker;
  }

  /**
   * Shows a plot in a <tt>Frame</tt>. The plot (data and layout) is 
   * defined in the <tt>.properties</tt> file specified by the first
   * command line argument.
   * <p>
   * Usage: <tt>java jcckit.GraphicsPlotCanvas  [-r &lt;renderer class&gt;]
   *            &lt;<i>properties file</i>&gt;</tt>
   */
  public static void main(String[] args) throws Exception {
    run(args, "jcckit.GraphicsPlotCanvas");
  }
  
  protected static void run(String[] args, String plotCanvas) 
                        throws Exception {
    if (args.length == 0) {
      printUsageAndExit(plotCanvas);
    }
    String file = args[0];
    String renderer = null;
    if (file.equals("-r")) {
      if (args.length > 2) {
        renderer = args[1];
        file = args[2];
      } else {
        printUsageAndExit(plotCanvas);
      }
    }
    Properties p = new Properties();
    p.put(Factory.CLASS_NAME_KEY, plotCanvas);
    ConfigParameters config
        = new ConfigParameters(
              new ConfigParametersBasedConfigData(
                  new ConfigParameters(new PropertiesBasedConfigData(file)),
                  new ConfigParameters(new PropertiesBasedConfigData(p))));
    GraphicsPlotCanvas canvas = (GraphicsPlotCanvas) Factory.create(config);
    if (renderer != null) {  
      canvas.setRenderer(renderer);
    }
    canvas.connect(DataPlot.create(config));
    
    Frame frame = new Frame("JCCKit: " + file);
    frame.addWindowListener(new WindowAdapter() {
              public void windowClosing(WindowEvent event) {
                System.exit(0);
              }
            }
          );
    frame.add(canvas.getGraphicsCanvas(), BorderLayout.CENTER);
    frame.setSize(666, 555);
    frame.show();
  }
  
  private static void printUsageAndExit(String plotCanvas) {
    System.out.println("Usage: java " + plotCanvas 
                       + " [-r <renderer class>] <properties file>");
    System.exit(0);
  }
}
