package org.rr0.im.integration;

/**
 * Creates Data Access Objects for the application.
 *
 * @author Jérôme Beau
 * @version 31 mai 2003 14:33:14
 */
public interface DAOFactory
{
    CategoryDAO getCategoryDAO ();

    /** @link dependency 
     * @stereotype instantiate*/
    /*# CategoryDAO lnkCategoryDAO; */
}
