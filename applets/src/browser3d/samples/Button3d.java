package browser3d.samples;

import org.rr0.ufoathome.view.treed.Model3d;

import java.awt.Color;
import java.awt.Event;

public class Button3d extends Canvas3d
{
    boolean pressed, mouseInside;
    String label;

    Button3d(Model3d md)
    {
        super(md);
        setBackground(Color.lightGray);
        pressed = false;
        mouseInside = false;
        label = null;
    }

    public Button3d(Model3d md, String label)
    {
        this(md);
        this.label = label;
    }

    String getLabel()
    {
        return label;
    }

    void setLabel(String label)
    {
        this.label = label;
    }

    boolean isPressed()
    {
        return pressed;
    }

    boolean isMouseInside()
    {
        return mouseInside;
    }

/*
    synchronized void refresh()
    {
        if (model != null)
        {
            backGC.setColor(getBackground());
            backGC.fillRect(0, 0, size().width, size().height);
            model.paint(backGC);
            repaint();
        }
    }

    synchronized public void paint(Graphics g) 
    {
        backGC.setColor(Color.white);
        backGC.draw3DRect(0, 0, size().width-1, size().height-1, !pressed);
        g.drawImage(backBuffer, 0, 0, this);
        setPainted();
    }

    synchronized public void setBounds(int  x, int  y, int  width, int  height)
    {
        super.setBounds(x, y, width, height);
        backGC.setColor(getBackground());
        backGC.fillRect(0, 0, size().width, size().height);
        if (model != null)
            model.paint(backGC);
    }

    public boolean mouseEnter(Event  evt, int  x, int  y)
    {
        mouseInside = true;
        return true;
    }

    public boolean mouseExit(Event  evt, int  x, int  y)
    {
        if (pressed)
        {
            pressed = false;
            repaint();
        }
        mouseInside = false;
        return true;
    }

    public boolean mouseDown(Event  evt, int  x, int  y)
    {
        pressed = true;
        repaint();
        return true;
    }

    public boolean mouseUp(Event  evt, int  x, int  y)
    {
        if (!pressed)
            return false;
        pressed = false;
        repaint();
        postActionEvent();
        return true;
    }
*/

    void postActionEvent()
    {
        postEvent(new Event(this, Event.ACTION_EVENT, label));
    }

}
