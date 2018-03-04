package org.rr0.im.meta;

/**
 * @author <a href="mailto:rr0@rr0.org">Jerome Beau</a>
 * @version $revision$
 */
public interface MetaField {
    /**
     *
     * @return The MetaObject the field belongs to.
     */
    MetaType getOwner();

    /**
     *
     * @return The name of the field
     */
    String getName();

    /**
     * Retrive the field data from the mapped databases
     */
    void retrieve(Object databaseMappings);

    void setOwner(MetaType metaClass);
}
