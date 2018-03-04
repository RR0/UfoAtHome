package org.rr0.im.service.function.classification;

import org.rr0.im.business.event.Event;
import org.rr0.im.business.event.Sighting;
import org.rr0.im.business.event.circumstance.Location;
import org.rr0.im.business.event.circumstance.Moment;
import org.rr0.im.business.event.circumstance.MomentFactory;
import org.rr0.im.business.event.sighting.UFO;
import org.rr0.im.business.event.sighting.UFOShape;
import org.rr0.im.business.report.Account;

import java.awt.*;
import java.util.Vector;
import java.util.Enumeration;

/**
 * A function that filters for Nocturnal Lights, according to Hynek classification.
 *
 * @author Jerome Beau
 * @version 0.3
 */
public class DaylightDiscFilter implements Category {
    private static final float MIN_BRIGHTNESS = 90;

    public String getName() {
        return "NL";
    }

    public boolean accept(Object filterable) {
        boolean accepted = false;
        if (filterable instanceof Account) {
            Account account = ((Account) filterable);

            Moment begining = account.getBegining();
            Object content = account.getContent();
            if (content instanceof Vector) {
                Vector events = (Vector) content;
                Enumeration iterator = events.elements();
                while (iterator.hasMoreElements()) {
                    Event event = (Event) iterator.nextElement();
                    if (event instanceof Sighting) {
                        Sighting sighting = (Sighting) event;
                        Location thisLocation = sighting.getLocation();
                        Moment sunsetMoment = MomentFactory.getSunsetMoment(begining, thisLocation);
                        if (begining.isAfter(sunsetMoment)) { // Nocturnal ?
                            Vector ufOs = sighting.getUFOs();
                            Enumeration ufosIterator = ufOs.elements();
                            while (ufosIterator.hasMoreElements()) {
                                UFO ufo = (UFO) ufosIterator.nextElement();
                                Vector ufoShapes = ufo.getShapes();
                                Enumeration shapesIterator = ufoShapes.elements();
                                while (shapesIterator.hasMoreElements()) {
                                    UFOShape ufoShape = (UFOShape) shapesIterator.nextElement();
                                    Color shapeColor = ufoShape.getColor();
                                    float[] hsbvals = new float[3];
                                    Color.RGBtoHSB(shapeColor.getRed(), shapeColor.getGreen(), shapeColor.getBlue(), hsbvals);
                                    // Light ?
                                    boolean brillant = (hsbvals[2] > MIN_BRIGHTNESS);
                                }
                            }
                            // At a distance
                            // In the sky
                            // Excluding plane lights, meteors and related

                            // Allowed : mutiple, various size and shape, color changes, weird trails, halos
                        }
                    }
                }
            }
        }
        return accepted;
    }
}
