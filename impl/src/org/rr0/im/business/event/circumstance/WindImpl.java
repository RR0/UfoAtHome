package org.rr0.im.business.event.circumstance;

import org.rr0.im.business.event.circumstance.Wind;
import org.rr0.im.service.function.classification.Category;
import org.rr0.im.service.function.classification.Classification;

/**
 * 
 *
 * @author Jérôme Beau
 * @version 11 mai 2003 16:28:17
 */
public class WindImpl implements Wind {
    private float speed;

    public float getSpeed() {
        return speed;
    }

    public WindImpl(float someSpeed) {
        speed = someSpeed;
    }

    public Category getForcedCategory (Classification classification) {
        return null;
    }
}
