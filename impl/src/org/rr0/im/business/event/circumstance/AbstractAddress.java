package org.rr0.im.business.event.circumstance;

/**
 * @author Jerome Beau
 * @version 0.3
 */
public abstract class AbstractAddress implements Address {
    private String address;
    private String country;

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getCountry() {
        return country;
    }

    public void setCountry(String country) {
        this.country = country;
    }
}
