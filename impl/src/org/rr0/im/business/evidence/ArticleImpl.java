package org.rr0.im.business.evidence;

import org.rr0.im.business.actor.Actor;
import org.rr0.im.business.event.circumstance.Moment;

/**
 * Article Reference Implementation.
 *
 * @author Jérôme Beau
 * @version 19 juil. 2003 15:19:35
 */
public class ArticleImpl extends DocumentImpl implements Article {
    public ArticleImpl(String title, Actor author) {
        super(title, author);
    }

    public ArticleImpl(String title, Actor author, Moment releaseDate) {
        this(title, author);
//        getHistory().addEvent(new EventImpl ("First release", releaseDate));
    }
}
