package org.rr0.ufoathome.model.ufo;

import org.rr0.ufoathome.view.draw.DrawShape;
import org.rr0.ufoathome.view.draw.SVG;
import org.rr0.ufoathome.view.draw.TagHelper;

import java.awt.*;
import java.util.Enumeration;

/**
 * Helper class to build Uniform Ufological Data Format (SVG) character Strings from common Java objects.
 *
 * @author Jerôme Beau
 * @version 0.3
 */
public class UUDF {
    private static final String VERSION = "0.3";

    public static String bounds(Rectangle bounds) {
        StringBuffer uudfBuffer = new StringBuffer();
        uudfBuffer.append("<bounds");
        uudfBuffer.append(" x=\"").append(bounds.x).append("\"");
        uudfBuffer.append(" y=\"").append(bounds.y).append("\"");
        uudfBuffer.append(" width=\"").append(bounds.width).append("\"");
        uudfBuffer.append(" height=\"").append(bounds.height).append("\"");
        uudfBuffer.append("/>");
        return uudfBuffer.toString();
    }

    public static String angle(double angle) {
        StringBuffer uudfBuffer = new StringBuffer();
        uudfBuffer.append("<angle");
        uudfBuffer.append(" value=\"").append(angle).append("\"");
        uudfBuffer.append("/>");
        return uudfBuffer.toString();
    }

    public static String freeText(String text) {
        StringBuffer uudfBuffer = new StringBuffer();
        uudfBuffer.append("<![CDATA[\n").append(text).append("\n]]>\n");
        return uudfBuffer.toString();
    }

    public static void appendElement(StringBuffer sb, String elementName, String content) {
        sb.append('<').append(elementName).append('>').append(content).append("</").append(elementName).append('>');
    }

    public static void appendVersion(StringBuffer uudfBuffer) {
        uudfBuffer.append("xmlns=\"http://ufoathome.org/uudf/\"").append(VERSION).append('/').append(' ')
                .append("version=\"").append(VERSION).append("\">");
    }

    public static void appendUfoScene(StringBuffer uudfBuffer, UFOSceneModel model) {
        uudfBuffer.append(model.toString());    // TODO(JBE): Sky tag helper
        uudfBuffer.append(model.witness.toString());
        Enumeration enumeration = model.descriptions.keys();
        while (enumeration.hasMoreElements()) {
            Object timeKey = enumeration.nextElement();
            String description = (String) model.descriptions.get(timeKey);
            if (description != null && description.length() > 0) {
                uudfBuffer.append("<description time=\"").append(timeKey).append("\">");
                TagHelper.appendFreeText(uudfBuffer, description);
                uudfBuffer.append("</description>");
            }
        }
    }

    public static String toString(Object object) {
        StringBuffer uudfBuffer = new StringBuffer();
        uudfBuffer.append("<uudf ");
        //        uudfBuffer.append("width="12cm" height="5.25cm")");
        UUDF.appendVersion(uudfBuffer);
        uudfBuffer.append("\n");
        if (object instanceof DrawShape) {
            uudfBuffer.append(SVG.toString(object));
        } else {
            uudfBuffer.append(object);
        }
        uudfBuffer.append("</uudf>");
        return uudfBuffer.toString();
    }
}
