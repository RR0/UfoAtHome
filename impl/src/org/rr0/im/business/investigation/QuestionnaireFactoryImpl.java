package org.rr0.im.business.investigation;

import org.rr0.im.business.event.TimeLine;

import java.lang.reflect.Method;

/**
 * Creates questionnaires to fill beans info.
 *
 * @author Jerome Beau
 * @version 0.3
 */
public class QuestionnaireFactoryImpl implements QuestionnaireFactory {
    public static final String SET_PREFIX = "set";

    public static Questionnaire create(Object beanToFill) {
        Class beanClass = beanToFill.getClass();
        String questionnaireTitle = beanClass.getName();
        Questionnaire questionnaire = new InterviewQuestionnaire(questionnaireTitle);
        TimeLine questions = questionnaire.getQuestions();
        Method[] methods = beanClass.getMethods();
        for (int i = 0; i < methods.length; i++) {
            Method method = methods[i];
            String methodName = method.getName();
            if (methodName.startsWith(SET_PREFIX)) {
                String propertyName = methodName.substring(SET_PREFIX.length());
                Question question = new FreeTextQuestionImpl(propertyName);
                questions.add(question);
            }
        }
        return questionnaire;
    }
}
