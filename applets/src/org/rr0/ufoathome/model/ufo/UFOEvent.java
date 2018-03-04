package org.rr0.ufoathome.model.ufo;

import org.rr0.ufoathome.model.ufo.UFO;

import java.util.EventObject;

/**
 * @author Jerôme Beau
 * @version 4 déc. 2003 23:08:24
 */
public class UFOEvent extends EventObject {
    private UFO ufo;

    public UFOEvent(Object source, UFO ufo) {
        super(source);
        this.ufo = ufo;
    }

    public UFO getUfo() {
        return ufo;
    }
}
