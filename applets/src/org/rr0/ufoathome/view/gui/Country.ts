export class Country {
  private name: String;

  constructor(name: String) {
    this.name = name;
  }

  public getName(): String {
    return name;
  }
}
