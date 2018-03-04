package org.rr0.im.service;

import junit.framework.TestCase;
import org.rr0.im.business.actor.*;
import org.rr0.im.business.evidence.AffidavitImpl;
import org.rr0.im.business.investigation.FaceToFaceInterviewImpl;
import org.rr0.im.business.investigation.Interview;
import org.rr0.im.business.investigation.InterviewSession;
import org.rr0.im.business.investigation.Investigation;
import org.rr0.im.business.report.*;
import org.rr0.im.service.function.CaseReliability;
import org.rr0.im.service.function.CaseReliabilityImpl;

import java.util.Locale;

/**
 * @author Jérôme Beau
 * @version 15 juin 2003 15:27:03
 */
public class AccountRelabilityTest extends TestCase {
    public AccountRelabilityTest(String someTestName) {
        super(someTestName);
    }

    protected void setUp() {
    }

    public void testPoorAccount() {
        Identity johnIdentity = new IdentityImpl("John Walker Smith");
        HumanBeing someOne = new HumanBeingImpl(johnIdentity);
        Source source = new AffidavitImpl("I swear I saw this thing", someOne);
        String accountText = "I saw a bright light";
        Case case1 = new CaseImpl("case1");
        Account account = new TextAccountImpl("Poor account", source, accountText);
        case1.getAccounts().add(account);
        CaseReliability accountQuality = new CaseReliabilityImpl();
        double someOneOccupationFactor = accountQuality.getOccupationFactor(someOne);
        double witnessesAgeFactor = accountQuality.getWitnessesAgeFactor(account);
        double witnessesRelationshipFactor = accountQuality.getWitnessesRelationshipFactor(case1);
        assertTrue("someOneOccupationFactor = " + someOneOccupationFactor, someOneOccupationFactor == 0.3);
        assertTrue("witnessesAgeFactor = " + witnessesAgeFactor, witnessesAgeFactor == 0.3);
        assertTrue("witnessesRelationshipFactor = " + witnessesRelationshipFactor, witnessesRelationshipFactor == 0.3);
    }

    public void testVeryGoodAccount() {
        Case sampleCase = new CaseImpl("Sample case");
        Investigation investigation = new org.rr0.im.business.investigation.InvestigationImpl(sampleCase);
        Interview interview = new FaceToFaceInterviewImpl("First interview");
        Locale locale = Locale.getDefault();
        InterviewSession interviewSession = interview.createSession(locale);
        Being witness = (Being) interviewSession.getObject();
        investigation.getActs().add(interview);
        String accountText = "I saw a bright light";
        Account account = new TextAccountImpl("Very good account", investigation, accountText);
        CaseReliability accountQuality = new CaseReliabilityImpl();
        double someOneOccupationFactor = accountQuality.getOccupationFactor(witness);
        double witnessesAgeFactor = accountQuality.getWitnessesAgeFactor(account);
        double witnessesRelationshipFactor = accountQuality.getWitnessesRelationshipFactor(sampleCase);
        assertTrue("someOneOccupationFactor = " + someOneOccupationFactor, someOneOccupationFactor == 0.3);
        assertTrue("witnessesAgeFactor = " + witnessesAgeFactor, witnessesAgeFactor == 0.3);
        assertTrue("witnessesRelationshipFactor = " + witnessesRelationshipFactor, witnessesRelationshipFactor == 0.3);
    }

    protected void tearDown() {
        // Nettoyage fin de test
    }
}
