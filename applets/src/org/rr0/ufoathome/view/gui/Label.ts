import {Component} from "./Component";

/**
 * @deprecated
 */
export class Label extends Component {
  constructor(string?: string) {
    super();
    this.setText(string);
  }

  setText(text: string) {

  }
}