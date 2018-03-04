package org.rr0.poher.chart;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.util.Vector;

/**
 * Ce logiciel indique le nombre d'observations du fichier provenant de chaque source.
 *
 * @author Jerome Beau
 * @version Java
 * @author Claude Poher (1971)
 * @version Future Basic
 */
public class StatSources {

    private Vector sources;
    private Vector n;

    public StatSources(String fileName) throws IOException {
        initSources();

        int i = 0;
        BufferedReader bufferedReader = new BufferedReader(new FileReader(fileName));
        try {
            while (bufferedReader.ready()) {
                String t = bufferedReader.readLine();
                if (t.length() == 80) {
                    String l = bufferedReader.readLine();
                    int j = Integer.parseInt (t.substring(4, 6));
                    Integer newValue = new Integer(((Integer) n.elementAt(j)).intValue() + 1);
                    n.insertElementAt(newValue, j);
                }
            }
        } finally {
            bufferedReader.close();
        }

        for (int j = 0; j <= 80; j++) {
            int nValue = ((Integer) n.elementAt(j)).intValue();
            i += nValue;
            if (nValue > 0) {
                System.out.println(nValue + " venant de : " + sources.elementAt (j));
            }
        }
        System.out.println("Soit au total = " + i);
    }

    private void initSources() {
        sources = new Vector();
        n = new Vector();
        for (int i = 0; i <= 80; i++) {
            n.addElement (new Integer (0));
            if (i < 51) {
                sources.addElement ("Bulletin du GEPA N°" + i);
            } else {
                sources.addElement ("");
            }
        }
        sources.insertElementAt ("Source inconnue", 0);
        sources.insertElementAt ("Les soucoupes volantes affaire sérieuse - Franck Edwards", 51);
        sources.insertElementAt ("UFO : le plus grand problème scientifique de notre temps - J.E. Mac Donald", 52);
        sources.insertElementAt ("Le livre noir des soucoupes volantes - H. Durant", 53);
        sources.insertElementAt ("Témoignages directs à Claude Poher", 54);
        sources.insertElementAt ("Rapports officiels français - Gendarmerie etc ...", 55);
        sources.insertElementAt ("Rapport de la Commission Condon", 56);
        sources.insertElementAt ("Phénomènes insolites de l'espace - J. Vallée", 57);
        sources.insertElementAt ("Du nouveau sur les soucoupes volantes - F. Edwards", 61);
        sources.insertElementAt ("Des signes dans le ciel - P. Misraki", 62);
        sources.insertElementAt ("The whole story", 69);
        sources.insertElementAt ("Flying saucer review", 72);
        sources.insertElementAt ("Présence des extraterrestres", 73);
        sources.insertElementAt ("Lumières dans la nuit (revue)", 74);
        sources.insertElementAt ("Observations classiques, reprises par plusieurs sources", 80);
    }

    public static void main(String[] args) throws IOException {
        String fileName = args[0];
        StatSources statSources = new StatSources(fileName);
    }
}
