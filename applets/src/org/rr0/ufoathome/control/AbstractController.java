package org.rr0.ufoathome.control;

import org.rr0.ufoathome.view.draw.AnimationEvent;
import org.rr0.ufoathome.view.draw.AnimationListener;
import org.rr0.ufoathome.model.ufo.MessageProducer;
import org.rr0.ufoathome.view.AbstractView;

import java.awt.*;
import java.awt.event.*;
import java.awt.image.ImageObserver;
import java.net.URL;
import java.util.*;

/**
 * @author Jerome Beau
 * @version 0.3
 */
public abstract class AbstractController extends MouseAdapter implements MouseMotionListener, KeyListener, MessageProducer {
    private Hashtable imageCache = new Hashtable();
    protected int lastX = -1;
    protected int lastY = -1;
    protected GregorianCalendar currentTime;
    protected ResourceBundle messagesBundle;
    protected Vector animationListeners = new Vector();
    protected static int lastLayersStartBit = 0;
    protected int layersStartBit = lastLayersStartBit;
    public final BitSet ALL_LAYERS = new BitSet();
    public BitSet layersToDraw = new BitSet();

    public AbstractController() {
        messagesBundle = ResourceBundle.getBundle("org.rr0.is.presentation.view.report.applet.StarSkyLabels");
    }

    public int getLayersStartBit() {
        return layersStartBit;
    }

    public Image getImage(final URL url, final Component creator) {
        Image img;
        Object o = imageCache.get(url);
        if (o != null) {
            return (Image) o;
        }
        try {
            fireMessage("LoadingImage", null);
            o = url.getContent();
            if (o == null) {
                return null;
            }
            if (o instanceof Image) {
                img = (Image) o;
            } else {
                java.awt.image.ImageProducer imageProducer = (java.awt.image.ImageProducer) o;
                img = creator.createImage(imageProducer);
                creator.prepareImage(img, new ImageObserver() {
                    private boolean loading;

                    public boolean imageUpdate(Image img, int infoflags, int x, int y, int w, int h) {
                        if ((infoflags & ImageObserver.ALLBITS) != 0) {
                            loading = false;
                        } else if (!loading && (infoflags & ImageObserver.SOMEBITS) != 0) {
                            //                            String message = messagesBundle.getString("LoadingImage");
                            //                            fireMessage(message);
                            loading = true;
                        } else if ((infoflags & ImageObserver.ERROR) != 0) {
                            System.err.println("Error while loading " + img);
                        }
                        boolean b = creator.imageUpdate(img, infoflags, x, y, w, h);
                        return b;
                    }
                });
            }

            imageCache.put(url, img);
            return img;

        } catch (Exception ex) {
            ex.printStackTrace();
            return null;
        }
    }

    public int getLastX() {
        return lastX;
    }

    public int getLastY() {
        return lastY;
    }

    public void setLastPos(int lastX, int lastY) {
        this.lastX = lastX;
        this.lastY = lastY;
    }

    public GregorianCalendar getCurrentTime() {
        return currentTime;
    }

    public void setTime(GregorianCalendar currentTime) {
        this.currentTime = currentTime;
    }

    public ResourceBundle getMessagesBundle() {
        return messagesBundle;
    }

    public void draw(BitSet requiredLayers) {
        // Clear
        for (int i = 0; i < layersToDraw.size(); i++) {
            layersToDraw.clear(i);
        }
    }

    protected void fireTimeChanged(GregorianCalendar currentTime) {
        for (int i = 0; i < animationListeners.size(); i++) {
            AnimationListener animationListener = (AnimationListener) animationListeners.elementAt(i);
            AnimationEvent animationEvent = new AnimationEvent(this, currentTime);
            animationListener.timeChanged(animationEvent);
        }
    }

    public abstract AbstractView getView();

    public void display() {
        getView().displayBuffered();
    }

    public void selectObject(String objectName) {
        // Do nothing by default
    }

    public void setZoomFactor(int x) {
        // Do nothing by default
    }

    /**
     * Invoked when left click on background (i.e. not on a specific object).
     *
     * @param e The mouse event
     */
    public void backgroundClicked(MouseEvent e) {
        // Do nothing by default
        e.consume();
    }

    public void keyPressed(KeyEvent e) {
        // Do nothing by default
        e.consume();
    }

    public void keyTyped(KeyEvent e) {
        // Do nothing by default
        e.consume();
    }

    public void keyReleased(KeyEvent e) {
        // Do nothing by default
        e.consume();
    }

    protected boolean isToDraw(BitSet layers, int someLayer) {
        boolean layerActive = layers.get(someLayer) && layersToDraw.get(someLayer);
        return layerActive;
    }

    public void draw() {
        draw(ALL_LAYERS);
        display();
    }

    protected int newLayer() {
        ALL_LAYERS.set(layersStartBit);
        return layersStartBit++;
    }

    public void modified(int layer) {
        for (int i = 0; i <= layer; i++) {
            layersToDraw.set(i);
        }
    }
}
