/* 
 * Copyright (C) 2019 B3Partners B.V.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/* global ol, Ext */

Ext.define("viewer.viewercontroller.ol.OlVectorLayer", {
    extend: "viewer.viewercontroller.controller.VectorLayer",
    mixins: {
        olLayer: "viewer.viewercontroller.ol.OlLayer"
    },
    draw: null,
    point: null,
    line: null,
    polygon: null,
    circle: null,
    source: null,
    box: null,
    tempFeature: null,
    tempStyle: null,
    idNumber: 0,
    rotation: 0,
    drawRightAngle: false,
    freehand: null,
    drawFeatureControls: null,
    activeDrawFeatureControl: null,
    modifyFeature: null,
    constructor: function (config) {
        var me = this;
        config.colorPrefix = '#';
        viewer.viewercontroller.ol.OlVectorLayer.superclass.constructor.call(this, config);
        this.mixins.olLayer.constructor.call(this, config);

        this.defaultFeatureStyle = config.defaultFeatureStyle || this.mapStyleConfigToFeatureStyle();
        this.drawBox = new ol.interaction.DragBox({
            condition: ol.events.condition.noModifierKeys,
            style: new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: [0, 0, 255, 1]
                })
            })
        });
        this.maps = this.config.viewerController.mapComponent.getMap().getFrameworkMap();
        var index = this.config.viewerController.mapComponent.getMap().getFrameworkMap().getLayers().getLength() + 1;
        this.source = new ol.source.Vector();

        var selectFill = new ol.style.Fill({
            color: '#42FF00'
        });
        var selectStroke = new ol.style.Stroke({
            color: '#42FF00',
            width: 8
        });
        this.selectStyle = new ol.style.Style({
            image: new ol.style.Circle({
                fill: selectFill,
                stroke: selectStroke,
                radius: 6
            }),
            fill: selectFill,
            stroke: selectStroke
        });

        this.frameworkLayer = new ol.layer.Vector({
            zIndex: index,
            source: this.source
        });

        this.select = new ol.interaction.Select({
            layers: [this.frameworkLayer]
        });

        this.modify = new ol.interaction.Modify({
            features: this.select.getFeatures()
        });

        this.translate = new ol.interaction.Translate({
            features: this.select.getFeatures()
        });

        this.select.getFeatures().on('add', function (args) {
            me.activeFeatureChanged(args);
        }, me);
        this.source.on('addfeature', function (args) {
            me.featureAdded(args);
        }, me);
        this.modify.on('modifyend', function (args) {
            me.featureModified(args);
        }, me);
        this.drawBox.on('boxend', function (evt) {
            var geom = evt.target.getGeometry();
            var feat = new ol.Feature({geometry: geom});
            this.source.addFeature(feat);
            this.drawBox.setActive(false);
        }, this);

        this.maps.addInteraction(this.drawBox);
        this.maps.addInteraction(this.select);
        this.maps.addInteraction(this.modify);
        this.maps.addInteraction(this.translate);
        this.translate.setActive(false);
        this.select.setActive(false);
        this.drawBox.setActive(false);
        
        this.point = new ol.interaction.Draw({type: "Point",
            source: this.source,
            freehand: false
        });
        this.maps.addInteraction(this.point);
        this.point.setActive(false);
        
        this.line = new ol.interaction.Draw({type: "LineString",
            source: this.source,
            freehand: false
        });
        this.maps.addInteraction(this.line);
        this.line.setActive(false);
        
        this.polygon = new ol.interaction.Draw({type: "Polygon",
            source: this.source,
            freehand: false,
            geometryFunction: function (coords, geom){
                if (!geom) {
                    geom = new ol.geom.Polygon(coords);
                    return geom;
                } else if(coords[0].length >= 3) {
                    if (me.drawRightAngle) {
                        //Dit is het punt van de muis
                        var newPoint = coords[0][coords[0].length-1];
                        // dit is het punt waar de haakse hoek op gemaakt wordt
                        var center = coords[0][coords[0].length-2];
                        // dit is 2 punten terug, deze is nodig om de vorige lijn te maken
                        var preproccesorOfCenter = coords[0][coords[0].length-3]
                        var line = new ol.geom.LineString([center, newPoint]);
                        var radius = line.getLength();
                        // Hoek van de lijn berekenen die gemaakt wordt met de muis (deze veranderd dus telkens als je de muist beweegt)
                        var delta_x = newPoint[0] - center[0];
                        var delta_y = newPoint[1] - center[1];
                        var angleOfTempLineDegrees = (Math.atan2(delta_y, delta_x)) * 180 / Math.PI;
                        // Hoek van de getekende lijn berekenen
                        delta_x = center[0] - preproccesorOfCenter[0];
                        delta_y = center[1] - preproccesorOfCenter[1];
                        var corAngleRadians = Math.atan2(delta_y, delta_x);
                        var corAngleDegrees = corAngleRadians * 180/Math.PI;

                        // doe een correctie op de hoek (de cirkel loopt vanb 0 tot 180 en -180 tot 0
                        if (angleOfTempLineDegrees > -180 && angleOfTempLineDegrees < 0) {
                            angleOfTempLineDegrees += 360;
                        }
                        if (corAngleDegrees > -180 && corAngleDegrees < 0) {
                            corAngleDegrees += 360;
                        }
                        // bereken welke kant de haakse hoek op moet
                        var rightOrLeftAngle;
                        if (corAngleDegrees <= 180) {
                            if (angleOfTempLineDegrees >= corAngleDegrees && angleOfTempLineDegrees <= corAngleDegrees + 180 ) {
                                rightOrLeftAngle = 90
                            } else {
                                rightOrLeftAngle = -90;
                            }
                        } else {
                            if (angleOfTempLineDegrees <= corAngleDegrees && angleOfTempLineDegrees >= corAngleDegrees - 180 ) {
                                rightOrLeftAngle = -90
                            } else {
                                rightOrLeftAngle = 90;
                            }
                        }
                        // bereken het nieuwe punt
                        var newX  = Math.cos((rightOrLeftAngle * Math.PI / 180) + corAngleRadians) * radius + center[0];
                        var newY  = Math.sin((rightOrLeftAngle * Math.PI / 180) + corAngleRadians) * radius + center[1];
                        coords[0][coords[0].length-1] = [newX,newY];
                    }
                    geom.setCoordinates(coords);
                    return geom;
                }

            }
        });
        this.maps.addInteraction(this.polygon);
        this.polygon.setActive(false);
        
        this.circle = new ol.interaction.Draw({type: "Circle",
            source: this.source,
            freehand: false
        });
        this.maps.addInteraction(this.circle);
        this.circle.setActive(false);
        
        this.box = new ol.interaction.Draw({type: "Box",
            source: this.source,
            freehand: true
        });
        this.maps.addInteraction(this.box);
        this.box.setActive(false);
        
        this.freehand = new ol.interaction.Draw({type: "Freehand",
            source: this.source,
            freehand: true
        });
        this.maps.addInteraction(this.freehand);
        this.freehand.setActive(false);
        
        this.point.on('drawend', function (evt) {
            me.select.setActive(true);
            evt.feature.setId("OpenLayers_Feature_Vector_" + me.idNumber);
            me.idNumber++;
            me.stopDrawing();
        }, this);
        
        this.line.on('drawend', function (evt) {
            me.select.setActive(true);
            evt.feature.setId("OpenLayers_Feature_Vector_" + me.idNumber);
            me.idNumber++;
            me.stopDrawing();
        }, this);
        var keyDownListener = this.keyDown.bind(this);
        var keyUpListener = this.keyUp.bind(this);
        this.polygon.on('drawend', function (evt) {
            document.removeEventListener("keydown", keyDownListener, true);
            document.removeEventListener("keyup", keyUpListener, true);
            var coords  = evt.feature.getGeometry().getCoordinates();
            coords[0].push(coords[0][0]);
            evt.feature.getGeometry().setCoordinates(coords);
            me.select.setActive(true);
            evt.feature.setId("OpenLayers_Feature_Vector_" + me.idNumber);
            me.idNumber++;
            me.stopDrawing();
        }, this);
        this.polygon.on('drawstart', function (evt) {
            // add key listeners
            document.addEventListener("keydown", keyDownListener, true);
            document.addEventListener("keyup", keyUpListener, true);
        }, this);

        this.polygon.on('change', function (evt) {
            console.log(evt);
        }, this);

        this.circle.on('drawend', function (evt) {
            me.select.setActive(true);
            evt.feature.setId("OpenLayers_Feature_Vector_" + me.idNumber);
            me.idNumber++;
            me.stopDrawing();
        }, this);
        
        this.box.on('drawend', function (evt) {
            me.select.setActive(true);
            evt.feature.setId("OpenLayers_Feature_Vector_" + me.idNumber);
            me.idNumber++;
            me.stopDrawing();
        }, this);
        
        this.freehand.on('drawend', function (evt) {
            me.select.setActive(true);
            evt.feature.setId("OpenLayers_Feature_Vector_" + me.idNumber);
            me.idNumber++;
            me.stopDrawing();
        }, this);
        
        this.type = viewer.viewercontroller.controller.Layer.VECTOR_TYPE;
        
    },

    getCurrtentStyle: function () {
        var color = ol.color.asArray(this.defaultFeatureStyle.config['fillColor']);
        var colorFinal = 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',' + '0.5' + ')';

        var featureFill = new ol.style.Fill({
            color: colorFinal
        });
        var featureStroke = new ol.style.Stroke({
            color: colorFinal,
            width: 3,
            opacity: 0.5
        });
        var featureStyle = new ol.style.Style({
            image: new ol.style.Circle({
                fill: featureFill,
                stroke: featureStroke,
                radius: 5
            }),
            fill: featureFill,
            stroke: featureStroke
        });
        return featureStyle;
    },

    mapStyleConfigToFeatureStyle: function () {
        var featureStyle = {
            fillColor: this.colorPrefix + ('FF0000'),
            fillOpacity: (this.getStyleConfig('fillopacity') || 100) / 100,
            strokeColor: this.colorPrefix + ('FF0000'),
            strokeOpacity: (this.getStyleConfig('strokeopacity') || 100) / 100
        };
        return Ext.create('viewer.viewercontroller.controller.FeatureStyle', featureStyle);
    },

    getStyleConfig: function (property) {
        if (!this.style || !this.style.hasOwnProperty(property)) {
            return  "";
        }
        return this.style[property];
    },

    removeAllFeatures: function () {
        this.select.getFeatures().clear();
        this.source.clear();
        this.maps.removeInteraction(this.draw);
        this.drawBox.setActive(false);
        this.stopDrawing();
        this.setTranslate(false);
    },
    removeFeature: function (feature) {
        var olFeature = this.source.getFeatureById(feature.getId());
        this.select.getFeatures().clear();
        this.source.removeFeature(olFeature);
    },
    getFeature: function (id) {
        Ext.Error.raise({msg: "VectorLayer.getFeature() Not implemented! Must be implemented in sub-class"});
    },
    getFeatureById: function (featureId) {
        return this.fromOpenLayersFeature(this.source.getFeatureById(featureId));
    },
    getAllFeatures: function () {
        var olFeatures = this.source.getFeatures();
        var features = new Array();
        for (var i = 0; i < olFeatures.length; i++) {
            var olFeature = olFeatures[i];
            var feature = this.fromOpenLayersFeature(olFeature);
            features.push(feature);
        }
        return features;
    },

    getActiveFeature: function () {
        var olFeature = this.select.getFeatures().item(0);
        if (olFeature) {
            var feature = this.fromOpenLayersFeature(olFeature);
            return feature;
        } else {
            return null;
        }
    },

    addFeature: function (feature) {
        var features = new Array();
        features.push(feature);
        this.addFeatures(features);

    },
    addFeatures: function (features) {
        var olFeatures = new Array();
        for (var i = 0; i < features.length; i++) {
            var feature = features[i];
            var olFeature = this.toOpenLayersFeature(feature);
            olFeatures.push(olFeature);

            if (feature.config.label) {
                olFeature.getStyle().setText(new ol.style.Text({text: feature.config.label}));
            }
            // check if a colour was specified on the feature and set that for drawing
            if (feature.config.color) {
                olFeature.getStyle().getStroke().setColor(this.colorPrefix + feature.config.color);
                var color = ol.color.asArray(this.colorPrefix + feature.config.color);
                color = color.slice();
                color[3] = 0.2;
                olFeature.getStyle().getFill().setColor(color);
            }
        }
        return this.source.addFeatures(olFeatures);
    },
    setLabel: function (id, label) {
        var olFeature = this.source.getFeatureById(id);
        if (olFeature && olFeature.getStyle().getText()) {
            if (label) {
                olFeature.getStyle().getText().setText(label);
            } else {
                olFeature.getStyle().getText().setText('');
            }
            olFeature.setStyle(olFeature.getStyle());
        }
        
        
        this.frameworkLayer.getSource().refresh();
    },
    /**
     ** Note: subclasses should call this method to add the keylistener.
     * @param {String} type geometry type to draw
     *
     */
    drawFeature: function (type) {
        var me = this;
        this.drawBox.setActive(false);
        this.select.setActive(false);
        this.stopDrawing();
        this.type = type;
        this.superclass.drawFeature.call(this, type);
        if (type === "Point") {
            this.point.setActive(true);
        } else if (type === "LineString") {
            this.line.setActive(true);
        } else if (type === "Polygon") {
            this.polygon.setActive(true);
        } else if (type === "Circle") {
            this.circle.setActive(true);
        } else if (type === "Box") {
            this.box.setActive(true);
        } else if (type === "Freehand") {
            this.freehand.setActive(true);
        } else {
            this.config.viewerController.logger.warning("Feature type >" + type + "< not implemented!");
        }
    },

    stopDrawing: function () {
        // remove the previously added key listener
        this.superclass.stopDrawing.call(this);

        if (this.point.getActive()) {
            this.point.setActive(false);
        }
        if (this.line.getActive()) {
            this.line.setActive(false);
        }
        if (this.polygon.getActive()) {
            this.polygon.setActive(false);
        }
        if (this.circle.getActive()) {
            this.circle.setActive(false);
        }
        if (this.box.getActive()) {
            this.box.setActive(false);
        }
        if (this.freehand.getActive()) {
            this.freehand.setActive(false);
        }

    },

    /** handle CTRL-Z key when drawing. */
    undoSketch: function () {
        Ext.Error.raise({msg: "VectorLayer.undoSketch() Not implemented! Must be implemented in sub-class"});
    },
    /** handle CTRL-Y key when drawing. */
    redoSketch: function () {
        Ext.Error.raise({msg: "VectorLayer.redoSketch() Not implemented! Must be implemented in sub-class"});
    },
    /** handle ESC key when drawing. */
    cancelSketch: function () {
        Ext.Error.raise({msg: "VectorLayer.cancelSketch() Not implemented! Must be implemented in sub-class"});
    },
    bringToFront: function () {
        this.frameworkLayer.setZIndex(99);
    },

    /**
     * Helper function: Converts the given OpenLayers Feature to the generic feature.
     * @param openLayersFeature The OpenLayersFeature to be converted
     * @return The generic feature
     */
    fromOpenLayersFeature: function (openLayersFeature) {
        if (!openLayersFeature) {
            return null;
        }
        var wktFormat = new ol.format.WKT();
        var wkt = null;

        if (openLayersFeature.getGeometry().getType() === 'Circle') {
            wkt = wktFormat.writeGeometry(ol.geom.Polygon.fromCircle(openLayersFeature.getGeometry()));
        } else {
            wkt = wktFormat.writeGeometry(openLayersFeature.getGeometry());
        }

        var feature = new viewer.viewercontroller.controller.Feature(
                {
                    id: openLayersFeature.getId(),
                    wktgeom: wkt
                });
        if (openLayersFeature.getStyle()) {
            if (openLayersFeature.getStyle().getText()) {
                feature.label = openLayersFeature.getStyle().getText().getText();
            }
            var color = openLayersFeature.getStyle().getFill().getColor();
            if (color.indexOf("#") !== -1) {
                color = color.substring(color.indexOf("#") + 1, color.length);
            }
            feature.color = color;
        }
        feature.style = this.frameworkStyleToFeatureStyle(openLayersFeature).getProperties();
        if (this.config.addAttributesToFeature) {
            feature.attributes = openLayersFeature.attributes;
        }
        return feature;
    },

    toOpenLayersFeature: function (feature) {
        var wktFormat = new ol.format.WKT();
        var geom = wktFormat.readGeometry(feature.config.wktgeom);
        var style = this.getCurrentStyleHash();
        style.label = feature.config.label;

        var olStyle = this.toOpenLayersStyle(style);

        var olFeature = new ol.Feature();
        olFeature.setGeometry(geom);

        olFeature.setId(feature.config.id);
        olFeature.setStyle(olStyle);
        return olFeature;
    },

    toOpenLayersStyle: function (featureStyle) {
        var strokeStyle = null;
        var fillStyle = null;
        var imageStyle = null;
        if (featureStyle.strokeColor) {
            var opacity = featureStyle.strokeOpacity || 0.5;
            var width = featureStyle.strokeWidth || 3;
            var color = ol.color.asArray(featureStyle.strokeColor);
            var colorFinal = 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',' + opacity + ')';
            strokeStyle = new ol.style.Stroke({
                color: colorFinal,
                width: width

            });
        }

        if (featureStyle.fillColor) {
            var opacity = featureStyle.fillOpacity || 0.5;
            var color = ol.color.asArray(featureStyle.fillColor);
            var colorFinal = 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',' + opacity + ')';
            fillStyle = new ol.style.Fill({
                color: colorFinal
            });
        }
        if (strokeStyle && fillStyle) {
            var pointRadius = featureStyle.pointRadius || 6;
            imageStyle = new ol.style.Circle({
                fill: fillStyle,
                stroke: strokeStyle,
                radius: pointRadius
            });
        }

        var style = new ol.style.Style({
            stroke: strokeStyle,
            fill: fillStyle,
            image: imageStyle
        });

        return style;
    },

    /**
     * Called when a feature is added to the vectorlayer. and fires @see viewer.viewercontroller.controller.Event.ON_FEATURE_ADDED
     */

    featureAdded: function (object) {
        var feature = this.fromOpenLayersFeature(object.feature);

        // If no stylehash is set for the feature, set it to the current settings
        if (!object.feature.getStyle()) {
            object.feature.setStyle(this.toOpenLayersStyle(this.getCurrentStyleHash()));
        }
        this.editFeature(object.feature);
        this.fireEvent(viewer.viewercontroller.controller.Event.ON_FEATURE_ADDED, this, feature);
    },

    editFeature: function (feature) {
        this.select.getFeatures().clear();
        this.select.getFeatures().push(feature);
        var featureObject = this.fromOpenLayersFeature(feature);
        this.fireEvent(viewer.viewercontroller.controller.Event.ON_ACTIVE_FEATURE_CHANGED, this, featureObject);
    },

    featureModified: function (evt) {
        var featureObject = this.fromOpenLayersFeature(evt.features.getArray()[0]);
        this.fireEvent(viewer.viewercontroller.controller.Event.ON_ACTIVE_FEATURE_CHANGED, this, featureObject);
    },

    activeFeatureChanged: function (object) {
        var feature = this.fromOpenLayersFeature(object.element);
        this.fireEvent(viewer.viewercontroller.controller.Event.ON_ACTIVE_FEATURE_CHANGED, this, feature);
    },

    adjustStyle: function () {

    },

    getVisible: function () {
        return this.mixins.olLayer.getVisible.call(this);
    },

    reload: function () {
        this.mixins.olLayer.reload.call(this);
    },
    getType: function () {
        return this.mixins.olLayer.getType.call(this);
    },

    setTranslate: function (active) {
        this.modify.setActive(!active);
        this.translate.setActive(active);
        if(!active) {
            this.rotation = 0;
        }
    },

    updateRotation: function (value) {
        var f = this.source.getFeatures()[0];
        if (f) {
            this.center = ol.extent.getCenter(f.getGeometry().getExtent())
            f.getGeometry().rotate((this.rotation - value) * Math.PI / 180, this.center);
            this.rotation = value;
        }
    },

    frameworkStyleToFeatureStyle: function (oLfeature) {
        var styleProps;
        if (oLfeature.style) {
            styleProps = oLfeature.style;
        } else if (oLfeature.getStyle()) {
            styleProps = oLfeature.getStyle().featureStyle;
        } else {
            styleProps = this.getCurrentStyleHash();
        }
        return Ext.create('viewer.viewercontroller.controller.FeatureStyle', styleProps);
    },

    getCurrentStyleHash: function (featureStyle) {
        if (!featureStyle) {
            featureStyle = this.defaultFeatureStyle;
        }
        var featureStyleProps = featureStyle.getProperties();
        return Ext.Object.merge({}, {
            'strokeWidth': 3,
            'pointRadius': 6
        }, featureStyleProps);
    },

    setFeatureStyle: function (id, featureStyle, noUpdate) {
        var olFeature = this.getFrameworkLayer().getSource().getFeatureById(id);
        if (olFeature) {
            var c = ol.color.asArray(featureStyle.config.fillColor);
            var colorFinal = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + featureStyle.config.fillOpacity + ')';
            var lineDash;
            var label = "";
            var offsetX = 0;
            if (featureStyle.config.strokeDashstyle === "solid") {
                lineDash = null;
            } else if (featureStyle.config.strokeDashstyle === "dot") {
                lineDash = [1, 8];
            } else if (featureStyle.config.strokeDashstyle === "dash") {
                lineDash = [10, 10];
            }
            
            if (featureStyle.config.labelAlign === "cm") {
                offsetX = 0;
            } else if (featureStyle.config.labelAlign === "rm") {
                offsetX = -50;
            } else if (featureStyle.config.labelAlign === "lm") {
                offsetX = 50;
            }
            
            if(olFeature.getStyle().getText() !== null){
                label = olFeature.getStyle().getText().getText();
            }
            
            var strokeStyle = new ol.style.Stroke({
                color: featureStyle.config.strokeColor,
                width: featureStyle.config.strokeWidth,
                lineDash: lineDash

            });
            var fillStyle = new ol.style.Fill({
                color: colorFinal
            });
            
            var text = new ol.style.Text({
                text: label,
                offsetX: offsetX,
                font: featureStyle.config.fontStyle + " " + featureStyle.config.fontWeight + " " + featureStyle.config.fontSize + " sans-serif"
            });
            
            var style = new ol.style.Style({
                stroke: strokeStyle,
                fill: fillStyle,
                text:text,
                image: new ol.style.Circle({
                    fill: fillStyle,
                    stroke: strokeStyle,
                    radius: featureStyle.config.pointRadius
                })
            });
            style.featureStyle = featureStyle.config;
            olFeature.setStyle(style);
        }
    },

    keyDown: function (event) {
        if (event.key === "s" || event.key === "S") {
            this.drawRightAngle = true;
        }
    },

    keyUp: function (event) {
        if (event.key === "s" || event.key === "S") {
            this.drawRightAngle = false;
        }
    }
});