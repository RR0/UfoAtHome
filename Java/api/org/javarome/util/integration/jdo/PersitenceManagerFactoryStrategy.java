package org.rr0.is.integration.persistence.jdo;

import javax.jdo.PersistenceManager;

/**
 * @author Jérôme Beau
 * @version 31 mai 2003 16:25:21
 */
public interface PersitenceManagerFactoryStrategy
{
    PersistenceManager getPersistenceManager();
}
