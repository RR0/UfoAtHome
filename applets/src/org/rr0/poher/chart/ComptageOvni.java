package org.rr0.poher.chart;

import java.io.*;

/**
 * Ce type de logiciel est utile pour compter les observations dans des fichiers constituant des sous groupes
 * à partir du fichier de 735 observations, afin de comparer les résultats statistiques :
 * par exemple sous groupe des observations faites en France, sous groupe des observations de source officielle.
 *
 * @author Jerome Beau
 * @version Java
 * @author Claude Poher (1971)
 * @version Future Basic
 */
public class ComptageOvni {
    public static void main(String[] args) throws IOException {
        int i = 0;

        String fileName = args[0];
        BufferedReader bufferedReader = new BufferedReader(new FileReader(fileName));
        try {
            while (bufferedReader.ready()) {
                String t = bufferedReader.readLine();
                if (t.length() == 80) {
                    String l = bufferedReader.readLine();
                    System.out.print(t.substring(0, 4) + "   ");
                    System.out.print(t.substring(6, 8) + " ");
                    System.out.print(t.substring(8, 10) + " ");
                    System.out.println(t.substring(10, 14) + " ");
                    System.out.println(l);
                    i++;
                }
            }
        } finally {
            bufferedReader.close();
        }

        System.out.println();
        System.out.println("Nombre total de témoignages OVNI = " + i);
        System.out.println("soit % des 735 = " + 100 * i / 735);
    }
}
