package org.rr0.slide;

import java.applet.Applet;
import java.awt.*;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.Vector;

/**
 * 
 *
 * @author Jérôme Beau
 * @version 22 avr. 2003 19:42:32
 */
public class SlideShowApplet extends Applet implements Runnable {
    private Vector imageFiles = new Vector();
    private int currentImageIndex;
    private Thread slideThread;
    private long displayTime = 500;
    private boolean running;
    private MediaTracker mediaTracker;
    private Image currentImage;
    private int appletWidth;
    private int appletHeight;
    private String imageDirectory;

    public void init() {
        super.init();
        imageDirectory = getParameter("images");
        if (imageDirectory == null)
            imageDirectory = "images";
        getFileList();
        int size = imageFiles.size();
        currentImageIndex = (int) (Math.random() * (double) size);
        mediaTracker = new MediaTracker(this);
        currentImageIndex = 0;
        slideThread = new Thread(this);
        appletWidth = getSize().width;
        appletHeight = getSize().height;
    }

    private void getFileList() {
        String path = getCodeBaseString();
        path = path.substring(0, path.lastIndexOf("/") + 1) + imageDirectory + "/list.txt";
        try {
            URL imageURL = new URL(path);
            BufferedReader bufferedReader = new BufferedReader(new InputStreamReader(imageURL.openStream()));
            int i = 0;
            while (bufferedReader.ready()) {
                String fileName = bufferedReader.readLine();
                imageFiles.addElement(fileName);
            }
        } catch (MalformedURLException e) {
            e.printStackTrace();  //To change body of catch statement use Options | File Templates.
        } catch (IOException e) {
            e.printStackTrace();  //To change body of catch statement use Options | File Templates.
        }
        //        File file = new File (imageDirectory);
        //        if (file.isDirectory()) {
        //            imageFiles = file.listFiles();
        //        }

    }

    public String getCodeBaseString() {
        String path = super.getCodeBase().toString();
        //        path = "http://rr0.org/";
        return path;
    }

    public void start() {
        super.start();
        running = true;
        slideThread.start();
    }

    public void stop() {
        super.stop();
        running = false;
    }

    public void paint(Graphics someGraphics) {
        super.paint(someGraphics);
        try {
            mediaTracker.waitForID(currentImageIndex);
            /*            double appletRatio = (double) appletWidth / (double) appletHeight;
                        int width = currentImage.getWidth(this);
                        int height = currentImage.getHeight(this);
                        double imageRatio = (double) width / (double) height;
                        if (appletRatio < imageRatio) {
                          height = (int)(width / imageRatio);
                        } else {
                          width = (int)(height * imageRatio);
                        }
                        someGraphics.drawImage(currentImage, 0, 0, width, height, null);
            */
            someGraphics.drawImage(currentImage, 0, 0, appletWidth, appletHeight, null);
            mediaTracker.removeImage(currentImage);
        } catch (InterruptedException ie) {
            System.err.println("Applet interrompue");
        }
    }

    /**
     * Avoid update to avoid flicking
     */
    public void repaint() {
        paint(getGraphics());
    }

    public void run() {
        while (running) {
            try {
                String imageFile = (String) imageFiles.elementAt(currentImageIndex);
                String path = getCodeBaseString();
                path = path.substring(0, path.lastIndexOf("/") + 1) + imageDirectory + "/" + imageFile;
                URL imageURL = new URL(path);
                //                currentImage = getToolkit.getDefaultToolkit().createImage(imageURL);
                currentImage = getImage(imageURL);
                mediaTracker.addImage(currentImage, currentImageIndex);
                repaint();
                if (currentImageIndex >= imageFiles.size())
                    currentImageIndex = 0;
                else
                    currentImageIndex++;
                Thread.currentThread().sleep(displayTime);
            } catch (InterruptedException e) {
                System.err.println("Applet interrompue");
            } catch (MalformedURLException e) {
                e.printStackTrace();  //To change body of catch statement use Options | File Templates.
            }
        }
    }
}
