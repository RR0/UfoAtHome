package org.rr0.im.meta;

import org.apache.commons.beanutils.MutableDynaClass;
import org.rr0.im.business.meta.MetaException;

import java.util.Map;

/**
 * @author <a href="mailto:rr0@rr0.org">Jerome Beau</a>
 * @version $revision$
 */
public interface MetaType extends MutableDynaClass {

    Map validate(MetaObject metaObject) throws MetaException;
}
