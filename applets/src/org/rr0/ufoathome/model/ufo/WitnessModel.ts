export class WitnessModel {
  private lastName: String;
  private firstName: String;
  private email: String;
  private address: String;
  private town: String;
  private zipCode: String;
  private country: String;
  private phoneNumber: String;
  private birthDate: GregorianCalendar;

  public getTown(): String {
    return this.town;
  }

  public setTown(town: String) {
    this.town = town;
  }

  public getBirthDate(): GregorianCalendar {
    if (this.birthDate == null) {
      this.birthDate = (GregorianCalendar);
      GregorianCalendar.getInstance();
    }
    return this.birthDate;
  }

  public setBirthDate(birthDate: Date) {
    this.birthDate.setTime(birthDate);
  }

  public setLastName(lastName: String) {
    this.lastName = lastName;
  }

  public setFirstName(firstName: String) {
    this.firstName = firstName;
  }

  public setEmail(email: String) {
    this.email = email;
  }

  public setAddress(address: String) {
    this.address = address;
  }

  public setZipCode(zipCode: String) {
    this.zipCode = zipCode;
  }

  public setCountry(country: String) {
    this.country = country;
  }

  public setPhoneNumber(phoneNumber: String) {
    this.phoneNumber = phoneNumber;
  }

  public getLastName(): String {
    return this.lastName;
  }

  public getFirstName(): String {
    return this.firstName;
  }

  public getEmail(): String {
    return this.email;
  }

  public getAddress(): String {
    return this.address;
  }

  public getZipCode(): String {
    return this.zipCode;
  }

  public getCountry(): String {
    return this.country;
  }

  public getPhoneNumber(): String {
    return this.phoneNumber;
  }

  public toString(): String {
    const uudfBuffer = new StringBuffer();
    uudfBuffer.append("<witness");
    uudfBuffer.append(" firstname=\"").append(this.firstName).append("\"");
    uudfBuffer.append(" lastname=\"").append(this.lastName).append("\"");
    uudfBuffer.append(" email=\"").append(this.email).append("\"");
    uudfBuffer.append(" address=\"").append(this.address).append("\"");
    uudfBuffer.append(" zipcode=\"").append(this.zipCode).append("\"");
    uudfBuffer.append(" phone-number=\"").append(this.phoneNumber).append("\"");
    uudfBuffer.append(" birthdate=\"").append(this.birthDate).append("\"");
    uudfBuffer.append("/>");
    uudfBuffer.append("\n");
    return uudfBuffer.toString();
  }
}
