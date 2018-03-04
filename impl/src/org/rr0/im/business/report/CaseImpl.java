package org.rr0.im.business.report;

import org.rr0.im.business.actor.Being;
import org.rr0.im.business.event.Event;
import org.rr0.im.business.event.Sighting;

import java.util.Vector;
import java.util.Enumeration;


/**
 * Case Reference Implementation.
 * A case is defined as a set of accounts.
 *
 * @author <a href="mailto:rr0@rr0.org">Jerome Beau</a>
 * @version $revision$
 */
public class CaseImpl implements Case
{
    private Vector accounts = new Vector();

    private String title;

    public CaseImpl(String someTitle) {
        title = someTitle;
    }

    /**
         * Returns all the accounts recorded for this case.
         *
         * @return A collection of Account
         * @associates <{Event}>
         * @supplierCardinality 1..*
         * @link aggregation
         * @supplierRole accounts
         */
    public Vector getAccounts() {
        return accounts;
    }

    public Vector getWitnesses() {
        Vector witnesses = new Vector();
        Enumeration accountEventIterator = accounts.elements();
        while (accountEventIterator.hasMoreElements()) {
            Event event = (Event) accountEventIterator.nextElement();
            if (event instanceof Sighting) {
                Sighting sighting = (Sighting) event;
                Being witness = sighting.getWitness();
                witnesses.addElement(witness);
            }
        }
        return witnesses;
    }

    public String getTitle() {
        return title;
    }
}
