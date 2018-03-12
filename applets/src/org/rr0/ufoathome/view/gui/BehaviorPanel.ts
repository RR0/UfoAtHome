import {Panel} from "./Panel";
import {TextField} from "./TextField";
import {ResourceBundle} from "../../ResourceBundle";
import {UFOController} from "../../model/ufo/UFOController";
import {GregorianCalendar} from "../../GregorianCalendar";
import {PolygonButton} from "./PolygonButton";
import {Scrollbar} from "./Scrollbar";
import {Label} from "./Label";
import {ActionListener} from "./ActionListener";
import {ActionEvent} from "./ActionEvent";
import {Polygon} from "../../../../../../../JCCKit/src/jcckit/graphic/Polygon";
import {ShapeButtonGroup} from "./ShapeButtonGroup";
import {Calendar} from "../../Calendar";
import {DrawShapeButton} from "./DrawShapeButton";
import {CircleShape} from "../draw/CircleShape";
import {SystemColor} from "./SystemColor";
import {Color} from "./Color";
import {Dimension} from "./Dimension";
import {AnimationListener} from "../draw/AnimationListener";
import {AnimationEvent} from "../draw/AnimationEvent";

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
    this.runButton = new PolygonButton(this.playShape);
    buttonGroup.add(this.runButton);
    this.stopShape = this.getStopShape();
    this.stopButton = new PolygonButton(this.stopShape);
    buttonGroup.add(this.stopButton);

    const outerThis = this;
    const actionListener = new class implements ActionListener {
      actionPerformed(actionEvent: ActionEvent) {
        const obj = actionEvent.getSource();
        const currentTime = controller.getTime();
        if (obj instanceof TextField) {
          const day = outerThis.inputTextField(outerThis.dayTextField, 1, 31);
          currentTime.set(Calendar.DATE, day);
          const month = outerThis.inputTextField(outerThis.monthTextField, 1, 12);
          currentTime.set(Calendar.MONTH, month - 1);
          const year = outerThis.inputTextField(outerThis.yearTextField, 1900, maxYear);
          currentTime.set(Calendar.YEAR, year);
          const hour = outerThis.inputTextField(outerThis.hourTextField, 0, 23);
          currentTime.set(Calendar.HOUR_OF_DAY, hour);
          const minute = outerThis.inputTextField(outerThis.minutesTextField, 0, 59);
          currentTime.set(Calendar.MINUTE, minute);
          const seconds = outerThis.inputTextField(outerThis.secondsTextField, 0, 59);
          currentTime.set(Calendar.SECOND, seconds);

          outerThis.setTime(currentTime, true);
          controller.draw();
        } else if (obj == outerThis.runButton) {
          outerThis.play(true);
        } else if (obj == outerThis.stopButton) {
          outerThis.play(false);
          controller.setMode(UFOController.ASPECT_TAB);
        }
      }
    };
    this.runButton.addActionListener(actionListener);
    this.stopButton.addActionListener(actionListener);

    controller.addAnimationListener(new class implements AnimationListener {
      timeChanged(timeEvent: AnimationEvent) {
        const currentTime = <GregorianCalendar>timeEvent.getTime();
        outerThis.setTime(currentTime, false);
      }

      animationStarted() {
        outerThis.enableToSetTime(false);
        controller.fireMessage("Playing...", null);
      }

      animationStopped() {
        outerThis.enableToSetTime(true);
        controller.fireMessage("Edit", null);
        outerThis.stopButton.pushed();
      }

      modeChanged(mode: String) {
        //                if (mode.equals(UFOController.BEHAVIOR_TAB)) {
        //                    recordButton.pushed();
        //                } else {
        //                    recordButton.released();
        //                }
      }
    });

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
    this.recordButton.addActionListener(new class implements ActionListener {
      actionPerformed(e: ActionEvent) {
        if (outerThis.recordButton.isPushed()) {
          controller.setMode(UFOController.BEHAVIOR_TAB);
        } else {
          controller.setMode(UFOController.ASPECT_TAB);
        }
      }
    });
    buttonGroup.add(this.recordButton);
    this.add(this.recordButton);
    this.add(this.stopButton);
    this.add(this.runButton);

    const samplingRate = controller.getSamplingRate();
    this.timeCursor = new class extends Scrollbar {
      getPreferredSize(): Dimension {
        return new Dimension(150, 20);
      }
    }(Scrollbar.HORIZONTAL, 0, samplingRate, 0, samplingRate);

    this.timeCursor.setBlockIncrement(samplingRate);
    this.timeCursor.addAdjustmentListener(new class implements AdjustmentListener {
        /**
         * Invoked when the value of the adjustable has changed.
         */
        adjustmentValueChanged(e: AdjustmentEvent) {
          const timeCursorMillis = this.controller.getStartTime().getTime() + e.getValue();
          const currentTime = this.controller.getTime();
          currentTime.setTime(new Date(timeCursorMillis));
          this.setTime(currentTime, true);
        }
      }
    );
    this.add(this.timeCursor);

    const okButton = new Button(this.messagesBundle.getString("ValidateTestimonial"));
    okButton.addActionListener(new class implements ActionListener {
      actionPerformed(e: ActionEvent) {
        const outFrame = new Frame(outerThis.messagesBundle.getString("UUDFDescription"));
        outFrame.addWindowListener(new class extends WindowAdapter {
          windowClosing(e: WindowEvent) {
            outFrame.setVisible(false);
            outFrame.dispose();
          }
        });

        const uudfTextArea = new TextArea();
        outFrame.add(uudfTextArea, BorderLayout.CENTER);
        uudfTextArea.setText(controller.getUUDF());
        //                outFrame.setSize(800, 600);
        outFrame.setVisible(true);
      }
    });

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
    const time = currentTime.getTime();
    //        Date startTime = controller.getStartTime();
    //        int cursorTimeMillis = (int) (time.getTime() - startTime.getTime());
    //        timeCursor.setValue(cursorTimeMillis);

    const millis = currentTime.get(Calendar.MILLISECOND) / this.controller.getSamplingRate();
    this.fullDate = this.controller.getDateFormat().format(time) + millis;
    const dayOfWeek = this.fullDate.substring(0, this.fullDate.indexOf(' '));
    this.dayOfWeekLabel.setText(dayOfWeek);
    this.yearTextField.setText(String.valueOf(currentTime.get(Calendar.YEAR)));
    this.monthTextField.setText(String.valueOf(currentTime.get(Calendar.MONTH) + 1));
    this.dayTextField.setText(String.valueOf(currentTime.get(Calendar.DATE)));
    this.hourTextField.setText(String.valueOf(currentTime.get(Calendar.HOUR_OF_DAY)));

    let minuteString = currentTime.get(Calendar.MINUTE).toString();
    if (minuteString.length == 1) {
      minuteString = "0" + minuteString;
    }
    this.minutesTextField.setText(minuteString);

    let secondsString = currentTime.get(Calendar.SECOND).toString();
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
    const timeSpan = this.controller.getEndTime().getTime() - this.controller.getStartTime().getTime();
    const timeSinceStart = newTime.getTime() - startTime.getTime();
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
      const startTime = this.controller.getTime();
      if (startTime.getTime().getTime() >= this.controller.getEndTime().getTime()) {
        startTime.setTime(this.controller.getStartTime());
      }
      this.controller.setTime(startTime);
    }
    this.controller.play(on);
  }

  private inputTextField(textfield: TextField, min: number, max: number): number {
    let value = parseInt(textfield.getText());
    if (value < min)
      value = min;
    if (value > max)
      value = max;
    textfield.setText(value.toString());
    return value;
  }
}
