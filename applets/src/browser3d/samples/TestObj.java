package browser3d.samples;

import org.rr0.ufoathome.view.treed.Model3d;

import java.util.Properties;

public class TestObj extends Animation {
    Model3d createModel() {
        Properties parameters = new Properties();
        return new Castle(parameters, getSize().width, getSize().height);
    }
}
