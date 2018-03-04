package org.rr0.im.service.function;

import org.rr0.im.business.event.Sighting;

/**
 * Symbolized as sigma.
 * It is a value between zero and one that indicates the "abnormality" level
 * of a report compared to normal processes, familiar phenomena
 * and known manufactured objects.
 * Seven factors commonly found in sighting reports have been carefully defined,
 * and one simply counts up the number of these factors recognized in reading
 * the report and divides by seven to record.
 * The seven factors (quoting verbatim from Ballester and Guasp) are:
 * <ul>
 * <li>Anomalous appearance</li>
 * <li>Existence of anomalous movements</li>
 * <li>Apparition of physical-spatial incongruities</li>
 * <li>Technological detection</li>
 * <li>Close encounter</li>
 * <li>Presence of beings associated with the UFO</li>
 * <li>Finding of traces or production of effects</li>
 * </ul>
 *
 * @author <a href="mailto:rr0@rr0.org">Jerome Beau</a>
 * @version $revision$
 */
public class SightingStrangenessImpl implements SightingStrangeness {
    public double getValue(Sighting sighting) {
        double strangenessIndex = 0;
        int factorCount = 0;

        if (sighting.isAppearanceAnomalous()) {
            strangenessIndex += 1.0;
            factorCount++;
        }
        if (sighting.isThereAnomalousMouvements()) {
            strangenessIndex += 1.0;
            factorCount++;
        }
        if (sighting.isTherePhysicalSpatialIncongruities()) {
            strangenessIndex += 1.0;
            factorCount++;
        }
        if (sighting.isTechnologyDetected()) {
            strangenessIndex += 1.0;
            factorCount++;
        }
        if (sighting.isCloseEncounter()) {
            strangenessIndex += 1.0;
            factorCount++;
        }
        if (sighting.sightedBeings().size() > 0) {
            strangenessIndex += 1.0;
            factorCount++;
        }
        if (sighting.isThereTracesOrEffectsProduced()) {
            strangenessIndex += 1.0;
            factorCount++;
        }

        strangenessIndex = strangenessIndex / factorCount;
        return strangenessIndex;
    }

    public String getName() {
        return "SightingStrangeness";
    }
}
