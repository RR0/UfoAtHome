package org.rr0.im.service.function;

import org.rr0.im.business.report.Account;
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
 * @author Jérôme Beau
 * @version 15 juin 2003 23:46:50
 */
public interface SightingStrangeness extends Function
{
    /**
     * Return the quality index of a given Account
     * @param someSighting The report to check quality for.
     * @return A value between zero and one (percentage).
     */
    double getValue(Sighting someSighting);
}
