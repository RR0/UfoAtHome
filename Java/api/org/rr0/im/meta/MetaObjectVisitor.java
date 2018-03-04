package org.rr0.im.meta;

import org.rr0.im.business.meta.MetaException;

/**
 * @author <a href="mailto:rr0@rr0.org">Jerome Beau</a>
 * @version $revision$
 */
public interface MetaObjectVisitor {
    MetaObject visit (MetaObject sighting) throws MetaException;
}
