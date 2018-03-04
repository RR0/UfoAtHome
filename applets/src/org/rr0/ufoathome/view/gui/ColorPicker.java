package org.rr0.ufoathome.view.gui;

import java.awt.*;

/**
 * 
 *
 */
public class ColorPicker extends Canvas {
    private static final int cx = 0;
    private static final int cy = 0;
    private static final int cw = 1;
    private static final int ch = 1;
    private int xsep, ysep;
    private int px, py, sy;
    private int satx, saty, satw, sath;
    private int mainx, mainy, mainw, mainh;
    private double hValue, sValue, bValue;
//    private int pox[], poy[];
    private Image bufferedImage;		// Offscreen image
    private Graphics bufferedGraphics;	// Offscreen graph port
    private java.awt.Color color;
    private Palette palette;

    public ColorPicker(Palette palette) {
        this.palette = palette;
//        pox = new int[4];
//        poy = new int[4];
    }

    public void paint(Graphics g) {
        if (bufferedImage == null) {
            Dimension size = getSize();
            bufferedImage = createImage(size.width, size.height);
            bufferedGraphics = bufferedImage.getGraphics();

            xsep = size.width - 5;
            ysep = size.height;
            hValue = 0;
            sValue = 0;
            bValue = 1;

            satx = xsep * cw + cx * 2;
            satw = cx * 2;
            saty = cy;
            sath = ysep * ch;
            sy = saty + sath;
            mainx = px = cx;
            mainy = py = cy;
            mainw = xsep * cw;
            mainh = ysep * ch;
        }

        int xPos, yPos;
        int ix, iy;
        int col;
        float h, s, b;

        for (xPos = 0; xPos < xsep; xPos++) {
            for (yPos = 0; yPos < ysep; yPos++) {
                ix = xPos * cw + cx;
                iy = yPos * ch + cy;
                h = (float) ((double) xPos / (double) xsep);
                s = (float) ((double) yPos / (double) ysep);
                b = (float) bValue;
                col = Color.HSBtoRGB(h, s, b);
                bufferedGraphics.setColor(new java.awt.Color(col));
                bufferedGraphics.fillRect(ix, iy, cw, ch);
            }
        }
        g.drawImage(bufferedImage, 0, 0, this);
        paintAns(g);

//        g.setColor(Color.lightGray);
//        g.draw3DRect(satx - 1, saty - 1, satw + 1, sath + 1, true);
//        g.draw3DRect(mainx - 1, mainy - 1, mainw + 1, mainh + 1, true);
    }

    /**
     * Returns the preferred size of this container.
     *
     * @return an instance of <code>Dimension</code> that represents
     *         the preferred size of this container.
     * @see #getMinimumSize
     * @see java.awt.LayoutManager#preferredLayoutSize(java.awt.Container)
     * @see java.awt.Component#getPreferredSize
     */
    public Dimension getPreferredSize() {
        return new Dimension(100, 90);
//        return new Dimension(getParent().getParent().getBounds().width, 90);
    }

    public void paintAns(Graphics g) {
        float h, s, b;
        int col;
        int ix, iy, j;

        for (j = 0; j < ysep; j++) {
            ix = xsep * cw + cx + cx;
            iy = j * ch + cy;
            h = (float) hValue;
            s = (float) sValue;
            b = (float) ((double) j / (double) ysep);
            col = Color.HSBtoRGB(h, s, b);
            g.setColor(new java.awt.Color(col));
            g.fillRect(ix, iy, cx * 2, ch);
        }

        ix = (int) (hValue * (double) cw * (double) xsep) + cx;
        iy = (int) (sValue * (double) ch * (double) ysep) + cy;
        g.setColor(Color.yellow);
        g.drawRect(ix - 1, iy - 1, 2, 2);
        g.setColor(Color.blue);
        g.drawRect(ix - 2, iy - 2, 4, 4);

//        pox[0] = pox[3] = xsep * cw + cx * 3;
//        poy[0] = poy[3] = (int) (bValue * (double) ysep * (double) ch) + cy;
//        pox[1] = pox[2] = pox[0] + 4;
//        poy[1] = poy[0] + 4;
//        poy[2] = poy[0] - 4;
//        g.setColor(Color.yellow);
//        g.fillPolygon(pox, poy, 3);
//        g.setColor(Color.blue);
//        g.drawPolygon(pox, poy, 4);
        paintValue(g);
    }

    public Color getColor() {
        return color;
    }

    public void paintValue(Graphics g) {
        float h, s, b;
        int col;

        h = (float) hValue;
        s = (float) sValue;
        b = (float) bValue;
        col = Color.HSBtoRGB(h, s, b);
        color = new java.awt.Color(col);

//        int wk = col / 256 / 256 / 256;
//        col = col - wk;
//        red = col / 256 / 256;
//        green = (col - red * 256 * 256) / 256;
//        blue = col - red * 256 * 256 - green * 256;
//
//        wks = Integer.toString(255 + red, 16);
//        if (wks.length() == 1) wks = "0" + wks;
//        outs = wks;
//        wks = Integer.toString(255 + green, 16);
//        if (wks.length() == 1) wks = "0" + wks;
//        outs = outs + wks;
//        wks = Integer.toString(255 + blue, 16);
//        if (wks.length() == 1) wks = "0" + wks;
//        outs = outs + wks;

//        g.clearRect(0, mainy + mainh + cy * 3, size().width, 35);
//        g.setColor(Color.black);
//        g.drawString("Color value = " + outs.toUpperCase(), mainx + 5, mainy + mainh + cy * 3 + 25);
    }

    public boolean mouseUp(java.awt.Event evt, int jx, int jy) {
        int dt = 1;

        if ((jx >= satx - dt) && (jx <= satx + satw + dt) && (jy >= saty - dt) && (jy <= saty + sath + dt)) {
            setHue((double) (px - mainx) / (double) mainw);
            setSaturation((double) (py - mainy) / (double) mainh);
            setBrightness((double) (jy - saty) / (double) sath);
            repaint();
            sy = jy;
        }
        if ((jx >= mainx - dt) && (jx <= mainx + mainw + dt) && (jy >= mainy - dt) && (jy <= mainy + mainh + dt)) {
            repaint(px - 4, py - 4, 8, 8);
            px = jx;
            py = jy;
            setHue((double) (jx - mainx) / (double) mainw);
            setSaturation((double) (jy - mainy) / (double) mainh);
            paintAns(getGraphics());
        }
        palette.fireColorSelected();
        palette.updateCursors();
        return true;
    }

    public void setBrightness(double brigtness) {
        if (brigtness < 0) {
            bValue = 0;
        } else if (brigtness > 1) {
            bValue = 1;
        } else {
            bValue = brigtness;
        }
    }

    public double getHue() {
        return hValue;
    }

    public double getSaturation() {
        return sValue;
    }

    public double getBrightness() {
        return bValue;
    }

    public void setSaturation(double jy) {
        if (jy < 0) {
            sValue = 0;
        } else if (sValue > 0.995) {
            sValue = 0.995;
        } else {
            sValue = jy;
        }
    }

    public void setHue(double jx) {
        if (jx < 0) {
            hValue = 0;
        } else if (jx > 0.999) {
            hValue = 0.999;
        } else {
            hValue = jx;
        }
    }

    public boolean mouseDrag(java.awt.Event evt, int jx, int jy) {
        int dt = 1;

        if ((jx >= satx - dt) && (jx <= satx + satw + dt) && (jy >= saty - dt) && (jy <= saty + sath + dt)) {
            bValue = (double) (jy - saty) / (double) sath;
            hValue = (double) (px - mainx) / (double) mainw;
            sValue = (double) (py - mainy) / (double) mainh;
        } else {
            if ((jx >= mainx - dt) && (jx <= mainx + mainw + dt) && (jy >= mainy - dt) && (jy <= mainy + mainh + dt)) {
                bValue = (double) (sy - saty) / (double) sath;
                hValue = (double) (jx - mainx) / (double) mainw;
                sValue = (double) (jy - mainy) / (double) mainh;
            } else {
                bValue = (double) (sy - saty) / (double) sath;
                hValue = (double) (px - mainx) / (double) mainw;
                sValue = (double) (py - mainy) / (double) mainh;
            }
        }
        setHue(hValue);
        setSaturation(sValue);
        setBrightness(bValue);
        paintValue(getGraphics());
        palette.fireColorSelected();
        palette.updateCursors();
        return true;
    }

    public void update(Graphics g) {
        paint(g);
    }
}
