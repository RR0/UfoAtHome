package org.rr0.ufoathome.view.gui;

import java.awt.*;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.MouseEvent;
import java.awt.event.MouseListener;
import java.util.Enumeration;
import java.util.Vector;

/**
 * <p>A on/off button that displays a Shape.</p>
 * <p>This class is implemented to be usable in Java 1.1 applets, and so follows an AWT-only requirement
 * (no Swing, Java2D, geom, or Java 2 feature)</P>
 * <p>Because of the graphics to be drawn on it, this button inherits from java.gui.Canvas and not from java.gui.Button
 * (of which the peer cannot be overwritten on every platform)</p>
 *
 * @author Jerôme Beau
 * @version 0.3
 */
public abstract class ShapeButton extends Canvas implements MouseListener {
    /**
     * The on/off state of the button
     */
    private boolean state;

    private Dimension dimension = new Dimension();

    private Vector actionListeners = new Vector();
    private Vector messageListeners = new Vector();

    private static final int DEFAULT_MARGIN = 10;
    private int margin;
    private Color enabledColor;
    private String hoverMessage;

    public void setHoverMessage(String hoverMessage) {
        this.hoverMessage = hoverMessage;
    }

    public void setMargin(int margin) {
        this.margin = margin;
    }

    public void addMessageListener(MessageListener messageListener) {
        messageListeners.addElement(messageListener);
    }

    /**
     * Send a text message to our message listeners.
     *
     * @param message
     */
    protected void message(String message) {
        MessageEvent messageEvent = new MessageEvent(this, message, null);
        Enumeration listenersEnumeration = messageListeners.elements();
        while (listenersEnumeration.hasMoreElements()) {
            MessageListener listener = (MessageListener) listenersEnumeration.nextElement();
            listener.message(messageEvent);
        }
    }

    public ShapeButton() {
        addMouseListener(this);
        setMargin(DEFAULT_MARGIN);
        enabledColor = SystemColor.control;
    }

    public void setEnabled(boolean b) {
        super.setEnabled(b);
        repaint();
    }

    protected ShapeButton(String hoverMessage) {
        this();
        this.hoverMessage = hoverMessage;
    }

    public boolean isPushed() {
        return state == true;
    }

    public void setShapeDimension(Dimension shapeDimension) {
        dimension.width = shapeDimension.width + margin * 2;
        dimension.height = shapeDimension.height + margin * 2;
    }

    public Dimension getPreferredSize() {
        return dimension;
    }

    public void paint(Graphics g) {
        Rectangle bounds = getBounds();
        Color color;
        if (isEnabled()) {
            color = enabledColor;
        } else {
            color = SystemColor.controlShadow;
        }
        g.setColor(color);
        g.fillRect(0, 0, bounds.width, bounds.height);
        if (isEnabled()) {
            g.setColor(SystemColor.controlHighlight);
        } else {
            g.setColor(SystemColor.controlLtHighlight);
        }
        g.draw3DRect(0, 0, bounds.width - 1, bounds.height - 1, !state);
        g.setColor(SystemColor.controlShadow);
        g.draw3DRect(1, 1, bounds.width - 2, bounds.height - 2, !state);
        if (isEnabled()) {
            g.setColor(SystemColor.controlText);
        } else {
            g.setColor(SystemColor.controlDkShadow);
        }
    }

    /**
     * Invoked when the mouse button has been clicked (pressed
     * and released) on a component.
     */
    public void mouseClicked(MouseEvent e) {
        state = !state;
        repaint();
        fire("ButtonPressed");
    }

    private void fire(String message) {
        Enumeration iterator = actionListeners.elements();
        while (iterator.hasMoreElements()) {
            ActionListener actionListener = (ActionListener) iterator.nextElement();
            ActionEvent actionEvent = new ActionEvent(this, 0, message);
            actionListener.actionPerformed(actionEvent);
        }
    }

    /**
     * Invoked when a mouse button has been pressed on a component.
     */
    public void mousePressed(MouseEvent e) {
        //To change body of implemented methods use Options | File Templates.
    }

    /**
     * Invoked when a mouse button has been released on a component.
     */
    public void mouseReleased(MouseEvent e) {
        //To change body of implemented methods use Options | File Templates.
    }

    /**
     * Invoked when the mouse enters a component.
     */
    public void mouseEntered(MouseEvent e) {
        if (isEnabled()) {
            enabledColor = SystemColor.controlHighlight;
            message(hoverMessage);
            repaint();
        }
    }

    /**
     * Invoked when the mouse exits a component.
     */
    public void mouseExited(MouseEvent e) {
        if (isEnabled()) {
            enabledColor = SystemColor.control;
            repaint();
        }
    }

    public void addActionListener(ActionListener actionListener) {
        actionListeners.addElement(actionListener);
    }

    public void released() {
        state = false;
//        fire("ButtonReleased");
        repaint();
    }

    public void pushed() {
        state = true;
        fire("ButtonPressed");
        repaint();
    }

    protected int getMargin() {
        return margin;
    }
}
