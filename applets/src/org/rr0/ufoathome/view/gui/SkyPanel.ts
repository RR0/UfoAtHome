import {SkyEvent} from "../../model/sky/SkyEvent";
import {UFOController} from "../../model/ufo/UFOController";

@Component({
  selector: 'sky-panel',
  template: `<div class="center">{{controller.view}}</div>`
})
export class SkyPanel {
  @Input() controller;

  constructor() {
      this.controller.addSkyListener(new SkyListener(); {
      public azimutChanged(skyEvent;: SkyEvent;): void {
        };

      public altitudeChanged(skyEvent;: SkyEvent;): void {
        };

      public longitudeChanged(skyEvent;: SkyEvent;): void {
          this.tabbedPanel.setEnabled(UFOController.ASPECT_TAB, true);
      }

      public latitudeChanged(skyEvent;: SkyEvent;): void {
          this.tabbedPanel.setEnabled(UFOController.ASPECT_TAB, true);
      }
    }
  )
  }
}