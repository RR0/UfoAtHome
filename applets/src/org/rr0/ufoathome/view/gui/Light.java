package org.rr0.ufoathome.view.gui;

import java.applet.Applet;
import java.awt.*;
import java.awt.image.MemoryImageSource;
import java.awt.image.PixelGrabber;
import java.net.MalformedURLException;
import java.net.URL;

public class Light extends Applet implements Runnable {
    public void init() {
        _mth4();
        showStatus("Please wait ...");
        _fld6b = getFontMetrics(_fld4).stringWidth(_fld7b);
        _fld5 = size().width;
        _fld6 = size().height;
        _mth5();
        _fld8 = new int[_fld5 * _fld6];
        _fld9 = new MemoryImageSource(_fld5, _fld6, _fld8, 0, _fld5);
        _fld2c = createImage(_fld5, _fld6);
        _fld3c = _fld2c.getGraphics();
        _mth9b();
        _mth2c();
        if (!_fld0c && !_fld1c)
            _fld5b = 0;
        else if (_fld0c && !_fld1c)
            _fld5b = 1;
        else if (!_fld0c && _fld1c)
            _fld5b = 2;
        else
            _fld5b = 3;
        _mth2b();
        _mth8b();
        if (!loadImage())
//            do
            showStatus("Error loading image ");
//            while(true);
        _mth6();
        _mth3b();
        if (_fld7d == 0xff000000)
            _fld3 = 1;
    }

    public void start() {
        (_fld0 = new Thread(this)).start();
    }

    public void stop() {
        if (_fld0 != null) {
            _fld0.stop();
            _fld0 = null;
        }
    }

    public void run() {
        showStatus(_fld0e);
        System.gc();
        Graphics g = getGraphics();
        _fld2b = System.currentTimeMillis();
        while (_fld0 != null) {
            if (_fld3 == 1)
                _mth4b();
            _mth3(g);
            _mth0();
            if (_fld1b++ > 10) {
                System.gc();
                _fld1b = 0;
            }
        }

    }

    synchronized void _mth0() {
        Thread.yield();
        getToolkit().sync();
        long l = 10L - (System.currentTimeMillis() - _fld2b);
        if (l > 0L)
            try {
                Thread.sleep(l);
            } catch (InterruptedException _ex) {
            }
        else
            try {
                Thread.sleep(1L);
            } catch (InterruptedException _ex) {
            }
        _fld2b = System.currentTimeMillis();
    }

    public void update(Graphics g) {
    }

    void _mth3(Graphics g) {
        int i = _fld5 >> 1;
        int j = _fld6 >> 1;
        if (_fld3 == 0) {
            g.drawString("Error ...", 10, 10);
            return;
        }
        if (_fld0b != null)
            if (_fld5b == 0)
                _fld3c.drawImage(_fld0b, 0, 0, this);
            else if (_fld5b == 1) {
                _fld3c.drawImage(_fld0b, 0, 0, this);
                _mth1c(_fld3c);
            } else if (_fld5b == 2) {
                _fld3c.drawImage(_fld0b, 0, 0, this);
                _fld3c.drawImage(_fld4c, _fld5c, _fld6c, this);
            } else {
                _fld3c.drawImage(_fld0b, 0, 0, this);
                _mth1c(_fld3c);
                _fld3c.drawImage(_fld4c, _fld5c, _fld6c, this);
            }
        if (_fld0f && !_fld8f) {
            _fld3c.setColor(Color.white);
            _fld3c.drawLine(i - 64, j - 8, i + 64, j - 8);
            _fld3c.drawLine(i - 64, j + 8, i + 64, j + 8);
            _fld3c.drawLine(i - 64, j - 8, i - 64, j + 8);
            _fld3c.drawLine(i + 64, j - 8, i + 64, j + 8);
            _fld3c.setColor(Color.blue);
            _fld3c.fillRect(i - 63, j - 7, 127, 15);
            _fld3c.setFont(_fld4);
            _fld3c.setColor(Color.yellow);
            _fld3c.drawString(_fld7b, i - (_fld6b >> 1), j + 5);
        }
        g.drawImage(_fld2c, 0, 0, this);
    }

    public final boolean mouseEnter(Event event, int i, int j) {
        showStatus(_fld6f);
        _fld0f = true;
        return true;
    }

    public final boolean mouseExit(Event event, int i, int j) {
        _fld0f = false;
        showStatus("");
        return true;
    }

    public final boolean mouseMove(Event event, int i, int j) {
        _fld8d = i;
        _fld9d = j;
        _fld0f = true;
        return true;
    }

    void _mth4() {
        _fld5d = 1;
    }

    void _mth5() {
        _fld6d = 1;
        for (int i = 0; i < 11; i++)
            if (_fld4b.charAt(i) == _fld3b.charAt(i) || _fld5d == 0)
                do
                    showStatus(_fld8b);
                while (true);

        _fld8f = false;
    }

    void _mth6() {
        if (_fld5d == 0 || _fld6d == 0)
            do
                showStatus(_fld8b);
            while (true);
        for (int i = 0; i < 17; i++)
            if (_fld4b.charAt(i) == _fld7b.charAt(i))
                do
                    showStatus(_fld8b);
                while (true);

        _fld7d = 0xff000000;
        if (_fld3b.charAt(1) != 'p' || _fld3b.charAt(7) != 'b' || _fld3b.charAt(21) != 'c' || _fld3b.charAt(17) != 'c' || _fld3b.charAt(12) != 'r' || _fld3b.charAt(11) != 'a')
            do
                showStatus(_fld8b);
            while (true);
    }

    int[] _mth7(int ai[], int i, int j, int ai1[], int k, int l) {
        int i1 = 0;
        double d = (double) k / (double) i;
        double d1 = (double) l / (double) j;
        for (int j1 = 0; j1 < j; j1++) {
            int k1 = (int) ((double) j1 * d1);
            for (int l1 = 0; l1 < i; l1++) {
                int i2 = (int) ((double) l1 * d);
                ai[i1++] = ai1[k1 * k + i2];
            }

        }

        return ai;
    }

    boolean loadImage() {
        Image image = null;
        image = _mth9(getParameter("image"));
        if (image == null) {
            showStatus("Error loading image ");
            return false;
        }
        int i = image.getWidth(this);
        int j = image.getHeight(this);
        _fld7 = new int[_fld5 * _fld6];
        if (i != _fld5 || j != _fld6) {
            int ai[] = new int[i * j];
            if (!_mth0b(image, ai, i, j))
                return false;
            _fld7 = _mth7(_fld7, _fld5, _fld6, ai, i, j);
        } else if (!_mth0b(image, _fld7, _fld5, _fld6))
            return false;
        image.flush();
        image = null;
        System.gc();
        return true;
    }

    Image _mth9(String s) {
        showStatus("Loading Image ...");
        MediaTracker mediatracker = new MediaTracker(this);
        URL url = null;
        Image image = null;
        try {
            url = new URL(getDocumentBase(), s);
        } catch (MalformedURLException _ex) {
        }
//        try
//        {
//            image = getImage(url);
//            mediatracker.addImage(image, 1);
//            mediatracker.waitForID(1);
//        }
//        catch(InterruptedException _ex)
//        {
//            image = null;
//        }
//        if(mediatracker.isErrorID(1))
        image = null;
        return image;
    }

    boolean _mth0b(Image image, int ai[], int i, int j) {
        PixelGrabber pixelgrabber = new PixelGrabber(image, 0, 0, i, j, ai, 0, i);
        try {
            if (!pixelgrabber.grabPixels()) {
                showStatus("Image error");
                return false;
            }
        } catch (InterruptedException _ex) {
            showStatus("Image error");
            return false;
        }
        if ((pixelgrabber.status() & 0x80) != 0) {
            showStatus("Image error");
            return false;
        } else {
            return true;
        }
    }

    Color _mth1b(String s, Color color) {
        String s1 = getParameter(s);
        Color color1;
        if (s1 != null && s1.length() == 6)
            try {
                color1 = new Color(Integer.parseInt(s1, 16));
            } catch (NumberFormatException _ex) {
                color1 = color;
            }
        else
            color1 = color;
        return color1;
    }

    void _mth2b() {
        String s = getParameter("diameter");
        if (s == null)
            s = "128";
        _fld1f = Integer.valueOf(s).intValue();
        _fld1f = _fld1f < 64 ? 64 : _fld1f > 256 ? 256 : _fld1f;
        s = getParameter("type");
        if (s == null)
            _fld8e = false;
        else if (s.equalsIgnoreCase("night"))
            _fld8e = true;
        else
            _fld8e = false;
        s = getParameter("interactive");
        if (s == null)
            _fld9e = true;
        else if (s.equalsIgnoreCase("YES"))
            _fld9e = true;
        else
            _fld9e = false;
        s = getParameter("speedx");
        if (s == null)
            s = "1";
        _fld6e = Integer.valueOf(s).intValue();
        _fld6e = _fld6e < 1 ? 1 : _fld6e > 4 ? 4 : _fld6e;
        s = getParameter("speedy");
        if (s == null)
            s = "2";
        _fld7e = Integer.valueOf(s).intValue();
        _fld7e = _fld7e < 1 ? 1 : _fld7e > 4 ? 4 : _fld7e;
        _fld6f = _fld3b;
        s = getParameter("regkey");
        if (s != null) {
            _fld3f = s;
            s = getParameter("reglink");
            if (s != null) {
                try {
                    _fld4f = new URL("http://" + s);
                } catch (MalformedURLException _ex) {
                    _fld4f = null;
                }
                s = getParameter("regtarget");
                if (s != null)
                    _fld5f = s;
            }
            s = getParameter("regstatusmsg");
            if (s != null)
                _fld6f = s;
        }
    }

    void _mth3b() {
        _fld2f = _fld1f >> 1;
        _fld1e = new int[_fld1f * _fld1f];
        int i = _fld5 >> 1;
        int j = _fld6 >> 1;
        _fld8d = lx = i;
        _fld9d = ly = j;
        _mth5b();
        int k = i - (i >> 3);
        int l = j - (j >> 3);
        for (int i1 = 0; i1 < 256; i1++) {
            _fld2e[i1] = (int) (Math.cos(0.024543692606170259D * (double) i1) * (double) k);
            _fld3e[i1] = (int) (Math.sin(0.024543692606170259D * (double) i1) * (double) l);
        }

    }

    void _mth4b() {
        _fld4e = (_fld4e + _fld6e) % 256;
        _fld5e = (_fld5e + _fld7e) % 256;
        if (_fld9e) {
            if (!_fld0f) {
                lx = (_fld5 >> 1) + _fld2e[_fld4e];
                ly = (_fld6 >> 1) + _fld3e[_fld5e];
            } else {
                lx = _fld8d;
                ly = _fld9d;
            }
        } else {
            lx = (_fld5 >> 1) + _fld2e[_fld4e];
            ly = (_fld6 >> 1) + _fld3e[_fld5e];
        }
        _mth6b(lx, ly);
        _fld0b = createImage(_fld9);
    }

    void _mth5b() {
        int i = _fld1f - 1;
        double d = 256 / _fld1f;
        for (int j = 0; j < _fld1f; j++) {
            for (int k = 0; k < _fld1f; k++) {
                double d1 = (_fld2f - k) * (_fld2f - k) + (_fld2f - j) * (_fld2f - j);
                if (Math.abs(d1) > 1.0D)
                    d1 = Math.sqrt(d1);
                int l = (int) (2.3999999999999999D * d1);
                if (l < 0)
                    l = 0;
                if (l > i)
                    l = i;
                int i1 = (int) ((double) (i - l) * d);
                _fld1e[j * _fld1f + k] = i1;
            }

        }

    }

    void _mth6b(int i, int j) {
        int k = _fld1f >> 1;
        if (_fld8e) {
            for (int l = 0; l < _fld5 * _fld6; l++)
                _fld8[l] = 0xff000000;

        } else {
            for (int i1 = 0; i1 < _fld5 * _fld6; i1++)
                _fld8[i1] = _fld7[i1];

        }
        _mth7b(_fld8, i - k, j - k, _fld5, _fld6, _fld1e, 0, 0, _fld1f - 1, _fld1f - 1, _fld1f, _fld1f);
    }

    void _mth7b(int ai[], int i, int j, int k, int l, int ai1[], int i1,
                int j1, int k1, int l1, int i2, int j2) {
        if (i >= _fld5 || j >= _fld6)
            return;
        if (i < 0) {
            i1 += -i;
            i = 0;
            if (i1 > k1)
                return;
        }
        if (j < 0) {
            j1 += -j;
            j = 0;
            if (j1 > l1)
                return;
        }
        if (i1 >= i2 || j1 >= j2)
            return;
        if (k1 < 0 || l1 < 0)
            return;
        if (i1 < 0)
            i1 = 0;
        if (j1 < 0)
            j1 = 0;
        if (k1 >= _fld5)
            k1 = i2 - 1;
        if (l1 >= _fld6)
            l1 = j2 - 1;
        int k2 = (l1 - j1) + 1;
        int l2 = (k1 - i1) + 1;
        if (i + l2 >= k)
            l2 = k - i;
        if (j + k2 >= l)
            k2 = l - j;
        if (_fld8e) {
            for (int i3 = 0; i3 < k2; i3++) {
                int k3 = (j + i3) * k + i;
                int i4 = (j1 + i3) * i2 + i1;
                for (int k4 = 0; k4 < l2; k4++) {
                    int i5 = k3 + k4;
                    int k5 = _fld7[i5];
                    int i6 = ai1[i4 + k4];
                    int k6 = (k5 >> 16 & 0xff) * i6 >> 8;
                    int i7 = (k5 >> 8 & 0xff) * i6 >> 8;
                    int k7 = (k5 & 0xff) * i6 >> 8;
                    ai[i5] = 0xff000000 | k6 << 16 | i7 << 8 | k7;
                }

            }

            return;
        }
        for (int j3 = 0; j3 < k2; j3++) {
            int l3 = (j + j3) * k + i;
            int j4 = (j1 + j3) * i2 + i1;
            for (int l4 = 0; l4 < l2; l4++) {
                int j5 = l3 + l4;
                int l5 = _fld7[j5];
                int j6 = ai1[j4 + l4];
                int l6 = (l5 >> 16 & 0xff) + j6;
                int j7 = (l5 >> 8 & 0xff) + j6;
                int l7 = (l5 & 0xff) + j6;
                if (l6 > 255)
                    l6 = 255;
                if (j7 > 255)
                    j7 = 255;
                if (l7 > 255)
                    l7 = 255;
                ai[j5] = 0xff000000 | l6 << 16 | j7 << 8 | l7;
            }

        }

    }

    void _mth8b() {
        String s = null;
        s = getDocumentBase().getHost();
        if (s.length() > 0 && _fld3f.length() > 9) {
            int i = _fld3f.length() - 9;
            int j = i + 9;
            _fld9f = new byte[i];
            _fld3f.getBytes(1, i + 1, _fld9f, 0);
            _fld0g = new byte[j];
            _fld3f.getBytes(0, j, _fld0g, 0);
            int k = i % 7;
            int l = i % 3;
            for (int i1 = 0; i1 < i; i1++) {
                byte byte0 = _fld9f[i1];
                int k1 = byte0 + k;
                if (byte0 >= 48 && byte0 <= 57)
                    _fld9f[i1] = k1 > 57 ? (byte) (k1 - 10) : (byte) k1;
                else if (byte0 >= 65 && byte0 <= 90)
                    _fld9f[i1] = k1 > 90 ? (byte) (k1 - 26) : (byte) k1;
                else if (byte0 >= 97 && byte0 <= 122)
                    _fld9f[i1] = k1 > 122 ? (byte) (k1 - 26) : (byte) k1;
                else if (byte0 == 42)
                    _fld9f[i1] = 45;
                else if (byte0 == 45)
                    _fld9f[i1] = 46;
                k = (k + l) % 7;
            }

            k = i % 7;
            l = i % 3;
            for (int j1 = 0; j1 < i; j1++) {
                byte byte1 = _fld9f[j1];
                int l1 = byte1 - k;
                if (byte1 >= 48 && byte1 <= 57)
                    _fld0g[j1 + 1] = l1 < 48 ? (byte) (l1 + 10) : (byte) l1;
                else if (byte1 >= 65 && byte1 <= 90)
                    _fld0g[j1 + 1] = l1 < 65 ? (byte) (l1 + 26) : (byte) l1;
                else if (byte1 >= 97 && byte1 <= 122)
                    _fld0g[j1 + 1] = l1 < 97 ? (byte) (l1 + 26) : (byte) l1;
                else if (byte1 == 45)
                    _fld0g[j1 + 1] = 42;
                else if (byte1 == 46)
                    _fld0g[j1 + 1] = 45;
                k = (k + l) % 7;
            }

            byte abyte0[] = new byte[i];
            if (i > 4) {
                for (int i2 = 0; i2 < i - 4; i2++)
                    abyte0[i2] = _fld9f[i2 + 4];

            }
            if (_fld0g[0] == _fld0g[i >> 1] && _fld0g[1 + i] == _fld0g[1] && _fld0g[1 + i + 1] == _fld0g[i >> 1] && _fld0g[1 + i + 2] == (byte) (97 + k) && _fld0g[1 + i + 3] == 45 && _fld0g[1 + i + 4] == (byte) (122 - l) && _fld0g[1 + i + 5] == (byte) (110 + k) && _fld0g[1 + i + 6] == _fld0g[1] && _fld0g[1 + i + 7] == _fld0g[i] && (s.equalsIgnoreCase(new String(_fld9f, 0)) || s.equalsIgnoreCase(new String(abyte0, 0))))
                _fld8f = true;
        }
        try {
            _fld7f = new URL("http://" + _fld7b);
            return;
        } catch (MalformedURLException _ex) {
            _fld7f = null;
        }
    }

    public final boolean mouseDown(Event event, int i, int j) {
        if (!_fld8f)
            getAppletContext().showDocument(_fld7f, "_blank");
        else if (_fld4f != null)
            if (_fld5f != null)
                getAppletContext().showDocument(_fld4f, _fld5f);
            else
                getAppletContext().showDocument(_fld4f);
        return true;
    }

    void _mth9b() {
        int i = 0;
        String s;
        do {
            i++;
            s = getParameter("overtext" + i);
        } while (s != null);
        if (--i > 0) {
            _fld0c = true;
            _fld0d = i;
            _fld1g = new String[_fld0d];
            _fld2g = new Color[_fld0d];
            _fld3g = new Color[_fld0d];
            _fld4g = new Font[_fld0d];
            _fld5g = new FontMetrics[_fld0d];
            _fld6g = new String[_fld0d];
            _fld7g = new int[_fld0d];
            _fld8g = new int[_fld0d];
            for (int j = 0; j < _fld0d; j++) {
                _fld1g[j] = getParameter("overtext" + String.valueOf(j + 1));
                _fld2g[j] = _mth1b("overtextcol" + String.valueOf(j + 1), new Color(0xffffff));
                _fld3g[j] = _mth1b("overtextcols" + String.valueOf(j + 1), new Color(0));
                String s1 = getParameter("overtexty" + String.valueOf(j + 1));
                if (s1 == null)
                    _fld8g[j] = 10;
                else
                    _fld8g[j] = Integer.parseInt(s1);
                String s2 = getParameter("overTextFont" + String.valueOf(j + 1));
                if (s2 == null)
                    s2 = "Helvetica";
                String s3 = getParameter("overTextStyle" + String.valueOf(j + 1));
                byte byte0;
                if (s3 == null)
                    byte0 = 0;
                else if (s3.equalsIgnoreCase("PLAIN"))
                    byte0 = 0;
                else if (s3.equalsIgnoreCase("BOLD"))
                    byte0 = 1;
                else if (s3.equalsIgnoreCase("ITALIC"))
                    byte0 = 2;
                else if (s3.equalsIgnoreCase("BOLD ITALIC"))
                    byte0 = 3;
                else
                    byte0 = 0;
                String s4 = getParameter("overTextSize" + String.valueOf(j + 1));
                int k;
                if (s4 == null)
                    k = 24;
                else
                    k = Integer.parseInt(s4);
                _fld4g[j] = new Font(s2, byte0, k);
                _fld5g[j] = _fld3c.getFontMetrics(_fld4g[j]);
                _fld6g[j] = getParameter("overTextType" + String.valueOf(j + 1));
                if (_fld6g[j] == null)
                    _fld6g[j] = "scrollleft";
                s1 = getParameter("overtextspeed" + String.valueOf(j + 1));
                if (s1 == null) {
                    _fld7g[j] = 2;
                } else {
                    _fld7g[j] = Integer.valueOf(s1).intValue();
                    if (_fld7g[j] < 1 || _fld7g[j] > 4)
                        _fld7g[j] = 2;
                }
            }

            _mth0c();
        }
    }

    void _mth0c() {
        _fld3d = _fld5g[_fld9c].stringWidth(_fld1g[_fld9c]);
        _fld4d = _fld5g[_fld9c].getHeight();
        if (_fld6g[_fld9c].equalsIgnoreCase("scrolldown")) {
            _fld1d = _fld5 - _fld3d >> 1;
            _fld2d = 0;
            return;
        }
        if (_fld6g[_fld9c].equalsIgnoreCase("scrollup")) {
            _fld1d = _fld5 - _fld3d >> 1;
            _fld2d = _fld6 + _fld4d;
            return;
        }
        if (_fld6g[_fld9c].equalsIgnoreCase("scrollright")) {
            _fld1d = -_fld3d;
            _fld2d = _fld8g[_fld9c] + (_fld4d >> 1) + (_fld4d >> 3);
            return;
        } else {
            _fld1d = _fld5;
            _fld2d = _fld8g[_fld9c] + (_fld4d >> 1) + (_fld4d >> 3);
            return;
        }
    }

    void _mth1c(Graphics g) {
        g.setFont(_fld4g[_fld9c]);
        g.setColor(_fld3g[_fld9c]);
        g.drawString(_fld1g[_fld9c], _fld1d + 1, _fld2d + 1);
        g.setColor(_fld2g[_fld9c]);
        g.drawString(_fld1g[_fld9c], _fld1d, _fld2d);
        if (_fld6g[_fld9c].equalsIgnoreCase("scrolldown"))
            _fld2d += _fld7g[_fld9c];
        else if (_fld6g[_fld9c].equalsIgnoreCase("scrollup"))
            _fld2d -= _fld7g[_fld9c];
        else if (_fld6g[_fld9c].equalsIgnoreCase("scrollright"))
            _fld1d += _fld7g[_fld9c];
        else
            _fld1d -= _fld7g[_fld9c];
        if (_fld2d > _fld6 + _fld4d || _fld2d < -_fld4d || _fld1d > _fld5 || _fld1d < -_fld3d) {
            _fld9c++;
            if (_fld9c >= _fld0d)
                _fld9c = 0;
            _mth0c();
        }
    }

    void _mth2c() {
        String s = getParameter("OverImage");
        if (s != null)
            _fld4c = _mth9(s);
        if (_fld4c != null) {
            _fld1c = true;
            _fld7c = _fld4c.getWidth(this);
            _fld8c = _fld4c.getHeight(this);
            String s1 = getParameter("OverImageX");
            if (s1 == null)
                _fld5c = (_fld5 >> 1) - (_fld7c >> 1);
            else
                _fld5c = Integer.valueOf(s1).intValue();
            s1 = getParameter("OverImageY");
            if (s1 == null) {
                _fld6c = (_fld6 >> 1) - (_fld8c >> 1);
                return;
            }
            _fld6c = Integer.valueOf(s1).intValue();
        }
    }

    public Light() {
        _fld4 = new Font("Helvetica", 1, 12);
        _fld3b = "Applet by Dario Sciacca";
        _fld4b = "dario@dseffects.com";
        _fld7b = "www.dseffects.com";
        _fld8b = "Don't remove Dario Sciacca's credits line";
        _fld9b = _fld3b + " (" + _fld7b + ")";
        _fld0c = false;
        _fld1c = false;
        _fld0e = "Light started";
        _fld2e = new int[256];
        _fld3e = new int[256];
        _fld0f = false;
        _fld3f = "";
        _fld5f = "_blank";
        _fld6f = "Applet by Dario Sciacca";
        _fld8f = false;
    }

    Thread _fld0;
    int _fld3;
    Font _fld4;
    int _fld5;
    int _fld6;
    int _fld7[];
    int _fld8[];
    MemoryImageSource _fld9;
    Image _fld0b;
    int _fld1b;
    long _fld2b;
    String _fld3b;
    String _fld4b;
    int _fld5b;
    int _fld6b;
    String _fld7b;
    String _fld8b;
    String _fld9b;
    boolean _fld0c;
    boolean _fld1c;
    Image _fld2c;
    Graphics _fld3c;
    Image _fld4c;
    int _fld5c;
    int _fld6c;
    int _fld7c;
    int _fld8c;
    int _fld9c;
    int _fld0d;
    int _fld1d;
    int _fld2d;
    int _fld3d;
    int _fld4d;
    int _fld5d;
    int _fld6d;
    int _fld7d;
    int _fld8d;
    int _fld9d;
    String _fld0e;
    int _fld1e[];
    int lx;
    int ly;
    int _fld2e[];
    int _fld3e[];
    int _fld4e;
    int _fld5e;
    int _fld6e;
    int _fld7e;
    boolean _fld8e;
    boolean _fld9e;
    boolean _fld0f;
    int _fld1f;
    int _fld2f;
    String _fld3f;
    URL _fld4f;
    String _fld5f;
    String _fld6f;
    URL _fld7f;
    boolean _fld8f;
    byte _fld9f[];
    byte _fld0g[];
    String _fld1g[];
    Color _fld2g[];
    Color _fld3g[];
    Font _fld4g[];
    FontMetrics _fld5g[];
    String _fld6g[];
    int _fld7g[];
    int _fld8g[];
}
