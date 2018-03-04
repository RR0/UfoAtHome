package org.rr0.im.business.actor;

import org.rr0.util.NameHelper;

/**
 * Organization Reference Implementation.
 *
 * @author Jérôme Beau
 * @version 3 mai 2003 23:43:36
 */
public class OrganizationImpl extends GroupImpl implements Organization {

    public OrganizationImpl(Identity identity) {
        super(identity);
    }

    public String getAcronym() {
        return NameHelper.toAcronym(getName());
    }
}
