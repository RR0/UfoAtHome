/**
 * @deprecated
 */
export class ActionEvent {
  constructor(private source: Object, number: number, message: String) {

  }

  getSource(): Object {
    return this.source;
  }
}