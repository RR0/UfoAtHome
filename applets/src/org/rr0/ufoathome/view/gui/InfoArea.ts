import {Component, Input, NgModule, OnInit, VERSION} from "@angular/core";

import {MessageEditable} from "./MessageEditable";
import {AbstractController} from "../../control/AbstractController";
import {TextField} from "./TextField";

@Component({
  selector: 'info-area',
  template: `d`
})
class InfoArea extends TextField {
  @Input() controller: AbstractController;

  private editable: MessageEditable;

  public setMessageEditable(editable: MessageEditable) {
    this.editable = editable;
    this.setEnabled(editable != null);
  }

  public action(evt: Event, what: Object): boolean {
    this.controller.setMessage(this.editable, this.getText());
    return true;
  }
}
