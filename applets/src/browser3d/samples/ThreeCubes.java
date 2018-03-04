package browser3d.samples;

import org.rr0.ufoathome.view.treed.Model3d;

import java.util.Properties;

/**
 */
public class ThreeCubes extends Model3d {
    Cube cb1, cb2, cb3;
    float rotation;
    static final float defaultRotation = 1.0f;
    float revolution;
    static final float defaultRevolution = 0.5f;

    public ThreeCubes(Properties parameters, int width, int height) {
        super(parameters, width, height, 3);
        rotation = param("rotation", defaultRotation);
        revolution = param("revolution", defaultRevolution);
        cb1 = new Cube(this, 10);
        cb1.setRot(45, 45, 45);
        cb1.setTrans(-10, -10, -10);
        addObject(cb1);
        cb2 = new Cube(this, 10);
        cb2.setRot(-45, -45, -45);
        cb2.setTrans(0, 0, 0);
        addObject(cb2);
        cb3 = new Cube(this, 10);
        cb3.setRot(45, 45, 45);
        cb3.setTrans(10, 10, 10);
        addObject(cb3);
    }

    public void move() {
        cb1.incRot(rotation, 0, 0);
        cb2.incRot(rotation, 0, 0);
        cb3.incRot(rotation, 0, 0);
        incRot(revolution, revolution, revolution);
    }

}
