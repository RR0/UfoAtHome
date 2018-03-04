package org.rr0.archipelago.model;

import java.util.Properties;

/**
 * @author <a href="mailto:rr0@rr0.org">Jerome Beau</a>
 * @version $revision$
 */
public interface DatabaseAdapter extends MetaObjectVisitor, MetaDataSource {

    void close();

    MetaModel getDataModel();

    void setProperties(Properties properties);
}
