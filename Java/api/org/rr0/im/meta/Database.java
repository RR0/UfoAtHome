package org.rr0.im.meta;

import org.rr0.im.business.DatabaseMapping;

/**
 * @author <a href="mailto:rr0@rr0.org">Jerome Beau</a>
 * @version $revision$
 */
public interface Database extends MetaDataSource {
    DatabaseMapping getMapping();
}
