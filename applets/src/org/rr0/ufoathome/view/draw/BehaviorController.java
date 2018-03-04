package org.rr0.ufoathome.view.draw;

import org.rr0.ufoathome.control.AbstractController;
import org.rr0.ufoathome.view.AbstractView;
import org.rr0.ufoathome.view.gui.MessageEditable;
import org.rr0.ufoathome.view.gui.MessageListener;
import org.rr0.ufoathome.model.ufo.MessageProducer;
import org.rr0.ufoathome.model.ufo.UFO;

import java.awt.*;
import java.awt.event.MouseEvent;
import java.text.DateFormat;
import java.util.*;

/**
 * Handles drawing events to update a DrawView and a DrawModel accordingly.
 *
 * @author Jerôme Beau
 * @version 0
 */
public class BehaviorController extends AbstractController {
    /**
     * @supplierRole view
     */
    protected DrawView view;
    protected DrawModel model;
    private Vector messageListeners = new Vector();
    private Vector drawListeners = new Vector();

    private DateFormat dateFormat;
    protected String timeKey;

    protected int as;

    /**
     * The sampling rate, in milliseconds
     */
    private int samplingRate;

    private long lastRecordEnd;

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

    private Vector animationListeners = new Vector();
    private Date endTime;
    private Date startTime;
    private Locale locale;
    private ResourceBundle messagesBundle;

    protected int lastX;
    protected int lastY;
    private MouseEvent eventToRecord;
    private Thread dragRecordThread;
    private MessageProducer messageProducer;

    public final int SHAPES_LAYER = layersStartBit + 1;

    public BehaviorController(DrawView view, DrawModel model, int samplingRate, Locale locale, MessageProducer messageProducer) {
        this.messageProducer = messageProducer;
        messagesBundle = ResourceBundle.getBundle("org.rr0.is.presentation.view.report.applet.StarSkyLabels");
        this.view = view;
        view.setMessageBundle(messagesBundle);
        this.model = model;
        this.samplingRate = samplingRate;
        this.locale = locale;
        dateFormat = DateFormat.getDateTimeInstance(DateFormat.FULL, DateFormat.LONG, locale);

        ALL_LAYERS.set(SHAPES_LAYER);
    }

    public AbstractView getView() {
        return view;
    }

    public DrawModel getModel() {
        return model;
    }

    public int getAs() {
        return as;
    }

    public int getLastX() {
        return lastX;
    }

    public int getLastY() {
        return lastY;
    }

    public TimeZone getTimeZone() {
        return model.getTimeZone();
    }

    public void setTimeZone(TimeZone timeZone) {
        model.setTimeZone(timeZone);
    }

    public Locale getLocale() {
        return locale;
    }

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

    public void setTime(GregorianCalendar currentTime) {
        super.setTime(currentTime);
        if (currentEvent != null) {
            topShapePrototype = currentEvent.getShape();
        }
        int millis = currentTime.get(Calendar.MILLISECOND) / samplingRate;
        timeKey = dateFormat.format(currentTime.getTime()) + millis;
        fireTimeChanged(currentTime);
    }

    private void fireEventSelected(DrawEvent currentEvent) {
        for (int i = 0; i < drawListeners.size(); i++) {
            DrawListener drawListener = (DrawListener) drawListeners.elementAt(i);
            drawListener.eventSelected(currentEvent);
        }
    }

    public void addMessageListener(MessageListener messageListener) {
        messageListeners.addElement(messageListener);
    }

    /**
     * Send a text message to our message listeners.
     *
     * @param message
     * @param editable
     */
    public void fireMessage(String message, MessageEditable editable) {
        messageProducer.fireMessage(message, editable);
    }

    /**
     * A click in the applet area.
     *
     * @param e The mouse click event
     */
    public void mouseClicked(MouseEvent e) {
        record(e, selection);
    }

    private boolean isShapePrototypeAvailable() {
        return topShapePrototype != null || middleShapePrototype != null || bottomShapePrototype != null;
    }

    public void backgroundClicked(MouseEvent e) {

    }

    public void showShapeMenu(int mouseX, int mouseY) {
        int selectedShapesCount = selection.size();
        if (selectedShapesCount > 0) {
            UFO currentUfo = (UFO) ((DrawEvent) selection.elementAt(0)).getSource();
            PopupMenu menu = view.getShapeMenu(selection, selection, mouseX, mouseY, currentUfo);
            menu.show(view, mouseX, mouseY);
        }
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
        int mouseX = mouseEvent.getX() - selection.getWidth() / 2;
        int mouseY = mouseEvent.getY() - selection.getHeight();
        selection.setLocation(mouseX, mouseY);
        draw(ALL_LAYERS);
    }

    public void mouseExited(MouseEvent e) {
        Vector currentEvents = model.getEvents(timeKey);
        if (currentEvents != null) {
            for (int i = 0; i < currentEvents.size(); i++) {
                DrawEvent currentEvent = (DrawEvent) currentEvents.elementAt(i);
                DrawShape currentEventShape = currentEvent.getShape();
                Enumeration enumeration = selection.elements();
                while (enumeration.hasMoreElements()) {
                    DrawEvent selectionEvent = (DrawEvent) enumeration.nextElement();
                    DrawShape selectionShape = selectionEvent.getShape();
                    if (currentEventShape == selectionShape) {
                        currentEvents.removeElement(currentEvent);
                    }
                }
            }
            draw(ALL_LAYERS);
        }
        super.mouseExited(e);
    }

    public DrawEvent record(int x, int y, Object source, DrawShape shape) {
        DrawEvent drawEvent;
        drawEvent = null;
        fireMessage("Recording " + source + " at " + timeKey, null);
        try {
            shape.setLocation(x, y);
            DrawShape ufoShape = (DrawShape) shape.clone();
            drawEvent = new DrawEvent(ufoShape, source);
            model.addEvent(timeKey, drawEvent);
            fireEventRecorded(drawEvent);
        } catch (CloneNotSupportedException e) {
            e.printStackTrace();
        }
        return drawEvent;
    }

    private void fireEventRecorded(DrawEvent drawEvent) {
        for (int i = 0; i < drawListeners.size(); i++) {
            DrawListener drawListener = (DrawListener) drawListeners.elementAt(i);
            drawListener.eventRecorded(drawEvent);
        }
    }

    public void mouseReleased(MouseEvent e) {
        lastRecordEnd = 0;
        moveDeltaX = 0;
        moveDeltaY = 0;
        currentEvent = null;
        eventToRecord = null;
        dragRecordThread = null;
    }

    public void mouseDragged(MouseEvent e) {
        eventToRecord = e;
        if (dragRecordThread == null) {
            dragRecordThread = new Thread() {
                public void run() {
                    while (eventToRecord != null) {
                        long recordTime = System.currentTimeMillis();
                        if (lastRecordEnd != 0) {
                            int deltaMillis = (int) (recordTime - lastRecordEnd);
                            if (deltaMillis >= samplingRate) {
                                record(eventToRecord, selection);
                                draw(ALL_LAYERS);
                                GregorianCalendar someCurrentTime = getCurrentTime();
                                someCurrentTime.add(Calendar.MILLISECOND, deltaMillis);
                                setTime(someCurrentTime);
                            }
                        }
                        lastRecordEnd = recordTime;
                    }
                }
            };
            dragRecordThread.start();
        }
    }

    public void setLastX(int lastX) {
        this.lastX = lastX;
    }

    public void setLastY(int lastY) {
        this.lastY = lastY;
    }

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

    public ResourceBundle getMessagesBundle() {
        return messagesBundle;
    }

    public void draw(BitSet layers) {
        paintShapes();
        view.displayBuffered();
    }

    public void setAs(int x) {
        as = x;
        model.setZoomFactor(as);
    }

    public void addDrawListener(DrawListener drawListener) {
        drawListeners.addElement(drawListener);
    }

    public void addAnimationListener(AnimationListener animationListener) {
        animationListeners.addElement(animationListener);
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

    public void setSelection(DrawSelection selection) {
        this.selection = selection;
    }
}
