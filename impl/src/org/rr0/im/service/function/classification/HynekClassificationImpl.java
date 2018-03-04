package org.rr0.im.service.function.classification;

import org.rr0.im.service.function.Filter;

/**
 * @author Jerome Beau
 * @version 0.3
 */
public class HynekClassificationImpl extends ClassificationImpl {
    private static HynekClassificationImpl instance;

    public static Classification getInstance() {
        if (instance == null) {
            synchronized (HynekClassificationImpl.class) {
                if (instance == null) {
                    instance = new HynekClassificationImpl();
                }
            }
        }
        return instance;
    }

    private HynekClassificationImpl() {
        super("HynekClassification");
        Filter lnFilter = NocturnalLightFilter.getInstance();
        Category lnCategory = new CategoryImpl(this, "NocturnalLight", lnFilter);
        add(lnCategory);

        Filter ddFilter = new DaylightDiscFilter();
        Category ddCategory = new CategoryImpl(this, "DaylightDisc", ddFilter);
        add(ddCategory);

        Filter rvFilter = new RadarVisualFilter();
        Category rvCategory = new CategoryImpl(this, "RadarVisual", rvFilter);
        add(rvCategory);

        Filter ce1Filter = new CloseEncounter1Filter();
        Category ce1Category = new CategoryImpl(this, "CloseEncounter1", ce1Filter);
        add(ce1Category);

        Filter ce2Filter = new CloseEncounter2Filter();
        Category ce2Category = new CategoryImpl(this, "CloseEncounter2", ce2Filter);
        add(ce2Category);

        Filter ce3Filter = new CloseEncounter3Filter();
        Category ce3Category = new CategoryImpl(this, "CloseEncounter3", ce3Filter);
        add(ce3Category);
    }
}
