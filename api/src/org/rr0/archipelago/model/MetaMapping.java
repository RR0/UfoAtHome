package org.rr0.archipelago.model;

import java.util.Set;

/**
 * @author Jérôme Beau
 * @version 10 juin 2006 18:48:02
 */
public interface MetaMapping {

    MetaModel getMetaModel();

    Set<Database> getDatasources();

    void setMetaModel(MetaModel metaModel);
}
