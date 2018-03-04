package org.rr0.archipelago.model;

import java.util.Set;

/**
 * @author Jérôme Beau
 * @version 8 mai 2006 01:52:46
 */
public interface MetaModel {
    Set<MetaType> getClasses();

    Set<MetaFunction> getFunctions();

    boolean isEmpty();

    void addMetaType(MetaType metaType);

    void addFunction(MetaFunction metaFunction);

    MetaType createType();

    MetaFunction createFunction();
}
