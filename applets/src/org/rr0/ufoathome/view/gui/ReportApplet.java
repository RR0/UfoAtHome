package org.rr0.ufoathome.view.gui;

import org.rr0.ufoathome.view.draw.DrawEvent;
import org.rr0.ufoathome.view.draw.DrawListener;
import org.rr0.ufoathome.model.ufo.UFO;
import org.rr0.ufoathome.model.ufo.UFOController;
import org.rr0.ufoathome.model.sky.SkyEvent;
import org.rr0.ufoathome.model.sky.SkyListener;
import org.rr0.ufoathome.model.sky.SkyView;

import java.applet.Applet;
import java.awt.*;
import java.util.*;

/**
 * Sighting reporting applet
 *
 * @author Jerome Beau
 * @version 0.3
 */
public class ReportApplet extends Applet implements MessageListener {
    /**
     * User's locale
     */
    private Locale locale;

    /**
     * User's localized time
     */
    private GregorianCalendar currentTime;

    /**
     * Localized messages to display to the the user
     */
    private ResourceBundle messagesBundle;

    /**
     * The controller that receives and process user events.
     *
     * @supplierRole controller
     */
    private UFOController controller;
    private Component toolPanel;

    /**
     * @supplierRole tabbed panel
     */
    private TabbedPanel tabbedPanel;
    private InfoArea infoArea;

    public void init() {
        setLayout(new BorderLayout());
        messagesBundle = ResourceBundle.getBundle("org.rr0.is.presentation.view.report.applet.StarSkyLabels");

        locale = Locale.getDefault();

        currentTime = (GregorianCalendar) Calendar.getInstance(locale);
        Date startTime = new Date(currentTime.getTime().getTime());
        Date endTime = new Date(currentTime.getTime().getTime() + SAMPLING_RATE);

        controller = new UFOController(locale, SAMPLING_RATE);
        controller.addMessageListener(this);
        controller.setStartTime(startTime);
        controller.setEndTime(endTime);
        controller.setTime(currentTime);

        Panel timePanel = new BehaviorPanel(controller);
        add(timePanel, BorderLayout.NORTH);

        Panel centerPanel = new Panel(new BorderLayout());
        add(centerPanel, BorderLayout.CENTER);

        Component skyPanel = getSkyPanel((SkyView) controller.getView());
        centerPanel.add(skyPanel, BorderLayout.CENTER);

        infoArea = new InfoArea();
        centerPanel.add(infoArea, BorderLayout.SOUTH);
        MessageEvent welcomeMessage = new MessageEvent(this, "Veuillez spécifier vos coordonnées (optionnel), puis le lieu de votre observation", null);
        message(welcomeMessage);

        toolPanel = getToolPanel();
        add(toolPanel, BorderLayout.EAST);
    }

    private Component getSkyPanel(final SkyView view) {
        Panel skyPanel = new Panel(new BorderLayout());
        skyPanel.setBackground(SystemColor.control);

        skyPanel.add(view, BorderLayout.CENTER);

        controller.addSkyListener(new SkyListener() {
            public void azimutChanged(SkyEvent skyEvent) {
            }

            public void altitudeChanged(SkyEvent skyEvent) {
            }

            public void longitudeChanged(SkyEvent skyEvent) {
                tabbedPanel.setEnabled(UFOController.ASPECT_TAB, true);
            }

            public void latitudeChanged(SkyEvent skyEvent) {
                tabbedPanel.setEnabled(UFOController.ASPECT_TAB, true);
            }

        });

        return skyPanel;
    }

    public void start() {
        controller.start();
        controller.setTime(currentTime);
        controller.setZoomFactor(60);
        tabbedPanel.show(UFOController.WITNESS_TAB);
        controller.setTime(currentTime);
    }

    private Component getToolPanel() {
        Panel toolPanel = new Panel(new BorderLayout());
        toolPanel.setBackground(SystemColor.control);

        controller.setMode(UFOController.ASPECT_TAB);

        tabbedPanel = getTabbedPanel();
        toolPanel.add(tabbedPanel, BorderLayout.CENTER);

        return toolPanel;
    }

    private TabbedPanel getTabbedPanel() {
        final TabbedPanel tabbedPanel = new TabbedPanel();

        WitnessPanel witnessPanel = new WitnessPanel(controller);
        tabbedPanel.addPanel(witnessPanel, UFOController.WITNESS_TAB, messagesBundle.getString(UFOController.WITNESS_TAB));

        LocationPanel locationPanel = new LocationPanel(controller);
        tabbedPanel.addPanel(locationPanel, UFOController.LOCATION_TAB, messagesBundle.getString(UFOController.LOCATION_TAB));

        CircumstancesPanel circumstancePanel = new CircumstancesPanel(controller);
        tabbedPanel.addPanel(circumstancePanel, UFOController.CIRCUMSTANCES_TAB, messagesBundle.getString(UFOController.CIRCUMSTANCES_TAB));

        Panel drawPanel = new AspectPanel(controller);
        tabbedPanel.addPanel(drawPanel, UFOController.ASPECT_TAB, messagesBundle.getString(UFOController.ASPECT_TAB));
        tabbedPanel.setEnabled(UFOController.ASPECT_TAB, false);

        controller.addDrawListener(new DrawListener() {
            public void eventSelected(DrawEvent event) {
                UFO currentUFO = (UFO) event.getSource();
                if (currentUFO == null) {
                    tabbedPanel.setEnabled(UFOController.BEHAVIOR_TAB, false);
                } else {
                    tabbedPanel.setEnabled(UFOController.BEHAVIOR_TAB, true);
                }
            }

            public void eventRecorded(DrawEvent event) {
            }

            public void eventDeleted(DrawEvent ufoEvent) {
                if (!controller.getUFOs().isEmpty()) {
                    tabbedPanel.setEnabled(UFOController.BEHAVIOR_TAB, false);
                }
            }

            public void backgroundClicked() {
            }
        });

        return tabbedPanel;
    }

    public void stop() {
        controller.play(false);
    }

    public void message(MessageEvent message) {
        infoArea.setText(message.getText());
        MessageEditable editable = message.getEditable();
        infoArea.setMessageEditable(editable);
        getAppletContext().showStatus(message.getText());
    }

    /**
     * @link dependency
     * @stereotype instantiate
     */
    /*# BehaviorPanel lnkBehaviorPanel; */

    public String getAppletInfo() {
        String appletInfo = "Sighting report applet of the RR0-IS project (http://rr0.sourceforge.net)";
        appletInfo += "License: Apache License (http://apache.org)";
        appletInfo += "Parameters:\n";
        appletInfo += "- longitude (negative or positive, in degrees)\n";
        appletInfo += "- latitude (negative or positive, in degrees)\n";
        appletInfo += "- altitude (negative or positive, in degrees)\n";
        appletInfo += "- azimut (in degrees)\n";
        return appletInfo;
    }

    class InfoArea extends TextField {
        private MessageEditable editable;

        public void setMessageEditable(MessageEditable editable) {
            this.editable = editable;
            setEnabled(editable != null);
        }

        public boolean action(Event evt, Object what) {
            controller.setMessage(editable, getText());
            return true;
        }
    }

    private static final int SAMPLING_RATE = 15;
}
