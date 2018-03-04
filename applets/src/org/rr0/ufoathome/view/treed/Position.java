package org.rr0.ufoathome.view.treed;

public class Position {
    public Matrix3d rotationMatrix;
    public Matrix3d scaleMatrix;
    public Matrix3d transMaxtrix;

    public Position() {
        rotationMatrix = new Matrix3d();
        scaleMatrix = new Matrix3d();
        transMaxtrix = new Matrix3d();
    }

    public Position(Position p) {
        this();
        copyPos(p);
    }

    public void copyPos(Position p) {
        rotationMatrix.copy(p.rotationMatrix);
        scaleMatrix.copy(p.scaleMatrix);
        transMaxtrix.copy(p.transMaxtrix);
    }

    public void setRot(float rx, float ry, float rz) {
        rotationMatrix.unit();
        incRot(rx, ry, rz);
    }

    public void setScale(float sx, float sy, float sz) {
        scaleMatrix.unit();
        incScale(sx, sy, sz);
    }

    public void setTrans(float tx, float ty, float tz) {
        transMaxtrix.unit();
        incTrans(tx, ty, tz);
    }

    public void incRot(float rx, float ry, float rz) {
        if (rx != 0)
            rotationMatrix.xrot(rx);
        if (ry != 0)
            rotationMatrix.yrot(ry);
        if (rz != 0)
            rotationMatrix.zrot(rz);
    }

    public void incScale(float sx, float sy, float sz) {
        scaleMatrix.scale(sx, sy, sz);
    }

    public void incTrans(float tx, float ty, float tz) {
        transMaxtrix.trans(tx, ty, tz);
    }

}
