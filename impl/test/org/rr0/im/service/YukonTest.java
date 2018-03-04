package org.rr0.im.service;

import junit.framework.TestCase;
import org.rr0.im.business.actor.HumanBeing;
import org.rr0.im.business.actor.HumanBeingImpl;
import org.rr0.im.business.investigation.FaceToFaceInterviewImpl;
import org.rr0.im.business.investigation.Interview;
import org.rr0.im.business.investigation.Investigation;
import org.rr0.im.business.investigation.InvestigationImpl;
import org.rr0.im.business.investigation.InvestigationAct;
import org.rr0.im.business.investigation.InterviewSessionImpl;
import org.rr0.im.business.investigation.InterviewSession;
import org.rr0.im.business.report.*;
import org.rr0.im.business.event.Event;
import org.rr0.im.business.event.LeaveEventImpl;
import org.rr0.im.business.event.circumstance.PlaceImpl;
import org.rr0.im.business.event.circumstance.Moment;
import org.rr0.im.business.event.circumstance.IntervalMomentImpl;
import org.rr0.im.business.event.circumstance.PreciseMoment;
import org.rr0.im.business.event.circumstance.PreciseMomentImpl;
import org.rr0.im.business.event.circumstance.DurationImpl;
import org.rr0.im.service.function.AccountQuality;
import org.rr0.im.service.function.AccountQualityImpl;

import java.util.List;
import java.util.Locale;

import com.sun.org.apache.xpath.internal.compiler.*;
import com.sun.org.apache.xpath.internal.compiler.Compiler;

/**
 * @author Jérôme Beau
 * @version 15 juin 2003 15:27:03
 */
public class YukonTest extends TestCase {
    public YukonTest(String someTestName) {
        super(someTestName);
    }

    protected void setUp() {
    }

    public void test1() {
        Case yukonCase = new CaseImpl("Yukon Giant UFO, December 11, 1996");
        Moment sightingDate = new PreciseMomentImpl(1996, 12, 11);

        HumanBeing jasek = new HumanBeingImpl("Martin Jasek");

        HumanBeing fox1 = new HumanBeingImpl("Danny Skookum");
        fox1.addIdentity("FOX1");

        Investigation jasekInvestigation = new InvestigationImpl(yukonCase);
        List<InvestigationAct> investigationActs = jasekInvestigation.getActs();

        Interview fox1Interview = new FaceToFaceInterviewImpl("FOX1 Interview");
        InterviewSession fox1InterviewSession = new InterviewSessionImpl(fox1Interview, Locale.CANADA);
        fox1InterviewSession.setSubject(jasek);
        fox1InterviewSession.setObject(fox1);
        investigationActs.add (fox1InterviewSession);

        PreciseMomentImpl today = new PreciseMomentImpl(System.currentTimeMillis());
        Moment accountMoment = new IntervalMomentImpl(sightingDate, today);
        EventsAccount fox1Account = new EventsAccountImpl("FOX1 Account", jasekInvestigation, accountMoment);
        PlaceImpl braeburnLodge = new PlaceImpl("Braeburn Lodge");
        Moment fox4Arrival = new IntervalMomentImpl(sightingDate, today);
        Moment justBeforeFox4Arrival = new IntervalMomentImpl(fox4Arrival.minus(new DurationImpl(5 * 60 * 1000)), fox4Arrival);
        Event firstEvent = new LeaveEventImpl(justBeforeFox4Arrival, fox1, braeburnLodge);
        fox1Account.getEvents().add (firstEvent);

        AccountQuality accountQuality = new AccountQualityImpl();
        double accountQualityIndex = accountQuality.getValue(fox1Account);
        assertTrue("accountQualityIndex = " + accountQualityIndex, accountQualityIndex == 0.0);
    }

    protected void tearDown() {
        // Nettoyage fin de test
    }
}