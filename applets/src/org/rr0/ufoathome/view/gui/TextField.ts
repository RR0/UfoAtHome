/**
 * @deprecated
 */
export class TextField {
  private enabled: boolean;
  private text: string;

  protected setEnabled(b: boolean) {
    this.enabled = b;
  }

  protected getText() {
    return this.text;
  }
}