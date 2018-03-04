package org.rr0.ufoathome.view.gui;

import java.util.EventObject;

/**
 * @author Jerome Beau
 * @version 0.3
 */
public class BuildingEvent extends EventObject {
    private MapElement mapElement;

    public BuildingEvent(Object source, MapElement mapElement) {
        super(source);
        this.mapElement = mapElement;
    }

    public MapElement getBuilding() {
        return mapElement;
    }
}
