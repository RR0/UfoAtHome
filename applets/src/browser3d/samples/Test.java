package browser3d.samples;

import org.rr0.ufoathome.view.treed.Model3d;

import java.util.Properties;

public class Test extends Animation
{
    Model3d createModel()
    {
        Properties parameters = new Properties();
        ThreeCubes md = new ThreeCubes(parameters, size().width, size().height);
        return md;
    }
}
