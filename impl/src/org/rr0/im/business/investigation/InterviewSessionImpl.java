package org.rr0.im.business.investigation;

import org.rr0.im.business.event.RelationshipImpl;
import org.rr0.im.business.event.TimeLine;

import java.util.*;

/**
 * A performed interview.
 *
 * @author  $Author: javarome $
 * @version  $Date: 2005/06/06 19:53:55 $
 */
public class InterviewSessionImpl extends RelationshipImpl implements InterviewSession {
    private ResourceBundle questionsBundle;

    /**
     * Answers provided during this session.
     */
    private Hashtable answers;

    /**
     * Iteration of the interview's questions.
     */
    private Enumeration questionsIterator;

    /**
     * The question currently asked in this session.
     */
    private Question currentQuestion;

    /**
     *
     * @param interview
     * @param locale
     */
    public InterviewSessionImpl(Interview interview, Locale locale) {
        super(interview.getTitle());
        setInterview(interview, locale);
    }

    private void setInterview(Interview interview, Locale locale) {
        setBundle(interview.getTitle(), locale);
        TimeLine questions = interview.getQuestions();
        answers = new Hashtable(questions.size());
        questionsIterator = questions.iterator();
    }

    private void setBundle(String name, Locale locale) {
        try {
            questionsBundle = ResourceBundle.getBundle(name, locale);
        } catch (Exception e) {
            System.err.println("Could not find bundle \"" + name + "\" for locale " + locale);
            // Supported
        }
    }

    /**
     * Provide the next question to ask, according to the locale configured for this session.
     *
     * @return An object to use to display the question (a String to print typically)
     * @throws NoSuchElementException If no more questions are available for this session.
     */
    public Question nextQuestion() {
        currentQuestion = (Question) questionsIterator.nextElement();
        return currentQuestion;
    }

    public String localizedString(String questionKey) {
        String questionContent;
        if (questionsBundle == null) {
            questionContent = questionKey;
        } else {
            try {
                questionContent = questionsBundle.getString(questionKey);
            } catch (MissingResourceException e) {
                System.err.println("Can't find resource \"" + questionKey + "\" in " + questionsBundle);
                throw e;
            }
        }
        return questionContent;
    }

    public boolean hasPreviousQuestion() {
        throw new RuntimeException ("Not implemented");
    }

    /**
     * Gives an answer to the last asked question.
     *
     * @param answer The answer
     */
    public void answer(Object answer) {
        String questionKey = currentQuestion.getTitle();
        answers.put(questionKey, answer);
    }

    public boolean hasNextQuestion() {
        return questionsIterator.hasMoreElements();
    }

    public Hashtable getAnswers() {
        return answers;
    }
}
