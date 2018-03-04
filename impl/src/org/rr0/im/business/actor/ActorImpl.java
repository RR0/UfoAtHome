package org.rr0.im.business.actor;

import org.rr0.im.business.event.TimeableImpl;
import org.rr0.im.service.function.classification.Category;
import org.rr0.im.service.function.classification.Classification;

import java.util.Vector;

/**
 * Actor Reference Implementation.
 *
 * @author Jerome Beau
 * @version 18 juil. 2003 19:19:21
 */
public abstract class ActorImpl extends TimeableImpl implements Actor {
    private Vector identities = new Vector();

    public ActorImpl(String name) {
        this(new IdentityImpl(name));
    }

    public ActorImpl(Identity identity) {
        super(identity.getName());
        addIdentity(identity);
    }

    /**
     * @param classification Some function.
     * @return The Category in which that Classifiable has been forced to be classified in for that Classification.
     *         null if no Category has been forced for that Classifiable.
     */
    public Category getForcedCategory(Classification classification) {
        return null;
    }

    public Vector getIdentities() {
        return identities;
    }

    public void addIdentity(Identity newIdentity) {
        identities.addElement(newIdentity);
    }

    public void addIdentity(String name) {
        addIdentity(new IdentityImpl(name));
    }
}
