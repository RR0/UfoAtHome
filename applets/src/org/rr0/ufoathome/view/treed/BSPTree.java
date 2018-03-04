package org.rr0.ufoathome.view.treed;

public class BSPTree {
    BSPTree front, back;
    Object3d obj;
    Face3d plane;

    public BSPTree(Face3d plane, BSPTree back, Object3d obj, BSPTree front) {
        this.front = front;
        this.obj = obj;
        this.back = back;
        this.plane = plane;
    }

    public BSPTree(Face3d plane, BSPTree back, BSPTree front) {
        this.front = front;
        this.obj = null;
        this.back = back;
        this.plane = plane;
    }

    public BSPTree(Object3d obj) {
        this.front = null;
        this.obj = obj;
        this.back = null;
        this.plane = null;
    }

    public void setPaintOrder(Model3d md) {
        setPaintOrder(md.objects3d, md.objects3dCount, 0);
    }

    public int setPaintOrder(Object3d obj[], int nobj, int cobj) {
        if (plane == null) {
            if (cobj >= nobj)
                return cobj;
            if (this.obj != null)
                obj[cobj++] = this.obj;
        } else if (plane.isVisible()) {
            if (back != null)
                cobj = back.setPaintOrder(obj, nobj, cobj);
            if (cobj >= nobj)
                return cobj;
            if (this.obj != null)
                obj[cobj++] = this.obj;
            if (front != null)
                cobj = front.setPaintOrder(obj, nobj, cobj);
        } else {
            if (front != null)
                cobj = front.setPaintOrder(obj, nobj, cobj);
            if (cobj >= nobj)
                return cobj;
            if (this.obj != null)
                obj[cobj++] = this.obj;
            if (back != null)
                cobj = back.setPaintOrder(obj, nobj, cobj);
        }
        return cobj;
    }
}
