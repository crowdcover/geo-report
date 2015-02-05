$(document).foundation();

(function(){
  var report = {
    init: function(){
      L.mapbox.accessToken = 'pk.eyJ1IjoiamFtZXMtbGFuZS1jb25rbGluZyIsImEiOiJ3RHBOc1BZIn0.edCFqVis7qgHPRgdq0WYsA';
      report.map = L.mapbox.map('map', 'james-lane-conkling.5630f970',{
        center: pageConfig.latlng,
        zoom: pageConfig.zoom,
        minZoom: 4,
        maxZoom: 16,
        scrollWheelZoom: false,
        attributionControl: false,
        zoomControl: false // we'll add later
      });

      // extend map object to contain reference to all layers
      var shareControl = L.control({position: 'topleft'});
      // https://developers.facebook.com/docs/sharing/reference/share-dialog
      shareControl.onAdd = function(){
        var controlHTML = $('<div>', {
          class: 'leaflet-bar leaflet-control',
        });
        var fbButton = $('<a>',{
          class: 'mapbox-icon mapbox-icon-facebook',
          href: '#'
        })
        var twitterButton = $('<a>',{
          class: 'mapbox-icon mapbox-icon-twitter',
          href: '#'
        })
        controlHTML.append(fbButton, twitterButton);
        return controlHTML[0];
      }

      var infoControl = L.mapbox.infoControl().addInfo('<strong>Map Data</strong> &copy; <a href="//www.openstreetmap.org/">OpenStreetMap</a>');
      if (pageConfig.source_name && pageConfig.source_url){
        infoControl.addInfo('<a href="' + pageConfig.source_url + '" target="_blank">' + pageConfig.source_name + '</a>');
      }else if(pageConfig.source_name){
        infoControl.addInfo(pageConfig.source_name);
      }

      $.extend(this.map, {
        reportLayers: {},
        reportVectors: {},
        reportControls: {
          zoom: L.control.zoom({position: 'topleft'}).addTo(this.map),
          scale: L.control.scale({position: 'bottomleft'}).addTo(this.map),
          infoControl: infoControl.addTo(this.map),
          share: shareControl.addTo(this.map)
        }
      });

      // event handlers
      // helper function to return latlng on map click; useful for drafting stories--comment out at production
      this.map.on('click', function(e){
        console.log(e.latlng);
      });

      $('#report section').waypoint(this.reportScroll, {
        context: '#report',
        offset: '70%'
      });

      // $('.navigate').on('click', 'a', this.navigate);

      // refresh all Waypoints when window resizes
      // (docs say this happens automatically, but doesn't appear so: http://imakewebthings.com/waypoints/api/refresh-all/)
      $(window).on('resize', function(){
        Waypoint.refreshAll();
      });
    },

    reportScroll: function(direction) {
      if(direction === 'down'){
          var $this = $(this.element);
          $this.prev().removeClass('active');
          $this.addClass('active');
      }else{
          var $this = $(this.element).prev();
          $this.next().removeClass('active');
          $this.addClass('active');
      }
      var nav = $this.data('nav'),
          newLayerIds = $this.data('tileid'),
          newVectorId = $this.data('vector'),
          displayedLayerIds = report.getLayers(),
          displayedVectorId = report.getVector();

      if(nav && nav.latlng.length === 2 && nav.zoom){
        report.map.setView(nav.latlng, nav.zoom);
      }else if(nav && nav.latlng.length === 2){
        report.map.panTo(nav.latlng);
      }else if(nav && nav.zoom){
        report.map.setZoom(nav.zoom);
      }

      if(newLayerIds){
        // for all existing layers, remove it unless it is present in newLayerIds
        newLayerIds = newLayerIds.split(',');

        for(i=0; i<displayedLayerIds.length; i++){
          var displayedLayerId = displayedLayerIds[i];
          if(newLayerIds.indexOf(displayedLayerId) === -1){
            report.changeLayer(displayedLayerId);
          }
        }
        // add all newLayerIds unless they are already present
        for(i=0; i<newLayerIds.length; i++){
          var newLayerId = newLayerIds[i],
              newTileLayer = report.map.reportLayers[newLayerId];
          if(! report.map.hasLayer(newTileLayer)){
            report.changeLayer(newLayerId);
          }
        }
      }else{
        // if no newLayers, remove all displayed layers
        for(i=0; i<displayedLayerIds.length; i++){
          report.changeLayer(displayedLayerIds[i]);
        }
      }

      if(newVectorId && newVectorId != displayedVectorId){
        report.changeVector(newVectorId);
      }else if(displayedVectorId){
        // if no new vector data to add, and existing vector data, remove existing vector data
        report.changeVector(displayedVectorId);
      }

    },

    // map interaction functions
    // navigate: function(e) {
    //   e.preventDefault();
    //   e.stopPropagation();

    //   var $this = $(this),
    //       lat = $this.data("nav")[0],
    //       lon = $this.data("nav")[1],
    //       zoom = $this.data("nav")[2];

    //   report.map.setView([lat, lon], zoom);

    //   $this.parent('li').siblings('li').children('a.active').removeClass('active');
    //   $this.addClass('active');
    // },

    changeVector: function(newVectorId){
      if(! report.map.reportVectors[newVectorId]){
        // if not cached, cache and add
        $.getJSON('data/' + newVectorId + '.geojson', function(geojson){
          report.map.reportVectors[newVectorId] = L.mapbox.featureLayer(geojson).addTo(report.map);
        });
      }else{
        // else, add or remove
        if(report.map.hasLayer(report.map.reportVectors[newVectorId])){
          report.map.removeLayer(report.map.reportVectors[newVectorId]);
        }else{
          report.map.reportVectors[newVectorId].addTo(report.map);
        }
      }

    },

    changeLayer: function(layerId){
      // initiate everything that should happen when a map layer is added/removed

      // cache tileLayer in report.map.reportLayers[mapId]
      if(! report.map.reportLayers[layerId]){
        // construct tilelayer url template out of baseUrl and newLayerId
        var a = layerId.split(":")
        var tileOrigin = undefined;
        for(var i = 0; i < pageConfig.tileOrigins.length; i++)
        {
          if(pageConfig.tileOrigins[i].name==a[0])
          {
            tileOrigin = pageConfig.tileOrigins[i];
          }
        }
        if(tileOrigin != undefined)
        {
          var tileUrl = tileOrigin.url.replace('{layerId}', a[1]);
          report.map.reportLayers[layerId] = L.tileLayer(tileUrl, {tms: true});
        }
      }
      var tileLayer = this.map.reportLayers[layerId];

      // if layer is present, remove layer
      if(this.map.hasLayer(tileLayer)){
        this.map.removeLayer(tileLayer);
      }else{
        // find zIndex of current top layer, or -1 if no current layers
        var layers = this.getLayers(),
            topLayerZIndex = this.getLayerZIndex(layers[layers.length -1]);

        this.map.addLayer(tileLayer);
        tileLayer.setZIndex(topLayerZIndex + 1);
      }

    },

    getVector: function(){
      // return id of vector featureLayer
        // currently, only one vector featureLayer can exist on the map
      reportVectors = report.map.reportVectors;
      for(mapId in reportVectors){
        if(report.map.hasLayer(reportVectors[mapId])){
          return mapId;
        }
      }
      return undefined;
    },

    getLayers: function(){
      // return an array of mapIds ordered by zIndex from lowest to highest
      // it is not guaranteed that a mapId's index in the array matches its zIndex
      var reportLayers = report.map.reportLayers,
          layersSortedByZIndex = [];

      for(mapId in reportLayers){
        var tileLayer = reportLayers[mapId];
        if(report.map.hasLayer(tileLayer)){
          layersSortedByZIndex[tileLayer.options.zIndex] = mapId;
        }
      }
      return layersSortedByZIndex.filter(function(n){
        return n != undefined;
      });
    },

    getLayerZIndex: function(mapId){
      // return mapId zIndex, or -1 if reportLayers doesn't contain mapId
      if(report.map.reportLayers[mapId]){
        return report.map.reportLayers[mapId].options.zIndex;
      }
      return -1;
    },

    setLayerZIndex: function(mapId, zIndex){
      report.map.reportLayers[mapId].setZIndex(zIndex);
    },

  };

  window.report = report;
  report.init();
})();
