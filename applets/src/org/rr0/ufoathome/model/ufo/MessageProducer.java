package org.rr0.ufoathome.model.ufo;

import org.rr0.ufoathome.view.gui.MessageEditable;

/**
 * @author Jerome Beau
 * @version 27 juin 2004
 */
public interface MessageProducer {
    /**
     * Send a text message to our message listeners.
     *
     * @param message
     * @param editable
     */
    void fireMessage(String message, MessageEditable editable);
}
