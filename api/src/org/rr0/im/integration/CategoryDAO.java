package org.rr0.im.integration;

import org.rr0.im.service.function.classification.Classifiable;
import org.rr0.im.service.function.classification.Classification;
import org.rr0.im.service.function.classification.Category;
import org.rr0.im.business.event.circumstance.Wind;

/**
 * An access object for accessing classifications and categories.
 *
 * @author Jérôme Beau
 * @version 31 mai 2003 14:31:37
 */
public interface CategoryDAO
{
    /**
     * Check if some object matches a Category's categoryFilter
     * @param someClassifiable
     * @param categoryFilter
     * @return
     */
    boolean matches (Classifiable someClassifiable, String categoryFilter);

    /**
     * Find a given Classification's Category.
     * @param id The Category unique id ("CloseEncounter1", "CloseEncounter2", "ViolentWind", "HotTemperature", etc.)
     * @return The found Category.
     */
    Category findCategory (String id);

    /**
     * Find a given Classification function.
     * @param id The Classification system unique id ("ValleClassification", "MyCloudsClassfication", etc.)
     * @return The found Classification.
     */
    Classification findClassification (String id);
}
