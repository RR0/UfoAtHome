package org.rr0.ufoathome.view.gui;

import java.util.EventObject;

/**
 * @author Jerôme Beau
 * @version 0.3
 */
public class MessageEvent extends EventObject {
    private String message;
    private MessageEditable editable;

    public MessageEvent(Object source, String message, MessageEditable editable) {
        super(source);
        this.message = message;
        this.editable = editable;
    }

    public MessageEditable getEditable() {
        return editable;
    }

    public String getText() {
        return message;
    }
}
