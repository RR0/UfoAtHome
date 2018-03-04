package org.rr0.ufoathome.view.gui;

import org.rr0.ufoathome.view.draw.DrawEvent;
import org.rr0.ufoathome.view.draw.DrawListener;
import org.rr0.ufoathome.model.ufo.UFO;
import org.rr0.ufoathome.model.ufo.UFOController;

import java.awt.*;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.ItemEvent;
import java.awt.event.ItemListener;
import java.util.ResourceBundle;

/**
 * UFO selector.
 *
 * @author Jerôme Beau
 * @version 0.3
 */
public class ObjectChoice extends Panel {
    private Choice ufoChoice;
    private UFOController controller;
    private ResourceBundle messagesBundle;

    public ObjectChoice(final UFOController controller, String noObjectSelectedLabel) {
        super(new BorderLayout());
        this.controller = controller;
        messagesBundle = controller.getMessagesBundle();
        ufoChoice = createObjectChoice(noObjectSelectedLabel);
        add(ufoChoice, BorderLayout.WEST);
        final Button deleteUfoButton = createDeleteUFOButton();
        add(deleteUfoButton, BorderLayout.EAST);

        controller.addDrawListener(new DrawListener() {
            public void eventSelected(DrawEvent event) {
                MessageEditable source = (MessageEditable) event.getSource();
                if (source == null) {
                    backgroundClicked();
                } else {
                    String currentUFOName = source.getTitle();
                    ufoChoice.select(currentUFOName);
                    controller.fireMessage(currentUFOName, source);
                    deleteUfoButton.setEnabled(true);
                }
            }

            public void eventRecorded(DrawEvent event) {
                UFO currentUFO = (UFO) event.getSource();
                String currentUfoName = currentUFO.getName();
                int i;
                for (i = 0; i < ufoChoice.getItemCount(); i++) {
                    String item = ufoChoice.getItem(i);
                    if (item.equals(currentUfoName)) {
                        break;
                    }
                }

                if (i >= ufoChoice.getItemCount()) {
                    ufoChoice.add(currentUfoName);
                    //                    controller.selectUFO(currentUfoName);
                    ufoChoice.select(i);
                    ufoChoice.setEnabled(true);
                    deleteUfoButton.setEnabled(true);
                }
            }

            public void eventDeleted(DrawEvent ufoEvent) {
                UFO ufo = (UFO) ufoEvent.getSource();
                String deletedUfoName = ufo.getName();
                ufoChoice.remove(deletedUfoName);
                if (ufoChoice.getItemCount() <= 1) {
                    ufoChoice.setEnabled(false);
                    deleteUfoButton.setEnabled(false);
                }
            }

            public void backgroundClicked() {
                ufoChoice.select(0);
                deleteUfoButton.setEnabled(false);
            }
        });
    }

    private Choice createObjectChoice(String noObjectSelectedLabel) {
        final Choice objectChoice = new Choice();
        String noObjectSelected = messagesBundle.getString(noObjectSelectedLabel);
        objectChoice.addItem(noObjectSelected);
        objectChoice.addItemListener(new ItemListener() {
            public void itemStateChanged(ItemEvent e) {
                String ufoName = (String) e.getItem();
                controller.selectObject(ufoName);
            }

        });
        objectChoice.setEnabled(false);
        return objectChoice;
    }

    protected void ufoSelected(String ufoName) {
        controller.selectObject(ufoName);
    }

    private Button createDeleteUFOButton() {
        final Button deleteUfoButton = new Button(messagesBundle.getString("Delete"));
        deleteUfoButton.addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent e) {
                String currentUfoName = ufoChoice.getSelectedItem();
                controller.deleteSource(currentUfoName);
                controller.draw();
            }

        });
        deleteUfoButton.setEnabled(false);
        return deleteUfoButton;
    }
}
