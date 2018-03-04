package browser3d.samples;

import org.rr0.ufoathome.view.treed.Model3d;
import org.rr0.ufoathome.view.treed.BSPTree;
import org.rr0.ufoathome.view.treed.Face3d;
import org.rr0.ufoathome.view.treed.Vector3d;

import java.util.Properties;

public class TestXXX extends Animation {
    Model3d createModel() {
        Properties parameters = new Properties();
        XXXWord md = new XXXWord(parameters, getSize().width, getSize().height);
        return md;
    }

}

class XXXWord extends Model3d {
    BSPTree tree;
    Cube dummy;
    XLetter x1, x2, x3;
    float xWidth;
    static final float defaultXWidth = 4.0f;
    float xHeight;
    static final float defaultXHeight = 6.0f;
    float xDepth;
    static final float defaultXDepth = 1.0f;
    float space;
    static final float defaultSpace = 2.0f;
    float rotation;
    static final float defaultRotation = 1.0f;

    XXXWord(Properties parameters, int width, int height) {
        super(parameters, width, height, 13);
        xWidth = param("xwidth", defaultXWidth);
        xHeight = param("xheight", defaultXHeight);
        xDepth = param("xdepth", defaultXDepth);
        space = param("space", defaultSpace);
        rotation = param("rotation", defaultRotation);
        dummy = new Cube(this, 1);
        dummy.setDummy(true);
        addObject(dummy);
        x1 = new XLetter(this, -xWidth - space, 0, 0);
        addObject(x1.p0);
        addObject(x1.p1);
        addObject(x1.p2);
        addObject(x1.p3);
        x2 = new XLetter(this, 0, 0, 0);
        addObject(x2.p0);
        addObject(x2.p1);
        addObject(x2.p2);
        addObject(x2.p3);
        x3 = new XLetter(this, +xWidth + space, 0, 0);
        addObject(x3.p0);
        addObject(x3.p1);
        addObject(x3.p2);
        addObject(x3.p3);
        Face3d fz = dummy.face[1];
        Face3d fy = dummy.face[3];
        Face3d fx = dummy.face[5];
        BSPTree t1 = new BSPTree(fx,
                new BSPTree(fy, new BSPTree(x1.p2), x1.p1, null), null,
                new BSPTree(fy, new BSPTree(x1.p3), x1.p0, null));
        BSPTree t2 = new BSPTree(fx,
                new BSPTree(fy, new BSPTree(x2.p2), x2.p1, null), null,
                new BSPTree(fy, new BSPTree(x2.p3), x2.p0, null));
        BSPTree t3 = new BSPTree(fx,
                new BSPTree(fy, new BSPTree(x3.p2), x3.p1, null), null,
                new BSPTree(fy, new BSPTree(x3.p3), x3.p0, null));
        tree = new BSPTree(fx, t1, null, new BSPTree(fx, t2, null, t3));
    }

    protected void setPaintOrder() {
        tree.setPaintOrder(objects3d, objects3dCount, 1);
    }

    public void move() {
        incRot(0, rotation, 0);
    }

}

class XLetter {
    Prism p0, p1, p2, p3;

    XLetter(XXXWord md, float tx, float ty, float tz) {
        float w = md.xWidth / 2;
        float h = md.xHeight / 2;
        float d = md.xDepth;
        if (d > w)
            d = w;
        Vector3d v[] = new Vector3d[4];
        v[0] = new Vector3d(0, 0, -d / 2);
        v[1] = new Vector3d(d, 0, -d / 2);
        v[2] = new Vector3d(w, h, -d / 2);
        v[3] = new Vector3d(w - d, h, -d / 2);
        p0 = new Prism(md, v, 4, d);
        p0.setTrans(tx, ty, tz);
        for (int i = 0; i < 4; i++)
            v[i].x = -v[i].x;
        p1 = new Prism(md, v, 4, d);
        p1.setTrans(tx, ty, tz);
        for (int i = 0; i < 4; i++)
            v[i].y = -v[i].y;
        p2 = new Prism(md, v, 4, d);
        p2.setTrans(tx, ty, tz);
        for (int i = 0; i < 4; i++)
            v[i].x = -v[i].x;
        p3 = new Prism(md, v, 4, d);
        p3.setTrans(tx, ty, tz);
    }

}
