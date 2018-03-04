package org.rr0.is.service;

import org.rr0.im.business.report.AccountId;
import org.rr0.im.business.report.Account;


/**
 * 
 *
 * @author Jérôme Beau
 * @version 21 avr. 2003 16:02:32
 */
public interface AccountService {
    void add (Account someAccount);
    Account findById (AccountId someId);
}
