package org.rr0.archipelago.model;

import org.rr0.archipelago.model.MetaException;

/**
 * @author <a href="mailto:rr0@rr0.org">Jerome Beau</a>
 * @version $revision$
 */
public interface MetaObjectVisitor {
    MetaObject visit (MetaObject sighting) throws MetaException;
}
