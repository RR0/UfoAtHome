package org.rr0.im.meta;

import org.rr0.im.business.meta.MetaException;

/**
 * @author <a href="mailto:rr0@rr0.org">Jerome Beau</a>
 * @version $revision$
 */
public interface MetaClassVisitor {
    void visit (MetaObject sighting) throws MetaException;
}
