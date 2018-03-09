import {DrawEvent} from "../../view/draw/DrawEvent";
import {AbstractController} from "../../control/AbstractController";
import {DrawShape} from "../../view/draw/DrawShape";
import {MessageEditable} from "../../view/gui/MessageEditable";
import {AbstractView} from "../../view/AbstractView";
import {MessageListener} from "../../view/gui/MessageListener";
import {DrawController} from "../../view/draw/DrawController";
import {DrawModel} from "../../view/draw/DrawModel";
import {UFOView} from "./UFOView";
import {KeyEvent} from "../../control/KeyEvent";
import {SkyEvent} from "../sky/SkyEvent";
import {Runnable} from "./Runnable";
import {SkyController} from "../sky/SkyController";
import {SkyListener} from "../sky/SkyListener";
import {BehaviorController} from "../../view/draw/BehaviorController";
import {UFO} from "./UFO";
import {UFOSceneModel} from "./UFOSceneModel";
import {MessageProducer} from "./MessageProducer";
import {MapElement} from "../../view/gui/MapElement";
import {WitnessModel} from "./WitnessModel";
import {DrawListener} from "../../view/draw/DrawListener";

/**
 * The controller for processing UFO reporting events.
 */
export class UFOController extends AbstractController implements MessageProducer {
  public static ASPECT_TAB = "Aspect";
  public static BEHAVIOR_TAB = "Behavior";
  public static LOCATION_TAB = "Place";
  public static WITNESS_TAB = "Witness";
  public static CIRCUMSTANCES_TAB = "Circumstances";
  public static MAP = "Map";

  protected mode = UFOController.LOCATION_TAB;

  protected messageListeners = [];
  private currentUFO: UFO;

  private model: UFOSceneModel;
  private mapModel: DrawModel;
  private view: UFOView;

  /**
   * The inner, replaceable controller
   */
  private controller: AbstractController;
  private skyController: SkyController;
  private aspectController: DrawController;
  private behaviorController: BehaviorController;
  private mapController: DrawController;

  private playing: boolean;
  private animationThread: Thread;
  private currentMapElement: MapElement;
  private focused: boolean;
  public static MOVETO_ACTION_COMMAND = "MoveTo";
  private RUNNABLE_WEATHER_LAYER: BitSet;
  private ALL_LAYERS_BUT_RUNNABLE_WEATHER: BitSet;

  constructor(locale: Locale, samplingRate: number) {
    super();
    this.initModels();
    this.initView();
    this.initSubControllers(samplingRate, locale);
  }

  private initSubControllers(samplingRate: number, locale: Locale) {
    this.skyController = this.createSkyController();
    this.aspectController = this.createDrawController(samplingRate, locale, this.ALL_LAYERS_BUT_RUNNABLE_WEATHER, this.RUNNABLE_WEATHER_LAYER);
    this.behaviorController = this.createBehaviorController(samplingRate, locale);
    this.mapController = this.createMapController(samplingRate, locale);
    this.animationRunner = this.createAnimationRunner(samplingRate);
    this.initLayers();
  }

  private createMapController(samplingRate: number, locale: Locale): DrawController {
    const mapController = new DrawController(this.view, this.mapModel, samplingRate, locale, this);
    {
    public
      selectObject(objectName;
    :
      String;
    )
      {
        const currentMapElement = UFOController.this.model.getBuidling(objectName);
        const selection = getSelection();
        selection.clear();
        const buildingEvents = this.model.getEvents(this.getTimeKey(), currentMapElement);
        if (buildingEvents != null) {
          for (let i = 0; i < buildingEvents.length; i++) {
            const buildingEvent = <DrawEvent> buildingEvents[i];
            selection.add(buildingEvent);
          }
        }
        selection.select(true);
        this.draw();
      }

    public
      select(multiple;
    :
      boolean, currentEvent;
    :
      DrawEvent;
    )
      {
        const mapElement = (MapElement);
        currentEvent.getSource();
        if (mapElement != currentMapElement) {
          this.selectObject(mapElement.getTitle());
        }
        super.select(multiple, currentEvent);
      }
    }
    return mapController;
  }

  private initView() {
    this.view = this.createView();
    this.view.addMouseListener(this);
    this.view.addMouseMotionListener(this);
    this.getView().addKeyListener(new KeyAdapter();
    {
      publickeyPressed(e;
    :
      KeyEvent;
    )
      {
        this.controller.keyPressed(e);
      }
    }
  )
  }

  private initModels() {
    this.model = new UFOSceneModel();
    this.mapModel = new DrawModel();
  }

  private initLayers() {
    this.ALL_LAYERS_BUT_RUNNABLE_WEATHER = new BitSet();
    this.ALL_LAYERS_BUT_RUNNABLE_WEATHER.or(this.skyController.ALL_LAYERS);
    this.ALL_LAYERS_BUT_RUNNABLE_WEATHER.clear(this.skyController.RUNNABLE_WEATHER);

    this.RUNNABLE_WEATHER_LAYER = new BitSet();
    this.RUNNABLE_WEATHER_LAYER.set(this.skyController.RUNNABLE_WEATHER);

    this.ALL_LAYERS.or(this.aspectController.ALL_LAYERS);
    this.ALL_LAYERS.or(this.skyController.ALL_LAYERS);
  }

  private createBehaviorController(samplingRate: number, locale: Locale): BehaviorController {
    this.behaviorController = new BehaviorController(this.view, this.model, samplingRate, locale, this);
    {
    public
      mouseDragged(e;
    :
      MouseEvent;
    )
      {
        super.mouseDragged(e);
        if (!e.isConsumed()) {
          this.skyController.mouseDragged(e);
        }
      }

    public
      mouseMoved(mouseEvent;
    :
      MouseEvent;
    )
      {
        super.mouseMoved(mouseEvent);
        if (!mouseEvent.isConsumed()) {
          this.skyController.mouseMoved(mouseEvent);
        }
      }

    public
      draw(layers;
    :
      BitSet;
    )
      {
        this.skyController.draw();
        super.draw(this.layers);
      }
    }
    return this.behaviorController;
  }

  private createDrawController(samplingRate: number, locale: Locale, ALL_LAYERS_BUT_RUNNABLE_WEATHER: BitSet, RUNNABLE_WEATHER_LAYER: BitSet): DrawController {
    const aspectController = new DrawController(this.view, this.model, samplingRate, locale, this);
    {
      publicmouseDragged(e;
    :
      MouseEvent;
    )
      {
        super.mouseDragged(e);
        if (!e.isConsumed()) {
          this.skyController.mouseDragged(e);
        }
      }

      publicmouseClicked(e;
    :
      MouseEvent;
    )
      {
        super.mouseClicked(e);
        if (!e.isConsumed()) {
          this.skyController.mouseClicked(e);
        }
      }

      publicselectObject(objectName;
    :
      string;
    )
      {
        const currentUFO = (UFO);
        this.model.getSource(objectName);
        const selection = getSelection();
        selection.clear();
        const ufoEvents = this.model.getEvents(this.getTimeKey(), currentUFO);
        if (ufoEvents != null) {
          for (let i = 0; i < ufoEvents.length; i++) {
            const ufoEvent = ufoEvents[i];
            selection.add(ufoEvent);
          }
        }
        selection.select(true);
        this.getView().requestFocus();
        this.draw();
      }

      publicshowShapeMenu(mouseX;
    :
      number, mouseY;
    :
      number, currentEvent;
    :
      DrawEvent;
    )
      {
        //                int selectedShapesCount = aspectController.getSelection().length;
        //                if (selectedShapesCount > 0) {
        const currentUfo = (UFO);
        currentEvent.getSource();
        const popupMenu = this.view.getShapeMenu(getSelection(), getSelection(), mouseX, mouseY, currentUfo);
        const ufos = UFOController.this.model.getSources();
        const timeKey = this.getTimeKey();
        if (ufos.length > 1) {
          const moveToMenu = new Menu(this.getMessagesBundle().getString(this.MOVETO_ACTION_COMMAND));
          const behindMenu = new Menu(this.getMessagesBundle().getString("Behind"));
          const inFrontOfMenu = new Menu(this.getMessagesBundle().getString("InFrontOf"));
          const enumeration = ufos.keys();
          while (enumeration.hasMoreElements()) {
            const ufoKey = (String);
            enumeration.nextElement();
            if (!(ufoKey.equals(currentUfo.getName()))) {
              const moveToUfoMenuItem = new MenuItem(ufoKey);
              moveToUfoMenuItem.setActionCommand(MOVETO_ACTION_COMMAND);
              const behindMenuItem = new MenuItem(ufoKey);
              const inFrontOfMenuItem = new MenuItem(ufoKey);
              const moveToUfoListenener = new ShapeMenuListener();
              {
              public
                actionPerformed(actionEvent;
              :
                ActionEvent;
              )
                {
                  super.actionPerformed(actionEvent);
                  if (actionEvent.getActionCommand().equals(this.MOVETO_ACTION_COMMAND)) {
                    const selectedUfo = (UFO);
                    ufos.get(ufoKey);
                    const selection = getSelection();
                    for (let i = 0; i < selection.length; i++) {
                      const drawEvent = selection[i];
                      drawEvent.setSource(selectedUfo);
                    }
                    if (this.skyController.getModel().getEvents(timeKey, currentUfo).isEmpty()) {
                      this.deleteSource(currentUfo.getName());
                    }
                    this.selectObject(selectedUfo.getName());
                  }
                }
              }
              moveToUfoMenuItem.addActionListener(moveToUfoListenener);
              moveToMenu.add(moveToUfoMenuItem);
              //                        behindMenuItem.addActionListener(behindUfoListenener);
              behindMenu.add(behindMenuItem);
              //                        inFrontOfMenuItem.addActionListener(inFrontOfUfoListenener);
              inFrontOfMenu.add(inFrontOfMenuItem);
            }
          }
          popupMenu.add(moveToMenu);
          popupMenu.add(behindMenu);
          popupMenu.add(inFrontOfMenu);
        }
        const menu = popupMenu;
        menu.show(this.view, mouseX, mouseY);
        //                }
      }

    public
      mouseMoved(mouseEvent;
    :
      MouseEvent;
    )
      {
        super.mouseMoved(mouseEvent);
        if (!mouseEvent.isConsumed()) {
          this.skyController.mouseMoved(mouseEvent);
        }
      }

    public
      mouseReleased(mouseEvent;
    :
      MouseEvent;
    )
      {
        super.mouseReleased(mouseEvent);
        if (!mouseEvent.isConsumed()) {
          this.skyController.mouseReleased(mouseEvent);
        }
      }

    public
      draw();
      {
        this.skyController.draw(UFOController.this.ALL_LAYERS_BUT_RUNNABLE_WEATHER);
        super.draw();
        this.skyController.draw(RUNNABLE_WEATHER_LAYER);
        this.display();
      }

    public
      record(x;
    :
      number, y;
    :
      number, source;
    :
      Object , shape;
    :
      DrawShape;
    ):
      DrawEvent;
      {
        if (source instanceof UFO) {
          this.currentUFO = <UFO>source;
        } else if (this.currentUFO == null) {
          this.currentUFO = this.createUFO();
        }
        const event = super.record(x, y, this.currentUFO, shape);
        return event;
      }

    public
      select(multiple;
    :
      boolean, currentEvent;
    :
      DrawEvent;
    )
      {
        let ufo = currentEvent.getSource();
        if (ufo != this.currentUFO) {
          this.selectObject(ufo.getName());
        }
        super.select(multiple, currentEvent);
      }

    public
      keyPressed(e;
    :
      KeyEvent;
    )
      {
        super.keyPressed(e);
        if (!e.isConsumed()) {
          this.skyController.keyPressed(e);
        }
      }
    }
    return aspectController;
  }

  private createView(): UFOView {
    const view = new UFOView();
    view.addFocusListener(new FocusListener();
    {
    public
      focusGained(FocusEvent;
      e;
    )
      {
        this.focused = true;
        this.draw();
      }

    public
      focusLost(FocusEvent;
      e;
    )
      {
        this.focused = false;
        this.draw();
      }
    }
  )
    return view;
  }

  private createSkyController(): SkyController {
    return new SkyController(this.model, this.view, this);
    {
    public
      display();
      {
        // Do nothing: subclasses will display instead
      }
    }
  }

  public addMessageListener(messageListener: MessageListener) {
    this.messageListeners.push(messageListener);
  }

  public display() {
    const view = this.getView();
    if (this.focused) {
      const graphics = view.getBufferedGraphics();
      graphics.setColor(SystemColor.blue);
      const size = view.getSize();
      const width = size.width;
      const height = size.height;
      graphics.drawRect(0, 0, width - 1, height - 2);
      graphics.drawRect(1, 1, width - 2, height - 2);
    }
    super.display();
  }

  /**
   * Select all shapes of the current UFO
   */
  private selectCurrentUfo() {
    const drawSelection = this.aspectController.getSelection();
    drawSelection.clear();
    const ufoEvents = this.model.getEvents(this.aspectController.getTimeKey(), this.currentUFO);
    for (let i = 0; i < ufoEvents.length; i++) {
      const event = ufoEvents[i];
      drawSelection.add(event);
    }
  }

  public createUFO(name: String): UFO {
    const createdUFO = this.model.createUFO(name);
    //        fireUfoCreated(createdUFO);
    return createdUFO;
  }

  public getCurrentUFO(): UFO {
    return this.currentUFO;
  }

  public getUFOs(): Hashtable {
    return this.model.getSources();
  }

  public selectObject(ufoName: String) {
    this.controller.selectObject(ufoName);
  }

  public getTime(): GregorianCalendar {
    return this.controller.getCurrentTime();
  }

  public createUFO(): UFO {
    const newUfoName = this.getMessagesBundle().getString("UFO") + '-' + (this.getUFOs().length + 1);
    const createdUFO = this.createUFO(newUfoName);
    return createdUFO;
  }

  public setDescription(description: String) {
    this.model.setDescription(this.aspectController.getTimeKey(), description);
  }

  public getDescription(): String {
    return this.model.getDescription(this.aspectController.getTimeKey());
  }

  private getWitness(): WitnessModel {
    return this.model.getWitness();
  }

  public setLastname(lastName: String) {
    this.getWitness().setLastName(lastName);
  }

  public getLastName(): String {
    return this.getWitness().getLastName();
  }

  public getBirthDate(): String {
    const birthDate = this.getWitness().getBirthDate();
    const birthDateString = this.aspectController.getDateFormat().format(birthDate.getTime());
    return birthDateString;
  }

  public setBirthDate(birthDateString: String) {
    try {
      const birthDate = this.aspectController.getDateFormat().parse(birthDateString);
      this.getWitness().setBirthDate(birthDate);
    } catch (e: ParseException) {
      e.printStackTrace();
    }
  }

  public setFirstName(firstName: String) {
    this.getWitness().setFirstName(firstName);
  }

  public setEmail(email: String) {
    this.getWitness().setEmail(email);
  }

  public setAddress(address: String) {
    this.getWitness().setAddress(address);
  }

  public setZipCode(zipCode: String) {
    this.getWitness().setZipCode(zipCode);
  }

  public setCountry(country: String) {
    this.getWitness().setCountry(country);
  }

  public setPhoneNumber(phoneNumber: String) {
    this.getWitness().setPhoneNumber(phoneNumber);
  }

  public getFirstName(): String {
    return this.getWitness().getFirstName();
  }

  public getEmail(): String {
    return this.getWitness().getEmail();
  }

  public getAddress(): String {
    return this.getWitness().getAddress();
  }

  public getZipCode(): String {
    return this.getWitness().getZipCode();
  }

  public getCountry(): String {
    return this.getWitness().getCountry();
  }

  public getPhoneNumber(): String {
    return this.getWitness().getPhoneNumber();
  }

  public getTown(): string {
    return this.getWitness().getTown();
  }

  public setTown(town: String) {
    this.getWitness().setTown(town);
  }

  public setOdor(weatherKey: String) {
    // TODO(JBE):
  }

  public setTemperature(weatherKey: String) {
    // TODO(JBE):
  }

  public mouseClicked(e: MouseEvent) {
    this.controller.mouseClicked(e);
    if (e.isConsumed()) {
      this.display();
    }
  }

  public mouseEntered(e: MouseEvent) {
    this.controller.mouseEntered(e);
  }

  public getTimeZone(): TimeZone {
    return this.aspectController.getTimeZone();
  }

  public setTimeZone(timeZone: TimeZone) {
    this.aspectController.setTimeZone(timeZone);
  }

  //    public Locale getLocale() {
  //        return skyController.getLocale();
  //    }

  public getDateFormat(): DateFormat {
    return this.aspectController.getDateFormat();
  }

  public setEndTime(endTime: Date) {
    this.aspectController.setEndTime(endTime);
    this.behaviorController.setEndTime(endTime);
    this.mapController.setEndTime(endTime);
  }

  public getStartTime(): Date {
    return this.aspectController.getStartTime();
  }

  public setStartTime(startTime: Date) {
    this.aspectController.setStartTime(startTime);
  }

  public start() {
    this.skyController.start();
    this.aspectController.start();
  }

  public isPlaying(): boolean {
    return this.playing;
  }

  public getSamplingRate(): number {
    return this.aspectController.getSamplingRate();
  }

  public backgroundClicked(e: MouseEvent) {
    this.controller.backgroundClicked(e);
    //        fireEventSelected(null);
    this.currentUFO = null;
  }

  public mouseExited(e: MouseEvent) {
    this.controller.mouseExited(e);
  }

  public mouseDragged(e: MouseEvent) {
    this.controller.mouseDragged(e);
  }

  public isAspectMode(): boolean {
    return this.mode.equals(UFOController.ASPECT_TAB);
  }

  public isMapMode(): boolean {
    return this.mode.equals(UFOController.MAP);
  }

  public isBehaviorMode(): boolean {
    return this.mode.equals(UFOController.BEHAVIOR_TAB);
  }

  protected paintShapes() {
    this.aspectController.paintShapes();
  }

  public addSelection(selection: DrawEvent) {
    this.aspectController.addSelection(selection);
  }

  public setColor(color: Color) {
    this.aspectController.setColor(color);
    this.draw();
    this.display();
  }

  public setZoomFactor(x: number) {
    this.controller.setZoomFactor(x);
    this.draw();
  }

  public addDrawListener(drawListener: DrawListener) {
    this.aspectController.addDrawListener(drawListener);
  }

  public addAnimationListener(animationListener: AnimationListener) {
    this.animationListeners.addElement(animationListener);
  }

  public setTopShape(shapePrototype: DrawShape) {
    this.aspectController.setTopShape(shapePrototype);
    this.currentUFO = null;
  }

  public setMidShape(shapePrototype: DrawShape) {
    this.aspectController.setMidShape(shapePrototype);
    this.currentUFO = null;
  }

  public setBottomShape(shapePrototype: DrawShape) {
    this.aspectController.setBottomShape(shapePrototype);
    this.currentUFO = null;
  }

  private fireModeChanged() {
    for (let i = 0; i < this.animationListeners.length; i++) {
      const animationListener = this.animationListeners[i];
      animationListener.modeChanged(this.mode);
    }
  }

  public setMode(modeName: String) {
    this.mode = modeName;
    this.fireModeChanged();
    if (this.isAspectMode()) {
      this.controller = this.aspectController;
      //            selection = ufoSelection;
      //            selection.select(true);
    } else if (this.isBehaviorMode()) {
      this.behaviorController.setSelection(this.aspectController.getSelection());
      this.controller = this.behaviorController;
      //            selection = ufoSelection;
      //            if (selection.isEmpty()) {
      //
      //            }
      //            selection.select(false);
    } else if (this.isMapMode()) {
      this.controller = this.mapController;
      //            selection.select(true);
    }

    if (this.currentUFO == null) {
      const ufosEnumeration = this.getUFOs().elements();
      if (ufosEnumeration.hasMoreElements()) {
        this.currentUFO = ufosEnumeration.nextElement();
      }
    }
    if (this.currentUFO != null) {
      this.selectCurrentUfo();
    }
  }

  /**
   * Send a text message to our message listeners.
   *
   * @param message
   * @param editable
   */
  public fireMessage(message: String, editable: MessageEditable) {
    const messageEvent = new MessageEvent(this, message, editable);
    const listenersEnumeration = this.messageListeners.elements();
    while (listenersEnumeration.hasMoreElements()) {
      const listener = (MessageListener);
      listenersEnumeration.nextElement();
      listener.message(messageEvent);
    }
  }

  public setTransparency(alpha: number) {
    this.aspectController.setTransparency(alpha);
  }

  public setTime(time: GregorianCalendar) {
    this.aspectController.setTime(time);
    this.skyController.setTime(time);
    this.mapController.setTime(time);
    this.behaviorController.setTime(time);
    super.setTime(time);
    this.fireTimeChanged(this.currentTime);
  }

  public getOffset(): number {
    return this.skyController.getOffset();
  }

  public setAzimut(someAzimut: number, source: Object): boolean {
    return this.skyController.setAzimut(someAzimut, source);
  }

  public setAltitude(degrees: number, source: number): boolean {
    return this.skyController.setAltitude(degrees, source);
  }

  public setLatitude(latitude: number) {
    this.skyController.setLatitude(latitude);
  }

  public setLongitude(longitude: number) {
    this.skyController.setLongitude(longitude);
  }

  public getView(): AbstractView {
    return this.view;
  }

  public mouseMoved(mouseEvent: MouseEvent) {
    this.controller.mouseMoved(mouseEvent);
  }

  public mouseReleased(e: MouseEvent) {
    this.controller.mouseReleased(e);
  }

  public getAzimut(): number {
    return this.skyController.getAzimut();
  }

  public getAltitude(): number {
    return this.skyController.getAltitude();
  }

  public getZoomFactor(): number {
    return this.skyController.getZoomFactor();
  }

  public draw(layers: BitSet) {
    this.controller.draw(layers);
  }

  public getLongitude(): number {
    return this.skyController.getLongitude();
  }

  public getLatitude(): number {
    return this.skyController.getLatitude();
  }

  public addSkyListener(skyListener: SkyListener) {
    this.skyController.addSkyListener(skyListener);
  }

  public fireAzimutChanged(event: SkyEvent) {
    this.skyController.fireAzimutChanged(event);
  }

  public fireAltitudeChanged(event: SkyEvent) {
    this.skyController.fireAltitudeChanged(event);
  }

  public fireLatitudeChanged(event: SkyEvent) {
    this.skyController.fireLatitudeChanged(event);
  }

  public fireLongitudeChanged(event: SkyEvent) {
    this.skyController.fireLongitudeChanged(event);
  }

  public play(on: boolean) {
    this.playing = on;
    if (this.playing) {
      this.animationThread = new Thread(animationRunner);
      this.animationThread.start();
      this.fireAnimationStarted();
    }
  }

  private fireAnimationStarted() {
    for (let i = 0; i < this.animationListeners.length; i++) {
      const animationListener = this.animationListeners[i];
      animationListener.animationStarted();
    }
  }

  private fireAnimationStopped() {
    for (let i = 0; i < this.animationListeners.length; i++) {
      const animationListener = this.animationListeners[i];
      animationListener.animationStopped();
    }
  }

  private animationRunner: Runnable;

  private createAnimationRunner(samplingRate: number): Runnable {
    return new Runnable();
    {
      publicrun();
      {
        const endTime = this.getEndTime();
        do {
          const someCurrentTime = this.getCurrentTime();
          this.setTime(someCurrentTime);
          try {
            const interval = this.samplingRate;
            Thread.sleep(interval);
            someCurrentTime.add(Calendar.MILLISECOND, interval);
            if (someCurrentTime.getTime().after(endTime)) {
              someCurrentTime.setTime(endTime);
              this.setTime(someCurrentTime);
              this.play(false);
            }
            this.draw();
          } catch (e: InterruptedException) {
            System.err.println("Play interrupted: " + e);
          }
        } while (this.playing);
        this.fireAnimationStopped();
      }
    }
  }

  public getEndTime(): Date {
    return this.aspectController.getEndTime();
  }

  public setLandscape(landscapeURL: URL, minAltitude: number, maxAltitude: number, minAzimut: number, maxAzimut: number): URL {
    return this.skyController.setLandscape(landscapeURL, minAltitude, maxAltitude, minAzimut, maxAzimut);
  }

  public setWeather(url: URL): URL {
    return this.skyController.setWeather(url);
  }

  public setPrecipitations(weatherKey: string) {
    this.skyController.setPrecipitations(weatherKey, this.controller);
    this.draw();
  }

  public setWind(weatherKey: String) {
    this.skyController.setWind(weatherKey);
  }

  public setMessage(editable: MessageEditable, text: String) {
    if (editable instanceof UFO) {
      const ufo = <UFO>editable;
      //            fireUfoDeleted(ufo);
      ufo.setTitle(text);
      //            fireUfoCreated(ufo);
    } else {
      editable.setTitle(text);
    }
  }

  public deleteSource(sourceName: String) {
    this.model.removeSource(sourceName);
  }

  public getUUDF(): String {
    return this.model.toString();
  }
}
