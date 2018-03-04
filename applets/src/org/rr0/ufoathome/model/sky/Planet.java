package org.rr0.ufoathome.model.sky;

class Planet extends CelestialBody {
    public double getRightAscension() {
        return currentAlpha;
    }

    public double getDeclination() {
        return currentDelta;
    }

    public Planet(String name, int id) {
        super(name, 0, 0, 0, 0, 0, 0, 0, 6, 6);
        this.name = name;
        this.id = id;
    }

    public void setTime(float time) {
        float f1 = (23.45229F - 0.0130125F * time - 1.64E-006F * time * time) + 5.03E-007F * time * time * time;
        f1 = (f1 / 360F - (float) (int) (f1 / 360F)) * 360F;
        f1 = (f1 * 3.141593F) / 180F;
        float f2 = 279.6967F + 36000.77F * time + 0.0003025F * time * time;
        f2 = (f2 / 360F - (float) (int) (f2 / 360F)) * 360F;
        f2 = (f2 * 3.141593F) / 180F;
        float f3 = (358.4758F + 35999.05F * time) - 0.00015F * time * time - 3.3E-006F * time * time * time;
        f3 = (f3 / 360F - (float) (int) (f3 / 360F)) * 360F;
        f3 = (f3 * 3.141593F) / 180F;
        float f6 = 0.01675104F - 4.18E-005F * time - 1.26E-007F * time * time;
        float f8 = f3;
        for (float f10 = 1.0F; f10 > (float) Math.pow(1.0D, -9D);) {
            f10 = ((f3 + f6 * (float) Math.sin(f8)) - f8) / (1.0F - f6 * (float) Math.cos(f8));
            f8 += f10;
        }

        float f12 = 2.0F * (float) Math.atan((float) Math.sqrt((1.0F + f6) / (1.0F - f6)) * (float) Math.tan(f8 / 2.0F));
        float f14 = 1F;
        float f15 = f14 * (1.0F - f6 * (float) Math.cos(f8));
        float f16 = (f2 + f12) - f3;

        if (id != MOON) {
            float f17 = 0.0F;
            float f20 = 0.0F;
            float f23 = 0.0F;
            float f25 = 0.0F;
            float f27 = 0.0F;
            float f29 = 0.0F;
            float f32 = 0.0F;
            float f35 = 0.0F;
            float f38 = 0.0F;
            if (id == SUN) {
                currentAlpha = (float) Math.atan2((float) Math.cos(f1) * (float) Math.sin(f16), (float) Math.cos(f16));
                currentDelta = (float) Math.asin((float) Math.sin(f1) * (float) Math.sin(f16));
            } else {
                switch (id) {
                    case MERCURY:
                        f2 = 178.1791F + 149474.1F * time + 0.0003011F * time * time;
                        f14 = 0.3870986F;
                        f6 = (0.2056142F + 2.046E-005F * time) - 3E-008F * time * time;
                        f23 = (7.002881F + 0.0018608F * time) - 1.83E-005F * time * time;
                        f25 = 28.75375F + 0.3702806F * time + 0.0001208F * time * time;
                        f27 = 47.14594F + 1.185208F * time + 0.0001739F * time * time;
                        break;

                    case VENUS:
                        f2 = 342.7671F + 58519.21F * time + 0.0003097F * time * time;
                        f14 = 0.7233316F;
                        f6 = (0.00682069F - 4.774E-005F * time) + 9.1E-008F * time * time;
                        f23 = (3.393631F + 0.0010058F * time) - 1E-006F * time * time;
                        f25 = (54.38419F + 0.5081861F * time) - 0.0013864F * time * time;
                        f27 = 75.77965F + 0.89985F * time + 0.00041F * time * time;
                        break;

                    case MARS:
                        f2 = 293.7373F + 19141.7F * time + 0.0003107F * time * time;
                        f14 = 1.523688F;
                        f6 = (0.0933129F + 9.2064E-005F * time) - 7.7E-008F * time * time;
                        f23 = (1.850333F - 0.000675F * time) + 1.26E-005F * time * time;
                        f25 = 285.4318F + 1.069767F * time + 0.0001313F * time * time + 4.14E-006F * time * time * time;
                        f27 = (48.78644F + 0.7709917F * time) - 1.4E-006F * time * time - 5.33E-006F * time * time * time;
                        break;

                    case JUPITER:
                        f2 = (238.0493F + 3036.302F * time + 0.0003347F * time * time) - 1.65E-006F * time * time * time;
                        f14 = 5.202561F;
                        f6 = (0.04833475F + 0.00016418F * time) - 4.676E-007F * time * time - 1.7E-009F * time * time * time;
                        f23 = (1.308736F - 0.0056961F * time) + 3.9E-006F * time * time;
                        f25 = 273.2776F + 0.5994317F * time + 0.00070405F * time * time + 5.08E-006F * time * time * time;
                        f27 = (99.44341F + 1.01053F * time + 0.00035222F * time * time) - 8.51E-006F * time * time * time;
                        break;

                    case SATURN:
                        f2 = (266.5644F + 1223.51F * time + 0.0003245F * time * time) - 5.8E-006F * time * time * time;
                        f14 = 9.554747F;
                        f6 = (0.05589232F - 0.0003455F * time - 7.28E-007F * time * time) + 7.4E-010F * time * time * time;
                        f23 = (2.492519F - 0.0039189F * time - 1.549E-005F * time * time) + 4E-008F * time * time * time;
                        f25 = 338.3078F + 1.085221F * time + 0.00097854F * time * time + 9.92E-006F * time * time * time;
                        f27 = (112.7904F + 0.8731951F * time) - 0.00015218F * time * time - 5.31E-006F * time * time * time;
                        break;

                    case URANUS:
                        f2 = (244.1975F + 429.8636F * time + 0.000316F * time * time) - 6E-007F * time * time * time;
                        f14 = 19.21814F;
                        f6 = (0.0463444F - 2.658E-005F * time) + 7.7E-008F * time * time;
                        f23 = 0.772464F + 0.0006253F * time + 3.95E-005F * time * time;
                        f25 = (98.07158F + 0.985765F * time) - 0.0010745F * time * time - 6.1E-007F * time * time * time;
                        f27 = 73.47711F + 0.4986678F * time + 0.0013117F * time * time;
                        break;

                    case NEPTUNE:
                        f2 = (84.45799F + 219.8859F * time + 0.0003205F * time * time) - 6E-007F * time * time * time;
                        f14 = 30.10957F;
                        f6 = (0.00899704F + 6.33E-006F * time) - 2E-009F * time * time;
                        f23 = 1.779242F - 0.0095436F * time - 9.1E-006F * time * time;
                        f25 = 276.046F + 0.3256394F * time + 0.00014095F * time * time + 4.113E-006F * time * time * time;
                        f27 = (130.6814F + 1.098935F * time + 0.00024987F * time * time) - 4.718E-006F * time * time * time;
                        break;

                }
                float f4 = f2 - f25 - f27;
                float f47 = 0.0F;
                float f49 = 0.0F;
                float f54 = 0.0F;
                float f58 = 0.0F;
                float f61 = 0.0F;
                float f62 = 0.0F;
                float f65 = 0.0F;
                float f66 = 0.0F;
                float f67 = 0.0F;
                float f68 = 0.0F;
                float f73 = 0.0F;
                float f78 = 0.0F;
                float f83 = 0.0F;

                switch (id) {
                    case JUPITER:
                        f47 = 0.1F + time / 5F;
                        float f50 = 237.475F + 3034.906F * time;
                        float f55 = 265.916F + 1222.114F * time;
                        float f59 = 5F * f55 - 2.0F * f50;
                        f61 = f55 - f50;
                        f50 = (f50 / 360F - (float) (int) (f50 / 360F)) * 360F;
                        f50 = (f50 * 3.141593F) / 180F;
                        f55 = (f55 / 360F - (float) (int) (f55 / 360F)) * 360F;
                        f55 = (f55 * 3.141593F) / 180F;
                        f59 = (f59 / 360F - (float) (int) (f59 / 360F)) * 360F;
                        f59 = (f59 * 3.141593F) / 180F;
                        f61 = (f61 / 360F - (float) (int) (f61 / 360F)) * 360F;
                        f61 = (f61 * 3.141593F) / 180F;
                        float f69 = ((0.3314F - 0.0103F * f47 - 0.0047F * f47 * f47) * (float) Math.sin(f59) + ((0.0032F - 0.0644F * f47) + 0.0021F * f47 * f47) * (float) Math.cos(f59) + 0.0136F * (float) Math.sin(f61) + 0.0185F * (float) Math.sin(2.0F * f61) + 0.0067F * (float) Math.sin(3F * f61) + ((0.0073F * (float) Math.sin(f61) + 0.0064F * (float) Math.sin(2.0F * f61)) - 0.0338F * (float) Math.cos(f61)) * (float) Math.sin(f55)) - (0.0357F * (float) Math.sin(f61) + 0.0063F * (float) Math.cos(f61) + 0.0067F * (float) Math.cos(2.0F * f61)) * (float) Math.cos(f55);
                        float f74 = ((361F + 13F * f47) * (float) Math.sin(f59) + (129F - 58F * f47) * (float) Math.cos(f59) + (128F * (float) Math.cos(f61) - 676F * (float) Math.sin(f61) - 111F * (float) Math.sin(2.0F * f61)) * (float) Math.sin(f55) + ((146F * (float) Math.sin(f61) - 82F) + 607F * (float) Math.cos(f61) + 99F * (float) Math.cos(2.0F * f61) + 51F * (float) Math.cos(3F * f61)) * (float) Math.cos(f55)) - (96F * (float) Math.sin(f61) + 100F * (float) Math.cos(f61)) * (float) Math.sin(2.0F * f55) - (96F * (float) Math.sin(f61) - 102F * (float) Math.cos(f61)) * (float) Math.cos(2.0F * f55);
                        float f79 = ((((0.0072F - 0.0031F * f47) * (float) Math.sin(f59) - 0.0204F * (float) Math.cos(f59)) + (0.0073F * (float) Math.sin(f61) + 0.034F * (float) Math.cos(f61) + 0.0056F * (float) Math.cos(2.0F * f61)) * (float) Math.sin(f55) + ((0.0378F * (float) Math.sin(f61) + 0.0062F * (float) Math.sin(2.0F * f61)) - 0.0066F * (float) Math.cos(f61)) * (float) Math.cos(f55)) - 0.0054F * (float) Math.sin(f61) * (float) Math.sin(2.0F * f55)) + 0.0055F * (float) Math.cos(f61) * (float) Math.cos(2.0F * f55);
                        float f84 = -263F * (float) Math.cos(f59) + 205F * (float) Math.cos(f61) + 693F * (float) Math.cos(2.0F * f61) + 312F * (float) Math.cos(3F * f61) + 299F * (float) Math.sin(f61) * (float) Math.sin(f55) + (204F * (float) Math.sin(2.0F * f61) - 337F * (float) Math.cos(f61)) * (float) Math.cos(f55);
                        f2 += f69;
                        f4 += f69 - f79 / f6;
                        f6 += f74 / 1000000F;
                        f14 += f84 / 1000000F;
                        break;

                    case SATURN:
                        f47 = 0.1F + time / 5F;
                        float f51 = 237.475F + 3034.906F * time;
                        float f56 = 265.916F + 1222.114F * time;
                        float f60 = 5F * f56 - 2.0F * f51;
                        f61 = f56 - f51;
                        f51 = (f51 / 360F - (float) (int) (f51 / 360F)) * 360F;
                        f51 = (f51 * 3.141593F) / 180F;
                        f56 = (f56 / 360F - (float) (int) (f56 / 360F)) * 360F;
                        f56 = (f56 * 3.141593F) / 180F;
                        f60 = (f60 / 360F - (float) (int) (f60 / 360F)) * 360F;
                        f60 = (f60 * 3.141593F) / 180F;
                        f61 = (f61 / 360F - (float) (int) (f61 / 360F)) * 360F;
                        f61 = (f61 * 3.141593F) / 180F;
                        float f70 = (((-0.8142F + 0.0181F * f47 + 0.0167F * f47 * f47) * (float) Math.sin(f60) + ((-0.0105F + 0.1609F * f47) - 0.0041F * f47 * f47) * (float) Math.cos(f60)) - 0.1488F * (float) Math.sin(f61) - 0.0408F * (float) Math.sin(2.0F * f61) - 0.0152F * (float) Math.sin(3F * f61)) + (0.0089F * (float) Math.sin(f61) - 0.0165F * (float) Math.sin(2.0F * f61)) * (float) Math.sin(f56) + (0.0813F * (float) Math.cos(f61) + 0.015F * (float) Math.cos(2.0F * f61)) * (float) Math.sin(f56) + (0.0856F * (float) Math.sin(f61) + 0.0253F * (float) Math.cos(f61) + 0.0144F * (float) Math.cos(2.0F * f61)) * (float) Math.cos(f56) + 0.0092F * (float) Math.sin(2.0F * f61) * (float) Math.sin(2.0F * f56);
                        float f75 = (((((-793F + 255F * f47) * (float) Math.sin(f60) + (1338F + 123F * f47) * (float) Math.cos(f60) + 1241F * (float) Math.sin(f56) + (39F - 62F * f47) * (float) Math.sin(f61) * (float) Math.sin(f56) + (2660F * (float) Math.cos(f61) - 469F * (float) Math.cos(2.0F * f61) - 187F * (float) Math.cos(3F * f61) - 82F * (float) Math.cos(4F * f61)) * (float) Math.sin(f56)) - (1270F * (float) Math.sin(f61) + 420F * (float) Math.sin(2.0F * f61) + 150F * (float) Math.sin(3F * f61)) * (float) Math.cos(f56) - 62F * (float) Math.sin(4F * f61) * (float) Math.cos(f56)) + (221F * (float) Math.sin(f61) - 221F * (float) Math.sin(2.0F * f61) - 57F * (float) Math.sin(3F * f61)) * (float) Math.sin(2.0F * f56)) - (278F * (float) Math.cos(f61) - 202F * (float) Math.cos(2.0F * f61)) * (float) Math.sin(2.0F * f56) - (284F * (float) Math.sin(f61) + 159F * (float) Math.cos(f61)) * (float) Math.cos(2.0F * f56)) + (216F * (float) Math.cos(2.0F * f61) + 56F * (float) Math.cos(3F * f61)) * (float) Math.cos(2.0F * f56);
                        float f80 = (((0.0771F + 0.0072F * f47) * (float) Math.sin(f60) + (0.0458F - 0.0148F * f47) * (float) Math.cos(f60)) - (0.0758F * (float) Math.sin(f61) + 0.0248F * (float) Math.sin(2.0F * f61) + 0.0086F * (float) Math.sin(3F * f61)) * (float) Math.sin(f56) - ((0.0726F + 0.1504F * (float) Math.cos(f61)) - 0.0269F * (float) Math.cos(2.0F * f61) - 0.0101F * (float) Math.cos(3F * f61)) * (float) Math.cos(f56) - (0.0136F * (float) Math.sin(f61) - 0.0136F * (float) Math.cos(2.0F * f61)) * (float) Math.sin(2.0F * f56) - (0.0137F * (float) Math.sin(f61) - 0.012F * (float) Math.sin(2.0F * f61)) * (float) Math.cos(2.0F * f56)) + (0.0149F * (float) Math.cos(f61) - 0.0131F * (float) Math.cos(2.0F * f61)) * (float) Math.cos(2.0F * f56);
                        float f85 = (((((2933F * (float) Math.cos(f60) + 33629F * (float) Math.cos(f61)) - 3081F * (float) Math.cos(2.0F * f61) - 1423F * (float) Math.cos(3F * f61) - 671F * (float) Math.cos(4F * f61)) + ((1098F - 2812F * (float) Math.sin(f61)) + 688F * (float) Math.sin(2.0F * f61)) * (float) Math.sin(f56) + (2138F * (float) Math.cos(f61) - 999F * (float) Math.cos(2.0F * f61) - 642F * (float) Math.cos(3F * f61)) * (float) Math.sin(f56)) - 890F * (float) Math.cos(f56)) + (2206F * (float) Math.sin(f61) - 1590F * (float) Math.sin(2.0F * f61) - 647F * (float) Math.sin(3F * f61)) * (float) Math.cos(f56) + (2885F * (float) Math.cos(f61) + 2172F * (float) Math.cos(2.0F * f61)) * (float) Math.cos(f56)) - 778F * (float) Math.cos(f61) * (float) Math.sin(2.0F * f56) - 856F * (float) Math.sin(f61) * (float) Math.cos(2.0F * f56);
                        f2 += f70;
                        f4 += f70 - f80 / f6;
                        f6 += f75 / 1000000F;
                        f14 += f85 / 1000000F;
                        break;

                    case URANUS:
                        f47 = 0.1F + time / 5F;
                        float f52 = 237.475F + 3034.906F * time;
                        float f57 = 265.916F + 1222.114F * time;
                        float f63 = 284.02F + 8.51F * time;
                        f65 = 243.52F + 428.47F * time;
                        f61 = f65 - f52;
                        f66 = f65 - f57;
                        f67 = 200.25F - 209.98F * time;
                        f52 = (f52 / 360F - (float) (int) (f52 / 360F)) * 360F;
                        f52 = (f52 * 3.141593F) / 180F;
                        f57 = (f57 / 360F - (float) (int) (f57 / 360F)) * 360F;
                        f57 = (f57 * 3.141593F) / 180F;
                        f63 = (f63 / 360F - (float) (int) (f63 / 360F)) * 360F;
                        f63 = (f63 * 3.141593F) / 180F;
                        f67 = (f67 / 360F - (float) (int) (f67 / 360F)) * 360F;
                        f67 = (f67 * 3.141593F) / 180F;
                        f65 = (f65 / 360F - (float) (int) (f65 / 360F)) * 360F;
                        f65 = (f65 * 3.141593F) / 180F;
                        f61 = (f61 / 360F - (float) (int) (f61 / 360F)) * 360F;
                        f61 = (f61 * 3.141593F) / 180F;
                        f66 = (f66 / 360F - (float) (int) (f66 / 360F)) * 360F;
                        f66 = (f66 * 3.141593F) / 180F;
                        float f71 = 0.8643F * (float) Math.sin(f63) + 0.036F * (float) Math.sin(2.0F * f63) + (0.0822F - 0.0068F * f47) * (float) Math.cos(f63);
                        float f76 = (2098F * (float) Math.cos(f63) - 335F * (float) Math.sin(f63)) + 131F * (float) Math.cos(2.0F * f63);
                        float f81 = 0.1203F * (float) Math.sin(f63) + 0.0195F * (float) Math.cos(f63) + 0.0062F * (float) Math.sin(2.0F * f63);
                        float f86 = -3825F * (float) Math.cos(f63);
                        f2 += f71;
                        f4 += f71 - f81 / f6;
                        f6 += f76 / 1000000F;
                        f14 += f86 / 1000000F;
                        break;

                    case NEPTUNE:
                        float f64 = 284.02F + 8.51F * time;
                        f67 = 200.25F - 209.98F * time;
                        f61 = 153.71F + 2816.42F * time;
                        f66 = 182.15F + 1003.62F * time;
                        f64 = (f64 / 360F - (float) (int) (f64 / 360F)) * 360F;
                        f64 = (f64 * 3.141593F) / 180F;
                        f67 = (f67 / 360F - (float) (int) (f67 / 360F)) * 360F;
                        f67 = (f67 * 3.141593F) / 180F;
                        f61 = (f61 / 360F - (float) (int) (f61 / 360F)) * 360F;
                        f61 = (f61 * 3.141593F) / 180F;
                        f66 = (f66 / 360F - (float) (int) (f66 / 360F)) * 360F;
                        f66 = (f66 * 3.141593F) / 180F;
                        float f72 = -0.5898F * (float) Math.sin(f64) - 0.0561F * (float) Math.cos(f64) - 0.0243F * (float) Math.sin(2.0F * f64);
                        float f77 = 439F * (float) Math.sin(f64) + 426F * (float) Math.cos(f64) + 113F * (float) Math.sin(2.0F * f64) + 109F * (float) Math.cos(2.0F * f64);
                        float f82 = 0.024F * (float) Math.sin(f64) - 0.0253F * (float) Math.cos(f64);
                        float f87 = -817F * (float) Math.sin(f64) + 8189F * (float) Math.cos(f64) + 781F * (float) Math.cos(2.0F * f64);
                        f2 += f72;
                        f4 += f72 - f82 / f6;
                        f6 += f77 / 1000000F;
                        f14 += f87 / 1000000F;
                        break;

                }
                f2 = (f2 / 360F - (float) (int) (f2 / 360F)) * 360F;
                f2 = (f2 * 3.141593F) / 180F;
                f23 = (f23 / 360F - (float) (int) (f23 / 360F)) * 360F;
                f23 = (f23 * 3.141593F) / 180F;
                f25 = (f25 / 360F - (float) (int) (f25 / 360F)) * 360F;
                f25 = (f25 * 3.141593F) / 180F;
                f27 = (f27 / 360F - (float) (int) (f27 / 360F)) * 360F;
                f27 = (f27 * 3.141593F) / 180F;
                f4 = (f4 / 360F - (float) (int) (f4 / 360F)) * 360F;
                f4 = (f4 * 3.141593F) / 180F;
                float f9 = f4;
                for (float f11 = 1.0F; (double) f11 > Math.pow(1.0D, -9D);) {
                    f11 = ((f4 + f6 * (float) Math.sin(f9)) - f9) / (1.0F - f6 * (float) Math.cos(f9));
                    f9 += f11;
                }

                float f13 = 2.0F * (float) Math.atan((float) Math.sqrt((1.0F + f6) / (1.0F - f6)) * (float) Math.tan(f9 / 2.0F));
                float f30 = f14 * (1.0F - f6 * (float) Math.cos(f9));
                float f33 = (f2 + f13) - f4 - f27;
                float f36 = f27 + (float) Math.atan2((float) Math.cos(f23) * (float) Math.sin(f33), (float) Math.cos(f33));
                float f39 = (float) Math.asin((float) Math.sin(f33) * (float) Math.sin(f23));
                if (id == URANUS) {
                    f36 += 0.01745329F * (((((0.0101F - 0.001F * f47) * (float) Math.sin(f65 + f66) - (0.0386F - 0.002F * f47) * (float) Math.cos(f65 + f66)) + (0.035F - 0.001F * f47) * (float) Math.cos(2.0F * f65 + f66)) - 0.0148F * (float) Math.sin(f61)) + 0.0099F * (float) Math.sin(f67) + 0.0088F * (float) Math.sin(2.0F * f67));
                    f30 = (((f30 - 0.02595F) + 0.00498F * (float) Math.cos(f61)) - 0.00123F * (float) Math.cos(f65)) + 0.00335F * (float) Math.cos(f66) + ((0.00579F * (float) Math.cos(f65) - 0.00116F * (float) Math.sin(f65)) + 0.00139F * (float) Math.cos(2.0F * f65)) * (float) Math.sin(f66) + (0.00135F * (float) Math.cos(f65) + 0.0057F * (float) Math.sin(f65) + 0.00139F * (float) Math.sin(2.0F * f65)) * (float) Math.cos(f66) + 0.0009F * (float) Math.cos(2.0F * f67) + 0.00089F * ((float) Math.cos(f67) - (float) Math.cos(3F * f67));
                }
                if (id == NEPTUNE) {
                    f36 += 0.01745329F * (0.0096F * (float) Math.sin(f61) + 0.0052F * (float) Math.sin(f66));
                    f30 = (f30 - 0.0406F) + 0.00499F * (float) Math.cos(f61) + 0.00274F * (float) Math.cos(f66) + 0.00204F * (float) Math.cos(f67) + 0.00105F * (float) Math.cos(2.0F * f67);
                }
                float f41 = f16 + (float) Math.atan2(f30 * (float) Math.cos(f39) * (float) Math.sin(f36 - f16), f30 * (float) Math.cos(f39) * (float) Math.cos(f36 - f16) + f15);
                float f43 = (float) Math.sqrt(f15 * f15 + f30 * f30 + 2.0F * f30 * f15 * (float) Math.cos(f39) * (float) Math.cos(f36 - f16));
                float f45 = (float) Math.asin((f30 / f43) * (float) Math.sin(f39));
                float f18 = (float) Math.atan2((float) Math.sin(f41) * (float) Math.cos(f1) - (float) Math.tan(f45) * (float) Math.sin(f1), (float) Math.cos(f41));
                float f21 = (float) Math.asin((float) Math.sin(f45) * (float) Math.cos(f1) + (float) Math.cos(f45) * (float) Math.sin(f1) * (float) Math.sin(f41));
                currentAlpha = f18;
                currentDelta = f21;
            }
        } else {
            float f19 = ((270.4342F + 481267.9F * time) - 0.001133F * time * time) + 1.9E-006F * time * time * time;
            float f5 = (358.4758F + 35999.05F * time) - 0.00015F * time * time - 3.3E-006F * time * time * time;
            float f22 = 296.1046F + 477198.8F * time + 0.009192F * time * time + 1.44E-005F * time * time * time;
            float f24 = ((350.7375F + 445267.1F * time) - 0.001436F * time * time) + 1.9E-006F * time * time * time;
            float f26 = (11.25089F + 483202F * time) - 0.003211F * time * time - 3E-007F * time * time * time;
            float f28 = (259.1833F - 1934.142F * time) + 0.002078F * time * time + 2.2E-006F * time * time * time;
            f19 = (f19 / 360F - (float) (int) (f19 / 360F)) * 360F;
            f5 = (f5 / 360F - (float) (int) (f5 / 360F)) * 360F;
            f22 = (f22 / 360F - (float) (int) (f22 / 360F)) * 360F;
            f24 = (f24 / 360F - (float) (int) (f24 / 360F)) * 360F;
            f26 = (f26 / 360F - (float) (int) (f26 / 360F)) * 360F;
            f28 = (f28 / 360F - (float) (int) (f28 / 360F)) * 360F;
            f28 = (f28 * 3.141593F) / 180F;
            f19 += 0.000233F * (float) Math.sin(((51.200000000000003D + 20.199999999999999D * (double) time) * 3.1415927410125732D) / 180D);
            f5 += -0.001778F * (float) Math.sin(((51.200000000000003D + 20.199999999999999D * (double) time) * 3.1415927410125732D) / 180D);
            f22 += 0.000817F * (float) Math.sin(((51.200000000000003D + 20.199999999999999D * (double) time) * 3.1415927410125732D) / 180D);
            f24 += 0.002011F * (float) Math.sin(((51.200000000000003D + 20.199999999999999D * (double) time) * 3.1415927410125732D) / 180D);
            float f46 = 0.003964F * (float) Math.sin((((346.56F + 132.87F * time) - 0.0091731F * time * time) * 3.141593F) / 180F);
            f19 += f46;
            f22 += f46;
            f24 += f46;
            f26 += f46;
            f19 += 0.001964F * (float) Math.sin(f28);
            f22 += 0.002541F * (float) Math.sin(f28);
            f24 += 0.001964F * (float) Math.sin(f28);
            f26 += -0.024691F * (float) Math.sin(f28);
            f26 += -0.004328F * (float) Math.sin((double) f28 + ((275.05000000000001D - 2.2999999999999998D * (double) time) * 3.1415927410125732D) / 180D);
            f22 = (f22 * 3.141593F) / 180F;
            f5 = (f5 * 3.141593F) / 180F;
            f24 = (f24 * 3.141593F) / 180F;
            f26 = (f26 * 3.141593F) / 180F;
            float f7 = 1.0F - 0.002495F * time - 7.52E-006F * time * time;
            float f31 = ((((((((((((((((((f19 + 6.28875F * (float) Math.sin(f22) + 1.274018F * (float) Math.sin(2.0F * f24 - f22) + 0.658309F * (float) Math.sin(2.0F * f24) + 0.213616F * (float) Math.sin(2.0F * f22)) - 0.185596F * (float) Math.sin(f5) * f7 - 0.114336F * (float) Math.sin(2.0F * f26)) + 0.058793F * (float) Math.sin(2.0F * f24 - 2.0F * f22) + 0.057212F * (float) Math.sin(2.0F * f24 - f5 - f22) * f7 + 0.05332F * (float) Math.sin(2.0F * f24 + f22) + 0.045874F * (float) Math.sin(2.0F * f24 - f5) * f7 + 0.041024F * (float) Math.sin(f22 - f5) * f7) - 0.034718F * (float) Math.sin(f24) - 0.030465F * (float) Math.sin(f5 + f22) * f7) + 0.015326F * (float) Math.sin(2.0F * f24 - 2.0F * f26)) - 0.012528F * (float) Math.sin(2.0F * f26 + f22) - 0.01098F * (float) Math.sin(2.0F * f26 - f22)) + 0.010674F * (float) Math.sin(4F * f24 - f22) + 0.010034F * (float) Math.sin(3F * f22) + 0.008548F * (float) Math.sin(4F * f24 - 2.0F * f22)) - 0.00791F * (float) Math.sin((f5 - f22) + 2.0F * f24) * f7 - 0.006783F * (float) Math.sin(2.0F * f24 + f5) * f7) + 0.005162F * (float) Math.sin(f22 - f24) + 0.005F * (float) Math.sin(f5 + f24) * f7 + 0.004049F * (float) Math.sin((f22 - f5) + 2.0F * f24) * f7 + 0.003996F * (float) Math.sin(2.0F * f22 + 2.0F * f24) + 0.003862F * (float) Math.sin(4F * f24) + 0.003665F * (float) Math.sin(2.0F * f24 - 3F * f22) + 0.002695F * (float) Math.sin(2.0F * f22 - f5) * f7 + 0.002602F * (float) Math.sin(f22 - 2.0F * f26 - 2.0F * f24) + 0.002396F * (float) Math.sin(2.0F * f24 - f5 - 2.0F * f22) * f7) - 0.002349F * (float) Math.sin(f22 + f24)) + 0.002249F * (float) Math.sin(2.0F * f24 - 2.0F * f5) * f7 * f7) - 0.002125F * (float) Math.sin(2.0F * f22 + f5) * f7 - 0.002079F * (float) Math.sin(2.0F * f5) * f7 * f7) + 0.002059F * (float) Math.sin(2.0F * f24 - f22 - 2.0F * f5) * f7 * f7) - 0.001773F * (float) Math.sin((f22 + 2.0F * f24) - 2.0F * f26) - 0.001595F * (float) Math.sin(2.0F * f26 + 2.0F * f24)) + 0.00122F * (float) Math.sin(4F * f24 - f5 - f22) * f7) - 0.00111F * (float) Math.sin(2.0F * f22 + 2.0F * f26)) + 0.000892F * (float) Math.sin(f22 - 3F * f24)) - 0.000811F * (float) Math.sin(f5 + f22 + 2.0F * f24) * f7) + 0.000761F * (float) Math.sin(4F * f24 - f5 - 2.0F * f22) * f7 + 0.000717F * (float) Math.sin(f22 - 2.0F * f5) * f7 * f7 + 0.000704F * (float) Math.sin(f22 - 2.0F * f5 - 2.0F * f24) * f7 * f7 + 0.000693F * (float) Math.sin((f5 - 2.0F * f22) + 2.0F * f24) * f7 + 0.000598F * (float) Math.sin(2.0F * f24 - f5 - 2.0F * f26) * f7 + 0.00055F * (float) Math.sin(f22 + 4F * f24) + 0.000538F * (float) Math.sin(4F * f22) + 0.000521F * (float) Math.sin(4F * f24 - f5) * f7 + 0.000486F * (float) Math.sin(2.0F * f22 - f24);
            f31 = (f31 * 3.141593F) / 180F;
            float f34 = (((((((5.128189F * (float) Math.sin(f26) + 0.280606F * (float) Math.sin(f22 + f26) + 0.277693F * (float) Math.sin(f22 - f26) + 0.173238F * (float) Math.sin(2.0F * f24 - f26) + 0.055413F * (float) Math.sin((2.0F * f24 + f26) - f22) + 0.046272F * (float) Math.sin(2.0F * f24 - f26 - f22) + 0.032573F * (float) Math.sin(2.0F * f24 + f26) + 0.017198F * (float) Math.sin(2.0F * f22 + f26) + 0.009267F * (float) Math.sin((2.0F * f24 + f22) - f26) + 0.008823F * (float) Math.sin(2.0F * f22 - f26) + 0.008247F * (float) Math.sin(2.0F * f24 - f5 - f26) * f7 + 0.004323F * (float) Math.sin(2.0F * f24 - f26 - 2.0F * f22) + 0.0042F * (float) Math.sin(2.0F * f24 + f26 + f22) + 0.003372F * (float) Math.sin(f26 - f5 - 2.0F * f24) * f7 + 0.002472F * (float) Math.sin((2.0F * f24 + f26) - f5 - f22) * f7 + 0.002222F * (float) Math.sin((2.0F * f24 + f26) - f5) * f7 + 0.002072F * (float) Math.sin(2.0F * f24 - f26 - f5 - f22) * f7 + 0.001877F * (float) Math.sin((f26 - f5) + f22) * f7 + 0.001828F * (float) Math.sin(4F * f24 - f26 - f22)) - 0.001803F * (float) Math.sin(f26 + f5) * f7 - 0.00175F * (float) Math.sin(3F * f26)) + 0.00157F * (float) Math.sin(f22 - f5 - f26) * f7) - 0.001487F * (float) Math.sin(f26 + f24) - 0.001481F * (float) Math.sin(f26 + f5 + f22) * f7) + 0.001417F * (float) Math.sin(f26 - f5 - f22) * f7 + 0.00135F * (float) Math.sin(f26 - f5) * f7 + 0.00133F * (float) Math.sin(f26 - f24) + 0.001106F * (float) Math.sin(f26 + 3F * f22) + 0.00102F * (float) Math.sin(4F * f24 - f26) + 0.000833F * (float) Math.sin((f26 + 4F * f24) - f22) + 0.000781F * (float) Math.sin(f22 - 3F * f26) + 0.00067F * (float) Math.sin((f26 + 4F * f24) - 2.0F * f22) + 0.000606F * (float) Math.sin(2.0F * f24 - 3F * f26) + 0.000597F * (float) Math.sin((2.0F * f24 + 2.0F * f22) - f26) + 0.000492F * (float) Math.sin((2.0F * f24 + f22) - f5 - f26) * f7 + 0.00045F * (float) Math.sin(2.0F * f22 - f26 - 2.0F * f24) + 0.000439F * (float) Math.sin(3F * f22 - f26) + 0.000423F * (float) Math.sin(f26 + 2.0F * f24 + 2.0F * f22) + 0.000422F * (float) Math.sin(2.0F * f24 - f26 - 3F * f22)) - 0.000367F * (float) Math.sin((f5 + f26 + 2.0F * f24) - f22) * f7 - 0.000353F * (float) Math.sin(f5 + f26 + 2.0F * f24) * f7) + 0.000331F * (float) Math.sin(f26 + 4F * f24) + 0.000317F * (float) Math.sin(((2.0F * f24 + f26) - f5) + f22) * f7 + 0.000306F * (float) Math.sin(2.0F * f24 - 2.0F * f5 - f26) * f7 * f7) - 0.000283F * (float) Math.sin(f22 + 3F * f26);
            float f37 = 0.0004664F * (float) Math.cos(f28);
            float f40 = 7.54E-005F * (float) Math.cos((double) f28 + ((275.05000000000001D - 2.2999999999999998D * (double) time) * 3.1415927410125732D) / 180D);
            float f42 = f34 * (1.0F - f37 - f40);
            f42 = (f42 * 3.141593F) / 180F;
            float f44 = ((((((((((((0.950724F + 0.051818F * (float) Math.cos(f22) + 0.009531F * (float) Math.cos(2.0F * f24 - f22) + 0.007843F * (float) Math.cos(2.0F * f24) + 0.002824F * (float) Math.cos(2.0F * f22) + 0.000857F * (float) Math.cos(2.0F * f24 + f22) + 0.000533F * (float) Math.cos(2.0F * f24 - f5) * f7 + 0.000401F * (float) Math.cos(2.0F * f24 - f5 - f22) * f7 + 0.00032F * (float) Math.cos(f22 - f5) * f7) - 0.000271F * (float) Math.cos(f24) - 0.000264F * (float) Math.cos(f5 + f22) * f7 - 0.000198F * (float) Math.cos(2.0F * f26 - f22)) + 0.000173F * (float) Math.cos(3F * f22) + 0.000167F * (float) Math.cos(4F * f24 - f22)) - 0.000111F * (float) Math.cos(f5) * f7) + 0.000103F * (float) Math.cos(4F * f24 - 2.0F * f22)) - 8.4E-005F * (float) Math.cos(2.0F * f22 - 2.0F * f24) - 8.3E-005F * (float) Math.cos(2.0F * f24 + f5) * f7) + 7.9E-005F * (float) Math.cos(2.0F * f24 + 2.0F * f22) + 7.2E-005F * (float) Math.cos(4F * f24) + 6.4E-005F * (float) Math.cos((2.0F * f24 - f5) + f22) * f7) - 6.3E-005F * (float) Math.cos((2.0F * f24 + f5) - f22) * f7) + 4.1E-005F * (float) Math.cos(f5 + f24) * f7 + 3.5E-005F * (float) Math.cos(2.0F * f22 - f5) * f7) - 3.3E-005F * (float) Math.cos(3F * f22 - 2.0F * f24) - 3E-005F * (float) Math.cos(f22 + f24) - 2.9E-005F * (float) Math.cos(2.0F * f26 - 2.0F * f24) - 2.9E-005F * (float) Math.cos(2.0F * f22 + f5) * f7) + 2.6E-005F * (float) Math.cos(2.0F * f24 - 2.0F * f5) * f7 * f7) - 2.3E-005F * (float) Math.cos((2.0F * f26 - 2.0F * f24) + f22)) + 1.9E-005F * (float) Math.cos(4F * f24 - f5 - f22) * f7;
            f44 = (f44 * 3.141593F) / 180F;
            currentAlpha = (float) Math.atan2((float) Math.sin(f31) * (float) Math.cos(f1) - (float) Math.tan(f42) * (float) Math.sin(f1), (float) Math.cos(f31));
            currentDelta = (float) Math.asin((float) Math.sin(f42) * (float) Math.cos(f1) + (float) Math.cos(f42) * (float) Math.sin(f1) * (float) Math.sin(f31));
            float f48 = ((float) Math.acos((float) Math.cos(f31 - f16) * (float) Math.cos(f42)) * 180F) / 3.141593F;
            float f53 = 180F - f48 - (0.1468F * (float) Math.sin((f48 * Math.PI) / 180F) * (1.0F - 0.0549F * (float) Math.sin(f22))) / (1.0F - 0.0167F * (float) Math.sin(f5));
            illu = (1.0F + (float) Math.cos((f53 * Math.PI) / 180F)) / 2.0F;
        }
        switch (id) {
            case SUN:
                magnitude = -27F;
                break;

            case MOON:
                if ((double) illu > 0.01D)
                    magnitude = -12F;
                else
                    magnitude = 10F;
                break;

            case MERCURY:
                magnitude = 0.2F;
                break;

            case VENUS:
                magnitude = -3.9F;
                break;

            case MARS:
                magnitude = -4.4F;
                break;

            case JUPITER:
                magnitude = -2.1F;
                break;

            case SATURN:
                magnitude = 1.1F;
                break;

            case URANUS:
                magnitude = 6F;
                break;

            case NEPTUNE:
                magnitude = 7.8F;
                break;

            default:
                break;
        }
        vect = new double[3];
        vect[0] = Math.cos(currentDelta) * Math.cos(currentAlpha);
        vect[1] = Math.cos(currentDelta) * Math.sin(currentAlpha);
        vect[2] = Math.sin(currentDelta);
    }

    public float magnitude;
    public int id;
    public static final int SUN = 0;
    public static final int MOON = 1;
    public static final int MERCURY = 2;
    public static final int VENUS = 3;
    public static final int MARS = 4;
    public static final int JUPITER = 5;
    public static final int SATURN = 6;
    public static final int URANUS = 7;
    public static final int NEPTUNE = 8;
    public float illu;
    private String name;

    public String getName() {
        return name;
    }

    public double getMagnitudeMax() {
        return magnitude;
    }
}
