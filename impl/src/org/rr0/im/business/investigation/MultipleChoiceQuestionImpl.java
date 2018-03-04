package org.rr0.im.business.investigation;

import java.util.Vector;

/**
 * @author Jerome Beau
 * @version $Revision: 1.2 $
 */
public class MultipleChoiceQuestionImpl extends ChoiceQuestionImpl implements MultipleChoiceQuestion {
    public MultipleChoiceQuestionImpl(String someTitle, Vector choices) {
        super(someTitle, choices);
    }
}

