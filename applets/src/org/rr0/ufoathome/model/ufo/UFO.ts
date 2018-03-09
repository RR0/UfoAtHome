import {MessageEditable} from "../../view/gui/MessageEditable";

export class UFO implements Cloneable, MessageEditable {
  private name: String;

  public getName(): String {
    return name;
  }

  constructor(name: String) {
    this.name = name;
  }

  public equals(o: Object): boolean {
    if (this == o) return true;
    if (!(o instanceof UFO)) return false;

    const ufo: UFO = <UFO>o;

    if (!name.equals(ufo.name)) return false;

    return true;
  }

  public hashCode(): number {
    return name.hashCode();
  }

  public clone(): Object {
    return super.clone();
  }

  public toString(): String {
    return this.getName();
  }

  public toUUDF(): String {
    const ufoBuffer = new StringBuffer();
    ufoBuffer.append("<ufo id=\"").append(name).append("\"").append(">");
    return ufoBuffer.toString();
  }

  public getTitle(): String {
    return this.getName();
  }

  public setTitle(newValue: String) {
    this.name = newValue;
  }
}
