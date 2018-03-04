package org.rr0.im.business.event.circumstance;

import java.util.Locale;
import java.util.Hashtable;

/**
 * @author Jerome Beau
 * @version 0.3
 */
public class AddressFactory {
    private static final Hashtable localeToAddressImpl = new Hashtable();

    {
        localeToAddressImpl.put("en_US", USAAddressImpl.class);
        localeToAddressImpl.put("en_UK", UKAddressImpl.class);
        localeToAddressImpl.put("fr_FR", FrenchAddressImpl.class);
    }

    public static Address getInstance(Locale locale) {
        return (Address) localeToAddressImpl.get(locale);
    };
}
