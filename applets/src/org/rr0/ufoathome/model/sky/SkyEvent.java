package org.rr0.ufoathome.model.sky;

/**
 * @author Jerôme Beau
 * @version 4 déc. 2003 23:08:42
 */
public class SkyEvent extends java.util.EventObject {
    protected Object value;

    public SkyEvent(Object source, Object value) {
        super(source);
        this.value = value;
    }

    public Object getValue() {
        return value;
    }
}
