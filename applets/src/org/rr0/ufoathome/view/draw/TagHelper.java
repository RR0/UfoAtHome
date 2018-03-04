package org.rr0.ufoathome.view.draw;

/**
 * An utility class to write XML tags.
 *
 * @author Jerome Beau
 * @version 0.3
 */
public class TagHelper {
    public static void appendFreeText(StringBuffer uudfBuffer, String text) {
        uudfBuffer.append("<![CDATA[").append(text).append("]]>");
    }

    public static void appendElement(StringBuffer sb, String elementName, String content) {
        sb.append('<').append(elementName).append('>').append(content).append("</").append(elementName).append('>');
    }

    public static String pretty(String xmlContent, String indenter) {
        StringBuffer xmlBuffer = new StringBuffer(xmlContent);
        int charPos = 0;
        int level = 0;
        boolean insideTag = false;
        boolean lastWasTag = false;
        while (charPos < xmlBuffer.length()) {
            char c = xmlBuffer.charAt(charPos);
            switch (c) {

                case '<':
                    if (!insideTag) {
                        insideTag = true;
                        if (xmlBuffer.charAt(charPos + 1) == '/') {
                            level--;
                        }
                        if (lastWasTag) {
                            xmlBuffer.insert(charPos, '\n');
                            charPos++;
                            for (int j = 0; j < level; j++) {
                                xmlBuffer.insert(charPos, indenter);
                                charPos += indenter.length();
                            }
                        }
                        if (xmlBuffer.charAt(charPos + 1) != '/') {
                            level++;
                        }
                    }
                    break;

                case '/':
                    if (insideTag && xmlBuffer.charAt(charPos + 1) == '>') {
                        level--;
                    }
                    break;

                case '>':
                    if (insideTag) {
                        insideTag = false;
                        lastWasTag = true;
                    }
                    break;

                case ' ':
                case '\n':
                    break;

                default:
                    if (!insideTag) {
                        lastWasTag = false;
                    }
            }
            charPos++;
        }
        return xmlBuffer.toString();
    }
}
