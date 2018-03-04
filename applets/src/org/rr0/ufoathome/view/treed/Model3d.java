package org.rr0.ufoathome.view.treed;

import java.awt.*;
import java.util.Properties;

/**
 * A model of 3D objects.
 */
public class Model3d extends Position {
    Properties parameters;
    public int width, height;
    public Matrix3d matrix3d;
    /**
     * The objects to be rendered
     */
    public Object3d objects3d[];
    public int objects3dCount, cobj;
    float ambient;
    static final float defaultAmbient = 0.0f;
    public float minScale;
    static final float defaultMinScale = 0.5f;
    public float maxScale;
    static final float defaultMaxScale = 1.0f;
    public BoundingBox boundingBox;
    public float zCamera, zTarget;
    //    public boolean persp = true;
    public boolean moveAfterPaint = true;
    public float yCamera;

    public Model3d(Properties parameters, int width, int height, int nobj) {
        //        if (nobj <= 0) {
        //            return;
        //        }
        this.parameters = parameters;
        this.width = width;
        this.height = height;
        this.objects3dCount = nobj;
        objects3d = new Object3d[nobj];
        cobj = 0;
        ambient = param("ambient", defaultAmbient);
        minScale = param("minscale", defaultMinScale);
        maxScale = param("maxscale", defaultMaxScale);
        if (ambient < 0 || ambient > 1) {
            ambient = defaultAmbient;
        }
        if (minScale > maxScale) {
            minScale = defaultMinScale;
            maxScale = defaultMaxScale;
        }
    }

    public String param(String name, String defaultValue) {
        String value = defaultValue;
        if (parameters != null)
            try {
                value = parameters.getProperty(name);
            } catch (Exception e) {
                return defaultValue;
            }
        return value;
    }

    public boolean param(String name, boolean defaultValue) {
        boolean value = defaultValue;
        if (parameters != null)
            try {
                value = Boolean.valueOf(parameters.getProperty(name)).booleanValue();
            } catch (Exception e) {
                return defaultValue;
            }
        return value;
    }

    public int param(String name, int defaultValue) {
        int value = defaultValue;
        if (parameters != null)
            try {
                value = Integer.valueOf(parameters.getProperty(name)).intValue();
            } catch (Exception e) {
                return defaultValue;
            }
        return value;
    }

    public float param(String name, float defaultValue) {
        float value = defaultValue;
        if (parameters != null)
            try {
                value = Float.valueOf(parameters.getProperty(name)).floatValue();
            } catch (Exception e) {
                return defaultValue;
            }
        return value;
    }

    public int addObject(Object3d o) {
        //        if (cobj >= objects3dCount) {
        //            return -1;
        //        }
        objects3d[cobj] = o;
        if (cobj == objects3dCount - 1) {
            computeMatrix();
        }
        return cobj++;
    }

    public synchronized void paint(Graphics g, int horizonY) {
        //        if (cobj != objects3dCount) {
        //            return;
        //        }
        for (int i = 0; i < objects3dCount; i++) {
            objects3d[i].transformToScreenSpace(horizonY);
        }
        setPaintOrder();
        for (int i = 0; i < objects3dCount; i++) {
            objects3d[i].paint(g);
        }
        if (moveAfterPaint) {
            move();
        }
    }

    public synchronized String inside(int x, int y) {
        //        if (cobj != objects3dCount) {
        //            return null;
        //        }
        for (int i = objects3dCount - 1; i >= 0; i--) {
            Object3d object3d = objects3d[i];
            if (object3d.inside(x, y) >= 0) {
                if (object3d.name != null) {
                    return object3d.name;
                } else {
                    return "noname";
                }
            }
        }
        return null;
    }

    protected void setPaintOrder() {
        zSort();
    }

    public void zSort() {
        if (objects3dCount <= 1) {
            return;
        }
        boolean cont = true;
        while (cont) {
            cont = false;
            Object3d a = objects3d[0];
            for (int i = 1; i < objects3dCount; i++) {
                Object3d b = objects3d[i];
                if (a.center.z > b.center.z) {
                    objects3d[i - 1] = b;
                    objects3d[i] = a;
                    cont = true;
                }
                a = objects3d[i];
            }
        }

    }

    public void move() {
    }

    public void resize(int width, int height) {
        this.width = width;
        this.height = height;
        if (cobj != objects3dCount) {
            return;
        }
        computeMatrix();
    }

    public synchronized void computeMatrix() {
        if (boundingBox == null) {
            computeBoundingBox();
        }
        Vector3d boundingBoxCenter = boundingBox.getCenter();
        float f1 = width / boundingBox.getWidth();
        float f2 = height / boundingBox.getHeight();
        //        float f = 0.7f * Math.min(f1, f2);
        float f = Math.min(f1, f2);
        matrix3d = new Matrix3d();
        matrix3d.trans(-boundingBoxCenter.x, -boundingBoxCenter.y, -boundingBoxCenter.z);
        matrix3d.scale(f, f, f);
        float dz = f * boundingBox.getDepth();
        float h1 = dz * minScale / (maxScale - minScale);
        zCamera = h1 + dz / 2;
        //        yCamera = zCamera;
        zTarget = -h1 * maxScale;
        //        if (persp) {
        matrix3d.trans(0, yCamera, -zCamera);
        //        } else {
        //            matrix3d.scale(1, -1, 1);
        //            matrix3d.trans(width / 2, height / 2, 0);
        //        }
    }

    public void computeBoundingBox() {
        Object3d o = objects3d[0];
        o.transformToCameraSpace();
        boundingBox = new BoundingBox(o.vert, o.nvert);
        for (int i = 1; i < objects3dCount; i++) {
            o = objects3d[i];
            o.transformToCameraSpace();
            boundingBox.combine(new BoundingBox(o.vert, o.nvert));
        }
    }

    public void setPersp(boolean persp) {
        //        if (persp == this.persp) {
        //            return;
        //        }
        //        this.persp = persp;
        //        if (matrix3d == null)
        //            return;
        //        if (persp) {
        matrix3d.trans(-width / 2, -height / 2, 0);
        matrix3d.scale(1, -1, 1);
        matrix3d.trans(0, -yCamera, -zCamera);
        //        } else {
        //            matrix3d.trans(0, yCamera, zCamera);
        //            matrix3d.scale(1, -1, 1);
        //            matrix3d.trans(width / 2, height / 2, 0);
        //        }
    }

    public String toString() {
        return matrix3d.toString();
    }

    //    public void setHorizon(int horizonY) {
    //        transform();
    //    }
}
