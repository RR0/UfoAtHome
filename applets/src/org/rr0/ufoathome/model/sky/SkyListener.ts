import {SkyEvent} from "./SkyEvent";

export interface SkyListener {
  azimutChanged(skyEvent: SkyEvent);

  altitudeChanged(skyEvent: SkyEvent);

  longitudeChanged(skyEvent: SkyEvent);

  latitudeChanged(skyEvent: SkyEvent);
}
