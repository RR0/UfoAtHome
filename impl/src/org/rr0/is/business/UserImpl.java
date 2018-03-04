package org.rr0.is.business;

import org.rr0.im.business.actor.Identity;

import java.util.Locale;

/**
 * @author Jérôme Beau
 * @version 21 avr. 2003 15:59:29
 */
public class UserImpl implements User {
    private Locale locale;
    private String login;
    private String password;
    private Identity identity;

    public UserImpl(Locale locale, String login, String password, Identity identity) {
        this.locale = locale;
        this.login = login;
        this.password = password;
        this.identity = identity;
    }

    public String getLogin() {
        return login;
    }

    public boolean isPasswordValid(String somePassword) {
        return password.equals(somePassword);
    }

    public Identity getIdentity() {
        return identity;
    }

    public String getName() {
        return identity.getName();
    }
}
