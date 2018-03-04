package org.rr0.ufoathome.model.ufo;

import org.rr0.ufoathome.control.AbstractController;

import java.awt.*;
import java.util.Random;

/**
 * @author Jerôme Beau
 * @version 13 mars 2004 12:39:05
 */
public class SnowPrecipitations implements Precipitations {
    private AbstractController controller;
    protected int windFactor = 1;
    private int[] snowRadius;

    public SnowPrecipitations(AbstractController controller) {
        this.controller = controller;
        random = new Random();
        sleepMillis = 50;
    }

    public void init() {
        size = controller.getView().getSize();
        snow = new int[snowAmount][2];
        snowRadius = new int[snowAmount];
        for (int i = 0; i < snowAmount; i++) {
            snow[i][0] = random.nextInt() % (size.width / 2) + size.width / 2;
            snow[i][1] = random.nextInt() % (size.height / 2) + size.height / 2;
            if (i % 2 == 0) {
                snowRadius[i] = 1;
            } else {
                snowRadius[i] = 3;
            }
        }
    }

    public void start() {
        if (animationThread == null) {
            animationThread = new Thread(this);
            animationThread.start();
        }
    }

    public void stop() {
        animationThread = null;
    }

    public void run() {
        while (animationThread != null) {
            Thread.yield();
            if (animationThread != null) {
                controller.draw();
            }
        }
    }

    public void paint(Graphics g) {
        g.setColor(Color.white);
        for (int i = 0; i < snowAmount; i++) {
            int snowX = snow[i][0];
            int snowY = snow[i][1];
            int radius = snowRadius[i];
            g.fillOval(snowX, snowY, radius, radius);
            snow[i][0] += random.nextInt() % 2 + (random.nextInt() % 10 == 0 ? wind / 2 : wind);
            snow[i][1] += (random.nextInt() % 6 + 18 + radius) / 5 + 1;
            if (snowX >= size.width) {
                snow[i][0] = 0;
            }
            if (snowX < 0) {
                snow[i][0] = size.width - 1;
            }
            if (snowY >= size.height || snowY < 0) {
                snow[i][0] = Math.abs(random.nextInt() % size.width);
                snow[i][1] = 0;
            }
        }

        int newWind = Integer.MIN_VALUE;
        switch (random.nextInt() % 100) {
            case -2:
                newWind = -2 - windFactor;
                break;

            case -1:
                newWind = -1 - windFactor;
                break;

            case 0:
                newWind = windFactor;
                break;

            case 1:
                newWind = 1 + windFactor;
                break;

            case 2:
                newWind = 2 + windFactor;
                break;
        }
        if (newWind > Integer.MIN_VALUE) {
            //            wind = newWind * windFactor;
            wind = newWind;
        }
    }

    public void setWindFactor(int windFactor) {
        this.windFactor = windFactor;
        sleepMillis = 100 / (this.windFactor + 1);
    }

    private Thread animationThread;
    protected Random random;
    protected int[][] snow;
    protected int snowAmount = 150;
    protected int wind;
    int sleepMillis;
    protected Dimension size;
}
