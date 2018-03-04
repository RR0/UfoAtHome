package org.rr0.im.business.actor;

import org.rr0.im.business.event.circumstance.Length;
import org.rr0.im.business.event.circumstance.Weight;

import java.util.Locale;

/**
 * Intelligent Being Reference Implementation
 *
 * @author Jerome Beau
 * @version 0.3
 */
public class BeingImpl extends ActorImpl implements Being {
    /**
     * The being's height, in meters
     */
    private Length height;

    /**
     * The being's weight, in kilograms
     */
    private Weight weight;

    public BeingImpl(Identity identity) {
        super(identity);
    }

    public Length getHeight(Locale locale) {
        return height;
    }

    public Weight getWeight() {
        return weight;
    }

}
