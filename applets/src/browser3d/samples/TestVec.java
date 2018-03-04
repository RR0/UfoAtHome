package browser3d.samples;

import org.rr0.ufoathome.view.treed.Vector3d;

public class TestVec
{
    public static void main(String args[])
    {
        Vector3d v0 = new Vector3d();
        Vector3d v1 = new Vector3d(1, 2, 3);
        Vector3d v2 = new Vector3d(v1);
        System.out.println("0: "+v0+"  "+v1+"  "+v2);
        v1.add(v2);
        v2.sub(v1);
        System.out.println("1: "+v0+"  "+v1+"  "+v2);
        v2.set(1, 2, 3);
        v0.copy(v2);
        v1.copy(v2);
        v0.cmul(v2);
        v1.mul(v2);
        v2.set(v2.vabs(), v2.dot(v2), 0);
        System.out.println("2: "+v0+"  "+v1+"  "+v2);
        v0.set(1, 0, 0);
        v1.set(0, 1, 0);
        v2.set(0, 0, 1);
        System.out.println("3: "+v0+"  "+v1+"  "+v2);
        v2.x = v0.sin(v1);
        v2.y = v0.cos(v1);
        v2.z = 0.001f;
        v0.mul(v1);
        v1.mul(v0);
        System.out.println("4: "+v0+"  "+v1+"  "+v2);
        v0.mul(5);
        v1.div(5);
        System.out.println("5: "+v0+"  "+v1+"  "+v2);
        v0.normalize();
        v1.normalize();
        v2.normalize();
        System.out.println("6: "+v0+"  "+v1+"  "+v2);
    }

}
