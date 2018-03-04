package org.rr0.ufoathome.view.draw;

import org.rr0.ufoathome.view.AbstractView;
import org.rr0.ufoathome.view.gui.MessageEditable;

import java.awt.*;
import java.text.MessageFormat;
import java.util.ResourceBundle;

/**
 * A drawable view.
 *
 * @version 0.3
 * @author Jerôme Beau
 */
public class DrawView extends AbstractView {
    public static final Cursor DEFAULT_CURSOR = Cursor.getPredefinedCursor(Cursor.DEFAULT_CURSOR);
    public static final Cursor CROSS_HAIR_CURSOR = Cursor.getPredefinedCursor(Cursor.CROSSHAIR_CURSOR);
    public static final Cursor WIDTH_RESIZE_CURSOR = Cursor.getPredefinedCursor(Cursor.E_RESIZE_CURSOR);
    public static final Cursor HEIGHT_RESIZE_CURSOR = Cursor.getPredefinedCursor(Cursor.N_RESIZE_CURSOR);
    public static final Cursor NORTH_WEST_RESIZE_CURSOR = Cursor.getPredefinedCursor(Cursor.NW_RESIZE_CURSOR);
    public static final Cursor SOUTH_WEST_RESIZE_CURSOR = Cursor.getPredefinedCursor(Cursor.SW_RESIZE_CURSOR);
    public static final Cursor NORTH_EAST_RESIZE_CURSOR = Cursor.getPredefinedCursor(Cursor.NE_RESIZE_CURSOR);
    public static final Cursor SOUTH_EAST_RESIZE_CURSOR = Cursor.getPredefinedCursor(Cursor.SE_RESIZE_CURSOR);
    public static final Cursor MOVE_CURSOR = Cursor.getPredefinedCursor(Cursor.MOVE_CURSOR);

    private Image bufferedImage;
    protected Graphics bufferedGraphics;
    private ResourceBundle messageBundle;
    public static final String REMOVE_SELECTION_ACTION_COMMAND = "DeleteSelection";
    public static final String DELETE_SOURCE_ACTION_COMMAND = "DeleteX";

    public void start() {
        Dimension size = getSize();     // Avoid using getWidth()/getHeight() which is not available from Java 1.1 (default applets)
        this.bufferedImage = createImage(size.width, size.height);
        bufferedGraphics = bufferedImage.getGraphics();
    }

    public void paint(Graphics g) {
        g.drawImage(bufferedImage, 0, 0, this);
    }

    public void paintShape(DrawShape ufoShape) {
        ufoShape.paint(bufferedGraphics);
    }

    public void displayBuffered() {
        paint(getGraphics());
    }

    public PopupMenu getShapeMenu(DrawSelection source, DrawSelection drawSelection, int mouseX, int mouseY, MessageEditable editable) {
        PopupMenu menu = new PopupMenu(source.toString());
        add(menu);
        //        MenuItem toFront = new MenuItem ("To front");
        //        menu.add(toFront);
        //        MenuItem toBack = new MenuItem ("To back");
        //        menu.add(toBack);
        MenuItem removeSelectionItem = new MenuItem(messageBundle.getString(REMOVE_SELECTION_ACTION_COMMAND));
        removeSelectionItem.setActionCommand(REMOVE_SELECTION_ACTION_COMMAND);
        menu.add(removeSelectionItem);

        MenuItem removeUFO = new MenuItem(MessageFormat.format(messageBundle.getString(DELETE_SOURCE_ACTION_COMMAND), new String[]{editable.getTitle()}));
        menu.add(removeUFO);
        return menu;
    }

    public void setMessageBundle(ResourceBundle messagesBundle) {
        this.messageBundle = messagesBundle;
    }

    /**
         * Prevents flickering
         *
         * @param g
         */
    public void update(Graphics g) {
        paint(g);
    }

    public Graphics getBufferedGraphics() {
        return bufferedGraphics;
    }
}
