package org.rr0.archipelago.model;

import java.util.Set;
import java.util.Collections;

/**
 * @author <a href="mailto:rr0@rr0.org">Jerome Beau</a>
 * @version $revision$
 */
public interface MetaType {
    MetaType TEXT = new MetaType() {
        public String getName() {
            return "Text";
        }

        public void add(MetaField field) {

        }

        public Set<MetaField> getFields() {
            return Collections.EMPTY_SET;
        }

        public void setName(String name) {

        }

        public void addField(MetaField metaField) {

        }

        public MetaField createField() {
            return null;
        }


        public String toString() {
            return getName();
        }
    };
    MetaType NUMBER = new MetaType() {
        public String getName() {
            return "Number";
        }

        public void add(MetaField field) {

        }

        public Set<MetaField> getFields() {
            return Collections.EMPTY_SET;
        }

        public void setName(String name) {

        }

        public void addField(MetaField metaField) {

        }

        public MetaField createField() {
            return null;
        }

        public String toString() {
            return getName();
        }

    };
    MetaType IMAGE = new MetaType() {
        public String getName() {
            return "Image";
        }

        public void add(MetaField field) {

        }

        public Set<MetaField> getFields() {
            return Collections.EMPTY_SET;
        }

        public void setName(String name) {

        }

        public void addField(MetaField metaField) {

        }

        public MetaField createField() {
            return null;
        }

        public String toString() {
            return getName();
        }
    };

    void add(MetaField field);

    Set<MetaField> getFields();

    String getName();

    void setName(String name);

    /**
     * Add a field to this type.
     *
     * @param metaField The field to add
     */
    void addField(MetaField metaField);

    MetaField createField();
}
