/**
 * An Actor may have multiple identities (pseudonyms).
 */
export class Identity {
  /**
   * The actor's Web pages addresses (HTTP URLs)
   */
  homePages = [];

  emailFormat = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

  /**
   * Available electronic mail addresses to communicate with this identity.
   */
  emails = [];

  constructor(public name: String) {
  }

  public addEmail(email: String) {
    try {
      this.emailFormat.test(email);
      this.emails.push(email);
    } catch (e) {
      throw Error("\"" + email + "\" is not a valid email: " + e);
    }
  }

  /**
   * true if this identity is a pseudonym, false if it is the "true" identity of an Actor.
   */
  isPseudonym: boolean;
}
