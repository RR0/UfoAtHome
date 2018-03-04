package org.rr0.im.business.investigation;

import org.rr0.im.business.event.TimeLine;
import org.rr0.im.business.event.TimeLineImpl;

import java.util.Locale;

/**
 * Interview Reference Implementation.
 *
 * @author Jerome Beau
 * @version 9 aout 2003
 */
public abstract class InterviewImpl implements Interview {
    private TimeLine questions;

    public InterviewImpl(String someTitle) {
        questions = new TimeLineImpl(someTitle);
    }

    public String getTitle() {
        return questions.getTitle();
    }

    /**
     * Return questions and associated answers
     */
    public TimeLine getQuestions() {
        return questions;
    }

    public InterviewSession createSession(Locale locale) {
        return new InterviewSessionImpl(this, locale);
    }
}

