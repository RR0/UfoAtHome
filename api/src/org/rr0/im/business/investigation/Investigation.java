package org.rr0.im.business.investigation;

import org.rr0.im.business.event.Endable;
import org.rr0.im.business.report.Source;
import org.rr0.im.business.report.Case;

import java.util.Vector;
import java.util.List;

/**
 * An investigation on a Case.
 *
 * @author Jérôme Beau
 * @version 15 juin 2003 17:49:47
 */
public interface Investigation extends Source, Endable
{
    /**
     * Returns the investigation's acts.
     *
     * @associates <{org.rr0.im.business.investigation.InvestigationAct}>
     * @supplierCardinality 0..*
     * @supplierRole acts
     * @return A collection of InvestigationAct
     * @link aggregationByValue
     */
    List<InvestigationAct> getActs ();

    /**
     * Returns the investigated case.
     *
     * @return A Case
     * @associates <{org.rr0.im.business.report.Case}>
     * @supplierRole investigated case
     */
    Case getCase();
}
