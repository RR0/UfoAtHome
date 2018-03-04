package org.rr0.im.service.function;

/**
 * A filter in which data can fall.
 *
 * @author Jérôme Beau
 * @version 18 mai 2003 20:25:40
 */
public interface Filter extends Function {
    /**
     * Check if an object is acepted by this filter.
     *
     * @param filterable The object to classify
     * @return If the classifiable belongs to this category.
     */
    boolean accept(Object filterable);
}
