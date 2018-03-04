package org.rr0.ufoathome.model.ufo;

import java.util.Date;
import java.util.GregorianCalendar;

/**
 * @author Jerome Beau
 * @version 0.3
 */
public class WitnessModel {
    private String lastName;
    private String firstName;
    private String email;
    private String address;
    private String town;
    private String zipCode;
    private String country;
    private String phoneNumber;
    private GregorianCalendar birthDate;

    public String getTown() {
        return town;
    }

    public void setTown(String town) {
        this.town = town;
    }

    public GregorianCalendar getBirthDate() {
        if (birthDate == null) {
            birthDate = (GregorianCalendar) GregorianCalendar.getInstance();
        }
        return birthDate;
    }

    public void setBirthDate(Date birthDate) {
        this.birthDate.setTime(birthDate);
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public void setZipCode(String zipCode) {
        this.zipCode = zipCode;
    }

    public void setCountry(String country) {
        this.country = country;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getLastName() {
        return lastName;
    }

    public String getFirstName() {
        return firstName;
    }

    public String getEmail() {
        return email;
    }

    public String getAddress() {
        return address;
    }

    public String getZipCode() {
        return zipCode;
    }

    public String getCountry() {
        return country;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public String toString() {
        StringBuffer uudfBuffer = new StringBuffer();
        uudfBuffer.append("<witness");
        uudfBuffer.append(" firstname=\"").append(firstName).append("\"");
        uudfBuffer.append(" lastname=\"").append(lastName).append("\"");
        uudfBuffer.append(" email=\"").append(email).append("\"");
        uudfBuffer.append(" address=\"").append(address).append("\"");
        uudfBuffer.append(" zipcode=\"").append(zipCode).append("\"");
        uudfBuffer.append(" phone-number=\"").append(phoneNumber).append("\"");
        uudfBuffer.append(" birthdate=\"").append(birthDate).append("\"");
        uudfBuffer.append("/>");
        uudfBuffer.append("\n");
        return uudfBuffer.toString();
    }
}
