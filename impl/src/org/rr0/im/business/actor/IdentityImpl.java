package org.rr0.im.business.actor;

import java.net.URL;
import java.text.MessageFormat;
import java.text.ParseException;
import java.util.Vector;

/**
 * @author Jerôme Beau
 * @version 10 avr. 2004 20:58:15
 */
public class IdentityImpl implements Identity {
    /**
     * The actor's homepage address
     */
    private Vector homePages;

    private static MessageFormat emailFormat = new MessageFormat("{0}@{1}.{2}");
    private Vector emails = new Vector();

    private String name;

    public IdentityImpl(String name) {
        setName(name);
    }

    public void setName(String name) {
        this.name = name;
    }

    public Vector getEmails() {
        return emails;
    }

    public void addEmail(String email) {
        try {
            emailFormat.parse(email);
            emails.addElement(email);
        } catch (ParseException e) {
            throw new IllegalArgumentException("\"" + email + "\" is not a valid email: " + e);
        }
    }

    /**
     * The identity's Web page address
     *
     * @return
     */
    public Vector getHomePages() {
        return homePages;
    }

    public boolean isPseudonym() {
        return false;
    }

    public String getName() {
        return name;
    }

    public void addHomePage(URL homePage) {
        this.homePages.addElement(homePage);
    }
}
