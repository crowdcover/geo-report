$(document).foundation();

(function(){
  var report = {
    init: function(){
      L.mapbox.accessToken = 'pk.eyJ1IjoiamFtZXMtbGFuZS1jb25rbGluZyIsImEiOiJ3RHBOc1BZIn0.edCFqVis7qgHPRgdq0WYsA';
      report.map = L.mapbox.map('map', 'james-lane-conkling.5630f970',{
        // center: [],
        zoom: 6,
        minZoom: 4,
        maxZoom: 16,
        scrollWheelZoom: false
      });

      // extend map object to contain reference to all layers
      this.reportLayers = {};

      // event handlers
      $('#report section').waypoint(this.reportScroll, {
        context: '#report',
        offset: '70%'
      });
      $('.navigate').on('click', 'a', this.navigate);
    },

    reportScroll: function(direction) {
      console.log($(this));
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
          newLayers = $this.data('id'),
          newLayer;

      if(nav){
        console.log('nav: ', nav);
          // report.map.setView([nav[0], nav[1]], nav[2]);
      }
      // change Layers
      // report.removeAllExcept(newLayers);
      if(newLayers){
        // perform a quick lookup to test if newLayers is already displayed
        var displayedLayersIds = report.getLayers();

        for(i=0; i<newLayers.length; i++){
          newLayer = newLayers[i];
          if(displayedLayersIds.indexOf(newLayer) === -1){
            report.changeLayer(newLayers[i]);
          }
        }
      }
    },

    // map interaction functions
    navigate: function(e) {
      e.preventDefault();
      e.stopPropagation();

      var $this = $(this),
          lat = $this.data("nav")[0],
          lon = $this.data("nav")[1],
          zoom = $this.data("nav")[2];

      report.map.setView([lat, lon], zoom);

      $this.parent('li').siblings('li').children('a.active').removeClass('active');
      $this.addClass('active');
    },

    getLayers: function(){
      // return an array of mapIds ordered by zIndex from lowest to highest
      // it is not guaranteed that a mapId's index in the array matches its zIndex
      var dataLayers = moabi.map.moabiLayers.dataLayers,
          layersSortedByZIndex = [];

      for(mapId in dataLayers){
        var tileLayer = dataLayers[mapId].tileLayer;
        if(moabi.map.hasLayer(tileLayer)){
          layersSortedByZIndex[tileLayer.options.zIndex] = mapId;
        }
      }
      return layersSortedByZIndex.filter(function(n){
        return n != undefined;
      });
    },

    changeLayer: function(mapId){
      // initiate everything that should happen when a map layer is added/removed

      // cache tileLayer in moabi.map.moabiLayers.dataLayers[mapId]
      if(! moabi.map.moabiLayers.dataLayers[mapId]){
        moabi.map.moabiLayers.dataLayers[mapId] = {
          tileLayer: L.tileLayer('http://tiles.osm.moabi.org/' + mapId + '/{z}/{x}/{y}.png')
        };
      }
      var tileLayer = this.map.moabiLayers.dataLayers[mapId].tileLayer;

      // if layer is present, run all remove layer actions
      if(this.map.hasLayer(tileLayer)){
        var layers = this.getLayers();
        // run all remove layer actions
        this.map.removeLayer(tileLayer);
        this.removeLayerButton(mapId);
        this.removeLegend(mapId);
        this.removeSummary();

        // if removed layer was highest layer, clear grids
        if(mapId === layers[layers.length -1]){
          this.clearGrids();
          // if 1+ more layers on map, add grid of the new top layer
          if(layers.length > 1){
            var nextLayerId = layers[layers.length -2];

            this.getLayerJSON(nextLayerId).done(function(nextLayerJSON){
              moabi.addGrid(nextLayerId, nextLayerJSON);
            });
          }
        }
      }else{
        // run all add layer actions:
          // add layer to map; add legend; move layer-ui button
          // show description summary; add grid; update hash

        // find zIndex of current top layer, or -1 if no current layers
        var layers = this.getLayers(),
            topLayerZIndex = this.getLayerZIndex(layers[layers.length -1]);

        this.map.addLayer(tileLayer);
        tileLayer.setZIndex(topLayerZIndex + 1);
        this.showLayerButton(mapId);

        this.getLayerJSON(mapId).done(function(layerJSON){
          moabi.showLegend(mapId, layerJSON);
          moabi.showSummary(mapId, layerJSON);
          // not very smart: simply remove all grids and add for the new layer
          moabi.clearGrids();
          moabi.addGrid(mapId, layerJSON);
        });
      }

      this.leaflet_hash.trigger('move');
    },

    removeAllExcept: function(keepLayers) {
      // removes all layers from map, except for keepLayers (pass as array)
      // returns a list of removed layers
      var displayedLayers = report.getLayers();
      return $.map(displayedLayers, function(removeLayer, index){
                moabi.keepLayers = keepLayers;
                moabi.removeLayer = removeLayer;

                if( keepLayers.indexOf(removeLayer) === -1){
                  moabi.changeLayer(removeLayer);
                  return removeLayer;
                }
              });
    },

  };

  window.report = report;
  report.init();
})();
