package browser3d.samples;

import org.rr0.ufoathome.view.treed.Matrix3d;
import org.rr0.ufoathome.view.treed.Vector3d;

public class TestMat {
    public static void main(String args[]) {
        Matrix3d m = new Matrix3d();
        Vector3d v = new Vector3d(1, 0, 0);
        m.xrot(45);
        m.yrot(45);
        m.zrot(45);
        m.scale(2);
        m.trans(1, 1, 1);
        m.transform(v, v);
        System.out.println("v = " + v);
        System.out.println(m);
        m.mul(m);
        m.transform(v, v);
        System.out.println("v = " + v);
        System.out.println(m);
    }

}

