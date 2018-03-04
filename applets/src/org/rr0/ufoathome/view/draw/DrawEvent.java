package org.rr0.ufoathome.view.draw;

import java.util.EventObject;

/**
 * An event on a shape from a given source.
 *
 * @author Jerôme Beau
 * @version 13 nov. 2003 23:34:49
 */
public class DrawEvent extends EventObject {
    /**
         * @supplierRole event shape
         */
    private DrawShape shape;

    public DrawEvent(DrawShape shape, Object source) {
        super(source);
        this.shape = shape;
    }

    public DrawShape getShape() {
        return shape;
    }

    public void setSource(Object newSource) {
        source = newSource;
    }

    public String toString() {
        StringBuffer uudfBuffer = new StringBuffer();
        uudfBuffer.append("\t").append(source);
        uudfBuffer.append("\n");
        uudfBuffer.append("\t").append(shape);
        return uudfBuffer.toString();
    }
}
