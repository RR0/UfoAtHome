package org.rr0.im.service.function.classification;

import org.rr0.im.service.function.Function;

import java.util.Vector;

/**
 * A named function system.
 * Such a function contains one or more mutualy exclusive categories.
 *
 * @author Jérôme Beau
 * @version 18 mai 2003 20:13:38
 */
public interface Classification extends Function {
    /**
         * Add a category to this Classification
         *
         * @param someCategory
         */
    void add(Category someCategory);

    String getName();

    /**
     * @associates <{org.rr0.im.service.function.classification.Category}>
     * @supplierCardinality 1..*
     * @link aggregation
     */
    Vector getCategories();

    /**
         * Returns the Category of a Classifiable object.
         *
         * @param classifiable A Classifiable object
         * @return The object Category in this Classification
         */
    Category getCategory(Object classifiable);

    /** @link dependency */
    /*# Classifiable lnkClassifiable; */
}
