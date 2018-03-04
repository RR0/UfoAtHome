package org.rr0.im.service.function;

import org.rr0.im.business.actor.Being;
import org.rr0.im.business.report.Account;
import org.rr0.im.business.report.Case;

/**
 * Reliability Index, symbolized as Pi.
 * It will be a decimal value between zero and one, indicating the witness "credibility".
 * There are six categories within this parameter and each is assigned a "weight factor".
 * From the information recorded, in the report, one selects the appropriate number from each category,
 * multiplies it by its "weight factor," and ultimately adds the six results together to produce the index.
 * Obviously, if little or nothing is recorded about the witnesses and their activity at the time of the sighting,
 * they will receive a very low , so it is incumbent on the Field Investigator to take as much care
 * in reporting this information as that which just describes the anomaly.
 *
 * @author Ballester-Guasp (MUFON Spain) for specification. Thanks to Terry Groff for publishing it.
 * @author Jerome Beau for implementation.
 * @version $Revision: 1.2 $
 */
public interface CaseReliability extends Function
{
    /**
         * Factor depending on the number of witnesses (a sighting is more believable if it has more witnesses).
         * Note that MUFON requires this to be the number of witnesses interviewed or having signed report forms.
         * A witness that is interviewed and says that others were present remains a single witness
         * unless those others are somehow contacted and confirmed.
         *
         * @param someCase
         * @return A value between 0 and 1.
         */
    double witnessCountFactor(Case someCase);

    /**
         * Factor depending on the profession or occupation of the witnesses
         * (indicates their level of job responsibility, from which can be inferred a measure of their dependability or social status).
         * <p/>
         * Note that "retired" is not a profession.
         * Investigators should ask and record what the witness' career was before they retired,
         * as well as military service, and anything else that would help to assess that person's reliability
         * as an observer and reporter of phenomenal events. MUFON report forms provide extensive space
         * for "additional comments;" in too many cases unused).
         *
         * @param witness
         * @return A value between 0 and 1.
         */
    double getOccupationFactor(Being witness);

    /**
     * Factor depending on relationship between witnesses
     * (provides indication of the theoretical tendency to generate a hoax together,
     * based on the different types of ties between them).
     *
     * @return A value between 0 and 1.
     */
    double getWitnessesRelationshipFactor(Case someCase);

    /**
     * Factor depending on relationship between witnesses
     * (provides indication of the theoretical tendency to generate a hoax together,
     * based on the different types of ties between them).
     *
     * @return A value between 0 and 1.
     */
    double getWitnessesAgeFactor(Account someAccount);
}
