import {Component, Input} from "@angular/core";
import {UFOController} from "../../model/ufo/UFOController";
import {AbstractController} from "../../control/AbstractController";
import {DrawEvent} from "../draw/DrawEvent";
import {UFO} from "../../model/ufo/UFO";
import {Panel} from "./Panel";
import {DrawListener} from "../draw/DrawListener";
import {Dimension} from "./Dimension";
import {Graphics} from "./Graphics";
import {SystemColor} from "./SystemColor";
import {Color} from "./Color";
import {MouseAdapter} from "./MouseAdapter";

@Component({
  selector: 'tabbed-panel',
  template: `
<div #tab-panel class="north">
  
</div>`
})
export class TabbedPanel extends Panel implements ItemSelectable {
  @Input() controller: AbstractController;

  private contentPanel: Panel;
  private tabPanel: Panel;
  private tabbedLayout: CardLayout;
  private tabs = [];
  private itemListeners = [];
  private selectedTab: Tab;

  constructor() {
    super();
    this.tabbedLayout = new CardLayout();
    this.contentPanel = new Panel(this.tabbedLayout);
    add(this.contentPanel, BorderLayout.CENTER);

    const witnessPanel = new WitnessPanel(this.controller);
    this.addPanel(witnessPanel, UFOController.WITNESS_TAB, this.messagesBundle.getString(UFOController.WITNESS_TAB));

    const locationPanel = new LocationPanel(this.controller);
    this.addPanel(locationPanel, UFOController.LOCATION_TAB, this.messagesBundle.getString(UFOController.LOCATION_TAB));

    const circumstancePanel = new CircumstancesPanel(this.controller);
    this.addPanel(circumstancePanel, UFOController.CIRCUMSTANCES_TAB, this.messagesBundle.getString(UFOController.CIRCUMSTANCES_TAB));

    const drawPanel = new AspectPanel(this.controller);
    this.addPanel(drawPanel, UFOController.ASPECT_TAB, this.messagesBundle.getString(UFOController.ASPECT_TAB));
    this.setEnabled(UFOController.ASPECT_TAB, false);

    this.controller.addDrawListener(new class implements DrawListener {
      public eventSelected(event: DrawEvent) {
        const currentUFO = <UFO>event.getSource();
        if (currentUFO == null) {
          this.tabbedPanel.setEnabled(UFOController.BEHAVIOR_TAB, false);
        } else {
          this.tabbedPanel.setEnabled(UFOController.BEHAVIOR_TAB, true);
        }
      }

      public eventRecorded(event: DrawEvent) {
      }

      public eventDeleted(ufoEvent: DrawEvent) {
        if (!this.controller.getUFOs().isEmpty()) {
          this.tabbedPanel.setEnabled(UFOController.BEHAVIOR_TAB, false);
        }
      }

      public backgroundClicked() {
      }
    });
  }

  /**
   * Returns the selected items or null if no items are selected.
   */
  public getSelectedObjects(): Object[] {
    return [this.selectedTab];
  }

  public addItemListener(itemListener: ItemListener) {
    this.itemListeners.push(itemListener);
  }

  /**
   * Removes an item listener.
   *
   * @param l the listener being removed
   * @see java.awt.event.ItemEvent
   */
  public removeItemListener(l: ItemListener) {
    this.itemListeners.removeElement(l);
  }

  class Tab extends Canvas {
    private selected: boolean;
    private fontHeight = -1;
    private fontWidth = -1;
    private text: String;
    private unselectedColor: Color;

    public getText(): String {
      if (this.fontWidth < 0) {
        const fontMetrics = this.getGraphics().getFontMetrics();
        this.fontHeight = fontMetrics.getHeight();
        this.fontWidth = fontMetrics.charsWidth(this.text.toCharArray(), 0, this.text.length());
      }
      return this.text;
    }

    public Tab(name: String, label: String) {
      this.setName(name);
      this.setText(label);
      this.fontWidth = -1;
    }

    private setText(name: String) {
      this.text = name;
    }

    public setSelected(selected: boolean) {
      this.selected = selected;
      this.repaint();
    }

    /**
     * Gets the preferred size of this component.
     *
     * @return a dimension object indicating this component's preferred size
     * @see #getMinimumSize
     * @see java.awt.LayoutManager
     */
    public getPreferredSize(): Dimension {
      this.getText();
      return new Dimension(this.fontWidth + 10, this.fontHeight + 10);
    }

    public paint(g: Graphics) {
      const title = this.getText();
      if (this.selected) {
        g.setColor(SystemColor.control);
      } else {
        g.setColor(SystemColor.controlShadow);
      }
      const highX = this.getBounds().width - 1;
      g.fillRect(1, 1, highX - 1, this.getBounds().height - 1);
      g.setColor(Color.lightGray);
      const lowY = this.getBounds().height - 1;
      if (!this.selected) {
        g.drawLine(0, lowY, highX, lowY);
      }
      g.drawLine(0, lowY + 1, 0, 1);
      g.drawLine(1, 0, highX - 1, 0);
      g.setColor(Color.darkGray);
      g.drawLine(highX, 1, highX, lowY);
      if (this.isEnabled()) {
        g.setColor(SystemColor.textText);
      } else {
        g.setColor(SystemColor.inactiveCaptionText);
      }
      if (this.selected) {
        g.drawString(title, 5, 2 + this.fontHeight);
      } else {
        g.drawString(title, 6, 3 + this.fontHeight);
      }
    }
  }

  public addPanel(panel:Panel, name:String , label:String){
    const tab = new Tab(name, label);
    const gridBagConstraint = new GridBagConstraints();
    gridBagConstraint.anchor = GridBagConstraints.NORTHEAST;
    gridBagConstraint.gridx = this.tabs.size();
    gridBagConstraint.ipadx = 0;
    gridBagConstraint.ipady = 0;
    gridBagConstraint.weightx = 1.0;
    gridBagConstraint.fill = GridBagConstraints.HORIZONTAL;
    this.tabs.push(tab);
    tab.addMouseListener(new class extends MouseAdapter {
      /**
       * Invoked when the mouse button has been clicked (pressed
       * and released) on a component.
       */
    public mouseClicked(e:MouseEvent) {
        this.show(((Tab)e.getSource()).getName())
      }
    }
  )
    this.tabPanel.add(tab, gridBagConstraint);
    this.tabbedLayout.setHgap(5);
    this.tabbedLayout.setVgap(5);
    this.contentPanel.add(panel, name);
  }

  public show(name:String) {
    for (let i = 0; i < this.tabs.size(); i++) {
      const tab = this.tabs.elementAt(i);
      const tabName = tab.getName();
      if (tabName.equals(name)) {
        this.tabbedLayout.show(this.contentPanel, name);
        tab.setSelected(true);
        this.selectedTab = tab;
        const itemEvent = new ItemEvent(this, 0, tab, ItemEvent.SELECTED);
        for (let j = 0; j < this.itemListeners.size(); j++) {
          const itemListener = (ItemListener);
          this.itemListeners.elementAt(j);
          itemListener.itemStateChanged(itemEvent);
        }
      } else {
        tab.setSelected(false);
      }
    }
    this.tabPanel.repaint();
  }

  public enable(name:String){
    for (let i = 0; i < this.tabs.size(); i++) {
      const tab = this.tabs.elementAt(i);
      if (tab.getName().equals(name)) {
        tab.setEnabled(true);
      } else {
        tab.setEnabled(false);
      }
    }
  }

  public setEnabled(name:String, b:boolean) {
    for (let i = 0; i < this.tabs.size(); i++) {
      const tab = this.tabs.elementAt(i);
      const tabName = tab.getName();
      if (tabName.equals(name)) {
        tab.setEnabled(b);
        tab.repaint();
        break;
      }
    }
  }
}
