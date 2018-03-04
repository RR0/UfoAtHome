package org.rr0.im.business.event.circumstance;

import org.rr0.im.business.event.circumstance.Clouds;
import org.rr0.im.service.function.classification.Category;
import org.rr0.im.service.function.classification.Classification;

/**
 * 
 *
 * @author Jérôme Beau
 * @version 10 mai 2003 17:06:23
 */
public class CloudsImpl implements Clouds {

    private int count;

    public CloudsImpl(int count) {
        this.count = count;
    }

    public Category getForcedCategory (Classification classification) {
        return null;
    }
}
