package org.rr0.ufoathome.view.gui;

import org.rr0.ufoathome.model.ufo.UFOController;
import org.rr0.ufoathome.view.draw.DrawListener;
import org.rr0.ufoathome.view.draw.DrawEvent;
import org.rr0.ufoathome.view.draw.DrawShape;
import org.rr0.ufoathome.view.draw.ArcShape;
import org.rr0.ufoathome.view.draw.PathShape;
import org.rr0.ufoathome.view.draw.RectangleShape;
import org.rr0.ufoathome.view.draw.OvalShape;
import org.rr0.ufoathome.view.draw.PolygonShape;

import java.awt.*;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.AdjustmentEvent;
import java.awt.event.AdjustmentListener;
import java.util.ResourceBundle;

/**
 * GUI to parameterize the aspect of a UFO shape.
 *
 * @author Jerome Beau
 * @version 0.3
 */
public class AspectPanel extends Panel {
    private Palette palette;
    private UFOController controller;
    private Scrollbar transparencyScrollBar;

    public AspectPanel(final UFOController controller) {
        super(new BorderLayout());
        this.controller = controller;
        setBackground(SystemColor.control);

        Panel ufoSelector = new ObjectChoice(controller, "NoUfoSelected");
        add(ufoSelector, BorderLayout.NORTH);

        Panel contentPanel = new Panel(new BorderLayout());
        add(contentPanel, BorderLayout.CENTER);

        Panel shapesPanel = getShapesPanel();
        contentPanel.add(shapesPanel, BorderLayout.NORTH);

        palette = getPalettePanel(controller);
        contentPanel.add(palette, BorderLayout.CENTER);

        ResourceBundle messagesBundle = controller.getMessagesBundle();
        Panel opacityPanel = new Panel(new BorderLayout());
        Label opacityLabel = new Label(messagesBundle.getString("Transparency"));
        opacityPanel.add(opacityLabel, BorderLayout.WEST);
        transparencyScrollBar = new Scrollbar(Scrollbar.HORIZONTAL, 0, 1, 0, 256);
        transparencyScrollBar.addAdjustmentListener(new AdjustmentListener() {
            public void adjustmentValueChanged(AdjustmentEvent e) {
                int alpha = e.getValue();
                controller.setMode(UFOController.ASPECT_TAB);
                controller.setTransparency(alpha);
                controller.draw();
            }
        });
        opacityPanel.add(transparencyScrollBar, BorderLayout.CENTER);
        contentPanel.add(opacityPanel, BorderLayout.SOUTH);

        controller.addDrawListener(new DrawListener() {
            public void eventSelected(DrawEvent event) {
                if (controller.isAspectMode()) {
                    DrawShape shape = event.getShape();
                    transparencyScrollBar.setValue(shape.getTransparency());
                    palette.setColor(shape.getColor());
                }
            }

            public void eventRecorded(DrawEvent event) {
                if (controller.isAspectMode()) {
                    eventSelected(event);
                }
            }

            public void eventDeleted(DrawEvent event) {

            }

            public void backgroundClicked() {

            }
        });
    }

    private Palette getPalettePanel(final UFOController controller) {
        palette = new Palette();
        palette.addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent e) {
                controller.setColor(palette.getColor());
                controller.draw();
            }
        });
        return palette;
    }

    private Panel getShapesPanel() {
        Panel shapesPanel = new Panel(new BorderLayout());

        final ShapesCanvas topCanvas;
        {
            DrawShape[] topShapes = new DrawShape[4];
            topShapes[0] = createT1();
            topShapes[1] = createT2();
            topShapes[2] = createT3();
            topShapes[3] = createOvalShape();
            topCanvas = new ShapesCanvas(topShapes, 5, 0);
            topCanvas.setActionListener(new ActionListener() {
                public void actionPerformed(ActionEvent e) {
                    controller.setMode(UFOController.ASPECT_TAB);
                    controller.setTopShape(topCanvas.getSelectedShape());
                    controller.setColor(palette.getColor());
                }
            });
            shapesPanel.add(topCanvas, BorderLayout.NORTH);
        }

        final ShapesCanvas midCanvas;
        {
            DrawShape[] midShapes = new DrawShape[3];
            midShapes[0] = createM1();
            midShapes[1] = createM2();
            midShapes[2] = createM3();
            midCanvas = new ShapesCanvas(midShapes, 0, 0);
            midCanvas.setActionListener(new ActionListener() {
                public void actionPerformed(ActionEvent e) {
                    controller.setMode(UFOController.ASPECT_TAB);
                    controller.setMidShape(midCanvas.getSelectedShape());
                    controller.setColor(palette.getColor());
                }
            });
            shapesPanel.add(midCanvas, BorderLayout.CENTER);
        }

        final ShapesCanvas bottomCanvas;
        {
            DrawShape[] bottomShapes = new DrawShape[3];
            bottomShapes[0] = createB1();
            bottomShapes[1] = createB2();
            bottomShapes[2] = createB3();
            bottomCanvas = new ShapesCanvas(bottomShapes, 0, 5);
            bottomCanvas.setActionListener(new ActionListener() {
                public void actionPerformed(ActionEvent e) {
                    controller.setMode(UFOController.ASPECT_TAB);
                    controller.setBottomShape(bottomCanvas.getSelectedShape());
                    controller.setColor(palette.getColor());
                }
            });
            shapesPanel.add(bottomCanvas, BorderLayout.SOUTH);
        }

        DrawListener drawListener = new DrawListener() {
            public void eventSelected(DrawEvent event) {

            }

            public void eventRecorded(DrawEvent event) {
                if (event.getShape().equals(topCanvas.getSelectedShape())) {
                    topCanvas.reset();
                } else if (event.getShape().equals(midCanvas.getSelectedShape())) {
                    midCanvas.reset();
                } else if (event.getShape().equals(bottomCanvas.getSelectedShape())) {
                    bottomCanvas.reset();
                }
            }

            public void eventDeleted(DrawEvent event) {

            }

            public void backgroundClicked() {

            }
        };
        controller.addDrawListener(drawListener);

        return shapesPanel;
    }

    private ArcShape createT1() {
        ArcShape t1 = new ArcShape(controller.getView());
        t1.setWidth(40);
        t1.setHeight(20);
        t1.setEllipseWidth(t1.getWidth());
        t1.setEllipseHeight(t1.getHeight() * 2);
        t1.setStartAngle(0);
        t1.setArcAngle(180);
        return t1;
    }

    private ArcShape createT2() {
        ArcShape t2 = new ArcShape(controller.getView());
        t2.setWidth(40);
        t2.setHeight(10);
        t2.setEllipseWidth(t2.getWidth());
        t2.setEllipseHeight(t2.getHeight() * 2);
        t2.setStartAngle(0);
        t2.setArcAngle(180);
        t2.setY(20 - t2.getHeight());
        return t2;
    }

    private ArcShape createT3() {
        ArcShape t3 = new ArcShape(controller.getView());
        t3.setWidth(40);
        t3.setHeight(5);
        t3.setEllipseWidth(t3.getWidth());
        t3.setEllipseHeight(t3.getHeight() * 2);
        t3.setStartAngle(0);
        t3.setArcAngle(180);
        t3.setY(20 - t3.getHeight());
        return t3;
    }

    private PathShape createT4() {
        PathShape t4 = new PathShape(controller.getView());
        t4.setWidth(40);
        t4.setHeight(5);
        return t4;
    }

    private ArcShape createB1() {
        ArcShape b1 = new ArcShape(controller.getView());
        b1.setEllipseY(-20);
        b1.setWidth(40);
        b1.setHeight(20);
        b1.setEllipseWidth(b1.getWidth());
        b1.setEllipseHeight(b1.getHeight() * 2);
        b1.setStartAngle(180);
        b1.setArcAngle(180);
        return b1;
    }

    private ArcShape createB2() {
        ArcShape b2 = new ArcShape(controller.getView());
        b2.setWidth(40);
        b2.setHeight(10);
        b2.setEllipseWidth(b2.getWidth());
        b2.setEllipseHeight(b2.getHeight() * 2);
        b2.setStartAngle(180);
        b2.setArcAngle(180);
        b2.setEllipseY(-20 + b2.getHeight());
        return b2;
    }

    private ArcShape createB3() {
        ArcShape b3 = new ArcShape(controller.getView());
        b3.setWidth(40);
        b3.setHeight(5);
        b3.setEllipseWidth(b3.getWidth());
        b3.setEllipseHeight(b3.getHeight() * 2);
        b3.setStartAngle(180);
        b3.setArcAngle(180);
        b3.setEllipseY(-5);
        return b3;
    }

    private RectangleShape createM1() {
        RectangleShape m1 = new RectangleShape(controller.getView());
        m1.setWidth(40);
        m1.setHeight(1);
        return m1;
    }

    private RectangleShape createM2() {
        RectangleShape m2 = new RectangleShape(controller.getView());
        m2.setWidth(40);
        m2.setHeight(3);
        return m2;
    }

    private RectangleShape createM3() {
        RectangleShape m3 = new RectangleShape(controller.getView());
        m3.setWidth(40);
        m3.setHeight(5);
        return m3;
    }

    private PolygonShape createTriangleShape() {
        PolygonShape triangleShape = new PolygonShape(controller.getView());
        int[] xPoints = {0, 20, 0};
        int[] yPoints = {0, 5, 10};
        triangleShape.setPoints(xPoints, yPoints);
        return triangleShape;
    }

    private OvalShape createOvalShape() {
        OvalShape ovalShape = new OvalShape(controller.getView());
        ovalShape.setCenterX(20);
        ovalShape.setCenterY(15);
        ovalShape.setWidth(20);
        ovalShape.setHeight(10);
        //        ovalShape.setHaloScale(2.0);
        return ovalShape;
    }
}
