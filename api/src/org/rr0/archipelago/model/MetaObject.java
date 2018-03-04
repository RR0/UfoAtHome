package org.rr0.archipelago.model;

import java.util.Map;

/**
 * An instance of a MetaClass.
 *
 * @author <a href="mailto:rr0@rr0.org">Jerome Beau</a>
 * @version $revision$
 */
public interface MetaObject {
    MetaObject accept (MetaObjectVisitor visitor) throws MetaException;
//
//    Object getValue(MetaField field);
//
//    void setValue(MetaField field, Object value);

    MetaType getType();

    /**
     * Set the values for this object.
     * All other previous values will be removed.
     *
     * @param values The values to store into this object.
     */
    void setValues(Map values, MetaDataSource source);

    /**
     * Get the values contained in this object.
     *
     * @return The values, indexed by field name
     */
    Map getValues();

    /**
     * Set the value of a field of this object.
     *
     * @param fieldName The name of object's field that will hold the value
     * @param value The data value
     * @param source The source of the data
     */
    void set(String fieldName, Object value, MetaDataSource source);

    /**
     * Get a field value.
     *
     * @param fieldName The name of the field
     * @return The current value of this field
     */
    Object get(String fieldName);

    /**
     * Get the source of a given field value.
     *
     * @param fieldName The name of the field that holds the value.
     * @return The source of this field value.
     */
    MetaDataSource getSource(String fieldName);
}
