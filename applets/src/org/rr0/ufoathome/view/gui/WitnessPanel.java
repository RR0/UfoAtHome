package org.rr0.ufoathome.view.gui;

import org.rr0.ufoathome.model.ufo.UFOController;

import java.awt.*;
import java.awt.event.FocusAdapter;
import java.awt.event.FocusEvent;
import java.util.ResourceBundle;

/**
 * @author Jerôme Beau
 * @version 26 févr. 2004 12:05:56
 */
public class WitnessPanel extends Panel {
    public WitnessPanel(final UFOController controller) {
        ResourceBundle messagesBundle = controller.getMessagesBundle();

        setBackground(SystemColor.control);
        GridBagLayout recordGridBagLayout = new GridBagLayout();
        setLayout(recordGridBagLayout);
        GridBagConstraints gridBagConstraints = new GridBagConstraints();
        gridBagConstraints.anchor = GridBagConstraints.WEST;

        gridBagConstraints.gridy = 0;
        {
            Label firstNameLabel = new Label(messagesBundle.getString("Firstname"));
            add(firstNameLabel, gridBagConstraints);
            final TextField firstNameField = new TextField(controller.getFirstName(), 10);
            firstNameField.addFocusListener(new FocusAdapter() {
                public void focusLost(FocusEvent e) {
                    controller.setFirstName(firstNameField.getText());
                }
            });
            add(firstNameField, gridBagConstraints);
        }

        {
            gridBagConstraints.gridy = 1;
            Label label = new Label(messagesBundle.getString("Lastname"));
            add(label, gridBagConstraints);
            final TextField lastNameField = new TextField(controller.getLastName(), 10);
            lastNameField.addFocusListener(new FocusAdapter() {
                public void focusLost(FocusEvent e) {
                    controller.setLastname(lastNameField.getText());
                }
            });
            add(lastNameField, gridBagConstraints);
        }

        {
            gridBagConstraints.gridy = 2;
            Label label = new Label(messagesBundle.getString("Email"));
            add(label, gridBagConstraints);
            final TextField textField = new TextField(controller.getEmail(), 10);
            textField.addFocusListener(new FocusAdapter() {
                public void focusLost(FocusEvent e) {
                    controller.setEmail(textField.getText());
                }
            });
            add(textField, gridBagConstraints);
        }

        {
            gridBagConstraints.gridy = 3;
            Label label = new Label(messagesBundle.getString("Address"));
            add(label, gridBagConstraints);
            final TextField textField = new TextField(controller.getAddress(), 20);
            textField.addFocusListener(new FocusAdapter() {
                public void focusLost(FocusEvent e) {
                    controller.setAddress(textField.getText());
                }
            });
            add(textField, gridBagConstraints);
        }

        {
            gridBagConstraints.gridy = 4;
            Label label = new Label(messagesBundle.getString("ZIPCode"));
            add(label, gridBagConstraints);
            final TextField textField = new TextField(controller.getZipCode(), 8);
            textField.addFocusListener(new FocusAdapter() {
                public void focusLost(FocusEvent e) {
                    controller.setZipCode(textField.getText());
                }
            });
            add(textField, gridBagConstraints);
        }

        {
            gridBagConstraints.gridy = 5;
            Label label = new Label(messagesBundle.getString("Town"));
            add(label, gridBagConstraints);
            final TextField textField = new TextField(controller.getTown(), 8);
            textField.addFocusListener(new FocusAdapter() {
                public void focusLost(FocusEvent e) {
                    controller.setTown(textField.getText());
                }
            });
            add(textField, gridBagConstraints);
        }

        {
            gridBagConstraints.gridy = 6;
            Label label = new Label(messagesBundle.getString("Country"));
            add(label, gridBagConstraints);
            final TextField textField = new TextField(controller.getCountry(), 8);
            textField.addFocusListener(new FocusAdapter() {
                public void focusLost(FocusEvent e) {
                    controller.setCountry(textField.getText());
                }
            });
            add(textField, gridBagConstraints);
        }

        {
            gridBagConstraints.gridy = 7;
            Label label = new Label(messagesBundle.getString("PhoneNumber"));
            add(label, gridBagConstraints);
            final TextField textField = new TextField(controller.getPhoneNumber(), 12);
            textField.addFocusListener(new FocusAdapter() {
                public void focusLost(FocusEvent e) {
                    controller.setPhoneNumber(textField.getText());
                }
            });
            add(textField, gridBagConstraints);
        }

        {
            gridBagConstraints.gridy = 8;
            Label label = new Label(messagesBundle.getString("BirthDate"));
            add(label, gridBagConstraints);
            final TextField textField = new TextField(controller.getBirthDate(), 12);
            textField.addFocusListener(new FocusAdapter() {
                public void focusLost(FocusEvent e) {
                    controller.setBirthDate(textField.getText());
                }
            });
            add(textField, gridBagConstraints);
        }

    }
}
