package org.rr0.im.business.report;

import junit.framework.TestCase;
import org.rr0.im.business.actor.*;
import org.rr0.im.business.event.Event;
import org.rr0.im.business.event.SightingImpl;
import org.rr0.im.business.event.circumstance.*;
import org.rr0.im.integration.CategoryDAO;
import org.rr0.im.integration.DAOFactory;
import org.rr0.im.integration.PredefinedDAOFactory;
import org.rr0.im.service.function.classification.Category;
import org.rr0.is.integration.DAOHelper;

/**
 * A test for describing the Roswell case using the RR0 Information Model.
 *
 * @author Jérôme Beau
 * @version 21 avr. 2003 16:18:28
 */
public class RoswellReportTest extends TestCase {
    private CategoryDAO categoryDAO;
    private DAOFactory daoFactory;

    public RoswellReportTest(String someTestName) {
        super(someTestName);
    }

    protected void setUp() throws InstantiationException, IllegalAccessException, ClassNotFoundException {
        System.setProperty(DAOHelper.DAO_FACTORY_CLASS_PROPERTY, PredefinedDAOFactory.class.getName());
        daoFactory = DAOHelper.getDAOFactory();
        categoryDAO = daoFactory.getCategoryDAO();

        // The case in itself
        Case roswellCase = new CaseImpl("The Roswell Incident");

        // Case's actors
        Identity brazelIdentity = new IdentityImpl("William W. Brazel");
        HumanBeing brazel = new HumanBeingImpl(brazelIdentity);
        Identity usafIdentity = new IdentityImpl("United States Air Force");
        Organization usaf = new OrganizationImpl(usafIdentity);

        // First case's event : deflagration
        Moment firstDeflagrationMoment = new PreciseMomentImpl(1947, 7, 2, 21, 50);
        EarthLocation roswellCityLocation = new EarthLocationImpl(43, OrientationImpl.NORTH, 142, OrientationImpl.WEST);
        Place roswellCity = new PlaceImpl("Roswell", roswellCityLocation);
        Location ranchLocation = new DeltaLocationImpl(roswellCity.getLocation(), OrientationImpl.NORTH_WEST, LengthImpl.UNKNOWN);
        Place brazelRanch = new PlaceImpl("Brazel's ranch", ranchLocation);
        Clouds firstDeflagrationClouds = new CloudsImpl(0);
        Temperature firstDeflagrationTemperature = new TemperatureImpl(15);
        Wind firstDeflagrationWind = new WindImpl(10);
        Category windCategory = categoryDAO.findCategory("ViolentWind");
        Precipitations firstDeflagrationPrecipitations = new PrecipitationsImpl(0);
        WeatherCondition weatherCondition = new WeatherConditionImpl(firstDeflagrationClouds, firstDeflagrationTemperature, firstDeflagrationWind, firstDeflagrationPrecipitations);

        Source source = null;
        Event firstDeflagation = new SightingImpl("Brazel heards a deflagration", firstDeflagrationMoment, brazelRanch, brazel, source);
        roswellCase.getAccounts().add(firstDeflagation);

        // Second case's event : Mac brazel
    }

    public void test1() {

    }

    protected void tearDown() {
        // Nettoyage fin de test
    }
}
