package org.rr0.ufoathome.view.draw;

import java.awt.*;

/**
 * @author Jerôme Beau
 * @version 22 sept. 2003 21:49:45
 */
public class CircleShape extends OvalShape {
    public CircleShape(Component component) {
        super(component);
    }

    public void setWidth(int width) {
        super.setWidth(width);
        super.setHeight(width);
    }

    public void setHeight(int height) {
        super.setHeight(height);
        super.setWidth(height);
    }

}
