package org.rr0.poher.chart;

import java.applet.Applet;
import java.awt.*;
import java.awt.event.*;
import java.io.*;
import java.net.URL;
import java.text.MessageFormat;
import java.text.NumberFormat;
import java.util.*;

/**
 * This software has been based on a Future Basic program
 * written in 1971 by Claude Poher to draw the statistical charts of UFO testimonials.
 *
 * @author Jerome Beau
 * @author Claude Poher (1971)
 * @version Java 1.1 to ensure compatibility with oldest browsers.
 */
public class StatUneColonneCouleur extends Applet {
    /**
     * Codes of displayed labels.
     * Actual labels will be looked up in internationalization bundles (Messages_fr.properties when a french locale
     * is detected, Messages_it.properties when a italian locale is detected, etc. By default Messages.properties
     * will be used, which contains english messages.
     */
    private static final String[] characterLabels = {
            "NUMBER", "NUMBER_2", "NUMBER_3", "NUMBER_4", "SOURCE", "SOURCE_2", "DATE", "DATE_2", "MONTH", "MONTH_2",
            "YEAR", "YEAR_2", "YEAR_3", "YEAR_4", "HOUR", "HOUR_2", "MINUTES", "MINUTES_2", "TIME_INFO", "PLACE1", "PLACE2",
            "WITNESS_COUNT", "WITNESS_NAME_IS_KNOWN", "WITNESS_AGE", "PROFESSION", "CREDIBILITY", "OFFICIAL_INVESTIGATION",
            "METEO", "DURATION", "MINIMAL_DISTANCE", "OBS_MEAN", "OBJECTS_COUNT", "OBJECTS_COUNT_2", "SHAPE", "DIMENSION1",
            "DIMENSION1_2", "DIMENSION2", "DIMENSION2_2", "COLOR", "COLOR_2", "BRIGHTNESS", "LIGHTS", "SPEED", "SPEED_RATE",
            "PATH", "NOISE", "ANGULAR_HEIGHT", "STRANGENESS", "PLACE_TYPE", "CONTACT_POINTS_COUNT", "LANDING_MARKS",
            "OCCUPANTS", "OCCUPANTS_SIZE", "OCCUPANTS_SIZE_2", "OCCUPANTS_CLOTHES1", "OCCUPANTS_CLOTHES2",
            "OCCUPANTS_BEHAVIOR1", "OCCUPANTS_BEHAVIOR2", "OCCUPANTS_HEAD_AND_HAIRS", "OCCUPANTS_VOICE_BREATHING_CHIN",
            "OCCUPANTS_SKIN", "OCCUPANTS_EYES", "OCCUPANTS_MOUTH", "OCCUPANTS_FINGERS_AND_MOVEMENT", "HEAT_EFFECTS",
            "LIGHT_EFFECTS", "MAGNETIC_EFFECTS", "ODOR", "WITNESS_PHYSIOLOGICAL_EFFECTS", "WITNESS_PSYCHOLOGICAL_EFFECTS",
            "EFFECTS_ON_ANIMALS", "OTHER_PERCEIVED_EFFECTS", "TRAIL_OR_CLOUD", "OSCILLATIONS_COLD",
            "ROTATION_FORMATION_FUSION_SEPARATION", "ONSITE_DISPARITION", "HALO_AROUND_OBJECT",
            "INTERACTION_BETWEEN_WITNESS_AND_OBJECT", "PHOTO_OR_DRAWING", "PORTHOLES_AND_OTHER_DETAILS"
    };

    /**
     * The number of digits on which a given character is coded.
     * The 1st character (testimony code) is coded on 4 digits, the 2nd (source) on 2 digits, the 3rd (day of month)
     * on 2 digits, etc.
     * This allows to know what is to be read/displayed when selecting next/previous character.
     */
    private static final int[] characterSizes = {
            4, 4, 4, 4, 2, 2, 2, 2, 2, 2, 4, 4, 4, 4, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 1, 2, 2,
            2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
            1, 1, 1, 1, 1, 1, 1, 1
    };

    /**
     * The character values to be interpreted as "null", that is, no value was stated for this character in a given
     * testimony.
     */
    private static final String[] nullValues = {
            null, null, null, null, null, null, "00", null, "00", null, "0000", null, null, null, "97", null, null, null,
            "0", "Z", "Z", "0", "0", "0", "0", null, "0", "0", "0", "0", "0", "00", null, "0", "ZZ", null, "ZZ", null,
            "00", null, "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "00", null, "0", "0", "0", "0", "0",
            "0", "0", "0", null, "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0"
    };

    /**
     * The lines of the data file
     */
    Vector dataLines = new Vector();
    private static final String DEFAULT_FILENAME = "fichier_ovni_1971_new.bin";

    /**
     * The number of the currently displayed character - 1
     */
    int characterNumber = 22 - 1;
    private int minCharacterValue = 5;
    private int maxCharacterValue = 80;

    /**
     * The number of observations for this character, indexed by value class
     */
    Hashtable values = new Hashtable();

    /**
     * The number of non-null values for the current character
     */
    int nonNullDataLinesForThisCharacter;

    /**
     * If null values are to be displayed (true by default)
     */
    boolean displayNullValues = true;

    ResourceBundle messagesBundle;
    private static Throwable exception;

    private Canvas canvas;
    private Choice combo;
    NumberFormat format;
    private Button previousButton;
    private Button nextButton;
    int maxFontSize = 16;
    int minFontSize = 11;
    static final int X_MARGIN = 50;
    boolean windowMode;

    /**
     * Initialize the applet.
     * <p/>
     * Called just after applet instanciation.
     */
    public void init() {
        super.init();
        try {
            messagesBundle = ResourceBundle.getBundle("org.rr0.poher.chart.Messages");

            String fileName = getParameter("fileName");
            readData(fileName);

            String characterParameter = getParameter("characterNumber");
            if (null != characterParameter) {
                characterNumber = Integer.parseInt(characterParameter) - 1;
            }
            System.out.println("characterNumber=" + (characterNumber + 1));

            String displayNullParameter = getParameter("displayNullValues");
            if (null != displayNullParameter) {
                displayNullValues = Boolean.valueOf(displayNullParameter).booleanValue();
            }
            System.out.println("displayNullValues=" + displayNullValues);

            String windowParameter = getParameter("windowMode");
            if (null != windowParameter) {
                windowMode = Boolean.valueOf(windowParameter).booleanValue();
            }
            System.out.println("windowMode=" + windowMode);

            String maxFontSizeParameter = getParameter("maxFontSize");
            if (null != maxFontSizeParameter) {
                maxFontSize = Integer.parseInt(maxFontSizeParameter);
            }
            System.out.println("maxFontSize=" + maxFontSize);

            String minFontSizeParameter = getParameter("minFontSize");
            if (null != minFontSizeParameter) {
                minFontSize = Integer.parseInt(minFontSizeParameter);
            }
            System.out.println("minFontSize=" + minFontSize);

            canvas = createCanvas();

            combo = new Choice();
            int characterSize;
            for (int i = minCharacterValue - 1; i < maxCharacterValue; i += characterSize) {
                characterSize = characterSizes[i];
                String characterLabel = messagesBundle.getString(characterLabels[i]);
                combo.add(i + 1 + ": " + characterLabel);
            }

            format = NumberFormat.getInstance();
            format.setMaximumFractionDigits(1);

            setLayout(new BorderLayout());
            add(canvas, BorderLayout.CENTER);
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
                    String characterString = (String) e.getItem();
                    int endIndex = characterString.indexOf(':');
                    characterString = characterString.substring(0, endIndex);
                    characterNumber = Integer.parseInt(characterString) - 1;
                    compute();
                }
            });

            nextButton = new Button(">");
            nextButton.addActionListener(new ActionListener() {
                public void actionPerformed(ActionEvent e) {
                    onNext();
                }
            });
            selectPanel.add(nextButton);

            add(selectPanel, BorderLayout.NORTH);
        } catch (Throwable e) {
            exception = e;
        }
    }

    /**
     * Graphical display creation.
     *
     * @return The created canvas.
     */
    private Canvas createCanvas() {
        Canvas newCanvas = new Canvas() {
            public void paint(Graphics g) {
                super.paint(g);
                setBackground(Color.white);

                int valuesSize = values.size();
                Vector intValues = new Vector(valuesSize);
                String nullLabel = null;
                int initialLinesCount = valuesSize + (displayNullValues ? 3 : 0);
                int linesCount = initialLinesCount;
                FontMetrics fontMetrics;
                int lineHeight;
                int columnCount;
                String fontName = getFont().getName();
                int maxTextWidth = 0;
                columnCount = 1;
                Vector strings = new Vector();
                int percentMaxWidth = 0;
                boolean ok = false;
                Dimension size = getSize();
                lineHeight = size.height / (linesCount + linesCount / 2);
                lineHeight = Math.min(lineHeight, maxFontSize);
                int z = 0;
                do {
                    Font font = new Font(fontName, Font.PLAIN, lineHeight);
                    g.setFont(font);
                    fontMetrics = g.getFontMetrics(font);
                    if (lineHeight - 1 < minFontSize) {
                        columnCount++;
                        linesCount = initialLinesCount / columnCount;

                        lineHeight = size.height / (linesCount + linesCount / 2);
                        lineHeight = Math.min(lineHeight, maxFontSize);
                        continue;
                    }

                    int maxBarX = size.width / 4 * 3 / columnCount;

                    percentMaxWidth = fontMetrics.stringWidth("  9999 %  ");

                    maxTextWidth = 0;
                    strings.removeAllElements();
                    intValues.removeAllElements();
                    Enumeration enumeration = values.keys();
                    while (enumeration.hasMoreElements()) {
                        String valueClassCode = (String) enumeration.nextElement();
                        Integer integerValue = (Integer) values.get(valueClassCode);
                        if (null != integerValue) {
                            int j = strings.size();
                            while (0 < j && 0 > valueClassCode.compareTo((String) strings.elementAt(j - 1))) {
                                j--;
                            }
                            String valueClassLabel = valueClassCode;
                            try {
                                valueClassLabel += " " + messagesBundle.getString(characterLabels[characterNumber] + "_" + valueClassCode);
                            } catch (Exception e) {
                                // No internationalized value class label
                            }
                            if (valueClassCode.equals(nullValues[characterNumber])) {
                                nullLabel = valueClassLabel;
                            }

                            intValues.insertElementAt(integerValue, j);
                            strings.insertElementAt(valueClassLabel, j);

                            int stringWidth = fontMetrics.stringWidth(valueClassLabel);
                            if (stringWidth > maxTextWidth) {
                                maxTextWidth = Math.min(stringWidth, maxBarX - X_MARGIN);
                            }
                        }
                    }

                    ok = fontMetrics.getHeight() * (linesCount + linesCount / 2) < size.height;
                    if (! ok) {
                        lineHeight--;
                    }
                    z++;

                } while (! ok && z < 20);

                int interline = lineHeight / 2;
                int yPos = lineHeight * 2;
                int startX = X_MARGIN + maxTextWidth + percentMaxWidth;
                int maxWidth = size.width - X_MARGIN - startX;
                int nullLabelY = lineHeight * 4;

                g.setColor(Color.black);

                int nullIndex = -1;
                if (null != nullLabel && displayNullValues) {
                    nullIndex = strings.indexOf(nullLabel);
                    String internalLabel = nullLabel;
                    internalLabel = internalLabel.substring(internalLabel.indexOf(' ') + 1);
                    String valueLabel = internalLabel;
                    g.drawString(valueLabel, X_MARGIN, nullLabelY);

                    float value = ((Integer) intValues.elementAt(nullIndex)).floatValue();
                    float percent = 1000 * value / nonNullDataLinesForThisCharacter / 10;
                    String percentString = "  " + format.format(percent) + " %  ";
                    g.drawString(percentString, X_MARGIN + maxTextWidth, nullLabelY);

                    g.setColor(Color.black);
                    g.drawString(MessageFormat.format(messagesBundle.getString("SIGHTINGS_TOTAL"), new Object[]{new Integer(dataLines.size())}), 20, yPos);
                    yPos += lineHeight * 2;

                    g.setColor(Color.red);
                    g.drawRect(startX, nullLabelY - lineHeight, maxWidth, lineHeight);
                    int width = (int) (maxWidth * value / nonNullDataLinesForThisCharacter);
                    g.fillRect(startX + width, nullLabelY - lineHeight, maxWidth - width, lineHeight);
                    yPos += lineHeight * 2;
                }

                g.setColor(Color.black);
                g.drawString(MessageFormat.format(messagesBundle.getString("SIGHTINGS_COUNT"), new Object[]{new Integer(nonNullDataLinesForThisCharacter)}), 20, yPos);
                yPos += lineHeight * 2;

                int resetYPos = yPos;
                maxWidth /= columnCount;
                for (int column = 0; column < columnCount; column++) {
                    int xMargin = X_MARGIN + column * (getParent().getSize().width / columnCount);
                    yPos = resetYPos;
                    for (int i = 0; i <= linesCount; i++) {
                        int elementIndex = column * linesCount + i;
                        if (elementIndex < strings.size()) {
                            String valueLabel = (String) strings.elementAt(elementIndex);
                            if (!valueLabel.equals(nullLabel)) {
                                float value = ((Integer) intValues.elementAt(elementIndex)).floatValue();
                                float percent = 1000 * value / nonNullDataLinesForThisCharacter / 10;
                                String percentString = "  " + format.format(percent) + " %  ";
                                g.drawString(percentString, xMargin + maxTextWidth, yPos);

                                g.setColor(Color.red);
                                int width = (int) (maxWidth * value / nonNullDataLinesForThisCharacter);
                                g.fillRect(xMargin + maxTextWidth + percentMaxWidth, yPos - lineHeight, width, lineHeight);

                                g.setColor(Color.black);
                                int stringWidth = 0;
                                valueLabel = valueLabel.substring(valueLabel.indexOf(' ') + 1);
                                StringTokenizer tokenizer = new StringTokenizer(valueLabel, " ", true);
                                String currentLine = "";
                                while (tokenizer.hasMoreTokens()) {
                                    String token = tokenizer.nextToken();
                                    stringWidth += fontMetrics.stringWidth(token);

                                    if (stringWidth > maxTextWidth) {
                                        g.drawString(currentLine.trim(), xMargin, yPos);
                                        yPos += lineHeight;
                                        currentLine = "";
                                        stringWidth = fontMetrics.stringWidth(token);
                                    }
                                    currentLine += token;
                                }
                                if (currentLine.length() > 0) {     // Last line still to write ?
                                    g.drawString(currentLine.trim(), xMargin, yPos);
                                    yPos += lineHeight;
                                }
                                yPos += interline;
                            }
                        }
                    }
                }
            }
        };

        return newCanvas;
    }

    /**
     * Select the next character
     */
    void onNext() {
        if (characterNumber < maxCharacterValue - 1) {
            characterNumber += characterSizes[characterNumber];
            compute();
        }
    }

    /**
     * Select the previous character
     */
    void onPrevious() {
        if (characterNumber >= minCharacterValue) {
            characterNumber -= characterSizes[(characterNumber - 1)];
            compute();
        }
    }

    /**
     * Read the file of testimonial data.
     * If not file name is specified, the default file bundled with the application will be loaded.
     *
     * @param fileName The name of the file to read, if specified by the user (null otherwise)
     */
    private void readData(String fileName) throws IOException
    {
        InputStream inputStream;
        if (null == fileName) {
            URL resource = getClass().getResource(DEFAULT_FILENAME);
            System.out.println("Opening " + resource);
            inputStream = resource.openStream();
        } else {
            File file = new File(fileName);
            System.out.println("Opening " + file.getAbsolutePath());
            inputStream = new FileInputStream(fileName);
        }

        BufferedReader bufferedReader = new BufferedReader(new InputStreamReader(inputStream));
        try {
            boolean endOfFile;
            do {
                String dataLine = bufferedReader.readLine();
                endOfFile = null == dataLine;
                if (!endOfFile && dataLine.length() == maxCharacterValue) {
                    dataLines.addElement(dataLine);
                    bufferedReader.readLine();  // Skip next description line (unused in this program)
                }
            } while (!endOfFile);
        } finally {
            bufferedReader.close();
        }
    }

    /**
     * Compute values classes for the currently selected character
     */
    void compute() {
        nonNullDataLinesForThisCharacter = 0;
        values.clear();

        Enumeration dataLinesEnumeration = dataLines.elements();
        while (dataLinesEnumeration.hasMoreElements()) {
            String dataLine = (String) dataLinesEnumeration.nextElement();
            String characterValue = dataLine.substring(characterNumber, characterNumber + characterSizes[characterNumber]);
            Integer integerCharacterValue = (Integer) values.get(characterValue);
            if (integerCharacterValue == null) {
                values.put(characterValue, new Integer(1));
            } else {
                int currentCharacterValue = integerCharacterValue.intValue();
                int newCharacterValue = currentCharacterValue + 1;
                values.put(characterValue, new Integer(newCharacterValue));
            }
            if (!characterValue.equals(nullValues[characterNumber])) {
                nonNullDataLinesForThisCharacter++;
            }
        }

        characterChanged();
    }

    /**
     * Notifies that the currently displayed character has changed.
     * <p/>
     * This performs various visual updates according to this change.
     */
    private void characterChanged() {
        nextButton.setEnabled(characterNumber < maxCharacterValue - 1);
        previousButton.setEnabled(characterNumber > minCharacterValue - 1);
        canvas.repaint();

        String characterLabel = messagesBundle.getString(characterLabels[characterNumber]);
        String characterString = String.valueOf(characterNumber + 1);
        combo.select(characterString + ": " + characterLabel);
        combo.repaint();
    }

    /**
     * Starts the applet.
     * <p/>
     * Called at applet's container (HTML page, Frame) activation
     */
    public void start() {
        if (windowMode) {
            final Frame frame = new Frame("Statistiques Claude Poher (1971)");
            frame.addWindowListener(new WindowAdapter() {
                public void windowClosing(WindowEvent e) {
                    frame.dispose();
                    System.exit(0);
                }
            });
            frame.setSize(700, 700);
            Dimension frameSize = frame.getSize();
            setSize(frameSize);
            frame.setLocation(10, 50);
            frame.setLayout(new BorderLayout());
            frame.add(this, BorderLayout.CENTER);
            frame.setVisible(true);
            frame.toFront();
        } else {
            canvas.addMouseListener(new MouseAdapter() {
                public void mouseClicked(MouseEvent e) {
                    if (!windowMode && 2 == e.getClickCount()) {
                        windowMode = true;
                        start();
                    }
                }
            });
        }
        compute();
        requestFocus();
    }

    /**
     * Called when launched as a standalone application.
     *
     * @param args The command line arguments
     * @throws Throwable An exception, if any
     */
    public static void main(final String[] args) throws Throwable
    {
        StatUneColonneCouleur stats = new StatUneColonneCouleur() {
            public String getParameter(String someName) {
                String parameter = null;
                for (int i = 0; i + 1 < args.length; i += 2) {
                    if (args[i].equalsIgnoreCase(someName)) {
                        parameter = args[i + 1];
                        break;
                    }
                }
                return parameter;
            }
        };
        stats.windowMode = true;
        stats.init();
        if (null == exception) {
            stats.start();
        } else {
            throw exception;
        }
    }
}
