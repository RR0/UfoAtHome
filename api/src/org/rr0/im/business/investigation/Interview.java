package org.rr0.im.business.investigation;

import org.rr0.im.business.event.TimeLine;

import java.util.Locale;

/**
 * <p>Interview Event.</p>
 * <ul>
 * <li>The subject of this Event is the interviewer being</li>
 * <li>The object of this Event is the interviewed being</li>
 * </ul>
 *
 * @author Jérôme Beau
 * @version 15 juin 2003 18:01:16
 */
public interface Interview {
    String getTitle();

    /**
     * Return questions and associated answers
     *
     * @return
     * @associates <{org.rr0.im.business.investigation.Question}>
     * @supplierCardinality 1..*
     * @supplierQualifier questions
     */
    TimeLine getQuestions();

    /**
     * Creates a new session of this interview.
     *
     * @param locale The locale the session must use
     * @return The created session
     */
    InterviewSession createSession(Locale locale);

    /** @link dependency 
     * @stereotype instantiate*/
    /*# InterviewSession lnkInterviewSession; */
}
