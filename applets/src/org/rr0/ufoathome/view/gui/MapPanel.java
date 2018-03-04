package org.rr0.ufoathome.view.gui;

import org.rr0.ufoathome.view.draw.DrawShape;
import org.rr0.ufoathome.view.draw.RectangleShape;
import org.rr0.ufoathome.model.ufo.UFOController;

import java.awt.*;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.util.ResourceBundle;

/**
 * @author Jerome Beau
 * @version 0.3
 */
public class MapPanel extends Panel {
    private UFOController controller;
    private ResourceBundle messagesBundle;

    public MapPanel(final UFOController controller) {
        super(new BorderLayout());

        Panel northPanel = new Panel(new BorderLayout());
        add(northPanel, BorderLayout.NORTH);

        Panel buildingSelector = new ObjectChoice(controller, "NoBuildingSelected");
        northPanel.add(buildingSelector, BorderLayout.NORTH);

        ShapeButtonGroup buildingButtonGroup = new ShapeButtonGroup();
        Panel buttonsPanel = new Panel();
        Polygon housePolygon = new Polygon(new int[]{0, 10, 10, 0},
                        new int[]{0, 0, 10, 10}, 4);
        DrawShape houseShape = new RectangleShape(controller.getView());
        final DrawShapeButton houseButton = new DrawShapeButton(houseShape);
        houseButton.addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent e) {
                controller.setTopShape(houseButton.getShape());
            }
        });
        buildingButtonGroup.add(houseButton);
        buttonsPanel.add(houseButton);
        northPanel.add(buttonsPanel, BorderLayout.CENTER);

        Panel buildingTypePanel = new Panel(new GridBagLayout());
        add(buildingTypePanel, BorderLayout.CENTER);

        this.controller = controller;
        messagesBundle = controller.getMessagesBundle();

        GridBagConstraints gridBagConstraints = new GridBagConstraints();
        gridBagConstraints.anchor = GridBagConstraints.WEST;

        Label buildingTypeLabel = new Label(messagesBundle.getString("BuildingType"));
        buildingTypePanel.add(buildingTypeLabel, gridBagConstraints);
        Choice buildingTypeChoice = new Choice();
        String[] types = new String[]{"House", "Building", "Road", "People", "Tree", "Wall"};
        for (int i = 0; i < types.length; i++) {
            buildingTypeChoice.add(messagesBundle.getString("BuildingType." + types[i]));
        }
        buildingTypePanel.add(buildingTypeChoice, gridBagConstraints);

        gridBagConstraints.gridy = 1;
        Label placeLabel = new Label(messagesBundle.getString("Elevation"));
        buildingTypePanel.add(placeLabel, gridBagConstraints);
        final TextField elevationTextField = new TextField("0", 4);
        elevationTextField.addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent e) {
                controller.setLongitude(new Double(elevationTextField.getText()).doubleValue());
                controller.draw();
            }
        });
        buildingTypePanel.add(elevationTextField, gridBagConstraints);
    }
}
