package org.rr0.im.service.function;

import org.rr0.im.business.actor.Actor;
import org.rr0.im.business.actor.Being;
import org.rr0.im.business.actor.Occupation;
import org.rr0.im.business.event.*;
import org.rr0.im.business.event.circumstance.Moment;
import org.rr0.im.business.event.circumstance.PreciseMomentImpl;
import org.rr0.im.business.report.Account;
import org.rr0.im.business.report.Case;
import org.rr0.im.business.report.Source;
import org.rr0.im.integration.CategoryDAO;
import org.rr0.im.integration.DAOFactory;
import org.rr0.im.service.function.classification.Category;
import org.rr0.im.service.function.classification.Classification;
import org.rr0.is.integration.DAOHelper;

import java.util.Enumeration;
import java.util.Vector;

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
 * @author J�r�me Beau for implementation.
 * @version 15 juin 2003 17:42:37
 */
public class CaseReliabilityImpl implements CaseReliability {
    /**
     * Factor depending on the number of witnesses (a sighting is more believable if it has more witnesses).
     * Note that MUFON requires this to be the number of witnesses interviewed or having signed report forms.
     * A witness that is interviewed and says that others were present remains a single witness
     * unless those others are somehow contacted and confirmed.
     *
     * @param someCase
     * @return A value between 0 and 1.
     */
    public double witnessCountFactor(Case someCase) {
        double witnessCountFactor = 0;
        Vector witnesses = someCase.getWitnesses();
        int witnessCount = witnesses.size();
        if (witnessCount > 10) {
            witnessCountFactor = 1.0;
        } else if (witnessCount >= 6) {
            witnessCountFactor = 0.9;
        } else if (witnessCount >= 3) {
            witnessCountFactor = 0.7;
        } else if (witnessCountFactor == 2) {
            witnessCountFactor = 0.5;
        } else if (witnessCount == 1) {
            witnessCountFactor = 0.3;
        }
        return witnessCountFactor;
    }

    /**
     * <p>Factor depending on the profession or occupation of the witnesses
     * (indicates their level of job responsibility, from which can be inferred a measure of their dependability or social status).
     * </p><p>
     * Note that "retired" is not a profession.
     * Investigators should ask and record what the witness' career was before they retired,
     * as well as military service, and anything else that would help to assess that person's reliability
     * as an observer and reporter of phenomenal events. MUFON report forms provide extensive space
     * for "additional comments;" in too many cases unused).
     * </p>
     *
     * @param witness
     * @return A value between 0 and 1.
     */
    public double getOccupationFactor(Being witness) {
        double occupationFactor = 0;
        TimeLine witnessHistory = witness.getHistory();
        Moment today = new PreciseMomentImpl(System.currentTimeMillis());
        Vector lastEmployements = new Vector();
        Enumeration eventIterator = witnessHistory.iterator();
        while (eventIterator.hasMoreElements()) {
            Event event = (Event) eventIterator.nextElement();
            if (event instanceof Employment && (event.getEnd() == null || event.getEnd().isAfter(today))) {    // Last employment ?
                lastEmployements.addElement(event);
            }
        }
        DAOFactory daoFactory = DAOHelper.getDAOFactory();
        CategoryDAO categoryDAO = daoFactory.getCategoryDAO();
        Classification occupationClassification = categoryDAO.findClassification("OccupationClassification");
        Enumeration lastEmployementIterator = lastEmployements.elements();
        int lastEmploymentCount;
        for (lastEmploymentCount = 0; lastEmployementIterator.hasMoreElements(); lastEmploymentCount++) {
            Employment employment = (Employment) lastEmployementIterator.nextElement();
            Occupation occupation = employment.getOccupation();
            final Category category = occupationClassification.getCategory(occupation);
            if (category.getName().equals("Students")) {
                occupationFactor += 0.3;
            } else if (category.getName().equals("Laborer")) {
                occupationFactor += 0.5;
            } else if (category.getName().equals("UniversityStudent")) {
                occupationFactor += 0.6;
            } else if (category.getName().equals("Business")) {
                occupationFactor += 0.7;
            } else if (category.getName().equals("Technician")) {
                occupationFactor += 0.9;
            } else if (category.getName().equals("Graduate")) {
                occupationFactor += 1.0;
            }
        }
        occupationFactor = occupationFactor / lastEmploymentCount;
        return occupationFactor;
    }

    /**
     * Factor depending on relationship between witnesses
     * (provides indication of the theoretical tendency to generate a hoax together,
     * based on the different types of ties between them).
     *
     * @return A value between 0 (poor reliability) and 1 (best reliability) :
     *         <ul>
     *         <li>0 if unknown</li>
     *         <li>0.3 if friends</li>
     *         <li>0.6 if family or single witness</li>
     *         <li>0.8 if professional/co-workers</li>
     *         <li>1 if no relationship</li>
     *         </ul>
     */
    public double getWitnessesRelationshipFactor(Case someCase) {
        double witnessesRelationshipFactor;
        Vector witnesses = someCase.getWitnesses();
        if (witnesses.size() == 0) {
            witnessesRelationshipFactor = 0.6;
        } else {
            witnessesRelationshipFactor = 0;
            Enumeration witnessIterator = witnesses.elements();
            while (witnessIterator.hasMoreElements()) {
                Being being = (Being) witnessIterator.nextElement();
                TimeLine history = being.getHistory();
                Enumeration eventsIterator = history.iterator();
                while (eventsIterator.hasMoreElements()) {
                    Event event = (Event) eventsIterator.nextElement();
                    if (event instanceof Relationship) {
                        Relationship relationship = ((Relationship) event);
                        Actor object = relationship.getObject();
                        if (witnesses.contains(object)) {
                            if (relationship instanceof LiveWithRelationship) {
                                witnessesRelationshipFactor += 0.6;
                            } else if (relationship instanceof WorkWithRelationship) {
                                witnessesRelationshipFactor += 0.8;
                            } else if (relationship instanceof FriendshipRelationship) {
                                witnessesRelationshipFactor += 0.3;
                            }
                        }
                    }
                }
            }
        }
        return witnessesRelationshipFactor;
    }

    /**
     * Factor depending on relationship between witnesses
     * (provides indication of the theoretical tendency to generate a hoax together,
     * based on the different types of ties between them).
     *
     * @return A value between 0 and 1.
     */
    public double getWitnessesAgeFactor(Account someAccount) {
        //        Moment accountMoment = someAccount.getHistory().getBegining();
        double witnessesRelationshipFactor = 0;
        Source accounts = someAccount.getSource();
        //        Iterator witnessesIterator = witnesses.iterator ();
        //        while (witnessesIterator.hasNext ()) {
        //            Object o = (Object) witnessesIterator.next ();
        //
        //        }
        //        Iterator witnessIterator = witnesses.iterator ();
        //        while (witnessIterator.hasNext ()) {
        //            Being being = (Being) witnessIterator.next ();
        //            if (being.getAge(sightingMoment).isLongerThan ();
        //        }
        return witnessesRelationshipFactor;
    }

    public String getName() {
        return "CaseReliability";
    }
}
