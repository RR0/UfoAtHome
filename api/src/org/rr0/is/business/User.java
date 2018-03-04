package org.rr0.is.business;

import org.rr0.im.business.actor.Identity;
import org.rr0.archipelago.model.MetaDataSource;

/**
 * @author Jerome Beau
 * @version 11 mai 2003 16:10:34
 */
public interface User extends MetaDataSource {
    String getLogin();

    boolean isPasswordValid(String somePassword);

    Identity getIdentity();
}
