package browser3d.samples;

import org.rr0.ufoathome.view.treed.Model3d;
import org.rr0.ufoathome.view.treed.BSPTree;
import org.rr0.ufoathome.view.treed.Vector3d;

import java.util.Properties;

public class TestBSP extends Animation {
    Model3d createModel() {
        Properties parameters = new Properties();
        TwoPrismsOnePyramid md = new TwoPrismsOnePyramid(parameters, size().width, size().height);
        return md;
    }

}

class TwoPrismsOnePyramid extends Model3d {
    Prism p1, p2;
    Pyramid p3;
    BSPTree tree;
    boolean bsp;
    static final boolean defaultBSP = true;
    float rotation;
    static final float defaultRotation = 1.0f;

    TwoPrismsOnePyramid(Properties parameters, int width, int height) {
        super(parameters, width, height, 3);
        bsp = param("bsp", defaultBSP);
        rotation = param("rotation", defaultRotation);
        setPersp(false);

        Vector3d v[] = new Vector3d[4];
        v[0] = new Vector3d(0, 0, 0);
        v[1] = new Vector3d(6, 0, 0);
        v[2] = new Vector3d(6, 1, 0);
        v[3] = new Vector3d(0, 1, 0);
        Vector3d d = new Vector3d(0, 6, 6);
        p1 = new Prism(this, v, 4, d);
        p1.setTrans(-3, 0, 0);
        addObject(p1);

        v[0] = new Vector3d(0, 5, 0);
        v[1] = new Vector3d(6, 5, 0);
        v[2] = new Vector3d(6, 6, 0);
        v[3] = new Vector3d(0, 6, 0);
        d = new Vector3d(0, 0, 2);
        p2 = new Prism(this, v, 4, d);
        p2.setTrans(-3, 0, 0);
        addObject(p2);

        v[0] = new Vector3d(0, 0, 2);
        v[1] = new Vector3d(6, 0, 2);
        v[2] = new Vector3d(6, 1, 2);
        v[3] = new Vector3d(0, 1, 2);
        d = new Vector3d(3, 0.5f, 4);
        p3 = new Pyramid(this, v, 4, d);
        p3.setTrans(-3, 0, 0);
        addObject(p3);

        if (bsp)
            tree = new BSPTree(p1.face[1],
                    new BSPTree(p1.face[3],
                            new BSPTree(p1),
                            new BSPTree(p2)),
                    new BSPTree(p3));
    }

    protected void setPaintOrder() {
        if (bsp) {
            tree.setPaintOrder(this);
        }
        else {
            zSort();
        }
    }

    public void move() {
        incRot(0, rotation, 0);
    }
}
