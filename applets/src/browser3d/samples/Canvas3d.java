package browser3d.samples;

import org.rr0.ufoathome.view.treed.Model3d;

import java.awt.Canvas;
import java.awt.Dimension;
import java.awt.Graphics;
import java.awt.Image;

public class Canvas3d extends Canvas {
    public Model3d model;
    public Image backBuffer;
    public Graphics backGC;
    Dimension prefSize, minSize;
    boolean painted;

    public Canvas3d(Model3d md) {
        if (md == null) {
            return;
        }
        this.model = md;
        prefSize = new Dimension(md.width, md.height);
        minSize = new Dimension(md.width / 2, md.height / 2);
    }

    public Dimension minimumSize() {
        return minSize;
    }

    public Dimension preferredSize() {
        return prefSize;
    }

    public void update(Graphics g) {
        paint(g);
    }

    public void paint(Graphics g) {
        backGC.setColor(getBackground());
        backGC.fillRect(0, 0, size().width, size().height);
        if (model != null) {
            model.paint(backGC, 0);
        }
        g.drawImage(backBuffer, 0, 0, this);
        setPainted();
    }

    public synchronized void setPainted() {
        painted = true;
        notifyAll();
    }

    public synchronized void waitPainted() {
        while (!painted)
            try {
                wait();
            } catch (Exception e) {
            }
        painted = false;
    }

    public void setBounds(int x, int y, int width, int height) {
        super.setBounds(x, y, width, height);
        backBuffer = createImage(width, height);
        backGC = backBuffer.getGraphics();
        if (model != null) {
            model.resize(width, height);
        }
    }

    public void releaseModel() {
        model = null;
    }

}
