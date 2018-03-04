package org.rr0.im.business.investigation;

import org.rr0.im.business.event.TimeableImpl;
import org.rr0.im.business.event.circumstance.Duration;
import org.rr0.im.business.event.circumstance.Moment;
import org.rr0.im.business.event.circumstance.PreciseMomentImpl;
import org.rr0.im.business.report.Case;

import java.util.List;
import java.util.ArrayList;

/**
 * Investigation Reference Implementation.
 *
 * @author J�r�me Beau
 * @version 18 juin 2003 21:38:03
 */
public class InvestigationImpl extends TimeableImpl implements Investigation {
    private List<InvestigationAct> acts = new ArrayList<InvestigationAct>();
    private Case investigatedCase;

    public InvestigationImpl(Case investigatedCase) {
        super("Investigation on " + investigatedCase);
        this.investigatedCase = investigatedCase;
    }

    /**
     * @return The investigation acts
     */
    public List<InvestigationAct> getActs() {
        return acts;
    }

    /**
     * The investigated case.
     *
     * @return
     */
    public Case getCase() {
        return investigatedCase;
    }

    /**
     * Return the begining of the investigation.
     * This moment is the moment of the first investigation act, chronologically speaking.
     *
     * @return
     */
    public Moment getBegining() {
        Moment firstActMoment = null;
        for (InvestigationAct act : acts) {
            if (act.getBegining().isBefore(firstActMoment)) {
                Moment actBeginingMoment = act.getBegining();
                firstActMoment = actBeginingMoment;
            }
        }
        return firstActMoment;
    }

    /**
     * Return the last moment of the investigation (this doesn't mean that the investigation is closed).
     * This moment is the moment of the last investigation act, chronologically speaking.
     *
     * @return
     */
    public Moment getEnd() {
        Moment lastActMoment = null;
        for (InvestigationAct act : acts) {
            if (act.getBegining().isAfter(lastActMoment)) {
                Moment actEndMoment = act.getEnd();
                lastActMoment = actEndMoment;
            }
        }
        return lastActMoment;
    }

    public Duration getDuration() {
//        return DurationImpl.getInstance (getBegining(), getEnd());
        throw new RuntimeException("Not implemented");
    }
}
