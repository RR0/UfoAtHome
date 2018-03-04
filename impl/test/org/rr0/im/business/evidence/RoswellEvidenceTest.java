package org.rr0.im.business.evidence;

import junit.framework.TestCase;
import org.rr0.im.business.actor.Identity;
import org.rr0.im.business.actor.IdentityImpl;
import org.rr0.im.business.actor.Organization;
import org.rr0.im.business.actor.OrganizationImpl;
import org.rr0.im.business.event.EventImpl;
import org.rr0.im.business.event.TimeLine;
import org.rr0.im.business.event.circumstance.PreciseMomentImpl;

import java.util.GregorianCalendar;
import java.util.Locale;

/**
 * A test for describing Roswell case-related documents.
 *
 * @author Jérôme Beau
 * @version 21 avr. 2003 16:18:28
 */
public class RoswellEvidenceTest extends TestCase {
    private ArticleImpl firstRoswellIncidentArticle;

    public RoswellEvidenceTest(String someTestName) {
        super(someTestName);
    }

    protected void setUp() throws InstantiationException, IllegalAccessException, ClassNotFoundException {
        // The Roswell Daily Record newspaper
        Identity rdrIdentity = new IdentityImpl("Roswell Daily Record");
        Organization roswellDailyRecord = new OrganizationImpl(rdrIdentity);
        TimeLine roswellDailyRecordHistory = roswellDailyRecord.getHistory();
        final EventImpl firstEdition = new EventImpl("First edition", new PreciseMomentImpl(1896, GregorianCalendar.MARCH, 6));
        roswellDailyRecordHistory.add(firstEdition);

        // The first article of the RDR about the Roswell incident
        final PreciseMomentImpl date = new PreciseMomentImpl(1947, GregorianCalendar.JULY, 8);
        final String title = "RAAF Captures Flying Saucer On Ranch in Roswell Region";
        firstRoswellIncidentArticle = new ArticleImpl(title, roswellDailyRecord, date);
        String articleText =
                "No Details of Flying Disk Are Revealed\n"
                + "Roswell Hardware Man and Wife Report Disk Seen\n"
                + "The intelligence office of the 509th Bombardment group at Roswell Army Air Field announced at noon today, that the field has come into possession of a flying saucer.\n"
                + "According to information released by the department, over authority of Maj. J. A. Marcel, intelligence officer, the disk was recovered on a ranch in the Roswell vicinity, after an unidentified rancher had notified Sheriff Geo. Wilcox, here, that he had found the instrument on his premises.\n"
                + "Major Marcel and a detail from his department went to the ranch and recovered the disk, it was stated.\n"
                + "After the intelligence officer here had inspected the instrument it was flown to higher headquarters.\n"
                + "The intelligence office stated that no details of the saucer's construction or its appearance had been revealed.\n"
                + "Mr. and Mrs. Dan Wilmot apparently were the only persons in Roswell who saw what they thought was a flying disk.\n"
                + "They were sitting on their porch at 105 South Penn. last Wednesday night at about ten o'clock when a large glowing object zoomed out of the sky from the southeast, going in a northwesterly direction at a high rate of speed.\n"
                + "Wilmot called Mrs. Wilmot's attention to it and both ran down into the yard to watch. It was in sight less then a minute, perhaps 40 or 50 seconds, Wilmot estimated.\n"
                + "Wilmot said that it appeared to him to be about 1,500 feet high and going fast. He estimated between 400 and 500 miles per hour.\n"
                + "In appearance it looked oval in shape like two inverted saucers, faced mouth to mouth, or like two old type washbowls placed, together in the same fashion. The entire body glowed as though light were showing through from inside, though not like it would inside, though not like it would be if a light were merely underneath.\n"
                + "From where he stood Wilmot said that the object looked to be about 5 feet in size, and making allowance for the distance it was from town he figured that it must have been 15 to 20 feet in diameter, though this was just a guess.\n"
                + "Wilmot said that he heard no sound but that Mrs. Wilmot said she heard a swishing sound for a very short time.\n"
                + "The object came into view from the southeast and disappeared over the treetops in the general vicinity of six mile hill.\n"
                + "Wilmot, who is one of the most respected and reliable citizens in town, kept the story to himself hoping that someone else would come out and tell about having seen one, but finally today decided that he would go ahead and tell about it. The announcement that the RAAF was in possession of one came only a few minutes after he decided to release the details of what he had seen."
                ;
        firstRoswellIncidentArticle.setText(articleText, Locale.US);
    }

    public void testWordCount() {
        int wordsCount = firstRoswellIncidentArticle.getWordCount(Locale.US);
        assertTrue("Words count = " + wordsCount, wordsCount == 477);
    }

    protected void tearDown() {
        // Nettoyage fin de test
    }
}
