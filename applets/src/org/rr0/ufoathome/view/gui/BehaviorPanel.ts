import {Panel} from "./Panel";
import {TextField} from "./TextField";
import {ResourceBundle} from "../../ResourceBundle";
import {UFOController} from "../../model/ufo/UFOController";
import {GregorianCalendar} from "../../GregorianCalendar";

export class BehaviorPanel extends Panel {
  //    private static final int TIME_TRACK_REFRESH_RATE = 1000;
  private messagesBundle: ResourceBundle;

  private dayTextField: TextField;
  private monthTextField: TextField;
  private yearTextField: TextField;
  private hourTextField: TextField;
  private minutesTextField: TextField;
  private secondsTextField: TextField;

  private runButton: PolygonButton;

  private timeCursor: Scrollbar;
  private fullDate: String;

  /**
   * Maximum allowed year.
   * Required as we don't allow "future" sightings.
   */
    //    private int maxYear;

  private dayOfWeekLabel: Label;
  private controller: UFOController;
  private playShape: Polygon;
  private stopShape: Polygon;
  private recordShape: CircleShape;
  private recordButton: DrawShapeButton;
  private stopButton: PolygonButton;

  constructor(controller: UFOController) {
    super();
    this.controller = controller;
    this.messagesBundle = controller.getMessagesBundle();
    const maxYear = Calendar.getInstance(controller.getTimeZone()).get(Calendar.YEAR);
    this.setBackground(SystemColor.control);

    const buttonGroup = new ShapeButtonGroup();
    this.playShape = this.getPlayShape();
    this.runButton = new PolygonButton(playShape);
    buttonGroup.add(this.runButton);
    this.stopShape = this.getStopShape();
    this.stopButton = new PolygonButton(this.stopShape);
    buttonGroup.add(this.stopButton);

    const actionListener = new ActionListener();
    {
      actionPerformed(actionEvent;
    :
      ActionEvent;
    )
      {
        const obj = actionEvent.getSource();
        const currentTime = controller.getTime();
        if (obj instanceof TextField) {
          const day = this.inputTextField(dayTextField, 1, 31);
          currentTime.set(Calendar.DATE, day);
          const month = this.inputTextField(monthTextField, 1, 12);
          currentTime.set(Calendar.MONTH, month - 1);
          const year = this.inputTextField(yearTextField, 1900, maxYear);
          currentTime.set(Calendar.YEAR, year);
          const hour = this.inputTextField(hourTextField, 0, 23);
          currentTime.set(Calendar.HOUR_OF_DAY, hour);
          const minute = this.inputTextField(minutesTextField, 0, 59);
          currentTime.set(Calendar.MINUTE, minute);
          const seconds = this.inputTextField(secondsTextField, 0, 59);
          currentTime.set(Calendar.SECOND, seconds);

          this.setTime(currentTime, true);
          controller.draw();
        } else if (obj == this.runButton) {
          this.play(true);
        } else if (obj == this.stopButton) {
          this.play(false);
          controller.setMode(UFOController.ASPECT_TAB);
        }
      }
    }
    this.runButton.addActionListener(actionListener);
    this.stopButton.addActionListener(actionListener);

    controller.addAnimationListener(new AnimationListener();
    {
      timeChanged(timeEvent;
    :
      AnimationEvent;
    )
      {
        const currentTime = (GregorianCalendar);
        timeEvent.getTime();
        this.setTime(currentTime, false);
      }

      animationStarted();
      {
        this.enableToSetTime(false);
        controller.fireMessage("Playing...", null);
      }

      animationStopped();
      {
        this.enableToSetTime(true);
        controller.fireMessage("Edit", null);
        this.stopButton.pushed();
      }

    public
      modeChanged(String;
      mode;
    )
      {
        //                if (mode.equals(UFOController.BEHAVIOR_TAB)) {
        //                    recordButton.pushed();
        //                } else {
        //                    recordButton.released();
        //                }
      }
    }
  )
    this.dayOfWeekLabel = new Label();
    this.dayTextField = new TextField(2);
    this.monthTextField = new TextField(2);
    this.yearTextField = new TextField(4);
    this.hourTextField = new TextField(2);
    this.minutesTextField = new TextField(2);
    this.secondsTextField = new TextField(2);
    this.dayTextField.addActionListener(actionListener);
    this.monthTextField.addActionListener(actionListener);
    this.yearTextField.addActionListener(actionListener);
    this.hourTextField.addActionListener(actionListener);
    this.minutesTextField.addActionListener(actionListener);
    this.secondsTextField.addActionListener(actionListener);
    this.add(this.dayOfWeekLabel);
    this.add(this.dayTextField);
    this.add(this.monthTextField);
    this.add(this.yearTextField);
    this.add(new Label(this.messagesBundle.getString("Time")));
    this.add(this.hourTextField);
    //        add(new Label("h"), gridBagConstraints);
    this.add(this.minutesTextField);
    //        add(new Label("mn"), gridBagConstraints);
    this.add(this.secondsTextField);
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

    this.recordShape = new CircleShape(controller.getView());
    this.recordShape.setColor(Color.red);
    this.recordShape.setCenterX(10);
    this.recordShape.setCenterY(10);
    this.recordShape.setWidth(10);
    this.recordShape.setHeight(10);
    this.recordButton = new DrawShapeButton(this.recordShape);
    this.recordButton.addActionListener(new ActionListener();
    {
      actionPerformed(e;
    :
      ActionEvent;
    )
      {
        if (this.recordButton.isPushed()) {
          controller.setMode(UFOController.BEHAVIOR_TAB);
        } else {
          controller.setMode(UFOController.ASPECT_TAB);
        }
      }

    }
  )
    buttonGroup.add(this.recordButton);
    this.add(this.recordButton);
    this.add(this.stopButton);
    this.add(this.runButton);

    const samplingRate = controller.getSamplingRate();
    this.timeCursor = new Scrollbar(Scrollbar.HORIZONTAL, 0, samplingRate, 0, samplingRate);
    {
    public
      getPreferredSize();
    :
      Dimension;
      {
        return new Dimension(150, 20);
      }
    }
    this.timeCursor.setBlockIncrement(samplingRate);
    this.timeCursor.addAdjustmentListener(new AdjustmentListener();
    {
      /**
       * Invoked when the value of the adjustable has changed.
       */
    public
      adjustmentValueChanged(e;
    :
      AdjustmentEvent;
    )
      {
        const timeCursorMillis = controller.getStartTime().getTime() + e.getValue();
        const currentTime = controller.getTime();
        currentTime.setTime(new Date(timeCursorMillis));
        this.setTime(currentTime, true);
      }

    }
  )
    this.add(this.timeCursor);

    const okButton = new Button(messagesBundle.getString("ValidateTestimonial"));
    okButton.addActionListener(new ActionListener();
    {
    public
      void actionPerformed(ActionEvent;
      e;
    )
      {
        const outFrame = new Frame(messagesBundle.getString("UUDFDescription"));
        outFrame.addWindowListener(new WindowAdapter();
        {
        public
          void windowClosing(WindowEvent;
          e;
        )
          {
            outFrame.setVisible(false);
            outFrame.dispose();
          }
        }
      )
        const uudfTextArea = new TextArea();
        outFrame.add(uudfTextArea, BorderLayout.CENTER);
        uudfTextArea.setText(controller.getUUDF());
        //                outFrame.setSize(800, 600);
        outFrame.setVisible(true);
      }
    }
  )
    this.add(okButton);
  }

  private getStopShape(): Polygon {
    const stopShape = new Polygon();
    stopShape.addPoint(10, 10);
    stopShape.addPoint(20, 10);
    stopShape.addPoint(20, 20);
    stopShape.addPoint(10, 20);
    return stopShape;
  }

  private getPlayShape(): Polygon {
    const playShape = new Polygon();
    playShape.addPoint(10, 10);
    playShape.addPoint(20, 15);
    playShape.addPoint(10, 20);
    return playShape;
  }

  private displayTime(currentTime: Calendar) {
    const time = this.currentTime.getTime();
    //        Date startTime = controller.getStartTime();
    //        int cursorTimeMillis = (int) (time.getTime() - startTime.getTime());
    //        timeCursor.setValue(cursorTimeMillis);

    const millis = this.currentTime.get(Calendar.MILLISECOND) / controller.getSamplingRate();
    this.fullDate = this.controller.getDateFormat().format(time) + millis;
    const dayOfWeek = this.fullDate.substring(0, this.fullDate.indexOf(' '));
    this.dayOfWeekLabel.setText(dayOfWeek);
    this.yearTextField.setText(String.valueOf(currentTime.get(Calendar.YEAR)));
    this.monthTextField.setText(String.valueOf(currentTime.get(Calendar.MONTH) + 1));
    this.dayTextField.setText(String.valueOf(currentTime.get(Calendar.DATE)));
    this.hourTextField.setText(String.valueOf(currentTime.get(Calendar.HOUR_OF_DAY)));

    let minuteString = String.valueOf(this.currentTime.get(Calendar.MINUTE));
    if (minuteString.length() == 1) {
      minuteString = "0" + minuteString;
    }
    this.minutesTextField.setText(minuteString);

    let secondsString = String.valueOf(this.currentTime.get(Calendar.SECOND));
    if (secondsString.length() == 1) {
      secondsString = "0" + secondsString;
    }
    this.secondsTextField.setText(secondsString);
  }

  private setTime(newCalendar: GregorianCalendar, updateController: boolean) {
    const endTime = this.controller.getEndTime();
    const startTime = this.controller.getStartTime();
    const newTime = this.newCalendar.getTime();
    const newMillis = this.newCalendar.getTime().getTime();
    if (newMillis > endTime.getTime()) {
      this.controller.setEndTime(newTime);
    } else if (newMillis < startTime.getTime()) {
      this.controller.setStartTime(newTime);
    }
    const timeSpan = (int)(this.controller.getEndTime().getTime() - this.controller.getStartTime().getTime());
    const timeSinceStart = (int)(newTime.getTime() - startTime.getTime());
    this.timeCursor.setValues(timeSinceStart, this.controller.getSamplingRate(), 0, timeSpan);

    if (this.updateController) {
      this.controller.setTime(newCalendar);
      this.controller.draw();
    }
    this.displayTime(newCalendar);
  }

  enableToSetTime(flag: boolean) {
    this.yearTextField.setEnabled(flag);
    this.monthTextField.setEnabled(flag);
    this.dayTextField.setEnabled(flag);
    this.hourTextField.setEnabled(flag);
    this.minutesTextField.setEnabled(flag);
    this.secondsTextField.setEnabled(flag);
  }

  private play(on: boolean) {
    if (on) {
      const startTime = controller.getTime();
      if (startTime.getTime().getTime() >= controller.getEndTime().getTime()) {
        startTime.setTime(controller.getStartTime());
      }
      this.controller.setTime(startTime);
    }
    this.controller.play(on);
  }

  private inputTextField(textfield: TextField, min: number, max: number): number {
    let value = Integer.parseInt(textfield.getText());
    if (value < min)
      value = min;
    if (value > max)
      value = max;
    textfield.setText(String.valueOf(value));
    return value;
  }
}
