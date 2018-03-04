package org.rr0.im.business.investigation;

import org.rr0.im.business.event.RelationshipImpl;
import org.rr0.im.business.event.circumstance.Moment;

/**
 * @author Jérôme Beau
 * @version 9 august 2003
 */
public class QuestionImpl extends RelationshipImpl implements Question {

    public QuestionImpl(String title, Moment startDate) {
        super(title, startDate);
    }
}

