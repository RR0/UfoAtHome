package org.rr0.im.business.investigation;

import java.util.Vector;

/**
 * @author Jerome Beau
 * @version $Revision: 1.3 $
 */
public class ChoiceQuestionImpl extends QuestionImpl implements ChoiceQuestion {
    private Vector choices;

    public ChoiceQuestionImpl(String someTitle, Vector choices) {
        super(someTitle);
        this.choices = choices;
    }

    public Vector getChoices() {
        return choices;
    }
}

