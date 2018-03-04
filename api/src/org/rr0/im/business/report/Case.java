package org.rr0.im.business.report;

import java.util.Vector;

/**
 * A well identified unusual/identified phenomena
 * Cases contain accounts from various sources such as investigations or records
 *
 * @author Jérôme Beau
 * @version 21 avr. 2003 16:11:29
 */
public interface Case {

    /**
     * Returns all the accounts recorded for this case.
     *
     * @associates <{Account}>
     * @supplierCardinality 1..*
     * @link aggregation
     * @supplierRole accounts
     * @return A collection of Account
     * @see Account
     */
    Vector getAccounts();

    /**
     * Returns the witnesses of each sightings in this case.
     *
     * @return A collection
     */
    Vector getWitnesses ();
}
