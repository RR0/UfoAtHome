package org.rr0.ufoathome.model.ufo;

import java.applet.Applet;
import java.applet.AudioClip;
import java.awt.*;
import java.awt.image.MemoryImageSource;
import java.awt.image.PixelGrabber;
import java.util.Vector;

public class EffectBase {

    public EffectBase() {
        _fld$990 = new Rectangle();
        _fld$849 = -1;
        _fld$917 = 1;
        _fld$690 = 0;
        m_imgBack = null;
        _fld$659 = null;
        _fld$422 = null;
        _fld$715 = 0;
        _fld$704 = 0;
    }

    public static void _mth$21(int ai[], int i, int j, int k, int l, int i1, int j1, int k1, int l1) {
        for (int i2 = 0; i2 < j1; i2++) {
            int j2 = j * (l + i2) + k;
            int k2 = j * (l + i2 + l1) + (k + k1);
            if (i < j2 + i1 || i < k2 + i1)
                break;
            System.arraycopy(ai, j2, ai, k2, i1);
        }
    }

    public int colorGradient(int i, int j, boolean flag) {
        int k = i >> 16 & 0xff;
        int l = i >> 8 & 0xff;
        int i1 = i & 0xff;
        if (flag) {
            k = Math.min(255, k + j);
            l = Math.min(255, l + j);
            i1 = Math.min(255, i1 + j);
        } else {
            k = Math.max(0, k - j);
            l = Math.max(0, l - j);
            i1 = Math.max(0, i1 - j);
        }
        return i & 0xff000000 | k << 16 | l << 8 | i1;
    }

    public void cleanup() {
    }

    public void _mth$62(Component component, Image image, int i, Rectangle rectangle, Rectangle rectangle1) {
        if (_fld$715 <= 0)
            return;
        Graphics g = image.getGraphics();
        g.setColor(_fld$569);
        g.fillRect(rectangle1.x, rectangle1.y, rectangle1.width, rectangle1.height);
        if (m_imgBack != null)
            if (_fld$715 == 2) {
                g.clipRect(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
                g.drawImage(m_imgBack, rectangle.x, rectangle.y, null);
            } else if (_fld$715 == 3) {
                int j = _fld$711;
                int k = _fld$710;
                int l = _fld$970.x;
                int i1 = _fld$970.y;
                switch (_fld$712) {
                    default:
                        break;

                    case 1: // '\001'
                        l += (rectangle.width - j) / 2;
                        i1 += (rectangle.height - k) / 2;
                        // fall through

                    case 4: // '\004'
                        if (j != -1) {
                            g.clipRect(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
                            g.drawImage(m_imgBack, rectangle.x + l, rectangle.y + i1, null);
                        }
                        break;

                    case 2: // '\002'
                        if (m_imgBack != null)
                            g.drawImage(m_imgBack, rectangle.x, rectangle.y, null);
                        break;

                    case 3: // '\003'
                        _mth$253(component, g, i, rectangle, rectangle1);
                        break;

                }
            }
        g.dispose();
    }

    public void _mth$63(Component component, Image image, Rectangle rectangle, Rectangle rectangle1) {
        if (_fld$704 <= 0)
            return;
        int j = rectangle.x;
        int k = rectangle.y;
        int l = rectangle.width;
        int i1 = rectangle.height;
        Graphics g = image.getGraphics();
        if (_fld$704 == 1 || _fld$704 == 2) {
            l += j - 1;
            i1 += k - 1;
            for (int i = _fld$706 - 1; i >= 0; i--) {
                g.setColor(_fld$441[i]);
                g.drawLine(j + i, k, j + i, i1);
                g.drawLine(j, k + i, l, k + i);
                g.setColor(_fld$470[i]);
                g.drawLine(l - i, k, l - i, i1);
                g.drawLine(j, i1 - i, l, i1 - i);
            }

        } else if (_fld$704 == 3 && _fld$659 != null)
            g.drawImage(_fld$659, rectangle.x, rectangle.y, null);
        g.dispose();
    }

    protected boolean displayMessages(Graphics g, Vector messages, Font font, int i, Rectangle rectangle, int j, int k) {
        if (messages == null)
            return false;
        Font font1;
        if (font == null)
            font1 = new Font("Helvetica", 0, 16);
        else
            font1 = font;
        Font font2 = g.getFont();
        g.setFont(font1);
        FontMetrics fontmetrics = g.getFontMetrics();
        int l = _mth$339(font);
        int i1 = fontmetrics.getHeight();
        int j1 = fontmetrics.getAscent();
        int k1 = messages.size();
        if (rectangle == null)
            return false;
        int l1 = rectangle.y + j1 + k;
        for (int i2 = 0; i2 < k1;) {
            String s;
            try {
                s = (String) messages.elementAt(i2);
            } catch (Exception _ex) {
                break;
            }
            if (s != null) {
                int j2 = rectangle.x + j;
                switch (i) {
                    case 2: // '\002'
                        j2 += (rectangle.width - fontmetrics.stringWidth(s)) / 2;
                        break;

                    case 3: // '\003'
                        j2 += rectangle.width - fontmetrics.stringWidth(s) - l;
                        break;

                }
                g.drawString(s, j2, l1);
            }
            i2++;
            l1 += i1;
        }

        g.setFont(font2);
        return true;
    }

    public static int[] getImageMemory(Image image, Rectangle rectangle, boolean flag, int i) {
        Rectangle rectangle1;
        if (rectangle == null)
            rectangle1 = new Rectangle(0, 0, image.getWidth(null), image.getHeight(null));
        else
            rectangle1 = rectangle;
        int j = rectangle1.width * rectangle1.height;
        int ai[] = new int[j];
        PixelGrabber pixelgrabber = new PixelGrabber(image, rectangle1.x, rectangle1.y, rectangle1.width, rectangle1.height, ai, 0, rectangle1.width);
        try {
            pixelgrabber.grabPixels();
        } catch (Exception _ex) {
        }
        if (flag) {
            i |= 0xff000000;
            for (int k = 0; k < j; k++)
                if (ai[k] == i)
                    ai[k] &= 0xffffff;

        }
        return ai;
    }

    protected Vector _mth$102(Graphics g, Font font, String s, int ai[], int i) {
        Font font1 = g.getFont();
        g.setFont(font);
        FontMetrics fontmetrics = g.getFontMetrics();
        int k = 0;
        int l = 0;
        int ai1[] = new int[1];
        String s3 = "\1775";
        String s4 = s + s3;
        int j1 = s4.length();
        Vector vector = new Vector();
        for (ai[0] = 0; ai1[0] < j1;) {
            String s1 = nextToken(s4, s3, ai1);
            if (s1 != null) {
                int j;
                for (j = fontmetrics.stringWidth(s1); j > i;) {
                    int i1 = _mth$1072(s1, fontmetrics, i);
                    if (i1 == s1.length())
                        break;
                    String s2 = s1.substring(0, i1);
                    vector.addElement(s2 != null ? ((Object) (s2)) : "");
                    j = fontmetrics.stringWidth(s2);
                    if (j > k) {
                        k = j;
                        ai[0] = l;
                    }
                    s1 = s1.substring(i1);
                    j = fontmetrics.stringWidth(s1);
                    l++;
                }

                if (j > k) {
                    k = j;
                    ai[0] = l;
                }
            }
            vector.addElement(s1 != null ? ((Object) (s1)) : "");
            l++;
        }

        g.setFont(font1);
        return vector;
    }

    public boolean hitTest(int i, int j) {
        return _fld$990.inside(i, j);
    }

    public void _mth$113(int i, Component component, Rectangle rectangle, MediaTracker mediatracker, Image aimage[], boolean aflag[]) {
        if (i <= 0)
            return;
        Object aobj[] = {
            new Integer(0), new Color(0), new Integer(0), new Integer(0), new Point(0, 0), new Integer(0), new Integer(0), new Integer(1), new String(), new String()
        };
        parser(((Applet) component).getParameter("background" + String.valueOf(i)), aobj, ",");
        _fld$715 = ((Integer) aobj[0]).intValue();
        _fld$569 = (Color) aobj[1];
        _fld$709 = ((Integer) aobj[2]).intValue();
        _fld$712 = ((Integer) aobj[3]).intValue();
        _fld$970 = (Point) aobj[4];
        _fld$707 = ((Integer) aobj[5]).intValue();
        _fld$708 = ((Integer) aobj[6]).intValue();
        _fld$713 = ((Integer) aobj[7]).intValue();
        if (_fld$708 < 1 || _fld$708 > 8)
            _fld$708 = 1;
        _fld$711 = _fld$710 = 0;
        if (_fld$715 > 1 && _fld$709 != 0) {
            int j = _fld$709 - 1;
            if (!WaitMediaLoad(j, mediatracker, aimage, aflag, component))
                return;
            Image image = aimage[j];
            _fld$711 = image.getWidth(component);
            _fld$710 = image.getHeight(component);
            if (_fld$715 == 2 || _fld$715 == 3 && (_fld$712 == 1 || _fld$712 == 4))
                m_imgBack = image;
            else if (_fld$715 == 3 && _fld$712 == 2) {
                if (_fld$711 == rectangle.width && _fld$710 == rectangle.height) {
                    m_imgBack = image;
                } else {
                    int ai[] = _mth$1054(image, rectangle.width, rectangle.height, component);
                    m_imgBack = component.createImage(new MemoryImageSource(rectangle.width, rectangle.height, ai, 0, rectangle.width));
                }
            } else if (_fld$715 == 3 && _fld$712 == 3) {
                int k = _fld$970.x;
                int l = _fld$970.y;
                int i1 = _fld$711 * (rectangle.width / _fld$711 + 2);
                int j1 = _fld$710 * (rectangle.height / _fld$710 + 2);
                m_imgBack = component.createImage(i1, j1);
                Graphics g = m_imgBack.getGraphics();
                g.setColor(_fld$569);
                g.fillRect(0, 0, i1, j1);
                if (_fld$707 == 0) {
                    for (; k > 0; k -= _fld$711) ;
                    for (; l > 0; l -= _fld$710) ;
                } else {
                    _fld$917 = 1;
                    _fld$714 = 20;
                    if (_fld$713 > 6) {
                        for (int k1 = 7; k1 < _fld$713; k1++)
                            _fld$917 *= 2;

                    } else {
                        _fld$714 *= (7 - _fld$713) * 2;
                    }
                    if (_fld$714 < 20)
                        _fld$714 = 20;
                    k = 0;
                    l = 0;
                }
                for (int l1 = 0; l1 <= (i1 - k) / _fld$711; l1++) {
                    for (int i2 = 0; i2 <= (j1 - l) / _fld$710; i2++)
                        waitDrawImage(g, image, k + l1 * _fld$711, l + i2 * _fld$710, 0L, 0L, component);
                }
            }
        }
    }

    public void _mth$114(int i, Component component, Rectangle rectangle, MediaTracker mediatracker, Image aimage[], boolean aflag[]) {
        if (i <= 0)
            return;
        Object aobj[] = {
            new Integer(0), new Integer(0), new Integer(1), new Color(0xbfbfbf), new Integer(50), new String(), new String()
        };
        parser(((Applet) component).getParameter("border" + String.valueOf(i)), aobj, ",");
        _fld$704 = ((Integer) aobj[0]).intValue();
        _fld$705 = ((Integer) aobj[1]).intValue();
        _fld$706 = ((Integer) aobj[2]).intValue();
        _fld$568 = (Color) aobj[3];
        _fld$728 = ((Integer) aobj[4]).intValue();
        int k1 = rectangle.width;
        int l1 = rectangle.height;
        if (_fld$704 == 1 || _fld$704 == 2) {
            int k = Math.min(k1 >> 1, l1 >> 1);
            if (_fld$706 > k)
                _fld$706 = k;
            _fld$441 = new Color[_fld$706];
            _fld$470 = new Color[_fld$706];
            if (_fld$706 == 1)
                _fld$470[0] = _fld$441[0] = _fld$568;
        } else {
            _fld$706 = 0;
        }
        switch (_fld$704) {
            default:
                break;

            case 1: // '\001'
                if (_fld$705 == 0) {
                    for (int l = _fld$706 - 1; l >= 1; l--) {
                        if (l == _fld$706 - 1) {
                            _fld$441[l] = _fld$568;
                            _fld$470[l] = _fld$441[l];
                        }
                        _fld$441[l - 1] = new Color(colorGradient(_fld$441[l].getRGB(), _fld$728, false));
                        _fld$470[l - 1] = _fld$441[l - 1];
                    }

                    break;
                }
                for (int i1 = 0; i1 < _fld$706 - 1; i1++) {
                    if (i1 == 0) {
                        _fld$441[i1] = _fld$568;
                        _fld$470[i1] = _fld$441[i1];
                    }
                    _fld$441[i1 + 1] = new Color(colorGradient(_fld$441[i1].getRGB(), _fld$728, false));
                    _fld$470[i1 + 1] = _fld$441[i1 + 1];
                }

                break;

            case 2: // '\002'
                for (int j1 = _fld$706 - 1; j1 >= 1; j1--) {
                    if (j1 == _fld$706 - 1) {
                        _fld$441[j1] = _fld$568;
                        _fld$470[j1] = _fld$441[j1];
                    }
                    if (_fld$705 != 0) {
                        _fld$441[j1 - 1] = new Color(colorGradient(_fld$441[j1].getRGB(), _fld$728, false));
                        _fld$470[j1 - 1] = new Color(colorGradient(_fld$470[j1].getRGB(), _fld$728, true));
                    } else {
                        _fld$441[j1 - 1] = new Color(colorGradient(_fld$441[j1].getRGB(), _fld$728, true));
                        _fld$470[j1 - 1] = new Color(colorGradient(_fld$470[j1].getRGB(), _fld$728, false));
                    }
                }

                break;

            case 3: // '\003'
                int j = _fld$705 - 1;
                if (!WaitMediaLoad(j, mediatracker, aimage, aflag, component))
                    return;
                Image image = aimage[j];
                int i2 = image.getWidth(component);
                int j2 = image.getHeight(component);
                if (i2 == rectangle.width && j2 == rectangle.height) {
                    _fld$659 = image;
                } else {
                    _fld$422 = _mth$1054(image, rectangle.width, rectangle.height, component);
                    _fld$422[0] = 0;
                    _fld$659 = component.createImage(new MemoryImageSource(rectangle.width, rectangle.height, _fld$422, 0, rectangle.width));
                    ((EffectPlayer) component)._fld$549 = true;
                }
                break;

        }
    }

    public boolean _mth$134(Component component, Rectangle rectangle, int i, int j, MediaTracker mediatracker, Image aimage[], boolean aflag[],
                            AudioClip aaudioclip[], boolean flag, boolean flag1, String s) {
        return false;
    }

    public boolean _mth$138() {
        return false;
    }

    public static boolean isPixelGrabberWork(Component component) {
        Image image = component.createImage(2, 2);
        Graphics g = image.getGraphics();
        g.setColor(Color.white);
        g.fillRect(0, 0, 2, 2);
        g.dispose();
        int ai[] = getImageMemory(image, null, false, 0);
        boolean pixelGrabberWork = (ai[0] != 0 || ai[1] != 0 || ai[2] != 0 || ai[3] != 0) && (ai[0] & 0xff0000) != 0;
        return pixelGrabberWork;
    }

    public boolean _mth$172() {
        return false;
    }

    public Object process(Component component, Object obj, Rectangle rectangle, Event event, int i) {
        return null;
    }

    public static Object _mth$189(String s, Component component, Object obj, Rectangle rectangle, Object obj1, Dimension dimension, int i) {
        int l4 = 0;
        int l5 = dimension.width >>> 1;
        int i6 = dimension.height >>> 1;
        Object aobj[] = {
            new Integer(0), new String("ua2color"), new Integer(1), new Color(0), new Color(0xffffff), new Polygon()
        };
        parser(s, aobj, "|");
        String s1 = (String) aobj[1];
        if (dimension.width <= 0 || dimension.height <= 0)
            return null;
        int ai[];
        if (i == 17 || i == 15)
            ai = new int[dimension.width * dimension.height];
        else if ((i & 0x3) == 3)
            ai = (int[]) obj1;
        else
            return null;
        if (s1 == null)
            return null;
        Object aobj1[] = new Object[3];
        for (int j = 0; j < 3; j++)
            aobj1[j] = aobj[j + 2];

        int j6 = ((Integer) aobj[0]).intValue();
        switch (j6) {
            case 1: // '\001'
                int ai1[] = (int[]) _mth$190(null, new Dimension(dimension.height, 0), 17, aobj1);
                for (int k = 0; k < dimension.height; k++) {
                    for (int i2 = 0; i2 < dimension.width; i2++)
                        ai[k * dimension.width + i2] = ai1[k];

                }

                break;

            case 2: // '\002'
                int ai2[] = (int[]) _mth$190(null, new Dimension(dimension.width, 0), 17, aobj1);
                for (int l = 0; l < dimension.height; l++)
                    System.arraycopy(ai2, 0, ai, l * dimension.width, dimension.width);

                break;

            case 3: // '\003'
            case 4: // '\004'
                int ai3[] = (int[]) _mth$190(null, new Dimension(dimension.width * 2, 0), 17, aobj1);
                for (int i1 = 0; i1 < dimension.height; i1++) {
                    int j2 = (int) ((double) (((float) i1 * (float) dimension.width) / (float) dimension.height) + 0.5D);
                    System.arraycopy(ai3, j6 != 3 ? dimension.width - j2 : j2, ai, i1 * dimension.width, dimension.width);
                }

                break;

            case 5: // '\005'
            case 7: // '\007'
            case 8: // '\b'
                int i5;
                if (j6 == 5) {
                    i5 = Math.min(i6, l5);
                    l4 = i5;
                } else if (j6 == 7)
                    i5 = l5 << 1;
                else
                    i5 = l5;
                int ai4[] = (int[]) _mth$190(null, new Dimension(i5, 0), 17, aobj1);
                int k5 = dimension.width & 0x1;
                int k4 = i5 - 1;
                int k6 = l5;
                int i3;
                int j1 = i3 = 0;
                for (int l3 = dimension.width - 1; j1 < i6; l3 += dimension.width) {
                    if (j6 == 5) {
                        l4 = l4 > 0 ? l4 - 1 : 0;
                        k6 = Math.min(j1, l5);
                    } else if (j6 == 7) {
                        k4 = i5 - 1 - (l5 * j1) / (i6 - 1);
                        l4 = (k4 - l5) + 1;
                    } else {
                        l4 = ((i5 - 1) * (i6 - j1)) / i6;
                        k6 = Math.min((l5 * j1) / (i6 - 1), l5);
                    }
                    int k2;
                    for (k2 = 0; k2 < k6; k2++)
                        ai[l3 - k2] = ai[i3 + k2] = ai4[k4 - k2];

                    for (; k2 < l5; k2++)
                        ai[l3 - k2] = ai[i3 + k2] = ai4[l4];

                    if (k5 != 0)
                        ai[i3 + k2] = ai4[l4];
                    System.arraycopy(ai, j1 * dimension.width, ai, (dimension.height - j1 - 1) * dimension.width, dimension.width);
                    j1++;
                    i3 += dimension.width;
                }

                if ((dimension.height & 0x1) != 0)
                    System.arraycopy(ai, (j1 - 1) * dimension.width, ai, j1 * dimension.width, dimension.width);
                break;

            case 6: // '\006'
                int j5 = Math.max(l5, i6);
                int ai5[] = (int[]) _mth$190(null, new Dimension(j5, 0), 17, aobj1);
                Image image = component.createImage(dimension.width, dimension.height);
                Graphics g = image.getGraphics();
                g.setColor(new Color(ai5[j5 - 1]));
                g.fillRect(0, 0, dimension.width, dimension.height);
                for (int k1 = 1; k1 < j5; k1++) {
                    int j3 = ((l5 - 1) * k1) / (j5 - 1);
                    int i4 = ((i6 - 1) * k1) / (j5 - 1);
                    g.setColor(new Color(ai5[j5 - k1 - 1]));
                    g.fillOval(j3, i4, dimension.width - (j3 << 1), dimension.height - (i4 << 1));
                }

                PixelGrabber pixelgrabber = new PixelGrabber(image, 0, 0, dimension.width, dimension.height, ai, 0, dimension.width);
                try {
                    pixelgrabber.grabPixels();
                } catch (InterruptedException _ex) {
                }
                image = null;
                break;

        }
        if (i == 15) {
            int ai6[] = (int[]) obj1;
            int ai7[] = (int[]) obj;
            int l6 = Math.min(dimension.height, rectangle.height - rectangle.y);
            int i7 = Math.min(dimension.width, rectangle.width - rectangle.x);
            for (int l1 = 0; l1 < l6; l1++) {
                int k3 = l1 * dimension.width;
                int j4 = (l1 + rectangle.y) * rectangle.width + rectangle.x;
                for (int l2 = 0; l2 < i7;) {
                    if ((ai6[k3] & 0xff000000) != 0)
                        ai7[j4] = ai[k3];
                    l2++;
                    k3++;
                    j4++;
                }

            }

        }
        if ((i & 0x10) != 0)
            return component.createImage(new MemoryImageSource(dimension.width, dimension.height, ai, 0, dimension.width));
        else
            return ai;
    }

    public static Object _mth$190(Object obj1, Dimension dimension, int i, Object aobj[]) {
        float af[] = null;
        float af1[] = null;
        int ai[];
        if ((i & 0x2) != 0)
            ai = (int[]) obj1;
        else if ((i & 0x10) != 0)
            ai = new int[dimension.width];
        else
            return null;
        int i1 = ((Integer) aobj[0]).intValue();
        int j1 = ((Color) aobj[1]).getRGB();
        int k1 = ((Color) aobj[2]).getRGB();
        if (i1 < 1 || i1 > 3)
            i1 = 1;
        int l1 = j1 >>> 16 & 0xff;
        int i2 = j1 >>> 8 & 0xff;
        int j2 = j1 & 0xff;
        int k2 = k1 >>> 16 & 0xff;
        int l2 = k1 >>> 8 & 0xff;
        int i3 = k1 & 0xff;
        if (i1 != 1) {
            af = Color.RGBtoHSB(l1, i2, j2, null);
            af1 = Color.RGBtoHSB(k2, l2, i3, null);
            if (i1 == 2 && af[0] <= af1[0])
                af[0]++;
            else if (i1 == 3 && af[0] >= af1[0])
                af1[0]++;
        }
        for (int j = 0; j < dimension.width; j++) {
            int l = dimension.width - 1;
            int k = l - j;
            if (i1 != 1) {
                float f = (af[0] * (float) k + af1[0] * (float) j) / (float) l;
                float f1 = (af[1] * (float) k + af1[1] * (float) j) / (float) l;
                float f2 = (af[2] * (float) k + af1[2] * (float) j) / (float) l;
                ai[j] = Color.HSBtoRGB(f <= 1.0F ? f : f - 1.0F, f1, f2);
            } else {
                int j3 = (int) ((double) ((float) (l1 * k + k2 * j) / (float) l) + 0.5D);
                int k3 = (int) ((double) ((float) (i2 * k + l2 * j) / (float) l) + 0.5D);
                int l3 = (int) ((double) ((float) (j2 * k + i3 * j) / (float) l) + 0.5D);
                ai[j] = 0xff000000 | j3 << 16 | k3 << 8 | l3;
            }
        }

        return ai;
    }

    public void SetExtra(Object aobj[]) {
    }

    public void _mth$253(Component component, Graphics g, int i, Rectangle rectangle, Rectangle rectangle1) {
        if (_fld$711 <= 0 || _fld$710 <= 0 || m_imgBack == null)
            return;
        g.clipRect(rectangle1.x, rectangle1.y, rectangle1.width, rectangle1.height);
        if (_fld$707 == 0) {
            g.drawImage(m_imgBack, rectangle.x, rectangle.y, null);
            return;
        }
        _fld$814 = i / _fld$714;
        if (_fld$814 != _fld$849) {
            _fld$690 += _fld$917;
            _fld$849 = _fld$814;
        }
        int j;
        int k;
        switch (_fld$708) {
            case 1: // '\001'
                if (_fld$711 < _fld$710) {
                    if (_fld$690 >= _fld$711)
                        _fld$690 -= _fld$711;
                    j = _fld$690;
                    k = (_fld$690 * _fld$710) / _fld$711;
                    break;
                }
                if (_fld$690 >= _fld$710)
                    _fld$690 -= _fld$710;
                k = _fld$690;
                j = (_fld$690 * _fld$711) / _fld$710;
                break;

            case 2: // '\002'
                j = 0;
                if (_fld$690 >= _fld$710)
                    _fld$690 -= _fld$710;
                k = _fld$690;
                break;

            case 3: // '\003'
                if (_fld$711 < _fld$710) {
                    if (_fld$690 >= _fld$711)
                        _fld$690 -= _fld$711;
                    j = _fld$711 - _fld$690;
                    k = (_fld$690 * _fld$710) / _fld$711;
                    break;
                }
                if (_fld$690 >= _fld$710)
                    _fld$690 -= _fld$710;
                k = _fld$690;
                j = _fld$711 - (_fld$690 * _fld$711) / _fld$710;
                break;

            case 4: // '\004'
                k = 0;
                if (_fld$690 >= _fld$711)
                    _fld$690 -= _fld$711;
                j = _fld$690;
                break;

            case 5: // '\005'
                k = 0;
                if (_fld$690 >= _fld$711)
                    _fld$690 -= _fld$711;
                j = _fld$711 - _fld$690;
                break;

            case 6: // '\006'
                if (_fld$711 < _fld$710) {
                    if (_fld$690 >= _fld$711)
                        _fld$690 -= _fld$711;
                    j = _fld$690;
                    k = _fld$710 - (_fld$690 * _fld$710) / _fld$711;
                    break;
                }
                if (_fld$690 >= _fld$710)
                    _fld$690 -= _fld$710;
                k = _fld$710 - _fld$690;
                j = (_fld$690 * _fld$711) / _fld$710;
                break;

            case 7: // '\007'
                j = 0;
                if (_fld$690 >= _fld$710)
                    _fld$690 -= _fld$710;
                k = _fld$710 - _fld$690;
                break;

            case 8: // '\b'
                if (_fld$711 < _fld$710) {
                    if (_fld$690 >= _fld$711)
                        _fld$690 -= _fld$711;
                    j = _fld$711 - _fld$690;
                    k = _fld$710 - (_fld$690 * _fld$710) / _fld$711;
                    break;
                }
                if (_fld$690 >= _fld$710)
                    _fld$690 -= _fld$710;
                k = _fld$710 - _fld$690;
                j = _fld$711 - (_fld$690 * _fld$711) / _fld$710;
                break;

            default:
                return;

        }
        g.drawImage(m_imgBack, rectangle.x - j, rectangle.y - k, null);
    }

    public void waitDrawImage(Graphics g, Image image, float f, float f1, long l, long l1, Component component) {
        for (int i = 0; i++ < 1000;)
            if (l > 0L && l1 > 0L ? g.drawImage(image, (int) f, (int) f1, (int) l, (int) l1, component) : g.drawImage(image, (int) f, (int) f1, component))
                break;

    }

    public static boolean WaitMediaLoad(int i, MediaTracker mediatracker, Image aimage[], boolean aflag[], Component component) {
        if (aimage == null || i < 0 || i >= aimage.length || i >= aflag.length)
            return false;
        if (!aflag[i])
            try {
                mediatracker.waitForID(i);
                aflag[i] = mediatracker.isErrorID(i) ^ true;
            } catch (Exception _ex) {
            }
        component.repaint();
        return aflag[i] && aimage[i] != null;
    }

    protected Color _mth$288(Color color) {
        return new Color(Math.min(color.getRed() + 200, 255), Math.min(color.getGreen() + 200, 255), Math.min(color.getBlue() + 200, 255));
    }

    protected String _mth$289(String s, int i) {
        if (s.equals("Dialog") && (i == 2 || i == 3))
            return "Helvetica";
        else
            return s;
    }

    protected Color darker(Color color) {
        return new Color(Math.max(color.getRed() - 200, 0), Math.max(color.getGreen() - 200, 0), Math.max(color.getBlue() - 200, 0));
    }

    public static String _mth$317(String s) {
        if (s == null)
            return null;
        int separator = 127;
        int i = s.indexOf(separator);
        while (i >= 0) {
            char c;
            try {
                c = s.charAt(i + 1);
            } catch (Exception _ex) {
                break;
            }
            switch (c) {
                case 48: // '0'
                    c = '|';
                    break;

                case 49: // '1'
                    c = '&';
                    break;

                case 50: // '2'
                    c = '$';
                    break;

                case 51: // '3'
                    c = ',';
                    break;

                case 52: // '4'
                    c = '"';
                    break;

                case 53: // '5'
                    i = s.indexOf(separator, i + 1);
                    continue;

                default:
                    c = ' ';
                    break;

            }
            s = _mth$1053(s, i, c);
            i = s.indexOf(separator, i);
        }

        return s;
    }

    public static void displayString(Graphics g, String s, int i, int j, Color color, Color color1) {
        g.setColor(color);
        g.drawString(s, i - 1, j);
        g.drawString(s, i + 1, j);
        g.drawString(s, i, j - 1);
        g.drawString(s, i, j + 1);
        g.setColor(color1);
        g.drawString(s, i, j);
    }

    public int _mth$334(int i, int j, int k) {
        if (_fld$715 != 3 || _fld$712 != 3 || _fld$707 != 1)
            return -1;
        i -= j;
        if (_fld$714 == 0)
            _fld$714 = 20;
        return (i / _fld$714 + 1) * _fld$714 - i;
    }

    public int _mth$335() {
        return _fld$706;
    }

    protected int _mth$339(Font font) {
        int i = 0;
        if (font.isItalic()) {
            int j = font.getSize();
            i = j / 4 + 4;
        }
        return i;
    }

    public int _mth$345(int i) {
        return -1;
    }

    protected int _mth$346(int i, int j) {
        int k = i / 60 + 1;
        if (j == 3)
            k *= 2;
        return k;
    }

    public boolean _mth$348(Rectangle rectangle, int i, int j) {
        i -= rectangle.x;
        j -= rectangle.y;
        if (_fld$715 > 0 && i >= 0 && j >= 0 && i < rectangle.width && j < rectangle.height)
            return true;
        if (_fld$704 == 0)
            return false;
        if (i < 0 || j < 0 || i >= rectangle.width || j >= rectangle.height)
            return false;
        if (_fld$704 == 1 || _fld$704 == 2)
            return i < _fld$706 || i >= rectangle.width - _fld$706 || j < _fld$706 || j >= rectangle.height - _fld$706;
        if (_fld$704 == 3) {
            if (_fld$659 == null)
                return false;
            if (_fld$422 == null)
                return true;
            int k = _fld$659.getWidth(null);
            int l = _fld$659.getHeight(null);
            if (i >= k || j >= l)
                return false;
            else
                return (_fld$422[j * k + i] & 0xff000000) != 0;
        } else {
            return true;
        }
    }

    public int _mth$1015(Event event, String as[]) {
        return 0;
    }

    public static int nextInt(String s, String s1, int ai[], int i, int j) {
        String s2 = nextToken(s, s1, ai);
        if (s2 != null)
            try {
                i = Integer.parseInt(s2, j);
            } catch (Exception _ex) {
            }
        return i;
    }

    public static String nextToken(String s, String s1, int ai[]) {
        int i = s.indexOf(s1, ai[0]);
        if (i != -1) {
            int j = ai[0];
            ai[0] = i + s1.length();
            if (i != j)
                try {
                    String s2 = s.substring(j, i);
                    return s2;
                } catch (Exception _ex) {
                }
        }
        return null;
    }

    public static boolean parser(String s, Object aobj[], String s1) {
        String s3 = s + s1;
        int i = s3.length();
        int ai[] = new int[1];
        for (int j = 0; j < aobj.length; j++) {
            String s2;
            if (aobj[j] instanceof Integer)
                aobj[j] = new Integer(nextInt(s3, s1, ai, ((Integer) aobj[j]).intValue(), 10));
            else if (aobj[j] == null || (aobj[j] instanceof String)) {
                if ((s2 = nextToken(s3, s1, ai)) != null)
                    aobj[j] = s2;
            } else if (aobj[j] instanceof Double) {
                if ((s2 = nextToken(s3, s1, ai)) != null)
                    aobj[j] = Double.valueOf(s2);
            } else if (aobj[j] instanceof Float) {
                if ((s2 = nextToken(s3, s1, ai)) != null)
                    aobj[j] = Float.valueOf(s2);
            } else if (aobj[j] instanceof Color)
                aobj[j] = new Color(nextInt(s3, s1, ai, ((Color) aobj[j]).getRGB(), 16));
            else if (aobj[j] instanceof Point) {
                Point point = (Point) aobj[j];
                point.x = nextInt(s3, s1, ai, point.x, 10);
                point.y = nextInt(s3, s1, ai, point.y, 10);
            } else if (aobj[j] instanceof Polygon) {
                int k = nextInt(s3, s1, ai, 0, 10);
                if (k > 0) {
                    Polygon polygon = new Polygon();
                    for (int l = 0; l < k; l++) {
                        int i1 = nextInt(s3, s1, ai, 0, 10);
                        int j1 = nextInt(s3, s1, ai, 0, 10);
                        polygon.addPoint(i1, j1);
                    }

                    aobj[j] = polygon;
                }
            }
            if (ai[0] >= i)
                return false;
        }

        return true;
    }

    public static String _mth$1053(String s, int i, char c) {
        int j = s.length();
        String s1;
        try {
            s1 = s.substring(0, i);
            s1 = s1 + String.valueOf(c);
        } catch (Exception _ex) {
            return s;
        }
        if (i + 2 < j)
            try {
                String s2 = s.substring(i + 2);
                s1 = s1 + s2;
            } catch (Exception _ex) {
            }
        j = s1.length();
        return s1;
    }

    public static int[] _mth$1054(Image image, int i, int j, Component component) {
        if (i <= 0)
            i = 1;
        if (j <= 0)
            j = 1;
        int ai[] = new int[i * j];
        if (image != null) {
            int k = image.getWidth(component);
            int l = image.getHeight(component);
            int ai1[] = new int[k * l];
            PixelGrabber pixelgrabber = new PixelGrabber(image, 0, 0, k, l, ai1, 0, k);
            try {
                pixelgrabber.grabPixels();
            } catch (InterruptedException _ex) {
            }
            for (int i1 = 0; i1 < i; i1++) {
                for (int j1 = 0; j1 < j; j1++)
                    ai[i1 + j1 * i] = ai1[(i1 * k) / i + ((j1 * l) / j) * k];

            }

            ai1 = null;
        }
        return ai;
    }

    public static Image _mth$1054(Image image, int i, int j, boolean flag, Component component) {
        if (image == null)
            return component.createImage(i, j);
        int k = image.getWidth(component);
        int l = image.getHeight(component);
        if (i <= 0)
            i = 1;
        if (j <= 0)
            j = 1;
        Image image1;
        if (flag) {
            int ai[] = new int[k * l];
            PixelGrabber pixelgrabber = new PixelGrabber(image, 0, 0, k, l, ai, 0, k);
            try {
                pixelgrabber.grabPixels();
            } catch (InterruptedException _ex) {
            }
            int ai1[] = new int[i * j];
            for (int i1 = 0; i1 < i; i1++) {
                for (int j1 = 0; j1 < j; j1++)
                    ai1[i1 + j1 * i] = ai[(i1 * k) / i + ((j1 * l) / j) * k];

            }

            image1 = component.createImage(new MemoryImageSource(i, j, ai1, 0, i));
            ai = null;
            ai1 = null;
        } else {
            image1 = component.createImage(i, j);
            Graphics g = image1.getGraphics();
            long l1 = System.currentTimeMillis();
            boolean flag1;
            long l2;
            do {
                flag1 = g.drawImage(image, 0, 0, i, j, component);
                l2 = System.currentTimeMillis();
            } while (!flag1 && l2 - l1 < 6000L);
            g.dispose();
        }
        return image1;
    }

    public void stop() {
    }

    protected int _mth$1072(String s, FontMetrics fontmetrics, int i) {
        String s2 = " ";
        int j = 0;
        int k = -1;
        String s1;
        for (int l = 0; l <= i; l = fontmetrics.stringWidth(s1)) {
            j = k + 1;
            k = s.indexOf(s2, j);
            if (k == -1)
                break;
            s1 = s.substring(0, k + 1);
        }

        if (j != 0)
            k = j;
        else if (k == -1)
            k = s.length();
        else
            k++;
        return k;
    }

    protected Rectangle _fld$990;
    private int _fld$849;
    private int _fld$814;
    private int _fld$917;
    private int _fld$690;
    private int _fld$714;
    private Image m_imgBack;
    private int _fld$711;
    private int _fld$710;
    private Color _fld$441[];
    private Color _fld$470[];
    private Image _fld$659;
    private int _fld$422[];
    public static final int _fld$149 = 20;
    protected int _fld$715;
    protected Color _fld$569;
    protected int _fld$709;
    protected int _fld$712;
    protected Point _fld$970;
    protected int _fld$707;
    protected int _fld$708;
    protected int _fld$713;
    protected int _fld$704;
    protected int _fld$705;
    protected int _fld$706;
    protected Color _fld$568;
    protected int _fld$728;
    public int _fld$13;
}
