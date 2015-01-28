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
    }
  };

  window.report = report;
  report.init();
})();
