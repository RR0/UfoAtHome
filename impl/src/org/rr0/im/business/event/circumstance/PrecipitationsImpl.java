package org.rr0.im.business.event.circumstance;

import org.rr0.im.business.event.circumstance.Precipitations;
import org.rr0.im.service.function.classification.Category;
import org.rr0.im.service.function.classification.Classification;

/**
 * 
 *
 * @author Jérôme Beau
 * @version 11 mai 2003 17:29:47
 */
public class PrecipitationsImpl implements Precipitations {
    private int milimeters;

    public int getMilimeters () {
        return milimeters;
    }

    public float getVisibility () {
        return 0;
    }

    public float getHumidity () {
        return 0;
    }

    public PrecipitationsImpl (int milimeters) {
        this.milimeters = milimeters;
    }

    public Category getForcedCategory (Classification classification) {
        return null;
    }
}
