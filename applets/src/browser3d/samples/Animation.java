package browser3d.samples;

import org.rr0.ufoathome.view.treed.Model3d;

import java.applet.Applet;
import java.awt.Event;
import java.awt.Graphics;
import java.awt.Image;

abstract public class Animation extends Applet implements Runnable {
    Thread thread = null;
    boolean threadSuspended = false;
    Model3d md = null;
    Image backBuffer = null;
    Graphics backGC = null;
    int delay = 0;
    static final boolean showFPS = true;
    static final boolean debug = false;
    boolean painted;

    public void init() {
        try {
            delay = Integer.valueOf(getParameter("sleep")).intValue();
        } catch (Exception e) {
            delay = 0;
        }
    }

    public void start() {
        if (thread == null) {
            threadSuspended = false;
            thread = new Thread(this);
            thread.setPriority(Thread.MIN_PRIORITY);
            thread.start();
        }
    }

    public void stop() {
        if (thread != null) {
            thread.stop();
            thread = null;
        }
        md = null;
        backBuffer = null;
        backGC = null;
    }

    public void update(Graphics g) {
        if (backBuffer == null)
            g.clearRect(0, 0, size().width, size().height);
        paint(g);
    }

    public void paint(Graphics g, int horizonY) {
//        if (md != null) {
            if (backBuffer != null) {
                backGC.setColor(getBackground());
                backGC.fillRect(0, 0, getSize().width, getSize().height);
                md.paint(backGC, horizonY);
                g.drawImage(backBuffer, 0, 0, this);
            } else
                md.paint(g, 0);
//        }
        setPainted();
    }

    synchronized void setPainted() {
        painted = true;
        notifyAll();
    }

    synchronized void waitPainted() {
        while (!painted)
            try {
                wait();
            } catch (Exception e) {
            }
        painted = false;
    }

    public boolean mouseDown(Event e, int x, int y) {
        if (thread != null) {
            if (threadSuspended)
                thread.resume();
            else
                thread.suspend();
            threadSuspended = !threadSuspended;
        }
        return true;
    }

    abstract Model3d createModel();

    public void run() {
        md = createModel();
        if (!debug) {
            backBuffer = createImage(size().width, size().height);
            backGC = backBuffer.getGraphics();
        }
        long frame = 0;
        long startTime = System.currentTimeMillis();
        while (thread != null) {
            repaint();
            waitPainted();
            frame++;
            if (showFPS && frame % 100 == 0) {
                long currentTime = System.currentTimeMillis();
                long dt = currentTime - startTime;
                if (dt > 0) {
                    int fps = (int) (100 * 1000 / dt);
                    showStatus("FPS " + fps);
                }
                startTime = currentTime;
            }
            if (delay > 0)
                try {
                    Thread.sleep(delay);
                } catch (InterruptedException e) {
                }
        }
    }

}
