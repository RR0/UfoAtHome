package browser3d.samples;

import org.rr0.ufoathome.view.treed.BSPTree;
import org.rr0.ufoathome.view.treed.Object3d;
import org.rr0.ufoathome.view.treed.Face3d;

import java.util.Properties;
import java.awt.*;

/**
 */
public class CastleBSP extends Castle {
    BSPTree tree;
    Cube dummyCube;

    public CastleBSP(Properties parameters, int width, int height) {
        super(parameters, width, height);
        dummyCube = new Cube(this, 12);
        dummyCube.setDummy(true);
        cylinder[0].setName("RedCylinder");
        cylinder[0].setColor(Color.red);
        con[0].setName("RedCone");
        con[0].setColor(Color.red);
        cylinder[1].setName("YellowCylinder");
        cylinder[1].setColor(Color.yellow);
        con[1].setName("YellowCone");
        con[1].setColor(Color.yellow);
        cylinder[2].setName("PinkCylinder");
        cylinder[2].setColor(Color.pink);
        con[2].setName("PinkCone");
        con[2].setColor(Color.pink);
        cylinder[3].setName("OrangeCylinder");
        cylinder[3].setColor(Color.orange);
        con[3].setName("OrangeCone");
        con[3].setColor(Color.orange);
        sph.setName("Sphere");
        setRot(90, 0, 0);
        setTrans(90, 0, 0);
        objects3dCount++;
        cobj++;
        Object3d temp[] = objects3d;
        objects3d = new Object3d[objects3dCount];
        objects3d[0] = dummyCube;
        for (int i = 1; i < objects3dCount; i++) {
            objects3d[i] = temp[i - 1];
        }
        Face3d f_z = dummyCube.face[0];
        Face3d fz = dummyCube.face[1];
        Face3d f_y = dummyCube.face[2];
        Face3d fy = dummyCube.face[3];
        Face3d f_x = dummyCube.face[4];
        Face3d fx = dummyCube.face[5];
        BSPTree t0 = new BSPTree(cylinder[0].face[0], new BSPTree(cylinder[0]), con[0], null);
        BSPTree t1 = new BSPTree(cylinder[1].face[0], new BSPTree(cylinder[1]), con[1], null);
        BSPTree t2 = new BSPTree(cylinder[2].face[0], new BSPTree(cylinder[2]), con[2], null);
        BSPTree t3 = new BSPTree(cylinder[3].face[0], new BSPTree(cylinder[3]), con[3], null);
        BSPTree tm = new BSPTree(fx, new BSPTree(f_x, null, sph, t2), null, t0);
        tree = new BSPTree(fy, new BSPTree(f_y, tm, null, t3), null, t1);

    }

    protected void setPaintOrder() {
        tree.setPaintOrder(objects3d, objects3dCount, 1);
    }

    public void move() {
    }
}
