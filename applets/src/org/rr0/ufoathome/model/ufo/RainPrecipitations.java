package org.rr0.ufoathome.model.ufo;

import org.rr0.ufoathome.control.AbstractController;

import java.awt.*;

/**
 * @author Jerôme Beau
 * @version 13 mars 2004 12:39:05
 */
public class RainPrecipitations extends SnowPrecipitations {
    private int length = 40;
    private Color RAIN_COLOR = new Color(220, 220, 220);

    public RainPrecipitations(AbstractController controller) {
        super(controller);
        sleepMillis = 10;
    }

    public void paint(Graphics g) {
        g.setColor(RAIN_COLOR);
        for (int i = 0; i < snowAmount; i++) {
            int snowX = snow[i][0];
            int snowY = snow[i][1];
            snow[i][0] += random.nextInt() % 2 + wind;
            int newNewYPart = random.nextInt() % 6 + length;
            //            int newSnowYToDraw = snow[i][1] + newNewYPart / 5 + 1;
            snow[i][1] = snow[i][1] + (newNewYPart * 2) / 5 + 1;
            boolean drawIt = true;
            if (snowX >= size.width) {
                snow[i][0] = 0;
                drawIt = false;
            }
            if (snowX < 0) {
                snow[i][0] = size.width - 1;
                drawIt = false;
            }
            if (snowY >= size.height || snowY < 0) {
                snow[i][0] = Math.abs(random.nextInt() % size.width);
                snow[i][1] = 0;
                drawIt = false;
            }
            if (drawIt) {
                g.drawLine(snowX, snowY, snow[i][0], snow[i][1]);
            }
        }

        int newWind = Integer.MIN_VALUE;
        switch (random.nextInt() % 100) {
            case -2:
                newWind = -2;
                break;

            case -1:
                newWind = -1;
                break;

            case 0:
                newWind = 0;
                break;

            case 1:
                newWind = 1;
                break;

            case 2:
                newWind = 2;
                break;
        }
        if (newWind > Integer.MIN_VALUE) {
            wind = newWind * windFactor;
        }
    }
}
