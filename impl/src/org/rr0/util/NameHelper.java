package org.rr0.util;

import java.util.StringTokenizer;

/**
 * Utility class to format names.
 *
 * @author Jérôme Beau
 * @version 3 mai 2003 23:43:36
 */
public class NameHelper  {

    /**
     * @param name A name.
     * @return A concatenation of capital letters that summarize the name.
     */
    public static String toAcronym (String name) {
        return toAcronym(name, "");
    }

    /**
     * @param name A name.
     * @param separator A separator between returned letters (" " or ". " for example)
     * @return A concatenation of capital letters that summarize the name.
     */
    public static String toAcronym (String name, String separator) {
        StringBuffer acronymBuffer = new StringBuffer();
        StringTokenizer nameTokenizer = new StringTokenizer(name);
        while (nameTokenizer.hasMoreTokens()) {
            String word = nameTokenizer.nextToken();
            acronymBuffer.append(Character.toUpperCase(word.charAt(0))).append (separator);
        }
        return acronymBuffer.toString();
    }

    public static String getFullName (String[] firstNames, String lastName) {
        StringBuffer fullNameBuffer = new StringBuffer();
        String separator = "";
        for (int i = 0; i < firstNames.length; i++) {
            fullNameBuffer.append (separator).append (firstNames[i]);
        }
        fullNameBuffer.append (lastName);
        return fullNameBuffer.toString();
    }
}
