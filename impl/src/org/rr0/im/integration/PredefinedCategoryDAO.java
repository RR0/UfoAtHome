package org.rr0.im.integration;

import org.rr0.im.integration.jdo.CategoryDAOImpl;
import org.rr0.im.service.function.classification.Category;
import org.rr0.im.service.function.classification.Classifiable;
import org.rr0.im.service.function.classification.Classification;
import org.rr0.im.service.function.classification.ClassificationImpl;

import javax.jdo.PersistenceManager;
import java.util.Hashtable;

/**
 * A Data Access Object that contains a set of predefined data.
 * Intended for tests and for initial repository population.
 *
 * @author Jérôme Beau
 * @version 18 mai 2003 20:09:11
 */
public class PredefinedCategoryDAO extends CategoryDAOImpl implements CategoryDAO
{
    private Hashtable CLASSIFICATIONS;
    private Hashtable CATEGORIES;

    public PredefinedCategoryDAO() {
        PersistenceManager pm = getPersistenceManager();
        if (pm == null) {
            CLASSIFICATIONS = new Hashtable();
            CATEGORIES = new Hashtable();
        }
        populate(pm);
    }

    private void populate(PersistenceManager pm) {
        initClouds(pm);
        initTemperature(pm);
        initWind(pm);
        initPrecipitations(pm);
        initOccupations(pm);
    }

    private void initClouds(PersistenceManager pm) {
        if (CLASSIFICATIONS == null) {
            Classification cloudsClassification = createClassification("CloudsClassification", pm);
            createCategory(cloudsClassification, "ClearSky", "someClassifiable.number < 1", pm);
            createCategory(cloudsClassification, "AFewClouds", "someClassifiable.number >= 1 && someClassifiable.number < 5", pm);
            createCategory(cloudsClassification, "VeryCloudy", "someClassifiable.number >= 5 && someClassifiable.number < 30", pm);
            createCategory(cloudsClassification, "Overcast", "someClassifiable.number >= 30", pm);
        }
    }

    private void initTemperature(PersistenceManager pm) {
        if (CLASSIFICATIONS == null) {
            Classification temperatureClassification = createClassification("TemperatureClassification", pm);
            createCategory(temperatureClassification, "Freeze", "someClassifiable.celcius < 0", pm);
            createCategory(temperatureClassification, "Cold", "someClassifiable.celcius >= 0 && someClassifiable.celcius < 15", pm);
            createCategory(temperatureClassification, "Warm", "someClassifiable.celcius >= 15 && someClassifiable.celcius < 30", pm);
            createCategory(temperatureClassification, "Hot", "someClassifiable.celcius > 30", pm);
        }
    }

    private void initWind(PersistenceManager pm) {
        if (CLASSIFICATIONS == null) {
            Classification windClassification = createClassification("WindClassification", pm);
            createCategory(windClassification, "NoWind", "someClassifiable.speed < 1", pm);
            createCategory(windClassification, "LowWind", "someClassifiable.speed >= 1 && someClassifiable.speed < 20", pm);
            createCategory(windClassification, "ModerateWind", "someClassifiable.speed >= 20 && someClassifiable.speed <= 80", pm);
            createCategory(windClassification, "ViolentWind", "someClassifiable.speed > 80", pm);
        }
    }

    private void initPrecipitations(PersistenceManager pm) {
        if (CLASSIFICATIONS == null) {
            Classification precipitationsClassification = createClassification("PrecipitationsClassification", pm);
            createCategory(precipitationsClassification, "Dry", "someClassifiable.millimeters < 1", pm);
            createCategory(precipitationsClassification, "Fog", "someClassifiable.millimeters >= 1", pm);
            createCategory(precipitationsClassification, "Rain", "someClassifiable.millimeters >= 20", pm);
            createCategory(precipitationsClassification, "Snow", "someClassifiable.millimeters >= 20 && someClassifiable.celcius <= 0", pm);
        }
    }

    private void initOccupations(PersistenceManager pm) {
        if (CLASSIFICATIONS == null) {
            Classification occupationClassification = createClassification("OccupationClassification", pm);
            createCategory(occupationClassification, "NotSpecified", "", pm);
            createCategory(occupationClassification, "Student", "someClassifiable.educationLevel < college", pm);
            createCategory(occupationClassification, "Laborer", "someClassifiable.occupation == \"laborer\" || someClassifiable.occupation == \"farmer\" || someClassifiable.occupation == \"housewife\"", pm);
            createCategory(occupationClassification, "UniversityStudent", "someClassifiable.educationLevel >= university", pm);
            createCategory(occupationClassification, "Business", "someClassifiable.occupation == \"trader\" || someClassifiable.occupation == \"businessMen\" || someClassifiable.occupation == \"employee\" || someClassifiable.occupation == \"artist\"", pm);
            createCategory(occupationClassification, "Technician", "someClassifiable.occupation == \"technician\" || someClassifiable.occupation == \"policemen\" || someClassifiable.occupation == \"pilot\"", pm);
            createCategory(occupationClassification, "Graduate", "someClassifiable.occupation == \"universityGraduate\" || someClassifiable.occupation == \"military\"", pm);
        }
    }

    private Category createCategory(Classification windClassification, String someName, String someFilter, PersistenceManager pm) {
        // TODO(JBE):
        //        Category category = new CategoryImpl (windClassification, someName, someFilter);
        //        if (pm != null) {
        //            pm.makePersistent (category);
        //        }
        //        else {
        //            CATEGORIES.put (someName, category);
        //        }
        //        return category;
        throw new RuntimeException("Not implemented");
    }

    private Classification createClassification(String name, PersistenceManager pm) {
        Classification classification = new ClassificationImpl(name);
        if (pm != null) {
            pm.makePersistent(classification);
        } else {
            CLASSIFICATIONS.put(name, classification);
        }
        return classification;
    }

    public boolean matches(Classifiable someClassifiable, String filter) {
        return false;
    }

    public Category findCategory(String id) {
        return (Category) CATEGORIES.get(id);
    }

    public Classification findClassification(String id) {
        return (Classification) CLASSIFICATIONS.get(id);
    }
}
