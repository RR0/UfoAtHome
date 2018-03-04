package org.rr0.ufoathome.view.gui;

import java.awt.*;
import java.awt.event.ItemEvent;
import java.awt.event.ItemListener;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.util.Vector;

/**
 * @author Jerôme Beau
 * @version 14 déc. 2003 11:56:29
 */
public class TabbedPanel extends Panel implements ItemSelectable {
    private Panel contentPanel;
    private Panel tabPanel;
    private CardLayout tabbedLayout;
    private Vector tabs = new Vector();
    private Vector itemListeners = new Vector();
    private Tab selectedTab;

    /**
     * Returns the selected items or null if no items are selected.
     */
    public Object[] getSelectedObjects() {
        return new Object[]{selectedTab};
    }

    public void addItemListener(ItemListener itemListener) {
        itemListeners.addElement(itemListener);
    }

    /**
     * Removes an item listener.
     *
     * @param l the listener being removed
     * @see java.awt.event.ItemEvent
     */
    public void removeItemListener(ItemListener l) {
        itemListeners.removeElement(l);
    }

    public TabbedPanel() {
        super(new BorderLayout());
        tabPanel = new Panel();
        add(tabPanel, BorderLayout.NORTH);

        tabbedLayout = new CardLayout();
        contentPanel = new Panel(tabbedLayout);
        add(contentPanel, BorderLayout.CENTER);
    }

    public class Tab extends Canvas {
        private boolean selected;
        private int fontHeight = -1;
        private int fontWidth = -1;
        private String text;
        private Color unselectedColor;

        public String getText() {
            if (fontWidth < 0) {
                FontMetrics fontMetrics = getGraphics().getFontMetrics();
                fontHeight = fontMetrics.getHeight();
                fontWidth = fontMetrics.charsWidth(text.toCharArray(), 0, text.length());
            }
            return text;
        }

        public Tab(String name, String label) {
            setName(name);
            setText(label);
            fontWidth = -1;
        }

        private void setText(String name) {
            this.text = name;
        }

        public void setSelected(boolean selected) {
            this.selected = selected;
            repaint();
        }

        /**
         * Gets the preferred size of this component.
         *
         * @return a dimension object indicating this component's preferred size
         * @see #getMinimumSize
         * @see java.awt.LayoutManager
         */
        public Dimension getPreferredSize() {
            getText();
            return new Dimension(fontWidth + 10, fontHeight + 10);
        }

        public void paint(Graphics g) {
            String title = getText();
            if (selected) {
                g.setColor(SystemColor.control);
            } else {
                g.setColor(SystemColor.controlShadow);
            }
            int highX = getBounds().width - 1;
            g.fillRect(1, 1, highX - 1, getBounds().height - 1);
            g.setColor(Color.lightGray);
            int lowY = getBounds().height - 1;
            if (!selected) {
                g.drawLine(0, lowY, highX, lowY);
            }
            g.drawLine(0, lowY + 1, 0, 1);
            g.drawLine(1, 0, highX - 1, 0);
            g.setColor(Color.darkGray);
            g.drawLine(highX, 1, highX, lowY);
            if (isEnabled()) {
                g.setColor(SystemColor.textText);
            } else {
                g.setColor(SystemColor.inactiveCaptionText);
            }
            if (selected) {
                g.drawString(title, 5, 2 + fontHeight);
            } else {
                g.drawString(title, 6, 3 + fontHeight);
            }
        }
    }

    public void addPanel(Panel panel, String name, String label) {
        Tab tab = new Tab(name, label);
        GridBagConstraints gridBagConstraint = new GridBagConstraints();
        gridBagConstraint.anchor = GridBagConstraints.NORTHEAST;
        gridBagConstraint.gridx = tabs.size();
        gridBagConstraint.ipadx = 0;
        gridBagConstraint.ipady = 0;
        gridBagConstraint.weightx = 1.0;
        gridBagConstraint.fill = GridBagConstraints.HORIZONTAL;
        tabs.addElement(tab);
        tab.addMouseListener(new MouseAdapter() {
            /**
             * Invoked when the mouse button has been clicked (pressed
             * and released) on a component.
             */
            public void mouseClicked(MouseEvent e) {
                show(((Tab) e.getSource()).getName());
            }

        });
        tabPanel.add(tab, gridBagConstraint);
        tabbedLayout.setHgap(5);
        tabbedLayout.setVgap(5);
        contentPanel.add(panel, name);
    }

    public void show(String name) {
        for (int i = 0; i < tabs.size(); i++) {
            Tab tab = (Tab) tabs.elementAt(i);
            String tabName = tab.getName();
            if (tabName.equals(name)) {
                tabbedLayout.show(contentPanel, name);
                tab.setSelected(true);
                selectedTab = tab;
                ItemEvent itemEvent = new ItemEvent(this, 0, tab, ItemEvent.SELECTED);
                for (int j = 0; j < itemListeners.size(); j++) {
                    ItemListener itemListener = (ItemListener) itemListeners.elementAt(j);
                    itemListener.itemStateChanged(itemEvent);
                }
            } else {
                tab.setSelected(false);
            }
        }
        tabPanel.repaint();
    }

    public void enable(String name) {
        for (int i = 0; i < tabs.size(); i++) {
            Tab tab = (Tab) tabs.elementAt(i);
            if (tab.getName().equals(name)) {
                tab.setEnabled(true);
            } else {
                tab.setEnabled(false);
            }
        }
    }

    public void setEnabled(String name, boolean b) {
        for (int i = 0; i < tabs.size(); i++) {
            Tab tab = (Tab) tabs.elementAt(i);
            String tabName = tab.getName();
            if (tabName.equals(name)) {
                tab.setEnabled(b);
                tab.repaint();
                break;
            }
        }
    }
}
