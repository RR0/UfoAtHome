package org.rr0.ufoathome.view.gui;

import org.rr0.ufoathome.view.draw.DrawShape;

import java.awt.*;

/**
 * <p>A on/off button that displays a Shape.</p>
 * <p>This class is implemented to be usable in Java 1.1 applets, and so follows an AWT-only requirement
 * (no Swing, Java2D, geom, or Java 2 feature)</P>
 * <p>Because of the graphics to be drawn on it, this button inherits from java.gui.Canvas and not from java.gui.Button
 * (of which the peer cannot be overwritten on every platform)</p>
 *
 * @author Jerôme Beau
 * @version 24 oct. 2003 16:36:35
 */
public class DrawShapeButton extends ShapeButton {
    /**
     * The on/off state of the button
     */
    private DrawShape shape;
    private Rectangle drawBounds;
    private Rectangle pushedBounds;

    public DrawShapeButton(DrawShape aShape) {
        super();
        setShape(aShape);
    }

    public void setShape(DrawShape aShape) {
        this.shape = aShape;
        Dimension size = aShape.getBounds().getSize();
        setShapeDimension(size);
        int margin = getMargin();
        Rectangle shapeBounds = shape.getBounds();
        int x = shapeBounds.x;
        int y = shapeBounds.y;
        Rectangle newBounds = new Rectangle(x + margin, y + margin, shapeBounds.width + margin * 2, shapeBounds.height + margin * 2);
        setBounds(newBounds);
        drawBounds = new Rectangle(shapeBounds.x + margin, shapeBounds.y + margin, shapeBounds.width, shapeBounds.height);
        pushedBounds = new Rectangle(shapeBounds.x + margin + 1, shapeBounds.y + margin + 1, shapeBounds.width, shapeBounds.height);
    }

    public void paint(Graphics g) {
        super.paint(g);
        ((DrawShape) shape).paint(g, isPushed() ? pushedBounds : drawBounds);
    }

    public DrawShape getShape() {
        return shape;
    }
}
