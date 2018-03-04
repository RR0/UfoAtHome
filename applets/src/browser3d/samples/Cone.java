package browser3d.samples;

import org.rr0.ufoathome.view.treed.Model3d;
import org.rr0.ufoathome.view.treed.Vector3d;

public class Cone extends Pyramid
{
    Cone(Model3d model3d, float r, int nv, Vector3d d)
    {
        super(model3d, Cylinder.computeBase(r,nv,d),nv,d);
    }

    public Cone(Model3d md, float r, int nv, float d)
    {
        this(md, r, nv, new Vector3d(0,0,d));
    }

}
