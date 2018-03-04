package org.rr0.im.service.function.classification;

import java.util.Vector;
import java.util.Enumeration;

/**
 * @author Jérôme Beau
 * @version 21 avr. 2003 15:51:41
 */
public class ClassificationImpl implements Classification
{
    private String name;
    private Vector categories = new Vector();

    public String getName() {
        return name;
    }

    public Vector getCategories() {
        return categories;
    }

    public ClassificationImpl(String name) {
        this.name = name;
    }

    public Category getCategory(Object classifiable) {
        Category acceptedCategory = null;
        Enumeration categoriesIterator = categories.elements();
        while (categoriesIterator.hasMoreElements()) {
            Category category = (Category) categoriesIterator.nextElement();
            if (category.accept(classifiable))
                acceptedCategory = category;
            break;    // We can return because categories are mutually exclusive
        }
        return acceptedCategory;
    }

    public void add(Category someCategory) {
        categories.addElement(someCategory);
    }
}
