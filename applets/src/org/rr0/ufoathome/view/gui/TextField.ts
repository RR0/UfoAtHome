import {Component} from "./Component";

/**
 * @deprecated
 */
export class TextField extends Component {
  private enabled: boolean;
  private text: string;

  constructor(size?: number) {
    super();
  }

  setEnabled(b: boolean) {
    this.enabled = b;
  }

  getText() {
    return this.text;
  }

  setText(text: string) {

  }
}