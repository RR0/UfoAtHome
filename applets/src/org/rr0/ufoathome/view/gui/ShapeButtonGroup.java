package org.rr0.ufoathome.view.gui;

import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.util.Enumeration;
import java.util.Vector;

/**
 * @author Jerôme Beau
 * @version 20 nov. 2003 20:04:08
 */
public class ShapeButtonGroup implements ActionListener {
    private Vector buttons = new Vector();

    public void add(ShapeButton button) {
        buttons.addElement(button);
        button.addActionListener(this);
    }

    /**
     * Invoked when an action occurs.
     */
    public void actionPerformed(ActionEvent e) {
        Enumeration enumeration = buttons.elements();
        while (enumeration.hasMoreElements()) {
            ShapeButton button = (ShapeButton) enumeration.nextElement();
            if (button != e.getSource()) {
                button.released();
//            } else {
//                button.pushed();
            }
        }
    }

    public void reset() {
        Enumeration enumeration = buttons.elements();
        while (enumeration.hasMoreElements()) {
            ShapeButton button = (ShapeButton) enumeration.nextElement();
            button.released();
        }
    }

    public boolean isPushed() {
        Enumeration enumeration = buttons.elements();
        while (enumeration.hasMoreElements()) {
            ShapeButton button = (ShapeButton) enumeration.nextElement();
            if (button.isPushed()) {
                return true;
            }
        }
        return false;
    }

    public void setEnabled(boolean b) {
        Enumeration enumeration = buttons.elements();
        while (enumeration.hasMoreElements()) {
            ShapeButton button = (ShapeButton) enumeration.nextElement();
            button.setEnabled(b);
        }
    }
}
