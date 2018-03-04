package org.rr0.ufoathome.view.draw;

import java.util.Calendar;
import java.util.EventObject;

/**
 * @author Jerôme Beau
 * @version 30 janv. 2004 20:41:33
 *          $Revision: 1.1 $
 */
public class AnimationEvent extends EventObject {
    private Calendar time;

    public Calendar getTime() {
        return time;
    }

    public AnimationEvent(Object source, Calendar currentTime) {
        super(source);
        this.time = currentTime;
    }
}
