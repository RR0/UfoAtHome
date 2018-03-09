/**
 * @deprecated
 */
export class BitSet {

  private value;

  get(bit: number) {
    return this.value & bit;
  }

  set(bit: number) {
    this.value |= bit;
  }
}