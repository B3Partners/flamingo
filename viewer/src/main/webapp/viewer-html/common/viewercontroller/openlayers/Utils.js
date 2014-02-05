/* 
 * Copyright (C) 2012-2013 B3Partners B.V.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
/**
 * @class 
 * @constructor
 * @description
 */
Ext.define("viewer.viewercontroller.openlayers.Utils",{
    createBounds : function(extent){
        return new OpenLayers.Bounds(extent.minx,extent.miny,extent.maxx,extent.maxy);
    },
    createExtent : function(bounds){
        return new viewer.viewercontroller.controller.Extent(bounds.left,bounds.bottom,bounds.right,bounds.top);
    }
});
/**
 * Class for creating a MouseZoom only control.
 */
OpenLayers.Control.MouseWheelZoom = OpenLayers.Class(OpenLayers.Control, {
    button: null,
    
    initialize: function(options) {        
        OpenLayers.Control.prototype.initialize.apply(
            this, arguments
            );
        this.handler = new OpenLayers.Handler.MouseWheel(this,{
            'up': function(evt,delta){
                this.wheelUp(evt,delta);//this.handler.wheelZoom(evt);
            },
            'down':function(evt,delta){
                this.wheelDown(evt,delta);//this.handler.wheelZoom(evt);
            }
        });        
    },    
    /**      * 
     * Method: wheelChange  
     * Copied from: @see OpenLayers.Control.Navigation#wheelChange
     * Parameters:
     * evt - {Event}
     * deltaZ - {Integer}
     */
    wheelChange: function(evt, deltaZ) {
        var currentZoom = this.map.getZoom();
        var newZoom = this.map.getZoom() + Math.round(deltaZ);
        newZoom = Math.max(newZoom, 0);
        newZoom = Math.min(newZoom, this.map.getNumZoomLevels());
        if (newZoom === currentZoom) {
            return;
        }
        var size    = this.map.getSize();
        var deltaX  = size.w/2 - evt.xy.x;
        var deltaY  = evt.xy.y - size.h/2;
        var newRes  = this.map.baseLayer.getResolutionForZoom(newZoom);
        var zoomPoint = this.map.getLonLatFromPixel(evt.xy);
        var newCenter = new OpenLayers.LonLat(
                            zoomPoint.lon + deltaX * newRes,
                            zoomPoint.lat + deltaY * newRes );
        this.map.setCenter( newCenter, newZoom );
    },

    /** 
     * Method: wheelUp
     * Copied from: @see OpenLayers.Control.Navigation#wheelUp
     * User spun scroll wheel up
     * 
     * Parameters:
     * evt - {Event}
     * delta - {Integer}
     */
    wheelUp: function(evt, delta) {
        this.wheelChange(evt, delta || 1);
    },

    /** 
     * Method: wheelDown
     * Copied from: @see OpenLayers.Control.Navigation#wheelDown
     * User spun scroll wheel down
     * 
     * Parameters:
     * evt - {Event}
     * delta - {Integer}
     */
    wheelDown: function(evt, delta) {
        this.wheelChange(evt, delta || -1);
    }
});

OpenLayers.Control.LoadingPanel = OpenLayers.Class(OpenLayers.Control, {

    /**
     * Property: counter
     * {Integer} A counter for the number of layers loading
     */
    counter: 0,

    /**
     * Property: maximized
     * {Boolean} A boolean indicating whether or not the control is maximized
    */
    maximized: false,

    /**
     * Property: visible
     * {Boolean} A boolean indicating whether or not the control is visible
    */
    visible: true,

    /**
     * Constructor: OpenLayers.Control.LoadingPanel
     * Display a panel across the map that says 'loading'.
     *
     * Parameters:
     * options - {Object} additional options.
     */
    initialize: function(options) {
        OpenLayers.Control.prototype.initialize.apply(this, [options]);
    },

    /**
     * Function: setVisible
     * Set the visibility of this control
     *
     * Parameters:
     * visible - {Boolean} should the control be visible or not?
    */
    setVisible: function(visible) {
        this.visible = visible;
        if (visible) {
            OpenLayers.Element.show(this.div);
        } else {
            OpenLayers.Element.hide(this.div);
        }
    },

    /**
     * Function: getVisible
     * Get the visibility of this control
     *
     * Returns:
     * {Boolean} the current visibility of this control
    */
    getVisible: function() {
        return this.visible;
    },

    /**
     * APIMethod: hide
     * Hide the loading panel control
    */
    hide: function() {
        this.setVisible(false);
    },

    /**
     * APIMethod: show
     * Show the loading panel control
    */
    show: function() {
        this.setVisible(true);
    },

    /**
     * APIMethod: toggle
     * Toggle the visibility of the loading panel control
    */
    toggle: function() {
        this.setVisible(!this.getVisible());
    },

    /**
     * Method: addLayer
     * Attach event handlers when new layer gets added to the map
     *
     * Parameters:
     * evt - {Event}
    */
    addLayer: function(evt) {
        if (evt.layer) {
            evt.layer.events.register('loadstart', this, this.increaseCounter);
            evt.layer.events.register('loadend', this, this.decreaseCounter);
        }
    },

    /**
     * Method: setMap
     * Set the map property for the control and all handlers.
     *
     * Parameters:
     * map - {<OpenLayers.Map>} The control's map.
     */
    setMap: function(map) {
        OpenLayers.Control.prototype.setMap.apply(this, arguments);
        this.map.events.register('preaddlayer', this, this.addLayer);
        for (var i = 0; i < this.map.layers.length; i++) {
            var layer = this.map.layers[i];
            layer.events.register('loadstart', this, this.increaseCounter);
            layer.events.register('loadend', this, this.decreaseCounter);
        }
    },

    /**
     * Method: increaseCounter
     * Increase the counter and show control
    */
    increaseCounter: function() {
        this.counter++;
        if (this.counter > 0) {
            if (!this.maximized && this.visible) {
                this.maximizeControl();
            }
        }
    },

    /**
     * Method: decreaseCounter
     * Decrease the counter and hide the control if finished
    */
    decreaseCounter: function() {
        if (this.counter > 0) {
            this.counter--;
        }
        if (this.counter == 0) {
            if (this.maximized && this.visible) {
                this.minimizeControl();
            }
        }
    },

    /**
     * Method: draw
     * Create and return the element to be splashed over the map.
     */
    draw: function () {
        OpenLayers.Control.prototype.draw.apply(this, arguments);
        return this.div;
    },

    /**
     * Method: minimizeControl
     * Set the display properties of the control to make it disappear.
     *
     * Parameters:
     * evt - {Event}
     */
    minimizeControl: function(evt) {
        this.div.style.display = "none";
        this.maximized = false;

        if (evt != null) {
            OpenLayers.Event.stop(evt);
        }
    },

    /**
     * Method: maximizeControl
     * Make the control visible.
     *
     * Parameters:
     * evt - {Event}
     */
    maximizeControl: function(evt) {
        this.div.style.display = "block";
        this.maximized = true;

        if (evt != null) {
            OpenLayers.Event.stop(evt);
        }
    },

    /**
     * Method: destroy
     * Destroy control.
     */
    destroy: function() {
        if (this.map) {
            this.map.events.unregister('preaddlayer', this, this.addLayer);
            if (this.map.layers) {
                for (var i = 0; i < this.map.layers.length; i++) {
                    var layer = this.map.layers[i];
                    layer.events.unregister('loadstart', this,
                        this.increaseCounter);
                    layer.events.unregister('loadend', this,
                        this.decreaseCounter);
                }
            }
        }
        OpenLayers.Control.prototype.destroy.apply(this, arguments);
    },

    CLASS_NAME: "OpenLayers.Control.LoadingPanel"

});

/**
 * Create a Click controller
 * @param options
 * @param options.handlerOptions options passed to the OpenLayers.Handler.Click
 * @param options.click the function that is called on a single click (optional)
 * @param options.dblclick the function that is called on a dubble click (optional)
 */
OpenLayers.Control.Click = OpenLayers.Class(OpenLayers.Control,{
    defaultHandlerOptions: {
        'single': true,
        'double': false,
        'stopSingle': false,
        'stopDouble': false
    },
    initialize: function(options) {
        this.handlerOptions = OpenLayers.Util.extend(
            {}, this.defaultHandlerOptions
        );
        Ext.apply(this.handlerOptions,options.handlerOptions);
        OpenLayers.Control.prototype.initialize.apply(
            this, arguments
        );
        if (options.click){
            this.onClick=options.click;
        }
        if (options.dblclick){
            this.onDblclick=options.dblclick;
        }
        this.handler = new OpenLayers.Handler.Click(
            this, {
                'click': this.onClick,
                'dblclick': this.onDblclick 
            }, this.handlerOptions
        );
    },
    onClick: function(evt) {        
    },
    onDblclick: function(evt) {          
    }
});

function handleResponse(xy, request, url,layerNames) {
    if(!this.cache ){
        this.cache = new Object();
    }
    if(!this.cache[url]){
        
        this.cache[url] = new Object();
        this.cache[url].features = new Array();
        this.cache[url].counter = 0;
    }
    this.cache[url].counter++;
    var doc = request.responseXML;
    if(!doc || !doc.documentElement) {
        doc = request.responseText;
    }
    var features = this.format.read(doc);
    this.cache[url].features = this.cache[url].features.concat(features);
    for ( var i = 0 ; i < features.length ;i++){
        features[i].layerNames = layerNames;
        features[i].url = url;
    }
    if (this.drillDown === false) {
        this.triggerGetFeatureInfo(request, xy, features,layerNames);
    } else {
        this._requestCount++;
        if (this.output === "object") {
            this._features = (this._features || []).concat(
                {url: url, features: features}
            );
        } else {
        this._features = (this._features || []).concat(features);
        }
        //if (this._requestCount === this._numRequests) {
        if (request._headers.total === this.cache[url].counter) {
            this.cache[url].counter = 0;
            this.triggerGetFeatureInfo(request, xy, this.cache[url].features, layerNames);
            delete this._features;
            delete this._requestCount;
            delete this.cache[url];
            delete this._numRequests;
        }
    }
}

/**
 * Method: request
 * Sends a GetFeatureInfo request to the WMS
 * 
 * Parameters:
 * clickPosition - {<OpenLayers.Pixel>} The position on the map where the
 *     mouse event occurred.
 * options - {Object} additional options for this method.
 * 
 * Valid options:
 * - *hover* {Boolean} true if we do the request for the hover handler
 */
function requestWmsGFI(clickPosition, options) {
    var layers = this.findLayers();
    if (layers.length == 0) {
        this.events.triggerEvent("nogetfeatureinfo");
        // Reset the cursor.
        OpenLayers.Element.removeClass(this.map.viewPortDiv, "olCursorWait");
        return;
    }

    options = options || {};
    if (this.drillDown === false) {
        var wmsOptions = this.buildWMSOptions(this.url, layers,
                clickPosition, layers[0].params.FORMAT);
        var request = OpenLayers.Request.GET(wmsOptions);

        if (options.hover === true) {
            this.hoverRequest = request;
        }
    } else {
        this._requestCount = 0;
        this._numRequests = 0;
        this.features = [];
        // group according to service url to combine requests
        var services = {}, url;
        for (var i = 0, len = layers.length; i < len; i++) {
            var layer = layers[i];
            var service, found = false;
            url = OpenLayers.Util.isArray(layer.url) ? layer.url[0] : layer.url;
            if (url in services) {
                services[url].push(layer);
            } else {
                this._numRequests++;
                services[url] = [layer];
            }
        }
        var layers;
        for (var url in services) {
            layers = services[url];
            for (var i = 0; i < layers.length; i++) {
                var wmsOptions = this.buildWMSOptions(url, [layers[i]],
                        clickPosition, layers[0].params.FORMAT);
                wmsOptions.headers = new Object();
                wmsOptions.headers.total = layers.length;
                wmsOptions.headers.index = i;
                OpenLayers.Request.GET(wmsOptions);
            }
        }
    }
}
    
/**
 * Method: buildWMSOptions
 * Build an object with the relevant WMS options for the GetFeatureInfo request
 *
 * Parameters:
 * url - {String} The url to be used for sending the request
 * layers - {Array(<OpenLayers.Layer.WMS)} An array of layers
 * clickPosition - {<OpenLayers.Pixel>} The position on the map where the mouse
 *     event occurred.
 * format - {String} The format from the corresponding GetMap request
 */
function buildWMSOptions(url, layers, clickPosition, format) {
    var layerNames = [], styleNames = [];
    for (var i = 0, len = layers.length; i < len; i++) {
        if (layers[i].params.LAYERS != null) {
            layerNames = layerNames.concat(layers[i].params.LAYERS);
            styleNames = styleNames.concat(this.getStyleNames(layers[i]));
        }
    }
    var firstLayer = layers[0];
    // use the firstLayer's projection if it matches the map projection -
    // this assumes that all layers will be available in this projection
    var projection = this.map.getProjection();
    var layerProj = firstLayer.projection;
    if (layerProj && layerProj.equals(this.map.getProjectionObject())) {
        projection = layerProj.getCode();
    }
    var params = OpenLayers.Util.extend({
        service: "WMS",
        version: firstLayer.params.VERSION,
        request: "GetFeatureInfo",
        exceptions: firstLayer.params.EXCEPTIONS,
        bbox: this.map.getExtent().toBBOX(null,
            firstLayer.reverseAxisOrder()),
        feature_count: this.maxFeatures,
        height: this.map.getSize().h,
        width: this.map.getSize().w,
        format: format,
        info_format: firstLayer.params.INFO_FORMAT || this.infoFormat
    }, (parseFloat(firstLayer.params.VERSION) >= 1.3) ?
        {
            crs: projection,
            i: parseInt(clickPosition.x),
            j: parseInt(clickPosition.y)
        } :
        {
            srs: projection,
            x: parseInt(clickPosition.x),
            y: parseInt(clickPosition.y)
        }
    );
    if (layerNames.length != 0) {
        params = OpenLayers.Util.extend({
            layers: layerNames,
            query_layers: layerNames,
            styles: styleNames
        }, params);
    }
    OpenLayers.Util.applyDefaults(params, this.vendorParams);
    return {
        url: url,
        params: OpenLayers.Util.upperCaseObject(params),
        extra: layerNames,
        callback: function(request) {
            this.handleResponse(clickPosition, request, url, layerNames);
        },
        scope: this
    };
}