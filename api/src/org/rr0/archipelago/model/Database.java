package org.rr0.archipelago.model;

/**
 * @author <a href="mailto:rr0@rr0.org">Jerome Beau</a>
 * @version $revision$
 */
public interface Database extends MetaDataSource {
    MetaModel getDataModel();

    boolean isEnabled();

    void setName(String name);

    void setAdapter(DatabaseAdapter adapter);

    void setEnabled(boolean enabled);

    DatabaseAdapter getAdapter();
}
