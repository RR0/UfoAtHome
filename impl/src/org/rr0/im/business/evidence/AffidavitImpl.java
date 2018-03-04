package org.rr0.im.business.evidence;

import org.rr0.im.business.evidence.Affidavit;
import org.rr0.im.business.actor.Actor;

/**
 * Affidavit Reference Implementation.
 *
 * @author Jérôme Beau
 * @version 18 juin 2003 20:55:17
 */
public class AffidavitImpl extends DocumentImpl implements Affidavit
{
    public AffidavitImpl (String text, Actor author) {
        super (text, author);
    }
}
