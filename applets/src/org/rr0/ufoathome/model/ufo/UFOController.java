package org.rr0.ufoathome.model.ufo;

import org.rr0.ufoathome.model.sky.SkyController;
import org.rr0.ufoathome.model.sky.SkyEvent;
import org.rr0.ufoathome.model.sky.SkyListener;
import org.rr0.ufoathome.control.AbstractController;
import org.rr0.ufoathome.view.AbstractView;
import org.rr0.ufoathome.view.draw.DrawSelection;
import org.rr0.ufoathome.view.draw.DrawEvent;
import org.rr0.ufoathome.view.draw.DrawModel;
import org.rr0.ufoathome.view.draw.DrawController;
import org.rr0.ufoathome.view.draw.BehaviorController;
import org.rr0.ufoathome.view.draw.DrawShape;
import org.rr0.ufoathome.view.draw.DrawListener;
import org.rr0.ufoathome.view.draw.AnimationListener;
import org.rr0.ufoathome.view.gui.MessageListener;
import org.rr0.ufoathome.view.gui.MapElement;
import org.rr0.ufoathome.view.gui.MessageEvent;
import org.rr0.ufoathome.view.gui.MessageEditable;

import java.awt.*;
import java.awt.event.*;
import java.net.URL;
import java.text.DateFormat;
import java.text.ParseException;
import java.util.*;

/**
 * The controller for processing UFO reporting events.
 *
 * @version 0.3
 * @author Jerome Beau
 */
public class UFOController extends AbstractController implements MessageProducer {
    public static final String ASPECT_TAB = "Aspect";
    public static final String BEHAVIOR_TAB = "Behavior";
    public static final String LOCATION_TAB = "Place";
    public static final String WITNESS_TAB = "Witness";
    public static final String CIRCUMSTANCES_TAB = "Circumstances";
    public static final String MAP = "Map";

    protected String mode = LOCATION_TAB;

    protected Vector messageListeners = new Vector();
    private UFO currentUFO;

    private UFOSceneModel model;
    private DrawModel mapModel;
    private UFOView view;

    /**
     * The inner, replaceable controller
     */
    private AbstractController controller;
    private SkyController skyController;
    private DrawController aspectController;
    private BehaviorController behaviorController;
    private DrawController mapController;

    private boolean playing;
    private Thread animationThread;
    private MapElement currentMapElement;
    private boolean focused;
    public static final String MOVETO_ACTION_COMMAND = "MoveTo";
    private BitSet RUNNABLE_WEATHER_LAYER;
    private BitSet ALL_LAYERS_BUT_RUNNABLE_WEATHER;

    public UFOController(Locale locale, int samplingRate) {
        initModels();
        initView();
        initSubControllers(samplingRate, locale);
    }

    private void initSubControllers(int samplingRate, Locale locale) {
        skyController = createSkyController();
        aspectController = createDrawController(samplingRate, locale, ALL_LAYERS_BUT_RUNNABLE_WEATHER, RUNNABLE_WEATHER_LAYER);
        behaviorController = createBehaviorController(samplingRate, locale);
        mapController = createMapController(samplingRate, locale);
        animationRunner = createAnimationRunner(samplingRate);
        initLayers();
    }

    private DrawController createMapController(int samplingRate, Locale locale) {
        DrawController mapController = new DrawController(view, mapModel, samplingRate, locale, this) {
            public void selectObject(String objectName) {
                currentMapElement = UFOController.this.model.getBuidling(objectName);
                DrawSelection selection = getSelection();
                selection.clear();
                Vector buildingEvents = this.model.getEvents(getTimeKey(), currentMapElement);
                if (buildingEvents != null) {
                    for (int i = 0; i < buildingEvents.size(); i++) {
                        DrawEvent buildingEvent = (DrawEvent) buildingEvents.elementAt(i);
                        selection.add(buildingEvent);
                    }
                }
                selection.select(true);
                this.draw();
            }

            public void select(boolean multiple, DrawEvent currentEvent) {
                MapElement mapElement = (MapElement) currentEvent.getSource();
                if (mapElement != currentMapElement) {
                    selectObject(mapElement.getTitle());
                }
                super.select(multiple, currentEvent);
            }
        };
        return mapController;
    }

    private void initView() {
        view = createView();
        view.addMouseListener(this);
        view.addMouseMotionListener(this);
        getView().addKeyListener(new KeyAdapter() {
            public void keyPressed(KeyEvent e) {
                controller.keyPressed(e);
            }
        });
    }

    private void initModels() {
        model = new UFOSceneModel();
        mapModel = new DrawModel();
    }

    private void initLayers() {
        ALL_LAYERS_BUT_RUNNABLE_WEATHER = new BitSet();
        ALL_LAYERS_BUT_RUNNABLE_WEATHER.or(skyController.ALL_LAYERS);
        ALL_LAYERS_BUT_RUNNABLE_WEATHER.clear(skyController.RUNNABLE_WEATHER);

        RUNNABLE_WEATHER_LAYER = new BitSet();
        RUNNABLE_WEATHER_LAYER.set(skyController.RUNNABLE_WEATHER);

        ALL_LAYERS.or(aspectController.ALL_LAYERS);
        ALL_LAYERS.or(skyController.ALL_LAYERS);
    }

    private BehaviorController createBehaviorController(int samplingRate, Locale locale) {
        behaviorController = new BehaviorController(view, model, samplingRate, locale, this) {
            public void mouseDragged(MouseEvent e) {
                super.mouseDragged(e);
                if (!e.isConsumed()) {
                    skyController.mouseDragged(e);
                }
            }

            public void mouseMoved(MouseEvent mouseEvent) {
                super.mouseMoved(mouseEvent);
                if (!mouseEvent.isConsumed()) {
                    skyController.mouseMoved(mouseEvent);
                }
            }

            public void draw(BitSet layers) {
                skyController.draw();
                super.draw(layers);
            }

        };
        return behaviorController;
    }

    private DrawController createDrawController(int samplingRate, Locale locale, final BitSet ALL_LAYERS_BUT_RUNNABLE_WEATHER, final BitSet RUNNABLE_WEATHER_LAYER) {
        DrawController aspectController = new DrawController(view, model, samplingRate, locale, this) {
            public void mouseDragged(MouseEvent e) {
                super.mouseDragged(e);
                if (!e.isConsumed()) {
                    skyController.mouseDragged(e);
                }
            }

            public void mouseClicked(MouseEvent e) {
                super.mouseClicked(e);
                if (!e.isConsumed()) {
                    skyController.mouseClicked(e);
                }
            }

            public void selectObject(String objectName) {
                currentUFO = (UFO) this.model.getSource(objectName);
                DrawSelection selection = getSelection();
                selection.clear();
                Vector ufoEvents = this.model.getEvents(getTimeKey(), currentUFO);
                if (ufoEvents != null) {
                    for (int i = 0; i < ufoEvents.size(); i++) {
                        DrawEvent ufoEvent = (DrawEvent) ufoEvents.elementAt(i);
                        selection.add(ufoEvent);
                    }
                }
                selection.select(true);
                this.getView().requestFocus();
                draw();
            }

            public void showShapeMenu(int mouseX, int mouseY, DrawEvent currentEvent) {
                //                int selectedShapesCount = aspectController.getSelection().size();
                //                if (selectedShapesCount > 0) {
                final UFO currentUfo = (UFO) currentEvent.getSource();
                PopupMenu popupMenu = this.view.getShapeMenu(getSelection(), getSelection(), mouseX, mouseY, currentUfo);
                final Hashtable ufos = UFOController.this.model.getSources();
                final String timeKey = getTimeKey();
                if (ufos.size() > 1) {
                    Menu moveToMenu = new Menu(getMessagesBundle().getString(MOVETO_ACTION_COMMAND));
                    Menu behindMenu = new Menu(getMessagesBundle().getString("Behind"));
                    Menu inFrontOfMenu = new Menu(getMessagesBundle().getString("InFrontOf"));
                    Enumeration enumeration = ufos.keys();
                    while (enumeration.hasMoreElements()) {
                        final String ufoKey = (String) enumeration.nextElement();
                        if (!(ufoKey.equals(currentUfo.getName()))) {
                            MenuItem moveToUfoMenuItem = new MenuItem(ufoKey);
                            moveToUfoMenuItem.setActionCommand(MOVETO_ACTION_COMMAND);
                            MenuItem behindMenuItem = new MenuItem(ufoKey);
                            MenuItem inFrontOfMenuItem = new MenuItem(ufoKey);
                            ActionListener moveToUfoListenener = new ShapeMenuListener() {
                                public void actionPerformed(ActionEvent actionEvent) {
                                    super.actionPerformed(actionEvent);
                                    if (actionEvent.getActionCommand().equals(MOVETO_ACTION_COMMAND)) {
                                        UFO selectedUfo = (UFO) ufos.get(ufoKey);
                                        DrawSelection selection = getSelection();
                                        for (int i = 0; i < selection.size(); i++) {
                                            DrawEvent drawEvent = (DrawEvent) selection.elementAt(i);
                                            drawEvent.setSource(selectedUfo);
                                        }
                                        if (skyController.getModel().getEvents(timeKey, currentUfo).isEmpty()) {
                                            deleteSource(currentUfo.getName());
                                        }
                                        selectObject(selectedUfo.getName());
                                    }
                                }
                            };
                            moveToUfoMenuItem.addActionListener(moveToUfoListenener);
                            moveToMenu.add(moveToUfoMenuItem);
                            //                        behindMenuItem.addActionListener(behindUfoListenener);
                            behindMenu.add(behindMenuItem);
                            //                        inFrontOfMenuItem.addActionListener(inFrontOfUfoListenener);
                            inFrontOfMenu.add(inFrontOfMenuItem);
                        }
                    }
                    popupMenu.add(moveToMenu);
                    popupMenu.add(behindMenu);
                    popupMenu.add(inFrontOfMenu);
                }
                PopupMenu menu = popupMenu;
                menu.show(this.view, mouseX, mouseY);
                //                }
            }

            public void mouseMoved(MouseEvent mouseEvent) {
                super.mouseMoved(mouseEvent);
                if (!mouseEvent.isConsumed()) {
                    skyController.mouseMoved(mouseEvent);
                }
            }

            public void mouseReleased(MouseEvent mouseEvent) {
                super.mouseReleased(mouseEvent);
                if (!mouseEvent.isConsumed()) {
                    skyController.mouseReleased(mouseEvent);
                }
            }

            public void draw() {
                skyController.draw(UFOController.this.ALL_LAYERS_BUT_RUNNABLE_WEATHER);
                super.draw();
                skyController.draw(RUNNABLE_WEATHER_LAYER);
                this.display();
            }

            public DrawEvent record(int x, int y, Object source, DrawShape shape) {
                if (source instanceof UFO) {
                    currentUFO = (UFO) source;
                } else if (currentUFO == null) {
                    currentUFO = createUFO();
                }
                DrawEvent event = super.record(x, y, currentUFO, shape);
                return event;
            }

            public void select(boolean multiple, DrawEvent currentEvent) {
                UFO ufo = (UFO) currentEvent.getSource();
                if (ufo != currentUFO) {
                    selectObject(ufo.getName());
                }
                super.select(multiple, currentEvent);
            }

            public void keyPressed(KeyEvent e) {
                super.keyPressed(e);
                if (!e.isConsumed()) {
                    skyController.keyPressed(e);
                }
            }
        };

        return aspectController;
    }

    private UFOView createView() {
        UFOView view = new UFOView();
        view.addFocusListener(new FocusListener() {
            public void focusGained(FocusEvent e) {
                focused = true;
                draw();
            }

            public void focusLost(FocusEvent e) {
                focused = false;
                draw();
            }
        });
        return view;
    }

    private SkyController createSkyController() {
        return new SkyController(model, view, this) {
            public void display() {
                // Do nothing: subclasses will display instead
            }
        };
    }

    public void addMessageListener(MessageListener messageListener) {
        messageListeners.addElement(messageListener);
    }

    public void display() {
        AbstractView view = getView();
        if (focused) {
            Graphics graphics = view.getBufferedGraphics();
            graphics.setColor(SystemColor.blue);
            Dimension size = view.getSize();
            int width = size.width;
            int height = size.height;
            graphics.drawRect(0, 0, width - 1, height - 2);
            graphics.drawRect(1, 1, width - 2, height - 2);
        }
        super.display();
    }

    /**
     * Select all shapes of the current UFO
     */
    private void selectCurrentUfo() {
        DrawSelection drawSelection = aspectController.getSelection();
        drawSelection.clear();
        Vector ufoEvents = model.getEvents(aspectController.getTimeKey(), currentUFO);
        for (int i = 0; i < ufoEvents.size(); i++) {
            DrawEvent event = (DrawEvent) ufoEvents.elementAt(i);
            drawSelection.add(event);
        }
    }

    public UFO createUFO(String name) {
        UFO createdUFO = model.createUFO(name);
        //        fireUfoCreated(createdUFO);
        return createdUFO;
    }

    public UFO getCurrentUFO() {
        return currentUFO;
    }

    public Hashtable getUFOs() {
        return model.getSources();
    }

    public void selectObject(String ufoName) {
        controller.selectObject(ufoName);
    }

    public GregorianCalendar getTime() {
        return controller.getCurrentTime();
    }

    public UFO createUFO() {
        String newUfoName = getMessagesBundle().getString("UFO") + '-' + (getUFOs().size() + 1);
        UFO createdUFO = createUFO(newUfoName);
        return createdUFO;
    }

    public void setDescription(String description) {
        model.setDescription(aspectController.getTimeKey(), description);
    }

    public String getDescription() {
        return model.getDescription(aspectController.getTimeKey());
    }

    private WitnessModel getWitness() {
        return model.getWitness();
    }

    public void setLastname(String lastName) {
        getWitness().setLastName(lastName);
    }

    public String getLastName() {
        return getWitness().getLastName();
    }

    public String getBirthDate() {
        GregorianCalendar birthDate = getWitness().getBirthDate();
        String birthDateString = aspectController.getDateFormat().format(birthDate.getTime());
        return birthDateString;
    }

    public void setBirthDate(String birthDateString) {
        try {
            Date birthDate = aspectController.getDateFormat().parse(birthDateString);
            getWitness().setBirthDate(birthDate);
        } catch (ParseException e) {
            e.printStackTrace();
        }
    }

    public void setFirstName(String firstName) {
        getWitness().setFirstName(firstName);
    }

    public void setEmail(String email) {
        getWitness().setEmail(email);
    }

    public void setAddress(String address) {
        getWitness().setAddress(address);
    }

    public void setZipCode(String zipCode) {
        getWitness().setZipCode(zipCode);
    }

    public void setCountry(String country) {
        getWitness().setCountry(country);
    }

    public void setPhoneNumber(String phoneNumber) {
        getWitness().setPhoneNumber(phoneNumber);
    }

    public String getFirstName() {
        return getWitness().getFirstName();
    }

    public String getEmail() {
        return getWitness().getEmail();
    }

    public String getAddress() {
        return getWitness().getAddress();
    }

    public String getZipCode() {
        return getWitness().getZipCode();
    }

    public String getCountry() {
        return getWitness().getCountry();
    }

    public String getPhoneNumber() {
        return getWitness().getPhoneNumber();
    }

    public String getTown() {
        return getWitness().getTown();
    }

    public void setTown(String town) {
        getWitness().setTown(town);
    }

    public void setOdor(String weatherKey) {
        // TODO(JBE):
    }

    public void setTemperature(String weatherKey) {
        // TODO(JBE):
    }

    public void mouseClicked(MouseEvent e) {
        controller.mouseClicked(e);
        if (e.isConsumed()) {
            display();
        }
    }

    public void mouseEntered(MouseEvent e) {
        controller.mouseEntered(e);
    }

    public TimeZone getTimeZone() {
        return aspectController.getTimeZone();
    }

    public void setTimeZone(TimeZone timeZone) {
        aspectController.setTimeZone(timeZone);
    }

    //    public Locale getLocale() {
    //        return skyController.getLocale();
    //    }

    public DateFormat getDateFormat() {
        return aspectController.getDateFormat();
    }

    public void setEndTime(Date endTime) {
        aspectController.setEndTime(endTime);
        behaviorController.setEndTime(endTime);
        mapController.setEndTime(endTime);
    }

    public Date getStartTime() {
        return aspectController.getStartTime();
    }

    public void setStartTime(Date startTime) {
        aspectController.setStartTime(startTime);
    }

    public void start() {
        skyController.start();
        aspectController.start();
    }

    public boolean isPlaying() {
        return playing;
    }

    public int getSamplingRate() {
        return aspectController.getSamplingRate();
    }

    public void backgroundClicked(MouseEvent e) {
        controller.backgroundClicked(e);
        //        fireEventSelected(null);
        currentUFO = null;
    }

    public void mouseExited(MouseEvent e) {
        controller.mouseExited(e);
    }

    public void mouseDragged(MouseEvent e) {
        controller.mouseDragged(e);
    }

    public boolean isAspectMode() {
        return mode.equals(UFOController.ASPECT_TAB);
    }

    public boolean isMapMode() {
        return mode.equals(UFOController.MAP);
    }

    public boolean isBehaviorMode() {
        return mode.equals(UFOController.BEHAVIOR_TAB);
    }

    protected void paintShapes() {
        aspectController.paintShapes();
    }

    public void addSelection(DrawEvent selection) {
        aspectController.addSelection(selection);
    }

    public void setColor(Color color) {
        aspectController.setColor(color);
        draw();
        display();
    }

    public void setZoomFactor(int x) {
        controller.setZoomFactor(x);
        draw();
    }

    public void addDrawListener(DrawListener drawListener) {
        aspectController.addDrawListener(drawListener);
    }

    public void addAnimationListener(AnimationListener animationListener) {
        animationListeners.addElement(animationListener);
    }

    public void setTopShape(DrawShape shapePrototype) {
        aspectController.setTopShape(shapePrototype);
        currentUFO = null;
    }

    public void setMidShape(DrawShape shapePrototype) {
        aspectController.setMidShape(shapePrototype);
        currentUFO = null;
    }

    public void setBottomShape(DrawShape shapePrototype) {
        aspectController.setBottomShape(shapePrototype);
        currentUFO = null;
    }

    private void fireModeChanged() {
        for (int i = 0; i < animationListeners.size(); i++) {
            AnimationListener animationListener = (AnimationListener) animationListeners.elementAt(i);
            animationListener.modeChanged(mode);
        }
    }

    public void setMode(String modeName) {
        this.mode = modeName;
        fireModeChanged();
        if (isAspectMode()) {
            controller = aspectController;
            //            selection = ufoSelection;
            //            selection.select(true);
        } else if (isBehaviorMode()) {
            behaviorController.setSelection(aspectController.getSelection());
            controller = behaviorController;
            //            selection = ufoSelection;
            //            if (selection.isEmpty()) {
            //
            //            }
            //            selection.select(false);
        } else if (isMapMode()) {
            controller = mapController;
            //            selection.select(true);
        }

        if (currentUFO == null) {
            Enumeration ufosEnumeration = getUFOs().elements();
            if (ufosEnumeration.hasMoreElements()) {
                currentUFO = (UFO) ufosEnumeration.nextElement();
            }
        }
        if (currentUFO != null) {
            selectCurrentUfo();
        }
    }

    /**
     * Send a text message to our message listeners.
     *
     * @param message
     * @param editable
     */
    public void fireMessage(String message, MessageEditable editable) {
        MessageEvent messageEvent = new MessageEvent(this, message, editable);
        Enumeration listenersEnumeration = messageListeners.elements();
        while (listenersEnumeration.hasMoreElements()) {
            MessageListener listener = (MessageListener) listenersEnumeration.nextElement();
            listener.message(messageEvent);
        }
    }

    public void setTransparency(int alpha) {
        aspectController.setTransparency(alpha);
    }

    public void setTime(GregorianCalendar time) {
        aspectController.setTime(time);
        skyController.setTime(time);
        mapController.setTime(time);
        behaviorController.setTime(time);
        super.setTime(time);
        fireTimeChanged(currentTime);
    }

    public int getOffset() {
        return skyController.getOffset();
    }

    public boolean setAzimut(int someAzimut, Object source) {
        return skyController.setAzimut(someAzimut, source);
    }

    public boolean setAltitude(int degrees, Object source) {
        return skyController.setAltitude(degrees, source);
    }

    public void setLatitude(double latitude) {
        skyController.setLatitude(latitude);
    }

    public void setLongitude(double longitude) {
        skyController.setLongitude(longitude);
    }

    public AbstractView getView() {
        return view;
    }

    public void mouseMoved(MouseEvent mouseEvent) {
        controller.mouseMoved(mouseEvent);
    }

    public void mouseReleased(MouseEvent e) {
        controller.mouseReleased(e);
    }

    public int getAzimut() {
        return skyController.getAzimut();
    }

    public int getAltitude() {
        return skyController.getAltitude();
    }

    public int getZoomFactor() {
        return skyController.getZoomFactor();
    }

    public void draw(BitSet layers) {
        controller.draw(layers);
    }

    public double getLongitude() {
        return skyController.getLongitude();
    }

    public double getLatitude() {
        return skyController.getLatitude();
    }

    public void addSkyListener(SkyListener skyListener) {
        skyController.addSkyListener(skyListener);
    }

    public void fireAzimutChanged(SkyEvent event) {
        skyController.fireAzimutChanged(event);
    }

    public void fireAltitudeChanged(SkyEvent event) {
        skyController.fireAltitudeChanged(event);
    }

    public void fireLatitudeChanged(SkyEvent event) {
        skyController.fireLatitudeChanged(event);
    }

    public void fireLongitudeChanged(SkyEvent event) {
        skyController.fireLongitudeChanged(event);
    }

    public void play(boolean on) {
        playing = on;
        if (playing) {
            animationThread = new Thread(animationRunner);
            animationThread.start();
            fireAnimationStarted();
        }
    }

    private void fireAnimationStarted() {
        for (int i = 0; i < animationListeners.size(); i++) {
            AnimationListener animationListener = (AnimationListener) animationListeners.elementAt(i);
            animationListener.animationStarted();
        }
    }

    private void fireAnimationStopped() {
        for (int i = 0; i < animationListeners.size(); i++) {
            AnimationListener animationListener = (AnimationListener) animationListeners.elementAt(i);
            animationListener.animationStopped();
        }
    }

    private Runnable animationRunner;

    private Runnable createAnimationRunner(final int samplingRate) {
        return new Runnable() {
            public void run() {
                Date endTime = getEndTime();
                do {
                    GregorianCalendar someCurrentTime = getCurrentTime();
                    setTime(someCurrentTime);
                    try {
                        int interval = samplingRate;
                        Thread.sleep(interval);
                        someCurrentTime.add(Calendar.MILLISECOND, interval);
                        if (someCurrentTime.getTime().after(endTime)) {
                            someCurrentTime.setTime(endTime);
                            setTime(someCurrentTime);
                            play(false);
                        }
                        draw();
                    } catch (InterruptedException e) {
                        System.err.println("Play interrupted: " + e);
                    }
                } while (playing);
                fireAnimationStopped();
            }
        };
    }

    public Date getEndTime() {
        return aspectController.getEndTime();
    }

    public URL setLandscape(URL landscapeURL, int minAltitude, int maxAltitude, int minAzimut, int maxAzimut) {
        return skyController.setLandscape(landscapeURL, minAltitude, maxAltitude, minAzimut, maxAzimut);
    }

    public URL setWeather(URL url) {
        return skyController.setWeather(url);
    }

    public void setPrecipitations(String weatherKey) {
        skyController.setPrecipitations(weatherKey, controller);
        draw();
    }

    public void setWind(String weatherKey) {
        skyController.setWind(weatherKey);
    }

    public void setMessage(MessageEditable editable, String text) {
        if (editable instanceof UFO) {
            UFO ufo = (UFO) editable;
            //            fireUfoDeleted(ufo);
            ufo.setTitle(text);
            //            fireUfoCreated(ufo);
        } else {
            editable.setTitle(text);
        }
    }

    public void deleteSource(String sourceName) {
        model.removeSource(sourceName);
    }

    public String getUUDF() {
        return model.toString();
    }
}
