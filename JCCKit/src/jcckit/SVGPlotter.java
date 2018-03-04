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

import java.io.FileWriter;

import jcckit.data.DataPlot;
import jcckit.graphic.ClippingRectangle;
import jcckit.plot.PlotCanvas;
import jcckit.renderer.SVGRenderer;
import jcckit.util.ConfigParameters;
import jcckit.util.Factory;
import jcckit.util.Format;
import jcckit.util.PropertiesBasedConfigData;

/**
 * Creates an SVG document from a plot by using the 
 * {@link jcckit.renderer.SVGRenderer}.
 * 
 * @author Franz-Josef Elmer
 */
public class SVGPlotter {
  private static final Format HEADER_FORMAT = new Format(
        "<?xml version='1.0' encoding='ISO-8859-1'?>\n"
      + "<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.0//EN\" "
      + "\"http://www.w3.org/TR/2001/REC-SVG-20010904/DTD/svg10.dtd\">\n"
      + "<svg viewBox='%9.7g %9.7g %9.7g %9.7g' preserveAspectRatio='x");

  /**
   * Creates an SVG document from the specified plot canvas. The root
   * element is an <tt>&lt;svg&gt;</tt> element with the attributes
   * <tt>viewBox</tt> determined by {@link jcckit.plot.PlotCanvas#getPaper}
   * and <tt>preserveAspectRatio</tt> determined by 
   * {@link jcckit.plot.PlotCanvas#getHorizontalAnchor} and 
   * {@link jcckit.plot.PlotCanvas#getVerticalAnchor}.
   * @param canvas Canvas from which the SVG document is created.
   * @param renderer Fully qualified class name of the renderer.
   * @throws ClassCastException if <tt>renderer</tt> is not of type
   *         {@link SVGRenderer}.
   */
  public static String makeSVG(PlotCanvas canvas, String renderer) {
    ClippingRectangle paper = canvas.getPaper();
    double w = paper.getMaxX() - paper.getMinX();
    double h = paper.getMaxY() - paper.getMinY();
    StringBuffer buffer = new StringBuffer(
        HEADER_FORMAT.form(new double[] {paper.getMinX(), -paper.getMaxY(),
                                         w, h}));
    buffer.append(mapAnchor(canvas.getHorizontalAnchor().getFactor()))
          .append('Y')
          .append(mapAnchor(2 - canvas.getVerticalAnchor().getFactor()))
          .append("'>\n");
    
    canvas.getPlot().getCompletePlot().renderWith(
                ((SVGRenderer) Factory.create(renderer))
                        .init(buffer, 1, Math.sqrt(w * w + h * h)));
    buffer.append("</svg>\n");
    return new String(buffer);
  }

  private static String mapAnchor(int anchorFactor) {
    return anchorFactor == 0 ? "Min" : (anchorFactor == 1 ? "Mid" : "Max");
  }

  /**
   * Creates an SVG document based on a <tt>.properties</tt> file.
   * <p>
   * Usage: <tt>java jcckit.SVGPlotter [-o &lt;<i>output file</i>&gt;] 
   * &lt;<i>properties file</i>&gt;</tt>
   * <p>
   * If the <tt>-o</tt> option isn't present the SVG output will be 
   * printed onto the console.
   */   
  public static void main(String[] args) throws Exception {
    if (args.length == 0) {
      showUsageAndExit();
    }
    int index = 0;
    String propFileName = args[0];
    String outputFileName = null;
    if (propFileName.equals("-o")) {
      if (args.length > 2) {
        outputFileName = args[1];
        propFileName = args[2];
      } else {
        showUsageAndExit();
      }
      index += 2;
    }
    propFileName = args[index];
    String renderer = "jcckit.renderer.SVGRenderer";
    if (propFileName.equals("-r")) {
      if (args.length > index + 2) {
        renderer = args[++index];
        propFileName = args[++index];
      } else {
        showUsageAndExit();
      }
    }
    ConfigParameters config
        = new ConfigParameters(new PropertiesBasedConfigData(propFileName));
    PlotCanvas plotCanvas = new PlotCanvas(config);
    plotCanvas.connect(DataPlot.create(config));
    String output = makeSVG(plotCanvas, renderer);
    if (outputFileName == null) {
      System.out.println(output);
    } else {
      FileWriter writer = new FileWriter(outputFileName);
      writer.write(output, 0, output.length());
      writer.close();
    }
  }

  private static void showUsageAndExit() {
    System.out.println("Usage: java jcckit.SVGPlotter [-o <output file>] "
                       + "[-r <renderer class>] <properties file>");
    System.exit(1);
  }
}
