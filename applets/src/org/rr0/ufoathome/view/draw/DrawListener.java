package org.rr0.ufoathome.view.draw;

/**
 * @author Jerome Beau
 * @version 0.3
 */
public interface DrawListener {
    void eventSelected(DrawEvent event);

    void eventRecorded(DrawEvent event);

    void eventDeleted(DrawEvent event);

    void backgroundClicked();
}
