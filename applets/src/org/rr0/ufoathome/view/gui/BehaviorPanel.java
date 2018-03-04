package org.rr0.ufoathome.view.gui;

import org.rr0.ufoathome.view.draw.AnimationEvent;
import org.rr0.ufoathome.view.draw.AnimationListener;
import org.rr0.ufoathome.view.draw.CircleShape;
import org.rr0.ufoathome.model.ufo.UFOController;

import java.awt.*;
import java.awt.event.*;
import java.util.Calendar;
import java.util.Date;
import java.util.GregorianCalendar;
import java.util.ResourceBundle;

/**
 * @author Jerôme Beau
 * @version 29 janv. 2004 20:19:30
 */
public class BehaviorPanel extends Panel {
    //    private static final int TIME_TRACK_REFRESH_RATE = 1000;
    private ResourceBundle messagesBundle;

    private TextField dayTextField;
    private TextField monthTextField;
    private TextField yearTextField;
    private TextField hourTextField;
    private TextField minutesTextField;
    private TextField secondsTextField;

    private PolygonButton runButton;

    private Scrollbar timeCursor;
    private String fullDate;

    /**
     * Maximum allowed year.
     * Required as we don't allow "future" sightings.
     */
    //    private int maxYear;

    private Label dayOfWeekLabel;
    private UFOController controller;
    private Polygon playShape;
    private Polygon stopShape;
    private CircleShape recordShape;
    private DrawShapeButton recordButton;
    private PolygonButton stopButton;

    public BehaviorPanel(final UFOController controller) {
        this.controller = controller;
        messagesBundle = controller.getMessagesBundle();
        final int maxYear = Calendar.getInstance(controller.getTimeZone()).get(Calendar.YEAR);
        setBackground(SystemColor.control);

        ShapeButtonGroup buttonGroup = new ShapeButtonGroup();
        playShape = getPlayShape();
        runButton = new PolygonButton(playShape);
        buttonGroup.add(runButton);
        stopShape = getStopShape();
        stopButton = new PolygonButton(stopShape);
        buttonGroup.add(stopButton);

        ActionListener actionListener = new ActionListener() {
            public void actionPerformed(ActionEvent actionEvent) {
                Object obj = actionEvent.getSource();
                GregorianCalendar currentTime = controller.getTime();
                if (obj instanceof TextField) {
                    int day = inputTextField(dayTextField, 1, 31);
                    currentTime.set(Calendar.DATE, day);
                    int month = inputTextField(monthTextField, 1, 12);
                    currentTime.set(Calendar.MONTH, month - 1);
                    int year = inputTextField(yearTextField, 1900, maxYear);
                    currentTime.set(Calendar.YEAR, year);
                    int hour = inputTextField(hourTextField, 0, 23);
                    currentTime.set(Calendar.HOUR_OF_DAY, hour);
                    int minute = inputTextField(minutesTextField, 0, 59);
                    currentTime.set(Calendar.MINUTE, minute);
                    int seconds = inputTextField(secondsTextField, 0, 59);
                    currentTime.set(Calendar.SECOND, seconds);

                    setTime(currentTime, true);
                    controller.draw();
                } else if (obj == runButton) {
                    play(true);
                } else if (obj == stopButton) {
                    play(false);
                    controller.setMode(UFOController.ASPECT_TAB);
                }
            }
        };
        runButton.addActionListener(actionListener);
        stopButton.addActionListener(actionListener);

        controller.addAnimationListener(new AnimationListener() {
            public void timeChanged(AnimationEvent timeEvent) {
                GregorianCalendar currentTime = (GregorianCalendar) timeEvent.getTime();
                setTime(currentTime, false);
            }

            public void animationStarted() {
                enableToSetTime(false);
                controller.fireMessage("Playing...", null);
            }

            public void animationStopped() {
                enableToSetTime(true);
                controller.fireMessage("Edit", null);
                stopButton.pushed();
            }

            public void modeChanged(String mode) {
                //                if (mode.equals(UFOController.BEHAVIOR_TAB)) {
                //                    recordButton.pushed();
                //                } else {
                //                    recordButton.released();
                //                }
            }
        });

        dayOfWeekLabel = new Label();
        dayTextField = new TextField(2);
        monthTextField = new TextField(2);
        yearTextField = new TextField(4);
        hourTextField = new TextField(2);
        minutesTextField = new TextField(2);
        secondsTextField = new TextField(2);
        dayTextField.addActionListener(actionListener);
        monthTextField.addActionListener(actionListener);
        yearTextField.addActionListener(actionListener);
        hourTextField.addActionListener(actionListener);
        minutesTextField.addActionListener(actionListener);
        secondsTextField.addActionListener(actionListener);
        add(dayOfWeekLabel);
        add(dayTextField);
        add(monthTextField);
        add(yearTextField);
        add(new Label(messagesBundle.getString("Time")));
        add(hourTextField);
        //        add(new Label("h"), gridBagConstraints);
        add(minutesTextField);
        //        add(new Label("mn"), gridBagConstraints);
        add(secondsTextField);
        //        add(new Label("s " /*+ messagesBundle.getString("UTC")*/), gridBagConstraints);

        //        setStartButton = new Button(messagesBundle.getString("SetStartTime"));
        //        setStartButton.addActionListener(new ActionListener() {
        //            public void actionPerformed(ActionEvent e) {
        //                GregorianCalendar currentTime = controller.getTime();
        //                int day = inputTextField(dayTextField, 1, 31);
        //                currentTime.set(Calendar.DATE, day);
        //                int month = inputTextField(monthTextField, 1, 12);
        //                currentTime.set(Calendar.MONTH, month - 1);
        //                int year = inputTextField(yearTextField, 1900, maxYear);
        //                currentTime.set(Calendar.YEAR, year);
        //                int hour = inputTextField(hourTextField, 0, 23);
        //                currentTime.set(Calendar.HOUR_OF_DAY, hour);
        //                int minute = inputTextField(minutesTextField, 0, 59);
        //                currentTime.set(Calendar.MINUTE, minute);
        //                int seconds = inputTextField(secondsTextField, 0, 59);
        //                currentTime.set(Calendar.SECOND, seconds);
        //
        //                Date newTime = currentTime.getTime();
        //                controller.setStartTime(newTime);
        //                controller.setEndTime(newTime);
        //                timeCursor.setValues(0, controller.getSamplingRate(), 0, controller.getSamplingRate());
        //                controller.setTime(currentTime);
        //                controller.draw();
        //                displayTime(currentTime);
        //            }
        //        });
        //        add (setStartButton);

        recordShape = new CircleShape(controller.getView());
        recordShape.setColor(Color.red);
        recordShape.setCenterX(10);
        recordShape.setCenterY(10);
        recordShape.setWidth(10);
        recordShape.setHeight(10);
        recordButton = new DrawShapeButton(recordShape);
        recordButton.addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent e) {
                if (recordButton.isPushed()) {
                    controller.setMode(UFOController.BEHAVIOR_TAB);
                } else {
                    controller.setMode(UFOController.ASPECT_TAB);
                }
            }

        });
        buttonGroup.add(recordButton);
        add(recordButton);
        add(stopButton);
        add(runButton);

        int samplingRate = controller.getSamplingRate();
        timeCursor = new Scrollbar(Scrollbar.HORIZONTAL, 0, samplingRate, 0, samplingRate) {
            public Dimension getPreferredSize() {
                return new Dimension(150, 20);
            }
        };

        timeCursor.setBlockIncrement(samplingRate);
        timeCursor.addAdjustmentListener(new AdjustmentListener() {
            /**
             * Invoked when the value of the adjustable has changed.
             */
            public void adjustmentValueChanged(AdjustmentEvent e) {
                long timeCursorMillis = controller.getStartTime().getTime() + e.getValue();
                GregorianCalendar currentTime = controller.getTime();
                currentTime.setTime(new Date(timeCursorMillis));
                setTime(currentTime, true);
            }

        });

        add(timeCursor);

        Button okButton = new Button(messagesBundle.getString("ValidateTestimonial"));
        okButton.addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent e) {
                final Frame outFrame = new Frame(messagesBundle.getString("UUDFDescription"));
                outFrame.addWindowListener(new WindowAdapter() {
                    public void windowClosing(WindowEvent e) {
                        outFrame.setVisible(false);
                        outFrame.dispose();
                    }
                });
                TextArea uudfTextArea = new TextArea();
                outFrame.add(uudfTextArea, BorderLayout.CENTER);
                uudfTextArea.setText(controller.getUUDF());
                //                outFrame.setSize(800, 600);
                outFrame.setVisible(true);
            }
        });
        add(okButton);
    }

    private Polygon getStopShape() {
        Polygon stopShape = new Polygon();
        stopShape.addPoint(10, 10);
        stopShape.addPoint(20, 10);
        stopShape.addPoint(20, 20);
        stopShape.addPoint(10, 20);
        return stopShape;
    }

    private Polygon getPlayShape() {
        Polygon playShape = new Polygon();
        playShape.addPoint(10, 10);
        playShape.addPoint(20, 15);
        playShape.addPoint(10, 20);
        return playShape;
    }

    private void displayTime(Calendar currentTime) {
        Date time = currentTime.getTime();
        //        Date startTime = controller.getStartTime();
        //        int cursorTimeMillis = (int) (time.getTime() - startTime.getTime());
        //        timeCursor.setValue(cursorTimeMillis);

        int millis = currentTime.get(Calendar.MILLISECOND) / controller.getSamplingRate();
        fullDate = controller.getDateFormat().format(time) + millis;
        String dayOfWeek = fullDate.substring(0, fullDate.indexOf(' '));
        dayOfWeekLabel.setText(dayOfWeek);
        yearTextField.setText(String.valueOf(currentTime.get(Calendar.YEAR)));
        monthTextField.setText(String.valueOf(currentTime.get(Calendar.MONTH) + 1));
        dayTextField.setText(String.valueOf(currentTime.get(Calendar.DATE)));
        hourTextField.setText(String.valueOf(currentTime.get(Calendar.HOUR_OF_DAY)));

        String minuteString = String.valueOf(currentTime.get(Calendar.MINUTE));
        if (minuteString.length() == 1) {
            minuteString = "0" + minuteString;
        }
        minutesTextField.setText(minuteString);

        String secondsString = String.valueOf(currentTime.get(Calendar.SECOND));
        if (secondsString.length() == 1) {
            secondsString = "0" + secondsString;
        }
        secondsTextField.setText(secondsString);
    }

    private void setTime(GregorianCalendar newCalendar, boolean updateController) {
        Date endTime = controller.getEndTime();
        Date startTime = controller.getStartTime();
        Date newTime = newCalendar.getTime();
        long newMillis = newCalendar.getTime().getTime();
        if (newMillis > endTime.getTime()) {
            controller.setEndTime(newTime);
        } else if (newMillis < startTime.getTime()) {
            controller.setStartTime(newTime);
        }
        int timeSpan = (int) (controller.getEndTime().getTime() - controller.getStartTime().getTime());
        int timeSinceStart = (int) (newTime.getTime() - startTime.getTime());
        timeCursor.setValues(timeSinceStart, controller.getSamplingRate(), 0, timeSpan);

        if (updateController) {
            controller.setTime(newCalendar);
            controller.draw();
        }
        displayTime(newCalendar);
    }

    void enableToSetTime(boolean flag) {
        yearTextField.setEnabled(flag);
        monthTextField.setEnabled(flag);
        dayTextField.setEnabled(flag);
        hourTextField.setEnabled(flag);
        minutesTextField.setEnabled(flag);
        secondsTextField.setEnabled(flag);
    }

    private void play(boolean on) {
        if (on) {
            GregorianCalendar startTime = controller.getTime();
            if (startTime.getTime().getTime() >= controller.getEndTime().getTime()) {
                startTime.setTime(controller.getStartTime());
            }
            controller.setTime(startTime);
        }
        controller.play(on);
    }

    private int inputTextField(TextField textfield, int min, int max) {
        int value = Integer.parseInt(textfield.getText());
        if (value < min)
            value = min;
        if (value > max)
            value = max;
        textfield.setText(String.valueOf(value));
        return value;
    }
}
