package org.rr0.poher.matrix;

import org.rr0.im.business.actor.Actor;
import org.rr0.im.business.actor.HumanBeing;
import org.rr0.im.business.actor.HumanBeingImpl;
import org.rr0.im.business.actor.Identity;
import org.rr0.im.business.actor.IdentityImpl;
import org.rr0.im.business.actor.OrganizationImpl;
import org.rr0.im.business.event.TimeLine;
import org.rr0.im.business.investigation.InterviewSession;
import org.rr0.im.business.investigation.MultipleChoiceQuestion;
import org.rr0.im.business.investigation.MultipleChoiceQuestionImpl;
import org.rr0.im.business.investigation.Question;
import org.rr0.im.business.investigation.Questionnaire;
import org.rr0.im.business.investigation.InterviewQuestionnaire;
import org.rr0.im.service.function.MatrixFunctionImpl;

import java.applet.Applet;
import java.awt.*;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.ItemEvent;
import java.awt.event.ItemListener;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;
import java.awt.event.TextListener;
import java.awt.event.TextEvent;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.text.NumberFormat;
import java.util.Enumeration;
import java.util.Hashtable;
import java.util.Locale;
import java.util.Vector;

/**
 * This software has been based on a Future Basic program
 * written in 1971 by Claude Poher to draw the statistical charts of UFO testimonials.
 *
 * @author Jérôme Beau
 * @author Claude Poher (1977)
 * @version Java 1.1 to ensure compatibility with oldest browsers.
 */
public class KnownPhenomenonMatrixApplet extends Applet {
    /**
	 * 
	 */
	private static final long serialVersionUID = -2827110560169158102L;

	private static final String DEFAULT_MATRIX_FILENAME = "/org/rr0/im/service/function/PoherMatrix.csv";

    private static Throwable exception;

    private Choice combo = new Choice();
    private Button previousButton;
    private Button nextButton;

    /**
     * If should be run in a separate window
     */
    private boolean windowMode;

    /**
     * The function that computes using the known phenomena matrix
     */
    private MatrixFunctionImpl knownPhenomenonMatrixFunction;

    /**
     * The session of questions/answers
     */
    private InterviewSession interviewSession;

    /**
     * The question currently asked
     */
    private Question currentQuestion;

    private Panel choicePanel;

    /**
     * The current function result : probable explanations
     */
    private List explanations;

    /**
     * If the result is to be displayed as positive (known explanations by order of likeliness)
     * or negative (known explanations by order of non-likeliness)
     */
    private boolean positiveResult;

    private String bundleName;
    public Label credibilityLabel;
    public Label strangenessLabel;
    public Label informationLabel;

	private String credibilityText;

	private String summaryText;

	private String informationText;

    /**
     * Initialize the applet.
     * <p/>
     * Called just after applet instanciation.
     */
    public void init() {
        System.out.println("init");
        super.init();
        try {
            parseParameters();
            readData();

            NumberFormat format = NumberFormat.getInstance();
            format.setMaximumFractionDigits(1);

            setLayout(new GridBagLayout());

            GridBagConstraints constraints = new GridBagConstraints();
            constraints.gridx = 0;
            constraints.gridy = 0;
            constraints.gridwidth = 2;
            Panel selectPanel = createSelectPanel();
            add(selectPanel, constraints);

            constraints.gridy++;
            constraints.fill = GridBagConstraints.BOTH;
            constraints.weightx = 1;
            choicePanel = new Panel() {
                public Dimension getMinimumSize() {
                    int heigth = 0;
                    int y = 0;
                    Component[] components = getComponents();
                    int componentHeight = components[0].getSize().height;
                    for (int i = 0; i < components.length; i++) {
                        Component component = components[i];
                        Rectangle bounds = component.getBounds();
                        if (bounds.y != y) {
                            heigth += componentHeight;
                            componentHeight = component.getSize().height;
                            y = bounds.y;
                        }
                    }
                    heigth += componentHeight;
                    Dimension newSize = new Dimension(getSize().width, heigth);
                    invalidate();
                    return newSize;
                }
            };
            add(choicePanel, constraints);

            constraints.gridy++;
            constraints.weightx = 1;
            constraints.anchor = GridBagConstraints.WEST;
            Panel positivePanel = new Panel();
            add(positivePanel, constraints);
            positivePanel.add(new Label(interviewSession.localizedString("Explanations")));
            CheckboxGroup likelynessCheckboxGround = new CheckboxGroup();
            Checkbox likelyCheckbox = new Checkbox(" " + interviewSession.localizedString("Probable"), positiveResult, likelynessCheckboxGround);
            positivePanel.add(likelyCheckbox);
            Checkbox unlikelyCheckbox = new Checkbox(" " + interviewSession.localizedString("NonProbable"), !positiveResult, likelynessCheckboxGround);
            positivePanel.add(unlikelyCheckbox);
            ItemListener itemListener = new ItemListener() {
                public void itemStateChanged(ItemEvent itemEvent) {
                    positiveResult = !positiveResult;
                    compute();
                }
            };
            likelyCheckbox.addItemListener(itemListener);
            unlikelyCheckbox.addItemListener(itemListener);

            constraints.gridy++;
            constraints.weighty = 1;
            constraints.weightx = 1;
            constraints.fill = GridBagConstraints.BOTH;
            explanations = new List();
            add(explanations, constraints);

            constraints.gridx = 0;
            constraints.weightx = 0;
            constraints.gridy++;
            credibilityText = interviewSession.localizedString("Credibility");
			credibilityLabel = new Label(credibilityText + " : ");
            add(credibilityLabel, constraints);

            constraints.gridx = 1;
            constraints.weightx = 1;
            constraints.gridwidth = 1;
            summaryText = interviewSession.localizedString("Summary");
			Button resultButton = new Button(summaryText);
            add(resultButton, constraints);
            resultButton.addActionListener(new ActionListener() {
                public void actionPerformed(ActionEvent e) {
                    displaySummary();
                }
            });

            constraints.weightx = 0;
            constraints.gridwidth = 2;
            constraints.gridy++;
            strangenessLabel = new Label(interviewSession.localizedString("Strangeness") + " : ");
            add(strangenessLabel, constraints);

            constraints.gridy++;
            informationText = interviewSession.localizedString("Information");
			informationLabel = new Label(informationText);
            add(informationLabel, constraints);

        } catch (Throwable e) {
            e.printStackTrace();
            exception = e;
        }
    }

    private void displaySummary() {
        final Frame frame = new Frame(summaryText);
        frame.addWindowListener(new WindowAdapter() {
            public void windowClosing(WindowEvent e) {
                frame.dispose();
            }
        });
        frame.setSize(700, 700);
        frame.setLocation(10, 50);
        frame.setLayout(new BorderLayout());
        TextArea comp = new TextArea();
        StringBuffer text = new StringBuffer(interviewSession.localizedString("AnswersToQuestions") + " :\n\n");
        Hashtable answers = interviewSession.getAnswers();
        Enumeration enumeration = answers.keys();
        while (enumeration.hasMoreElements()) {
            String s = (String) enumeration.nextElement();
            text.append(interviewSession.localizedString(s)).append(" : ");
            Vector answer = (Vector) answers.get(s);
            String SEP = "";
            for (int i = 0; i < answer.size(); i++) {
                String s1 = (String) answer.elementAt(i);
                int equalPos = s1.indexOf('=');
                String value = "";
                if (equalPos > 0) {
                    value = s1.substring(equalPos);
                    s1 = s1.substring(0, equalPos);
                }
                text.append(SEP).append(interviewSession.localizedString(s1)).append(value);
                SEP = ", ";
            }
            text.append('\n');
        }
        if (positiveResult) {
            text.append("\n" + interviewSession.localizedString("IfoExplanationsByProbability") + " :\n\n");
        } else {
            text.append("\n" + interviewSession.localizedString("IfoExplanationsByImpossibility") + " :\n\n");
        }
        String[] items = explanations.getItems();
        for (int level = 0; level < items.length; level++) {
            String levelExplanations = items[level];
            text.append(levelExplanations).append('\n');
        }
        comp.setText(text.toString());
        frame.add(comp, BorderLayout.CENTER);
        frame.setVisible(true);
        frame.toFront();
    }

    private Panel createSelectPanel() {
        Panel selectPanel = new Panel();
        previousButton = new Button("<");
        previousButton.addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent e) {
                onPrevious();
            }
        });
        selectPanel.add(previousButton);

        selectPanel.add(combo);
        combo.addItemListener(new ItemListener() {
            public void itemStateChanged(ItemEvent e) {
                int selectedIndex = combo.getSelectedIndex();
                currentQuestion = interviewSession.selectQuestion(selectedIndex);
                parameterChanged();
            }
        });

        nextButton = new Button(">");
        nextButton.addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent e) {
                onNext();
            }
        });
        selectPanel.add(nextButton);
        return selectPanel;
    }

    private void readData() throws IOException {
        String fileName = getParameter("fileName");
        readData(fileName);
        setUpInterview();
    }

    private void parseParameters() {
        String windowParameter = getParameter("windowMode");
        if (windowParameter != null) {
            windowMode = Boolean.valueOf(windowParameter).booleanValue();
        }
        System.out.println("windowMode=" + windowMode);
    }

    /**
     * Select the next character
     */
    private void onNext() {
        if (interviewSession.hasNextQuestion()) {
            currentQuestion = interviewSession.nextQuestion();
            parameterChanged();
        }
    }

    /**
     * Select the previous character
     */
    private void onPrevious() {
        if (interviewSession.hasPreviousQuestion()) {
            currentQuestion = interviewSession.previousQuestion();
            parameterChanged();
        }
    }

    /**
     * Compute values' classes for the currently selected character
     */
    private void compute() {
        Vector ascendingZeroCount = new Vector();
        Vector labels = new Vector();
        Hashtable values = knownPhenomenonMatrixFunction.getValues(interviewSession.getAnswers());

        // Sort
        Enumeration iterator2 = values.keys();
        while (iterator2.hasMoreElements()) {
            Object phenomenon = iterator2.nextElement();
            Float zeroCount = (Float) values.get(phenomenon);
            int phenomenonPos = labels.size();

            if (positiveResult) {
                while (phenomenonPos > 0 && ((Float) ascendingZeroCount.elementAt(phenomenonPos - 1)).floatValue() > zeroCount.floatValue()) {
                    phenomenonPos--;
                }
            } else {
                while (phenomenonPos > 0 && ((Float) ascendingZeroCount.elementAt(phenomenonPos - 1)).floatValue() < zeroCount.floatValue()) {
                    phenomenonPos--;
                }
            }
            if (phenomenonPos == labels.size()) {
                ascendingZeroCount.addElement(zeroCount);
                labels.addElement(phenomenon);
            } else {
                ascendingZeroCount.insertElementAt(zeroCount, phenomenonPos);
                labels.insertElementAt(phenomenon, phenomenonPos);
            }
        }

        printMostLilelyExplanations(ascendingZeroCount, labels);
        updateCredibilityIndex();
        updateInformationIndex();
        updateStrangenessIndex();
    }

    private void updateStrangenessIndex() {
        int note1 = getNote("Path", new String[]{null, "Single", "Two", "ThreeToNine", "TenToHundred", "MoreThanHundred"});          
    }

    private void updateCredibilityIndex() {
        int note1 = getNote("IndependentWitnessesCount", new String[]{null, "Single", "Two", "ThreeToNine", "TenToHundred", "MoreThanHundred"});
        int note2 = getNote("WitnessAge", new String[]{null, "LessThanThirteen", "FourteenToTwenty", null, "AboveSixty", "TwentyToFivtyNine"});
        int note3 = getNote("WitnessOccupation", new String[]{null, "School", "Worker", "Techician", "Engineer", "Scientist"});
        int note4 = 0;
        int distanceNote = getNote("Distance", new String[]{null, "Above3km", "Between1kmAnd3km", "Between200And1km", "Between150And200m", "Between50And150m", "LessThan50m"});
        Vector observationMeanAnswered = (Vector) interviewSession.getAnswers().get("ObservationMean");
        switch (distanceNote) {
            case 1: // > 3 km
                note4 = 1;
                break;
            case 2: // 1 - 3 km
                note4 = 2;
                break;
            case 3: // 200 m - 1 km
                note4 = 3;
                break;
            case 4: // 150 m - 200 m
            case 5: // 50 m - 150 m
                note4 = 4;
                break;
            case 6: // < 50 m
                note4 = 5;
                break;
        }
        if (observationMeanAnswered != null) {
            boolean usingRadar = observationMeanAnswered.contains("ObservationMean.Radar");
            boolean usingBinoculars = observationMeanAnswered.contains("ObservationMean.Binoculars");
            boolean withPhotograph = observationMeanAnswered.contains("ObservationMean.Photograph");
            boolean withTelescope = observationMeanAnswered.contains("ObservationMean.Telescope");
            if (usingRadar) {
                note4 = Math.max(note4, 3);
            }
            if (usingBinoculars) {
                note4 = Math.max(note4, 4);
            }
            if (withPhotograph) {
                note4 = Math.max(note4, 5);
            }
            if (withTelescope) {
                note4 = Math.max(note4, 5);
            }
        }
        System.out.println("note1 = " + note1);
        System.out.println("note2 = " + note2);
        System.out.println("note3 = " + note3);
        System.out.println("note4 = " + note4);
        System.out.println("distanceNote = " + distanceNote);
        double credibilityIndex = (31 * (double) note1 + 7 * (double) note2 + 31 * (double) note3 + 31 * (double) note4) / 100;
        credibilityLabel.setText(credibilityText + " : " + credibilityIndex + " / 5");
    }

    private int getNote(String question, String[] answers) {
        int note = 0;
        Vector answered = (Vector) interviewSession.getAnswers().get(question);
        if (answered != null) {
            Object answer = answered.elementAt(0);
            for (int i = 0; i < answers.length; i++) {
                String answer1 = question + "." + answers[i];
                if (answer1 != null && answer.equals(answer1)) {
                    note = i;
                    break;
                }
            }
        } else {
            note = 0;
        }
        return note;
    }

    private void updateInformationIndex() {
        int answersCount = interviewSession.getAnswers().size();
        int questionsCount = interviewSession.getQuestions().size();
        double informationIndex = (double) answersCount / (double) questionsCount * 5;
        informationLabel.setText(informationText + " : " + informationIndex + " / 5");
    }

    private void printMostLilelyExplanations(Vector ascendingZeroCount, Vector labels) {
        explanations.removeAll();
        Float lastProb = (Float) ascendingZeroCount.elementAt(0);
        String toPrint = "";
        String SEP = "";
        int level = 0;
        for (int j = 0; j < labels.size(); j++) {
            Float prob = (Float) ascendingZeroCount.elementAt(j);
            if (prob.intValue() != lastProb.intValue()) {
                explanations.add(++level + ". " + toPrint);
                toPrint = "";
                SEP = "";
            }
            toPrint += SEP + interviewSession.localizedString((String) labels.elementAt(j));
            SEP = ", ";
            lastProb = prob;
        }
        explanations.add(++level + ". " + toPrint);
        explanations.validate();
    }

    /**
     * Notifies that the currently displayed character has changed.
     * <p/>
     * This performs various visual updates according to this change.
     */
    private void parameterChanged() {
        String questionKey = currentQuestion.getTitle();
        combo.select(interviewSession.localizedString(questionKey));
        if (currentQuestion instanceof MultipleChoiceQuestion) {
            MultipleChoiceQuestion choiceQuestion = (MultipleChoiceQuestion) currentQuestion;
            final Vector choices = choiceQuestion.getChoices();
            choicePanel.removeAll();
            Hashtable existingAnswers = interviewSession.getAnswers();
            Vector answersForThisQuestion = (Vector) existingAnswers.get(questionKey);
            if (answersForThisQuestion == null) {
                answersForThisQuestion = new Vector();
            }
            Enumeration choicesEnumeration = choices.elements();
            while (choicesEnumeration.hasMoreElements()) {
                final String choiceId = (String) choicesEnumeration.nextElement();
                boolean enabled = false;
                for (int i = 0; (!enabled) && i < answersForThisQuestion.size(); i++) {
                    String anAnswer = (String) answersForThisQuestion.elementAt(i);
                    int equalPos = anAnswer.indexOf('=');
                    if (equalPos <= 0) {
                        enabled = anAnswer.equals(choiceId);
                    } else {
                        enabled = anAnswer.substring(0, equalPos).equals(choiceId);
                    }
                }
                String choiceText = interviewSession.localizedString(choiceId);
                String parameterType = knownPhenomenonMatrixFunction.getParameterType(choiceId);
                Component component;
                int beginIndex = parameterType.indexOf('(');
                int size = -1;
                if (beginIndex > 0) {
                    int lastIndex = parameterType.lastIndexOf(')');
                    size = Integer.parseInt(parameterType.substring(beginIndex + 1, lastIndex));
                }
                if (parameterType.startsWith(CheckboxGroup.class.getName())) {
                    component = createRadio(choiceText, enabled, answersForThisQuestion, choiceId, choicePanel, size);
                } else if (parameterType.equals(Checkbox.class.getName())) {
                    component = createCheckbox(choiceText, enabled, answersForThisQuestion, choiceId);
                } else if (parameterType.startsWith(TextField.class.getName())) {
                    component = createTextField(answersForThisQuestion, choiceId, size, new Label(choiceText));
                } else {
                    throw new RuntimeException("Unsupported component type for parameter \"" + choiceId + "\": " + parameterType);
                }
                choicePanel.add(component);
            }
        }
        choicePanel.validate();
        KnownPhenomenonMatrixApplet.this.validate();

        nextButton.setEnabled(interviewSession.hasNextQuestion());
        previousButton.setEnabled(interviewSession.hasPreviousQuestion());
    }

    private Checkbox createCheckbox(String choiceText, boolean enabled, final Vector answers, final String choiceId) {
        Checkbox choiceComp = new Checkbox(choiceText, enabled);
        choiceComp.addItemListener(new ItemListener() {
            public void itemStateChanged(ItemEvent e) {
                if (e.getStateChange() == ItemEvent.SELECTED) {
                    answers.addElement(choiceId);
                } else {
                    answers.removeElement(choiceId);
                }
                interviewSession.answer(answers);
                compute();
            }
        });
        return choiceComp;
    }

    private Component createRadio(String choiceText, boolean enabled, final Vector answers, final String choiceId, final Panel choicePanel, final int size) {
        CheckboxGroup checkboxGroup = null;
        Component[] components = choicePanel.getComponents();
        int i;
        for (i = 0; i < components.length; i++) {
            Component component = components[i];
            if (component instanceof Checkbox) {
                checkboxGroup = ((Checkbox) component).getCheckboxGroup();
            }
        }
        if (checkboxGroup == null) {
            checkboxGroup = new CheckboxGroup();
        }
        final Checkbox newCheckBox = new Checkbox(choiceText, enabled, checkboxGroup);
        newCheckBox.setName(choiceId);
        final CheckboxGroup checkboxGroup1 = checkboxGroup;
        newCheckBox.addItemListener(new ItemListener() {
            public void itemStateChanged(ItemEvent e) {
                if (e.getStateChange() == ItemEvent.SELECTED) {
                    Component[] choiceComponents = choicePanel.getComponents();
                    for (int j = 0; j < choiceComponents.length; j++) {
                        Component component = choiceComponents[j];
                        if (component instanceof Checkbox) {
                            Checkbox aCheckbox = ((Checkbox) component);
                            if (aCheckbox.getCheckboxGroup() == checkboxGroup1 && aCheckbox != newCheckBox) {
                                answers.removeElement(aCheckbox.getName());
                            } else if (aCheckbox.getCheckboxGroup() != null) {
                                answers.addElement(choiceId);
                            }
                        } else if (component instanceof Panel) {
                            Panel panel = (Panel) component;
                            Component[] aCheckBoxComponents = panel.getComponents();
                            Checkbox aCheckbox = (Checkbox) aCheckBoxComponents[0];
                            TextField textField = (TextField) aCheckBoxComponents[1];
                            String valueToRemove = aCheckbox.getName();
                            if (textField.getText().length() > 0) {
                                valueToRemove += "=" + textField.getText();
                            }
                            if (aCheckbox.getCheckboxGroup() == checkboxGroup1 && aCheckbox != newCheckBox) {
                                answers.removeElement(valueToRemove);
                                textField.setEditable(false);
                                textField.setEnabled(false);
                            } else {
                                textField.setEditable(true);
                                textField.setEnabled(true);
                                answers.addElement(valueToRemove);
                            }
                        }
                    }
                    interviewSession.answer(answers);
                    compute();
                }
            }
        });
        final Component choiceComp;
        if (size > 0) {
            choiceComp = createTextField(answers, choiceId, size, newCheckBox);
        } else {
            choiceComp = newCheckBox;
        }
        return choiceComp;
    }

    private Component createTextField(final Vector answers, final String choiceId, int size, final Component component) {
        final Panel panel = new Panel();
        panel.add(component);
        String text = null;
        for (int i = 0; text == null && i < answers.size(); i++) {
            String anAnswer = (String) answers.elementAt(i);
            int equalPos = anAnswer.indexOf('=');
            if (equalPos <= 0) {
                text = "";
            } else {
                text = anAnswer.substring(equalPos + 1);
            }
        }
        final TextField textField = new TextField(text, size);

        textField.addTextListener(new TextListener() {
            String previousValue = textField.getText();

            public void textValueChanged(TextEvent e) {
                answers.removeElement(choiceId + "=" + previousValue);
                answers.removeElement(choiceId);
                String answerValue = choiceId;
                if (textField.getText().length() > 0) {
                    answerValue += "=" + textField.getText();
                }
                answers.addElement(answerValue);
                interviewSession.answer(answers);
                compute();

                previousValue = textField.getText();
            }
        });
        panel.add(textField);
        return panel;
    }

    private void setUpInterview() {
        Questionnaire witnessQuestionnaire = new InterviewQuestionnaire(bundleName);
        interviewSession = witnessQuestionnaire.createSession(Locale.getDefault());
        Identity gepanIdentity = new IdentityImpl("GEPAN");
        Actor interviewer = new OrganizationImpl(gepanIdentity);
        interviewSession.setSubject(interviewer);

        Identity intervieweeIdentity = new IdentityImpl("Witness");
        HumanBeing interviewee = new HumanBeingImpl(intervieweeIdentity);
        interviewSession.setObject(interviewee);

        Enumeration parameterNames = knownPhenomenonMatrixFunction.getParameters();

        TimeLine questions = witnessQuestionnaire.getQuestions();

        Hashtable questionStrings = new Hashtable();
        while (parameterNames.hasMoreElements()) {
            String parameter = (String) parameterNames.nextElement();
            int dotPos = parameter.indexOf('.');
            String parameterName = parameter.substring(0, dotPos);
            Vector choices = (Vector) questionStrings.get(parameterName);
            if (choices == null) {
                choices = new Vector();
                questionStrings.put(parameterName, choices);
            }
            choices.addElement(parameter);
        }

        Enumeration iterator1 = questionStrings.keys();
        while (iterator1.hasMoreElements()) {
            String parameterName = (String) iterator1.nextElement();
            Vector choices = (Vector) questionStrings.get(parameterName);
            MultipleChoiceQuestion question = new MultipleChoiceQuestionImpl(parameterName, choices);
            questions.add(question);
            combo.add(interviewSession.localizedString(question.getTitle()));
        }
    }

    /**
     * Read the file of testimonial data.
     * If not file name is specified, the default file bundled with the application will be loaded.
     *
     * @param fileName The name of the file to read, if specified by the user (null otherwise)
     * @throws IOException If a problem occurred while attempting to read data
     */
    private void readData(String fileName) throws IOException {
        InputStream inputStream;
        if (fileName == null) {
            fileName = DEFAULT_MATRIX_FILENAME;
        }
        if (fileName.startsWith("file:")) {
            File file = new File(fileName);
            System.out.println("Opening " + file.getAbsolutePath());
            bundleName = "org.rr0.im.service.function.PoherMatrix";
            inputStream = new FileInputStream(fileName);
        } else {
            URL resource;
            if (fileName.startsWith("http://")) {
                resource = new URL(fileName);
                bundleName = fileName.substring(0, fileName.toLowerCase().lastIndexOf('.'));
            } else {
                resource = getClass().getResource(fileName);
                int start = 0;
                if (fileName.startsWith("/")) {
                    start = "/".length();
                }
                bundleName = fileName.substring(start, fileName.toLowerCase().lastIndexOf('.'));
                bundleName = bundleName.replace('/', '.');
            }
            System.out.print("Opening " + resource + " ...");
            inputStream = resource.openStream();
            System.out.println("Ok");
        }
        knownPhenomenonMatrixFunction = new MatrixFunctionImpl(inputStream);
    }

    /**
     * Starts the applet.
     * <p/>
     * Called at applet's container (HTML page, Frame) activation
     */
    public void start() {
        if (windowMode) {
            final Frame frame = new Frame(interviewSession.localizedString("Title"));
            frame.addWindowListener(new WindowAdapter() {
                public void windowClosing(WindowEvent e) {
                    frame.dispose();
                    System.exit(0);
                }
            });
            frame.setSize(700, 700);
            setSize(frame.getSize());
            frame.setLocation(10, 50);
            frame.setLayout(new BorderLayout());
            frame.add(this, BorderLayout.CENTER);
            frame.setVisible(true);
            frame.toFront();
        } else {
            addMouseListener(new MouseAdapter() {
                public void mouseClicked(MouseEvent e) {
                    if (!windowMode && e.getClickCount() == 2) {
                        windowMode = true;
                        start();
                    }
                }
            });
        }
        onNext();
        requestFocus();
    }

    /**
     * Called when launched as a standalone application.
     *
     * @param args The command line arguments
     * @throws Throwable An exception, if any
     */
    public static void main(final String[] args) throws Throwable {
        KnownPhenomenonMatrixApplet matrixApplet = new KnownPhenomenonMatrixApplet() {
            public String getParameter(String name) {
                for (int i = 0; i + 1 < args.length; i += 2) {
                    if (args[i].equalsIgnoreCase(name)) {
                        return args[i + 1];
                    }
                }
                return null;
            }
        };
        matrixApplet.windowMode = true;
        matrixApplet.init();
        if (exception == null) {
            matrixApplet.start();
        } else {
            throw exception;
        }
    }
}
