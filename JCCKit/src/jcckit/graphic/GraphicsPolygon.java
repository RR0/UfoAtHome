package jcckit.graphic;

/**
 * @author Jerome Beau
 * @version 0.3
 */
public class GraphicsPolygon extends java.awt.Polygon implements RenderedPolygon {
    public GraphicsPolygon(int xpoints[], int ypoints[], int npoints) {
        super(xpoints, ypoints, npoints);
    }

    public int[] getXPoints() {
        return xpoints;
    }

    public int[] getYPoints() {
        return ypoints;
    }

    public int getNPoints() {
        return npoints;
    }
}