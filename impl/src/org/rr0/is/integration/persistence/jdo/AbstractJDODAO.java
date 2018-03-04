package org.rr0.is.integration.persistence.jdo;

import javax.jdo.PersistenceManager;

/**
 * @author Jérôme Beau
 * @version 31 mai 2003 16:17:42
 */
public class AbstractJDODAO
{
    private PersitenceManagerFactoryStrategy pmfStrategy;

    public AbstractJDODAO() {
    }

    protected PersistenceManager getPersistenceManager() {
        PersistenceManager pm = null;
        if (pmfStrategy != null) {
            pm = pmfStrategy.getPersistenceManager();
        }
        return pm;
    }
}
