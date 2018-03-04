package org.rr0.im.integration.jdo;

import org.rr0.im.integration.CategoryDAO;
import org.rr0.im.service.function.classification.Category;
import org.rr0.im.service.function.classification.CategoryImpl;
import org.rr0.im.service.function.classification.Classifiable;
import org.rr0.im.service.function.classification.Classification;
import org.rr0.is.integration.persistence.jdo.AbstractJDODAO;

import javax.jdo.PersistenceManager;
import javax.jdo.Query;
import java.util.Collection;

/**
 * Category Data Access Object JDO implementation.
 *
 * @author Jérôme Beau
 * @version 31 mai 2003 14:36:39
 */
public class CategoryDAOImpl extends AbstractJDODAO implements CategoryDAO
{
    private Class categoryImplementationClass;

    public CategoryDAOImpl() {
        categoryImplementationClass = CategoryImpl.class;
    }

    /**
         * @param someClassifiable
         * @param filter           A JDO QL filter expression, including a "classifiable" parameter.
         * @return
         */
    public boolean matches(Classifiable someClassifiable, String filter) {
        PersistenceManager pm = getPersistenceManager();
        boolean exists;
        try {
            Query existsQuery = pm.newQuery(categoryImplementationClass);
            existsQuery.declareParameters("Classifiable classifiable");
            Collection result = (Collection) existsQuery.execute(someClassifiable);
            exists = result.size() > 0;
        } finally {
            pm.close();
        }
        return exists;
    }

    public Category findCategory(String id) {
        throw new RuntimeException("Not implemented");
    }

    public Classification findClassification(String id) {
        throw new RuntimeException("Not implemented");
    }
}
