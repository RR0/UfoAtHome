package org.rr0.im.business;

import junit.framework.TestCase;
import org.apache.commons.validator.Validator;
import org.apache.commons.validator.ValidatorResources;
import org.rr0.archipelago.model.meta.*;
import org.rr0.archipelago.model.*;
import org.rr0.im.business.actor.Identity;
import org.rr0.im.business.actor.IdentityImpl;
import org.rr0.is.meta.MergerImpl;
import org.rr0.is.meta.Merger;
import org.rr0.is.business.UserImpl;
import org.xml.sax.SAXException;

import java.io.IOException;
import java.io.InputStream;
import java.util.*;

/**
 * A test for describing the Roswell case using the RR0 Information Model.
 *
 * @author Jérôme Beau
 * @version 21 avr. 2003 16:18:28
 */
public class MetaObjectTest extends TestCase {
    private DatabaseAdapter rr0Adapter;
    private DatabaseAdapter ovniFranceAdapter;
    private MetaType sightingMetaType;
    private static final String SIGHTING_CONTENT_1 = "Un t�moin, scientifique a observ� pendant une � 19 minutes un objet de forme ronde. Son diam�tre apparant a �t� estim� � 15 minute d'arc sa couleur etait orang�, �mettant une lumi�re plut�t fluorescente. L'objet �tait anim� d'un mouvement de rotation. Il a parcouru sa trajectoire au z�nit � une vitesse estim�e de 1000 � 1500 km/h, pour une distance au t�moin de 1 � 3 km. Il faisait des virages brusques.";
    private static final String SIGHTING_CONTENT_2 = "Un scientifique observe pendant 19 mn un objet rond, de diam�tre apparent estim� � 15 mn d'arc, de couleur orang�e, �mettant une lumi�re plut�t fluorescente. L'objet �tait anim� d'un mouvement de rotation. Il a parcouru sa trajectoire au z�nith � une vitesse estim�e de 1000 � 1500 km/h, pour une distance au t�moin de 1 � 3 km. Il faisait des virages brusques";
    private Database ovniFranceDatabase;
    private Database rr0Database;
    private MetaDataSource dummyUser;

    public MetaObjectTest(final String someTestName) {
        super(someTestName);
    }

    protected void setUp() throws IOException, SAXException, MetaException {
        Properties ovniFranceProperties = new Properties();
        ovniFranceProperties.setProperty("archipelago:ovnifrance:url", "http://baseovnifrance.free.fr");
        ovniFranceAdapter = new OVNIFranceDatabaseAdapter();
        ovniFranceAdapter.setProperties(ovniFranceProperties);

        Properties rr0Properties = new Properties();
        rr0Properties.setProperty("archipelago:rr0:url", "http://rr0.org");
        rr0Adapter = new RR0DatabaseAdapter();
        rr0Adapter.setProperties(rr0Properties);

        Identity userIdentity = new IdentityImpl("Dummy User");
        dummyUser = new UserImpl(Locale.getDefault(), "dummyUser", "dummyPassword", userIdentity);

        InputStream validatorsDefinitions = getClass().getResource("validator-rules.xml").openStream();
        InputStream validationRules = getClass().getResource("validation.xml").openStream();
        InputStream[] validatorStreams = { validatorsDefinitions, validationRules };
        ValidatorResources validatorResources = new ValidatorResources(validatorStreams);
        Validator yearValidator = new Validator(validatorResources);

        MetaType momentMetaType = new MetaTypeImpl("PreciseMoment");
        MetaTypeImpl integerType = new MetaTypeImpl("Integer");
        momentMetaType.add(new MetaFieldImpl("year", integerType));
        momentMetaType.add(new MetaFieldImpl("month", integerType));
        momentMetaType.add(new MetaFieldImpl("dayOfMonth", integerType));
        sightingMetaType = new MetaTypeImpl("Sighting");
    }

    public void testMerge() throws MetaException {

        Calendar moment = GregorianCalendar.getInstance();
        moment.set(GregorianCalendar.YEAR, 1951);
        moment.set(GregorianCalendar.MONTH, GregorianCalendar.JULY);
        moment.set(GregorianCalendar.DAY_OF_MONTH, 14);

        MetaObject object1 = new MetaObjectImpl(sightingMetaType);
        object1.set("moment", moment.getTime(), rr0Database);
        String content1 = SIGHTING_CONTENT_1;
        object1.set("content", content1, rr0Database);
        System.out.println("object1 = " + object1);

        MetaObject object2 = new MetaObjectImpl(sightingMetaType);
        object1.set("moment", moment.getTime(), ovniFranceDatabase);    // Same date
        String content2 = SIGHTING_CONTENT_2;
        object2.set("content", content2, ovniFranceDatabase);
        System.out.println("object2 = " + object2);

        Merger merger = new MergerImpl();
        MetaObject mergedObject = merger.merge(object1, object2);
        System.out.println("mergedObject = " + mergedObject);

        Date mergedMomentDate = (Date) mergedObject.get("moment");
        Calendar mergedMoment = GregorianCalendar.getInstance();
        mergedMoment.setTime(mergedMomentDate);

        // Same field values result in a single unchanged value
        assertEquals(1951, mergedMoment.get(GregorianCalendar.YEAR));
        assertEquals(GregorianCalendar.JULY, mergedMoment.get(GregorianCalendar.MONTH));
        assertEquals(14, mergedMoment.get(GregorianCalendar.DAY_OF_MONTH));

        // Different field values result in different fields
        Object mergedContent = mergedObject.get("content");
        assertNull(mergedContent);
        Object mergedContent1 = mergedObject.get("content_1");
        assertEquals(SIGHTING_CONTENT_1, mergedContent1);
        Object mergedContent2 = mergedObject.get("content_2");
        assertEquals(SIGHTING_CONTENT_2, mergedContent2);
    }

    public void testRetrievePlainSighting() throws MetaException {

        // Retrieves sighting data of February 4, 1997 from RR0 website
        {
            Calendar moment = GregorianCalendar.getInstance();
            moment.set(GregorianCalendar.YEAR, 1897);
            moment.set(GregorianCalendar.MONTH, GregorianCalendar.FEBRUARY);
            moment.set(GregorianCalendar.DAY_OF_MONTH, 4);
            MetaObject sighting = new MetaObjectImpl(sightingMetaType);
            sighting.set("moment", moment.getTime(), dummyUser);
            sighting.accept(rr0Adapter);
            String content = (String) sighting.get("content");
            assertEquals("A Inavale, � environ 60 km au Sud de Hastings, une douzaine de personnes qui reviennent de l'�glise sont survol�es par un a�ronef myst�rieux de forme conique, d'une longueur �valu�e � 10 m environ. 2 paires d'ailes d�passent des flancs de l'engin qui se termine par un gouvernail. Un projecteur est fix� � sa proue et on distingue 6 lumi�res plus petites. D'apr�s les t�moins, on peut entendre comme des voix et des rires venant du ciel.", content);
        }

        // Change database
        {
            Calendar moment = GregorianCalendar.getInstance();
            moment.set(GregorianCalendar.YEAR, 1951);
            moment.set(GregorianCalendar.MONTH, GregorianCalendar.JULY);
            moment.set(GregorianCalendar.DAY_OF_MONTH, 14);
            MetaObject sighting = new MetaObjectImpl(sightingMetaType);
            sighting.set("moment", moment.getTime(), dummyUser);
            sighting.accept(ovniFranceAdapter);
            String content = (String) sighting.get("content");
            assertEquals(SIGHTING_CONTENT_1, content);
            MetaObject source = (MetaObject) sighting.get("source");
//            assertEquals("Hynek, 1979", source.get("title"));
        }

        // Change year/HTML file
        {
            Calendar moment = GregorianCalendar.getInstance();
            moment.set(GregorianCalendar.YEAR, 1947);
            moment.set(GregorianCalendar.MONTH, GregorianCalendar.AUGUST);
            moment.set(GregorianCalendar.DAY_OF_MONTH, 12);
            MetaObject sighting = new MetaObjectImpl(sightingMetaType);
            sighting.set("moment", moment.getTime(), dummyUser);
            sighting.accept(rr0Adapter);
            String content = (String) sighting.get("content");
            assertEquals("A Las Vegas (Nevada), un objet rond orange descend par 2 fois au fa�te des arbres.", content);
            MetaObject source = (MetaObject) sighting.get("source");
            assertEquals("Hynek, 1979", source.get("title"));
        }
    }

    public void testRetrieveSightingWithQuote() throws MetaException {
        {
            Calendar moment = GregorianCalendar.getInstance();
            moment.set(GregorianCalendar.YEAR, 1897);
            moment.set(GregorianCalendar.MONTH, GregorianCalendar.APRIL);
            moment.set(GregorianCalendar.DAY_OF_MONTH, 10);
            MetaObject sighting = new MetaObjectImpl(sightingMetaType);
            sighting.set("moment", moment.getTime(), dummyUser);
            sighting.accept(rr0Adapter);
            String content = (String) sighting.get("content");
            assertEquals("Observation d'un \"navire\" planant et jettant des \"sondes\" sur Newton (Iowa). En plusieurs endroits, cette chose merveilleuse fut observ�e par plusieurs personnes �quip�es de petites t�lescopes ou de jumelles (...). D'apr�s ces personnes, le corps principal de l'objet volant nocturne doit avoir 20 m de longueur, il est de proportions agr�able et semble �tre construit tr�s fragilement. A ce corps est attach� un projecteur et d'autres lumi�res. Quelques observateurs affirment avoir vu, � peu de distance au-dessus de ce corps principal, comme des structures lat�rales ressemblant � des ailes ou � des voiles. Ces derni�res devaient avoir 6 m de largeur [Chicago Chronicle].", content);
        }
    }
}
