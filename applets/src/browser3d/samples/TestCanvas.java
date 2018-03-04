package browser3d.samples;

import java.applet.Applet;
import java.awt.BorderLayout;
import java.awt.Button;
import java.awt.Event;
import java.awt.Frame;

public class TestCanvas extends Applet {

    public void init() {
        setLayout(new BorderLayout());
        add("Center", new Button("TestCanvas"));
    }

    public boolean action(Event evt, Object what) {
        createFrame(true);
        return true;
    }

    public static void main(String args[]) {
        createFrame(false);
    }

    static void createFrame(boolean inAnApplet) {
        ThreeCubesFrame window = new ThreeCubesFrame(inAnApplet);
        if (inAnApplet)
            window.setTitle("TestCanvasApplet");
        else
            window.setTitle("TestCanvasApplication");
        window.pack();
        window.show();
        window.start();
    }

}

class ThreeCubesFrame extends Frame implements Runnable {
    boolean inAnApplet;
    Canvas3d canv;

    public ThreeCubesFrame(boolean inAnApplet) {
        setLayout(new BorderLayout());
        ThreeCubes md = new ThreeCubes(null, 100, 100);
        canv = new Canvas3d(md);
        add("Center", canv);
        this.inAnApplet = inAnApplet;
    }

    void start() {
        new Thread(this).start();
    }

    public synchronized boolean handleEvent(Event e) {
        if (e.id == Event.WINDOW_DESTROY) {
            if (inAnApplet) {
                dispose();
                return true;
            } else
                System.exit(0);
        }
        return super.handleEvent(e);
    }

    public void run() {
        while (true) {
            canv.repaint();
            canv.waitPainted();
        }
    }

}
