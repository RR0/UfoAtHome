package org.rr0.poher.chart;

import java.applet.Applet;
import java.util.StringTokenizer;
import java.util.Hashtable;
import java.util.Vector;
import java.util.Enumeration;
import java.awt.*;

/**
 * @author Jerome Beau
 * @version 0.3
 *          <p/>
 *          <p/>
 *          <table border cellspacing=0 cellpadding=5 >
 *          <caption>Classes A et B (r&eacute;sultats partiels)</caption>
 *          <tr>
 *          <th>Explication</th>
 *          <th>Nombre de cas</th>
 *          </tr>
 *          <tr>
 *          <td>Avion&nbsp; <br>
 *          Ballon&nbsp; <br>
 *          Rentr&eacute;e atmosph&eacute;rique&nbsp; <br>
 *          Plan&egrave;te&nbsp; <br>
 *          Lune&nbsp; <br>
 *          Bolide&nbsp; <br>
 *          H&eacute;licopt&egrave;re&nbsp; <br>
 *          Satellite&nbsp; <br>
 *          Fus&eacute;e&nbsp; <br>
 *          Etoile&nbsp; <br>
 *          Soleil&nbsp; <br>
 *          Nuage&nbsp; <br>
 *          Montgolfi&egrave;re&nbsp; <br>
 *          Feux&nbsp; <br>
 *          Train&eacute;e avion&nbsp; <br>
 *          Physique &eacute;lec.&nbsp; <br>
 *          Artifice p&eacute;tard&nbsp; <br>
 *          Gla&ccedil;on&nbsp; <br>
 *          Phare&nbsp; <br>
 *          Canular</td>
 *          <td>30&nbsp; <br>
 *          25&nbsp; <br>
 *          20&nbsp; <br>
 *          17&nbsp; <br>
 *          10&nbsp; <br>
 *          8&nbsp; <br>
 *          7&nbsp; <br>
 *          6&nbsp; <br>
 *          5&nbsp; <br>
 *          4&nbsp; <br>
 *          4&nbsp; <br>
 *          3&nbsp; <br>
 *          2&nbsp; <br>
 *          2&nbsp; <br>
 *          2&nbsp; <br>
 *          2&nbsp; <br>
 *          1&nbsp; <br>
 *          1&nbsp; <br>
 *          1&nbsp; <br>
 *          1</td>
 *          </tr>
 *          </table>
 */
public class ChartApplet extends Applet {
    private static final String TABLE_HEADER = "th";
    private Hashtable columnToValues;
    private String currentColumn;
    private int barHeight = 20;
    private static final String CAPTION = "caption";
    private String title;
    public static final String TABLE_ROW = "tr";

    public void init() {
        super.init();
        String table = getParameter("table");
        parseTable(table);
    }

    public void paint(Graphics g) {
        Enumeration enumeration = columnToValues.keys();
        while (enumeration.hasMoreElements()) {
            String column = (String) enumeration.nextElement();
            Vector values = (Vector) columnToValues.get(column);
            int yPos = 10;
            int barX = 100;
            for (int i = 0; i < values.size(); i++) {
                double value = new Double((String) values.elementAt(i)).doubleValue();
                g.fillRect(barX, yPos * barHeight, barX + (int) value, barHeight);
            }
        }
    }

    private void parseTable(String table) {
        StringTokenizer tokenizer = new StringTokenizer(table, "<>");
        String s = tokenizer.nextToken();// <table>
        columnToValues = new Hashtable();
        parseTableRows(tokenizer);
    }

    private void parseTableRows(StringTokenizer tokenizer) {
        parseTableHeader(tokenizer);
        while (tokenizer.hasMoreTokens()) {
            parseTableRow(tokenizer);
        }
    }

    private void parseTableRow(StringTokenizer tokenizer) {
        String s = tokenizer.nextToken();// <th> or <tr>
        Enumeration enumeration = columnToValues.keys();
        while (tokenizer.hasMoreTokens()) {
            currentColumn = (String) enumeration.nextElement();
            Vector values = (Vector) columnToValues.get(currentColumn);
            parseTableValue(tokenizer, values);
        }
        tokenizer.nextToken();  // </tr>
    }

    private void parseTableValue(StringTokenizer tokenizer, Vector values) {
        String tableColumn = tokenizer.nextToken();    // <td> or <th>
        String value = tokenizer.nextToken();
        values.addElement(value);
        tokenizer.nextToken();  // </th> or </td>
    }

    private void parseTableHeader(StringTokenizer tokenizer) {
        String headerTag = tokenizer.nextToken();    // <caption> or <tr>
        if (CAPTION.equalsIgnoreCase(headerTag)) {
            title = tokenizer.nextToken();
            headerTag = tokenizer.nextToken();  // </th> or </td>
            headerTag = tokenizer.nextToken();    // <caption> or <tr>
        }
        if (TABLE_ROW.equalsIgnoreCase(headerTag)) {
            getNonSpacesToken(tokenizer);
            do {
                currentColumn = getNonSpacesToken(tokenizer);
                Vector values = new Vector();
                columnToValues.put(currentColumn, values);
                headerTag = tokenizer.nextToken();  // </th> or </td>
                headerTag = getNonSpacesToken(tokenizer);  // </tr>
            } while (!headerTag.equalsIgnoreCase(TABLE_ROW));
        }
    }

    private String getNonSpacesToken(StringTokenizer tokenizer) {
        String headerTag;
        do {
            headerTag = tokenizer.nextToken().trim();
        } while (headerTag.length() == 0);
        return headerTag;
    }
}
