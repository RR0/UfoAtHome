package browser3d.samples;

import org.rr0.ufoathome.view.treed.Model3d;
import org.rr0.ufoathome.view.treed.Matrix3d;
import org.rr0.ufoathome.view.treed.Object3d;

import java.applet.Applet;
import java.awt.BorderLayout;
import java.awt.Event;
import java.awt.Color;
import java.awt.GridLayout;
import java.awt.Panel;
import java.net.MalformedURLException;
import java.net.URL;

public class Browser3d extends Applet {
    public Model3d model3d;
    public Canvas3d canv;
    Button3d but[];
    final int nbut = 10;
    Matrix3d orot, otrans, oscale;
    float ominScale, omaxScale;

    public void init() {
        if (model3d != null) {
            setLayout(new BorderLayout());

            canv = new CanvasBrowser3d(this);
            add("Center", canv);
            but = new Button3d[nbut];

            Model3d m;
            Object3d o;
            int w = getSize().width / nbut;
            int h = w;

            m = new Model3d(null, w, h, 1);
            o = new Sphere(m, 1, 6, 6);
            m.addObject(o);
            but[0] = new Button3d(m, "Home");

            m = new Model3d(null, w, h, 1);
            o = new Cylinder(m, 1, 100, 2);
            o.setTrans(-1, 0, 0);
            o.setRot(0, 90, 0);
            o.setColor(Color.yellow);
            m.addObject(o);
            but[1] = new Button3d(m, "XRot");

            m = new Model3d(null, w, h, 1);
            o = new Cylinder(m, 1, 100, 2);
            o.setTrans(0, -1, 0);
            o.setRot(90, 0, 0);
            o.setColor(Color.yellow);
            m.addObject(o);
            but[2] = new Button3d(m, "YRot");

            m = new Model3d(null, w, h, 1);
            o = new Cylinder(m, 1, 100, 2);
            o.setTrans(0, 0, -2);
            o.setColor(Color.yellow);
            m.addObject(o);
            but[3] = new Button3d(m, "ZRot");

            m = new Model3d(null, w, h, 1);
            o = new Cone(m, 1, 100, 2);
            o.setTrans(1, 0, 0);
            o.setRot(0, -90, 0);
            o.setColor(Color.red);
            m.addObject(o);
            but[4] = new Button3d(m, "Left");

            m = new Model3d(null, w, h, 1);
            o = new Cone(m, 1, 100, 2);
            o.setTrans(-1, 0, 0);
            o.setRot(0, 90, 0);
            o.setColor(Color.red);
            m.addObject(o);
            but[5] = new Button3d(m, "Right");

            m = new Model3d(null, w, h, 1);
            o = new Cone(m, 1, 100, 2);
            o.setTrans(0, -1, 0);
            o.setRot(90, 0, 0);
            o.setColor(Color.red);
            m.addObject(o);
            but[6] = new Button3d(m, "Up");

            m = new Model3d(null, w, h, 1);
            o = new Cone(m, 1, 100, 2);
            o.setTrans(0, 1, 0);
            o.setRot(-90, 0, 0);
            o.setColor(Color.red);
            m.addObject(o);
            but[7] = new Button3d(m, "Down");

            m = new Model3d(null, w, h, 1);
            m.setPersp(false);
            o = new Cube(m, 1);
            o.setRot(45, 45, 45);
            m.addObject(o);
            m.setScale(0.7f, 0.7f, 0.7f);
            but[8] = new Button3d(m, "ZoomIn");

            m = new Model3d(null, w, h, 1);
            m.setPersp(false);
            o = new Cube(m, 1);
            o.setRot(45, 45, 45);
            m.addObject(o);
            m.setScale(1.2f, 1.2f, 1.2f);
            but[9] = new Button3d(m, "ZoomOut");

            Panel p = new Panel();
            p.setLayout(new GridLayout(1, nbut));
            for (int i = 0; i < nbut; i++)
                p.add(but[i]);
            add("South", p);
            validate();

            orot = new Matrix3d(model3d.rotationMatrix);
            otrans = new Matrix3d(model3d.transMaxtrix);
            oscale = new Matrix3d(model3d.scaleMatrix);
            ominScale = model3d.minScale;
            omaxScale = model3d.maxScale;
        }
    }

    public void start() {
        if (model3d != null) {
            for (int i = 0; i < nbut; i++) {
                but[i].releaseModel();
            }
        }
        System.gc();
    }

    public void stop() {
    }

    public boolean action(Event evt, Object what) {
        if (model3d == null)
            return false;
        String s = (String) evt.arg;
        if (s.equals("Home")) {
            model3d.rotationMatrix.copy(orot);
            model3d.transMaxtrix.copy(otrans);
//            if (model3d.persp) {
                model3d.minScale = ominScale;
                model3d.maxScale = omaxScale;
                model3d.computeMatrix();
//            } else
//                model3d.scaleMatrix.copy(oscale);
        } else if (s.equals("XRot"))
            model3d.incRot(10, 0, 0);
        else if (s.equals("YRot"))
            model3d.incRot(0, 10, 0);
        else if (s.equals("ZRot"))
            model3d.incRot(0, 0, 10);
        else if (s.equals("Left"))
            model3d.incTrans(model3d.boundingBox.getWidth() / 10, 0, 0);
        else if (s.equals("Right"))
            model3d.incTrans(-model3d.boundingBox.getWidth() / 10, 0, 0);
        else if (s.equals("Up"))
            model3d.incTrans(0, -model3d.boundingBox.getHeight() / 10, 0);
        else if (s.equals("Down"))
            model3d.incTrans(0, model3d.boundingBox.getHeight() / 10, 0);
        else if (s.equals("ZoomIn")) {
//            if (model3d.persp) {
                model3d.minScale /= 1.1f;
                model3d.maxScale /= 1.1f;
                model3d.computeMatrix();
//            } else {
//                float f = 1 / 1.1f;
//                model3d.incScale(f, f, f);
//            }
        } else if (s.equals("ZoomOut")) {
//            if (model3d.persp) {
                model3d.minScale *= 1.1f;
                model3d.maxScale *= 1.1f;
                model3d.computeMatrix();
//            } else {
//                float f = 1.1f;
//                model3d.incScale(f, f, f);
//            }
        } else
            return false;
        canv.repaint();
        return true;
    }

    void showDocument(String name) {
        try {
            getAppletContext().showDocument(new URL(getCodeBase() + name + ".html"));
        } catch (MalformedURLException e) {
        }
    }
}

class CanvasBrowser3d extends Canvas3d {
    Browser3d br;

    CanvasBrowser3d(Browser3d br) {
        super(br.model3d);
        this.br = br;
    }

    public boolean mouseDown(Event evt, int x, int y) {
        String name = model.inside(x, y);
        if (name != null)
            br.showDocument(name);
        return true;
    }

    public boolean mouseMove(Event evt, int x, int y) {
        String name = model.inside(x, y);
        if (name != null)
//            md.applet.showStatus(title);
            System.out.println(name);
        else
//            md.applet.showStatus(" ");
            System.out.println(" - ");
        return true;
    }

}
