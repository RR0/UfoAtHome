package org.rr0.im.business.investigation;

import java.util.Hashtable;

/**
 * @author Jerome Beau
 * @version 17 avr. 2004
 */
public interface InterviewSession extends InvestigationAct {
    /**
     * Provide the next question to ask, according to the locale configured for this session.
     *
     * @return An object to use to display the question (a String to print typically)
     * @throws java.util.NoSuchElementException
     *          If no more questions are available for this session.
     */
    Question nextQuestion();

    /**
     * Gives an answer to the last asked question.
     *
     * @param answer The answer
     */
    void answer(Object answer);

    /**
     * @return If another question is required in this session.
     */
    boolean hasNextQuestion();

    Hashtable getAnswers();

    String localizedString(String questionKey);

    boolean hasPreviousQuestion();
}
