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

      $.extend(this.map, {
        reportLayers: {},
        reportControls: {
          zoom: L.control.zoom({position: 'topleft'}).addTo(this.map),
          scale: L.control.scale({position: 'bottomleft'}).addTo(this.map),
          legend: L.mapbox.legendControl().addLegend('<h3 class="center keyline-bottom">Legend</h3><div class="legend-contents"></div>').addTo(this.map),
          grid: undefined,
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
          newLayerIds = $this.data('mapid'),
          displayedLayerIds = report.getLayers();

      if(nav){
        report.map.setView(nav.latlng, nav.zoom);
      }

      if(newLayerIds){
        // for all existing layers, remove it unless it is present in newLayerIds
        newLayerIds = newLayerIds.split();

        for(i=0; i<displayedLayerIds.length; i++){
          var displayedLayerId = displayedLayerIds[i];
          if(newLayerIds.indexOf(displayedLayerId) === -1){
            console.log('displayedLayerId: ', displayedLayerId);
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

    changeLayer: function(mapId){
      // initiate everything that should happen when a map layer is added/removed

      // cache tileLayer in report.map.reportLayers[mapId]
      if(! report.map.reportLayers[mapId]){
        report.map.reportLayers[mapId] = L.mapbox.tileLayer(mapId)
      }
      var tileLayer = this.map.reportLayers[mapId];

      // if layer is present, run all remove layer actions
      if(this.map.hasLayer(tileLayer)){
        var layers = this.getLayers();
        // run all remove layer actions
        this.map.removeLayer(tileLayer);
        this.removeLegend(mapId);

        // if removed layer was highest layer, clear grids
        if(mapId === layers[layers.length -1]){
          this.clearGrids();
          // if 1+ more layers on map, add grid of the new top layer
          if(layers.length > 1){
            var nextLayerId = layers[layers.length -2];
            report.addGrid(nextLayerId);
          }
        }
      }else{
        // run all add layer actions:
          // add layer to map; add legend; move layer-ui button
          // add grid

        // find zIndex of current top layer, or -1 if no current layers
        var layers = this.getLayers(),
            topLayerZIndex = this.getLayerZIndex(layers[layers.length -1]);

        this.map.addLayer(tileLayer);
        tileLayer.setZIndex(topLayerZIndex + 1);

        report.showLegend(mapId);
        // not very smart: simply remove all grids and add for the new layer
        report.clearGrids();
        report.addGrid(mapId);
      }

      // this.leaflet_hash.trigger('move');
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

    showLegend: function(mapId){
      var legendContents = $(report.map.reportControls.legend.getContainer()).find('.legend-contents');
      $('<div>', {
                  'class': 'report-legend space-bottom1',
                  'data-id': mapId,
                  html: mapId
      }).prependTo(legendContents);
    },

    removeLegend: function(mapId){
      $(report.map.reportControls.legend.getContainer()).find('.report-legend[data-id="' + mapId + '"]').remove();
    },

    addGrid: function(mapId){
      gridLayer = L.mapbox.gridLayer(mapId).addTo(report.map);
      report.map.reportControls.grid = L.mapbox.gridControl(gridLayer).addTo(report.map);
    },

    clearGrids: function(){
      var gridControl = report.map.reportControls.grid
      if (gridControl && gridControl._layer){
        report.map.removeLayer(gridControl._layer);
      }
      $('.map-tooltip').remove();
    }

  };

  window.report = report;
  report.init();
})();
