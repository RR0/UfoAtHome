package org.rr0.poher.chart;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.Enumeration;
import java.util.Hashtable;
import java.util.Vector;

/**
 * Ce logiciel permet de faire la majorité des statistiques utiles,
 * évidemment il faut se reporter à la méthode de codage pour interpréter les résultats.
 *
 * @author Jerome Beau
 * @version Java
 * @author Claude Poher (1971)
 * @version Future Basic
 */
public class StatSurUneColonne {
    private Vector ts = new Vector();
    private Hashtable n = new Hashtable();

    public StatSurUneColonne(String fileName) throws IOException {

        int total = 0;
        BufferedReader bufferedReader = new BufferedReader(new FileReader(fileName));
        try {
            while (bufferedReader.ready()) {
                String t = bufferedReader.readLine();
                if (t.length() == 80) {
                    ts.addElement(t);
                    total++;
                    bufferedReader.readLine();
                }
            }
        } finally {
            bufferedReader.close();
        }

        System.out.println("Le fichier contient " + total + " lignes");
        int no = 0;
        String texte;
        do {
            System.out.print("Numero de caractère codé a etudier, et texte explicatif : ");
            BufferedReader console = new BufferedReader(new InputStreamReader(System.in));
            String readLine = console.readLine();
            int sep = readLine.indexOf(",");
            if (sep > 1) {
                texte = readLine.substring(sep + 1);
                no = Integer.parseInt(readLine.substring(0, sep));
            }
        } while (no < 22 || no > 80);

        int tot = 0;
        for (int i = 0; i < total; i++) {
            String ligne = (String) ts.elementAt(i);
            Character c = new Character(ligne.charAt(no - 1));
            Integer currentValue = (Integer) n.get(c);
            Integer newValue;
            if (currentValue == null) {
                newValue = new Integer(1);
            } else {
                newValue = new Integer(currentValue.intValue() + 1);
            }
            n.put(c, newValue);
            if (c.charValue() != '0') {
                tot++;
            }
        }

        System.out.println("Code" + " Nombre" + "% de " + tot);

        Enumeration enumeration = n.keys();
        while (enumeration.hasMoreElements()) {
            Character c = (Character) enumeration.nextElement();
            Integer value = (Integer) n.get(c);
            if (value.intValue() > 0) {
                int percent = ((int) (1000 * value.intValue() / tot)) / 10;
                System.out.println(c + " " + value + " " + percent);
            }
        }

        System.out.println();
        System.out.println("Total avec indication non nulle = " + tot);
    }

    public static void main(String[] args) throws IOException {
        String fileName = args[0];
        StatSurUneColonne statSources = new StatSurUneColonne(fileName);
    }
}
