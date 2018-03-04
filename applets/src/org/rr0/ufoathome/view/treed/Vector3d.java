package org.rr0.ufoathome.view.treed;

public class Vector3d {
    public float x, y, z;

    public Vector3d() {
    }

    public Vector3d(Vector3d v) {
        copy(v);
    }

    public Vector3d(float x, float y, float z) {
        set(x, y, z);
    }

    public void copy(Vector3d v) {
        x = v.x;
        y = v.y;
        z = v.z;
    }

    public void set(float x, float y, float z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    public void add(Vector3d v) {
        x += v.x;
        y += v.y;
        z += v.z;
    }

    public void sub(Vector3d v) {
        x -= v.x;
        y -= v.y;
        z -= v.z;
    }

    public void cmul(Vector3d v) {
        x *= v.x;
        y *= v.y;
        z *= v.z;
    }

    public float dot(Vector3d v) {
        return x * v.x + y * v.y + z * v.z;
    }

    public void mul(Vector3d v) {
        float tx = x, ty = y, tz = z;
        x = ty * v.z - tz * v.y;
        y = tz * v.x - tx * v.z;
        z = tx * v.y - ty * v.x;
    }

    public void mul(float f) {
        x *= f;
        y *= f;
        z *= f;
    }

    public void div(float f) {
        x /= f;
        y /= f;
        z /= f;
    }

    boolean equals(Vector3d v) {
        if (v == null)
            return false;
        return x == v.x && y == v.y && z == v.z;
    }

    public float vabs() {
        return (float) Math.sqrt(x * x + y * y + z * z);
    }

    public void normalize() {
        float t = vabs();
        x /= t;
        y /= t;
        z /= t;
    }

    public float cos(Vector3d v) {
        return dot(v) / (vabs() * v.vabs());
    }

    public float sin(Vector3d v) {
        Vector3d t = new Vector3d(this);
        t.mul(v);
        return t.vabs() / (vabs() * v.vabs());
    }

    public String toString() {
        return "[" + x + ", " + y + ", " + z + "]";
    }

}
