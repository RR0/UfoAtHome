package org.rr0.is.integration.persistence.jdo;

import javax.jdo.JDOFatalException;
import javax.jdo.PersistenceManager;
import javax.naming.Context;
import javax.naming.InitialContext;
import javax.naming.NamingException;
import javax.resource.ResourceException;
import javax.resource.cci.ConnectionFactory;

/**
 * @author Jérôme Beau
 * @version 31 mai 2003 16:26:39
 */
public class ManagedPersistenceManagerFactoryStrategy implements PersitenceManagerFactoryStrategy
{
    private ConnectionFactory connectionFactory;

    public ManagedPersistenceManagerFactoryStrategy() {
        String connectionFactoryName = System.getProperty("javax.jdo.option.ConnectionFactoryName");
        try {
            Context namingContext = new InitialContext();
            connectionFactory = (ConnectionFactory) namingContext.lookup(connectionFactoryName);
        } catch (NamingException e) {
            throw new JDOFatalException("Cannot get a PersistenceManagerFactory with name \"" + connectionFactory + "\"", e);
        }
    }

    public PersistenceManager getPersistenceManager() {
        try {
            return (PersistenceManager) connectionFactory.getConnection();
        } catch (ResourceException e) {
            throw new JDOFatalException("Cannot get a PersistenceManager from " + connectionFactory, e);
        }
    }
}
