package org.rr0.im.service;

import junit.framework.TestCase;
import org.rr0.im.business.actor.*;
import org.rr0.im.business.event.SightingImpl;
import org.rr0.im.business.event.TimeLine;
import org.rr0.im.business.event.circumstance.*;
import org.rr0.im.business.investigation.*;
import org.rr0.im.business.report.*;
import org.rr0.im.service.function.MatrixFunctionImpl;
import org.rr0.im.service.function.MatrixFunction;

import java.net.URL;
import java.io.IOException;
import java.util.*;

/**
 * A test case about building a questionnaire.
 *
 * @author Jérôme Beau
 * @version 21 avr. 2003 16:18:28
 */
public class QuestionnaireTest extends TestCase {
    public QuestionnaireTest(String someTestName) {
        super(someTestName);
    }

    /**
     * An questionnaire with arbitrary questions
     */
    public void testWitnessQuestionnaire() {
        Locale locale = Locale.getDefault();
        Questionnaire witnessQuestionnaire = new InterviewQuestionnaire("org.rr0.im.service.WitnessQuestionnaire");
        TimeLine questions = witnessQuestionnaire.getQuestions();
        final int QUESTIONS_COUNT = 10;
        questions.add(new FreeTextQuestionImpl("Lastname"));
        questions.add(new FreeTextQuestionImpl("Firstname"));
        questions.add(new FreeTextQuestionImpl("Address"));
        questions.add(new FreeTextQuestionImpl("ZIPCode"));
        questions.add(new FreeTextQuestionImpl("City"));
        String[] countries = new String[]{"USA", "Canada", "Mexico", "Argentina", "Australia"
            , "Belgium", "Brazil", "Chile", "China", "Egypt", "Franc", "Germany", "GreatBritain", "India", "Indonesia",
            "Israel", "Italy", "Iran", "Japan", "Korea", "NewZealand", "Nigeria", "Pakistan", "Philippines", "Poland",
            "Portugal", "Russia", "SouthAfrica", "Spain", "Switzerland", "Thailand", "Turkey", "Ukraine", "Vietnam",
            "Africa", "Arctic", "Antarctic", "Asia", "Caribbean", "CentralAmerica", "Europe", "MiddleEast",
            "SouthAmerica", "PacificIslands", "Scandinavia"};
        Vector countriesVector = new Vector();
        for (int i = 0; i < countries.length; i++) {
            String country = countries[i];
            countriesVector.add (country);
        }
        questions.add(new ChoiceQuestionImpl("Country", countriesVector));
        questions.add(new FreeTextQuestionImpl("Phone"));
        questions.add(new FreeTextQuestionImpl("EMail"));
        questions.add(new FreeTextQuestionImpl("LedToSighting"));
        questions.add(new FreeTextQuestionImpl("DoingWhenSighting"));
        assertEquals("Expected " + QUESTIONS_COUNT + " questions", QUESTIONS_COUNT, questions.size());

        InterviewSession interviewSession = witnessQuestionnaire.createSession(locale);

        Identity ufoAtHomeIdentity = new IdentityImpl("UFO@home");
        Actor interviewer = new OrganizationImpl(ufoAtHomeIdentity);
        interviewSession.setSubject(interviewer);

        Identity intervieweeIdentity = new IdentityImpl("Interviewee");
        HumanBeing interviewee = new HumanBeingImpl(intervieweeIdentity);
        interviewSession.setObject(interviewee);

        int i = 0;
        while (interviewSession.hasNextQuestion()) {
            Object question = interviewSession.nextQuestion();
            System.out.print(ufoAtHomeIdentity.getName() + ": " + question + " -> ");
            String answer = "answer" + i++;
            System.out.println(answer);
            interviewSession.answer(answer);
        }
        assertEquals("Expected to ask " + QUESTIONS_COUNT + " questions", QUESTIONS_COUNT, i);

        i = 0;
        Map answers = interviewSession.getAnswers();
        Iterator iterator = answers.entrySet().iterator();
        while (iterator.hasNext()) {
            Map.Entry entry = (Map.Entry) iterator.next();
            System.out.println(entry.getKey() + "=" + entry.getValue());
            i++;
        }
        assertEquals("Expected to retrieve " + QUESTIONS_COUNT + " answers", QUESTIONS_COUNT, i);
    }

    /**
     * A questionnaire whose questions are derived from a bean's properties
     */
    public void testBeanQuestionnaire() {
        Locale locale = Locale.ENGLISH;
        Object bean = new FrenchAddressImpl();
        Questionnaire beanQuestionnaire = QuestionnaireFactoryImpl.create(bean);
        InterviewSession interviewSession = beanQuestionnaire.createSession(locale);

        Identity ufoAtHomeIdentity = new IdentityImpl("UFO@home");
        Actor interviewer = new OrganizationImpl(ufoAtHomeIdentity);
        interviewSession.setSubject(interviewer);

        Identity intervieweeIdentity = new IdentityImpl("Interviewee");
        HumanBeing interviewee = new HumanBeingImpl(intervieweeIdentity);
        interviewSession.setObject(interviewee);

        int i = 0;
        while (interviewSession.hasNextQuestion()) {
            Object question = interviewSession.nextQuestion();
            System.out.print(ufoAtHomeIdentity.getName() + ": " + question + " -> ");
            String answer = "answer" + i++;
            System.out.println(answer);
            interviewSession.answer(answer);
        }
        assertEquals("Expected to ask " + 3 + " questions", 3, i);

        i = 0;
        Map answers = interviewSession.getAnswers();
        Iterator iterator = answers.entrySet().iterator();
        while (iterator.hasNext()) {
            Map.Entry entry = (Map.Entry) iterator.next();
            System.out.println(entry.getKey() + "=" + entry.getValue());
            i++;
        }
        assertEquals("Expected to retrieve " + 3 + " answers", 3, i);
    }

    /**
     * A questionnaire whose questions are derived from a bean's properties
     */
    public void testPoherMatrixBeanQuestionnaire() throws IOException {
        Locale locale = Locale.FRENCH;

        Case cussacCase = new CaseImpl("Cussac");
        Moment cussacDate = new PreciseMomentImpl(1967, 8, 29, 10, 30);
        Location cussacLocation = new EarthLocationImpl(2.93F, OrientationImpl.WEST, 44.98F, OrientationImpl.NORTH);
        Place cussac = new PlaceImpl("Cussac", cussacLocation);
        Identity francoisIdentity = new IdentityImpl("François Delpeuch");
        HumanBeing francois = new HumanBeingImpl(francoisIdentity);
        Source source = null;
        SightingImpl francoisSighting = new SightingImpl("Cussac", cussacDate, cussac, francois, source);
        Investigation poherInvestigation = new InvestigationImpl(cussacCase);
        Account account = new EventsAccountImpl("Poher's investigation", poherInvestigation);
        Collection events = (Collection) account.getContent();
        events.add(francoisSighting);

        URL matrixFile = MatrixFunctionImpl.class.getResource("/org/rr0/im/service/function/matrix.csv");
        MatrixFunctionImpl bean = new MatrixFunctionImpl(matrixFile.openStream());

//        Map values = bean.getValues(account);
        fail("not implemented")   ;
    }

    /**
     * A questionnaire whose questions are derived from a bean's properties
     */
    public void testPoherMatrixQuestionnaire() throws IOException {
        String name = "PoherMatrix";
        final int PARAMETERS_COUNT = 18;
        Hashtable cussacAnswers = new Hashtable();
        cussacAnswers.put ("HynekClassification", new String[]{"HynekClassification.CloseEncounter3"});
        cussacAnswers.put ("Date", new String[]{"Date.AnyAndNonVisibleCelestialBody"});
        cussacAnswers.put ("Place", new String[]{"Place.NearGivenSite"});
        cussacAnswers.put ("Hour", new String[]{"Hour.Day"});
        cussacAnswers.put ("Duration", new String[]{"Duration.LessThan10s"});
        cussacAnswers.put ("WeatherConditions", new String[]{"WeatherConditions.NiceAndAlmostClearSky"});
        cussacAnswers.put ("Distance", new String[]{"Distance.Between150And200m"});
        cussacAnswers.put ("Noise", new String[]{"Noise.Perceived"});
        cussacAnswers.put ("AngularHeight", new String[]{"AngularHeight.LowOnHorizon", "AngularHeight.HighInSky"});
        cussacAnswers.put ("Path", new String[]{"Path.Complex", "Path.Landing"});
        cussacAnswers.put ("AngularSpeed", new String[]{"AngularSpeed.Variable"});
        cussacAnswers.put ("ApparentSize", new String[]{"ApparentSize.SeveralDegrees"});
        cussacAnswers.put ("ObjectsCount", new String[]{"ObjectsCount.Single"});
        cussacAnswers.put ("ObjectShape", new String[]{"ObjectShape.Round"});
        cussacAnswers.put ("Color", new String[]{"Color.White"});
        cussacAnswers.put ("Luminosity", new String[]{"Luminosity.Intense"});
        cussacAnswers.put ("IndependentWitnessesCount", new String[]{"IndependentWitnessesCount.Several"});
        cussacAnswers.put ("WitnessReaction", new String[]{"WitnessReaction.EmotionFear"});
        matrixFunction(name, PARAMETERS_COUNT, cussacAnswers);
    }

    /**
     * A questionnaire whose questions are derived from a bean's properties
     */
    public void testHynekClassificationQuestionnaire() throws IOException {
        String name = "HynekClassification";
        final int PARAMETERS_COUNT = 16;
        Hashtable cussacAnswers = new Hashtable();
        cussacAnswers.put ("ObjectShape", new String[]{"ObjectShape.Sphere"});
        cussacAnswers.put ("Color", new String[]{"Color.White"});
        cussacAnswers.put ("ObjectsCount", new String[]{"ObjectsCount.Single"});
        cussacAnswers.put ("Trace", new String[]{"Trace.OnGround"});
        cussacAnswers.put ("Path", new String[]{"Path.Landing", "Path.Complex", "Path.AbruptClimbOrFall" });
        cussacAnswers.put ("AngularHeight", new String[]{ });
        cussacAnswers.put ("Luminosity", new String[]{ "Luminosity.Intense" });
        cussacAnswers.put ("CouldBe", new String[]{ });
        cussacAnswers.put ("Strangeness", new String[]{ "Strangeness.High" });
        cussacAnswers.put ("Occupants", new String[]{ "Occupants.Sighted" });
        matrixFunction(name, PARAMETERS_COUNT, cussacAnswers);
    }

    private void matrixFunction(String name, int parameterCount, Hashtable cussacAnswers) throws IOException {
        URL matrixFile = MatrixFunctionImpl.class.getResource("/org/rr0/im/service/function/"+name+".csv");
        MatrixFunction matrixFunction = new MatrixFunctionImpl(matrixFile.openStream());

        Questionnaire witnessQuestionnaire = new InterviewQuestionnaire("org.rr0.im.service.function." + name);
        TimeLine questions = witnessQuestionnaire.getQuestions();

        Hashtable matrix = matrixFunction.getMatrix();

        Hashtable questionStrings = new Hashtable();
        Enumeration parameterNames = matrix.keys();
        while (parameterNames.hasMoreElements()) {
            String parameter = (String) parameterNames.nextElement();
            int dotPos = parameter.indexOf('.');
            String parameterName = parameter.substring(0, dotPos);
            Vector choices = (Vector) questionStrings.get(parameterName);
            if (choices == null) {
                choices = new Vector();
                questionStrings.put(parameterName, choices);
            }
            choices.add (parameter);
        }

        Enumeration iterator1 = questionStrings.keys();
        while (iterator1.hasMoreElements()) {
            String parameterName = (String) iterator1.nextElement();
            Vector choices = (Vector) questionStrings.get(parameterName);
            MultipleChoiceQuestion question = new MultipleChoiceQuestionImpl(parameterName, choices);
            questions.add(question);
        }

        Locale locale = Locale.FRENCH;
        InterviewSession interviewSession = witnessQuestionnaire.createSession(locale);

        assertEquals("Expected " + parameterCount + " questions", parameterCount, questions.size());


        Identity gepanIdentity = new IdentityImpl("GEPAN");
        Actor interviewer = new OrganizationImpl(gepanIdentity);
        interviewSession.setSubject(interviewer);

        Identity intervieweeIdentity = new IdentityImpl("Witness");
        HumanBeing interviewee = new HumanBeingImpl(intervieweeIdentity);
        interviewSession.setObject(interviewee);

        int i = 0;
        while (interviewSession.hasNextQuestion()) {
            Question question = interviewSession.nextQuestion();
            System.out.print(gepanIdentity.getName() + ": ");
            String questionKey = question.getTitle();
            System.out.print(interviewSession.localizedString(questionKey));
            ChoiceQuestion choiceQuestion = (ChoiceQuestion) question;
            System.out.println();
            Vector choices = choiceQuestion.getChoices();
            Enumeration enumeration = choices.elements();
            for (int j = 0; enumeration.hasMoreElements(); j++) {
                String choice = (String) interviewSession.localizedString((String) enumeration.nextElement());
                System.out.println((j + 1) + ". " + choice);
            }
            Identity intervieweeLabel = (Identity) interviewee.getIdentities().elementAt(0);
            System.out.print(intervieweeLabel.getName() + " -> ");
            String[] answers = (String[]) cussacAnswers.get(questionKey);

            String SEP = "";
            for (int j = 0; j < answers.length; j++) {
                System.out.print(SEP + interviewSession.localizedString(answers[j]));
                SEP = ", ";
            }
            System.out.println();
            interviewSession.answer(answers);
            System.out.println();
            i++;
        }
        assertEquals("Expected to ask " + parameterCount + " questions", parameterCount, i);

        Map expectedZeros = new HashMap();
        expectedZeros.put("Moon", new Integer(10));
        expectedZeros.put("Sun", new Integer(9));
        expectedZeros.put("Planets", new Integer(10));
        expectedZeros.put("Stars", new Integer(10));
        expectedZeros.put("Meteorits", new Integer(5));
        expectedZeros.put("BorealAuroras", new Integer(9));
        expectedZeros.put("OrbitingSatellites", new Integer(11));
        expectedZeros.put("AtmosphericSatellitesReentry", new Integer(3));
        expectedZeros.put("RocketLaunch", new Integer(3));
        expectedZeros.put("StratosphericBalloons", new Integer(5));
        expectedZeros.put("Clouds", new Integer(7));
        expectedZeros.put("NoctiluscentsClouds", new Integer(9));
        expectedZeros.put("IsolatedClouds", new Integer(7));
        expectedZeros.put("Lightning", new Integer(4));
        expectedZeros.put("BallLightning", new Integer(2));
        expectedZeros.put("HighAltitudePlanes", new Integer(9));
        expectedZeros.put("LowAltitudePlanes", new Integer(2));
        expectedZeros.put("Helicopters", new Integer(3));
        expectedZeros.put("WeatherBalloonsOrMongolfieres", new Integer(8));
        expectedZeros.put("Parachute", new Integer(5));
        expectedZeros.put("Birds", new Integer(6));
        expectedZeros.put("Insects", new Integer(6));
        expectedZeros.put("SwampGas", new Integer(10));
        expectedZeros.put("Smokes", new Integer(9));
        expectedZeros.put("Kite", new Integer(7));
        expectedZeros.put("OpticalIllusions", new Integer(6));
        expectedZeros.put("Mirages", new Integer(9));
        expectedZeros.put("Hallucination", new Integer(1));
        expectedZeros.put("PureInvention", new Integer(1));
        expectedZeros.put("TerrestrialVehicle", new Integer(5));
        expectedZeros.put("Boat", new Integer(7));
        expectedZeros.put("SpotlightsOnClouds", new Integer(5));
        expectedZeros.put("SmallObjectsFloatingInWind", new Integer(9));

        Vector ascendingZeroCount = new Vector();
        Vector labels = new Vector();
        Hashtable values = matrixFunction.getValues(interviewSession.getAnswers());
        Enumeration iterator2 = values.keys();
        while (iterator2.hasMoreElements()) {
            Object phenomenon = iterator2.nextElement();
            Float zeroCount = (Float) values.get (phenomenon);
            System.out.println(phenomenon + " has " + zeroCount + " zeros");
            Object expectedZerosForThisPhenomenon = expectedZeros.get(phenomenon);
        //            assertEquals("Wrong number of zeros for phenomenon " + phenomenon + ".", expectedZerosForThisPhenomenon, zeroCount);

            int pos = labels.size();
            while (pos > 0 && ((Float) ascendingZeroCount.get(pos - 1)).intValue() > zeroCount.floatValue()) {
                pos--;
            }
            if (pos == labels.size()) {
                ascendingZeroCount.add(zeroCount);
                labels.add(phenomenon);
            } else {
                ascendingZeroCount.insertElementAt(zeroCount, pos);
                labels.insertElementAt(phenomenon, pos);
            }
        }

        System.out.println();
        printMostLilelyExplanations(ascendingZeroCount, labels, interviewSession);
    }

    private void printMostLilelyExplanations(Vector ascendingZeroCount, Vector labels, InterviewSession interviewSession) {
        System.out.println("Most likely explanations:");
        Float lastProb = (Float) ascendingZeroCount.get(0);
        String toPrint = "";
        String SEP = "";
        for (int j = 0; j < labels.size(); j++) {
            Float prob = (Float) ascendingZeroCount.get(j);
            if (prob.floatValue() != lastProb.floatValue()) {
                System.out.println (lastProb + ". " + toPrint);
                toPrint = "";
                SEP = "";
            }
            toPrint += SEP + interviewSession.localizedString((String) labels.elementAt(j));
            SEP = ", ";
            lastProb = prob;
        }
        System.out.println (lastProb + ". " + toPrint);
    }

    protected void tearDown() {
        // Nettoyage fin de test
    }
}
