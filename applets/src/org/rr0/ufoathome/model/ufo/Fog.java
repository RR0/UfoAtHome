package org.rr0.ufoathome.model.ufo;

import java.applet.Applet;
import java.applet.AudioClip;
import java.awt.*;
import java.awt.image.MemoryImageSource;
import java.awt.image.PixelGrabber;

public class Fog extends EffectBase {

    public Fog() {
        _fld$756 = 0;
        _fld$757 = 0;
        running = false;
        _fld$727 = 255;
        _fld$726 = 255;
        _fld$725 = 255;
        _fld$1017 = 3;
        _fld$1027 = 37512;
        _fld$734 = 0;
        _fld$557 = true;
        _fld$623 = 0.0D;
    }

    private void _mth$43(double d, int i, int j) {
        int k = (int) (d * 100D);
        int j12 = _fld$727 << 16 | _fld$725;
        int k12 = _fld$726 << 8;
        int k11 = (int) (((double) j * (100D - (double) _fld$874)) / 100D);
        if (k11 == 0)
            k11 = 1;
        int l11 = (int) d % 2;
        int l;
        if (l11 == 0)
            l = (int) ((d % 1.0D) * 255D);
        else
            l = (int) ((1.0D - d % 1.0D) * 255D);
        for (int i1 = 0; i1 < j; i1++) {
            for (int k1 = 0; k1 < i; k1++)
                _fld$427[k1 + i * i1] = _fld$475[k1 + i * i1];

        }

        _fld$1027 = 37512;
        int i4 = 7293;
        int j4 = 417;
        double d2 = _fld$755;
        d2 = (d2 / 180D) * 3.1415926535897931D;
        double d3 = 0.050000000000000003D;
        for (int l8 = 0; l8 < _fld$752; l8++) {
            i4 = _mth$341(i4);
            int k4 = i4;
            i4 = _mth$341(i4);
            int l4 = (i4 * (100 - _fld$874)) / 100;
            k4 *= i - 1;
            l4 *= j - 1;
            i4 = _mth$341(i4);
            int k6 = (((i4 * 3) / 4 + 16383) * Math.abs(_fld$949)) / 20;
            i4 = _mth$341(i4);
            int l5;
            int k5 = l5 = ((i4 / 2 + 32768) * _fld$899) / 200;
            k5 *= i - 1;
            l5 *= j - 1;
            j4 = _mth$341(j4);
            int i5;
            int j5;
            if (_fld$772 == 0) {
                double d1 = 1.0D - (2D * (double) j4) / 65535D;
                d1 *= d3;
                d1 *= 3.1415926535897931D;
                d1 += d2;
                i5 = (int) (Math.cos(d1) * (double) (i - 1));
                j5 = (int) (Math.sin(d1) * (double) (j - 1));
            } else {
                i5 = 65535 - 2 * j4;
                j4 = _mth$341(j4);
                j5 = 65535 - 2 * j4;
                i5 = (i5 * (i - 1)) / 65535;
                j5 = (j5 * (j - 1)) / 65535;
            }
            int i6 = k4 + ((k6 * i5) / 100) * k;
            i6 %= i << 16;
            int j6 = l4 + ((k6 * j5) / 100) * k;
            if (_fld$772 == 0) {
                int j11 = j6;
                int k8 = j6 % (k11 << 16);
                int i12 = (j11 >> 16) / k11;
                if (i12 % 2 == 1)
                    j6 = (k11 << 16) - k8;
                else
                    j6 = k8;
            }
            int i3 = i6 - k5 >> 16;
            int k3 = j6 - l5 >> 16;
            int j3 = i6 + k5 >> 16;
            int l3 = j6 + l5 >> 16;
            int l7 = j3 - i3;
            int i8 = l3 - k3;
            if (l7 == 0)
                l7 = 1;
            if (i8 == 0)
                i8 = 1;
            int j8 = 0x10000 / l7;
            int i9 = l8 % _fld$1017;
            int j9 = i9 + 1;
            if (j9 >= _fld$1017)
                j9 = 0;
            int l9 = (j9 - i9) * _fld$1018 * _fld$1016;
            for (int j1 = k3; j1 <= l3; j1++) {
                int i11 = j1;
                if (_fld$874 != 0) {
                    if (j1 < 0)
                        continue;
                    if (j1 >= j)
                        break;
                } else if (j1 < 0)
                    do
                        i11 += j;
                    while (i11 < 0);
                else if (j1 >= j)
                    do
                        i11 -= j;
                    while (i11 >= j);
                int i7 = (j1 - k3 << 16) / i8;
                int k7 = i7 * (_fld$1016 - 1) >> 16;
                int l6 = (i3 - 1) * j8 - (i3 << 16) / l7;
                for (int l1 = i3; l1 <= j3; l1++) {
                    l6 += j8;
                    int j7 = (l6 * (_fld$1018 - 1)) / 0x10000;
                    if (j7 < 0)
                        j7 = 0;
                    else if (j7 >= _fld$1018)
                        j7 = _fld$1018 - 1;
                    int k9 = i9 * _fld$1018 * _fld$1016 + _fld$1018 * k7 + j7;
                    int i10 = _fld$956[k9];
                    int j10 = _fld$956[k9 + l9];
                    if (i10 != 0 || j10 != 0) {
                        int k10 = i10 * (255 - l) + j10 * l >> 15;
                        int l10 = l1;
                        if (l1 < 0)
                            do
                                l10 += i;
                            while (l10 < 0);
                        else if (l1 >= i)
                            do
                                l10 -= i;
                            while (l10 >= i);
                        int i2 = _fld$427[l10 + i * i11];
                        int j2 = i2 & 0xff000000;
                        int k2 = i2 & 0xff00ff;
                        int l2 = i2 & 0xff00;
                        k2 = j12 * k10 + k2 * (255 - k10) >> 8;
                        l2 = k12 * k10 + l2 * (255 - k10) >> 8;
                        i2 = j2 | k2 & 0xff00ff | l2 & 0xff00;
                        _fld$427[l10 + i * i11] = i2;
                    }
                }

            }

        }

    }

    public void cleanup() {
        _fld$662 = null;
        _fld$359 = null;
        _fld$475 = null;
        _fld$956 = null;
    }

    private void _mth$95(int i, int j, int k) {
        int l = 7293;
        int l1;
        int j1 = l1 = 0;
        double d = 0.0D;
        for (int i4 = 0; i4 < _fld$752; i4++) {
            l = _mth$341(l);
            l = _mth$341(l);
            l = _mth$341(l);
            l = _mth$341(l);
            double d15;
            double d14 = d15 = (((double) l / 65535D / 2D + 0.5D) * (double) _fld$899) / 100D / 2D;
            double d6 = d14;
            if (d6 > d) {
                d = d6;
                j1 = (int) (2D * d14 * (double) (j - 1));
                l1 = (int) (2D * d15 * (double) (k - 1));
            }
        }

        int k1;
        int i1 = k1 = 0;
        _fld$1018 = (j1 - i1) + 1;
        _fld$1016 = (l1 - k1) + 1;
        _fld$956 = new int[i * _fld$1018 * _fld$1016];
        _fld$1040 = new double[102];
        _fld$1041 = new double[102];
        _fld$1042 = new double[102];
        _fld$181 = new int[102];
        double d16 = (double) _fld$784 / 10D;
        double d17 = (double) _fld$850 / 100D;
        for (int j4 = 0; j4 < i; j4++) {
            double d18;
            double d19;
            if (j4 % 2 == 1) {
                d18 = 1.0D / ((double) ((j1 - i1) + 1) * 0.20000000000000001D);
                d19 = 1.0D / ((double) ((j1 - i1) + 1) * 0.20000000000000001D);
            } else {
                d18 = 2D / (double) ((j1 - i1) + 1);
                d19 = 2D / (double) ((j1 - i1) + 1);
            }
            double d11 = j1 - i1;
            double d12 = l1 - k1;
            _fld$1027 = _mth$341(_fld$1027);
            for (int i2 = 0; i2 < 50; i2++) {
                double d1;
                double d3;
                double d5;
                double d20;
                do {
                    _fld$1027 = _mth$341(_fld$1027);
                    d1 = ((double) _fld$1027 / 65534D) * 2D - 1.0D;
                    _fld$1027 = _mth$341(_fld$1027);
                    d3 = ((double) _fld$1027 / 65534D) * 2D - 1.0D;
                    _fld$1027 = _mth$341(_fld$1027);
                    d5 = ((double) _fld$1027 / 65534D) * 2D - 1.0D;
                    d20 = d1 * d1 + d3 * d3 + d5 * d5;
                } while (d20 == 0.0D || d20 > 1.0D);
                d20 = Math.sqrt(d20);
                _fld$1040[i2] = d1 / d20;
                _fld$1041[i2] = d3 / d20;
                _fld$1042[i2] = d5 / d20;
            }

            for (int j2 = 0; j2 <= 50; j2++)
                _fld$181[j2] = j2;

            for (int k2 = 49; k2 > 0; k2 -= 2) {
                int j3 = _fld$181[k2];
                _fld$1027 = _mth$341(_fld$1027);
                int i3 = (int) (((double) _fld$1027 / 65534D) * 49D);
                _fld$181[k2] = _fld$181[i3];
                _fld$181[i3] = j3;
            }

            for (int l2 = 0; l2 < 52; l2++) {
                _fld$181[50 + l2] = _fld$181[l2];
                _fld$1040[50 + l2] = _fld$1040[l2];
                _fld$1041[50 + l2] = _fld$1041[l2];
                _fld$1042[50 + l2] = _fld$1042[l2];
            }

            for (int k3 = k1; k3 <= l1; k3++) {
                if (k3 < 0)
                    continue;
                if (k3 >= _fld$1016)
                    break;
                double d8 = ((double) k3 - (double) k1) / d12;
                d8 = 2D * d8 - 1.0D;
                double d10 = d8 * d8;
                double d4;
                for (d4 = (double) (k3 - k1) * d19; d4 > 50D; d4 -= 50D) ;
                double d2 = -d18;
                for (int l3 = i1; l3 <= j1; l3++) {
                    if (l3 < 0)
                        continue;
                    if (l3 >= _fld$1018)
                        break;
                    double d7 = ((double) l3 - (double) i1) / d11;
                    d7 = 2D * d7 - 1.0D;
                    double d9 = d7 * d7;
                    double d13 = 1.0D - Math.sqrt(d9 + d10);
                    d2 += d18;
                    if (d2 > 50D)
                        d2 -= 50D;
                    double d21;
                    if (j4 % 2 == 1) {
                        d21 = _mth$257(d2, d4, 1.0D, d16);
                        d21 = (d21 + Math.abs(1.0D - d13) * 2D) * 255D;
                        d21 = 255D - d21;
                        d21 *= d17;
                        if (d21 > 255D)
                            d21 = 255D;
                        if (d21 < 0.0D)
                            d21 = 0.0D;
                        d21 /= 255D;
                        if (d21 <= 0.25D)
                            d21 = 0.0D;
                        else
                            d21 = (d21 - 0.25D) / 0.75D;
                    } else {
                        d21 = 0.5D + 1.8D * _mth$257(d2, d4, 1.0D, d16);
                        d21 = (0.5D + d21) * 255D;
                        d21 *= d17;
                        if (d21 > 255D)
                            d21 = 255D;
                        if (d21 < 0.0D)
                            d21 = 0.0D;
                        d21 /= 165D;
                        d21 *= d13;
                    }
                    if (d21 >= 1.0D)
                        d21 = 1.0D;
                    if (d21 <= 0.0D)
                        d21 = 0.0D;
                    _fld$956[j4 * _fld$1018 * _fld$1016 + _fld$1018 * k3 + l3] = (int) (d21 * 32768D);
                }

            }

        }

    }

    public boolean hitTest(int i, int j) {
        if (_fld$990.inside(i, j))
            return _fld$359 != null;
        else
            return false;
    }

    public boolean _mth$134(Component component, Rectangle rectangle, int i, int j, MediaTracker mediatracker, Image aimage[], boolean aflag[],
                            AudioClip aaudioclip[], boolean flag, boolean flag1, String s) {
        _fld$990 = new Rectangle(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
        if (_fld$990.height <= 0 || _fld$990.width <= 0)
            return false;
        Object aobj[] = {
            new Integer(2000), new Integer(50), new Integer(40), new Integer(35), new Color(255, 255, 255), new Integer(50), new Integer(0), new Integer(3), new Integer(1), null,
            null, null, new Integer(0), new Integer(1), new Integer(0), new Integer(0)
        };
        EffectBase.parser(s, aobj, "|");
        _fld$752 = ((Integer) aobj[0]).intValue();
        _fld$899 = ((Integer) aobj[1]).intValue();
        _fld$784 = ((Integer) aobj[2]).intValue();
        _fld$949 = ((Integer) aobj[3]).intValue();
        _fld$727 = ((Color) aobj[4]).getRed();
        _fld$726 = ((Color) aobj[4]).getGreen();
        _fld$725 = ((Color) aobj[4]).getBlue();
        _fld$850 = ((Integer) aobj[5]).intValue();
        _fld$772 = ((Integer) aobj[15]).intValue();
        if (_fld$772 == 0)
            _fld$874 = ((Integer) aobj[14]).intValue();
        else
            _fld$874 = 0;
        if (_fld$949 >= 0)
            _fld$755 = 0;
        else
            _fld$755 = 180;
        int k = ((Integer) aobj[6]).intValue() - 1;
        _fld$904 = 11 - ((Integer) aobj[7]).intValue();
        _fld$881 = ((Integer) aobj[8]).intValue();
        _fld$773 = _fld$881 * 5;
        _fld$989 = EffectBase._mth$317((String) aobj[9]);
        _fld$987 = EffectBase._mth$317((String) aobj[10]);
        _fld$986 = EffectBase._mth$317((String) aobj[11]);
        _fld$692 = ((Integer) aobj[12]).intValue() - 1;
        _fld$521 = ((Integer) aobj[13]).intValue() == 1;
        EffectBase.WaitMediaLoad(k, mediatracker, aimage, aflag, component);
        _fld$914 = i;
        _fld$765 = j;
        int l = j - i;
        if (l < 20)
            return false;
        _fld$933 = _fld$904 * 20;
        if (l < _fld$933)
            _fld$933 = l;
        _fld$535 = flag1;
        _fld$640 = flag;
        if (k >= 0) {
            _fld$359 = aimage[k];
            int i1 = rectangle.width;
            int k1 = rectangle.height;
            _fld$475 = new int[i1 * k1];
            _fld$475 = EffectBase._mth$1054(_fld$359, i1, k1, component);
            _mth$95(_fld$1017, i1, k1);
            if (!_fld$557) {
                _fld$662 = new Image[_fld$773];
                for (int i2 = 0; i2 < _fld$773; i2++) {
                    String s1 = "Clouds: " + (i2 + 1) + "/" + _fld$773;
                    ((Applet) component).showStatus(s1);
                    ((EffectPlayer) component)._fld$994 = s1;
                    ((Applet) component).repaint();
                    _fld$427 = new int[i1 * k1];
                    _fld$623 = ((double) i2 / (double) (_fld$773 - 1)) * 2.5D;
                    _mth$43(_fld$623, i1, k1);
                    _fld$662[i2] = component.createImage(new MemoryImageSource(i1, k1, _fld$427, 0, i1));
                    _fld$427 = null;
                }

            } else {
                _fld$773 = 1;
                _fld$662 = new Image[_fld$773];
            }
        } else if (_fld$535) {
            int j1 = rectangle.width;
            int l1 = rectangle.height;
            _fld$475 = new int[j1 * l1];
            _mth$95(_fld$1017, j1, l1);
            _fld$773 = 1;
            _fld$662 = new Image[_fld$773];
        } else {
            _fld$933 = l;
        }
        _mth$135(aaudioclip, _fld$692);
        aobj = null;
        _fld$1040 = null;
        _fld$1041 = null;
        _fld$1042 = null;
        _fld$181 = null;
        return true;
    }

    private void _mth$135(AudioClip aaudioclip[], int i) {
        if (aaudioclip != null && i >= 0 && i < aaudioclip.length)
            audio = aaudioclip[i];
    }

    public boolean _mth$138() {
        return _fld$359 == null;
    }

    private double _mth$178(double d, double d1) {
        int i = (int) d;
        int k = i + 1;
        int j = (int) d1;
        int l = j + 1;
        double d2 = d - (double) i;
        double d3 = d1 - (double) j;
        i += 50;
        j += 50;
        double d4 = d - (double) k;
        double d5 = d1 - (double) l;
        k += 50;
        l += 50;
        double d10 = _mth$241(d2);
        double d11 = _mth$241(d3);
        int i1 = _fld$181[(j + _fld$181[0]) % 50];
        int j1 = _fld$181[(i + i1) % 50] % 50;
        int l1 = _fld$181[(k + i1) % 50] % 50;
        i1 = _fld$181[(l + _fld$181[0]) % 50];
        int k1 = _fld$181[(i + i1) % 50] % 50;
        int i2 = _fld$181[(k + i1) % 50] % 50;
        double d6 = _fld$1040[j1] * d2 + _fld$1041[j1] * d3;
        double d7 = _fld$1040[k1] * d2 + _fld$1041[k1] * d5;
        double d8 = _fld$1040[l1] * d4 + _fld$1041[l1] * d3;
        double d9 = _fld$1040[i2] * d4 + _fld$1041[i2] * d5;
        d6 = d8 + d10 * (d6 - d8);
        d9 += d10 * (d7 - d9);
        d6 = d9 + d11 * (d6 - d9);
        return d6;
    }

    public Object process(Component component, Object obj, Rectangle rectangle, Event event, int i) {
        if (obj == null || i > _fld$765 || i < _fld$914)
            return null;
        if (event != null && event.id != 505) {
            if (audio != null && !running) {
                running = true;
                if (_fld$521)
                    audio.loop();
                else
                    audio.play();
            }
        } else {
            stop();
        }
        Image image = (Image) obj;
        Graphics g = image.getGraphics();
        g.clipRect(_fld$990.x, _fld$990.y, _fld$990.width, _fld$990.height);
        if (_fld$359 != null) {
            if (_fld$557) {
                int j = rectangle.width;
                int k = rectangle.height;
                _fld$427 = new int[j * k];
                _mth$43(_fld$623, j, k);
                _fld$662[0] = component.createImage(new MemoryImageSource(j, k, _fld$427, 0, j));
                g.drawImage(_fld$662[0], _fld$756 + _fld$990.x, _fld$757 + _fld$990.y, null);
                _fld$662[0] = null;
                _fld$427 = null;
                _fld$623 += 0.050000000000000003D;
            } else {
                g.drawImage(_fld$662[_fld$734], _fld$756 + _fld$990.x, _fld$757 + _fld$990.y, null);
                _fld$734++;
                if (_fld$734 >= _fld$773)
                    _fld$734 = 0;
            }
        } else if (_fld$535) {
            PixelGrabber pixelgrabber = new PixelGrabber(image, rectangle.x, rectangle.y, rectangle.width, rectangle.height, _fld$475, 0, rectangle.width);
            try {
                pixelgrabber.grabPixels();
            } catch (InterruptedException _ex) {
            }
            pixelgrabber = null;
            int l = rectangle.width;
            int i1 = rectangle.height;
            _fld$427 = new int[l * i1];
            _mth$43(_fld$623, l, i1);
            _fld$662[0] = component.createImage(new MemoryImageSource(l, i1, _fld$427, 0, l));
            g.drawImage(_fld$662[0], _fld$756 + _fld$990.x, _fld$757 + _fld$990.y, null);
            _fld$662[0] = null;
            _fld$427 = null;
            _fld$623 += 0.050000000000000003D;
        }
        g.dispose();
        return null;
    }

    public void _mth$201() {
    }

    private double _mth$241(double d) {
        if (d >= 1.0D || d <= -1D)
            return 0.0D;
        if (d < 0.0D)
            d = -d;
        double d1 = (2D * d - 3D) * d * d + 1.0D;
        return d1;
    }

    private double _mth$257(double d, double d1, double d2, double d3) {
        double d4 = 0.0D;
        double d5 = 1.0D;
        for (int i = (int) d2; i <= (int) d3; i++) {
            double d6 = _mth$178(d, d1);
            if (d6 < 0.0D)
                d6 = -d6;
            d4 += d6 / d5;
            d5 += d5;
            d += d;
            d1 += d1;
            if (d > 50D)
                d -= 50D;
            if (d1 > 50D)
                d1 -= 50D;
        }

        if (Math.ceil(d3) != Math.floor(d3)) {
            double d7 = _mth$178(d, d1);
            if (d7 < 0.0D)
                d7 = -d7;
            d4 += (d7 / d5) * (d3 - Math.floor(d3));
        }
        d4 -= 0.29999999999999999D;
        return d4;
    }

    private int _mth$341(int i) {
        i = 25713 * i + 13849 & 0xffff;
        return i;
    }

    public int _mth$345(int i) {
        if (i == _fld$914)
            return _fld$933;
        int j = -1;
        int k = i - _fld$914;
        j = (k / _fld$933 + 1) * _fld$933 - k;
        if (i + j > _fld$765)
            j = _fld$765 - i;
        return j;
    }

    public int _mth$1015(Event event, String as[]) {
        byte byte0 = 0;
        if (_fld$986 != null)
            as[0] = _fld$986;
        else if (_fld$989 != null)
            as[0] = _fld$989;
        else
            as[0] = "";
        if (_fld$640 && _fld$989 != null)
            byte0 = 12;
        if (event.id == 501 && _fld$989 != null) {
            as[1] = _fld$989;
            as[2] = _fld$987;
        }
        return byte0;
    }

    public void stop() {
        if (audio != null && running) {
            running = false;
            audio.stop();
        }
    }

    private int _fld$914;
    private int _fld$765;
    private int _fld$756;
    private int _fld$757;
    private int _fld$904;
    private int _fld$881;
    private int _fld$773;
    private int _fld$692;
    private boolean _fld$640;
    private boolean _fld$521;
    private boolean running;
    private AudioClip audio;
    private String _fld$989;
    private String _fld$986;
    private String _fld$987;
    private int _fld$933;
    private int _fld$752;
    private int _fld$899;
    private int _fld$784;
    private int _fld$850;
    private int _fld$949;
    private int _fld$755;
    private int _fld$874;
    private int _fld$772;
    private int _fld$727;
    private int _fld$726;
    private int _fld$725;
    private int _fld$1018;
    private int _fld$1016;
    private int _fld$1017;
    private int _fld$1027;
    private int _fld$956[];
    private double _fld$1040[];
    private double _fld$1041[];
    private double _fld$1042[];
    private int _fld$181[];
    private Image _fld$359;
    private boolean _fld$535;
    private int _fld$475[];
    private int _fld$427[];
    private Image _fld$662[];
    private int _fld$734;
    private boolean _fld$557;
    private double _fld$623;
}
