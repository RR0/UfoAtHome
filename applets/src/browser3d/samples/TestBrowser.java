package browser3d.samples;

import java.util.Properties;

public class TestBrowser extends Browser3d {
    public void init() {
        Properties parameters = new Properties();
        model3d = new CastleBSP(parameters, getSize().width, getSize().height);
        super.init();
    }
}
