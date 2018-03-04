package org.rr0.im.business.investigation;

import org.rr0.im.business.event.circumstance.Moment;

/**
 * @author Jerome Beau
 * @version 0.3
 */
public class FreeTextQuestionImpl extends QuestionImpl implements FreeTextQuestion {
    public FreeTextQuestionImpl(String someTitle) {
        super(someTitle);
    }

    public FreeTextQuestionImpl(String title, Moment startDate) {
        super(title, startDate);
    }
}

