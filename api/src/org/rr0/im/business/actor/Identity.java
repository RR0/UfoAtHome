package org.rr0.im.business.actor;

import java.net.URL;
import java.security.Principal;
import java.util.Vector;

/**
 * An Actor may have multiple identities (pseudonyms).
 *
 * @author Jerome Beau
 * @version 10 avr. 2004 15:10:18
 */
public interface Identity extends Principal {
    /**
     * Get available electronic mail addresses to communicate with this identity.
     *
     * @return An array of String containing the email addresses.
     */
    Vector getEmails();

    /**
     * The actor's Web pages addresses (HTTP URLs)
     */
    Vector getHomePages();

    /**
     * Return if this identity is a pseudonym or not.
     *
     * @return true if this identity is a pseudonym, false if it is the "true" identity of an Actor.
     */
    boolean isPseudonym();

    void addEmail(String email);

    void addHomePage(URL homePage);
}
