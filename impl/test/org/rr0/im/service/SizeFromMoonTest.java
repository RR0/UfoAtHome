package org.rr0.im.service;

import junit.framework.TestCase;
import org.rr0.im.service.function.SizeFromMoonImpl;
import org.rr0.im.service.function.SizeFromMoon;

/**
 * Test case for the SizeFromMoon function.
 *
 * @author Jérôme Beau
 * @version 15 juin 2003 15:27:03
 * @see SizeFromMoon
 */
public class SizeFromMoonTest extends TestCase
{
    public SizeFromMoonTest (String someTestName) {
        super (someTestName);
    }

    protected void setUp () {
    }

    public void testKnownDistance() {
        SizeFromMoon sizeFromMoon = new SizeFromMoonImpl();
        sizeFromMoon.setRelativeLunarSize(3.0);
        sizeFromMoon.setObjectDistance(106.42);
        assertTrue("object's length = " + sizeFromMoon.getObjectLength(), 2.8871018521619725 == sizeFromMoon.getObjectLength());
    }

    public void testUnknownDistance() {
        SizeFromMoon sizeFromMoon = new SizeFromMoonImpl();
        sizeFromMoon.setRelativeLunarSize(3.0);
        sizeFromMoon.setGroundDistance(110);
        sizeFromMoon.setAngleOfElevation(25);
        assertTrue("object's distance = " + sizeFromMoon.getObjectDistance(), 121.3715710858741 == sizeFromMoon.getObjectDistance());
        assertTrue("object's length = " + sizeFromMoon.getObjectLength(), 3.2927277549505316 == sizeFromMoon.getObjectLength());
    }

    public void testOtherKnownDistance() {
        SizeFromMoon sizeFromMoon = new SizeFromMoonImpl();
        sizeFromMoon.setRelativeLunarSize(3.0);
        sizeFromMoon.setObjectDistance(1103.3779189624918);
        assertTrue("object's length = " + sizeFromMoon.getObjectLength(), 29.933888681368472 == sizeFromMoon.getObjectLength());
    }

    public void testOtherUnknownDistance() {
        SizeFromMoon sizeFromMoon = new SizeFromMoonImpl();
        sizeFromMoon.setRelativeLunarSize(3.0);
        sizeFromMoon.setGroundDistance(1000);
        sizeFromMoon.setAngleOfElevation(25);
        assertTrue("object's distance = " + sizeFromMoon.getObjectDistance(), 1103.3779189624918 == sizeFromMoon.getObjectDistance());
        assertTrue("object's length = " + sizeFromMoon.getObjectLength(), 29.933888681368472 == sizeFromMoon.getObjectLength());
    }

    protected void tearDown () {
        // Nettoyage fin de test
    }
}
