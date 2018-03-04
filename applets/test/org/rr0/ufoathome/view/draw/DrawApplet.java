package org.rr0.ufoathome.view.draw;

import org.rr0.ufoathome.view.gui.MessageEditable;
import org.rr0.ufoathome.model.ufo.MessageProducer;

import java.applet.Applet;
import java.awt.*;
import java.util.Locale;

/**
 * Simple interactive drawing test
 *
 * @author Jerome Beau
 * @version 0.3
 */
public class DrawApplet extends Applet implements MessageProducer{
    private DrawModel model;
    private DrawView view;
    private DrawController controller;
    private PathShape sampleShape;

    public void init() {
        super.init();

        model = new DrawModel();
        view = new DrawView();
        controller = new DrawController (view, model, 40, Locale.getDefault(), this);

        Polygon stopShape = new Polygon();
        stopShape.addPoint(10, 10);
        stopShape.addPoint(20, 10);
        stopShape.addPoint(20, 20);
        stopShape.addPoint(10, 20);
        PolygonShape p1 = new PolygonShape(view);
        p1.setColor (Color.green);
        p1.setPoints(stopShape);

        Polygon playShape = new Polygon();
        playShape.addPoint(10, 10);
        playShape.addPoint(20, 15);
        playShape.addPoint(10, 20);
        playShape.addPoint(10, 10);
        PolygonShape p2 = new PolygonShape(view);
        p2.setColor(Color.red);
        p2.setPoints(playShape);

        sampleShape = new PathShape(view);
        sampleShape.setTitle ("sample");
        sampleShape.add(p1);
        sampleShape.add(p2);
        controller.setTopShape(sampleShape);
   }

    public void start() {
        view.setSize(getSize().width, getSize().height);
        view.setBackground(Color.blue);
        add (view);
        controller.start();
    }


    public void stop() {
        testSVG1();
//        testSVG2();
        super.stop();
    }

    private void testSVG1() {
        String sampleSvg = SVG.toString(sampleShape);
        System.out.println("sampleSvg = " + TagHelper.pretty(sampleSvg, "  "));
    }

/*
    private void testSVG2() {
        SVGRenderer svgRenderer = new SVGRenderer();
        StringBuffer buffer = new StringBuffer();
        int initialIndentLevel = 0;
        double paperSize = 10.0;
        svgRenderer.init(buffer, initialIndentLevel, paperSize);

        GraphicalComposite composite;
//        svgRenderer.startRendering(composite);
//        svgRenderer.render(sampleShape);
//        svgRenderer.finishRendering(composite);

        String sampleSvg = buffer.toString();
        System.out.println("sampleSvg = " + TagHelper.pretty(sampleSvg, "  "));
    }
*/

    public void fireMessage(String message, MessageEditable editable) {
        getAppletContext().showStatus(message);
    }
}
