package org.rr0.ufoathome.view;

import java.awt.*;

/**
 * @author Jerome Beau
 * @version 27 juin 2004
 */
public abstract class AbstractView extends Canvas {
    public abstract void displayBuffered();

    public abstract Graphics getBufferedGraphics();
}
