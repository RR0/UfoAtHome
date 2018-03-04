package org.rr0.ufoathome.view.gui;

import org.rr0.ufoathome.view.draw.DrawShape;

import java.awt.*;
import java.awt.event.*;

/**
 * @author Jerome Beau
 * @version 0.3
 */
public class ShapesCanvas extends Canvas {
    private DrawShape[] shapes;
    private int[] shapesX;
    private int height;
    private final int marginX = 10;
    private int currentX;
    private int topMargin;
    private int bottomMargin;
    private ShapesCanvasListener mouseAdapter;
    private ActionListener actionListener;
    private Graphics bufferedGraphics;
    private Image bufferedImage;
    private static final SystemColor UNSELECTED_COLOR = SystemColor.controlText;
    private static final SystemColor SELECTED_COLOR = SystemColor.textHighlight;

    public ShapesCanvas(DrawShape[] someShapes, int topMargin, int bottomMargin) {
        this.topMargin = topMargin;
        this.bottomMargin = bottomMargin;
        currentX = marginX;
        setShapes(someShapes);

        mouseAdapter = new ShapesCanvasListener();
        addMouseListener(mouseAdapter);
        addMouseMotionListener(mouseAdapter);
    }

    public void setShapes(DrawShape[] someShapes) {
        this.shapes = someShapes;
        shapesX = new int[shapes.length + 1];
        shapesX[shapesX.length - 1] = Integer.MAX_VALUE;

        int x = marginX;
        height = 0;
        for (int i = 0; i < shapes.length; i++) {
            DrawShape shape = shapes[i];
            shapesX[i] = x;
            shape.setLocation(x + shape.getX(), topMargin + shape.getY());
            x += shape.getWidth() + marginX;
            if (shape.getHeight() > height) {
                height = shape.getHeight();
            }
        }
    }

    public Dimension getPreferredSize() {
        return new Dimension(getSize().width, height + topMargin + bottomMargin);
    }

    public void paint(Graphics g) {
        if (bufferedGraphics == null) {
            bufferedImage = createImage(getSize().width, height + topMargin);
            bufferedGraphics = bufferedImage.getGraphics();
        }
        bufferedGraphics.setColor(SystemColor.white);
        bufferedGraphics.fill3DRect(0, 0, getSize().width, height + topMargin + bottomMargin, true);
        bufferedGraphics.setColor(SystemColor.textText);
        for (int i = 0; i < shapes.length; i++) {
            DrawShape shape = shapes[i];
            shape.paint(bufferedGraphics);
        }
        g.drawImage(bufferedImage, 0, 0, this);
    }

    public void update(Graphics g) {
        paint(g);
    }

    public void setActionListener(ActionListener actionListener) {
        this.actionListener = actionListener;
    }

    public DrawShape getSelectedShape() {
        return mouseAdapter.getShapePrototype();
    }

    public void reset() {
        mouseAdapter.reset();
    }

    class ShapesCanvasListener extends MouseAdapter implements MouseMotionListener {
        private int lastX;
        private DrawShape shapePrototype;

        public DrawShape getShapePrototype() {
            return shapePrototype;
        }

        public void mouseClicked(MouseEvent e) {
            int x = e.getX();
            int i = 0;
            shapePrototype = null;
            do {
                if (x >= shapesX[i] && x < shapesX[i + 1]) {
                    shapePrototype = shapes[i];
                    shapePrototype.setColor(SELECTED_COLOR);
                } else if (i < shapes.length) {
                    shapes[i].setColor(UNSELECTED_COLOR);
                }
                i++;
            } while (i < shapesX.length);

            if (shapePrototype != null) {
                repaint();
                fireActionPerformed();
            }
        }

        private void fireActionPerformed() {
            ActionEvent actionEvent = new ActionEvent(this, 0, "ShapeSelected");
            actionListener.actionPerformed(actionEvent);
        }

        public void mouseDragged(MouseEvent e) {
            if (lastX != 0) {
                int deltaX = e.getX() - lastX;
                currentX += deltaX;
                int x = currentX;
                for (int i = 0; i < shapes.length; i++) {
                    DrawShape shape = shapes[i];
                    shapesX[i] = x;
                    shape.setLocation(shape.getX() + deltaX, shape.getY());
                    x += shape.getWidth() + marginX;
                }
            }
            lastX = e.getX();
            ShapesCanvas.this.repaint();
        }

        public void mouseMoved(MouseEvent e) {

        }

        public void reset() {
            if (shapePrototype != null) {
                shapePrototype.setColor(UNSELECTED_COLOR);
                repaint();
            }
        }
    }
}
