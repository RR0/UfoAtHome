package org.rr0.poher.chart;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.util.Hashtable;
import java.util.Enumeration;

/**
 * Ce petit logiciel indique le nombre d'observations chaque heure de la journée.
 *
 * @author Jerome Beau
 * @version Java
 * @author Claude Poher (1971)
 * @version Future Basic
 */
public class StatParHeure {
    private Hashtable heure = new Hashtable();

    public StatParHeure(String fileName) throws IOException {

        BufferedReader bufferedReader = new BufferedReader(new FileReader(fileName));
        try {
            while (bufferedReader.ready()) {
                String t = bufferedReader.readLine();
                if (t.length() == 80) {
                    String l = bufferedReader.readLine();
                    String js = t.substring(14, 16);
                    Integer hour = Integer.valueOf(js);
                    Integer currentCount = (Integer) heure.get(hour);
                    Integer newValue;
                    if (currentCount == null) {
                        newValue = new Integer (1);
                    } else {
                        newValue = new Integer(currentCount.intValue() + 1);
                    }
                    heure.put(hour, newValue);
                }
            }
        } finally {
            bufferedReader.close();
        }

        System.out.println("Nombre de cas par heure");
        System.out.println();
        int total = 0;
        Enumeration iterator = heure.keys();
        while (iterator.hasMoreElements()) {
            Integer hour = (Integer) iterator.nextElement();
            Integer countForThisHour = (Integer) heure.get(hour);
            System.out.println(getHourLabel(hour) + " : " + countForThisHour + " Observations");
            total += countForThisHour.intValue();
        }
        System.out.println();
        System.out.println("Soit au total = " + total + " observations escomptées");
    }

    private String getHourLabel(Integer hour) {
        String label;
        switch (hour.intValue()) {
            case 97:
                label = "Aucune indication";
                break;
            case 98:
                label = "Heure inconnue, indication \"de nuit\"";
                break;
            case 99:
                label = "Heure inconnue, indication \"de jour\"";
                break;
            default:
                label = hour + " H";
        }
        return label;
    }

    public static void main(String[] args) throws IOException {
        String fileName = args[0];
        StatParHeure statSources = new StatParHeure(fileName);
    }
}
