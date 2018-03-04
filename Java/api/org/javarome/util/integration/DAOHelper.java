package org.javarome.util.integration;

import org.rr0.im.integration.DAOFactory;

import java.util.Properties;

/**
 * Utility class to initialize Data Access Objects.
 *
 * @author Jérôme Beau
 * @version 31 mai 2003 22:43:27
 */
public class DAOHelper
{
    public static final String DAO_FACTORY_CLASS_PROPERTY = "org.javarome.util.integration.DAOFactoryClass";

    public static DAOFactory getDAOFactory () throws DAOException {
        return getDAOFactory(System.getProperties());
    }

    public static DAOFactory getDAOFactory (Properties properties) throws DAOException {
        String daoFactoryClassProperty = properties.getProperty(DAO_FACTORY_CLASS_PROPERTY);
        try {
            Class daoFactoryClass = Class.forName (daoFactoryClassProperty);
            DAOFactory daoFactory = (DAOFactory) daoFactoryClass.newInstance();
            return daoFactory;
        } catch (Exception e) {
            throw new DAOException ("Could instanciate DAO factory from class \"" + daoFactoryClassProperty + "\"", e);
        }
    }
}
