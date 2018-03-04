package browser3d.samples;

import org.rr0.ufoathome.view.treed.Model3d;

import java.awt.Color;
import java.util.Properties;

public class TestStudio extends Studio3d {
    public Model3d createModel() {
        Properties parameters = new Properties();
        return new OneCylinderOneCone(parameters, getSize().width, getSize().height);
    }
}

class OneCylinderOneCone extends Model3d {
    Cylinder cyl;
    Cone con;
    Cube dummy;
    private final int n = 10;
    private final int p = 80;
    private final float r = 1;
    private final float h = 4;
    int frame = 0;
    float dy = r / 10;

    OneCylinderOneCone(Properties parameters, int width, int height) {
        super(parameters, width, height, 3);
        float x = p * dy / 2;
        cyl = new Cylinder(this, r, n, h);
        cyl.setColor(Color.red);
        cyl.setTrans(-x / 2, -x, -h / 2);
        addObject(cyl);
        con = new Cone(this, r, n, h);
        con.setColor(Color.green);
        con.setTrans(x / 2, x, -h / 2);
        addObject(con);
        dummy = new Cube(this, x * 2);
        dummy.setDummy(true);
        addObject(dummy);
    }

    public void move() {
        cyl.incTrans(0, dy, 0);
        con.incTrans(0, -dy, 0);
        frame++;
        if (frame % p == 0) {
            frame = 0;
            dy = -dy;
        }
    }

}
