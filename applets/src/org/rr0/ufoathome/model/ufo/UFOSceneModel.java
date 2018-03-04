package org.rr0.ufoathome.model.ufo;

import org.rr0.ufoathome.view.gui.MapElement;
import org.rr0.ufoathome.model.sky.SkyModel;

import java.util.Hashtable;

/**
 * @author Jerôme Beau
 * @version 15 nov. 2003 19:38:01
 */
public class UFOSceneModel extends SkyModel {
    private Hashtable buildings = new Hashtable();
    protected Hashtable descriptions = new Hashtable();
    protected WitnessModel witness = new WitnessModel();

    public UFO createUFO(String name) {
        UFO ufo = new UFO(name);
        sources.put(name, ufo);
        return ufo;
    }

    public MapElement getBuidling(String objectName) {
        return (MapElement) buildings.get(objectName);
    }

    public void setDescription(String timeKey, String description) {
        descriptions.put(timeKey, description);
    }

    public String getDescription(String timeKey) {
        return (String) descriptions.get(timeKey);
    }

    public WitnessModel getWitness() {
        return witness;
    }
}
