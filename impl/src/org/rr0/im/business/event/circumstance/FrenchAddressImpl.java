package org.rr0.im.business.event.circumstance;

/**
 * @author Jerome Beau
 * @version 0.3
 */
public class FrenchAddressImpl extends AbstractAddress {
    int codePostal;

    public int getCodePostal() {
        return codePostal;
    }

    public void setCodePostal(int codePostal) {
        this.codePostal = codePostal;
    }
}
