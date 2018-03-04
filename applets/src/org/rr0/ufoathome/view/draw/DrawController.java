package org.rr0.ufoathome.view.draw;

import org.rr0.ufoathome.control.AbstractController;
import org.rr0.ufoathome.view.AbstractView;
import org.rr0.ufoathome.view.gui.MessageEditable;
import org.rr0.ufoathome.model.ufo.MessageProducer;

import java.awt.*;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.KeyEvent;
import java.awt.event.MouseEvent;
import java.text.DateFormat;
import java.util.*;

/**
 * Handles drawing events to update a DrawView and a DrawModel accordingly.
 *
 * @author Jerome Beau
 * @version 0.3
 */
public class DrawController extends AbstractController {

    //    protected String mode = UFOController.LOCATION_TAB;

    /**
     * @supplierRole view
     */
    protected DrawView view;
    private MessageProducer messageProducer;
    protected DrawModel model;
    private Vector drawListeners = new Vector();

    private DateFormat dateFormat;
    protected String timeKey;

    protected int zoomFactor;

    /**
     * The sampling rate, in milliseconds
     */
    private int samplingRate;

    //    private long lastRecordEnd;

    /**
     * @supplierRole current selection
     */
    private DrawSelection selection = new DrawSelection();
    private DrawShape topShapePrototype;
    private DrawShape middleShapePrototype;
    private DrawShape bottomShapePrototype;
    protected int moveDeltaX;
    protected int moveDeltaY;
    private DrawEvent currentEvent;

    private Date endTime;
    private Date startTime;
    public int SHAPES_LAYER;
    private int BACKGROUND_LAYER;
    private ActionListener shapeMenuListener;

    //    private MouseEvent eventToRecord;
    //    private Thread dragRecordThread;

    public DrawController(DrawView view, DrawModel model, int samplingRate, Locale locale, MessageProducer messageProducer) {
        setView(view);
        this.messageProducer = messageProducer;
        view.setMessageBundle(messagesBundle);
        this.model = model;
        this.samplingRate = samplingRate;
        dateFormat = DateFormat.getDateTimeInstance(DateFormat.FULL, DateFormat.LONG, locale);

        BACKGROUND_LAYER = newLayer();
        SHAPES_LAYER = newLayer();
        lastLayersStartBit = layersStartBit;
        setTime((GregorianCalendar) GregorianCalendar.getInstance());
        modified(SHAPES_LAYER);
    }

    private void setView(DrawView view) {
        this.view = view;
        view.addMouseListener(this);
        view.addMouseMotionListener(this);
        view.addKeyListener(this);
    }

    public void keyPressed(KeyEvent e) {
        switch (e.getKeyCode()) {
            case KeyEvent.VK_UP:
                if (!selection.isEmpty()) {
                    selection.translate(0, -1);
                    modified(SHAPES_LAYER);
                    e.consume();
                }
                break;
            case KeyEvent.VK_DOWN:
                if (!selection.isEmpty()) {
                    selection.translate(0, 1);
                    modified(SHAPES_LAYER);
                    e.consume();
                }
                break;
            case KeyEvent.VK_LEFT:
                if (!selection.isEmpty()) {
                    selection.translate(-1, 0);
                    modified(SHAPES_LAYER);
                    e.consume();
                }
                break;

            case KeyEvent.VK_RIGHT:
                if (!selection.isEmpty()) {
                    selection.translate(1, 0);
                    modified(SHAPES_LAYER);
                    e.consume();
                }
                break;

            case KeyEvent.VK_DELETE:
                if (!selection.isEmpty()) {
                    deleteSelection();
                    modified(SHAPES_LAYER);
                    e.consume();
                }
                break;
        }
    }

    protected void deleteSelection() {
        Vector currentEvents = model.getEvents(timeKey);
        Enumeration eventsToDelete = selection.elements();
        while (eventsToDelete.hasMoreElements()) {
            DrawEvent eventToDelete = (DrawEvent) eventsToDelete.nextElement();
            currentEvents.removeElement(eventToDelete);
        }
        selection.clear();
        modified(SHAPES_LAYER);
    }

    public AbstractView getView() {
        return view;
    }

    public DrawModel getModel() {
        return model;
    }

    //    public int getAs() {
    //        return as;
    //    }

    public TimeZone getTimeZone() {
        return model.getTimeZone();
    }

    public void setTimeZone(TimeZone timeZone) {
        model.setTimeZone(timeZone);
    }

    //    public Locale getLocale() {
    //        return locale;
    //    }

    public DateFormat getDateFormat() {
        return dateFormat;
    }

    public Date getEndTime() {
        return endTime;
    }

    public void setEndTime(Date endTime) {
        this.endTime = endTime;
    }

    public Date getStartTime() {
        return startTime;
    }

    public void setStartTime(Date startTime) {
        this.startTime = startTime;
    }

    public void start() {
        view.start();
    }

    public int getSamplingRate() {
        return samplingRate;
    }

    public void fireMessage(String s, MessageEditable editable) {
        if (messageProducer != null) {
            messageProducer.fireMessage(s, editable);
        }
    }

    public void setTime(GregorianCalendar currentTime) {
        super.setTime(currentTime);
        int millis = currentTime.get(Calendar.MILLISECOND) / samplingRate;
        timeKey = dateFormat.format(currentTime.getTime()) + millis;
    }

    protected void fireEventSelected(DrawEvent currentEvent) {
        for (int i = 0; i < drawListeners.size(); i++) {
            DrawListener drawListener = (DrawListener) drawListeners.elementAt(i);
            drawListener.eventSelected(currentEvent);
        }
    }

    /**
     * A click in the applet area.
     *
     * @param e The mouse click event
     */
    public void mouseClicked(MouseEvent e) {
        int mouseX = e.getX();
        int mouseY = e.getY();
        if (isShapePrototypeAvailable()) {
            createNewShape(mouseX, mouseY, e.getSource());
            modified(SHAPES_LAYER);
            e.consume();
        } else {
            DrawEvent currentEvent = model.getEvent(timeKey, mouseX, mouseY);
            if (currentEvent != null) {
                boolean ctrlPressed = (e.getModifiers() == 18);
                boolean alreadySelected = selection.contains(currentEvent) || currentEvent.getShape().isSelected();
                if (e.getModifiers() == 4) {
                    showShapeMenu(mouseX, mouseY, currentEvent);
                } else if (alreadySelected) {
                    deselect(currentEvent);
                } else {
                    select(ctrlPressed, currentEvent);
                }
                modified(SHAPES_LAYER);
                e.consume();
            } else {
                if (!selection.isEmpty()) {
                    view.setCursor(DrawView.DEFAULT_CURSOR);
                }
                backgroundClicked(e);
            }
        }
        draw();
    }

    private boolean isShapePrototypeAvailable() {
        return topShapePrototype != null || middleShapePrototype != null || bottomShapePrototype != null;
    }

    public void backgroundClicked(MouseEvent e) {
        selection.clear();
        modified(SHAPES_LAYER);
        for (int i = 0; i < drawListeners.size(); i++) {
            DrawListener drawListener = (DrawListener) drawListeners.elementAt(i);
            drawListener.backgroundClicked();
        }
    }

    private void createNewShape(int mouseX, int mouseY, Object eventSource) {
        try {
            selection.clear();
            Object drawEventSource;
            DrawEvent hoveredEvent = model.getEvent(timeKey, mouseX, mouseY);
            if (hoveredEvent != null) {
                drawEventSource = hoveredEvent.getSource();
            } else {
                drawEventSource = eventSource;
            }

            int topShapeHeight = 0;
            if (topShapePrototype != null) {
                DrawEvent topShapeEvent = record(mouseX, mouseY, drawEventSource, topShapePrototype);
                DrawShape topShape = topShapeEvent.getShape();
                topShape.setSelected(true);
                selection.add(topShapeEvent);
                topShapeHeight = topShape.getHeight();
                topShapePrototype = null;
            }

            int midShapeHeight = 0;
            if (middleShapePrototype != null) {
                DrawEvent middleEvent = record(mouseX, mouseY + topShapeHeight, drawEventSource, middleShapePrototype);
                DrawShape middleShape = middleEvent.getShape();
                midShapeHeight = middleShape.getHeight();
                middleShape.setSelected(true);
                selection.add(middleEvent);
                middleShapePrototype = null;
            }

            if (bottomShapePrototype != null) {
                DrawEvent bottomEvent = record(mouseX, mouseY + topShapeHeight + midShapeHeight, drawEventSource, bottomShapePrototype);
                DrawShape bottomShape = bottomEvent.getShape();
                bottomShape.setSelected(true);
                selection.add(bottomEvent);
                bottomShapePrototype = null;
            }

            view.setCursor(DrawView.DEFAULT_CURSOR);
        } catch (Exception e1) {
            throw new RuntimeException("Could not clone " + topShapePrototype + ": " + e1.getClass().getName() + ": " + e1.getMessage());
        }
    }

    public void showShapeMenu(int mouseX, int mouseY, DrawEvent currentEvent) {
        MessageEditable editable = (MessageEditable) currentEvent.getSource();
        PopupMenu menu = view.getShapeMenu(selection, selection, mouseX, mouseY, editable);
        menu.addActionListener(getShapeMenuListener());
        menu.show(view, mouseX, mouseY);
    }

    protected ActionListener getShapeMenuListener() {
        if (shapeMenuListener == null) {
            shapeMenuListener = new ShapeMenuListener();
        }
        return shapeMenuListener;
    }

    /**
     * Select a applet event.
     *
     * @param multiple
     * @param currentEvent
     */
    public void select(boolean multiple, DrawEvent currentEvent) {
        if (!multiple) {
            selection.clear();
        }
        fireEventSelected(currentEvent);
        selection.add(currentEvent);
        selection.select(true);
    }

    public void deselect(DrawEvent currentEvent) {
        selection.remove(currentEvent);
    }

    public void mouseMoved(MouseEvent mouseEvent) {
        int mouseX = mouseEvent.getX();
        int mouseY = mouseEvent.getY();
        currentEvent = model.getEvent(timeKey, mouseX, mouseY);
        if (currentEvent != null) {
            MessageEditable source = (MessageEditable) currentEvent.getSource();
            fireMessage(source.getTitle(), source);
            DrawShape shape = currentEvent.getShape();
            if (shape.isSelected() && selection.contains(currentEvent)) {
                moveOverShape(shape, mouseX, mouseY);
            }
            mouseEvent.consume();
        } else {
            if (isShapePrototypeAvailable()) {
                fireMessage("Click the sky area to set the location of the shape", null);
                view.setCursor(DrawView.CROSS_HAIR_CURSOR);
                //                    drawSky(false);
                //                currentShape.paint(skyView.getGraphics(), Color.gray);
                //                if (mouseX < SCROLL_MARGIN) {
                //                    setAzimut(azimutDegrees - 1);
                //                    update();
                //                } else if (mouseX > SKY_WIDTH - SCROLL_MARGIN) {
                //                    setAzimut(azimutDegrees + 1);
                //                    update();
                //                }
                //                if (mouseY < SCROLL_MARGIN) {
                //                    setAltitude(altitudeDegrees + 1);
                //                    update();
                //                } else if (mouseY > SKY_HEIGHT - SCROLL_MARGIN) {
                //                    setAltitude(altitudeDegrees - 1);
                //                    update();
                //                }
                //                    currentShape.setLocation(mouseX, mouseY);
                //                    currentShape.paint(skyView.getGraphics());
                //                skyView.repaint();
            } else {
                view.setCursor(DrawView.DEFAULT_CURSOR);
            }
        }
    }

    private void moveOverShape(DrawShape selectedShape, int mouseX, int mouseY) {
        int ufoX = selectedShape.getX();
        int ufoY = selectedShape.getY();
        moveDeltaX = mouseX - ufoX;
        moveDeltaY = mouseY - ufoY;
        int ufoWidth = selectedShape.getBounds().width;
        int ufoHalfWidth = ufoWidth / 2;
        int ufoHeight = selectedShape.getBounds().height;
        int ufoHalfHeight = ufoHeight / 2;
        if (mouseX >= ufoX - DrawShape.HALF_CORNER_SIZE && mouseX <= ufoX + DrawShape.HALF_CORNER_SIZE) {
            if (mouseY >= ufoY - DrawShape.HALF_CORNER_SIZE && mouseY <= ufoY + DrawShape.HALF_CORNER_SIZE) {
                view.setCursor(DrawView.NORTH_WEST_RESIZE_CURSOR);
            } else if (mouseY >= ufoY + ufoHalfHeight - DrawShape.HALF_CORNER_SIZE && mouseY <= ufoY + ufoHalfHeight + DrawShape.HALF_CORNER_SIZE) {
                view.setCursor(DrawView.WIDTH_RESIZE_CURSOR);
            } else if (mouseY >= ufoY + ufoHeight - DrawShape.HALF_CORNER_SIZE && mouseY <= ufoY + ufoHeight + DrawShape.HALF_CORNER_SIZE) {
                view.setCursor(DrawView.SOUTH_WEST_RESIZE_CURSOR);
            } else {
                view.setCursor(DrawView.MOVE_CURSOR);
            }
        } else if (mouseX >= ufoX + ufoHalfWidth - DrawShape.HALF_CORNER_SIZE && mouseX <= ufoX + ufoHalfWidth + DrawShape.HALF_CORNER_SIZE) {
            if ((mouseY >= ufoY - DrawShape.HALF_CORNER_SIZE && mouseY <= ufoY + DrawShape.HALF_CORNER_SIZE) || (mouseY >= ufoY + ufoHeight - DrawShape.HALF_CORNER_SIZE && mouseY <= ufoY + ufoHeight + DrawShape.HALF_CORNER_SIZE)) {
                view.setCursor(DrawView.HEIGHT_RESIZE_CURSOR);
            } else {
                view.setCursor(DrawView.MOVE_CURSOR);
            }
        } else if (mouseX >= ufoX + ufoWidth - DrawShape.HALF_CORNER_SIZE && mouseX <= ufoX + ufoWidth + DrawShape.HALF_CORNER_SIZE) {
            if (mouseY >= ufoY - DrawShape.HALF_CORNER_SIZE && mouseY <= ufoY + DrawShape.HALF_CORNER_SIZE) {
                view.setCursor(DrawView.NORTH_EAST_RESIZE_CURSOR);
            } else if (mouseY >= ufoY + ufoHalfHeight - DrawShape.HALF_CORNER_SIZE && mouseY <= ufoY + ufoHalfHeight + DrawShape.HALF_CORNER_SIZE) {
                view.setCursor(DrawView.WIDTH_RESIZE_CURSOR);
            } else if (mouseY >= ufoY + ufoHeight - DrawShape.HALF_CORNER_SIZE && mouseY <= ufoY + ufoHeight + DrawShape.HALF_CORNER_SIZE) {
                view.setCursor(DrawView.SOUTH_EAST_RESIZE_CURSOR);
            } else {
                view.setCursor(DrawView.MOVE_CURSOR);
            }
        } else {
            view.setCursor(DrawView.MOVE_CURSOR);
        }
    }

    public DrawEvent record(int x, int y, Object source, DrawShape shape) {
        DrawEvent drawEvent = null;
        fireMessage("Recording " + source + " at " + timeKey, null);
        try {
            DrawShape ufoShape = (DrawShape) shape.clone();
            ufoShape.setLocation(x, y);
            drawEvent = new DrawEvent(ufoShape, ufoShape);
            model.addEvent(timeKey, drawEvent);
            fireEventRecorded(drawEvent);
        } catch (CloneNotSupportedException e) {
            e.printStackTrace();
        }
        return drawEvent;
    }

    protected void fireEventRecorded(DrawEvent drawEvent) {
        for (int i = 0; i < drawListeners.size(); i++) {
            DrawListener drawListener = (DrawListener) drawListeners.elementAt(i);
            drawListener.eventRecorded(drawEvent);
        }
    }

    public void mouseReleased(MouseEvent e) {
        moveDeltaX = 0;
        moveDeltaY = 0;
        currentEvent = null;
    }

    public void mouseDragged(MouseEvent e) {
        if (isResizingWidth()) {
            DrawShape shape = currentEvent.getShape();
            Rectangle shapeBounds = shape.getBounds();
            setNewWidth(shapeBounds, e.getX());
            modified(SHAPES_LAYER);
            e.consume();
        } else if (isResizingCorner()) {
            DrawShape shape = currentEvent.getShape();
            Rectangle shapeBounds = shape.getBounds();
            setNewWidth(shapeBounds, e.getX());
            setNewHeight(shapeBounds, e.getY());
            modified(SHAPES_LAYER);
            e.consume();
        } else if (isResizingHeight()) {
            DrawShape shape = currentEvent.getShape();
            Rectangle shapeBounds = shape.getBounds();
            setNewHeight(shapeBounds, e.getY());
            modified(SHAPES_LAYER);
            e.consume();
        } else if (isMoving()) {
            int newX = e.getX() - moveDeltaX;
            int newY = e.getY() - moveDeltaY;
            DrawShape shape = currentEvent.getShape();
            int deltaX = newX - shape.getX();
            int deltaY = newY - shape.getY();
            selection.translate(deltaX, deltaY);
            modified(SHAPES_LAYER);
            e.consume();
        } else if (isShapePrototypeAvailable()) {
            createNewShape(e.getX(), e.getY(), e.getSource());
            currentEvent = model.getEvent(timeKey, e.getX(), e.getX());
            if (currentEvent != null) {
                moveOverShape(currentEvent.getShape(), e.getX(), e.getY());
                e.consume();
            }
            modified(SHAPES_LAYER);
        }
        lastX = e.getX();
        lastY = e.getY();
        draw();
    }

    private void setNewHeight(Rectangle shapeBounds, int newY) {
        int maxY = shapeBounds.y + shapeBounds.height - 1;
        int deltaHeight;
        if (newY >= maxY) {
            deltaHeight = newY - maxY;
        } else if (newY > shapeBounds.y) {
            if (lastY < newY) {
                deltaHeight = lastY - newY;
                selection.translate(0, -deltaHeight);
            } else {
                deltaHeight = newY - lastY;
            }
        } else {
            deltaHeight = shapeBounds.y - newY;
            selection.translate(0, -deltaHeight);
        }
        double factor = ((double) (shapeBounds.height + deltaHeight)) / ((double) shapeBounds.height);
        selection.scaleHeight(factor);
    }

    private void setNewWidth(Rectangle shapeBounds, int newX) {
        int maxX = shapeBounds.x + shapeBounds.width - 1;
        int deltaWidth;
        if (newX >= maxX) {
            deltaWidth = newX - maxX;
        } else if (newX > shapeBounds.x) {
            if (lastX < newX) {
                deltaWidth = lastX - newX;
                selection.translate(-deltaWidth, 0);
            } else {
                deltaWidth = newX - lastX;
            }
        } else {
            deltaWidth = shapeBounds.x - newX;
            selection.translate(-deltaWidth, 0);
        }
        double factor = (((double) shapeBounds.width + deltaWidth)) / ((double) shapeBounds.width);
        selection.scaleWidth(factor);
    }

    /*
        public boolean isAspectMode() {
            return mode.equals(UFOController.ASPECT_TAB);
        }

        public boolean isMapMode() {
            return mode.equals(UFOController.MAP);
        }

        public boolean isBehaviorMode() {
            return mode.equals(UFOController.BEHAVIOR_TAB);
        }
    */

    /*
        private void record(MouseEvent e, DrawSelection selection) {
            int newX = e.getX() - selection.getWidth() / 2;
            int newY = e.getY() - selection.getHeight();
            int deltaX = newX - selection.getX();
            int deltaY = newY - selection.getY();
            for (int i = 0; i < selection.size(); i++) {
                DrawEvent event = (DrawEvent) selection.elementAt(i);
                DrawShape shape = event.getShape();
                int xNew = shape.getX() + deltaX;
                int yNew = shape.getY() + deltaY;
                record(xNew, yNew, event.getSource(), shape);
            }
            Rectangle bounds = selection.getBounds();
            bounds.x += deltaX;
            bounds.y += deltaY;
        }
    */

    private boolean isMoving() {
        return view.getCursor() == DrawView.MOVE_CURSOR;
    }

    private boolean isResizingHeight() {
        return view.getCursor() == DrawView.HEIGHT_RESIZE_CURSOR;
    }

    private boolean isResizingCorner() {
        Cursor cursor = view.getCursor();
        return cursor == DrawView.NORTH_WEST_RESIZE_CURSOR || cursor == DrawView.SOUTH_WEST_RESIZE_CURSOR || cursor == DrawView.SOUTH_EAST_RESIZE_CURSOR || cursor == DrawView.NORTH_EAST_RESIZE_CURSOR;
    }

    private boolean isResizingWidth() {
        return view.getCursor() == DrawView.WIDTH_RESIZE_CURSOR;
    }

    public void paintShapes() {
        Vector ufoEvents = model.getEvents(timeKey);
        if (ufoEvents != null) {
            for (int layer = 0; layer < ufoEvents.size(); layer++) {
                DrawEvent ufoEvent = (DrawEvent) ufoEvents.elementAt(layer);
                DrawShape ufoShape = ufoEvent.getShape();
                view.paintShape(ufoShape);
            }
        }
    }

    public void paintBackground() {
        view.setForeground(Color.blue);
        view.getBufferedGraphics().fillRect(0, 0, view.getSize().width, view.getSize().height);
    }

    public void addSelection(DrawEvent selection) {
        this.selection.add(selection);
    }

    public void setColor(Color color) {
        if (topShapePrototype != null) {
            topShapePrototype.setColor(color);
        }
        if (middleShapePrototype != null) {
            middleShapePrototype.setColor(color);
        }
        if (bottomShapePrototype != null) {
            bottomShapePrototype.setColor(color);
        }
        if (!isShapePrototypeAvailable()) {
            selection.setColor(color);
        }
    }

    public void draw(BitSet requiredLayers) {
        if (isToDraw(requiredLayers, BACKGROUND_LAYER)) {
            paintBackground();
        }
        if (isToDraw(requiredLayers, SHAPES_LAYER)) {
            paintShapes();
        }
        super.draw(requiredLayers);
    }

    public void setZoomFactor(int x) {
        //        zoomFactor = x;
        model.setZoomFactor(x);
    }

    public void addDrawListener(DrawListener drawListener) {
        drawListeners.addElement(drawListener);
    }

    public void setTopShape(DrawShape shapePrototype) {
        this.topShapePrototype = shapePrototype;
        view.setCursor(DrawView.CROSS_HAIR_CURSOR);
        fireMessage("Click your shape on the applet area", null);
    }

    public void setMidShape(DrawShape shapePrototype) {
        this.middleShapePrototype = shapePrototype;
        view.setCursor(DrawView.CROSS_HAIR_CURSOR);
        fireMessage("Click your shape on the applet area", null);
    }

    public void setBottomShape(DrawShape shapePrototype) {
        this.bottomShapePrototype = shapePrototype;
        view.setCursor(DrawView.CROSS_HAIR_CURSOR);
        fireMessage("Click your shape on the applet area", null);
    }

    /*
        public void setMode(String modeName) {
            this.mode = modeName;
            fireModeChanged();
            if (isAspectMode()) {
                selection = ufoSelection;
                selection.select(true);
            } else if (isBehaviorMode()) {
                selection = ufoSelection;
                if (selection.isEmpty()) {

                }
                selection.select(false);
            } else if (isMapMode()) {
                selection = mapSelection;
                selection.select(true);
            }
        }
    */

    public void setTransparency(int alpha) {
        selection.setTranparency(alpha);
    }

    public DrawSelection getSelection() {
        return selection;
    }

    public String getTimeKey() {
        return timeKey;
    }

    public void setTimeKey(String timeKey) {
        this.timeKey = timeKey;
    }

    public void setDateFormat(DateFormat dateFormat) {
        this.dateFormat = dateFormat;
    }

    public class ShapeMenuListener implements ActionListener {
        public void actionPerformed(ActionEvent actionEvent) {
            if (actionEvent.getActionCommand().equals(DrawView.REMOVE_SELECTION_ACTION_COMMAND)) {
                deleteSelection();
            } else if (actionEvent.getActionCommand().equals(DrawView.DELETE_SOURCE_ACTION_COMMAND)) {
                String sourceName = ((MenuItem) actionEvent.getSource()).getName();
                model.removeSource(sourceName);
                modified(SHAPES_LAYER);
            }
        }

    };
}
