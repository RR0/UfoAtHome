package org.rr0.archipelago.model;

import java.util.Map;

/**
 * Created by IntelliJ IDEA.
 * User: javarome
 * Date: 16 oct. 2010
 * Time: 12:17:21
 * To change this template use File | Settings | File Templates.
 */
public class MetaObjectImpl implements MetaObject {
    public MetaObjectImpl(MetaType type) {
    }

    public MetaObject accept(MetaObjectVisitor visitor) throws MetaException {
        throw new RuntimeException("Not implemented");
    }

    public MetaType getType() {
        throw new RuntimeException("Not implemented");
    }

    public void setValues(Map values, MetaDataSource source) {
        throw new RuntimeException("Not implemented");
    }

    public Map getValues() {
        throw new RuntimeException("Not implemented");
    }

    public void set(String fieldName, Object value, MetaDataSource source) {
        throw new RuntimeException("Not implemented");
    }

    public Object get(String fieldName) {
        throw new RuntimeException("Not implemented");
    }

    public MetaDataSource getSource(String fieldName) {
        throw new RuntimeException("Not implemented");
    }
}
