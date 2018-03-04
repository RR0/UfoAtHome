package org.rr0.im.service.function;

/**
 * Certainty Index, symbolized as Delta.
 * Derived by multiplying the three others togetherformula.gif (1127 bytes),
 * to provide a measure of the overall degree of "certainty" of an anomalous event behind the report.
 * Delta is often expressed as a percentage of unity by moving the decimal two places to the right and appending "%,"
 * example Delta = 0.125 indicates a "certainty" of 12.5%, a respectable percentage as these things go.
 * The Certainty Index might be used as a quick way to order the reports in a catalog from "least promising" to "most promising,"
 * while the other three parameters will indicate, why each report received the delta_md.gif (978 bytes) value that it has.
 *
 * @author Ballester-Guasp (MUFON Spain) for specification. Thanks to Terry Groff for publishing it.
 * @author Jerome Beau for implementation.
 * @version $Revision: 1.1 $
 */
public interface CaseCertainty extends Function
{
    double getValue(AccountQuality q, SightingStrangeness sigma, CaseReliability pi);
}
