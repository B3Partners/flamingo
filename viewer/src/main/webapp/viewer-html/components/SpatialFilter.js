/* 
 * Copyright (C) 2014 3Partners B.V.
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
 * Spatial Filter component
 * This component adds the functionality of creating a spatial filter: a filter based on a drawn geometry (polygon, rectangle, circle or freeform). All features must
 * be in or partly in the drawn geometry (ie. intersects).
 * @author <a href="mailto:meinetoonen@b3partners.nl">Meine Toonen</a>
 */
Ext.define ("viewer.components.SpatialFilter",{
    extend: "viewer.components.Component",
    layerSelector:null,
    drawingButtonIds:null,
    vectorLayer:null,
    iconPath:null,
    features:null,
    config:{
        title: "",
        iconUrl: "",
        tooltip: "",
        layers:null,
        applyDirect:null,
        multiGeometries:null,
        label: "",
        details: {
            minWidth: 330,
            minHeight: 270
        }
    },
    constructor: function (conf){
        if(conf.applyDirect === undefined){
            conf.applyDirect = true;
        }
        
        if(conf.multiGeometries === undefined){
            conf.multiGeometries = true;
        }
        this.initConfig(conf);     
		viewer.components.SpatialFilter.superclass.constructor.call(this, this.config);
        var me = this;
        this.features = new Array();
        this.renderButton({
            handler: function(){
                me.showWindow();
            },
            text: me.config.title,
            icon: "",//"/viewer/viewer-html/components/resources/images/spatialFilter/spatialFilterButton.png",
            tooltip: me.config.tooltip,
            label: me.config.label
        });
        // Needed to untoggle the buttons when drawing is finished
        this.drawingButtonIds = {
            'polygon': Ext.id(),
            'circle': Ext.id(),
            'box': Ext.id(),
            'freehand': Ext.id()
            
        };
        this.iconPath=contextPath+"/viewer-html/components/resources/images/drawing/";
     
        this.loadWindow(); 
        this.config.viewerController.addListener(viewer.viewercontroller.controller.Event.ON_SELECTEDCONTENT_CHANGE,this.selectedContentChanged,this );
        return this;
    },

    showWindow : function(){
        if(this.vectorLayer === null){
            this.createVectorLayer();
        }
        this.layerSelector.initLayers();
        this.popup.popupWin.setTitle(this.config.title);
        this.popup.show();
    },
    
    drawGeometry: function(type){
        var appendFilter = Ext.getCmp (this.config.name + 'AppendFilter');
        if(!appendFilter.getValue()){
            this.vectorLayer.removeAllFeatures();
            this.features = new Array();
        }
        this.vectorLayer.drawFeature(type);
    },
    applyFilter : function(){
        var features = this.features;
        var multi = "";
        if (features.length > 0) {
            multi += "MULTIPOLYGON (";
            for (var i = 0; i < features.length; i++) {
                var feature = features[i];
                var coords = feature.replace("POLYGON", "");
                if (i > 0) {
                    multi += ",";
                }
                multi += coords;
            }
            multi += ")";
        }
        var appLayer = this.layerSelector.getValue();
        this.setFilter(multi, appLayer);
    },
    setFilter: function(geometry, appLayer){
        var me = this;          
        if(appLayer.attributes === undefined || appLayer.attributes === null) {   
            this.config.viewerController.getAppLayerFeatureService(appLayer).loadAttributes(appLayer,function(){
                me.setFilter(geometry, appLayer);
            },function(e){
                Ext.MessageBox.alert("Error", e);
            });
        }else{
            var geomAttr = appLayer.geometryAttribute; 
            if (geomAttr !== undefined){
                var filter = "";
                if(geometry.length > 0){
                    filter = "INTERSECTS(" + geomAttr + ", " + geometry + ")";
                }
                this.config.viewerController.setFilter(
                    Ext.create("viewer.components.CQLFilterWrapper",{
                        id: "filter_"+this.getName(),
                        cql: filter,
                        operator : "AND",
                        type: "GEOMETRY"
                    }),appLayer);
            }            
        }
       
    },
    buffer : function(){
        Ext.getCmp(this.config.name + "BufferContainer").setLoading("Buffer berekenen...");
        var features = this.features;
        var distance = Ext.getCmp(this.config.name + "BufferDistance").getValue();
        if(distance === null || distance === 0){
            return;
        }
        var requestParams = {
            features: features, 
            buffer : distance
        };
        Ext.Ajax.request({
            url: actionBeans["buffergeom"],
            params: requestParams,
            method:  "POST",
            scope:this,
            success: function(result, request) {
                var response = Ext.JSON.decode(result.responseText);
                if(response.success){
                    this.features = [];
                    var features = response.features;
                    var featureObjs = [];
                    for(var i = 0 ; i < features.length ;i++){
                        var feature = Ext.create("viewer.viewercontroller.controller.Feature",{
                            wktgeom:features[i]
                        });
                        featureObjs.push(feature);
                    }
                    this.vectorLayer.removeAllFeatures();
                    this.vectorLayer.addFeatures(featureObjs);
                }else{
                    Ext.MessageBox.alert("Foutmelding", response.errorMessage);
                }
                Ext.getCmp(this.config.name + "BufferContainer").setLoading(false);
            },
            failure: function(result, request) {
                Ext.getCmp(this.config.name + "BufferContainer").setLoading(false);
                var response = Ext.JSON.decode(result.responseText);
                Ext.MessageBox.alert("Foutmelding", response.error);
            }
        });
    },
    
    // <editor-fold desc="Event handlers" defaultstate="collapsed">
    layerChanged: function (appLayer, previousAppLayer, scope) {
        var buttons = Ext.getCmp(this.config.name +"filterButtons");
        if(appLayer !== null){
            buttons.setDisabled(false);
            this.vectorLayer.removeAllFeatures();
        }else{
            buttons.setDisabled(true);
            this.cancel();
        }
    },
      
    featureAdded : function (obj, feature){
        var applyDirect = Ext.getCmp (this.config.name + 'ApplyDirect');
        this.features.push(feature.config.wktgeom);
        if(applyDirect.getValue()){
            this.applyFilter();
        }
        this.toggleAll(false);
    },
    selectedContentChanged : function (){
        if(this.vectorLayer === null){
            this.createVectorLayer();
        }else{
            this.config.viewerController.mapComponent.getMap().addLayer(this.vectorLayer);
        }
    },
    // </editor-fold>
     
    // <editor-fold desc="Initialization methods" defaultstate="collapsed">
    loadWindow : function (){
        var me =this;
        var formItems = [];
        var formButtons = [
        {
            xtype: 'container',
            html: 'Teken: ',
            padding: '3 0 0 0',
            width: 105
        },
        {
            xtype: 'button',
            id: this.drawingButtonIds.polygon,
            icon: this.iconPath+"shape_polygon_red.png",
            tooltip: "Teken een polygoon",
            enableToggle: true,
            toggleGroup: 'drawingTools',
            margin: '0 3 0 0',
            listeners: {
                click:{
                    scope: me,
                    fn: function(){
                        me.drawGeometry("Polygon");
                    }
                }
            }
        },
        {
            xtype: 'button',
            id: this.drawingButtonIds.box,
            icon: this.iconPath+"shape_square_red.png",
            tooltip: "Teken een vierkant",
            enableToggle: true,
            toggleGroup: 'drawingTools',
            margin: '0 3 0 0',
            listeners: {
                click:{
                    scope: me,
                    fn: function(){
                        me.drawGeometry("Box");
                    }
                }
            }
        },
        {
            xtype: 'button',
            id: this.drawingButtonIds.freehand,
            icon: this.iconPath+"freehand.png",
            tooltip: "Teken een vrije vorm",
            enableToggle: true,
            toggleGroup: 'drawingTools',
            margin: '0 3 0 0',
            listeners: {
                click:{
                    scope: me,
                    fn: function(){
                        me.drawGeometry("Freehand");
                    }
                }
            }
        }];
        if(!viewer.components.MobileManager.isMobile()) {
            formButtons.push({
                xtype: 'button',
                id: this.drawingButtonIds.circle,
                icon: this.iconPath+"shape_circle_red.png",
                tooltip: "Teken een cirkel",
                enableToggle: true,
                toggleGroup: 'drawingTools',
                margin: '0 3 0 0',
                listeners: {
                    click:{
                        scope: me,
                        fn: function(){
                            me.drawGeometry("Circle");
                        }
                    }
                }
            });
        }
        formItems.push({
            xtype: 'container',
            layout: {
                type: 'hbox'
            },
            padding: '0 10 10 0',
            items: formButtons
        });
        formItems.push(
        {
            id: this.config.name + "BufferContainer",
            name: this.config.name + "BufferContainer",
            xtype: "container",
            layout: {
                type: 'hbox'
            },
            items: [
                {
                    id: this.config.name + "BufferDistance",
                    name: this.config.name + "BufferDistance",
                    xtype: "numberfield",
                    fieldLabel: "Bufferafstand",
                    minValue: 0,
                    labelWidth: 100,
                    width: 200,
                    margin: '0 3 0 0'
                },{
                    xtype: "button",
                    text: "Buffer",
                    listeners:{
                        click:{
                            scope:this,
                            fn:this.buffer
                        }
                    }
                }]
        },
        {
            xtype: "checkbox",
            boxLabel: 'Meerdere geometriën als filter',
            name: 'appendFilter',
            inputValue: this.config.multiGeometries,
            checked: this.config.multiGeometries,
            id: this.config.name + 'AppendFilter'
        },
        {
            xtype: "checkbox",
            boxLabel: 'Filter direct toepassen',
            name: 'applyDirect',
            inputValue: this.config.applyDirect,
            checked: this.config.applyDirect,
            id: this.config.name + 'ApplyDirect'
        });
        this.createLayerSelector();
        this.maincontainer = Ext.create('Ext.container.Container', {
            id: this.config.name + 'Container',
            width: '100%',
            height: '100%',
            layout: {
                type: 'vbox',
                align: 'stretch'
            },
            style: {
                backgroundColor: 'White'
            },
            padding: 4,
            renderTo: this.getContentDiv(),
            items: [
            this.layerSelector.getLayerSelector(),
            {
                id: this.config.name + 'filterButtons',
                xtype: "container",
                disabled:true,
                autoScroll: true,
                layout:{
                    type: "vbox",
                    align: "stretch"
                },
                flex: 1,
                items: formItems
            },{
                id: this.config.name + 'ClosingPanel',
                xtype: "container",
                style: {
                    marginTop: '10px'
                },
                layout: {
                    type:'hbox',
                    pack:'end'
                },
                items: [
                    {xtype: 'button', text: 'Reset', margin: '0 1 0 0', handler: function(){
                        me.resetForm();
                    }},
                    {xtype: 'button', text: 'Toepassen', margin: '0 1 0 0', handler: function(){
                        me.applyFilter();
                    }},
                    {xtype: 'button', text: 'Sluiten', handler: function() {
                        me.resetForm();
                        me.popup.hide();
                    }}
                ]
            }]
        });
    },
    createLayerSelector: function(){
        var config = {
            viewerController : this.config.viewerController,
            restriction : "filterable",
            id : this.config.name + "layerSelector",
            layers: this.config.layers,
            padding: 4
        };
        this.layerSelector = Ext.create("viewer.components.LayerSelector",config);
        this.layerSelector.addListener(viewer.viewercontroller.controller.Event.ON_LAYERSELECTOR_CHANGE,this.layerChanged,this);  
    },
    createVectorLayer : function (){
         this.vectorLayer = this.config.viewerController.mapComponent.createVectorLayer({
            name: this.config.name + 'VectorLayer',
            geometrytypes:["Circle","Polygon"],
            showmeasures:false,
            viewerController : this.config.viewerController,
            style: {
                fillcolor: "FF0000",
                fillopacity: 50,
                strokecolor: "FF0000",
                strokeopacity: 50
            }
        });
        this.config.viewerController.registerSnappingLayer(this.vectorLayer);
        this.config.viewerController.mapComponent.getMap().addLayer(this.vectorLayer);
                
        this.vectorLayer.addListener (viewer.viewercontroller.controller.Event.ON_FEATURE_ADDED,this.featureAdded,this);
    },
    
    //</editor-fold>
   
    // Some helper functions here
    toggleAll : function(state){
        for ( var key in this.drawingButtonIds){
            if(!this.drawingButtonIds.hasOwnProperty(key)) {
                continue;
            }
            var el = this.drawingButtonIds[key];
            var button = Ext.getCmp(el);
            button.toggle(state);
        }
    },
    
    resetForm : function () {
        var appLayer = this.layerSelector.getValue();
        if(!appLayer) {
            return;
        }
        this.features = [];
        this.vectorLayer.removeAllFeatures();
        this.applyFilter();
    },
    getExtComponents: function() {
        return [ this.maincontainer.getId() ];
    }
});
