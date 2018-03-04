package org.rr0.ufoathome.model.sky;

import org.rr0.ufoathome.view.draw.DrawView;
import org.rr0.ufoathome.model.ufo.Precipitations;
import org.rr0.ufoathome.view.treed.Model3d;

import java.awt.*;
import java.util.Calendar;
import java.util.GregorianCalendar;

/**
 * A drawable sky view.
 *
 * @version 0.3
 * @author Jerome Beau
 */
public class SkyView extends DrawView {
    private int SKY_WIDTH;
    private int SKY_HEIGHT;
    public int HALF_SKY_WIDTH;
    public int HALF_SKY_HEIGHT;
    public int FULL_WIDTH;

    private int xCenter;
    private int yCenter;
    protected int horizonY;
    private int hour;
    private Precipitations weatherRunnable;
    private Image landscapeImage;
    private int minAltitude;
    private int maxAltitude;
    private double altitudePixels;
    private int maxPixels;
    private int maxAzimut;
    private Model3d model3d;

    public SkyView() {
        super();
    }

    public void paintStar(int xDelta, int yDelta, int halfRadius, int radius) {
        int x = (xCenter + xDelta) - halfRadius;
        int y = yCenter - yDelta - halfRadius;
        bufferedGraphics.fillOval(x, y, radius, radius);
    }

    public void setColor(Color color) {
        bufferedGraphics.setColor(color);
    }

    public boolean skyContains(int mouseX, int mouseY) {
        return contains(mouseX, mouseY) && mouseY < horizonY;
    }

    public void paintGround(GregorianCalendar time, double altitude, double factor, int azimut) {
        if (altitude > SkyModel.DEGREES_89) {
            horizonY = yCenter + SKY_HEIGHT * 2;
        } else if (altitude < -SkyModel.DEGREES_89) {
            horizonY = yCenter - HALF_SKY_HEIGHT;
        } else {
            double alt = factor * Math.tan(altitude);
            horizonY = (int) Math.round((double) yCenter + alt);
        }
        if (horizonY < yCenter - HALF_SKY_HEIGHT) {
            horizonY = yCenter - HALF_SKY_HEIGHT;
        }
        if (horizonY < yCenter + HALF_SKY_HEIGHT) {
            int hour = time.get(Calendar.HOUR_OF_DAY);
            int i = hourColors[hour][1][0] + 50;
            Color col = new Color(i, i, i);
            bufferedGraphics.setColor(col);
            bufferedGraphics.fillRect(xCenter - HALF_SKY_WIDTH, horizonY, SKY_WIDTH, (yCenter + HALF_SKY_HEIGHT) - horizonY);
        }
        if (landscapeImage != null) {
            int landscapeY = horizonY - maxPixels;
            int landscapeHeight = (int) ((maxAltitude - minAltitude) * altitudePixels);
            if (landscapeY + landscapeHeight > SKY_HEIGHT) {
                landscapeHeight = SKY_HEIGHT - landscapeY;
            }
            double pixelsPerAzimut = ((double) FULL_WIDTH / (double) 360);
            int landscapeWidth = (int) (maxAzimut * pixelsPerAzimut);
            int landscapeX = -(azimut * 4)/* - (int) (minAzimut * pixelsPerAzimut)*/;
            bufferedGraphics.drawImage(landscapeImage, landscapeX, landscapeY, landscapeWidth, landscapeHeight, this);
        }
        if (model3d != null) {
            model3d.paint(bufferedGraphics, horizonY);
        }
    }

    public void paintBackground(GregorianCalendar time) {
        int xStart = xCenter - HALF_SKY_WIDTH;
        Rectangle rectangle = new Rectangle(xStart, yCenter - HALF_SKY_HEIGHT, SKY_WIDTH, SKY_HEIGHT);
        hour = time.get(Calendar.HOUR_OF_DAY);
        Color startColor = new Color(hourColors[hour][0][0], hourColors[hour][0][1], hourColors[hour][0][2]);
        Color endColor = new Color(hourColors[hour][1][0], hourColors[hour][1][1], hourColors[hour][1][2]);
        float currentRed = startColor.getRed();
        float currentGreen = startColor.getGreen();
        float currentBlue = startColor.getBlue();
        float redDelta = rectangle.height / (endColor.getRed() - currentRed);
        float greenDelta = rectangle.height / (endColor.getGreen() - currentGreen);
        float blueDelta = rectangle.height / (endColor.getBlue() - currentBlue);

        int yDelta = 0;
        if (Math.abs(redDelta) > yDelta) {
            yDelta = (int) Math.abs(redDelta);
        }
        if (Math.abs(greenDelta) > yDelta) {
            yDelta = (int) Math.abs(greenDelta);
        }
        if (Math.abs(blueDelta) > yDelta) {
            yDelta = (int) Math.abs(blueDelta);
        }

        int hY = horizonY;
        bufferedGraphics.setClip(xStart, yCenter - HALF_SKY_HEIGHT, SKY_WIDTH, SKY_HEIGHT);
        //        setBackground(SystemColor.control);
        //        bufferedGraphics.fillRect(0, SKY_HEIGHT, getSize().width, getSize().height);
        for (int y = hY; y > rectangle.x - yDelta; y -= yDelta) {
            Color currentColor = new Color((int) currentRed, (int) currentGreen, (int) currentBlue);
            bufferedGraphics.setColor(currentColor);
            bufferedGraphics.fillRect(xStart, y, rectangle.width, yDelta);
            if (currentRed > endColor.getRed()) {
                currentRed += redDelta;
                if (currentRed < 0) {
                    currentRed = 0;
                }
            }
            if (currentGreen > endColor.getGreen()) {
                currentGreen += greenDelta;
                if (currentGreen < 0) {
                    currentGreen = 0;
                }
            }
            if (currentBlue > endColor.getBlue()) {
                currentBlue += blueDelta;
                if (currentBlue < 0) {
                    currentBlue = 0;
                }
            }
        }
    }

    public void start() {
        //        setSize(getSize().width, getSize().height);
        super.start();
    }

    public void setBounds(int x, int y, int width, int height) {
        SKY_WIDTH = width;
        xCenter = SKY_WIDTH / 2;
        HALF_SKY_WIDTH = SKY_WIDTH / 2;
        SKY_HEIGHT = Math.round((float) SKY_WIDTH * 0.675F);
        super.setBounds(x, y, SKY_WIDTH, SKY_HEIGHT);
        yCenter = SKY_HEIGHT / 2;
        HALF_SKY_HEIGHT = SKY_HEIGHT / 2;
        FULL_WIDTH = SKY_WIDTH * 4;
        altitudePixels = (double) (SKY_HEIGHT / 180) * 2.225;
    }

    public void setModel3D(Model3d someModel3D) {
        model3d = someModel3D;
    }

    public boolean isVisible(int xDelta, int yDelta) {
        return Math.abs(xDelta) < HALF_SKY_WIDTH && Math.abs(yDelta) < HALF_SKY_HEIGHT;
    }

    public int getXCenter() {
        return xCenter;
    }

    public int getYCenter() {
        return yCenter;
    }

    int[][][] hourColors = new int[][][]{
                        {{20, 20, 50}, {0, 0, 0}}, // 0
                        {{20, 20, 50}, {0, 0, 0}}, // 1
                        {{20, 20, 50}, {0, 0, 0}}, // 2
                        {{20, 20, 50}, {0, 0, 10}}, // 3
                        {{70, 70, 100}, {0, 0, 20}}, // 4
                        {{120, 120, 185}, {0, 0, 30}}, // 5
                        {{130, 130, 195}, {0, 0, 40}}, // 6
                        {{150, 150, 220}, {50, 50, 150}}, // 7
                        {{235, 245, 255}, {150, 150, 200}}, // 8
                        {{235, 245, 255}, {150, 150, 240}}, // 9
                        {{235, 245, 255}, {150, 150, 240}}, // 10
                        {{235, 245, 255}, {150, 150, 240}}, // 11
                        {{235, 245, 255}, {150, 150, 240}}, // 12
                        {{235, 245, 255}, {150, 150, 240}}, // 13
                        {{235, 245, 255}, {150, 150, 240}}, // 14
                        {{235, 245, 255}, {150, 150, 240}}, // 15
                        {{235, 245, 255}, {150, 150, 240}}, // 16
                        {{220, 220, 235}, {140, 140, 200}}, // 17
                        {{200, 200, 225}, {120, 120, 160}}, // 18
                        {{220, 180, 200}, {20, 20, 110}}, // 19
                        {{210, 170, 255}, {10, 10, 100}}, // 20
                        {{90, 125, 220}, {0, 0, 90}}, // 21
                        {{50, 50, 100}, {0, 0, 30}}, // 22
                        {{20, 20, 50}, {0, 0, 0}}, // 23
                };

    public void paintPlanet(int xDelta, int yDelta, int halfMagnitude, int fullMagnitude) {
        //        int radius = fullMagnitude;
        int radius = 7;
        bufferedGraphics.setColor(Color.white);
        int x = (int) ((double) xCenter - xDelta);
        int y = (int) ((double) yCenter - yDelta);
        bufferedGraphics.fillOval(x, y, radius, radius);
    }

    public void paintSun(int xDelta, int yDelta, int halfMagnitude, int fullMagnitude) {
        //        int radius = fullMagnitude;
        int radius = 20;
        int x = (int) ((double) xCenter - xDelta);
        int y = (int) ((double) yCenter - yDelta);
        for (int i = 0; i < radius; i++) {
            Color color = new Color(255, 255, 100 + i * 2);
            bufferedGraphics.setColor(color);
            bufferedGraphics.fillOval(x + i / 2, y + i / 2, radius - i, radius - i);
        }
    }

    public void paintMoon(int xDelta, int yDelta, int halfMagnitude, int fullMagnitude) {
        //        int radius = fullMagnitude;
        int radius = 12;
        bufferedGraphics.setColor(Color.white);
        int x = (int) ((double) xCenter - xDelta);
        int y = (int) ((double) yCenter - yDelta);
        bufferedGraphics.fillOval(x, y, radius, radius);
        Color backgroundColor = new Color(hourColors[hour][1][0], hourColors[hour][1][1], hourColors[hour][1][2]);
        bufferedGraphics.setColor(backgroundColor);
        bufferedGraphics.fillOval(x + radius / 3, y, radius - radius / 4, radius);
    }

    public void paintWeatherBackground(Image weatherImage, int azimut) {
        if (weatherImage != null) {
            //            int imageHeight = weatherImage.getHeight(this);
            //            int startY = horizonY - imageHeight > 0 ? 0 : horizonY - imageHeight;
            bufferedGraphics.drawImage(weatherImage, -azimut * 4, 0, FULL_WIDTH, horizonY, this);
            /*
                        final int startY = 0;
                        final int startX1 = -azimut * 4;
                        final int startX2 = startX1 + SKY_WIDTH;
                        final int startX3 = startX2 + SKY_WIDTH;
                        final int startX4 = startX3 + SKY_WIDTH;
                        if (startX1 > -SKY_WIDTH) {
                            bufferedGraphics.drawImage(weatherImage, startX1, startY, SKY_WIDTH, horizonY, this);
                        }
                        if (startX2 > -SKY_WIDTH) {
                            bufferedGraphics.drawImage(weatherImage, startX2, startY, SKY_WIDTH, horizonY, this);
                        }
                        if (startX3 > -SKY_WIDTH) {
                            bufferedGraphics.drawImage(weatherImage, startX3, startY, SKY_WIDTH, horizonY, this);
                        }
                        if (startX4 > -SKY_WIDTH) {
                            bufferedGraphics.drawImage(weatherImage, startX4, startY, SKY_WIDTH, horizonY, this);
                        }
            */
        }
    }

    public void setWeatherRunnable(Precipitations weatherRunnable) {
        if (this.weatherRunnable != null) {
            this.weatherRunnable.stop();
        }
        this.weatherRunnable = weatherRunnable;
        if (this.weatherRunnable != null) {
            this.weatherRunnable.init();
            this.weatherRunnable.start();
        }
    }

    public Precipitations getWeatherRunnable() {
        return weatherRunnable;
    }

    public void paintWeatherRunnable() {
        if (weatherRunnable != null) {
            weatherRunnable.paint(bufferedGraphics);
        }
    }

    public void setLandscape(Image landscapeImage, int minAltitude, int maxAltitude, int minAzimut, int maxAzimut) {
        this.landscapeImage = landscapeImage;
        this.minAltitude = minAltitude;
        this.maxAltitude = maxAltitude;
        this.maxAzimut = maxAzimut;
        maxPixels = (int) (maxAltitude * altitudePixels);
    }

    public int getHorizonY() {
        return horizonY;
    }
}
