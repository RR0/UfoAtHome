package org.rr0.ufoathome.model.ufo;

import org.rr0.ufoathome.view.gui.MessageEditable;

/**
 * @author Jerôme Beau
 * @version 15 nov. 2003 20:27:40
 */
public class UFO implements Cloneable, MessageEditable {
    private String name;

    public String getName() {
        return name;
    }

    public UFO(String name) {
        this.name = name;
    }

    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof UFO)) return false;

        final UFO ufo = (UFO) o;

        if (!name.equals(ufo.name)) return false;

        return true;
    }

    public int hashCode() {
        return name.hashCode();
    }

    public Object clone() throws CloneNotSupportedException {
        return super.clone();
    }

    public String toString() {
        return getName();
    }

    public String toUUDF() {
        StringBuffer ufoBuffer = new StringBuffer();
        ufoBuffer.append("<ufo id=\"").append(name).append("\"").append(">");
        return ufoBuffer.toString();
    }

    public String getTitle() {
        return getName();
    }

    public void setTitle(String newValue) {
        name = newValue;
    }
}
