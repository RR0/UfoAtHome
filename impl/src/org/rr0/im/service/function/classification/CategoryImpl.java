package org.rr0.im.service.function.classification;

import org.rr0.im.service.function.Filter;

/**
 * A set of criteria that a Classifiable element may match or not.
 *
 * @see org.rr0.im.service.function.classification.Classification
 */
public class CategoryImpl implements Category {
    /**
     * The name of the category
     */
    private String name;

    /**
     * The set of criteria a Classifiable must match to belong to this category,
     * expressed in JDO QL format.
     */
    private Filter filter;

    /**
     * The Classification system this category belongs to.
     */
    private Classification classification;

    public String getName() {
        return name;
    }

    public CategoryImpl(Classification someClassification, String someName, Filter someFilter) {
        classification = someClassification;
        name = someName;
        filter = someFilter;
        classification.add(this);
    }

    /**
         * Check if an object is classified in this Category.
         * This is done by running the category's criteria againts the classifiable
         * or checking if the Classifiable has been manually forced to classify into this category
         * (even if it doesn't match the criteria).
         *
         * @param someClassifiable A Classifiable object.
         * @return If the classifiable belongs to this category.
         * @see org.rr0.im.service.function.classification.Classifiable#getForcedCategory
         */
    public boolean accept(Object someClassifiable) {
        boolean accepted;
        boolean elementForcedInThisCategory = false;
        if (someClassifiable instanceof Classifiable) {
            elementForcedInThisCategory = ((Classifiable) someClassifiable).getForcedCategory(classification) == this;
        }
        if (!elementForcedInThisCategory) {
            accepted = filter.accept(someClassifiable);
        } else {
            accepted = elementForcedInThisCategory;
        }
        return accepted;
    }

    /**
         * Category equality is exclusively based on filter expression
         * to prevent adding two identical categories to the same function.
         *
         * @param o
         * @return
         */
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof CategoryImpl)) return false;

        final CategoryImpl category = (CategoryImpl) o;

        if (!filter.equals(category.filter)) return false;

        return true;
    }

    public int hashCode() {
        return filter.hashCode();
    }
}
