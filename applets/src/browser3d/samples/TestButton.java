package browser3d.samples;

import org.rr0.ufoathome.view.treed.Model3d;

import java.applet.Applet;
import java.awt.BorderLayout;
import java.util.Properties;

public class TestButton extends Applet implements Runnable
{
    Button3d b;

    public void init()
    {
        Properties parameters = new Properties();
        Model3d md = new ThreeCubes(parameters,100,100);
        b = new Button3d(md);
        setLayout(new BorderLayout());
        add("Center", b);
    }

    public void start()
    {
        new Thread(this).start();
    }

    public void run()
    {
/*
        while (true)
            if (b.isMouseInside() && !b.isPressed())
            {
                b.refresh();
                b.waitPainted();
            }
            else
                try
                {
                    Thread.sleep(100);
                }
                catch (InterruptedException e)
                {
                }
*/
    }

}
