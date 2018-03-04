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

import java.awt.Graphics;

import javax.swing.JPanel;

import jcckit.plot.PlotEvent;
import jcckit.util.ConfigParameters;

/**
 * Java 2 aware extentions of {@link GraphicsPlotCanvas}.
 * 
 * @author Franz-Josef Elmer
 */
public class GraphicsPlotCanvas2 extends GraphicsPlotCanvas {
  /** Wrapped Swing component. */
  protected GraphicsJPanel _jPanel;

  /** 
   * Swing component which actually shows the rendered plot. 
   * 
   * @author Franz-Josef Elmer
   */
  protected class GraphicsJPanel extends JPanel {
    /** Painter which does the actual painting. */
    protected GraphicsPainter _painter;
    
    /**
     * Creates an instance with an appropriated 
     * {@link GraphicsPlotCanvas.GraphicsPainter}.
     */
    public GraphicsJPanel() {
      super();
      _painter = new GraphicsPainter(this);
    }

    /** Handles the event. Just invokes <tt>repaint()</tt>. */
    public void handleEvent(PlotEvent event) {
      repaint();
    }
    
    public void paintComponent(Graphics g) {
      super.paintComponent(g);
      update(g);
    }    

    public void update(Graphics g) {
      _painter.paint(g);
    }
  }
  
  /**
   * Creates an instance from the specified configuration parameters.
   * The configuration parameters of the
   * <a href=
   * "GraphicsPlotCanvas.html#GraphicsPlotCanvas(jcckit.util.ConfigParameters)"
   * >s constructor</a> of the superclass {@link GraphicsPlotCanvas} apply.
   */
  public GraphicsPlotCanvas2(ConfigParameters config) {
    super(config);
    createGraphicsJPanel();
    _jPanel.setBackground(config.getColor(BACKGROUND_KEY, 
                                          _jPanel.getBackground()));
    _jPanel.setForeground(config.getColor(FOREGROUND_KEY, 
                                          _jPanel.getForeground()));
    _jPanel.setOpaque(true);
  }

  /**
   * Creates an instance of {@link GraphicsJPanel}
   * which wraps the rendered plot. 
   */
  protected void createGraphicsJPanel() {
    _jPanel = new GraphicsJPanel();
  }

  /** Repaints the wrapping GUI component. */
  public void plotChanged(PlotEvent event) {
    super.plotChanged(event);
    _jPanel.handleEvent(event);
  }

  /**
   * Returns a Swing component which wraps the rendered plot. 
   * Note that the returned <tt>JPanel</tt> object has preferred size zero.
   * This is important to know when used with certain LayoutManagers like
   * <tt>FlowLayout</tt>.
   */
  public JPanel getGraphicsJPanel() {
    return _jPanel;
  }
}
