package browser3d.samples;

import org.rr0.ufoathome.view.treed.Object3d;
import org.rr0.ufoathome.view.treed.Model3d;
import org.rr0.ufoathome.view.treed.Vector3d;
import org.rr0.ufoathome.view.treed.Face3d;

import java.awt.Color;

class Prism extends Object3d {
    Prism(Model3d md, Vector3d v[], int nv, Vector3d d) {
        super(md, nv * 2, nv + 2);
        for (int i = 0; i < nv; i++) {
            addVertex(v[i]);
        }
        for (int i = 0; i < nv; i++) {
            addVertex(v[i].x + d.x, v[i].y + d.y, v[i].z + d.z);
        }
        Face3d b0 = face[addFace(nv, getBaseColor(0))];
        for (int i = 0; i < nv; i++)
            b0.addVertex(vert[i]);
        for (int i = 0; i < nv; i++) {
            Face3d f = face[addFace(4, getFaceColor(i))];
            int j = (i + 1) % nv;
            f.addVertex(vert[i]);
            f.addVertex(vert[j]);
            f.addVertex(vert[j + nv]);
            f.addVertex(vert[i + nv]);
        }
        Face3d b1 = face[addFace(nv, getBaseColor(1))];
        for (int i = 0; i < nv; i++)
            b1.addVertex(vert[i + nv]);
        colectNormals();
    }

    Prism(Model3d md, Vector3d v[], int nv, float d) {
        this(md, v, nv, new Vector3d(0, 0, d));
    }

    Color getBaseColor(int b) {
        if (b != 0)
            return Color.red;
        else
            return Color.magenta;
    }

    Color getFaceColor(int f) {
        if (f % 2 == 0)
            return Color.green;
        else
            return Color.yellow;
    }
}
