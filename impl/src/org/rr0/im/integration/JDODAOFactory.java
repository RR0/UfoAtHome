package org.rr0.im.integration;

import org.rr0.im.integration.DAOFactory;
import org.rr0.im.integration.CategoryDAO;
import org.rr0.im.integration.jdo.CategoryDAOImpl;

/**
 * 
 *
 * @author Jérôme Beau
 * @version 31 mai 2003 14:35:35
 */
public class JDODAOFactory implements DAOFactory
{
    public CategoryDAO getCategoryDAO () {
        return new CategoryDAOImpl();
    }
}
