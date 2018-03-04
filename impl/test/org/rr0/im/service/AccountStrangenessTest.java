package org.rr0.im.service;

import junit.framework.TestCase;
import org.rr0.im.business.actor.Being;
import org.rr0.im.business.actor.HumanBeingImpl;
import org.rr0.im.business.actor.Identity;
import org.rr0.im.business.actor.IdentityImpl;
import org.rr0.im.business.event.Sighting;
import org.rr0.im.business.event.SightingImpl;
import org.rr0.im.business.event.circumstance.Moment;
import org.rr0.im.business.event.circumstance.Place;
import org.rr0.im.business.event.circumstance.PlaceImpl;
import org.rr0.im.business.event.circumstance.PreciseMomentImpl;
import org.rr0.im.business.report.Source;
import org.rr0.im.service.function.SightingStrangeness;
import org.rr0.im.service.function.SightingStrangenessImpl;

/**
 * Test case for Account strangeness index computation.
 *
 * @author Jérôme Beau
 * @version 15 juin 2003 15:27:03
 * @see SightingStrangeness
 */
public class AccountStrangenessTest extends TestCase {
    public AccountStrangenessTest(String someTestName) {
        super(someTestName);
    }

    protected void setUp() {
    }

    public void testCommonSighting() {
        Moment now = new PreciseMomentImpl();
        Place here = new PlaceImpl("here");
        Identity jeromeIdentity = new IdentityImpl("Jérôme Pierre Beau");
        Being witness = new HumanBeingImpl(jeromeIdentity);
        Source source = null;
        Sighting commonSighting = new SightingImpl("Sample sighting", now, here, witness, source);

        SightingStrangeness accountStrangeness = new SightingStrangenessImpl();
        double accountStrangenessIndex = accountStrangeness.getValue(commonSighting);
        assertTrue("accountStrangenessIndex = " + accountStrangenessIndex, accountStrangenessIndex == 0.0);
    }

    public void testStrangeSighting() {
        Moment now = new PreciseMomentImpl();
        Place here = new PlaceImpl("here");
        Identity terryIdentity = new IdentityImpl("Terry Groff");
        Being witness = new HumanBeingImpl(terryIdentity);
        Source source = null;
        Sighting account = new SightingImpl("Sample sighting", now, here, witness, source);

        SightingStrangeness accountStrangeness = new SightingStrangenessImpl();
        double accountStrangenessIndex = accountStrangeness.getValue(account);
        assertTrue("accountStrangenessIndex = " + accountStrangenessIndex, accountStrangenessIndex == 0.3);
    }

    protected void tearDown() {
        // Nettoyage fin de test
    }
}
