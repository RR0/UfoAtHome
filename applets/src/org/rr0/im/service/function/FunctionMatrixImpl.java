package org.rr0.im.service.function;

import org.rr0.im.business.investigation.Question;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.Enumeration;
import java.util.Hashtable;
import java.util.StringTokenizer;
import java.util.Vector;
import java.lang.reflect.Constructor;
import java.lang.reflect.InvocationTargetException;

/**
 * <p>A function that compute its results from a matrix.</p>
 * <p>The matrix have the following format :</p>
 * <ul>
 * <li>,KnownResult1,KnownResult2,KnownResult3,...</li>
 * <li>Question.Answer1,Question1Type,MatrixValues1...</li>
 * <li>Question.Answer2,Question2Type,MatrixValues2...</li>
 * </ul>
 * <p>Where QuestionType can be :</p>
 * <ul>
 * <li>Choice</li> for a question with exclusive answers (radio button type)
 * <li>MultipleChoice</li> for a question with non-exclusive answers (checkbox type)
 * <li>Text(n)</li> for a question textual answer of n characters max (textarea type)
 * <li>Text(n)</li> for a question textual answer of n characters max (textarea type)
 * </ul>
 *
 * @author $Author: javarome $
 * @version $Date: 2005/08/17 21:38:52 $
 */
public class FunctionMatrixImpl {
    /**
     * The known phenomenons
     */
    private Vector phenomenons;

    /**
     * The question implementation for a given question type  
     */
    private String[][] questionTypes = {
        { "MultipleChoice", "org.rr0.im.business.MultipleChoiceQuestionImpl" },
        { "Choice", "org.rr0.im.business.ChoiceQuestionImpl" },
        /* Free text questions cannot be supported by matrix functions that give weight to predefined answers */
    };

    /**
     * Parameter value for each known phenomenon, indexed by parameter name
     */
    private Hashtable matrix = new Hashtable();

    public FunctionMatrixImpl(InputStream inputStream) {
        readMatrix(inputStream);
    }

    private void readMatrix(InputStream inputStream) {
        try {
            BufferedReader bufferedReader = new BufferedReader(new InputStreamReader(inputStream));
            String line;
            do {
                line = bufferedReader.readLine();
                if (line != null) {
                    if (phenomenons == null) {
                        parsePhenomenonsLine(line);
                    } else {
                        parseParameterLine(line);
                    }
                }
            } while (line != null);
        } catch (IOException e) {
            throw new RuntimeException(e.getClass().getName() + ": " + e.getMessage());
        }
    }

    /**
     * Read the line of known phenomenons.
     *
     * @param line The text line to parse
     */
    private void parsePhenomenonsLine(String line) {
        phenomenons = new Vector();
        StringTokenizer st = new StringTokenizer(line, "\t ,");
        while (st.hasMoreTokens()) {
            phenomenons.addElement(st.nextToken());
        }
    }

    private void parseParameterLine(String line) {
        StringTokenizer st = new StringTokenizer(line, "\t ,");
        String parameterName = st.nextToken();
        String parameterType = st.nextToken();
        if (parameterType.length() == 0) {
            parameterType = questionTypes[0][0];
        }
        Question question = getQuestion (parameterType, parameterName);
        Hashtable parameterLine = new Hashtable();
        matrix.put(question, parameterLine);
        Enumeration iterator = phenomenons.elements();
        while (iterator.hasMoreElements()) {
            String phenomenon = (String) iterator.nextElement();
            Float value = Float.valueOf(st.nextToken());
            parameterLine.put(phenomenon, value);
        }
    }

    private Question getQuestion(String parameterType, String parameter) {
        int dotPos = parameter.indexOf('.');
        String parameterName = parameter.substring(0, dotPos);
        Question question = (Question) matrix.get(parameterName);
/*
        if (choices == null) {
            choices = new Vector();
            questionStrings.put(parameterName, choices);
        }
        choices.add (parameter);
*/

        for (int i = 0; i < questionTypes.length; i++) {
            String[] questionType = questionTypes[i];
            if (questionType[0].equals(parameterType)) {
                String questionClassName = questionType[1];
                try {
                    Class questionClass = Class.forName(questionClassName);
                    Constructor questionConstructor = questionClass.getConstructor(new Class[]{String.class});
                    Question question2 = (Question) questionConstructor.newInstance(new Object[] { parameter });

                    return question2;
                } catch (ClassNotFoundException e) {
                    throw new RuntimeException ("Could not find question implementation class: " + e.getClass().getName() + ": " + e.getMessage());
                } catch (NoSuchMethodException e) {
                    throw new RuntimeException ("Could not find String constructor for question implementation class: " + e.getClass().getName() + ": " + e.getMessage());
                } catch (IllegalAccessException e) {
                    throw new RuntimeException ("Could not access String constructor for question implementation class: " + e.getClass().getName() + ": " + e.getMessage());
                } catch (InvocationTargetException e) {
                    throw new RuntimeException ("Could not invoke String constructor for question implementation class: " + e.getClass().getName() + ": " + e.getMessage());
                } catch (InstantiationException e) {
                    throw new RuntimeException ("Could not instantiate question implementation class: " + e.getClass().getName() + ": " + e.getMessage());
                }
            }
        }
        throw new RuntimeException ("Could not create question of type \"" + parameterType + "\" and title \"" + parameter + "\"");
    }

    public Vector getPhenomenons() {
        return phenomenons;
    }

    public Hashtable getMatrix() {
        return matrix;
    }

    /**
     *
     */
    public Hashtable getValues(Hashtable interviewAnswers) {
        Hashtable values = new Hashtable();

        // Initialize values to zeros
        Enumeration iterator = phenomenons.elements();
        while (iterator.hasMoreElements()) {
            Object phenomenon = iterator.nextElement();
            Integer zeroCount = new Integer(0);
            values.put(phenomenon, zeroCount);
        }

        Enumeration answersIterator = interviewAnswers.elements();
        while (answersIterator.hasMoreElements()) {
            Object answer = answersIterator.nextElement();
            if (answer instanceof String[]) {
                String[] answers = (String[]) answer;
                for (int i = 0; i < answers.length; i++) {
                    String oneAnswer = answers[i];
                    processAnswer(oneAnswer, values);
                }
            } else if (answer instanceof Vector) {
                Vector answers = (Vector) answer;
                Enumeration enumeration = answers.elements();
                while (enumeration.hasMoreElements()) {
                    Object oneAnswer = enumeration.nextElement();
                    processAnswer(oneAnswer, values);
                }
            }
        }
        return values;
    }

    private void processAnswer(Object oneAnswer, Hashtable values) {
        Hashtable parameterValues = (Hashtable) matrix.get(oneAnswer);

        if (parameterValues != null) {
            Enumeration iterator1 = parameterValues.keys();
            while (iterator1.hasMoreElements()) {
                Object phenomenon = iterator1.nextElement();
                Integer zeroCount = (Integer) values.get(phenomenon);
                Float phenomenonProbabilityWithThisParameter = (Float) parameterValues.get(phenomenon);
                if (phenomenonProbabilityWithThisParameter.floatValue() == 0) {
                    zeroCount = new Integer(zeroCount.intValue() + 1);
                }
                values.put(phenomenon, zeroCount);
            }
        }
    }

    public String getName() {
        return "KnownPhenomenaMatrix";
    }
}
