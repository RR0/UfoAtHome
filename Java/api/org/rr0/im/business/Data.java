package org.rr0.im.business;

/**
 * Any data
 *
 * @author Jérôme Beau
 * @version 21 avr. 2003 16:24:55
 */
public interface Data {

    /**
     * Link/attach another data to this data.
     * For example: attach a comment to a photographic evidence.
     * @param otherData
     */
    void link (Data otherData);
}
