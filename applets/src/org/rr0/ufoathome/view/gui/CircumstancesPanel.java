package org.rr0.ufoathome.view.gui;

import org.rr0.ufoathome.view.draw.AnimationEvent;
import org.rr0.ufoathome.view.draw.AnimationListener;
import org.rr0.ufoathome.model.ufo.UFOController;

import java.awt.*;
import java.awt.event.ItemEvent;
import java.awt.event.ItemListener;
import java.awt.event.TextEvent;
import java.awt.event.TextListener;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.Enumeration;
import java.util.Hashtable;
import java.util.ResourceBundle;

/**
 * @author Jerôme Beau
 * @version 26 févr. 2004 12:05:56
 */
public class CircumstancesPanel extends Panel {
    private ResourceBundle messagesBundle;

    public CircumstancesPanel(final UFOController controller) {
        messagesBundle = controller.getMessagesBundle();

        setBackground(SystemColor.control);
        GridBagLayout recordGridBagLayout = new GridBagLayout();
        setLayout(recordGridBagLayout);
        GridBagConstraints gridBagConstraints = new GridBagConstraints();
        gridBagConstraints.anchor = GridBagConstraints.WEST;

        {
            gridBagConstraints.gridy = 0;
            Label skyLabel = new Label(messagesBundle.getString("Clouds"));
            add(skyLabel, gridBagConstraints);
            Choice skyChoice = new Choice();
            add(skyChoice, gridBagConstraints);
            Enumeration skyKeys = messagesBundle.getKeys();
            final Hashtable skyNameToKey = new Hashtable();
            while (skyKeys.hasMoreElements()) {
                String landscapeKey = (String) skyKeys.nextElement();
                if (landscapeKey.startsWith("clouds.") && !landscapeKey.endsWith(".URL")) {
                    String landscapeName = messagesBundle.getString(landscapeKey);
                    skyChoice.add(landscapeName);
                    skyNameToKey.put(landscapeName, landscapeKey);
                }
            }
            skyChoice.select(messagesBundle.getString("clouds.None"));
            skyChoice.addItemListener(new ItemListener() {
                public void itemStateChanged(ItemEvent e) {
                    String landscapeName = (String) e.getItem();
                    String weatherKey = (String) skyNameToKey.get(landscapeName);
                    URL url;
                    try {
                        url = getURL(weatherKey);
                        //                        urlTextField.setText(url.toString());
                    } catch (Exception e1) {
                        e1.printStackTrace();
                        url = null;
                        //                        urlTextField.setText("");
                    }
                    url = controller.setWeather(url);
                    controller.draw();
                }
            });
        }

        {
            gridBagConstraints.gridy = 1;
            Label skyLabel = new Label(messagesBundle.getString("Odor"));
            add(skyLabel, gridBagConstraints);
            Choice skyChoice = new Choice();
            add(skyChoice, gridBagConstraints);
            Enumeration skyKeys = messagesBundle.getKeys();
            final Hashtable skyNameToKey = new Hashtable();
            while (skyKeys.hasMoreElements()) {
                String landscapeKey = (String) skyKeys.nextElement();
                if (landscapeKey.startsWith("odor.")) {
                    String landscapeName = messagesBundle.getString(landscapeKey);
                    skyChoice.add(landscapeName);
                    skyNameToKey.put(landscapeName, landscapeKey);
                }
            }
            skyChoice.select(messagesBundle.getString("odor.None"));
            skyChoice.addItemListener(new ItemListener() {
                public void itemStateChanged(ItemEvent e) {
                    String landscapeName = (String) e.getItem();
                    String weatherKey = (String) skyNameToKey.get(landscapeName);
                    controller.setOdor(weatherKey);
                }
            });
        }

        {
            gridBagConstraints.gridy = 2;
            Label skyLabel = new Label(messagesBundle.getString("Temperature"));
            add(skyLabel, gridBagConstraints);
            Choice skyChoice = new Choice();
            add(skyChoice, gridBagConstraints);
            Enumeration skyKeys = messagesBundle.getKeys();
            final Hashtable skyNameToKey = new Hashtable();
            while (skyKeys.hasMoreElements()) {
                String landscapeKey = (String) skyKeys.nextElement();
                if (landscapeKey.startsWith("temperature.")) {
                    String landscapeName = messagesBundle.getString(landscapeKey);
                    skyChoice.add(landscapeName);
                    skyNameToKey.put(landscapeName, landscapeKey);
                }
            }
            skyChoice.addItemListener(new ItemListener() {
                public void itemStateChanged(ItemEvent e) {
                    String landscapeName = (String) e.getItem();
                    String weatherKey = (String) skyNameToKey.get(landscapeName);
                    controller.setTemperature(weatherKey);
                }
            });
        }

        {
            gridBagConstraints.gridy = 3;
            Label skyLabel = new Label(messagesBundle.getString("Wind"));
            add(skyLabel, gridBagConstraints);
            Choice skyChoice = new Choice();
            add(skyChoice, gridBagConstraints);
            Enumeration skyKeys = messagesBundle.getKeys();
            final Hashtable skyNameToKey = new Hashtable();
            while (skyKeys.hasMoreElements()) {
                String landscapeKey = (String) skyKeys.nextElement();
                if (landscapeKey.startsWith("wind.")) {
                    String landscapeName = messagesBundle.getString(landscapeKey);
                    skyChoice.add(landscapeName);
                    skyNameToKey.put(landscapeName, landscapeKey);
                }
            }
            skyChoice.select(messagesBundle.getString("wind.None"));
            skyChoice.addItemListener(new ItemListener() {
                public void itemStateChanged(ItemEvent e) {
                    String landscapeName = (String) e.getItem();
                    String weatherKey = (String) skyNameToKey.get(landscapeName);
                    controller.setWind(weatherKey);
                }
            });
        }

        {
            gridBagConstraints.gridy = 4;
            Label skyLabel = new Label(messagesBundle.getString("Precipitations"));
            add(skyLabel, gridBagConstraints);
            Choice skyChoice = new Choice();
            add(skyChoice, gridBagConstraints);
            Enumeration skyKeys = messagesBundle.getKeys();
            final Hashtable skyNameToKey = new Hashtable();
            while (skyKeys.hasMoreElements()) {
                String landscapeKey = (String) skyKeys.nextElement();
                if (landscapeKey.startsWith("precipitations.")) {
                    String landscapeName = messagesBundle.getString(landscapeKey);
                    skyChoice.add(landscapeName);
                    skyNameToKey.put(landscapeName, landscapeKey);
                }
            }
            skyChoice.select(messagesBundle.getString("precipitations.None"));
            skyChoice.addItemListener(new ItemListener() {
                public void itemStateChanged(ItemEvent e) {
                    String landscapeName = (String) e.getItem();
                    String weatherKey = (String) skyNameToKey.get(landscapeName);
                    controller.setPrecipitations(weatherKey);
                }
            });
        }

        {
            gridBagConstraints.gridy = 5;
            add(new Label("Description"), gridBagConstraints);

            gridBagConstraints.gridx = 1;
            gridBagConstraints.fill = GridBagConstraints.BOTH;
            gridBagConstraints.weighty = 1.0;
            gridBagConstraints.weightx = 1.0;

            final TextArea description = new TextArea("", 0, 0, TextArea.SCROLLBARS_VERTICAL_ONLY) {
                public Dimension getPreferredSize() {
                    return new Dimension(getSize().width - 100, 30);
                }
            };
            description.addTextListener(new TextListener() {
                public void textValueChanged(TextEvent e) {
                    controller.setDescription(description.getText());
                }
            });

            controller.addAnimationListener(new AnimationListener() {
                public void timeChanged(AnimationEvent timeEvent) {
                    description.setText(controller.getDescription());
                }

                public void animationStarted() {

                }

                public void animationStopped() {

                }

                public void modeChanged(String mode) {

                }
            });

            add(description, gridBagConstraints);
        }
    }

    private URL getURL(String bundleKey) throws MalformedURLException {
        String filename = messagesBundle.getString(bundleKey + ".URL");
        URL url = new URL(filename);
        return url;
    }
}
