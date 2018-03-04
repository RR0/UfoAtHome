package browser3d.samples;

import org.rr0.ufoathome.view.treed.Model3d;
import org.rr0.ufoathome.view.treed.Matrix3d;
import org.rr0.ufoathome.view.treed.Vector3d;

import java.util.Properties;

/**
 * @author Jerome Beau
 * @version 0.3
 */
public class Castle extends Model3d {
    public Cylinder cylinder[];
    Cone con[];
    Sphere sph;
    float rotation;
    static final float defaultRotation = 5.0f;

    Castle(Properties parameters, int width, int height) {
        super(parameters, width, height, 9);
        rotation = param("rotation", defaultRotation);

        int cylinderCount = 4;
        int nv = 16;
        float r = 6;
        float q = 2;
        float h = 8;
        Matrix3d m = new Matrix3d();
        m.zrot(90);

        cylinder = new Cylinder[cylinderCount];
        Vector3d vcyl = new Vector3d(r + q, 0, 0);
        for (int i = 0; i < cylinderCount; i++) {
            cylinder[i] = new Cylinder(this, q, nv, -h);
            cylinder[i].setTrans(vcyl.x, vcyl.y, vcyl.z);
            m.transform(vcyl, vcyl);
            addObject(cylinder[i]);
        }

        con = new Cone[cylinderCount];
        Vector3d vcon = new Vector3d(r + q, 0, 0);
        for (int i = 0; i < cylinderCount; i++) {
            con[i] = new Cone(this, q, nv, h);
            con[i].setTrans(vcon.x, vcon.y, vcon.z);
            m.transform(vcon, vcon);
            addObject(con[i]);
        }

        sph = new Sphere(this, r, 10, 16);
        sph.setRot(-45, -45, -45);
        addObject(sph);

        setRot(90, 0, 0);
    }

//    public void move() {
//        incRot(0, rotation, 0);
//    }

}
