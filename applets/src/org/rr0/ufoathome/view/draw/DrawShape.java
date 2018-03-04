package org.rr0.ufoathome.view.draw;

import org.rr0.ufoathome.view.gui.MessageEditable;

import java.awt.*;
import java.awt.image.DirectColorModel;
import java.awt.image.ImageObserver;
import java.awt.image.MemoryImageSource;
import java.awt.image.PixelGrabber;

/**
 * A shape that can be manipulated in a DrawView.
 *
 * @author Jerôme Beau
 * @version 0.3
 */
public abstract class DrawShape implements Cloneable, MessageEditable {
    protected Rectangle bounds;
    protected Color color;
    protected boolean selected;
    protected double angle;
    protected Component component;
    private int transparency;
    public static final int CORNER_SIZE = 6;
    public static final int HALF_CORNER_SIZE = CORNER_SIZE / 2;
    private DirectColorModel colorModel;
    private int colorMask;
    private double haloScale;
    private Image haloImage;
    private int alphaMask;
    protected String title;

    public DrawShape(Component component) {
        this.component = component;
        colorModel = (DirectColorModel) component.getColorModel();
        colorMask = colorModel.getRedMask() | colorModel.getGreenMask() | colorModel.getBlueMask();
        alphaMask = colorModel.getAlphaMask();
        bounds = new Rectangle();
    }

    public int getTransparency() {
        return transparency;
    }

    public void setTransparency(int alpha) {
        this.transparency = alpha;
    }

    public void setAngle(double angle) {
        this.angle = angle;
    }

    protected abstract void compute();

    public void setLocation(int x, int y) {
        setX(x);
        setY(y);
    }

    public Color getColor() {
        return color;
    }

    /**
     * Return the bounding box of the shape.
     */
    public Rectangle getBounds() {
        return bounds;
    }

    public Dimension getSize() {
        return bounds.getSize();
    }

    public void setWidth(int width) {
        bounds.width = width;
    }

    public void setHeight(int height) {
        bounds.height = height;
    }

    public int getX() {
        return bounds.x;
    }

    public void setColor(Color green) {
        this.color = green;
    }

    public void paint(Graphics g, Rectangle bounds) {
        paint(g, getColor(), bounds);
    }

    public abstract void paint(Graphics g, Color color, Rectangle bounds);

    public void setSelected(boolean b) {
        selected = b;
    }

    public boolean isSelected() {
        return selected;
    }

    public int getY() {
        return bounds.y;
    }

    public void setX(int x) {
        bounds.x = x;
    }

    public void setY(int y) {
        bounds.y = y;
    }

    public void paint(Graphics g) {
        if (haloScale > 0) {
            paintHalo(g, bounds);
        }
        if (transparency > 0) {
            paintTransparent(g, getBounds(), transparency);
        } else {
            paint(g, getColor(), bounds);
        }
        if (isSelected()) {
            paintSelection(g, bounds);
        }
    }

    public void scale(double scaleFactor) {
        scaleWidth(scaleFactor);
        scaleHeight(scaleFactor);
    }

    public void setHaloScale(double haloScale) {
        this.haloScale = haloScale;
        int oldWidth = getWidth();
        int oldHeight = getHeight();
        scale(haloScale);
        bounds.x += (oldWidth - bounds.width) / 2;
        bounds.y += (oldHeight - bounds.height) / 2;
        haloImage = component.createImage(bounds.width, bounds.height);
        int haloTransparency = 0xFF;
        double scaleFact = 0.1;
        double scale = haloScale;
        while (scale > 1.0 + scaleFact) {
            oldWidth = getWidth();
            oldHeight = getHeight();
            scale(1.0 - scaleFact);
            bounds.x += (oldWidth - bounds.width) / 2;
            bounds.y += (oldHeight - bounds.height) / 2;
            haloTransparency -= 10;
            paintTransparent(haloImage.getGraphics(), getBounds(), haloTransparency);
            scale -= scaleFact;
        }
    }

    private void paintHalo(Graphics g, Rectangle bounds) {
        int width = haloImage.getWidth(component);
        int height = haloImage.getHeight(component);
        int x = getX() - ((width - bounds.width) / 2);
        int y = getY() - ((height - bounds.height) / 2);
        int[] pixels = new int[width * height];
        MemoryImageSource memImg = new MemoryImageSource(width, height, pixels, 0, width);
        PixelGrabber pixelGrabber = new PixelGrabber(haloImage, 0, 0, width, height, pixels, 0, width);
        paint(haloImage.getGraphics(), getColor(), new Rectangle(0, 0, width, height));
        int newAlpha = (0xFF - transparency) << 24;
        try {
            pixelGrabber.grabPixels();
            if ((pixelGrabber.getStatus() & ImageObserver.ABORT) != 0) {
                System.err.println("image data fetch aborted or errored");
            }
            for (int i = 0; i < pixels.length; i++) {
                boolean pixelPresent = pixels[i] != -1053730 && pixels[i] != -1250856 && pixels[i] != -16777200 && pixels[i] != -15658735;
                if (pixelPresent) {
                    pixels[i] &= colorMask;
                    pixels[i] |= newAlpha;
                } else {
                    pixels[i] = 0;
                }
            }

            Image imageToDraw = component.createImage(memImg);
            memImg.newPixels();
            g.drawImage(imageToDraw, x, y, component);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }

    private void paintTransparent(Graphics g, Rectangle bounds, int transparency) {
        int[] pixels = new int[bounds.width * bounds.height];
        MemoryImageSource memImg = new MemoryImageSource(bounds.width, bounds.height, pixels, 0, bounds.width);
        Image image = component.createImage(bounds.width, bounds.height);
        PixelGrabber pixelGrabber = new PixelGrabber(image, 0, 0, bounds.width, bounds.height, pixels, 0, bounds.width);
        paint(image.getGraphics(), getColor(), new Rectangle(0, 0, bounds.width, bounds.height));
        int newAlpha = (0xFF - transparency) << 24;
        try {
            pixelGrabber.grabPixels();
            if ((pixelGrabber.getStatus() & ImageObserver.ABORT) != 0) {
                System.err.println("image data fetch aborted or errored");
            }
            for (int i = 0; i < pixels.length; i++) {
                boolean pixelPresent = pixels[i] != -1053730 && pixels[i] != -1250856 && pixels[i] != -16777200 && pixels[i] != -15658735;
                if (pixelPresent) {
                    pixels[i] &= colorMask;
                    pixels[i] |= newAlpha;
                } else {
                    pixels[i] = 0;
                }
            }

            Image imageToDraw = component.createImage(memImg);
            memImg.newPixels();
            g.drawImage(imageToDraw, bounds.x, bounds.y, component);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }

    protected void paintSelection(Graphics g, Rectangle bounds) {
        final Color selectColor = Color.lightGray;
        g.setColor(selectColor);
        g.drawRect(bounds.x, bounds.y, bounds.width, bounds.height);
        g.fillRect(bounds.x - HALF_CORNER_SIZE, bounds.y - HALF_CORNER_SIZE, CORNER_SIZE, CORNER_SIZE);
        final int halfWidth = bounds.width / 2;
        final int halfHeigth = bounds.height / 2;
        g.fillRect(bounds.x + halfWidth - HALF_CORNER_SIZE, bounds.y - HALF_CORNER_SIZE, CORNER_SIZE, CORNER_SIZE);
        g.fillRect(bounds.x + bounds.width - HALF_CORNER_SIZE, bounds.y - HALF_CORNER_SIZE, CORNER_SIZE, CORNER_SIZE);
        g.fillRect(bounds.x + bounds.width - HALF_CORNER_SIZE, bounds.y + halfHeigth - HALF_CORNER_SIZE, CORNER_SIZE, CORNER_SIZE);
        g.fillRect(bounds.x + bounds.width - HALF_CORNER_SIZE, bounds.y + bounds.height - HALF_CORNER_SIZE, CORNER_SIZE, CORNER_SIZE);
        g.fillRect(bounds.x + halfWidth - HALF_CORNER_SIZE, bounds.y + bounds.height - HALF_CORNER_SIZE, CORNER_SIZE, CORNER_SIZE);
        g.fillRect(bounds.x - HALF_CORNER_SIZE, bounds.y + bounds.height - HALF_CORNER_SIZE, CORNER_SIZE, CORNER_SIZE);
        g.fillRect(bounds.x - HALF_CORNER_SIZE, bounds.y + halfHeigth - HALF_CORNER_SIZE, CORNER_SIZE, CORNER_SIZE);
    }

    public int getHeight() {
        return bounds.height;
    }

    public int getWidth() {
        return bounds.width;
    }

    public Object clone() throws CloneNotSupportedException {
        DrawShape clone = (DrawShape) super.clone();
        clone.bounds = new Rectangle(bounds);
        if (color != null) {
            clone.color = new Color(color.getRGB());
        }
        return clone;
    }

    public void scaleWidth(double widthRatio) {
        int newWidth = (int) Math.round(bounds.width * widthRatio);
        setWidth(newWidth);
    }

    public void scaleHeight(double heightRatio) {
        int newHeight = (int) Math.round(bounds.height * heightRatio);
        setHeight(newHeight);
    }

    public boolean contains(int x, int y) {
        return getBounds().contains(x, y);
    }

    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof DrawShape)) return false;

        final DrawShape drawShape = (DrawShape) o;

        if (angle != drawShape.angle) return false;
        if (!color.equals(drawShape.color)) return false;

        return true;
    }

    public int hashCode() {
        int result;
        long temp;
        result = color.hashCode();
        temp = angle != +0.0d ? Double.doubleToLongBits(angle) : 0l;
        result = 29 * result + (int) (temp ^ (temp >>> 32));
        return result;
    }

    public void setTitle(String newValue) {
        this.title = newValue;
    }

    public String getTitle() {
        return title;
    }
}
