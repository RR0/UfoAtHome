export class EventObject {
  constructor(protected source: Object) {

  }

  consume() {

  }

  public setSource(newSource: Object): void {
    this.source = newSource;
  }

  getSource(): Object {
    return this.source;
  }
}