package org.rr0.archipelago.model;

import java.util.Set;

/**
 * @author <a href="mailto:rr0@rr0.org">Jerome Beau</a>
 * @version $revision$
 */
public interface MetaFunction {

    void add(MetaField parameter);

    Set<MetaField> getParameters();

    String getName();

    void setName(String name);

    MetaField createParameter();

    MetaType getReturnType();

    void setReturnType(MetaType returnType);
}
