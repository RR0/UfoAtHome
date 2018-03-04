package org.rr0.im.service;

import junit.framework.TestCase;
import org.rr0.im.business.actor.HumanBeing;
import org.rr0.im.business.actor.HumanBeingImpl;
import org.rr0.im.business.actor.Identity;
import org.rr0.im.business.actor.IdentityImpl;
import org.rr0.im.business.evidence.AffidavitImpl;
import org.rr0.im.business.investigation.FaceToFaceInterviewImpl;
import org.rr0.im.business.investigation.Interview;
import org.rr0.im.business.investigation.Investigation;
import org.rr0.im.business.report.*;
import org.rr0.im.service.function.AccountQuality;
import org.rr0.im.service.function.AccountQualityImpl;

/**
 * @author Jérôme Beau
 * @version 15 juin 2003 15:27:03
 */
public class AccountCertaintyTest extends TestCase {
    public AccountCertaintyTest(String someTestName) {
        super(someTestName);
    }

    protected void setUp() {
    }

    public void testPoorAccount() {
        Identity johnIdentity = new IdentityImpl("John Walker Smith");
        HumanBeing someOne = new HumanBeingImpl(johnIdentity);
        Source source = new AffidavitImpl("I swear I saw this thing", someOne);
        String accountText = "I saw a bright light";
        Account account = new TextAccountImpl("Poor account", source, accountText);
        AccountQuality accountQuality = new AccountQualityImpl();
        double accountQualityIndex = accountQuality.getValue(account);
        assertTrue("accountQualityIndex = " + accountQualityIndex, accountQualityIndex == 0.0);
    }

    public void testVeryGoodAccount() {
        Case someCase = new CaseImpl("Sample case");
        Investigation investigation = new org.rr0.im.business.investigation.InvestigationImpl(someCase);
        Interview interview = new FaceToFaceInterviewImpl("First interview");
        investigation.getActs().add(interview);
        String accountText = "I saw a bright light";
        Account account = new TextAccountImpl("Very good account", investigation, accountText);
        AccountQuality accountQuality = new AccountQualityImpl();
        double accountQualityIndex = accountQuality.getValue(account);
        assertTrue("accountQualityIndex = " + accountQualityIndex, accountQualityIndex == 0.0);
    }

    protected void tearDown() {
        // Nettoyage fin de test
    }
}
