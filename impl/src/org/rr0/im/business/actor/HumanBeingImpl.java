package org.rr0.im.business.actor;

/**
 * Human being Reference Implementation.
 *
 * @author Jérôme Beau
 * @version 21 avr. 2003 15:44:21
 */
public class HumanBeingImpl extends BeingImpl implements HumanBeing {
    public HumanBeingImpl(Identity identity) {
        super(identity);
    }

    public HumanBeingImpl(String name) {
        this (new IdentityImpl(name));
    }
}
