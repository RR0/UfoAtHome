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

import jcckit.data.DataPlot;
import jcckit.util.AppletBasedConfigData;
import jcckit.util.ConfigParameters;
import jcckit.util.Factory;
import jcckit.util.PropertiesBasedConfigData;

import java.applet.Applet;
import java.awt.CardLayout;
import java.awt.Component;
import java.awt.Color;
import java.awt.Label;
import java.awt.TextArea;
import java.io.InputStream;
import java.net.URL;
import java.util.Properties;

/**
 * Applet showing a static plot in a {@link GraphicsPlotCanvas}. 
 * The plot (data as well as layout) is defined by applet parameters.
 * Depending on the applet parameters the data may be loaded from a
 * separated file. This allows to separate model (data) from view (plot).
 * Before the plot is shown a waiting message is presented. 
 * <p>
 * The applet parameters are organized in a hierarchical way with inheritance
 * as explained in {@link jcckit.util.FlatConfigData}. The <tt>PlotApplet</tt>
 * uses the same configiuration parameters as the <a href=
 * "GraphicsPlotCanvas.html#GraphicsPlotCanvas(jcckit.util.ConfigParameters)">
 * constructor</a> of {@link GraphicsPlotCanvas}. 
 * In addition the following parameters are considered:
 * <table border=1 cellpadding=5>
 * <tr><th>Key &amp; Default Value</th><th>Type</th><th>Mandatory</th>
 *     <th>Description</th></tr>
 * <tr><td><tt>waitingMessage = </tt><i>Please wait, applet data are loading...
 *     </i></td><td><tt>String</tt></td><td>no</td>
 *     <td>Message present after the applet has be started.</td></tr>
 * <tr><td><tt>dataProperties</tt></td>
 *     <td><tt>String</tt></td><td>if <tt>data</tt> is absent</td>
 *     <td>File name relative to the applet's document base. It should denote a
 *         <tt>.properties</tt> file with the configuration parameters for the 
 *         <a href="data/DataPlot.html#DataPlot(jcckit.util.ConfigParameters)">
 *         constructor</a> of {@link jcckit.data.DataPlot}.</td></tr>
 * <tr><td><tt>data</tt></td>
 *     <td><tt>ConfigParameters</tt></td><td>if <tt>dataProperties</tt> 
 *         is absent</td>
 *     <td>Configuration parameters for the
 *         <a href="data/DataPlot.html#DataPlot(jcckit.util.ConfigParameters)">
 *         constructor</a> of {@link jcckit.data.DataPlot}.</td></tr>
 * <tr><td><tt>renderer = jcckit.renderer.GraphicsRenderer</tt></td>
 *     <td><tt>String</tt></td><td>no</td>
 *     <td>Fully qualified class name of the render which has to be the
 *         default renderer or a subclass of the default renderer.</td></tr>
 * </table>
 *
 * @author Franz-Josef Elmer
 */
public class PlotApplet extends Applet implements Runnable {
  public static final String DEFAULT_WAITING_MESSAGE
            = "Please wait, applet data are loading...";
  public static final String WAITING_MESSAGE_KEY = "waitingMessage",
                             DATA_PROPERTIES_KEY = "dataProperties",
                             DATA_KEY = "data",
                             RENDERER_KEY = "renderer";
  private CardLayout _layout = new CardLayout();

  /** Initializes the applet by presenting the waiting message. */
  public void init() {
    setLayout(_layout);
    String label = getParameter(WAITING_MESSAGE_KEY);
    if (label == null) {
      label = DEFAULT_WAITING_MESSAGE;
    }
    add(new Label(label, Label.CENTER), "");
  }

  /** Starts plot creation in an extra thread. */
  public void start() {
    new Thread(this).start();
  }

  /** 
   * Creates the plot and replaces the waiting message or shows the exception
   * if creation failed.
   */
  public void run() {
    try {
      ConfigParameters config
          = new ConfigParameters(new AppletBasedConfigData(this));
      DataPlot dPlot = new DataPlot(getDataConfig(config));
      GraphicsPlotCanvas canvas 
          = config.get(Factory.CLASS_NAME_KEY, null) == null ?
                                 new GraphicsPlotCanvas(config)
                                 : (GraphicsPlotCanvas) Factory.create(config);
      canvas.setRenderer(config.get(RENDERER_KEY, 
                                    "jcckit.renderer.GraphicsRenderer"));
      canvas.connect(dPlot);
      show(canvas.getGraphicsCanvas());
    } catch (Throwable t) {
      show(t);
    }
  }

  private void show(Throwable throwable) {
    TextArea error = new TextArea(throwable.toString());
    error.setForeground(Color.red);
    show(error);
  }

  private void show(Component component) {
    removeAll();
    add(component, "");
    _layout.last(this);
  }

  /** 
   * Obtains the config parameters for the data either from a 
   * <tt>.properties</tt> file or from the applet parameters. 
   */
  private ConfigParameters getDataConfig(ConfigParameters config)
                                                          throws Throwable {
    ConfigParameters result = config.getNode(DATA_KEY);
    String dataProperties = config.get(DATA_PROPERTIES_KEY, null);
    if (dataProperties != null) {
      Properties properties = new Properties();
      InputStream is
          = new URL(getDocumentBase(), dataProperties).openStream();
      properties.load(is);
      is.close();
      result = new ConfigParameters(new PropertiesBasedConfigData(properties));
    }
    return result;
  }
}
