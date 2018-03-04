package org.rr0.is.meta;

import org.rr0.archipelago.model.MetaObject;
import org.rr0.archipelago.model.MetaDataSource;
import org.rr0.archipelago.model.MetaObjectImpl;

import java.util.Map;
import java.util.Iterator;

/**
 * Meta Object Merger implementation.
 *
 * @author Jerome Beau
 * @version $revision$
 */
public class MergerImpl implements Merger {

    public static final MetaDataSource ALL_SOURCES = new MetaDataSource() {
        public String getName() {
            return "<All sources>";
        }
    };

    /**
     * Merge two Meta Objects.
     *
     * @param firstObject The first object to merge.
     * @param secondObject The second object to merge.
     * @return The resulting merged object.
     */
    public MetaObject merge(MetaObject firstObject, MetaObject secondObject) {
        MetaObject mergedObject = new MetaObjectImpl(firstObject.getType());
        Map firstValues = firstObject.getValues();
        Iterator iterator = firstValues.entrySet().iterator();
        while (iterator.hasNext()) {
            Map.Entry entry = (Map.Entry) iterator.next();
            String fieldName = (String) entry.getKey();
            Object firstValue = entry.getValue();
            Object secondValue = secondObject.get(fieldName);
            if (firstValue == null) {
                if (secondValue == null) {
                    mergedObject.set(fieldName, null, ALL_SOURCES);
                } else {
                    mergedObject.set(fieldName, secondValue, secondObject.getSource(fieldName));
                }
            } else if (secondValue == null) {
                mergedObject.set(fieldName, firstValue, firstObject.getSource(fieldName));
            } else if (equals (firstValue, secondValue)) {
                mergedObject.set(fieldName, firstValue, ALL_SOURCES);
            } else {
                mergedObject.set(fieldName + "_1", firstValue, firstObject.getSource(fieldName));
                mergedObject.set(fieldName + "_2", secondValue, secondObject.getSource(fieldName));
            }
        }
        return mergedObject;
    }

    private boolean equals(Object firstValue, Object secondValue) {
        return firstValue.equals(secondValue);
    }
}
