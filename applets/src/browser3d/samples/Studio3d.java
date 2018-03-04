package browser3d.samples;

import browser3d.samples.Canvas3d;
import org.rr0.ufoathome.view.treed.Position;
import org.rr0.ufoathome.view.treed.Model3d;

import java.applet.Applet;
import java.awt.Event;
import java.awt.Graphics;
import java.awt.GridLayout;

abstract public class Studio3d extends Applet implements Runnable 
{
    Thread thread = null;
    boolean threadSuspended = false;
    CanvasStudio3d canv[];
    Model3d md;
    int delay = 0;

    public abstract Model3d createModel();

    public void init() 
    {
        canv = new CanvasStudio3d[4];
        md = createModel();
        if (md != null)
            md.moveAfterPaint = false;
        Position pos;

        setLayout(new GridLayout(2, 2));

        pos = new Position();
        pos.setRot(90, 0, 0);
        canv[0] = new CanvasStudio3d(md, pos);
        add(canv[0]);

        pos = new Position();
        canv[1] = new CanvasStudio3d(md, pos);
        add(canv[1]);

        pos = new Position();
        pos.setRot(90, 0, 0);
        pos.incRot(0, 90, 0);
        canv[2] = new CanvasStudio3d(md, pos);
        add(canv[2]);

        pos = new Position();
        pos.setRot(45, 15, 60);
        canv[3] = new CanvasStudio3d(md, pos);
        add(canv[3]);

        if (md != null)
            delay = md.param("sleep", 0);
    }

    public void start()
    {
        if (thread == null)
        {
            thread = new Thread(this);
            thread.start();
        }
        else if (threadSuspended)
        {
            thread.resume();
            threadSuspended = false;
        }
    }

    public void stop()
    {
        if (thread != null && !threadSuspended)
        {
            thread.suspend();
            threadSuspended = true;
        }
    }

    public void destroy()
    {
        if (thread != null)
        {
            thread.stop();
            thread = null;
        }
    }

    public boolean mouseDown(Event e, int x, int y) 
    {
        if (thread != null)
        {
            if (threadSuspended) 
                thread.resume();
            else 
                thread.suspend();
            threadSuspended = !threadSuspended;
        }
        return true;
    }

    public void run() 
    {
        while (thread != null)
        {
            for (int i = 0; i < 4; i++)
            {
                canv[i].repaint();
                canv[i].waitPainted();
            }
            md.move();
            if (delay > 0)
                try
                {
                    Thread.sleep(delay);
                }
                catch (InterruptedException e)
                {
                }
        }
    }

}

class CanvasStudio3d extends Canvas3d
{
    Position pos;

    CanvasStudio3d(Model3d md, Position pos)
    {
        super(md);
        this.pos = pos;
    }

    public void paint(Graphics g) 
    {
        if (model != null)
            model.copyPos(pos);
        super.paint(g);
    }

}
