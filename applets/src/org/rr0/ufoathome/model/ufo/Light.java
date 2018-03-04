package org.rr0.ufoathome.model.ufo;

import java.applet.Applet;
import java.applet.AudioClip;
import java.awt.*;
import java.awt.image.MemoryImageSource;
import java.awt.image.PixelGrabber;
import java.util.Vector;

public class Light extends EffectBase {

    public Light() {
        _fld$757 = 0;
        running = false;
        _fld$783 = 0;
        _fld$684 = 2;
        _fld$971 = new Point(0, 0);
        _fld$537 = false;
        _fld$885 = 300;
        _fld$608 = (double) _fld$885 / 100D;
        _fld$902 = 2;
        _fld$734 = 0;
        _fld$557 = true;
        _fld$524 = false;
        _fld$973 = new Point(0, 0);
    }

    private int _mth$3(double d, double d2) {
        double d3 = Math.min(1.0D, (d * d2) / 4D) * 255D;
        int i = (int) d3;
        return i;
    }

    private void _mth$5(int i, int j, int ai[], int ai1[]) {
        long l = 14536L;
        int k = (360 * _fld$734) / _fld$773 - 180;
        double d10 = ((double) k / 180D) * Math.PI;
        double ad[] = new double[200];
        double ad1[] = new double[200];
        double ad2[] = new double[200];
        int i1 = 10;
        int l1 = _fld$971.x;
        int i2 = _fld$971.y;
        double d29 = l1;
        double d30 = i2;
        double d1;
        if (_fld$735 > 0)
            d1 = 6.2831853071795862D / (double) _fld$735;
        else
            d1 = 0.0D;
        for (int i40 = 0; i40 < _fld$735; i40++) {
            l = _mth$193(l);
            double d = 1.0D + ((double) _fld$945 / 100D) * ((2D * (double) l) / 65535D);
            ad[i40] = d * ((double) _fld$736 / 100D);
            ad2[i40] = Math.min((((double) i1 * Math.PI) / 180D) * d, 0.52359877559829882D);
            ad1[i40] = d1 * (((double) i40 + d) - 1.0D) + d10;
        }

        for (int j40 = 0; j40 < _fld$735; j40++) {
            double d8 = ad[j40];
            if (d8 > 0.0D) {
                if (i >= j)
                    d8 *= (double) i / 2D;
                else
                    d8 *= (double) j / 2D;
                double d9 = d8 * d8;
                double d2 = ad1[j40];
                double d4 = Math.cos(d2);
                double d5 = Math.sin(d2);
                double d11 = d8 * d4;
                double d13 = d8 * d5;
                if (ad2[j40] > 0.0D) {
                    d8 *= 2D;
                    double d3 = ad2[j40];
                    double d6 = Math.cos(d3);
                    double d7 = Math.sin(d3);
                    double d31 = d29 + d8 * (d4 * d6 + d5 * d7);
                    double d33 = d30 + d8 * (d5 * d6 - d4 * d7);
                    double d35 = d29 + d8 * (d4 * d6 - d5 * d7);
                    double d37 = d30 + d8 * (d5 * d6 + d4 * d7);
                    if (Math.abs(d11) >= Math.abs(d13)) {
                        int j29;
                        int i30;
                        if (d11 > 0.0D) {
                            j29 = (int) Math.ceil(d29);
                            i30 = (int) Math.floor(Math.max(d31, d35));
                        } else {
                            j29 = (int) Math.ceil(Math.min(d31, d35));
                            i30 = (int) Math.floor(d29);
                            double d39 = d31;
                            d31 = d35;
                            d35 = d39;
                            double d44 = d33;
                            d33 = d37;
                            d37 = d44;
                        }
                        j29 = Math.max(j29, 0);
                        i30 = Math.min(i30, i - 1);
                        for (int j27 = j29; j27 <= i30; j27++) {
                            double d15 = ((double) j27 - d29) / (d31 - d29);
                            double d17 = ((double) j27 - d29) / (d35 - d29);
                            double d22;
                            if (d15 <= 1.0D) {
                                d22 = d30 + d15 * (d33 - d30);
                            } else {
                                d22 = d33 + (((double) j27 - d31) / (d35 - d31)) * (d37 - d33);
                                d15 = 1.0D;
                            }
                            double d14;
                            if (d17 <= 1.0D) {
                                d14 = d30 + d17 * (d37 - d30);
                            } else {
                                d14 = d33 + (((double) j27 - d31) / (d35 - d31)) * (d37 - d33);
                                d17 = 1.0D;
                            }
                            int l30 = (int) Math.floor(d22);
                            if (l30 >= 0 && l30 < j) {
                                double d23 = 1.0D - (d22 - (double) l30);
                                double d53 = 1.0D - d15;
                                int j37 = j27 + l30 * i;
                                int j2 = ai[j37];
                                int l4 = (j2 & 0xff000000) >>> 24;
                                int l14 = ai1[j37];
                                int j17 = (l14 & 0xff000000) >>> 24;
                                int l19 = (l14 & 0xff0000) >> 16;
                                int j22 = (l14 & 0xff00) >> 8;
                                int l24 = l14 & 0xff;
                                int l34;
                                if (m_nMode == 0) {
                                    if (l4 > 0)
                                        l34 = _mth$3(d53, d23);
                                    else
                                        l34 = _mth$3(d53, d23);
                                } else if (m_nMode == 1) {
                                    if (l4 > 0)
                                        l34 = _mth$3(d53, d23);
                                    else
                                        l34 = 0;
                                } else {
                                    l34 = _mth$3(d53, d23);
                                }
                                int j32 = j17 + l34;
                                j17 = Math.min(j32, 255);
                                l14 = j17 << 24 | l19 << 16 | j22 << 8 | l24;
                                ai1[j37] = l14;
                                l30++;
                            } else {
                                if (l30 < 0)
                                    l30 = 0;
                                if (l30 >= j)
                                    l30 = j - 1;
                            }
                            int k31 = (int) Math.ceil(d14);
                            if (k31 >= 0 && k31 < j) {
                                if (k31 >= l30) {
                                    double d24 = 1.0D - ((double) k31 - d14);
                                    double d54 = 1.0D - d17;
                                    int k37 = j27 + k31 * i;
                                    int k2 = ai[k37];
                                    int i5 = (k2 & 0xff000000) >>> 24;
                                    int i15 = ai1[k37];
                                    int k17 = (i15 & 0xff000000) >>> 24;
                                    int i20 = (i15 & 0xff0000) >> 16;
                                    int k22 = (i15 & 0xff00) >> 8;
                                    int i25 = i15 & 0xff;
                                    int i35;
                                    if (m_nMode == 0) {
                                        if (i5 > 0)
                                            i35 = _mth$3(d54, d24);
                                        else
                                            i35 = _mth$3(d54, d24);
                                    } else if (m_nMode == 1) {
                                        if (i5 > 0)
                                            i35 = _mth$3(d54, d24);
                                        else
                                            i35 = 0;
                                    } else {
                                        i35 = _mth$3(d54, d24);
                                    }
                                    int k32 = k17 + i35;
                                    k17 = Math.min(k32, 255);
                                    i15 = k17 << 24 | i20 << 16 | k22 << 8 | i25;
                                    ai1[k37] = i15;
                                }
                                k31--;
                            } else {
                                if (k31 < 0)
                                    k31 = 0;
                                if (k31 >= j)
                                    k31 = j - 1;
                            }
                            d14 -= d22;
                            for (int j28 = l30; j28 <= k31; j28++) {
                                double d19;
                                if (d14 > 0.0D)
                                    d19 = ((double) j28 - d22) / d14;
                                else
                                    d19 = 0.0D;
                                d19 = d15 * (1.0D - d19) + d17 * d19;
                                double d55;
                                if (d19 >= 0.0D && d19 <= 1.0D)
                                    d55 = 1.0D - d19;
                                else
                                    d55 = 0.0D;
                                int l37 = j27 + j28 * i;
                                int l2 = ai[l37];
                                int j5 = (l2 & 0xff000000) >>> 24;
                                int j15 = ai1[l37];
                                int l17 = (j15 & 0xff000000) >>> 24;
                                int j20 = (j15 & 0xff0000) >> 16;
                                int l22 = (j15 & 0xff00) >> 8;
                                int j25 = j15 & 0xff;
                                int j35;
                                if (m_nMode == 0) {
                                    if (j5 > 0)
                                        j35 = _mth$3(d55, 1.0D);
                                    else
                                        j35 = _mth$3(d55, 1.0D);
                                } else if (m_nMode == 1) {
                                    if (j5 > 0)
                                        j35 = _mth$3(d55, 1.0D);
                                    else
                                        j35 = 0;
                                } else {
                                    j35 = _mth$3(d55, 1.0D);
                                }
                                int l32 = l17 + j35;
                                l17 = Math.min(l32, 255);
                                j15 = l17 << 24 | j20 << 16 | l22 << 8 | j25;
                                ai1[l37] = j15;
                            }

                        }

                    } else {
                        int i31;
                        int l31;
                        if (d13 > 0.0D) {
                            i31 = (int) Math.ceil(d30);
                            l31 = (int) Math.floor(Math.max(d33, d37));
                            double d40 = d31;
                            d31 = d35;
                            d35 = d40;
                            double d45 = d33;
                            d33 = d37;
                            d37 = d45;
                        } else {
                            i31 = (int) Math.ceil(Math.min(d33, d37));
                            l31 = (int) Math.floor(d30);
                        }
                        i31 = (int) Math.max(i31, 0.0D);
                        l31 = (int) Math.min(l31, j - 1);
                        for (int k28 = i31; k28 <= l31; k28++) {
                            double d16 = ((double) k28 - d30) / (d33 - d30);
                            double d18 = ((double) k28 - d30) / (d37 - d30);
                            double d21;
                            if (d16 <= 1.0D) {
                                d21 = d29 + d16 * (d31 - d29);
                            } else {
                                d21 = d31 + (((double) k28 - d33) / (d37 - d33)) * (d35 - d31);
                                d16 = 1.0D;
                            }
                            double d12;
                            if (d18 <= 1.0D) {
                                d12 = d29 + d18 * (d35 - d29);
                            } else {
                                d12 = d31 + (((double) k28 - d33) / (d37 - d33)) * (d35 - d31);
                                d18 = 1.0D;
                            }
                            int k29 = (int) Math.floor(d21);
                            if (k29 >= 0 && k29 < i) {
                                double d25 = 1.0D - (d21 - (double) k29);
                                double d56;
                                if (d16 >= 0.0D && d16 <= 1.0D)
                                    d56 = 1.0D - d16;
                                else
                                    d56 = 0.0D;
                                int i38 = k29 + k28 * i;
                                int i3 = ai[i38];
                                int k5 = (i3 & 0xff000000) >>> 24;
                                int k15 = ai1[i38];
                                int i18 = (k15 & 0xff000000) >>> 24;
                                int k20 = (k15 & 0xff0000) >> 16;
                                int i23 = (k15 & 0xff00) >> 8;
                                int k25 = k15 & 0xff;
                                int k35;
                                if (m_nMode == 0) {
                                    if (k5 > 0)
                                        k35 = _mth$3(d56, d25);
                                    else
                                        k35 = _mth$3(d56, d25);
                                } else if (m_nMode == 1) {
                                    if (k5 > 0)
                                        k35 = _mth$3(d56, d25);
                                    else
                                        k35 = 0;
                                } else {
                                    k35 = _mth$3(d56, d25);
                                }
                                int i33 = i18 + k35;
                                i18 = Math.min(i33, 255);
                                k15 = i18 << 24 | k20 << 16 | i23 << 8 | k25;
                                ai1[i38] = k15;
                                k29++;
                            } else {
                                if (k29 < 0)
                                    k29 = 0;
                                if (k29 >= i)
                                    k29 = i - 1;
                            }
                            int j30 = (int) Math.ceil(d12);
                            if (j30 >= 0 && j30 < i) {
                                if (j30 >= k29) {
                                    double d26 = 1.0D - ((double) j30 - d12);
                                    double d57;
                                    if (d18 >= 0.0D && d18 <= 1.0D)
                                        d57 = 1.0D - d18;
                                    else
                                        d57 = 0.0D;
                                    int j38 = j30 + k28 * i;
                                    int l15 = ai1[j38];
                                    int j18 = (l15 & 0xff000000) >>> 24;
                                    int l20 = (l15 & 0xff0000) >> 16;
                                    int j23 = (l15 & 0xff00) >> 8;
                                    int l25 = l15 & 0xff;
                                    int l35;
                                    if (m_nMode == 0) {
                                        if (j18 > 0)
                                            l35 = _mth$3(d57, d26);
                                        else
                                            l35 = _mth$3(d57, d26);
                                    } else if (m_nMode == 1) {
                                        if (j18 > 0)
                                            l35 = _mth$3(d57, d26);
                                        else
                                            l35 = 0;
                                    } else {
                                        l35 = _mth$3(d57, d26);
                                    }
                                    int j33 = j18 + l35;
                                    j18 = Math.min(j33, 255);
                                    l15 = j18 << 24 | l20 << 16 | j23 << 8 | l25;
                                    ai1[j38] = l15;
                                }
                                j30--;
                            } else {
                                if (j30 < 0)
                                    j30 = 0;
                                if (j30 >= i)
                                    j30 = i - 1;
                            }
                            d12 -= d21;
                            for (int k27 = k29; k27 <= j30; k27++) {
                                double d20;
                                if (d12 > 0.0D)
                                    d20 = ((double) k27 - d21) / d12;
                                else
                                    d20 = 0.0D;
                                d20 = d16 * (1.0D - d20) + d18 * d20;
                                double d58;
                                if (d20 >= 0.0D && d20 <= 1.0D)
                                    d58 = 1.0D - d20;
                                else
                                    d58 = 0.0D;
                                int k38 = k27 + k28 * i;
                                int k3 = ai[k38];
                                int i6 = (k3 & 0xff000000) >>> 24;
                                int i16 = ai1[k38];
                                int k18 = (i16 & 0xff000000) >>> 24;
                                int i21 = (i16 & 0xff0000) >> 16;
                                int k23 = (i16 & 0xff00) >> 8;
                                int i26 = i16 & 0xff;
                                int i36;
                                if (m_nMode == 0) {
                                    if (i6 > 0)
                                        i36 = _mth$3(d58, 1.0D);
                                    else
                                        i36 = _mth$3(d58, 1.0D);
                                } else if (m_nMode == 1) {
                                    if (i6 > 0)
                                        i36 = _mth$3(d58, 1.0D);
                                    else
                                        i36 = 0;
                                } else {
                                    i36 = _mth$3(d58, 1.0D);
                                }
                                int k33 = k18 + i36;
                                k18 = Math.min(k33, 255);
                                i16 = k18 << 24 | i21 << 16 | k23 << 8 | i26;
                                ai1[k38] = i16;
                            }

                        }

                    }
                } else {
                    double d32 = d29;
                    double d34 = d30;
                    double d36 = d32 + d11;
                    double d38 = d34 + d13;
                    if (Math.abs(d11) >= Math.abs(d13)) {
                        if (d11 < 0.0D) {
                            double d41 = d32;
                            d32 = d36;
                            d36 = d41;
                            double d46 = d34;
                            d34 = d38;
                            d38 = d46;
                        }
                        int l29 = Math.max((int) Math.ceil(d32), 0);
                        int k30 = Math.min((int) Math.floor(d36), i - 1);
                        for (int l27 = l29; l27 <= k30; l27++) {
                            double d47 = _mth$94(d32, d34, d36, d38, 0, l27);
                            int l28 = (int) Math.floor(d47);
                            if (l28 >= 0 && l28 < j) {
                                double d51 = ((double) l27 - d29) * ((double) l27 - d29) + (d47 - d30) * (d47 - d30);
                                if (d51 <= d9) {
                                    double d49 = Math.sqrt(d51) / d8;
                                    double d59 = 1.0D - d49;
                                    double d27 = 1.0D - (d47 - (double) l28);
                                    int l38 = l27 + l28 * i;
                                    int l3 = ai[l38];
                                    int j6 = (l3 & 0xff000000) >>> 24;
                                    int j16 = ai1[l38];
                                    int l18 = (j16 & 0xff000000) >>> 24;
                                    int j21 = (j16 & 0xff0000) >> 16;
                                    int l23 = (j16 & 0xff00) >> 8;
                                    int j26 = j16 & 0xff;
                                    int j36;
                                    if (m_nMode == 0) {
                                        if (j6 > 0)
                                            j36 = _mth$3(d59, d27);
                                        else
                                            j36 = _mth$3(d59, d27);
                                    } else if (m_nMode == 1) {
                                        if (j6 > 0)
                                            j36 = _mth$3(d59, d27);
                                        else
                                            j36 = 0;
                                    } else {
                                        j36 = _mth$3(d59, d27);
                                    }
                                    int l33 = l18 + j36;
                                    l18 = Math.min(l33, 255);
                                    j16 = l18 << 24 | j21 << 16 | l23 << 8 | j26;
                                    ai1[l38] = j16;
                                    if (++l28 < j) {
                                        d27 = 1.0D - d27;
                                        int i39 = l27 + l28 * i;
                                        int i4 = ai[i39];
                                        int k6 = (i4 & 0xff000000) >>> 24;
                                        int k16 = ai1[i39];
                                        int i19 = (k16 & 0xff000000) >>> 24;
                                        int k21 = (k16 & 0xff0000) >> 16;
                                        int i24 = (k16 & 0xff00) >> 8;
                                        int k26 = k16 & 0xff;
                                        int k36;
                                        if (m_nMode == 0) {
                                            if (k6 > 0)
                                                k36 = _mth$3(d59, d27);
                                            else
                                                k36 = _mth$3(d59, d27);
                                        } else if (m_nMode == 1) {
                                            if (k6 > 0)
                                                k36 = _mth$3(d59, d27);
                                            else
                                                k36 = 0;
                                        } else {
                                            k36 = _mth$3(d59, d27);
                                        }
                                        int i34 = i19 + k36;
                                        i19 = Math.min(i34, 255);
                                        k16 = i19 << 24 | k21 << 16 | i24 << 8 | k26;
                                        ai1[i39] = k16;
                                    }
                                }
                            }
                        }

                    } else {
                        if (d13 < 0.0D) {
                            double d42 = d32;
                            d32 = d36;
                            d36 = d42;
                            double d48 = d34;
                            d34 = d38;
                            d38 = d48;
                        }
                        int j31 = Math.max((int) Math.ceil(d34), 0);
                        int i32 = Math.min((int) Math.floor(d38), j - 1);
                        for (int i29 = j31; i29 <= i32; i29++) {
                            double d43 = _mth$94(d32, d34, d36, d38, 1, i29);
                            int i28 = (int) Math.floor(d43);
                            if ((int) d43 >= 0 && (int) d43 < i) {
                                double d52 = ((double) i29 - d30) * ((double) i29 - d30) + (d43 - d29) * (d43 - d29);
                                if (d52 <= d9) {
                                    double d50 = Math.sqrt(d52) / d8;
                                    double d60 = 1.0D - d50;
                                    double d28 = 1.0D - (d43 - (double) i28);
                                    int j39 = i28 + i29 * i;
                                    int j4 = ai[j39];
                                    int l6 = (j4 & 0xff000000) >>> 24;
                                    int l16 = ai1[j39];
                                    int j19 = (l16 & 0xff000000) >>> 24;
                                    int l21 = (l16 & 0xff0000) >> 16;
                                    int j24 = (l16 & 0xff00) >> 8;
                                    int l26 = l16 & 0xff;
                                    int l36;
                                    if (m_nMode == 0) {
                                        if (l6 > 0)
                                            l36 = _mth$3(d60, d28);
                                        else
                                            l36 = _mth$3(d60, d28);
                                    } else if (m_nMode == 1) {
                                        if (l6 > 0)
                                            l36 = _mth$3(d60, d28);
                                        else
                                            l36 = 0;
                                    } else {
                                        l36 = _mth$3(d60, d28);
                                    }
                                    int j34 = j19 + l36;
                                    j19 = Math.min(j34, 255);
                                    l16 = j19 << 24 | l21 << 16 | j24 << 8 | l26;
                                    ai1[j39] = l16;
                                    if (++i28 < i) {
                                        d28 = 1.0D - d28;
                                        int k39 = i28 + i29 * i;
                                        int k4 = ai[k39];
                                        int i7 = (k4 & 0xff000000) >>> 24;
                                        int i17 = ai1[k39];
                                        int k19 = (i17 & 0xff000000) >>> 24;
                                        int i22 = (i17 & 0xff0000) >> 16;
                                        int k24 = (i17 & 0xff00) >> 8;
                                        int i27 = i17 & 0xff;
                                        int i37;
                                        if (m_nMode == 0) {
                                            if (i7 > 0)
                                                i37 = _mth$3(d60, d28);
                                            else
                                                i37 = _mth$3(d60, d28);
                                        } else if (m_nMode == 1) {
                                            if (i7 > 0)
                                                i37 = _mth$3(d60, d28);
                                            else
                                                i37 = 0;
                                        } else {
                                            i37 = _mth$3(d60, d28);
                                        }
                                        int k34 = k19 + i37;
                                        k19 = Math.min(k34, 255);
                                        i17 = k19 << 24 | i22 << 16 | k24 << 8 | i27;
                                        ai1[k39] = i17;
                                    }
                                }
                            }
                        }

                    }
                }
            }
        }

    }

    private void _mth$6(int i, int j, int ai[], int ai1[]) {
        int j2 = _fld$971.x;
        int k2 = _fld$971.y;
        double d7 = (double) _fld$717 / 100D;
        double d = _fld$737;
        double d1 = d * d;
        if (d == 0.0D) {
            int j1 = 0;
            for (int l2 = 0; l2 < i; l2++) {
                for (int j3 = 0; j3 < j; j3++) {
                    ai1[j1] = ai[j1];
                    j1++;
                }

            }

            return;
        }
        int k1 = 0;
        int k3 = -k2;
        double d8 = (double) _fld$573.getRed() * d7;
        double d9 = (double) _fld$573.getGreen() * d7;
        double d10 = (double) _fld$573.getBlue() * d7;
        int l3 = (int) Math.min(d8, 255D);
        int i4 = (int) Math.min(d9, 255D);
        int j4 = (int) Math.min(d10, 255D);
        int k4 = l3 << 16 | i4 << 8 | j4;
        for (int l4 = 0; l4 < j; l4++) {
            double d3 = k3 * k3;
            int i3 = -j2;
            for (int i5 = 0; i5 < i; i5++) {
                double d2 = i3 * i3;
                double d5 = d2 + d3;
                if (d5 < d1) {
                    double d4 = Math.sqrt(d5) / d;
                    double d6 = 1.0D - d4;
                    double d11 = Math.min(d6, 1.0D) * 255D;
                    int i1 = ai[k1];
                    int l = i1 & 0xff000000;
                    if (l != 0)
                        l = (int) d11;
                    else if (m_nMode == 1)
                        l = 0;
                    else
                        l = (int) d11;
                    int k = l << 24 | k4;
                    ai1[k1] = k;
                } else {
                    ai1[k1] = k4;
                }
                k1++;
                i3++;
            }

            k3++;
        }

    }

    public void cleanup() {
        _fld$443 = null;
        _fld$420 = null;
        _fld$423 = null;
    }

    private void _mth$92(int i, int j, int ai[]) {
        int ai1[] = new int[i * j];
        int k = 0;
        int ai2[][] = new int[3][3];
        int ai3[][] = new int[3][3];
        int ai4[][] = new int[3][3];
        for (int j1 = 0; j1 < i; j1++)
            ai1[j1] = ai[j1];

        for (int k1 = 0; k1 < i; k1++)
            ai1[(j - 1) * i + k1] = ai[(j - 1) * i + k1];

        for (int l1 = 0; l1 < j; l1++)
            ai1[l1 * i] = ai[l1 * i];

        for (int i2 = 0; i2 < j; i2++)
            ai1[(i2 * i + i) - 1] = ai[(i2 * i + i) - 1];

        for (int j2 = 1; j2 < j - 1; j2++) {
            for (int k2 = 1; k2 < i - 1;) {
                ai2[0][0] = ai[((j2 - 1) * i + k2) - 1];
                ai3[0][0] = (ai2[0][0] & 0xff000000) >>> 24;
                ai4[0][0] = ai2[0][0] & 0xffffff;
                ai2[0][1] = ai[(j2 - 1) * i + k2];
                ai3[0][1] = (ai2[0][1] & 0xff000000) >>> 24;
                ai4[0][1] = ai2[0][1] & 0xffffff;
                ai2[0][2] = ai[(j2 - 1) * i + k2 + 1];
                ai3[0][2] = (ai2[0][2] & 0xff000000) >>> 24;
                ai4[0][2] = ai2[0][2] & 0xffffff;
                ai2[1][0] = ai[(j2 * i + k2) - 1];
                ai3[1][0] = (ai2[1][0] & 0xff000000) >>> 24;
                ai4[1][0] = ai2[1][0] & 0xffffff;
                ai2[1][1] = ai[j2 * i + k2];
                ai3[1][1] = (ai2[1][1] & 0xff000000) >>> 24;
                ai4[1][1] = ai2[1][1] & 0xffffff;
                ai2[1][2] = ai[j2 * i + k2 + 1];
                ai3[1][2] = (ai2[1][2] & 0xff000000) >>> 24;
                ai4[1][2] = ai2[1][2] & 0xffffff;
                ai2[2][0] = ai[((j2 + 1) * i + k2) - 1];
                ai3[2][0] = (ai2[2][0] & 0xff000000) >>> 24;
                ai4[2][0] = ai2[2][0] & 0xffffff;
                ai2[2][1] = ai[(j2 + 1) * i + k2];
                ai3[2][1] = (ai2[2][1] & 0xff000000) >>> 24;
                ai4[2][1] = ai2[2][1] & 0xffffff;
                ai2[2][2] = ai[(j2 + 1) * i + k2 + 1];
                ai3[2][2] = (ai2[2][2] & 0xff000000) >>> 24;
                ai4[2][2] = ai2[2][2] & 0xffffff;
                int l = 0;
                for (int i3 = 0; i3 < 3; i3++) {
                    for (int k3 = 0; k3 < 3; k3++)
                        l += ai3[i3][k3];

                }

                int i1 = l / 9;
                int l3 = i1 << 24 | ai4[1][1];
                ai1[j2 * i + k2] = l3;
                k2++;
                k++;
            }

        }

        k = 0;
        for (int l2 = 0; l2 < i; l2++) {
            for (int j3 = 0; j3 < j;) {
                ai[k] = ai1[k];
                j3++;
                k++;
            }

        }

        ai1 = null;
    }

    private void _mth$93(int i, int j, int k, int ai[]) {
        int ai1[] = new int[i * j];
        int l = 0;
        for (int i1 = 0; i1 < j; i1++) {
            for (int j1 = 0; j1 < i; j1++) {
                ai1[l] = ai[l];
                l++;
            }

        }

        for (int k1 = 0; k1 < k; k1++)
            _mth$92(i, j, ai1);

        double d = (double) _fld$717 / 100D;
        l = 0;
        for (int k2 = 0; k2 < j; k2++) {
            for (int l2 = 0; l2 < i; l2++) {
                int l1 = ai1[l];
                int i2 = (l1 & 0xff000000) >>> 24;
                int j2 = l1 & 0xffffff;
                i2 = Math.min((int) ((double) i2 * d), 255);
                l1 = i2 << 24 | j2;
                ai[l] = l1;
                l++;
            }

        }

        ai1 = null;
    }

    private double _mth$94(double d, double d1, double d2, double d3, int i, double d4) {
        double d5 = d2 - d;
        double d6 = d3 - d1;
        double d7;
        if (i == 0) {
            if (Math.abs(d5) == 0.0D)
                d7 = d1;
            else
                d7 = (d6 / d5) * (d4 - d) + d1;
        } else if (Math.abs(d6) == 0.0D)
            d7 = d;
        else
            d7 = (d5 / d6) * (d4 - d1) + d;
        return d7;
    }

    private void _mth$100(Component component) {
        int i = _fld$990.width;
        int j = _fld$990.height;
        Image image = component.createImage(i, j);
        Graphics g = image.getGraphics();
        g.setColor(Color.black);
        g.fillRect(0, 0, i, j);
        g.setColor(Color.white);
        displayMessages(g, messages, _fld$358, _fld$684, new Rectangle(0, 0, i, j), 0, _fld$757);
        _fld$443 = EffectBase.getImageMemory(image, new Rectangle(0, 0, i, j), true, Color.black.getRGB());
        image = null;
    }

    public boolean _mth$134(Component component, Rectangle rectangle, int i, int j, MediaTracker mediatracker, Image aimage[], boolean aflag[],
                            AudioClip aaudioclip[], boolean flag, boolean flag1, String s) {
        _fld$990 = new Rectangle(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
        if (_fld$990.height <= 0 || _fld$990.width <= 0)
            return false;
        Object aobj[] = {
            new String(), new String("Helvetica"), new Color(255, 0, 0), new Integer(0), new Integer(16), new Integer(2), new Integer(0), new Integer(20), new Integer(20), new Integer(100),
            new Color(255, 255, 255), new Integer(10), new Integer(0), new Integer(3), new Integer(1), null, null, null, new Integer(0), new Integer(1)
        };
        EffectBase.parser(s, aobj, "|");
        String s1 = EffectBase._mth$317((String) aobj[0]);
        String s2 = (String) aobj[1];
        _fld$581 = (Color) aobj[2];
        int k = ((Integer) aobj[3]).intValue();
        int l = Math.min(255, ((Integer) aobj[4]).intValue());
        s2 = _mth$289(s2, k);
        _fld$358 = new Font(s2, k, l);
        _fld$684 = ((Integer) aobj[5]).intValue();
        _fld$924 = ((Integer) aobj[6]).intValue();
        if (rectangle.width > rectangle.height)
            _fld$924 = ((rectangle.width / 2) * _fld$924) / 100 + 1;
        else
            _fld$924 = ((rectangle.height / 2) * _fld$924) / 100 + 1;
        _fld$911 = ((Integer) aobj[7]).intValue();
        if (rectangle.width > rectangle.height)
            _fld$911 = ((rectangle.width / 2) * _fld$911) / 100;
        else
            _fld$911 = ((rectangle.height / 2) * _fld$911) / 100;
        _fld$905 = ((Integer) aobj[8]).intValue();
        _fld$717 = ((Integer) aobj[9]).intValue();
        _fld$573 = (Color) aobj[10];
        _fld$945 = ((Integer) aobj[11]).intValue();
        m_nMode = ((Integer) aobj[12]).intValue();
        _fld$904 = 11 - ((Integer) aobj[13]).intValue();
        _fld$881 = ((Integer) aobj[14]).intValue();
        _fld$773 = _fld$881 * 5;
        _fld$989 = EffectBase._mth$317((String) aobj[15]);
        _fld$987 = EffectBase._mth$317((String) aobj[16]);
        _fld$986 = EffectBase._mth$317((String) aobj[17]);
        _fld$692 = ((Integer) aobj[18]).intValue() - 1;
        _fld$521 = ((Integer) aobj[19]).intValue() == 1;
        if (!_fld$537 && !InitText(component, _fld$990, s1))
            return false;
        _fld$914 = i;
        _fld$765 = j;
        int i1 = j - i;
        if (i1 < 20)
            return false;
        _fld$933 = _fld$904 * 20;
        if (i1 < _fld$933)
            _fld$933 = i1;
        _fld$535 = flag1;
        _fld$640 = flag;
        _fld$420 = new int[_fld$990.width * _fld$990.height];
        if (_fld$535) {
            _mth$100(component);
            _mth$136();
            _fld$423 = new int[_fld$773][rectangle.width * rectangle.height];
            int j1 = _fld$990.width;
            int k1 = _fld$990.height;
            _fld$971.x = _fld$990.width;
            _fld$971.y = _fld$757 + _fld$783 / 2;
            int l1 = (_fld$990.width * 2) / _fld$773;
            double d = (4D * _fld$608) / (double) _fld$773;
            _fld$737 = _fld$924;
            _fld$736 = _fld$911;
            _fld$735 = _fld$905;
            for (int i2 = 0; i2 < _fld$773; i2++) {
                String s3 = "Light Bulb: " + (i2 + 1) + "/" + _fld$773;
                ((Applet) component).showStatus(s3);
                ((EffectPlayer) component)._fld$994 = s3;
                ((Applet) component).repaint();
                if (i2 < _fld$773 / 2) {
                    _fld$971.x = i2 * l1;
                    if (i2 == 0) {
                        _fld$737 = _fld$924;
                        _fld$736 = _fld$911;
                        _fld$735 = _fld$905;
                    } else if (i2 < _fld$773 / 4) {
                        _fld$737 += (int) (d * (double) _fld$924);
                        _fld$736 += (int) (d * (double) _fld$911);
                        _fld$735 += (int) (d * (double) _fld$905);
                    } else {
                        _fld$737 -= (int) (d * (double) _fld$924);
                        _fld$736 -= (int) (d * (double) _fld$911);
                        _fld$735 -= (int) (d * (double) _fld$905);
                    }
                } else {
                    _fld$971.x = _fld$990.width - (i2 - _fld$773 / 2) * l1;
                    if (i2 < (3 * _fld$773) / 4) {
                        _fld$737 += (int) (d * (double) _fld$924);
                        _fld$736 += (int) (d * (double) _fld$911);
                        _fld$735 += (int) (d * (double) _fld$905);
                    } else {
                        _fld$737 -= (int) (d * (double) _fld$924);
                        _fld$736 -= (int) (d * (double) _fld$911);
                        _fld$735 -= (int) (d * (double) _fld$905);
                    }
                }
                _fld$734 = i2;
                _mth$6(j1, k1, _fld$443, _fld$423[i2]);
                _mth$5(j1, k1, _fld$443, _fld$423[i2]);
                if (m_nMode > 0)
                    _mth$93(j1, k1, _fld$902, _fld$423[i2]);
            }

        } else {
            _fld$933 = i1;
        }
        _mth$135(aaudioclip, _fld$692);
        aobj = null;
        return true;
    }

    private void _mth$135(AudioClip aaudioclip[], int i) {
        if (aaudioclip != null && i >= 0 && i < aaudioclip.length)
            audio = aaudioclip[i];
    }

    private boolean InitText(Component component, Rectangle rectangle, String s) {
        Image image = component.createImage(1, 1);
        Graphics g = image.getGraphics();
        Font font = g.getFont();
        g.setFont(_fld$358);
        int ai[] = new int[1];
        messages = _mth$102(g, _fld$358, s, ai, 65535);
        FontMetrics fontmetrics = g.getFontMetrics();
        if (messages != null) {
            _fld$783 = messages.size() * fontmetrics.getHeight();
        }
        g.setFont(font);
        _fld$757 = (rectangle.height - _fld$783) / 2;
        return true;
    }

    private void _mth$136() {
        int i = _fld$990.width;
        int j = _fld$990.height;
        int l = _fld$581.getRed();
        int i1 = _fld$581.getGreen();
        int j1 = _fld$581.getBlue();
        int k1 = l << 16 | i1 << 8 | j1;
        int l1 = 0;
        for (int i2 = 0; i2 < i; i2++) {
            for (int j2 = 0; j2 < j; j2++) {
                int k = _fld$443[l1] & 0xff000000;
                _fld$443[l1] = k1 | k;
                l1++;
            }

        }

    }

    public boolean _mth$138() {
        return true;
    }

    private void _mth$170(int i, int j, int ai[], int ai1[], int ai2[]) {
        int j4 = 0;
        for (int k5 = 0; k5 < j; k5++) {
            for (int l5 = 0; l5 < i; l5++) {
                int i3 = ai[j4];
                int k3 = (i3 & 0xff0000) >> 16;
                int l3 = (i3 & 0xff00) >> 8;
                int i4 = i3 & 0xff;
                int k = ai1[j4];
                int l = (k & 0xff000000) >>> 24;
                int i1 = (k & 0xff0000) >> 16;
                int j1 = (k & 0xff00) >> 8;
                int k1 = k & 0xff;
                int l1 = ai2[j4];
                int i2 = (l1 & 0xff000000) >>> 24;
                int j2 = (l1 & 0xff0000) >> 16;
                int k2 = (l1 & 0xff00) >> 8;
                int l2 = l1 & 0xff;
                char c;
                if (l > 0 || i2 > 0)
                    c = '\377';
                else
                    c = '\0';
                double d = (double) i2 / 255D;
                double d2 = (double) l / 255D;
                int k4;
                int l4;
                int i5;
                if (m_nMode == 0) {
                    double d3;
                    if (l < 255) {
                        k4 = (int) ((double) i1 * d2 + (double) j2 * d * (1.0D - d2));
                        k4 = Math.min(k4, 255);
                        l4 = (int) ((double) j1 * d2 + (double) k2 * d * (1.0D - d2));
                        l4 = Math.min(l4, 255);
                        i5 = (int) ((double) k1 * d2 + (double) l2 * d * (1.0D - d2));
                        i5 = Math.min(i5, 255);
                        d3 = Math.min((d2 + d) - d2 * d, 1.0D);
                    } else {
                        k4 = i1;
                        l4 = j1;
                        i5 = k1;
                        d3 = 1.0D;
                    }
                    double d5 = 1.0D - d3;
                    if (d5 > 0.0D) {
                        k4 = (int) ((double) k4 + (double) k3 * d5);
                        k4 = Math.min(k4, 255);
                        l4 = (int) ((double) l4 + (double) l3 * d5);
                        l4 = Math.min(l4, 255);
                        i5 = (int) ((double) i5 + (double) i4 * d5);
                        i5 = Math.min(i5, 255);
                    }
                } else {
                    k4 = (int) ((double) i1 * d2 + (double) j2 * d);
                    k4 = Math.min(k4, 255);
                    l4 = (int) ((double) j1 * d2 + (double) k2 * d);
                    l4 = Math.min(l4, 255);
                    i5 = (int) ((double) k1 * d2 + (double) l2 * d);
                    i5 = Math.min(i5, 255);
                    double d4 = Math.min((d2 + d) - d2 * d, 1.0D);
                    if (d4 > 0.0D) {
                        k4 = (int) ((double) k4 + (double) k3 * (1.0D - d4));
                        k4 = Math.min(k4, 255);
                        l4 = (int) ((double) l4 + (double) l3 * (1.0D - d4));
                        l4 = Math.min(l4, 255);
                        i5 = (int) ((double) i5 + (double) i4 * (1.0D - d4));
                        i5 = Math.min(i5, 255);
                    }
                }
                int j5 = c << 24 | k4 << 16 | l4 << 8 | i5;
                ai2[j4] = j5;
                j4++;
            }

        }

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
        if (_fld$535)
            if (event != null && _fld$557 && _fld$990.inside(event.x, event.y)) {
                PixelGrabber pixelgrabber = new PixelGrabber(image, _fld$990.x, _fld$990.y, _fld$990.width, _fld$990.height, _fld$420, 0, _fld$990.width);
                try {
                    pixelgrabber.grabPixels();
                } catch (InterruptedException _ex) {
                }
                pixelgrabber = null;
                int k = _fld$990.width;
                int i1 = _fld$990.height;
                int ai[] = new int[k * i1];
                _fld$971.x = event.x - _fld$990.x;
                _fld$971.y = event.y - _fld$990.y;
                _fld$737 = _fld$924;
                _fld$736 = _fld$911;
                _fld$735 = _fld$905;
                _mth$6(k, i1, _fld$443, ai);
                _mth$5(k, i1, _fld$443, ai);
                if (m_nMode > 0)
                    _mth$93(k, i1, _fld$902, ai);
                _mth$170(k, i1, _fld$420, _fld$443, ai);
                Image image2 = component.createImage(new MemoryImageSource(k, i1, ai, 0, k));
                ai = null;
                g.drawImage(image2, _fld$990.x, _fld$990.y, null);
                _fld$973.x = event.x;
                _fld$973.y = event.y;
                _fld$524 = true;
            } else {
                if (_fld$524) {
                    int j = 0;
                    int l = _fld$990.width;
                    double d6 = _fld$990.width;
                    double d3 = (double) (l - (_fld$973.x - _fld$990.x)) / (double) l;
                    _fld$971.y = _fld$990.y;
                    boolean flag = true;
                    if (flag) {
                        for (int j1 = 0; j1 < _fld$773 / 2; j1++) {
                            double d = l * ((j1 * 2) / _fld$773);
                            double d4 = Math.sqrt(d - d3);
                            if (d4 < d6) {
                                d6 = d4;
                                j = j1;
                            }
                        }

                    } else {
                        for (int k1 = _fld$773 / 2; k1 < _fld$773; k1++) {
                            double d1 = (double) (100 - ((k1 - _fld$773 / 2) * 200) / _fld$773) / 100D;
                            double d5 = Math.sqrt(d1 - d3);
                            if (d5 < d6) {
                                d6 = d5;
                                j = k1;
                            }
                        }

                    }
                    _fld$734 = j;
                    _fld$524 = false;
                }
                PixelGrabber pixelgrabber1 = null;
                pixelgrabber1 = new PixelGrabber(image, _fld$990.x, _fld$990.y, _fld$990.width, _fld$990.height, _fld$420, 0, _fld$990.width);
                pixelgrabber1.startGrabbing();
                pixelgrabber1 = null;
                _mth$170(_fld$990.width, _fld$990.height, _fld$420, _fld$443, _fld$423[_fld$734]);
                Image image1 = component.createImage(new MemoryImageSource(_fld$990.width, _fld$990.height, _fld$423[_fld$734], 0, _fld$990.width));
                g.drawImage(image1, _fld$990.x, _fld$990.y, null);
                _fld$734++;
                if (_fld$734 >= _fld$773)
                    _fld$734 = 0;
            }
        g.dispose();
        return null;
    }

    private long _mth$193(long l) {
        long l1 = 13849L;
        long l2 = 65535L;
        long l3 = 25713L;
        l = l3 * l + l1 & l2;
        return l;
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

    public void stop() {
        if (audio != null && running) {
            running = false;
            audio.stop();
        }
    }

    private int _fld$914;
    private int _fld$765;
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
    private Font _fld$358;
    private Vector messages;
    private int _fld$783;
    private int _fld$684;
    private Color _fld$581;
    public static final int _fld$147 = 65535;
    private Point _fld$971;
    private boolean _fld$537;
    private boolean _fld$535;
    private int _fld$443[];
    private int _fld$420[];
    private int _fld$423[][];
    private int _fld$924;
    private int _fld$911;
    private int _fld$905;
    private int _fld$717;
    private Color _fld$573;
    private int _fld$945;
    private int m_nMode;
    private int _fld$885;
    private double _fld$608;
    private int _fld$737;
    private int _fld$736;
    private int _fld$735;
    private int _fld$902;
    private int _fld$734;
    private boolean _fld$557;
    private boolean _fld$524;
    private Point _fld$973;
}
