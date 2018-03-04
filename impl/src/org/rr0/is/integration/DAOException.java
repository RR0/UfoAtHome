package org.rr0.is.integration;

/**
 * An error that occurs during data access.
 * DAO exceptions are Runtime exceptions because
 * they represent errors that should not occur in a properly-configured application
 * (i.e. datastore not accessible, etc.).
 * Other high-level errors (MyObjectNotFoundException, MyObjectDuplicateException, etc.)
 * should not inherit from DAOException and should be implemented and managed
 * by the application developer.
 *
 * @author Jérôme Beau
 * @version 12 juil. 2003 22:37:11
 */
public class DAOException extends RuntimeException
{
    public DAOException() {
    }

    public DAOException(String message) {
        super(message);
    }
}
