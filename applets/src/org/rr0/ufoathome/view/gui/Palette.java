package org.rr0.ufoathome.view.gui;

import java.awt.*;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.AdjustmentEvent;
import java.awt.event.AdjustmentListener;
import java.util.Vector;
import java.util.Enumeration;

/**
 * @author Jerôme Beau
 * @version 0.3
 */
public class Palette extends Panel {
    private ColorPicker colorPicker;
    private Scrollbar brightnessCursor;
//    private Scrollbar saturationCursor;
//    private Scrollbar hueCursor;
    private Vector actionListeners = new Vector();

//    public Dimension getPreferredSize() {
//        return new Dimension(100, 90);
//    }
    
    public Palette() {
        super(new BorderLayout());
        Panel centerPanel = new Panel(new BorderLayout());
        colorPicker = new ColorPicker(this);
        centerPanel.add(colorPicker, BorderLayout.CENTER);
        add(centerPanel, BorderLayout.CENTER);

        Panel hsbPanel = getHSBPanel();
        add(hsbPanel, BorderLayout.EAST);
/*
        hueCursor = new Scrollbar(Scrollbar.HORIZONTAL, 1, 1, 0, 100);
        hueCursor.addAdjustmentListener(new AdjustmentListener(){
            public void adjustmentValueChanged(AdjustmentEvent e) {
                double newHue = ((double) e.getValue()) / 100;
                colorPicker.setHue(newHue);
                colorPicker.repaint();
                fireColorSelected();
            }
        });
        centerPanel.add (hueCursor, BorderLayout.SOUTH);
*/
    }

    public void setColor(Color color) {
        float[] hsb = new float[3];
        Color.RGBtoHSB(color.getRed(), color.getGreen(), color.getBlue(), hsb);
        colorPicker.setHue(hsb[0]);
        colorPicker.setSaturation(hsb[1]);
        colorPicker.setBrightness(hsb[2]);
        colorPicker.repaint();
        updateCursors();
    }

    private Panel getHSBPanel() {
        Panel hsbPanel = new Panel(new GridLayout(1, 2));
/*
        saturationCursor = new Scrollbar(Scrollbar.VERTICAL, 1, 1, 0, 100);
        saturationCursor.addAdjustmentListener(new AdjustmentListener(){
            public void adjustmentValueChanged(AdjustmentEvent e) {
                double newSaturation = ((double) e.getValue()) / 100;
                colorPicker.setSaturation(newSaturation);
                colorPicker.repaint();
                fireColorSelected();
            }
        });
        hsbPanel.add (saturationCursor);
*/
        brightnessCursor = new Scrollbar(Scrollbar.VERTICAL, 1, 1, 0, 100);
        brightnessCursor.addAdjustmentListener(new AdjustmentListener() {
            public void adjustmentValueChanged(AdjustmentEvent e) {
                double newBrightness = ((double) e.getValue()) / 100;
                colorPicker.setBrightness(newBrightness);
                colorPicker.repaint();
                fireColorSelected();
            }
        });
        hsbPanel.add(brightnessCursor);
        return hsbPanel;
    }

    public void addActionListener(ActionListener actionListener) {
        actionListeners.addElement(actionListener);
    }

    public void fireColorSelected() {
        Enumeration listenersEnum = actionListeners.elements();
        while (listenersEnum.hasMoreElements()) {
            ActionEvent actionEvent = new ActionEvent(this, 0, "ColorSelected");
            ActionListener actionListener = ((ActionListener) listenersEnum.nextElement());
            actionListener.actionPerformed(actionEvent);
        }
    }

    public void updateCursors() {
//        hueCursor.setValue((int) (colorPicker.getHue() * 100));
//        saturationCursor.setValue((int) (colorPicker.getSaturation() * 100));
        brightnessCursor.setValue((int) (colorPicker.getBrightness() * 100));
    }

    public Color getColor() {
        return colorPicker.getColor();
    }
}
