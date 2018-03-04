package org.rr0.ufoathome.model.ufo;

import java.awt.*;

/**
 * @author Jerome Beau
 * @version 0.3
 */
public interface Precipitations extends Runnable {
    void start();
    void stop();
    void init();
    void paint(Graphics g);

    void setWindFactor(int windFactor);
}
