/**
 * @deprecated
 */
export class Hashtable extends Object {

  put(key: Object, value: Object) {
    this[key] = value;
  }

  size() {
    return Object.keys(this).length;
  }
}