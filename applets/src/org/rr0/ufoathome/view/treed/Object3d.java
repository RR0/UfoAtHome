package org.rr0.ufoathome.view.treed;

import java.awt.*;

public class Object3d extends Position {
    String name;
    Model3d model3d;
    public Vector3d vert[], overt[], norm[], onorm[];
    Vector3d center, ocenter;
    public Face3d face[];
    int nvert, cvert, nface, cface;

    public Object3d(Model3d model3d, int vertexCount, int faceCount) {
        if (vertexCount <= 4 || faceCount <= 4) {
            return;
        }
        this.model3d = model3d;
        this.nvert = vertexCount;
        this.nface = faceCount;
        vert = new Vector3d[vertexCount];
        overt = new Vector3d[vertexCount];
        norm = new Vector3d[faceCount];
        onorm = new Vector3d[faceCount];
        center = new Vector3d();
        ocenter = new Vector3d();
        face = new Face3d[faceCount];
        cvert = cface = 0;
    }

    Object3d(String name, Model3d md, int nvert, int nface) {
        this(md, nvert, nface);
        this.name = name;
    }

    public int addVertex(Vector3d v) {
        return addVertex(v.x, v.y, v.z);
    }

    public int addVertex(float x, float y, float z) {
        if (cvert >= nvert) {
            return -1;
        }
        vert[cvert] = new Vector3d(x, y, z);
        overt[cvert] = new Vector3d(x, y, z);
        return cvert++;
    }

    public int addFace(int nvert, Color c) {
        return addFace(nvert, c.getRed(), c.getGreen(), c.getBlue());
    }

    public int addFace(int nvert, int red, int green, int blue) {
        if (cface >= nface) {
            return -1;
        }
        face[cface] = new Face3d(this, nvert, red, green, blue);
        return cface++;
    }

    int addFace(int nvert) {
        int i = addFace(nvert, 0, 0, 0);
        face[i].dummy = true;
        return i;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setColor(Color c) {
        setColor(c.getRed(), c.getGreen(), c.getBlue());
    }

    void setColor(int red, int green, int blue) {
        if (cvert != nvert || cface != nface)
            return;
        for (int i = 0; i < nface; i++)
            face[i].setColor(red, green, blue);
    }

    public void setDummy(boolean dummy) {
        for (int i = 0; i < nface; i++)
            face[i].setDummy(dummy);
    }

    void transformToModelSpace() {
        if (cvert != nvert || cface != nface) {
            return;
        }

        Matrix3d transformMatrix = new Matrix3d();
        transformMatrix.mul(rotationMatrix);
        transformMatrix.mul(scaleMatrix);
        transformMatrix.mul(transMaxtrix);
        transformMatrix.transform(ocenter, center);
        transformMatrix.transform(overt, vert, nvert);

        transformMatrix.unit();
        transformMatrix.mul(rotationMatrix);
        transformMatrix.transform(onorm, norm, nface);
    }

    void transformToCameraSpace() {
        if (cvert != nvert || cface != nface) {
            return;
        }

        Matrix3d transformMatrix = new Matrix3d();
        transformMatrix.mul(rotationMatrix);
        transformMatrix.mul(scaleMatrix);
        transformMatrix.mul(transMaxtrix);
        transformMatrix.mul(model3d.rotationMatrix);
        transformMatrix.mul(model3d.scaleMatrix);
        transformMatrix.mul(model3d.transMaxtrix);
        transformMatrix.transform(ocenter, center);
        transformMatrix.transform(overt, vert, nvert);

        transformMatrix.unit();
        transformMatrix.mul(rotationMatrix);
        transformMatrix.mul(model3d.rotationMatrix);
        transformMatrix.transform(onorm, norm, nface);
    }

    void transformToScreenSpace(int horizonY) {
        //        if (cvert != nvert || cface != nface) {
        //            return;
        //        }

        Matrix3d transformMatrix = new Matrix3d();
        transformMatrix.mul(rotationMatrix);
        transformMatrix.mul(scaleMatrix);
        transformMatrix.mul(transMaxtrix);
        transformMatrix.mul(model3d.rotationMatrix);
        transformMatrix.mul(model3d.scaleMatrix);
        transformMatrix.mul(model3d.transMaxtrix);
        transformMatrix.transform(ocenter, center);
        transformMatrix.mul(model3d.matrix3d);
        transformMatrix.transform(overt, vert, nvert);

        transformMatrix.unit();
        transformMatrix.mul(rotationMatrix);
        transformMatrix.mul(model3d.rotationMatrix);
        transformMatrix.transform(onorm, norm, nface);

        //        if (model3d.persp) {
        for (int i = 0; i < nface; i++) {
            face[i].computeCenter();
        }
        float hw = model3d.width / 2;
        //            float hh = model3d.height / 2;

        float zt = model3d.zTarget;
        for (int i = 0; i < nvert; i++) {
            Vector3d v = vert[i];
            if (v.z < 0) {
                float p = zt / v.z;
                v.x = hw + v.x * p;
                v.y = horizonY - v.y * p;
            } else {
                setDummy(true);
            }
        }
        //        }
    }

    void paint(Graphics g) {
        if (cvert != nvert || cface != nface) {
            return;
        }
        for (int i = 0; i < nface; i++) {
            Face3d face = this.face[i];
            if (face.isVisible()) {
                face.paint(g);
            }
        }
    }

    int inside(int x, int y) {
        if (cvert != nvert || cface != nface) {
            return -1;
        }
        for (int i = 0; i < nface; i++) {
            Face3d f = face[i];
            if (f.isVisible()) {
                if (f.inside(x, y)) {
                    return i;
                }
            }
        }
        return -1;
    }

    void computeCenter() {
        Vector3d c = ocenter;
        c.set(0, 0, 0);
        for (int i = 0; i < nvert; i++) {
            c.add(overt[i]);
        }
        c.div(nvert);
    }

    public void colectNormals() {
        if (cvert != nvert || cface != nface) {
            return;
        }
        computeCenter();
        for (int i = 0; i < nface; i++) {
            Face3d f = face[i];
            Vector3d v = new Vector3d(ocenter);
            v.sub(f.vert[0]);
            if (v.dot(f.normal) > 0) {
                f.normal.mul(-1.0f);
            }
            onorm[i] = f.normal;
            f.normal = norm[i] = new Vector3d();
        }
    }

}
