package org.rr0.im.business.event;

import org.rr0.im.business.actor.Being;
import org.rr0.im.business.event.circumstance.*;
import org.rr0.im.business.report.AccountImpl;
import org.rr0.im.business.report.Source;
import org.rr0.im.service.function.classification.Category;
import org.rr0.im.service.function.classification.Classification;

import java.util.Vector;


/**
 * Sighting Reference Implementation.
 *
 * @author Jérôme Beau
 * @version 21 avr. 2003 16:08:50
 */
public class SightingImpl extends AccountImpl implements Sighting {
    private Place location;
    private boolean anomalousAppearance;
    private boolean anomalousMouvements;
    private boolean physicalOrSpatialIncongruities;
    private boolean technologyDetected;
    private boolean closeEncounter;
    private boolean tracesOrEffectsProducted;
    private WeatherCondition weatherConditions;
    private Being witness;
    private Vector ufos;
    private Vector beings = new Vector();

    public SightingImpl(String someShortDescription, Moment someMoment, Place someLocation, Being witness, Source source) {
        super(someShortDescription, source, someMoment);
        location = someLocation;
    }

    public Being getWitness() {
        return witness;
    }

    public boolean isAppearanceAnomalous() {
        return anomalousAppearance;
    }

    public boolean isThereAnomalousMouvements() {
        return anomalousMouvements;
    }

    public boolean isTherePhysicalSpatialIncongruities() {
        return physicalOrSpatialIncongruities;
    }

    public boolean isTechnologyDetected() {
        return technologyDetected;
    }

    public boolean isCloseEncounter() {
        return closeEncounter;
    }

    /**
         * Beings associated to UFO
         *
         * @return A collection of Beings
         */
    public Vector sightedBeings() {
        return beings;
    }

    public boolean isThereTracesOrEffectsProduced() {
        return tracesOrEffectsProducted;
    }

    /**
     * @associates <{org.rr0.im.business.event.circumstance.WeatherCondition}>
     */
    public WeatherCondition getWeatherConditions() {
        return weatherConditions;
    }

    /**
     * @associates <{org.rr0.im.business.event.circumstance.Location}>
     */
    public Location getLocation() {
        return null;
    }

    public Vector getUFOs() {
        return ufos;
    }

    public Category getForcedCategory(Classification classification) {
        return null;  // No forced category by default
    }

/*
    public void accept(MetaObjectVisitor visitor) throws MetaException {
        visitor.visit(this);
    }
*/

    public void setTitle(String someTitle) {
        super.setTitle(someTitle);
    }
}
