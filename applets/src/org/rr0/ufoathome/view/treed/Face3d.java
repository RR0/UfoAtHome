package org.rr0.ufoathome.view.treed;

import java.awt.*;

public class Face3d {
    Object3d obj;
    Vector3d vert[], center, normal;
    int nvert, cvert;
    int red, green, blue;
    boolean dummy = false;
    private int[] xvert;
    private int[] yvert;

    Face3d(Object3d obj, int nvert, Color c) {
        this.obj = obj;
        this.nvert = nvert;
        xvert = new int[nvert];
        yvert = new int[nvert];
        this.red = c.getRed();
        this.green = c.getGreen();
        this.blue = c.getBlue();
        //        if (nvert < 3) {
        //            return;
        //        }
        vert = new Vector3d[nvert];
        center = new Vector3d();
        cvert = 0;
    }

    Face3d(Object3d obj, int nvert, int red, int green, int blue) {
        this(obj, nvert, new Color(red, green, blue));
    }

    Face3d(Object3d obj, int nvert) {
        this(obj, nvert, 0, 0, 0);
        dummy = true;
    }

    public int addVertex(Vector3d v) {
        //        if (cvert >= nvert) {
        //            return -1;
        //        }
        vert[cvert] = v;
        if (cvert == nvert - 1) {
            computeNormal();
        }
        return cvert++;
    }

    void setColor(Color c) {
        setColor(c.getRed(), c.getGreen(), c.getBlue());
    }

    void setColor(int red, int green, int blue) {
        this.red = red;
        this.green = green;
        this.blue = blue;
    }

    void setDummy(boolean dummy) {
        this.dummy = dummy;
    }

    boolean isVisible() {
        if (normal == null) {
            return false;
        }
        //        if (obj.model3d.persp) {
        return center.dot(normal) < 0;
        //        }
        //        else {
        //            return (normal.z > 0);
        //        }
    }

    void paint(Graphics g) {
        if (dummy) {
            return;
        }
        //        if (cvert != nvert) {
        //            return;
        //        }
        float z = -center.dot(normal);
        float ambient = obj.model3d.ambient;
        z *= 1 - ambient;
        ambient *= 255;
        int ir = (int) (ambient + z * red);
        int ig = (int) (ambient + z * green);
        int ib = (int) (ambient + z * blue);
        Color color = new Color(ir, ig, ib);
        g.setColor(color);
        //        int xvert[] = new int[nvert];
        //        int yvert[] = new int[nvert];
        for (int i = 0; i < nvert; i++) {
            Vector3d v = vert[i];
            xvert[i] = (int) v.x;
            yvert[i] = (int) v.y;
        }
        g.fillPolygon(xvert, yvert, nvert);
    }

    boolean inside(int x, int y) {
        //        if (dummy)
        //            return false;
        //        if (cvert != nvert)
        //            return false;
        //        int xvert[] = new int[nvert];
        //        int yvert[] = new int[nvert];
        for (int i = 0; i < nvert; i++) {
            Vector3d v = vert[i];
            xvert[i] = (int) v.x;
            yvert[i] = (int) v.y;
        }
        Polygon p = new Polygon(xvert, yvert, nvert);
        return p.inside(x, y);
    }

    void computeCenter() {
        Vector3d c = center;
        c.set(0, 0, 0);
        for (int i = 0; i < nvert; i++) {
            c.add(vert[i]);
        }
        c.div(nvert);
        c.normalize();
    }

    void computeNormal() {
        normal = new Vector3d(0, 0, 0);
        Vector3d w = new Vector3d(vert[0]);
        w.sub(vert[nvert - 1]);
        for (int i = 0; i < nvert - 1; i++) {
            Vector3d v = new Vector3d(vert[i + 1]);
            v.sub(vert[i]);
            w.mul(v);
            normal.add(w);
            w = v;
        }
        Vector3d v = new Vector3d(vert[0]);
        v.sub(vert[nvert - 1]);
        w.mul(v);
        normal.add(w);
        normal.normalize();
    }

}
