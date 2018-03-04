package org.rr0.ufoathome.view.gui;

import org.rr0.ufoathome.model.ufo.UFOController;
import org.rr0.ufoathome.model.sky.SkyEvent;
import org.rr0.ufoathome.model.sky.SkyListener;

import java.awt.*;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.ItemEvent;
import java.awt.event.ItemListener;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.*;

/**
 * GUI to specify the location characteristics.
 *
 * @author Jerome Beau
 * @version 0.3
 */
public class LocationPanel extends Panel {
    private ResourceBundle messagesBundle;

    private TextField longitudeTextField;
    private TextField latitudeTextField;
    private TextField azimutTextField;
    private TextField altitudeTextField;
    private Choice azimutChoice;
    private Choice gmtChoice;

    private int[] azimutDegrees = new int[]{0, 45, 90, 135, 180, 225, 270, 315, 360};
    private String[] azimutNames = new String[]{"South", "SouthWest", "West", "NorthWest", "North", "NorthEast", "East", "SouthEast", "South"};
    private Choice placeChoice;
    private UFOController controller;
    private Choice countryChoice;
    private TextField urlTextField;
    private TextField altitudeMinTextField;
    private TextField altitudeMaxTextField;
    private TextField azimutMinTextField;
    private TextField azimutMaxTextField;
    private static final String LOCATION_TAB = "Location";
    private static final String LANDSCAPE_TAB = "Landscape";
    private static final String MAP_TAB = "Map";

    public LocationPanel(final UFOController controller) {
        this.controller = controller;
        messagesBundle = controller.getMessagesBundle();

        skyListener = new SkyListener() {
            public void azimutChanged(SkyEvent skyEvent) {
                int azimut = ((Integer) skyEvent.getValue()).intValue();
                for (int i = 1; i < azimutDegrees.length; i++) {
                    int previousAzimut = azimutDegrees[i - 1];
                    int currentAzimut = azimutDegrees[i];
                    int halfInterval = (currentAzimut - previousAzimut) / 2;
                    if (azimut > previousAzimut + halfInterval && azimut <= currentAzimut + halfInterval) {
                        azimutChoice.select(i);
                    }
                }
                azimutTextField.setText(Integer.toString(azimut));
            }

            public void altitudeChanged(SkyEvent skyEvent) {
                int altitude = ((Integer) skyEvent.getValue()).intValue();
                if (skyEvent.getSource() != altitudeTextField) {
                    altitudeTextField.setText(Integer.toString(altitude));
                }
            }

            public void longitudeChanged(SkyEvent skyEvent) {
                float longitude = ((Double) skyEvent.getValue()).floatValue();
                longitudeTextField.setText(Float.toString(longitude));
            }

            public void latitudeChanged(SkyEvent skyEvent) {
                float latitude = ((Double) skyEvent.getValue()).floatValue();
                latitudeTextField.setText(Float.toString(latitude));
            }
        };

        setBackground(SystemColor.control);
        GridBagConstraints gridBagConstraints = new GridBagConstraints();
        gridBagConstraints.anchor = GridBagConstraints.WEST;

        TabbedPanel tabbedPanel = new TabbedPanel();
        add(tabbedPanel);

        tabbedPanel.addItemListener(new ItemListener() {
            public void itemStateChanged(ItemEvent e) {
                TabbedPanel.Tab tab = (TabbedPanel.Tab) e.getItem();
                if (tab.getName().equals(MAP_TAB)) {
                    controller.setMode(MAP_TAB);
                } else {
                    controller.setMode(UFOController.ASPECT_TAB);
                }
            }
        });

        Panel locationPanel = getPositionPanel();
        tabbedPanel.addPanel(locationPanel, LOCATION_TAB, messagesBundle.getString(LOCATION_TAB));

        Panel mapPanel = new MapPanel(controller);
        tabbedPanel.addPanel(mapPanel, MAP_TAB, messagesBundle.getString(MAP_TAB));

        Panel landscapePanel = getLandscapePanel();
        tabbedPanel.addPanel(landscapePanel, LANDSCAPE_TAB, messagesBundle.getString(LANDSCAPE_TAB));

        tabbedPanel.show(LOCATION_TAB);

        controller.addSkyListener(skyListener);
    }

    private Panel getLandscapePanel() {
        GridBagConstraints gridBagConstraints = new GridBagConstraints();
        gridBagConstraints.anchor = GridBagConstraints.WEST;
        Panel landscapePanel = new Panel(new GridBagLayout());

        gridBagConstraints.gridy = 0;
        Label landscapeLabel = new Label(messagesBundle.getString(LANDSCAPE_TAB));
        landscapePanel.add(landscapeLabel, gridBagConstraints);
        Choice landscapeChoice = new Choice();
        landscapePanel.add(landscapeChoice, gridBagConstraints);

        gridBagConstraints.gridy = 1;
        gridBagConstraints.fill = GridBagConstraints.HORIZONTAL;
        Label urlLabel = new Label("URL");
        landscapePanel.add(urlLabel, gridBagConstraints);
        urlTextField = new TextField();
        urlTextField.addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent e) {
                String urlText = urlTextField.getText();
                int minAltitude = Integer.parseInt(altitudeMinTextField.getText());
                int maxAltitude = Integer.parseInt(altitudeMaxTextField.getText());
                int minAzimut = Integer.parseInt(azimutMinTextField.getText());
                int maxAzimut = Integer.parseInt(azimutMaxTextField.getText());
                setLandscape(urlText, minAltitude, maxAltitude, minAzimut, maxAzimut);
            }
        });
        landscapePanel.add(urlTextField, gridBagConstraints);

        Enumeration landscapeKeys = messagesBundle.getKeys();
        final Hashtable landscapeNameToKey = new Hashtable();
        while (landscapeKeys.hasMoreElements()) {
            String landscapeKey = (String) landscapeKeys.nextElement();
            if (landscapeKey.startsWith("landscape.") && !landscapeKey.endsWith(".URL")) {
                String landscapeName = messagesBundle.getString(landscapeKey);
                landscapeChoice.add(landscapeName);
                landscapeNameToKey.put(landscapeName, landscapeKey);
            }
        }
        landscapeChoice.select(messagesBundle.getString("landscape.None"));
        landscapeChoice.addItemListener(new ItemListener() {
            public void itemStateChanged(ItemEvent e) {
                String landscapeName = (String) e.getItem();
                String landscapeKey = (String) landscapeNameToKey.get(landscapeName);
                int minAltitude = -90;
                int maxAltitude = 90;
                int minAzimut = 0;
                int maxAzimut = 360;
                String fileName;
                try {
                    String filename = messagesBundle.getString(landscapeKey + ".URL");
                    StringTokenizer stringTokenizer = new StringTokenizer(filename, ",");
                    fileName = stringTokenizer.nextToken();
                    if (stringTokenizer.hasMoreTokens()) {
                        minAltitude = Integer.parseInt(stringTokenizer.nextToken());
                        if (stringTokenizer.hasMoreTokens()) {
                            maxAltitude = Integer.parseInt(stringTokenizer.nextToken());
                            if (stringTokenizer.hasMoreTokens()) {
                                minAzimut = Integer.parseInt(stringTokenizer.nextToken());
                                if (stringTokenizer.hasMoreTokens()) {
                                    maxAzimut = Integer.parseInt(stringTokenizer.nextToken());
                                }
                            }
                        }
                    }
                } catch (MissingResourceException ex) {
                    fileName = null;
                }
                setLandscape(fileName, minAltitude, maxAltitude, minAzimut, maxAzimut);
            }
        });

        ActionListener landscapeDegreesActionListener = new ActionListener() {
            public void actionPerformed(ActionEvent e) {
                int minAltitude = Integer.parseInt(altitudeMinTextField.getText());
                int maxAltitude = Integer.parseInt(altitudeMaxTextField.getText());
                int minAzimut = Integer.parseInt(azimutMinTextField.getText());
                int maxAzimut = Integer.parseInt(azimutMaxTextField.getText());
                setLandscape(urlTextField.getText(), minAltitude, maxAltitude, minAzimut, maxAzimut);
            }
        };
        {
            gridBagConstraints.gridy = 2;
            Label altitudeMaxLabel = new Label(messagesBundle.getString("AltitudeMax"));
            landscapePanel.add(altitudeMaxLabel, gridBagConstraints);
            altitudeMaxTextField = new TextField();
            altitudeMaxTextField.addActionListener(landscapeDegreesActionListener);
            landscapePanel.add(altitudeMaxTextField, gridBagConstraints);
        }

        {
            gridBagConstraints.gridy = 3;
            Label altitudeMinLabel = new Label(messagesBundle.getString("AltitudeMin"));
            landscapePanel.add(altitudeMinLabel, gridBagConstraints);
            altitudeMinTextField = new TextField();
            altitudeMinTextField.addActionListener(landscapeDegreesActionListener);
            landscapePanel.add(altitudeMinTextField, gridBagConstraints);
        }

        {
            gridBagConstraints.gridy = 4;
            Label azimutMinLabel = new Label(messagesBundle.getString("AzimutMin"));
            landscapePanel.add(azimutMinLabel, gridBagConstraints);
            azimutMinTextField = new TextField();
            azimutMinTextField.addActionListener(landscapeDegreesActionListener);
            landscapePanel.add(azimutMinTextField, gridBagConstraints);
        }

        {
            gridBagConstraints.gridy = 5;
            Label azimutMaxLabel = new Label(messagesBundle.getString("AzimutMax"));
            landscapePanel.add(azimutMaxLabel, gridBagConstraints);
            azimutMaxTextField = new TextField();
            azimutMaxTextField.addActionListener(landscapeDegreesActionListener);
            landscapePanel.add(azimutMaxTextField, gridBagConstraints);
        }

        return landscapePanel;
    }

    private Panel getPositionPanel() {
        Panel locationPanel = new Panel(new GridBagLayout());
        GridBagConstraints gridBagConstraints = new GridBagConstraints();
        gridBagConstraints.anchor = GridBagConstraints.WEST;

        Label countryLabel = new Label(messagesBundle.getString("Country"));
        locationPanel.add(countryLabel, gridBagConstraints);
        countryChoice = new Choice();
        countryChoice.add(messagesBundle.getString("country.Other"));
        for (int i = 0; i < Place.COUNTRIES.length; i++) {
            Country country = Place.COUNTRIES[i];
            String countryName = country.getName();
            countryChoice.add(countryName);
        }
        locationPanel.add(countryChoice, gridBagConstraints);
        countryChoice.addItemListener(new ItemListener() {
            public void itemStateChanged(ItemEvent e) {
                String countryName = (String) e.getItem();
                selectCountry(countryName);
            }
        });

        gridBagConstraints.gridy = 1;
        Label placeLabel = new Label(messagesBundle.getString(LOCATION_TAB));
        locationPanel.add(placeLabel, gridBagConstraints);
        placeChoice = new Choice();
        placeChoice.add(messagesBundle.getString("location.Other"));
        locationPanel.add(placeChoice, gridBagConstraints);
        placeChoice.addItemListener(new ItemListener() {
            public void itemStateChanged(ItemEvent e) {
                String placeName = (String) e.getItem();
                selectPlace(placeName);
            }
        });

        gridBagConstraints.gridy = 2;
        Label timeZoneLabel = new Label(messagesBundle.getString("TimeZone"));
        locationPanel.add(timeZoneLabel, gridBagConstraints);
        gmtChoice = new Choice();
        for (int i = -12; i <= 12; i++) {
            gmtChoice.add("GMT" + (i >= 0 ? "+" + i : "" + i));
        }
        locationPanel.add(gmtChoice, gridBagConstraints);

        gridBagConstraints.gridy = 3;
        Label longitudeLabel = new Label(messagesBundle.getString("Longitude"));
        locationPanel.add(longitudeLabel, gridBagConstraints);
        longitudeTextField = new TextField(Double.toString(controller.getLongitude()), 4);
        longitudeTextField.addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent e) {
                controller.setLongitude(new Double(longitudeTextField.getText()).doubleValue());
                controller.draw();
            }
        });
        locationPanel.add(longitudeTextField, gridBagConstraints);

        gridBagConstraints.gridy = 4;
        Label latitudeLabel = new Label(messagesBundle.getString("Latitude"));
        locationPanel.add(latitudeLabel, gridBagConstraints);
        latitudeTextField = new TextField(Double.toString(controller.getLatitude()), 4);
        latitudeTextField.addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent e) {
                controller.setLatitude(new Double(latitudeTextField.getText()).doubleValue());
                controller.draw();
            }
        });
        locationPanel.add(latitudeTextField, gridBagConstraints);

        gridBagConstraints.gridy = 5;
        Label orientationLabel = new Label(messagesBundle.getString("Orientation"));
        locationPanel.add(orientationLabel, gridBagConstraints);
        azimutChoice = new Choice();
        for (int i = 0; i < azimutNames.length; i++) {
            String azimutName = messagesBundle.getString(azimutNames[i]);
            azimutChoice.add(azimutName);
        }
        azimutChoice.addItemListener(new ItemListener() {
            public void itemStateChanged(ItemEvent e) {
                String azimutName = e.getItem().toString();
                for (int i = 0; i < azimutDegrees.length; i++) {
                    if (messagesBundle.getString(azimutNames[i]).equals(azimutName)) {
                        int azimut = azimutDegrees[i];
                        setAzimut(azimut);
                        break;
                    }
                }
            }
        });
        locationPanel.add(azimutChoice, gridBagConstraints);
        gridBagConstraints.gridy = 6;
        Label azimutLabel = new Label(messagesBundle.getString("Azimut"));
        locationPanel.add(azimutLabel, gridBagConstraints);
        azimutTextField = new TextField(Double.toString(controller.getAzimut()), 2);
        azimutTextField.addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent e) {
                int azimut = Integer.parseInt(azimutTextField.getText());
                setAzimut(azimut);
            }

        });
        locationPanel.add(azimutTextField, gridBagConstraints);

        gridBagConstraints.gridy = 7;
        Label altitudeLabel = new Label(messagesBundle.getString("Altitude"));
        locationPanel.add(altitudeLabel, gridBagConstraints);
        altitudeTextField = new TextField(Double.toString(controller.getAltitude()), 2);
        altitudeTextField.addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent e) {
                int altitude = Integer.parseInt(altitudeTextField.getText());
                setAltitude(altitude);
            }
        });
        locationPanel.add(altitudeTextField, gridBagConstraints);

        return locationPanel;
    }

    private void setLandscape(String fileName, int minAltitude, int maxAltitude, int minAzimut, int maxAzimut) {
        URL url = null;
        try {
            url = new URL(fileName);
            url = controller.setLandscape(url, minAltitude, maxAltitude, minAzimut, maxAzimut);
        } catch (MalformedURLException e1) {
            e1.printStackTrace();
            urlTextField.setText("");
        }
        altitudeMinTextField.setText(Integer.toString(minAltitude));
        altitudeMaxTextField.setText(Integer.toString(maxAltitude));
        azimutMinTextField.setText(Integer.toString(minAzimut));
        azimutMaxTextField.setText(Integer.toString(maxAzimut));
        urlTextField.setText(url == null ? "" : url.toString());
        controller.draw();
    }

    private void setAltitude(int altitude) {
        boolean handled = controller.setAltitude(altitude, altitudeTextField);
        if (handled) {
            controller.draw();
        } else {
            altitudeTextField.setText(Integer.toString(controller.getAltitude()));
        }
    }

    private void setAzimut(int azimut) {
        boolean handled = controller.setAzimut(azimut, azimutChoice);
        if (handled) {
            controller.draw();
            azimutTextField.setText(Integer.toString(azimut));
        }
    }

    //    public void start() {
    //        selectCountry(controller.getLocale().getDisplayCountry());
    //    }

    private void selectPlace(String placeName) {
        for (int i = 0; i < Place.PLACES.length; i++) {
            Place place = Place.PLACES[i];
            if (place.getName().equals(placeName)) {
                float longitude = place.getLongideg();
                float latitude = place.getLatdeg();
                controller.setLongitude(longitude);
                controller.setLatitude(latitude);
                controller.setTimeZone(place.getTimeZone());
                int offset = controller.getOffset();
                String s = "GMT" + (offset >= 0 ? "+" + offset : "" + offset);
                gmtChoice.select(s);
                controller.draw();
                break;
            }
        }
    }

    private void selectCountry(String countryName) {
        countryChoice.select(countryName);
        for (int i = 0; i < Place.COUNTRIES.length; i++) {
            Country country = Place.COUNTRIES[i];
            if (country.getName().equals(countryName)) {
                placeChoice.removeAll();
                for (int j = 0; j < Place.PLACES.length; j++) {
                    Place place = Place.PLACES[j];
                    if (place.getCountry() == country) {
                        placeChoice.add(place.getName());
                    }
                }
            }
        }
        selectPlace(placeChoice.getItem(0));
    }

    private SkyListener skyListener;

    /** @link dependency
     * @stereotype use*/
    /*# Place lnkPlace; */
}
