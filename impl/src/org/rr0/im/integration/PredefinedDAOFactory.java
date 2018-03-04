package org.rr0.im.integration;

import org.rr0.im.integration.DAOFactory;
import org.rr0.im.integration.CategoryDAO;
import org.rr0.im.integration.PredefinedCategoryDAO;
import org.rr0.im.integration.jdo.CategoryDAOImpl;

/**
 * 
 *
 * @author Jérôme Beau
 * @version 31 mai 2003 14:35:35
 */
public class PredefinedDAOFactory implements DAOFactory
{
    private final PredefinedCategoryDAO CATEGORY_DAO = new PredefinedCategoryDAO();

    public CategoryDAO getCategoryDAO () {
        return CATEGORY_DAO;
    }
}
