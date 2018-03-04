package org.rr0.im.business.actor;

import java.util.Vector;

/**
 * A being that cannot be classified in a known category.
 *
 * @author Jérôme Beau
 * @version 21 juin 2003 14:50:36
 */
public interface UnidentifiedBeing extends Being
{
    Vector getEyes();
    Vector getArms();
    Vector getLegs();
}
