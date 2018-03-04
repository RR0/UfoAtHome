package org.rr0.im.business.actor;

import java.security.Principal;
import java.util.Enumeration;
import java.util.Vector;

/**
 * Group Reference Implementation.
 *
 * @author Jérôme Beau
 * @version 19 juil. 2003 16:37:19
 */
public class GroupImpl extends ActorImpl implements java.security.acl.Group {
    private Vector members = new Vector();

    public GroupImpl(Identity identity) {
        super(identity);
    }

    public boolean addMember(Principal user) {
        members.addElement(user);
        return false;
    }

    public boolean removeMember(Principal user) {
        return members.removeElement(user);
    }

    public boolean isMember(Principal member) {
        return members.contains(member);
    }

    /**
     * @return A collection of Actors.
     * @associates <{org.rr0.im.business.actor.Actor}>
     * @supplierCardinality 1..*
     * @link aggregation
     * @supplierRole members
     */
    public Enumeration members() {
        return members.elements();
    }

    public String getName() {
        return ((Identity) getIdentities().elementAt(0)).getName();
    }
}
