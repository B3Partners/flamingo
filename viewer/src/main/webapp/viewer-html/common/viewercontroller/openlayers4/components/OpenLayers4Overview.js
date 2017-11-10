/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


Ext.define("viewer.viewercontroller.openlayers4.components.OpenLayers4Overview", {
    extend: "viewer.viewercontroller.openlayers4.OpenLayers4Component",
    config: {
        top: null,
        left: null,
        url: null,
        layers: null,
        position: null,
        height: null,
        width: null,
        lox: null,
        loy: null,
        rbx: null,
        rby: null,
        followZoom: null
    },
    layer:null,
    constructor: function (conf) {
        this.height = 300;
        this.width = 300;
        
        viewer.viewercontroller.openlayers4.components.OpenLayers4Overview.superclass.constructor.call(this, conf);
        var map = this.config.viewerController.mapComponent.getMap().frameworkMap;
        this.map = map;
        if (Ext.isEmpty(this.config.url)) {
            throw new Error("No URL set for Overview component, unable to load component");
        }
        var maxBounds = this.config.viewerController.mapComponent.getMap().maxExtent;
        var bounds;
        if (this.config.lox !== null && this.config.loy !== null && this.config.rbx !== null && this.config.rby !== null
                && this.config.lox !== this.config.rbx && this.config.loy !== this.config.rby) {
            bounds = [
                    parseFloat(this.config.lox),
                    parseFloat(this.config.loy),
                    parseFloat(this.config.rbx),
                    parseFloat(this.config.rby)];
        } else {
            bounds = maxBounds;
        }
        
        var extentAr = [-285401.0,22598.0,595401.0,903401.0];
            
        var projection = new ol.proj.get('EPSG:28992');
        projection.setExtent(extentAr);
        
        
        
        if(conf.rb == '1')// 1 = tms button in viewer-admin
        {
        this.layer  = new ol.layer.Tile({
            source: new ol.source.XYZ({
              url:this.config.url+'/{z}/{x}/{-y}.png',
              projection:"EPSG:28992"
            })
          });
        
        }
        else if(conf.rb == '2') // 2 = wms/image button in viewer-admin
        {
            this.layer = new ol.layer.Image({
            source: new ol.source.ImageStatic({
               url: this.config.url,
               imageExtent:extentAr,
               projection: "EPSG:28992"
            })
        });
        }
        this.frameworkObject = new ol.control.OverviewMap({  
            className: 'ol-overviewmap ol-custom-overviewmap',
            layers:[this.layer],
            view: new ol.View({
                projection: projection,
                center: map.getView().getCenter(),
                extent: bounds,
                resolutions: map.getView().getResolutions()
            })
        });
        
        map.addControl(this.frameworkObject);

        return this;
    }
    
    });
    