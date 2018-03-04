package browser3d.samples;

import org.rr0.ufoathome.view.treed.Object3d;
import org.rr0.ufoathome.view.treed.Model3d;
import org.rr0.ufoathome.view.treed.Vector3d;
import org.rr0.ufoathome.view.treed.Face3d;

import java.awt.Color;

class Pyramid extends Object3d
{
    Pyramid(Model3d md, Vector3d v[], int nv, Vector3d d)
    {
        super(md, nv+1, nv+1);
        for (int i = 0; i < nv; i++)
            addVertex(v[i]);
        addVertex(d);
        Face3d b = face[addFace(nv, getBaseColor())];
        for (int i = 0; i < nv; i++)
            b.addVertex(vert[i]);
        for (int i = 0; i < nv; i++)
        {
            Face3d f = face[addFace(3, getFaceColor(i))];
            int j = (i + 1) % nv;
            f.addVertex(vert[i]);
            f.addVertex(vert[j]);
            f.addVertex(vert[nv]);
        }
        colectNormals();
    }

    Pyramid(Model3d md, Vector3d v[], int nv, float d)
    {
        this(md, v, nv, new Vector3d(0,0,d));
    }

    Color getBaseColor()
    {
        return Color.red;
    }

    Color getFaceColor(int f)
    {
        if (f % 2 != 0)
            return Color.green;
        else
            return Color.yellow;
    }

}
