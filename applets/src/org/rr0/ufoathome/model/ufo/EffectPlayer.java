package org.rr0.ufoathome.model.ufo;

import java.applet.*;
import java.awt.*;
import java.awt.image.MemoryImageSource;
import java.net.MalformedURLException;
import java.net.URL;

public class EffectPlayer extends Applet implements Runnable {

    public EffectPlayer() {
        m_frame = null;
        m_imgApplet = null;
        sbaseCount = 0;
        _fld$637 = null;
        _fld$638 = false;
        m_nTimeCount = 0;
        _fld$983 = null;
        runner = null;
        _fld$807 = 0;
        _fld$984 = null;
        _fld$647 = false;
        _fld$351 = null;
        _fld$549 = false;
        _fld$998 = null;
        _fld$556 = false;
        _fld$661 = null;
        _fld$643 = null;
        runnerPriority = 5;
        _fld$994 = "";
    }

    private int hitTest(int i, int j, int k) {
        if (_fld$469[i] >= 0 && m_nTimeCount >= _fld$478[i] && m_nTimeCount <= _fld$432[i]) {
            if (sbaseInstances[i].hitTest(j, k)) {
                _fld$827 = i;
                return 1;
            }
            if (sbaseInstances[i]._mth$348(_fld$499[i], j, k))
                return 2;
        }
        return 0;
    }

    private void initApplet() {
        _fld$650 = EffectBase.isPixelGrabberWork(this);
        m_frame = getParentFrame();
        _fld$975 = new Rectangle(size().width, size().height);
        m_imgApplet = createImage(_fld$975.width, _fld$975.height);
    }

    private void initAudio(AudioClip aaudioclip[], int i) {
        Object aobj[] = {
            null
        };
        EffectBase.parser(getParameter("audio" + String.valueOf(i + 1)), aobj, ",");
        aaudioclip[i] = getAudioClip(getDocumentBase(), (String) aobj[0]);
    }

    private boolean initImage(MediaTracker mediatracker, Image aimage[], int i) {
        Object aobj[] = {
            new Integer(0), new Point(0, 0), null, null
        };
        EffectBase.parser(getParameter("image" + String.valueOf(i + 1)), aobj, ",");
        aimage[i] = null;
        if (((Integer) aobj[0]).intValue() == 0)
            if (aobj[2] == null) {
                return true;
            } else {
//                aimage[i] = getImage(getDocumentBase(), (String) aobj[2]);
                try {
                    aimage[i] = getImage(new URL((String) aobj[2]));
                } catch (MalformedURLException e) {
                    e.printStackTrace();
                }
                mediatracker.addImage(aimage[i], i);
                return false;
            }
        Point point = (Point) aobj[1];
        if (point.x > 0 && point.y > 0) {
            int ai[] = new int[point.x * point.y];
            if (ai != null && EffectBase._mth$189((String) aobj[3], this, null, null, ai, new Dimension(point.x, point.y), 3) != null)
                aimage[i] = createImage(new MemoryImageSource(point.x, point.y, ai, 0, point.x));
            ai = null;
            return true;
        } else {
            return false;
        }
    }

    private boolean initNumber(int ai[]) {
        Object aobj[] = {
            new Integer(0), new Integer(0), new Integer(0), new Integer(0), new Integer(0), new Integer(0), new Integer(0), new Integer(0), new Integer(0), new String(),
            new String(), new Integer(5)
        };
        EffectBase.parser(getParameter("number"), aobj, ",");
        if ((sbaseCount = ((Integer) aobj[0]).intValue()) <= 0)
            return false;
        ai[0] = ((Integer) aobj[1]).intValue();
        ai[1] = ((Integer) aobj[2]).intValue();
        _fld$499 = new Rectangle[sbaseCount];
        _fld$498 = new Rectangle[sbaseCount];
        _fld$478 = new int[sbaseCount];
        _fld$432 = new int[sbaseCount];
        _fld$469 = new int[sbaseCount];
        _fld$482 = new int[sbaseCount];
        sbaseInstances = new EffectBase[sbaseCount];
        for (int i = 0; i < sbaseCount; i++) {
            _fld$469[i] = -1;
            sbaseInstances[i] = null;
        }

        ai[2] = ((Integer) aobj[3]).intValue();
        ai[3] = ((Integer) aobj[4]).intValue();
        _fld$812 = ((Integer) aobj[5]).intValue();
        if (_fld$812 <= 0)
            _fld$812 = 2000;
        _fld$888 = ((Integer) aobj[6]).intValue();
        if (_fld$888 < 0)
            _fld$888 = 0;
        _fld$652 = ((Integer) aobj[8]).intValue() != 0;
        m_sBack = EffectBase._mth$317((String) aobj[9]);
        _fld$993 = EffectBase._mth$317((String) aobj[10]);
        runnerPriority = ((Integer) aobj[11]).intValue();
        return true;
    }

    private boolean _mth$134(MediaTracker mediatracker, Image aimage[], boolean aflag[], AudioClip aaudioclip[]) {
        int i2 = 0x7fffffff;
        int j2 = 0x80000000;
        Object aobj[] = {
            new Integer(0), new Integer(0), new Integer(0), new Integer(0), new Integer(0), new Integer(0), new Integer(0), new Integer(0), new Integer(0), new Integer(0),
            new Integer(0), new Integer(0), new Integer(0), new Integer(0), new String(), new String()
        };
        for (int i4 = 0; i4 < sbaseCount; i4++) {
            EffectBase.parser(getParameter("sprite" + String.valueOf(i4 + 1)), aobj, ",");
            int i = ((Integer) aobj[0]).intValue();
            int k = ((Integer) aobj[1]).intValue();
            int i1 = ((Integer) aobj[2]).intValue();
            int j1 = ((Integer) aobj[3]).intValue();
            if (i1 > 0 && j1 > 0) {
                _fld$499[i4] = new Rectangle(i, k, i1, j1);
                int k1;
                if ((_fld$478[i4] = k1 = ((Integer) aobj[4]).intValue()) < 0)
                    _fld$478[i4] = k1 = 0;
                int l1;
                if ((_fld$432[i4] = l1 = ((Integer) aobj[5]).intValue()) < 0)
                    _fld$432[i4] = l1 = k1;
                if (l1 < k1)
                    l1 = k1;
                if (k1 < i2)
                    i2 = k1;
                if (l1 > j2)
                    j2 = l1;
                int k2 = ((Integer) aobj[7]).intValue();
                if (k2 < 0)
                    k2 = 0;
                int l2 = ((Integer) aobj[8]).intValue();
                if (l2 < 0)
                    l2 = 0;
                int i3 = ((Integer) aobj[9]).intValue();
                if (i3 < 0)
                    i3 = 0;
                int j3 = ((Integer) aobj[10]).intValue();
                if (j3 < 0)
                    j3 = 0;
                int k3 = ((Integer) aobj[11]).intValue();
                if (k3 < 0)
                    k3 = 0;
                int l3 = ((Integer) aobj[12]).intValue();
                if (l3 < 0)
                    l3 = 0;
                String s = (String) aobj[14];
                String s1 = (String) aobj[15];
                try {
                    sbaseInstances[i4] = (EffectBase) Class.forName(s).newInstance();
                } catch (Exception _ex) {
                    _ex.printStackTrace();
                }
                if (sbaseInstances[i4] != null) {
                    sbaseInstances[i4]._mth$113(k3, this, _fld$499[i4], mediatracker, aimage, aflag);
                    sbaseInstances[i4]._mth$114(l3, this, _fld$499[i4], mediatracker, aimage, aflag);
                    int k4 = sbaseInstances[i4]._mth$335();
                    int j = _fld$499[i4].x + k2 + k4;
                    if (j >= i1 + _fld$499[i4].x && j > 0)
                        j = (i1 + _fld$499[i4].x) - 1;
                    int l = _fld$499[i4].y + l2 + k4;
                    if (l > 0 && l >= j1 + _fld$499[i4].y)
                        l = (j1 + _fld$499[i4].y) - 1;
                    i1 = _fld$499[i4].width - 2 * k4 - k2 - i3;
                    if (i1 < 1)
                        i1 = 1;
                    j1 = _fld$499[i4].height - 2 * k4 - l2 - j3;
                    if (j1 < 1)
                        j1 = 1;
                    _fld$498[i4] = new Rectangle(j, l, i1, j1);
                    Object aobj1[] = {
                        new Color(_fld$351._fld$569.getRGB())
                    };
                    if (_fld$351._fld$715 == 1)
                        sbaseInstances[i4].SetExtra(aobj1);
                    else
                        sbaseInstances[i4].SetExtra(null);
                    if (!sbaseInstances[i4]._mth$134(this, _fld$498[i4], k1, l1, mediatracker, aimage, aflag, aaudioclip, ((Integer) aobj[13]).intValue() != 0, _fld$650, s1)) {
                        sbaseInstances[i4] = null;
                    } else {
                        _fld$469[i4] = ((Integer) aobj[6]).intValue();
                        if (_fld$469[i4] < 0)
                            _fld$469[i4] = 0;
                    }
                }
            }
        }

        _fld$812 = j2;
        if (_fld$812 <= 0)
            _fld$812 = 10000;
        for (int j4 = 0; j4 < sbaseCount; j4++)
            if (sbaseInstances[j4] != null)
                sbaseInstances[j4]._fld$13 = _fld$812;

        return true;
    }

    private void _mth$158() {
        if (m_imgApplet == null || _fld$983 == null)
            return;
        if (!_fld$638) {
            int i = 0;
            int l = 0;
            Graphics g = m_imgApplet.getGraphics();
            g.setColor(_fld$351._fld$569);
            g.fillRect(_fld$975.x, _fld$975.y, _fld$975.width, _fld$975.height);
            if (_fld$643 != null) {
                l = _fld$643.length;
                for (int k1 = 0; k1 < l; k1++)
                    if (_fld$643[k1])
                        i++;

            }
            String s1 = "(" + i + "/" + l + ")";
            EffectBase.displayString(g, _fld$993 + s1, 5, 20, Color.black, Color.yellow);
            EffectBase.displayString(g, _fld$994, 5, 40, Color.black, Color.yellow);
            g.dispose();
            return;
        }
        if (!_fld$655)
            return;
        if (_fld$351 != null)
            _fld$351._mth$62(this, m_imgApplet, m_nTimeCount, _fld$975, _fld$983);
        _fld$827 = -2;
        if (_fld$637 != null && _fld$637.id != 505) {
            _fld$827 = -1;
            for (int j = sbaseCount - 1; j >= 0; j--) {
                if (!sbaseInstances[j]._mth$172())
                    continue;
                _fld$827 = j;
                break;
            }

            if (_fld$827 == -1) {
                for (int i1 = sbaseCount - 1; i1 >= 0; i1--)
                    if (hitTest(i1, _fld$637.x, _fld$637.y) > 0)
                        break;

            }
        }
        for (int k = 0; k < sbaseCount; k++)
            if (_fld$469[k] >= 0) {
                if (m_nTimeCount >= _fld$478[k] && m_nTimeCount <= _fld$432[k]) {
                    sbaseInstances[k]._mth$62(this, m_imgApplet, m_nTimeCount, _fld$499[k], _fld$499[k]);
                    sbaseInstances[k].process(this, m_imgApplet, _fld$498[k], _fld$827 != k ? null : _fld$637, m_nTimeCount);
                    sbaseInstances[k]._mth$63(this, m_imgApplet, _fld$499[k], _fld$499[k]);
                }
                if (_fld$482[k] != -1 && (m_nTimeCount < _fld$478[k] || m_nTimeCount >= _fld$432[k]) && (_fld$478[k] != 0 || _fld$432[k] != _fld$812)) {
                    _fld$482[k] = -1;
                    sbaseInstances[k].stop();
                }
            }

        if (_fld$351 != null)
            _fld$351._mth$63(this, m_imgApplet, _fld$975, _fld$983);
        int j1 = 0;
        String s = "";
        if (_fld$827 >= 0) {
            if (_fld$637.id == 501)
                _fld$647 = false;
            String as[] = {
                "", null, null
            };
            j1 = sbaseInstances[_fld$827]._mth$1015(_fld$637, as);
            if (as[0] != null)
                s = as[0];
            if (as[1] != null) {
                if (as[2] == null)
                    as[2] = "_self";
                URL url = null;
                try {
                    url = new URL(getDocumentBase(), as[1]);
                } catch (MalformedURLException _ex) {
                }
                try {
                    getAppletContext().showDocument(url, as[2]);
                } catch (Exception _ex) {
                }
                url = null;
                _fld$637 = null;
            }
        } else if (_fld$827 == -1 && _fld$652) {
            if (_fld$647)
                _fld$647 = false;
            s = m_sBack;
        }
        if (_fld$549 && !_fld$650) {
            Graphics g1 = m_imgApplet.getGraphics();
            FontMetrics fontmetrics = g1.getFontMetrics();
            int i2 = fontmetrics.stringWidth("Your Java Virtual Machine needs to ");
            int j2 = fontmetrics.stringWidth("be updated. Click here to update.");
            int l1 = Math.max(i2, j2) + 2;
            int k2 = fontmetrics.getHeight();
            if (_fld$998 != null && _fld$998.length() > 0 && _fld$637 != null && _fld$637.x <= l1 && _fld$637.y <= k2 * 2 && (_fld$637.id == 501 || _fld$637.id == 503)) {
                j1 = 12;
                EffectBase.displayString(g1, "Your Java Virtual Machine needs to ", 2, k2, Color.white, Color.red);
                EffectBase.displayString(g1, "be updated. Click here to update.", 2, k2 * 2, Color.white, Color.red);
                g1.setColor(Color.red);
                g1.drawLine(2, k2 + 1, i2 + 2, k2 + 1);
                g1.drawLine(2, k2 * 2 + 1, j2 + 2, k2 * 2 + 1);
                s = "Update your Java Virtual Machine at " + _fld$998;
                if (_fld$637.id == 501) {
                    URL url1 = null;
                    try {
                        url1 = new URL(getDocumentBase(), _fld$998);
                    } catch (MalformedURLException _ex) {
                    }
                    try {
                        getAppletContext().showDocument(url1, "_blank");
                    } catch (Exception _ex) {
                    }
                    url1 = null;
                    _fld$637 = null;
                }
            } else {
                EffectBase.displayString(g1, "Your Java Virtual Machine needs to ", 2, k2, Color.white, Color.blue);
                EffectBase.displayString(g1, "be updated. Click here to update.", 2, k2 * 2, Color.white, Color.blue);
                g1.setColor(Color.blue);
                g1.drawLine(2, k2 + 1, i2 + 2, k2 + 1);
                g1.drawLine(2, k2 * 2 + 1, j2 + 2, k2 * 2 + 1);
            }
            fontmetrics = null;
            g1.dispose();
        }
        if (j1 != _fld$807)
            m_frame.setCursor(_fld$807 = j1);
        if (!s.equals(_fld$984))
            showStatus(_fld$984 = s);
    }

    public void destroy() {
        for (int i = 0; i < sbaseCount; i++)
            if (sbaseInstances[i] != null) {
                sbaseInstances[i].stop();
                sbaseInstances[i].cleanup();
                sbaseInstances[i] = null;
            }

        System.gc();
    }

    private Frame getParentFrame() {
        java.awt.Container container;
        for (container = getParent(); container != null && !(container instanceof Frame); container = container.getParent()) ;
        return (Frame) container;
    }

    private int _mth$345(int i) {
        int k1 = 0x7fffffff;
        byte byte0 = 20;
        if (i >= _fld$812)
            return byte0;
        for (int j = 0; j < sbaseCount; j++) {
            if (_fld$469[j] < 0)
                continue;
            int k = _fld$478[j];
            int l = _fld$432[j];
            int i1;
            if (i < k) {
                _fld$482[j] = i1 = k - i;
            } else {
                if (i >= l)
                    continue;
                _fld$482[j] = sbaseInstances[j]._mth$345(i);
                i1 = sbaseInstances[j]._mth$334(i, k, l);
            }
            if (_fld$482[j] != -1 && _fld$482[j] < k1 && (k1 = _fld$482[j]) <= byte0)
                return byte0;
            if (i1 != -1 && i1 < k1 && (k1 = i1) <= byte0)
                return byte0;
        }

        if (_fld$351 != null) {
            int j1 = _fld$351._mth$334(i, 0, _fld$812);
            if (j1 != -1 && j1 < k1 && (k1 = j1) <= byte0)
                return byte0;
        }
        return k1 <= 0 || k1 == 0x7fffffff ? (_fld$812 - i) + 1 : k1;
    }

    public boolean handleEvent(Event event) {
        if (!_fld$647 && (event.id == 501 || event.id == 502 || event.id == 504 || event.id == 505 || event.id == 506 || event.id == 503)) {
            _fld$637 = event;
            if (event.id == 501) {
                _fld$647 = true;
                repaint();
            } else if (_fld$933 > 100)
                repaint();
        }
        return true;
    }

    public boolean imageUpdate(Image image, int i, int j, int k, int l, int i1) {
        if (image == _fld$661 && i == 16)
            _fld$556 = true;
        return super.imageUpdate(image, i, j, k, l, i1);
    }

    public void paint(Graphics g) {
        if (m_imgApplet != null)
            g.drawImage(m_imgApplet, 0, 0, this);
    }

    public void run() {
        if (!_fld$638) {
            MediaTracker mediatracker = new MediaTracker(this);
            int ai[] = new int[4];
            if (!initNumber(ai))
                return;
            Image aimage[] = null;
            boolean aflag[] = null;
            if (ai[0] > 0) {
                aimage = new Image[ai[0]];
                aflag = new boolean[ai[0]];
                _fld$643 = aflag;
            }
            for (int j = 0; j < ai[0]; j++)
                aflag[j] = initImage(mediatracker, aimage, j);

            AudioClip aaudioclip[] = ai[1] <= 0 ? null : new AudioClip[ai[1]];
            for (int k = 0; k < ai[1]; k++)
                initAudio(aaudioclip, k);

            initApplet();
            if ((_fld$351 = new EffectBase()) != null) {
                _fld$351._mth$113(ai[2], this, _fld$975, mediatracker, aimage, aflag);
                _fld$351._mth$114(ai[3], this, _fld$975, mediatracker, aimage, aflag);
            }
            _fld$983 = _fld$975;
            repaint();
            _mth$134(mediatracker, aimage, aflag, aaudioclip);
            for (int i1 = 0; i1 < sbaseCount; i1++) {
                if (!sbaseInstances[i1]._mth$138())
                    continue;
                _fld$549 = true;
                break;
            }

            if (System.getProperty("java.vendor").equalsIgnoreCase("Microsoft Corp."))
                _fld$998 = "http://windowsupdate.microsoft.com/";
            else
                _fld$998 = System.getProperty("java.vendor.url");
            mediatracker = null;
            aimage = null;
            aflag = null;
            aaudioclip = null;
            _fld$638 = true;
        }
        int i = _fld$888;
        try {
            runner.setPriority(runnerPriority);
        } catch (Exception _ex) {
        }
        while (_fld$888 != 0 ? i > 0 || false : true) {
            i--;
            m_nTimeCount = 0;
            do {
                long l = System.currentTimeMillis();
                _mth$1071(true);
                repaint();
                _fld$933 = _mth$345(m_nTimeCount);
                if (_fld$933 > 200)
                    _fld$933 = 200;
                if ((l = (l + (long) _fld$933) - System.currentTimeMillis()) < 0L)
                    l = 0L;
                try {
                    Thread.sleep(l);
                } catch (Exception _ex) {
                }
                while (_fld$655) {
                    Thread.yield();
                    repaint();
                }

            } while ((m_nTimeCount += _fld$933) <= _fld$812);
        }

        _mth$1071(true);
        repaint();
    }

    public void start() {
        if (runner == null) {
            runner = new Thread(this);
            runner.start();
        }
    }

    public void stop() {
        if (runner != null) {
            for (int i = 0; i < sbaseCount; i++)
                if (sbaseInstances[i] != null)
                    sbaseInstances[i].stop();

            runner.stop();
            runner = null;
        }
        System.gc();
    }

    public void update(Graphics g) {
        _mth$1071(false);
        paint(g);
    }

    private synchronized void _mth$1071(boolean flag) {
        if (flag) {
            _fld$655 = true;
        } else {
            _mth$158();
            _fld$655 = false;
        }
    }

    private Frame m_frame;
    private boolean _fld$650;
    private Image m_imgApplet;
    private int sbaseCount;
    private Event _fld$637;
    private boolean _fld$638;
    private int m_nTimeCount;
    private int _fld$812;
    private int _fld$888;
    private Rectangle _fld$983;
    private Rectangle _fld$975;
    private Thread runner;
    private EffectBase sbaseInstances[];
    private int _fld$807;
    private String _fld$984;
    private boolean _fld$647;
    private boolean _fld$652;
    private String m_sBack;
    private EffectBase _fld$351;
    private Rectangle _fld$499[];
    private Rectangle _fld$498[];
    private int _fld$827;
    private int _fld$469[];
    private int _fld$482[];
    private int _fld$478[];
    private int _fld$432[];
    private boolean _fld$655;
    public int _fld$933;
    public boolean _fld$549;
    public String _fld$998;
    public boolean _fld$556;
    public Image _fld$661;
    private boolean _fld$643[];
    private String _fld$993;
    private int runnerPriority;
    public String _fld$994;
}
