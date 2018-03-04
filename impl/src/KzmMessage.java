
import java.applet.Applet;
import java.awt.*;
import java.util.Random;
import java.util.Vector;
import java.net.URL;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.InputStream;

public class KzmMessage extends Applet implements Runnable {
    private static final int STATIC = 0;
    private static final int ORDER = 2;
    private static final int RANDOM = 1;
    private static final int APPLET = 10;

    String getParameter(String key, String defaultValue) {
        key = getParameter(key);
        if (key == null) {
            return defaultValue;
        } else {
            return key;
        }
    }

    int getParameterInt(String s, int i) {
        s = getParameter(s, null);
        if (s != null)
            return Integer.parseInt(s);
        else
            return i;
    }

    String[] getParameterList(String s, char c) {
        String s1 = s;
        String as[] = null;
        if (s != null) {
            int i;
            int k;
            for (k = 0; (i = s1.indexOf(c)) >= 0; k++) {
                s1 = s1.substring(i + 1);
            }

            if (s1.length() > 0) {
                k++;
            }
            as = new String[k];
            s1 = s;
            for (int l = 0; l < as.length; l++) {
                int j = s1.indexOf(c);
                if (j < 0) {
                    as[l] = s1.substring(0, s1.length());
                    s1 = null;
                } else {
                    as[l] = s1.substring(0, j);
                    s1 = s1.substring(j + 1);
                }
            }

        }
        return as;
    }

    int[] getParameterIntList(String s, char c) {
        String s1 = s;
        int ai[] = null;
        if (s != null) {
            int i;
            int k;
            for (k = 0; (i = s1.indexOf(c)) >= 0; k++)
                s1 = s1.substring(i + 1);

            if (s1.length() > 0)
                k++;
            ai = new int[k];
            s1 = s;
            for (int l = 0; l < ai.length; l++) {
                int j = s1.indexOf(c);
                if (j < 0) {
                    ai[l] = Integer.parseInt(s1.substring(0, s1.length()));
                    s1 = null;
                } else {
                    ai[l] = Integer.parseInt(s1.substring(0, j));
                    s1 = s1.substring(j + 1);
                }
            }

        }
        return ai;
    }

    public String defineMessage(int i) {
        String s;
        if (i == 1 || i == 0) {
            int j = (int) ((new Random()).nextFloat() * (float) textFile.size() + 1.0F);
            s = (String) textFile.elementAt(j - 1);
        } else {
            messageLine++;
            if (messageLine >= textFile.size())
                messageLine = 0;
            s = (String) textFile.elementAt(messageLine);
        }
        return s;
    }

    public int defineType() {
        byte byte0;
        if (getParameter("message_type", "applet").compareTo("applet") == 0) {
            byte0 = APPLET;
            theMessage = getParameter("message_file", "Message file parameter is not set");
        } else {
            String s = getParameter("message_file", "message.txt");
            String s1 = getParameter("sequence", "random");
            if (s1.compareTo("static") == 0)
                byte0 = STATIC;
            else if (s1.compareTo("order") == 0)
                byte0 = ORDER;
            else
                byte0 = RANDOM;
            boolean read = readFile(s);
            if (! read) {
                byte0 = APPLET;
                theMessage = "File Error... please check !";
            }
        }
        return byte0;
    }

    public final synchronized boolean readFile(String filename) {
        textFile = new Vector();
        try {
            String documentBase = getDocumentBase().toString();
            int i = documentBase.lastIndexOf("/");
            filename = documentBase.substring(0, i + 1) + "/" + filename;
            URL url = new URL(filename);
            InputStream inputstream = url.openStream();
            BufferedReader reader = new BufferedReader(new InputStreamReader(inputstream));
            String s1;
            while ((s1 = reader.readLine()) != null) {
                textFile.addElement(s1);
            }

        } catch (Exception _ex) {
            _ex.printStackTrace();
            textFile = null;
            return false;
        }
        return true;
    }

    public void init() {
        int i = 0;
        messageType = defineType();
        if (messageType != APPLET) {
            theMessage = defineMessage(messageType);
        }
        delta = getParameterInt("shift", 5);
        delay = getParameterInt("delay", 50);
        scrollX = 0;
        scrollY = 0;
        scrollW = getSize().width;
        scrollH = getSize().height;
        int ai[] = getParameterIntList(getParameter("back_color", "0 0 0"), ' ');
        recColor = new Color(ai[0], ai[1], ai[2]);
        ai = getParameterIntList(getParameter("text_color", "255 255 255"), ' ');
        txtColor = new Color(ai[0], ai[1], ai[2]);
        if (getParameter("font_bold", "no").compareTo("yes") == 0) {
            i++;
        }
        if (getParameter("font_italic", "no").compareTo("yes") == 0) {
            i += 2;
        }
        font = new Font("Helvetica", i, getParameterInt("font_size", 14));
        osImage = createImage(scrollW, scrollH);
        osGraphics = osImage.getGraphics();
    }

    public void start() {
        curX = scrollW + scrollX;
        startThread();
    }

    public void stop() {
        messageThread = null;
    }

    void startThread() {
        messageThread = new Thread(this);
        messageThread.start();
    }

    public void destroy() {
        osGraphics.dispose();
    }

    public void paint(Graphics g) {
        g.drawImage(osImage, 0, 0, null);
    }

    public void update(Graphics g) {
        paint(g);
    }

    public void run() {
        for (Thread thread = Thread.currentThread(); messageThread == thread;) {
            osGraphics.setColor(recColor);
            osGraphics.fillRect(0, 0, getSize().width, getSize().height);
            osGraphics.setColor(txtColor);
            osGraphics.setFont(font);
            if (fontM == null) {
                fontM = getGraphics().getFontMetrics(font);
                messageW = fontM.stringWidth(theMessage);
                messageH = fontM.getHeight();
            }
            curX -= delta;
            if (curX < -messageW) {
                curX = scrollW + scrollX;
                if (messageType == 1 || messageType == 2) {
                    theMessage = defineMessage(messageType);
                    fontM = getGraphics().getFontMetrics(font);
                    messageW = fontM.stringWidth(theMessage);
                    messageH = fontM.getHeight();
                }
            }
            osGraphics.drawString(theMessage, curX, (scrollH - messageH) / 2 + scrollY + fontM.getAscent());
            repaint();
            try {
                Thread.sleep(delay);
            } catch (Exception _ex) {
                _ex.printStackTrace();
            }
        }

    }

    public KzmMessage() {
        messageLine = -1;
    }

    private int messageLine;
    private Thread messageThread;
    private Vector textFile;
    private int messageType;
    private String theMessage;
    private int scrollX;
    private int scrollY;
    private int scrollW;
    private int scrollH;
    private int delta;
    private int delay;
    private Color recColor;
    private Color txtColor;
    private int curX;
    private int messageW;
    private int messageH;
    private FontMetrics fontM;
    private Font font;
    private Image osImage;
    private Graphics osGraphics;
}
