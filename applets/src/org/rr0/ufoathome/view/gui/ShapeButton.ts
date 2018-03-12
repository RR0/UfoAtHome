/**
 * <p>A on/off button that displays a Shape.</p>
 * <p>This class is implemented to be usable in Java 1.1 applets, and so follows an AWT-only requirement
 * (no Swing, Java2D, geom, or Java 2 feature)</P>
 * <p>Because of the graphics to be drawn on it, this button inherits from java.gui.Canvas and not from java.gui.Button
 * (of which the peer cannot be overwritten on every platform)</p>
 */
import {MessageListener} from "./MessageListener";
import {ActionListener} from "./ActionListener";
import {ActionEvent} from "./ActionEvent";
import {MessageEvent} from "./MessageEvent";
import {Canvas} from "./Canvas";

export abstract class ShapeButton extends Canvas implements MouseListener {
  /**
   * The on/off state of the button
   */
  private state: boolean;

  private dimension = new Dimension();

  private actionListeners = [];
  private messageListeners = [];

  private static DEFAULT_MARGIN = 10;
  private margin: number;
  private enabledColor: Color;
  private hoverMessage: String;

  public setHoverMessage(hoverMessage: String) {
    this.hoverMessage = hoverMessage;
  }

  public setMargin(margin: number) {
    this.margin = margin;
  }

  public addMessageListener(messageListener: MessageListener) {
    this.messageListeners.push(messageListener);
  }

  /**
   * Send a text message to our message listeners.
   *
   * @param message
   */
  protected message(message: String) {
    const messageEvent = new MessageEvent(this, message, null);
    const listenersEnumeration = this.messageListeners.elements();
    while (listenersEnumeration.hasMoreElements()) {
      const listener = (MessageListener)
      listenersEnumeration.nextElement();
      listener.message(messageEvent);
    }
  }

  public setEnabled(b: boolean) {
    super.setEnabled(b);
    this.repaint();
  }

  constructor(hoverMessage?: String) {
    super();
    this.addMouseListener(this);
    this.setMargin(this.DEFAULT_MARGIN);
    this.enabledColor = SystemColor.control;
    this.hoverMessage = hoverMessage;
  }

  public isPushed(): boolean {
    return this.state == true;
  }

  public setShapeDimension(shapeDimension: Dimension) {
    this.dimension.width = shapeDimension.width + this.margin * 2;
    this.dimension.height = shapeDimension.height + this.margin * 2;
  }

  public getPreferredSize(): Dimension {
    return this.dimension;
  }

  public paint(g: Graphics) {
    const bounds = this.getBounds();
    let color;
    if (this.isEnabled()) {
      color = this.enabledColor;
    } else {
      color = SystemColor.controlShadow;
    }
    g.setColor(color);
    g.fillRect(0, 0, bounds.width, bounds.height);
    if (this.isEnabled()) {
      g.setColor(SystemColor.controlHighlight);
    } else {
      g.setColor(SystemColor.controlLtHighlight);
    }
    g.draw3DRect(0, 0, bounds.width - 1, bounds.height - 1, !this.state);
    g.setColor(SystemColor.controlShadow);
    g.draw3DRect(1, 1, bounds.width - 2, bounds.height - 2, !this.state);
    if (this.isEnabled()) {
      g.setColor(SystemColor.controlText);
    } else {
      g.setColor(SystemColor.controlDkShadow);
    }
  }

  /**
   * Invoked when the mouse button has been clicked (pressed
   * and released) on a component.
   */
  public mouseClicked(e: MouseEvent) {
    this.state = !this.state;
    this.repaint();
    this.fire("ButtonPressed");
  }

  private fire(message: String) {
    const iterator = this.actionListeners.elements();
    while (iterator.hasMoreElements()) {
      const actionListener = iterator.nextElement();
      const actionEvent = new ActionEvent(this, 0, message);
      actionListener.actionPerformed(actionEvent);
    }
  }

  /**
   * Invoked when a mouse button has been pressed on a component.
   */
  public mousePressed(e: MouseEvent) {
    //To change body of implemented methods use Options | File Templates.
  }

  /**
   * Invoked when a mouse button has been released on a component.
   */
  public mouseReleased(e: MouseEvent) {
    //To change body of implemented methods use Options | File Templates.
  }

  /**
   * Invoked when the mouse enters a component.
   */
  public mouseEntered(e: MouseEvent) {
    if (this.isEnabled()) {
      this.enabledColor = SystemColor.controlHighlight;
      message(hoverMessage);
      this.repaint();
    }
  }

  /**
   * Invoked when the mouse exits a component.
   */
  public mouseExited(e: MouseEvent) {
    if (this.isEnabled()) {
      this.enabledColor = SystemColor.control;
      this.repaint();
    }
  }

  public addActionListener(actionListener: ActionListener) {
    this.actionListeners.push(actionListener);
  }

  public released() {
    this.state = false;
//        fire("ButtonReleased");
    this.repaint();
  }

  public pushed() {
    this.state = true;
    this.fire("ButtonPressed");
    this.repaint();
  }

  protected getMargin() {
    return this.margin;
  }
}
