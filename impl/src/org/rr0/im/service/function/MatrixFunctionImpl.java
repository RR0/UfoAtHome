package org.rr0.im.service.function;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.Enumeration;
import java.util.Hashtable;
import java.util.StringTokenizer;
import java.util.Vector;

/**
 * Account quality computation, indicating the "strength" that a report has for analysis
 * based on how it was acquired.
 *
 * @author Claude Poher (GEPAN, 1977) for specification.
 * @author Jerome Beau for implementation.
 * @version $Date: 2005/06/06 19:59:23 $
 */
public class MatrixFunctionImpl implements MatrixFunction {
    /**
     * The known phenomenons
     */
    private Vector phenomenons;

    /**
     * Parameter value for each known phenomenon, indexed by parameter name
     */
    private Hashtable matrix = new Hashtable();

    public MatrixFunctionImpl(InputStream inputStream) {
        readMatrix(inputStream);
    }

    private void readMatrix(InputStream inputStream) {
        try {
            BufferedReader bufferedReader = new BufferedReader(new InputStreamReader(inputStream));
            String line = null;
            do {
                line = bufferedReader.readLine();
                if (line != null) {
                    if (phenomenons == null) {
                        readPhenomenons(line);
                    } else {
                        readParameterValues(line);
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
    private void readPhenomenons(String line) {
        phenomenons = new Vector();
        StringTokenizer st = new StringTokenizer(line, "\t ,");
        while (st.hasMoreTokens()) {
            phenomenons.addElement(st.nextToken());
        }
    }

    private void readParameterValues(String line) {
        StringTokenizer st = new StringTokenizer(line, "\t ,");
        String parameterName = st.nextToken();
        String parameterType = st.nextToken();
        Hashtable parameterLine = new Hashtable();
        matrix.put(parameterName, parameterLine);
        Enumeration iterator = phenomenons.elements();
        while (iterator.hasMoreElements()) {
            String phenomenon = (String) iterator.nextElement();
            Float value = Float.valueOf(st.nextToken());
            parameterLine.put(phenomenon, value);
        }
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
            Float zeroCount = new Float (0);
            values.put(phenomenon, zeroCount);
        }

        Enumeration answersIterator = interviewAnswers.elements();
        while (answersIterator.hasMoreElements()) {
            Object answer = answersIterator.nextElement();
            if (answer instanceof String[]) {
                String[] answers = (String[]) answer;
                for (int i = 0; i < answers.length; i++) {
                    String answerString = answers[i];
                    processAnswer(answerString, values, i);
                }
            } else if (answer instanceof Vector) {
                Vector answers = (Vector) answer;
                for (int i = 0; i < answers.size(); i++) {
                    String answerString = (String) answers.elementAt(i);
                    processAnswer(answerString, values, i);
                }
            }
        }
        return values;
    }

    private void processAnswer(String answer, Hashtable values, int i) {
        Hashtable parameterValues = (Hashtable) matrix.get(answer);

        if (parameterValues != null) {
            Enumeration iterator1 = parameterValues.keys();
            while (iterator1.hasMoreElements()) {
                Object phenomenon = iterator1.nextElement();
                Float zeroCount = (Float) values.get(phenomenon);
                Float phenomenonProbabilityWithThisParameter = (Float) parameterValues.get(phenomenon);
//                if (phenomenonProbabilityWithThisParameter.floatValue() == 0) {
                    zeroCount = new Float(zeroCount.floatValue() + phenomenonProbabilityWithThisParameter.floatValue());
//                }
                values.put(phenomenon, zeroCount);
            }
        }
    }

    /**
     *
     */
/*
    public Hashtable getValues(Account someAccount) {
        Hashtable values = new Hashtable();

        Object content = someAccount.getContent();
        if (content instanceof Collection) {
            Collection events = ((Collection) content);
            Iterator eventsIterator = events.iterator();
            while (eventsIterator.hasNext()) {
                Object event = (Object) eventsIterator.next();
                if (event instanceof Sighting) {
                    Sighting sighting = ((Sighting) event);

                    Classification hynekClassification = HynekClassificationImpl.getInstance();
                    Category hynekCategory = hynekClassification.getCategory(sighting);

                    Object row = matrix.get(hynekCategory.getName());
                    // TODO(JBE):
                }
            }
        }
        return values;
    }
*/

        public String getName() {
        return "KnownPhenomenaMatrix";
    }
}
