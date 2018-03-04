package org.rr0.im.service.function.classification;

/**
 * Anything that can be classified in a Category.
 * A Classifiable object can be anything but must support manual function,
 * i.e. being forced to belong to a given Classification's Category.
 *
 * @author $Author: javarome $
 * @version $Date: 2005/09/10 23:45:32 $
 */
public interface Classifiable {

    /**
     * Returns if this classifiable has been manually forced to classify in some specific Category.
     * This allows to handle "exceptions" in Classification's systems ("everything like f(x) and also Y and Z)").
     * @param classification Some Classification function.
     * @return The Category in which that Classifiable has been forced to be classified in for that Classification.
     * null if no Category has been forced for that Classifiable.
     * @associates <{org.rr0.im.service.function.classification.Category}>
     * @supplierRole forced category
     * @supplierCardinality 0..1
     */
    Category getForcedCategory(Classification classification);
}
