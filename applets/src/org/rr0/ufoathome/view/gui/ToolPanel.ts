import {Component, Input} from "@angular/core";
import {UFOController} from "../../model/ufo/UFOController";
import {AbstractController} from "../../control/AbstractController";

@Component({
  selector: 'tool-panel',
  template: `
  <tabbed-panel class="center"></tabbed-panel>`
})
export class ToolPanel {
  @Input() controller: AbstractController;

  constructor() {
    this.controller.setMode(UFOController.ASPECT_TAB);
  }
}
