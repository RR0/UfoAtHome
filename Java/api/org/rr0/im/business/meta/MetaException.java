package org.rr0.im.business.meta;

/**
 * @author <a href="mailto:rr0@rr0.org">Jerome Beau</a>
 * @version $revision$
 */
public class MetaException extends Exception {
    public MetaException() {
    }

    public MetaException(String message) {
        super(message);
    }

    public MetaException(Throwable someCause) {
        super(someCause);
    }

    public MetaException(String message, Throwable someCause) {
        super(message, someCause);
    }
}
