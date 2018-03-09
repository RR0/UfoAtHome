import {Component, NgModule, OnInit, VERSION} from "@angular/core";
import {FormsModule} from "@angular/forms";
import {BrowserModule} from "@angular/platform-browser";
import {MessageEvent} from "./MessageEvent";
import {UFOController} from "../../model/ufo/UFOController";
import {TabbedPanel} from "./TabbedPanel";
import {ResourceBundle} from "../../ResourceBundle";
import {GregorianCalendar} from "../../GregorianCalendar";

/**
 * Sighting reporting applet
 */
@Component({
    selector: 'report-applet',
    template: `
<behavior-panel #timePanel [controller]="controller" class="north"></behavior-panel>
<div id="center-panel" class="center">
  <sky-panel [controller]="controller" class="center"></sky-panel>    
  <info-area [controller]="controller" class="south"></info-area>
</div>
<tool-panel class="east"></tool-panel>
`
})
export class ReportApplet implements OnInit {

  skyPanel;
  infoArea;

  /**
   * User's locale
   */
  private locale: Locale;

  /**
   * User's localized time
   */
  private currentTime: GregorianCalendar;

  /**
   * Localized messages to display to the the user
   */
  private messagesBundle: ResourceBundle;

  /**
   * The controller that receives and process user events.
   *
   * @supplierRole controller
   */
  private controller: UFOController;
  private toolPanel: Component;

  /**
   * @supplierRole tabbed panel
   */
  private tabbedPanel: TabbedPanel;
  private infoArea: InfoArea;
  private toolPanel;

  ngOnInit(): void {
    this.messagesBundle = ResourceBundle.getBundle("org.rr0.is.presentation.view.report.applet.StarSkyLabels");

    this.locale = Locale.getDefault();

    this.currentTime = Calendar.getInstance(this.locale);
    const startTime: Date = new Date(this.currentTime.getTime().getTime());
    const endTime:Date  = new Date(this.currentTime.getTime().getTime() + this.SAMPLING_RATE);

    this.controller = new UFOController(this.locale, this.SAMPLING_RATE);
    this.controller.addMessageListener(this);
    this.controller.setStartTime(startTime);
    this.controller.setEndTime(endTime);
    this.controller.setTime(this.currentTime);

    const welcomeMessage: MessageEvent = new MessageEvent(this, "Veuillez spécifier vos coordonn�es (optionnel), puis le lieu de votre observation", null);
    this.message(welcomeMessage);

    this.toolPanel = this.getToolPanel();
  }

  start(): void {
    this.controller.start();
    this.controller.setTime(this.currentTime);
    this.controller.setZoomFactor(60);
    this.tabbedPanel.show(UFOController.WITNESS_TAB);
    this.controller.setTime(this.currentTime);
  }

    public stop() {
      this.controller.play(false);
    }

    public message(message: MessageEvent) {
      this.infoArea.setText(message.getText());
      const editable = message.getEditable();
      this.infoArea.setMessageEditable(editable);
      this.getAppletContext().showStatus(message.getText());
    }

    /**
     * @link dependency
     * @stereotype instantiate
     */
    /*# BehaviorPanel lnkBehaviorPanel; */

    public getAppletInfo(): String {
        let appletInfo: String = "Sighting report applet of the RR0-IS project (http://rr0.sourceforge.net)";
        appletInfo += "License: Apache License (http://apache.org)";
        appletInfo += "Parameters:\n";
        appletInfo += "- longitude (negative or positive, in degrees)\n";
        appletInfo += "- latitude (negative or positive, in degrees)\n";
        appletInfo += "- altitude (negative or positive, in degrees)\n";
        appletInfo += "- azimut (in degrees)\n";
        return appletInfo;
    }

    private SAMPLING_RATE = 15;
}