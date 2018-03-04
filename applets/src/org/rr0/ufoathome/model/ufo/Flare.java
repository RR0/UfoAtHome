package org.rr0.ufoathome.model.ufo;

import org.rr0.ufoathome.model.ufo.EffectBase;

import java.applet.Applet;
import java.applet.AudioClip;
import java.awt.*;
import java.awt.image.MemoryImageSource;
import java.awt.image.PixelGrabber;

public class Flare extends EffectBase {

    public Flare() {
        _fld$756 = 0;
        _fld$757 = 0;
        _fld$522 = false;
        _fld$623 = 0.0D;
        _fld$734 = 0;
        _fld$557 = true;
    }

    public double _mth$3(double d, double d1, double d2, double d3) {
        double d4 = Math.pow(d, d1);
        d4 = Math.min(1.0D, d4 * d3);
        d4 *= d2;
        return d4;
    }

    public void _mth$16(int i, int j, int k, int l, int i1, int j1, int k1,
                        int l1, int i2, int j2, int k2, boolean flag, int l2, int i3,
                        Color color) {
        float af[] = new float[3];
        double d = (double) j / 100D;
        double d1 = (double) k / 100D;
        double d2 = (double) l / 100D;
        double d3 = ((double) i1 / 100D) * (double) _fld$947;
        double d4 = ((double) j1 / 100D) * (double) _fld$779;
        double d5 = ((double) (k1 + 100) / 200D) * (double) _fld$947;
        double d6 = ((double) (100 - l1) / 200D) * (double) _fld$779;
        double d7 = (double) i2 / 100D;
        double d8 = (double) color.getRed() / 255D;
        double d9 = (double) color.getGreen() / 255D;
        double d10 = (double) color.getBlue() / 255D;
        if (i == 0) {
            int ai[][] = {
                {
                    1, 20, 15, 0, 0, 128, 192
                }, {
                    1, 20, 15, 0, 0, 128, 192
                }, {
                    1, 25, 8, 0, 0, 176, 176
                }, {
                    1, 25, 8, 0, 0, 176, 176
                }, {
                    0, 20, 300, 0, 0, 192, 64
                }, {
                    3, 10, 66, 0, 255, 184, 199
                }, {
                    1, 12, 20, 0, 255, 128, 64
                }, {
                    1, 20, 12, 0, 85, 170, 255
                }, {
                    1, 20, 15, 0, 85, 170, 255
                }, {
                    0, 40, 15, 0, 255, 140, 140
                }, {
                    0, 50, 8, 0, 128, 192, 128
                }, {
                    3, 30, 40, 0, 255, 64, 64
                }, {
                    0, 80, 300, 0, 255, 184, 199
                }, {
                    0, 100, 50, 0, 255, 184, 199
                }, {
                    2, 30, 50, 0, 255, 255, 255
                }
            };
            double ad[] = {
                2.0899999999999999D, 1.99D, 1.75D, 1.71D, -0.93000000000000005D, -0.93000000000000005D, -1D, 0.40000000000000002D, 0.29999999999999999D, -0.71999999999999997D,
                -0.59999999999999998D, 1.0D, 1.0D, 1.0D, 1.0D
            };
            for (int j3 = 0; j3 < 15; j3++) {
                double d14;
                if (ad[j3] == 1.0D)
                    d14 = (d * (double) ai[j3][1]) / 100D;
                else
                    d14 = (d1 * (double) ai[j3][1]) / 100D;
                ad[j3] = ad[j3] * (double) j2 * 0.050000000000000003D;
                double d17 = (d2 * (double) ai[j3][2]) / 100D;
                double d20 = d5 + d3 * ad[j3];
                double d23 = d6 + d4 * ad[j3];
                int j4 = (int) Math.round((double) ai[j3][4] * d8);
                int i5 = (int) Math.round((double) ai[j3][5] * d9);
                int l5 = (int) Math.round((double) ai[j3][6] * d10);
                Color color1 = new Color(j4, i5, l5);
                double d26 = ((double) ai[j3][3] * 3.1415926535897931D) / 180D;
                switch (ai[j3][0]) {
                    default:
                        break;

                    case 0: // '\0'
                        _mth$74(d14, d17, d20, d23, 0.5D, color1);
                        break;

                    case 1: // '\001'
                        if (flag)
                            _mth$74(d14, d17, d20, d23, 0.050000000000000003D, color1);
                        else
                            _mth$72(l2, d14, d17, d20, d23, d26, 0.050000000000000003D, color1);
                        break;

                    case 2: // '\002'
                        _mth$73(j3, d14, d20, d23, 0.5D, d17, k2, d7, d26, color1);
                        d26 += 3.1415926535897931D / (double) k2;
                        d17 *= 2D;
                        d14 /= 2D;
                        _mth$73(j3 + 1, d14, d20, d23, 0.5D, d17, k2, d7, d26, color1);
                        break;

                    case 3: // '\003'
                        _mth$66(d14, d17, 0.875D, 0.75D, d20, d23, 0.20000000000000001D, color1);
                        break;

                    case 4: // '\004'
                        _mth$66(d14, d17, 0.75D, 0.0D, d20, d23, 0.20000000000000001D, color1);
                        break;

                }
            }

            ai = null;
            ad = null;
        } else if (i == 1) {
            int ai1[][] = {
                {
                    1, 10, 135, 0, 255, 255, 255
                }, {
                    4, 10, 18, 0, 255, 128, 0
                }, {
                    3, 10, 75, 0, 255, 255, 255
                }, {
                    3, 10, 40, 0, 255, 255, 255
                }, {
                    1, 15, 12, 0, 128, 255, 128
                }, {
                    1, 20, 10, 0, 85, 170, 255
                }, {
                    1, 20, 8, 0, 255, 128, 0
                }, {
                    4, 16, 35, 0, 255, 128, 0
                }, {
                    4, 16, 20, 0, 255, 128, 0
                }, {
                    1, 20, 10, 0, 255, 128, 0
                }, {
                    0, 40, 15, 0, 85, 170, 255
                }, {
                    0, 50, 10, 0, 128, 255, 128
                }, {
                    0, 50, 2, 0, 64, 255, 64
                }, {
                    3, 30, 40, 0, 255, 64, 0
                }, {
                    0, 80, 300, 0, 255, 184, 199
                }, {
                    0, 100, 80, 0, 255, 255, 255
                }, {
                    2, 40, 60, 0, 255, 255, 255
                }
            };
            double ad1[] = {
                1.5D, 1.3200000000000001D, -1.27D, -1D, -0.62D, 0.40999999999999998D, 0.20999999999999999D, -0.42999999999999999D, -0.37D, -0.42999999999999999D,
                -0.66000000000000003D, -0.25D, 0, 1.0D, 1.0D, 1.0D, 1.0D
            };
            for (int k3 = 0; k3 < 17; k3++) {
                double d15;
                if (ad1[k3] == 1.0D)
                    d15 = (d * (double) ai1[k3][1]) / 100D;
                else
                    d15 = (d1 * (double) ai1[k3][1]) / 100D;
                ad1[k3] = ad1[k3] * (double) j2 * 0.10000000000000001D;
                double d18 = (d2 * (double) ai1[k3][2]) / 100D;
                double d21 = d5 + d3 * ad1[k3];
                double d24 = d6 + d4 * ad1[k3];
                int k4 = (int) Math.round((double) ai1[k3][4] * d8);
                int j5 = (int) Math.round((double) ai1[k3][5] * d9);
                int i6 = (int) Math.round((double) ai1[k3][6] * d10);
                Color color2 = new Color(k4, j5, i6);
                double d27 = ((double) ai1[k3][3] * 3.1415926535897931D) / 180D;
                switch (ai1[k3][0]) {
                    default:
                        break;

                    case 0: // '\0'
                        _mth$74(d15, d18, d21, d24, 0.5D, color2);
                        break;

                    case 1: // '\001'
                        if (flag)
                            _mth$74(d15, d18, d21, d24, 0.050000000000000003D, color2);
                        else
                            _mth$72(l2, d15, d18, d21, d24, d27, 0.050000000000000003D, color2);
                        break;

                    case 2: // '\002'
                        _mth$73(k3, d15, d21, d24, 0.5D, d18, k2, d7, d27, color2);
                        d27 += 3.1415926535897931D / (double) k2;
                        d18 *= 2D;
                        d15 /= 2D;
                        _mth$73(k3 + 1, d15, d21, d24, 0.29999999999999999D, d18, k2, d7, d27, color2);
                        break;

                    case 3: // '\003'
                        _mth$66(d15, d18, 0.875D, 0.75D, d21, d24, 0.20000000000000001D, color2);
                        break;

                    case 4: // '\004'
                        _mth$66(d15, d18, 0.75D, 0.0D, d21, d24, 0.20000000000000001D, color2);
                        break;

                }
            }

            ai1 = null;
            ad1 = null;
        } else {
            int ai2[][] = {
                {
                    2, 30, 50, 0, 255, 255, 255
                }, {
                    0, 80, 300, 0, 255, 255, 255
                }, {
                    0, 100, 50, 0, 255, 184, 199
                }, {
                    3, 30, 40, 0, 255, 64, 64
                }, {
                    1, 20, 15, 0, 0, 128, 192
                }, {
                    1, 20, 15, 0, 0, 128, 192
                }, {
                    1, 25, 8, 0, 0, 176, 176
                }, {
                    1, 25, 8, 0, 0, 176, 176
                }, {
                    0, 20, 300, 0, 0, 192, 64
                }, {
                    3, 10, 66, 0, 255, 184, 199
                }, {
                    1, 12, 20, 0, 255, 128, 64
                }, {
                    1, 20, 12, 0, 85, 170, 255
                }, {
                    1, 20, 15, 0, 85, 170, 255
                }, {
                    0, 40, 15, 0, 255, 140, 140
                }, {
                    0, 50, 8, 0, 128, 192, 128
                }, {
                    3, 10, 66, 0, 255, 184, 199
                }, {
                    1, 12, 20, 0, 255, 128, 64
                }, {
                    1, 25, 8, 0, 0, 176, 176
                }, {
                    0, 20, 300, 0, 0, 192, 64
                }, {
                    3, 10, 66, 0, 255, 184, 199
                }, {
                    1, 20, 15, 0, 0, 128, 192
                }
            };
            double ad2[] = {
                1.0D, 1.0D, 1.0D, 1.0D, 2.0899999999999999D, 1.99D, 1.75D, 1.71D, -0.93000000000000005D, -0.93000000000000005D,
                -1D, 0.40000000000000002D, 0.29999999999999999D, -0.71999999999999997D, -0.59999999999999998D, -0.93000000000000005D, -1D, 1.71D, -0.93000000000000005D, -0.93000000000000005D,
                1.99D
            };
            int k6 = i2 * 4;
            for (int l3 = i3; l3 >= 0; l3--) {
                if (l3 > 3) {
                    k6 = _mth$193(k6);
                    ai2[l3][0] = k6 % 4;
                    if (ai2[l3][0] < 5)
                        ai2[l3][0] = 1;
                    else if (ai2[l3][0] < 8)
                        ai2[l3][0] = 0;
                    else
                        ai2[l3][0] = 3;
                    k6 = _mth$193(k6);
                    ad2[l3] = (double) ((k6 - 32767) * j2) * 3.9999999999999998E-006D;
                    if (ai2[l3][0] == 1)
                        ai2[l3][2] = k6 * 40 >> 16;
                    else
                        ai2[l3][2] = k6 * 50 >> 16;
                    k6 = _mth$193(k6);
                    ai2[l3][1] = k6 * 100 >> 16;
                }
                double d16;
                if (ad2[l3] == 1.0D)
                    d16 = d * (double) ai2[l3][1] * 0.01D;
                else
                    d16 = d1 * (double) ai2[l3][1] * 0.01D;
                double d19 = d2 * (double) ai2[l3][2] * 0.01D;
                double d22 = d5 + d3 * ad2[l3];
                double d25 = d6 + d4 * ad2[l3];
                k6 = _mth$193(k6);
                k6 = _mth$193(k6);
                k6 = _mth$193(k6);
                int l4 = (int) Math.round((double) ai2[l3][4] * d8);
                int k5 = (int) Math.round((double) ai2[l3][5] * d9);
                int j6 = (int) Math.round((double) ai2[l3][6] * d10);
                Color color3 = new Color(l4, k5, j6);
                Color.RGBtoHSB(color3.getRed(), color3.getGreen(), color3.getBlue(), af);
                k6 = _mth$193(k6);
                af[0] += 360D * ((double) k6 / 65535D);
                if (af[0] >= 360F)
                    af[0] -= 360F;
                else if (af[0] < 0.0F)
                    af[0] += 360F;
                int i4 = Color.HSBtoRGB(af[0], af[1], af[2]);
                color3 = new Color(i4);
                double d28 = ((double) ai2[l3][3] * 3.1415926535897931D) / 180D;
                switch (ai2[l3][0]) {
                    default:
                        break;

                    case 0: // '\0'
                        _mth$74(d16, d19, d22, d25, 0.5D, color3);
                        break;

                    case 1: // '\001'
                        if (flag)
                            _mth$74(d16, d19, d22, d25, 0.050000000000000003D, color3);
                        else
                            _mth$72(l2, d16, d19, d22, d25, d28, 0.050000000000000003D, color3);
                        break;

                    case 2: // '\002'
                        _mth$73(l3, d16, d22, d25, 0.5D, d19, k2, d7, d28, color3);
                        d28 += 3.1415926535897931D / (double) k2;
                        d19 *= 2D;
                        d16 /= 2D;
                        _mth$73(l3 + 1, d16, d22, d25, 0.5D, d19, k2, d7, d28, color3);
                        break;

                    case 3: // '\003'
                        _mth$66(d16, d19, 0.875D, 0.75D, d22, d25, 0.20000000000000001D, color3);
                        break;

                    case 4: // '\004'
                        _mth$66(d16, d19, 0.75D, 0.0D, d22, d25, 0.20000000000000001D, color3);
                        break;

                }
            }

            ai2 = null;
            ad2 = null;
        }
        af = null;
    }

    private void _mth$17(int i, int j, double d) {
        switch (j) {
            default:
                break;

            case 0: // '\0'
                double d1 = d * 2D * 3.1415926535897931D + ((double) i * 3.1415926535897931D) / (double) _fld$685;
                double d5 = 10D + 35D * Math.abs(0.5D - d);
                _fld$871 = (int) (d5 * Math.cos(d1));
                _fld$872 = (int) (d5 * Math.sin(d1));
                _fld$721 = (int) (48D * Math.cos(d1));
                _fld$722 = (int) (32D * Math.sin(d1));
                _fld$945 = (int) (16D + (84D * Math.abs(0.5D - d)) / 0.5D);
                break;

            case 1: // '\001'
                d += (double) i / (double) _fld$685;
                if (d > 1.0D)
                    d--;
                if (d < 0.5D)
                    _fld$871 = (int) (200D * (0.25D - d));
                else
                    _fld$871 = (int) (200D * (-0.25D + (d - 0.5D)));
                if (m_nMode == 0)
                    _fld$872 = -40;
                else
                    _fld$872 = -20;
                _fld$721 = 0;
                _fld$722 = 0;
                _fld$945 = (int) (100D * Math.abs(0.5D - d));
                break;

            case 2: // '\002'
                double d2 = (6.2831853071795862D * (double) i) / (double) _fld$685;
                if (d < 0.5D) {
                    if (m_nMode == 0)
                        _fld$871 = (int) (200D * Math.cos(d2) * (0.25D - d));
                    else
                        _fld$871 = (int) (125D * Math.cos(d2) * (0.25D - d));
                } else if (m_nMode == 0)
                    _fld$871 = (int) (200D * Math.cos(d2) * (-0.25D + (d - 0.5D)));
                else
                    _fld$871 = (int) (125D * Math.cos(d2) * (-0.25D + (d - 0.5D)));
                if (d > 1.0D)
                    d--;
                if (d < 0.5D) {
                    if (m_nMode == 0)
                        _fld$872 = (int) (200D * -Math.sin(d2) * (0.25D - d));
                    else
                        _fld$872 = (int) (125D * -Math.sin(d2) * (0.25D - d));
                } else if (m_nMode == 0)
                    _fld$872 = (int) (200D * -Math.sin(d2) * (-0.25D + (d - 0.5D)));
                else
                    _fld$872 = (int) (125D * -Math.sin(d2) * (-0.25D + (d - 0.5D)));
                _fld$721 = 0;
                _fld$722 = 0;
                _fld$945 = (int) (100D * Math.abs(0.5D - d));
                break;

            case 3: // '\003'
                double d3 = 6.2831853071795862D * d + (6.2831853071795862D * (double) i) / (double) _fld$685;
                if (m_nMode == 0) {
                    _fld$871 = (int) (30D * Math.cos(d3));
                    _fld$872 = (int) (30D * Math.sin(d3));
                } else {
                    _fld$871 = (int) (20D * Math.cos(d3));
                    _fld$872 = (int) (20D * Math.sin(d3));
                }
                _fld$721 = (int) (20D * Math.cos(d3));
                _fld$722 = (int) (20D * Math.sin(d3));
                _fld$945 = (int) (100D * Math.abs(0.5D - d));
                break;

            case 4: // '\004'
                double d4 = (6.2831853071795862D * (double) i) / (double) _fld$685;
                double d6;
                if (m_nMode == 0)
                    d6 = d >= 0.5D ? (int) (10D + 90D * (1.0D - d)) : (int) (10D + 90D * d);
                else
                    d6 = d >= 0.5D ? (int) (10D + 50D * (1.0D - d)) : (int) (10D + 50D * d);
                double d7 = d6 * Math.cos(d4);
                double d8 = d6 * Math.sin(d4);
                d4 = 25.132741228718345D * d + (3.1415926535897931D * (double) i) / (double) _fld$685;
                _fld$872 = (int) (d8 + 15D * Math.sin(d4));
                _fld$871 = (int) (d7 + 15D * Math.cos(d4));
                _fld$721 = 0;
                _fld$722 = 0;
                _fld$945 = (int) (100D * Math.abs(0.5D - d));
                break;

        }
    }

    public void _mth$54() {
        _fld$359 = null;
        _fld$475 = null;
        _fld$594 = null;
        _fld$595 = null;
        for (int i = 0; i < _fld$773; i++)
            _fld$665[i] = null;

        _fld$665 = null;
    }

    public void _mth$66(double d, double d1, double d2, double d3, double d4, double d5, double d6,
                        Color color) {
        int l1 = (int) (256D * d);
        double d7;
        if (_fld$947 >= _fld$779)
            d7 = (double) _fld$947 / 2D;
        else
            d7 = (double) _fld$779 / 2D;
        double d16 = 0.10000000000000001D + d6 * 6.9000000000000004D;
        d7 *= d1;
        double d8 = d7 * d7;
        double d9 = d7 * d3;
        double d10 = d9 * d9;
        double d13 = d7 * d2;
        double d11 = d13 - d9;
        double d12 = d7 - d13;
        int i2 = color.getRed();
        int j2 = color.getGreen();
        int k2 = color.getBlue();
        if (d11 + d12 > 1E-010D) {
            int i1 = Math.max(0, (int) Math.floor(d5 - d7));
            if (i1 >= _fld$779)
                return;
            int j1 = Math.min(_fld$779 - 1, (int) Math.ceil(d5 + d7));
            if (j1 < 0)
                return;
            int k = Math.max(0, (int) Math.floor(d4 - d7));
            if (k >= _fld$947)
                return;
            int l = Math.min(_fld$947 - 1, (int) Math.ceil(d4 + d7));
            if (l < 0)
                return;
            for (int j = i1; j <= j1; j++) {
                double d20 = (double) j - d5;
                double d22 = d20 * d20;
                for (int i = k; i <= l; i++) {
                    double d19 = (double) i - d4;
                    double d21 = d19 * d19;
                    double d15 = d21 + d22;
                    if (d15 <= d8 && d15 >= d10) {
                        int l2 = _fld$427[i + _fld$947 * j];
                        int i3 = l2 & 0xff000000;
                        int j3 = (l2 & 0xff0000) >> 8;
                        int k3 = l2 & 0xff00;
                        int l3 = (l2 & 0xff) << 8;
                        double d14 = Math.sqrt(d15) - d13;
                        if (d14 < 0.0D)
                            d14 = -d14 / d11;
                        else
                            d14 /= d12;
                        double d17 = 1.0D - d14;
                        double d18 = Math.pow(d17, d16);
                        d18 = Math.min(1.0D, d18);
                        int k1 = (int) (d18 * (double) l1);
                        j3 = j3 + i2 * k1 >> 8;
                        k3 = k3 + j2 * k1 >> 8;
                        l3 = l3 + k2 * k1 >> 8;
                        j3 = Math.min(255, j3);
                        k3 = Math.min(255, k3);
                        l3 = Math.min(255, l3);
                        l2 = i3 | j3 << 16 | k3 << 8 | l3;
                        _fld$427[i + _fld$947 * j] = l2;
                    }
                }

            }

        }
    }

    public void _mth$72(int i, double d, double d1, double d2,
                        double d3, double d4, double d5, Color color) {
        int j4 = (int) (255D * d);
        if (i < 3)
            return;
        double d6;
        if (_fld$947 >= _fld$779)
            d6 = (double) _fld$947 / 2D;
        else
            d6 = (double) _fld$779 / 2D;
        d6 *= d1;
        int k3 = color.getRed();
        int l3 = color.getGreen();
        int i4 = color.getBlue();
        if (d6 > 1E-010D) {
            double d14 = _fld$947;
            double d18 = 0.0D;
            double d16 = _fld$779;
            double d20 = 0.0D;
            double d27 = 6.2831853071795862D / (double) i;
            for (int l = 0; l <= i; l++) {
                double d25 = d4 + (double) l * d27;
                double d12 = d2 + d6 * Math.cos(d25);
                double d13 = d3 + d6 * Math.sin(d25);
                d14 = Math.min(d14, d12);
                d18 = Math.max(d18, d12);
                d16 = Math.min(d16, d13);
                d20 = Math.max(d20, d13);
            }

            double d23 = d6 * Math.cos(d27 / 2D);
            int k1 = Math.max(0, (int) Math.floor(d16));
            if (k1 >= _fld$779)
                return;
            int l1 = Math.min(_fld$779 - 1, (int) Math.ceil(d20));
            if (l1 < 0)
                return;
            int i1 = Math.max(0, (int) Math.floor(d14));
            if (i1 >= _fld$947)
                return;
            int j1 = Math.min(_fld$947 - 1, (int) Math.ceil(d18));
            if (j1 < 0)
                return;
            for (int k = k1; k <= l1; k++) {
                double d17 = (double) k - d3;
                double d21 = d17 * d17;
                for (int j = i1; j <= j1; j++) {
                    double d15 = (double) j - d2;
                    double d19 = d15 * d15;
                    double d8 = Math.sqrt(d19 + d21);
                    double d26 = Math.atan2(-d17, d15);
                    if (d26 < 0.0D)
                        d26 = 6.2831853071795862D + d26;
                    d26 = Math.abs(d26 - d4) % d27;
                    double d22 = d23 / Math.cos(d27 / 2D - d26);
                    if (d8 <= d22) {
                        d8 /= d6;
                        double d10 = 1.0D - d8;
                        double d24 = (1000D * d10) % 1.0D;
                        double d11;
                        if (d24 == 0.0D)
                            d11 = _fld$595[(int) (d10 * 1000D)];
                        else
                            d11 = _fld$595[(int) (d10 * 1000D)] * d24 + _fld$595[(int) (d10 * 1000D) + 1] * (1.0D - d24);
                        d11 = Math.min(1.0D, d11 * 0.75D);
                        int i2 = (int) (d11 * (double) j4);
                        int j2 = _fld$427[j + _fld$947 * k];
                        int k2 = j2 & 0xff000000;
                        int l2 = (j2 & 0xff0000) >> 8;
                        int i3 = j2 & 0xff00;
                        int j3 = (j2 & 0xff) << 8;
                        l2 = l2 + k3 * i2 >> 8;
                        i3 = i3 + l3 * i2 >> 8;
                        j3 = j3 + i4 * i2 >> 8;
                        l2 = Math.min(255, l2);
                        i3 = Math.min(255, i3);
                        j3 = Math.min(255, j3);
                        j2 = k2 | l2 << 16 | i3 << 8 | j3;
                        _fld$427[j + _fld$947 * k] = j2;
                    }
                }

            }

        }
    }

    public void _mth$73(int i, double d, double d1, double d2,
                        double d3, double d4, int j, double d5,
                        double d6, Color color) {
        int l8 = (int) (256D * d);
        int k5 = color.getRed();
        int l5 = color.getGreen();
        int i6 = color.getBlue();
        double d11 = 0.10000000000000001D + d3 * 6.9000000000000004D;
        for (int k7 = 0; k7 < j; k7++) {
            int j7 = 29451 + i * j + k7 * 10;
            j7 = _mth$193(j7);
            j7 = _mth$193(j7);
            double d32 = (1.0D + d5 * ((2D * (double) j7) / 65535D - 1.0D)) * d4;
            double d20 = d32;
            double d33 = (6.2831853071795862D / (double) j) * (double) k7 + d6;
            double d22 = d1;
            double d23 = d2;
            if (d20 != 0.0D) {
                if (_fld$947 >= _fld$779)
                    d20 *= (double) _fld$947 / 2D;
                else
                    d20 *= (double) _fld$779 / 2D;
                double d21 = d20 * d20;
                double d24 = d22 + d20 * Math.cos(d33);
                double d25 = d23 + d20 * Math.sin(d33);
                if (Math.abs(d22 - d24) >= Math.abs(d23 - d25)) {
                    if (d22 > d24) {
                        double d26 = d22;
                        d22 = d24;
                        d24 = d26;
                        double d29 = d23;
                        d23 = d25;
                        d25 = d29;
                    }
                    for (int l7 = (int) Math.ceil(d22); l7 <= (int) d24; l7++)
                        if (l7 >= 0 && l7 < _fld$947) {
                            double d30 = _mth$94(d22, d23, d24, d25, 0, l7);
                            int j8 = (int) Math.floor(d30);
                            if (j8 >= 0 && j8 < _fld$779) {
                                double d9 = ((double) l7 - d1) * ((double) l7 - d1) + (d30 - d2) * (d30 - d2);
                                if (d9 < d21) {
                                    double d7 = Math.sqrt(d9) / d20;
                                    double d14 = 1.0D - d7;
                                    double d12 = 1.0D - (d30 - (double) j8);
                                    int k = _fld$427[l7 + _fld$947 * j8];
                                    int k1 = k & 0xff000000;
                                    int k2 = (k & 0xff0000) >> 8;
                                    int k3 = k & 0xff00;
                                    int k4 = (k & 0xff) << 8;
                                    double d16 = Math.pow(d14, d11);
                                    int j6 = (int) (Math.min(1.0D, d16 * d12) * (double) l8);
                                    k2 = k2 + k5 * j6 >> 8;
                                    k3 = k3 + l5 * j6 >> 8;
                                    k4 = k4 + i6 * j6 >> 8;
                                    k2 = Math.min(255, k2);
                                    k3 = Math.min(255, k3);
                                    k4 = Math.min(255, k4);
                                    k = k1 | k2 << 16 | k3 << 8 | k4;
                                    _fld$427[l7 + _fld$947 * j8] = k;
                                    if (++j8 < _fld$779) {
                                        d12 = 1.0D - d12;
                                        int l = _fld$427[l7 + _fld$947 * j8];
                                        int l1 = l & 0xff000000;
                                        int l2 = (l & 0xff0000) >> 8;
                                        int l3 = l & 0xff00;
                                        int l4 = (l & 0xff) << 8;
                                        double d17 = Math.pow(d14, d11);
                                        int k6 = (int) (Math.min(1.0D, d17 * d12) * (double) l8);
                                        l2 = l2 + k5 * k6 >> 8;
                                        l3 = l3 + l5 * k6 >> 8;
                                        l4 = l4 + i6 * k6 >> 8;
                                        l2 = Math.min(255, l2);
                                        l3 = Math.min(255, l3);
                                        l4 = Math.min(255, l4);
                                        l = l1 | l2 << 16 | l3 << 8 | l4;
                                        _fld$427[l7 + _fld$947 * j8] = l;
                                    }
                                }
                            }
                        }

                } else {
                    if (d23 > d25) {
                        double d27 = d22;
                        d22 = d24;
                        d24 = d27;
                        double d31 = d23;
                        d23 = d25;
                        d25 = d31;
                    }
                    for (int k8 = (int) Math.ceil(d23); k8 <= (int) d25; k8++)
                        if (k8 >= 0 && k8 < _fld$779) {
                            double d28 = _mth$94(d22, d23, d24, d25, 1, k8);
                            int i8 = (int) Math.floor(d28);
                            if ((int) d28 >= 0 && (int) d28 < _fld$947) {
                                double d10 = ((double) k8 - d2) * ((double) k8 - d2) + (d28 - d1) * (d28 - d1);
                                if (d10 > d21) {
                                    double d8 = Math.sqrt(d10) / d20;
                                    double d15 = 1.0D - d8;
                                    double d13 = 1.0D - (d28 - (double) i8);
                                    int i1 = _fld$427[i8 + _fld$947 * k8];
                                    int i2 = i1 & 0xff000000;
                                    int i3 = (i1 & 0xff0000) >> 8;
                                    int i4 = i1 & 0xff00;
                                    int i5 = (i1 & 0xff) << 8;
                                    double d18 = Math.pow(d15, d11);
                                    int l6 = (int) (Math.min(1.0D, d18 * d13) * (double) l8);
                                    i3 = i3 + k5 * l6 >> 8;
                                    i4 = i4 + l5 * l6 >> 8;
                                    i5 = i5 + i6 * l6 >> 8;
                                    i3 = Math.min(255, i3);
                                    i4 = Math.min(255, i4);
                                    i5 = Math.min(255, i5);
                                    i1 = i2 | i3 << 16 | i4 << 8 | i5;
                                    _fld$427[i8 + _fld$947 * k8] = i1;
                                    if (++i8 < _fld$947) {
                                        d13 = 1.0D - d13;
                                        int j1 = _fld$427[i8 + _fld$947 * k8];
                                        int j2 = j1 & 0xff000000;
                                        int j3 = (j1 & 0xff0000) >> 8;
                                        int j4 = j1 & 0xff00;
                                        int j5 = (j1 & 0xff) << 8;
                                        double d19 = Math.pow(d15, d11);
                                        int i7 = (int) (Math.min(1.0D, d19 * d13) * (double) l8);
                                        j3 = j3 + k5 * i7 >> 8;
                                        j4 = j4 + l5 * i7 >> 8;
                                        j5 = j5 + i6 * i7 >> 8;
                                        j3 = Math.min(255, j3);
                                        j4 = Math.min(255, j4);
                                        j5 = Math.min(255, j5);
                                        j1 = j2 | j3 << 16 | j4 << 8 | j5;
                                        _fld$427[i8 + _fld$947 * k8] = j1;
                                    }
                                }
                            }
                        }

                }
            }
        }

    }

    public void _mth$74(double d, double d1, double d2, double d3, double d4, Color color) {
        int i6 = (int) (256D * d);
        int k5 = (int) d2;
        int l5 = (int) d3;
        int k;
        if (_fld$947 >= _fld$779)
            k = _fld$947 / 2;
        else
            k = _fld$779 / 2;
        double d5 = 0.10000000000000001D + d4 * 6.9000000000000004D;
        k = (int) ((double) k * d1);
        int l = k * k;
        int j3 = color.getRed();
        int k3 = color.getGreen();
        int l3 = color.getBlue();
        int j6 = Math.max(j3, Math.max(k3, l3));
        int k6 = 256 / (j6 + 1);
        double d9 = (double) k6 / (double) i6;
        double d10 = Math.pow(d9, 1.0D / d5);
        int l6 = (int) Math.pow((double) k * (1.0D - d10), 2D);
        if ((double) k > 1E-010D) {
            int l2 = Math.max(0, l5 - k);
            if (l2 >= _fld$779)
                return;
            int i3 = Math.min(_fld$779 - 1, l5 + k);
            int j2 = Math.max(0, k5 - k);
            if (j2 >= _fld$947)
                return;
            int k2 = Math.min(_fld$947 - 1, k5 + k);
            for (int j = l2; j < i3; j++) {
                int k1 = j - l5;
                int i2 = k1 * k1;
                for (int i = j2; i <= k2; i++) {
                    int j1 = i - k5;
                    int l1 = j1 * j1;
                    int i1 = l1 + i2;
                    if (i1 <= l6 && i1 <= l) {
                        int i4 = _fld$427[i + _fld$947 * j];
                        int j4 = i4 & 0xff000000;
                        int k4 = (i4 & 0xff0000) >> 8;
                        int l4 = i4 & 0xff00;
                        int i5 = (i4 & 0xff) << 8;
                        double d7 = ((double) k - Math.sqrt(i1)) / (double) k;
                        double d11 = (1000D * d7) % 1.0D;
                        double d8;
                        if (d11 == 0.0D) {
                            if (d4 == 0.5D)
                                d8 = _fld$594[(int) (d7 * 1000D)];
                            else
                                d8 = _fld$595[(int) (d7 * 1000D)] * 0.75D;
                        } else if (d4 == 0.5D)
                            d8 = _fld$594[(int) (d7 * 1000D)] * d11 + _fld$594[(int) (d7 * 1000D) + 1] * (1.0D - d11);
                        else
                            d8 = (_fld$595[(int) (d7 * 1000D)] * d11 + _fld$595[(int) (d7 * 1000D) + 1] * (1.0D - d11)) * 0.75D;
                        if (d8 > 1.0D)
                            d8 = 1.0D;
                        int j5 = (int) (d8 * (double) i6);
                        k4 = k4 + j3 * j5 >> 8;
                        l4 = l4 + k3 * j5 >> 8;
                        i5 = i5 + l3 * j5 >> 8;
                        k4 = k4 <= 255 ? k4 : 255;
                        l4 = l4 <= 255 ? l4 : 255;
                        i5 = i5 <= 255 ? i5 : 255;
                        i4 = j4 | k4 << 16 | l4 << 8 | i5;
                        _fld$427[i + _fld$947 * j] = i4;
                    }
                }
            }
        }
    }

    public double _mth$94(double d, double d1, double d2, double d3, int i, double d4) {
        double d6 = d2 - d;
        double d7 = d3 - d1;
        double d5;
        if (i == 0) {
            if (Math.abs(d6) == 0.0D)
                d5 = d1;
            else
                d5 = (d7 / d6) * (d4 - d) + d1;
        } else if (Math.abs(d7) == 0.0D)
            d5 = d;
        else
            d5 = (d6 / d7) * (d4 - d1) + d;
        return d5;
    }

    public boolean Hittest(int i, int j) {
        return _fld$359 != null && _fld$990.inside(i, j);
    }

    public boolean _mth$134(Component component, Rectangle rectangle, int i, int j, MediaTracker mediatracker, Image aimage[], boolean aflag[],
                            AudioClip aaudioclip[], boolean flag, boolean flag1, String s) {
        _fld$990 = new Rectangle(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
        if (_fld$990.height <= 0 || _fld$990.width <= 0)
            return false;
        Object aobj[] = {
            new Integer(1), new Integer(0), new Integer(0), new Integer(100), new Integer(100), new Integer(30), new Color(255, 255, 255), new Integer(3), new Integer(6), new Integer(0),
            null, null, null, new Integer(0), new Integer(1)
        };
        EffectBase.parser(s, aobj, "|");
        _fld$685 = ((Integer) aobj[0]).intValue();
        _fld$867 = ((Integer) aobj[1]).intValue();
        m_nMode = ((Integer) aobj[2]).intValue();
        _fld$921 = ((Integer) aobj[3]).intValue();
        _fld$922 = ((Integer) aobj[4]).intValue();
        _fld$899 = ((Integer) aobj[5]).intValue();
        _fld$572 = (Color) aobj[6];
        _fld$904 = 11 - ((Integer) aobj[7]).intValue();
        _fld$881 = ((Integer) aobj[8]).intValue();
        _fld$773 = _fld$881 * 5;
        int k = ((Integer) aobj[9]).intValue() - 1;
        _fld$989 = EffectBase._mth$317((String) aobj[10]);
        _fld$987 = EffectBase._mth$317((String) aobj[11]);
        _fld$986 = EffectBase._mth$317((String) aobj[12]);
        _fld$692 = ((Integer) aobj[13]).intValue() - 1;
        _fld$521 = ((Integer) aobj[14]).intValue() == 1;
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
        _fld$594 = new double[1001];
        _fld$595 = new double[1001];
        int i1 = 0;
        for (double d = 0.0D; i1 <= 1000; d += 0.001D) {
            _fld$594[i1] = Math.pow(d, 3.5499999999999998D);
            i1++;
        }

        i1 = 0;
        for (double d1 = 0.0D; i1 <= 1000; d1 += 0.001D) {
            _fld$595[i1] = Math.pow(d1, 0.44500000000000001D);
            i1++;
        }

        if (k >= 0) {
            _fld$359 = aimage[k];
            _fld$947 = rectangle.width;
            _fld$779 = rectangle.height;
            _fld$475 = EffectBase._mth$1054(_fld$359, _fld$947, _fld$779, component);
            if (!_fld$557) {
                _fld$665 = new Image[_fld$773];
                for (int l1 = 0; l1 < _fld$773; l1++) {
                    String s1 = "Lens Flare: " + (l1 + 1) + "/" + _fld$773;
                    ((Applet) component).showStatus(s1);
                    ((EffectPlayer) component)._fld$994 = s1;
                    ((Applet) component).repaint();
                    _fld$427 = new int[_fld$947 * _fld$779];
                    for (int j1 = 0; j1 < _fld$947 * _fld$779; j1++)
                        _fld$427[j1] = _fld$475[j1];

                    _mth$17(0, _fld$867, (double) l1 / (double) _fld$773);
                    _mth$16(m_nMode, _fld$921, _fld$922, _fld$899, _fld$871, _fld$872, _fld$721, _fld$722, _fld$945, 20, 20, false, 6, 3, _fld$572);
                    if (_fld$685 > 1) {
                        for (int k1 = 1; k1 < _fld$685; k1++) {
                            _mth$17(k1, _fld$867, (double) l1 / (double) _fld$773);
                            _mth$16(m_nMode, _fld$921, _fld$922, _fld$899, _fld$871, _fld$872, _fld$721, _fld$722, _fld$945, 20, 20, false, 6, 3, _fld$572);
                        }

                    }
                    _fld$665[l1] = component.createImage(new MemoryImageSource(_fld$947, _fld$779, _fld$427, 0, _fld$947));
                    _fld$427 = null;
                }

            } else {
                _fld$773 = 1;
                _fld$665 = new Image[_fld$773];
            }
        } else {
            _fld$947 = rectangle.width;
            _fld$779 = rectangle.height;
            if (_fld$557) {
                _fld$773 = 1;
                _fld$665 = new Image[_fld$773];
            } else {
                _fld$933 = l;
                return false;
            }
        }
        _mth$135(aaudioclip, _fld$692);
        aobj = null;
        return true;
    }

    private void _mth$135(AudioClip aaudioclip[], int i) {
        if (aaudioclip != null && i >= 0 && i < aaudioclip.length)
            _fld$516 = aaudioclip[i];
    }

    public Object Process(Component component, Object obj, Rectangle rectangle, Event event, int i) {
        if (obj == null || i > _fld$765 || i < _fld$914)
            return null;
        if (event != null && event.id != 505) {
            if (_fld$516 != null && !_fld$522) {
                _fld$522 = true;
                if (_fld$521)
                    _fld$516.loop();
                else
                    _fld$516.play();
            }
        } else {
            _mth$1064();
        }
        Image image = (Image) obj;
        Graphics g = image.getGraphics();
        g.clipRect(_fld$990.x, _fld$990.y, _fld$990.width, _fld$990.height);
        if (_fld$359 != null) {
            if (!_fld$557) {
                g.drawImage(_fld$665[_fld$734], _fld$756 + _fld$990.x, _fld$757 + _fld$990.y, null);
                _fld$734++;
                if (_fld$734 >= _fld$773)
                    _fld$734 = 0;
            } else {
                _fld$427 = new int[_fld$947 * _fld$779];
                for (int j = 0; j < _fld$947 * _fld$779; j++)
                    _fld$427[j] = _fld$475[j];

                if (_fld$623 > 1.0D)
                    _fld$623 = 0.0D;
                _mth$17(0, _fld$867, _fld$623);
                _mth$16(m_nMode, _fld$921, _fld$922, _fld$899, _fld$871, _fld$872, _fld$721, _fld$722, _fld$945, 20, 20, false, 6, 3, _fld$572);
                if (_fld$685 > 1) {
                    for (int k = 1; k < _fld$685; k++) {
                        _mth$17(k, _fld$867, _fld$623);
                        _mth$16(m_nMode, _fld$921, _fld$922, _fld$899, _fld$871, _fld$872, _fld$721, _fld$722, _fld$945, 20, 20, false, 6, 3, _fld$572);
                    }

                }
                _fld$665[0] = component.createImage(new MemoryImageSource(_fld$947, _fld$779, _fld$427, 0, _fld$947));
                g.drawImage(_fld$665[0], _fld$756 + _fld$990.x, _fld$757 + _fld$990.y, null);
                _fld$665[0] = null;
                _fld$427 = null;
                _fld$623 += 0.02D;
            }
        } else if (_fld$535) {
            _fld$427 = new int[_fld$947 * _fld$779];
            PixelGrabber pixelgrabber = new PixelGrabber(image, rectangle.x, rectangle.y, rectangle.width, rectangle.height, _fld$427, 0, rectangle.width);
            try {
                pixelgrabber.grabPixels();
            } catch (InterruptedException _ex) {
            }
            pixelgrabber = null;
            if (_fld$623 > 1.0D)
                _fld$623 = 0.0D;
            _mth$17(0, _fld$867, _fld$623);
            _mth$16(m_nMode, _fld$921, _fld$922, _fld$899, _fld$871, _fld$872, _fld$721, _fld$722, _fld$945, 20, 20, false, 6, 3, _fld$572);
            if (_fld$685 > 1) {
                for (int l = 1; l < _fld$685; l++) {
                    _mth$17(l, _fld$867, _fld$623);
                    _mth$16(m_nMode, _fld$921, _fld$922, _fld$899, _fld$871, _fld$872, _fld$721, _fld$722, _fld$945, 20, 20, false, 6, 3, _fld$572);
                }

            }
            _fld$665[0] = component.createImage(new MemoryImageSource(_fld$947, _fld$779, _fld$427, 0, _fld$947));
            g.drawImage(_fld$665[0], _fld$756 + _fld$990.x, _fld$757 + _fld$990.y, null);
            _fld$665[0] = null;
            _fld$427 = null;
            _fld$623 += 0.02D;
        }
        g.dispose();
        return null;
    }

    private int _mth$193(int i) {
        char c = '\u6471';
        char c1 = '\u3619';
        int j = 65535;
        int k = c * i + c1 & j;
        return k;
    }

    public void _mth$201() {
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

    public void _mth$1064() {
        if (_fld$516 != null && _fld$522) {
            _fld$522 = false;
            _fld$516.stop();
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
    private boolean _fld$522;
    private AudioClip _fld$516;
    private String _fld$989;
    private String _fld$986;
    private String _fld$987;
    private int _fld$933;
    private int _fld$685;
    private int _fld$867;
    private int m_nMode;
    private int _fld$921;
    private int _fld$922;
    private int _fld$899;
    private Color _fld$572;
    private int _fld$947;
    private int _fld$779;
    private int _fld$871;
    private int _fld$872;
    private int _fld$721;
    private int _fld$722;
    private int _fld$945;
    private double _fld$623;
    private double _fld$594[];
    private double _fld$595[];
    private Image _fld$359;
    private boolean _fld$535;
    private int _fld$475[];
    private int _fld$427[];
    private Image _fld$665[];
    private int _fld$734;
    private boolean _fld$557;
    public static final double _fld$182 = 3.1415926535897931D;
    public static final double _fld$191 = 1E-010D;
    public static final int _fld$84 = 0;
    public static final int _fld$80 = 1;
    public static final int _fld$83 = 2;
    public static final int _fld$81 = 3;
    public static final int _fld$82 = 4;
    public static final int _fld$140 = 0;
    public static final int _fld$141 = 1;
    public static final int _fld$142 = 2;
}
